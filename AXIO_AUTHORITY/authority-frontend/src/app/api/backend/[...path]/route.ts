import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Server-side proxy (BFF) route handler for AxioVital Authority.
 *
 * Forwards requests to the live ASP.NET Core admin API (BACKEND_API_BASE_URL).
 * Keeps credentials and tokens in server-side HttpOnly cookies, eliminating
 * CORS and browser exposure of upstream tokens and secrets.
 *
 * Security properties (D2, D3):
 * 1. Server-only config: BACKEND_API_BASE_URL is never exposed to the client bundle.
 * 2. Strict path allowlist: only /api/v1/admin/* and /api/v1/auth/* are permitted.
 * 3. Traversal protection: rejects '..', encoded dots/slashes, and absolute URLs.
 * 4. Method restriction: allows only GET, POST, DELETE.
 * 5. Safe header forwarding: allowlist only, never forwards arbitrary client headers.
 * 6. Body size limit: caps payloads to 1MB.
 * 7. CSRF validation: checks Origin/Host and custom header on mutating requests.
 * 8. Zero body logging: request and response bodies are never logged.
 * 9. Secret stripping (D3): strips mfa_secret, mfa_qr_code_uri, and enrollment_token.
 * 10. Cache-Control: always no-store.
 */

const ALLOWED_PATH_PREFIXES = ["/api/v1/admin/", "/api/v1/auth/"];
const ALLOWED_METHODS = ["GET", "POST", "DELETE"];
const MAX_BODY_BYTES = 1024 * 1024; // 1MB

/**
 * Strips D3 forbidden secrets recursively before returning JSON to the client.
 */
function stripSecretsRecursively(data: unknown): unknown {
  if (Array.isArray(data)) {
    return data.map(stripSecretsRecursively);
  }
  if (data !== null && typeof data === "object") {
    const copy = { ...(data as Record<string, unknown>) };
    delete copy.mfa_secret;
    delete copy.mfa_qr_code_uri;
    delete copy.enrollment_token;
    for (const key of Object.keys(copy)) {
      copy[key] = stripSecretsRecursively(copy[key]);
    }
    return copy;
  }
  return data;
}

function getBackendBaseUrl(): string | null {
  const url = process.env.BACKEND_API_BASE_URL?.trim();
  return url && url.length > 0 ? url.replace(/\/$/, "") : null;
}

function validatePath(pathname: string): { valid: boolean; error?: string } {
  // Reject directory traversal and encoded representations
  const lower = pathname.toLowerCase();
  if (
    lower.includes("..") ||
    lower.includes("%2e") ||
    lower.includes("%2f") ||
    lower.includes("%5c") ||
    lower.includes("\\")
  ) {
    return { valid: false, error: "Path traversal sequences are strictly forbidden." };
  }

  // Reject absolute URLs or schemes
  if (lower.startsWith("http://") || lower.startsWith("https://") || lower.startsWith("//") || lower.includes(":")) {
    return { valid: false, error: "Absolute URLs and URI schemes are strictly forbidden." };
  }

  // Must match allowed prefixes
  const isAllowed = ALLOWED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (!isAllowed) {
    return { valid: false, error: `Requested path '${pathname}' is not in the allowed API proxy list.` };
  }

  return { valid: true };
}

function validateCsrf(request: NextRequest, method: string): boolean {
  if (method === "GET") return true;

  // Custom client header check
  const hasCustomHeader =
    request.headers.has("x-correlation-id") ||
    request.headers.has("x-axio-authority-client") ||
    request.headers.has("x-requested-with");

  if (!hasCustomHeader) {
    return false;
  }

  // Origin check
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        return false;
      }
    } catch {
      return false;
    }
  }

  return true;
}

async function handleProxy(request: NextRequest, { params }: { params: { path?: string[] } }) {
  const method = request.method.toUpperCase();

  if (!ALLOWED_METHODS.includes(method)) {
    return NextResponse.json(
      { code: "METHOD_NOT_ALLOWED", message: `Method '${method}' is not supported by the proxy.` },
      { status: 405, headers: { "Cache-Control": "no-store", Allow: ALLOWED_METHODS.join(", ") } },
    );
  }

  const rawPath = "/" + (params.path || []).join("/");
  const pathValidation = validatePath(rawPath);
  if (!pathValidation.valid) {
    return NextResponse.json(
      { code: "FORBIDDEN_PATH", message: pathValidation.error },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  // CSRF validation on mutating actions
  if (!validateCsrf(request, method)) {
    return NextResponse.json(
      { code: "CSRF_VALIDATION_FAILED", message: "Request failed cross-site request forgery validation." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const baseUrl = getBackendBaseUrl();
  if (!baseUrl) {
    return NextResponse.json(
      {
        code: "BACKEND_NOT_CONFIGURED",
        message: "The server-side BACKEND_API_BASE_URL environment variable is not configured.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  // Correlation ID management
  const correlationId =
    request.headers.get("x-correlation-id") ||
    `AX-REQ-${crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;

  // Forwarding headers allowlist
  const forwardHeaders: Record<string, string> = {
    Accept: "application/json",
    "X-Correlation-Id": correlationId,
  };

  const contentType = request.headers.get("content-type");
  if (contentType) forwardHeaders["Content-Type"] = contentType;

  const idempotencyKey = request.headers.get("idempotency-key");
  if (idempotencyKey) forwardHeaders["Idempotency-Key"] = idempotencyKey;

  // Session Token attachment from HttpOnly cookie
  const cookieName = process.env.AUTHORITY_SESSION_COOKIE_NAME || "axio_authority_session";
  const sessionToken = request.cookies.get(cookieName)?.value;
  if (sessionToken) {
    forwardHeaders["Authorization"] = `Bearer ${sessionToken}`;
  }

  // Read request body if present with size capping
  let bodyBuffer: ArrayBuffer | undefined = undefined;
  if (method !== "GET") {
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
      return NextResponse.json(
        { code: "PAYLOAD_TOO_LARGE", message: "Request payload exceeds maximum allowed size (1MB)." },
        { status: 413, headers: { "Cache-Control": "no-store" } },
      );
    }

    try {
      bodyBuffer = await request.arrayBuffer();
      if (bodyBuffer.byteLength > MAX_BODY_BYTES) {
        return NextResponse.json(
          { code: "PAYLOAD_TOO_LARGE", message: "Request payload exceeds maximum allowed size (1MB)." },
          { status: 413, headers: { "Cache-Control": "no-store" } },
        );
      }
    } catch {
      // Body empty or failed to read
    }
  }

  // Construct target URL including query string
  const queryString = request.nextUrl.search;
  const targetUrl = `${baseUrl}${rawPath}${queryString}`;

  let backendResponse: Response;
  try {
    backendResponse = await fetch(targetUrl, {
      method,
      headers: forwardHeaders,
      body: bodyBuffer && bodyBuffer.byteLength > 0 ? bodyBuffer : undefined,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      {
        code: "BACKEND_UNREACHABLE",
        message: "Unable to connect to upstream AxioVital API backend.",
        correlationId,
      },
      { status: 502, headers: { "Cache-Control": "no-store", "X-Correlation-Id": correlationId } },
    );
  }

  // Process response
  const responseContentType = backendResponse.headers.get("content-type") || "";
  const isJson = responseContentType.includes("application/json");

  let responseData: any;
  if (isJson) {
    try {
      const parsedJson = await backendResponse.json();
      // Enforce D3: strip secrets before returning to browser
      responseData = stripSecretsRecursively(parsedJson);
    } catch {
      responseData = null;
    }
  } else {
    responseData = await backendResponse.text();
  }

  const responseHeaders = new Headers();
  responseHeaders.set("Cache-Control", "no-store");
  responseHeaders.set("X-Correlation-Id", correlationId);

  // If upstream response sets cookies or auth, handle session cookie expiry on 401
  if (backendResponse.status === 401) {
    responseHeaders.set(
      "Set-Cookie",
      `${cookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax`,
    );
  }

  if (isJson) {
    return NextResponse.json(responseData, {
      status: backendResponse.status,
      headers: responseHeaders,
    });
  }

  return new NextResponse(responseData, {
    status: backendResponse.status,
    headers: responseHeaders,
  });
}

export async function GET(request: NextRequest, context: { params: { path?: string[] } }) {
  return handleProxy(request, context);
}

export async function POST(request: NextRequest, context: { params: { path?: string[] } }) {
  return handleProxy(request, context);
}

export async function DELETE(request: NextRequest, context: { params: { path?: string[] } }) {
  return handleProxy(request, context);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: ALLOWED_METHODS.join(", "),
      "Cache-Control": "no-store",
    },
  });
}
