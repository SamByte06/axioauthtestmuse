import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ROLE_PERMISSIONS, type AuthorityRole } from "@axio-authority/shared-types";

export const dynamic = "force-dynamic";

/**
 * Server-side proxy (BFF) route handler for AxioVital Authority.
 *
 * Forwards requests to the live ASP.NET Core admin API (BACKEND_API_BASE_URL).
 * Keeps credentials and tokens in server-side HttpOnly cookies, eliminating
 * CORS and browser exposure of upstream tokens and secrets.
 *
 * Security properties (D2, D3, D5):
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
 * 11. Auth exchange (D5): exchanges login credentials upstream, places JWT in HttpOnly cookie,
 *     returns only session summary (identity, roles, permissions) to browser.
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

  if (lower.startsWith("http://") || lower.startsWith("https://") || lower.startsWith("//") || lower.includes(":")) {
    return { valid: false, error: "Absolute URLs and URI schemes are strictly forbidden." };
  }

  const isAllowed = ALLOWED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (!isAllowed) {
    return { valid: false, error: `Requested path '${pathname}' is not in the allowed API proxy list.` };
  }

  return { valid: true };
}

function validateCsrf(request: NextRequest, method: string): boolean {
  if (method === "GET") return true;

  const hasCustomHeader =
    request.headers.has("x-correlation-id") ||
    request.headers.has("x-axio-authority-client") ||
    request.headers.has("x-requested-with");

  if (!hasCustomHeader) {
    return false;
  }

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

  const correlationId =
    request.headers.get("x-correlation-id") ||
    `AX-REQ-${crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;

  const cookieName = process.env.AUTHORITY_SESSION_COOKIE_NAME || "axio_authority_session";
  const sessionToken = request.cookies.get(cookieName)?.value;

  // ---------------------------------------------------------------------------
  // D5: Specialized Authentication Handlers (Server-Side Session Exchange)
  // ---------------------------------------------------------------------------

  // 1. Login Handler
  if (rawPath.endsWith("/auth/login") && method === "POST") {
    const loginPath = process.env.AUTHORITY_LOGIN_PATH?.trim() || "/api/v1/auth/login";
    let bodyJson: any;
    try {
      bodyJson = await request.json();
    } catch {
      return NextResponse.json(
        { code: "INVALID_JSON", message: "Invalid JSON request body." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    try {
      const upstreamRes = await fetch(`${baseUrl}${loginPath}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Correlation-Id": correlationId,
        },
        body: JSON.stringify({
          email: bodyJson.email,
          username: bodyJson.email,
          password: bodyJson.password,
        }),
        cache: "no-store",
      });

      if (!upstreamRes.ok) {
        return NextResponse.json(
          { code: "AUTHENTICATION_FAILED", message: "Invalid email or password." },
          { status: upstreamRes.status, headers: { "Cache-Control": "no-store" } },
        );
      }

      const authData = await upstreamRes.json();
      const token = authData.accessToken || authData.token;

      // Extract roles and permissions
      const roles: AuthorityRole[] = (authData.roles as AuthorityRole[]) || ["SUPER_AUTHORITY_ADMIN"];
      const permissions: string[] =
        authData.permissions ||
        Array.from(new Set(roles.flatMap((r) => ROLE_PERMISSIONS[r] || [])));

      const session = {
        administratorId: authData.userId || authData.axioId || "admin-1",
        displayName: authData.fullName || authData.firstName || bodyJson.email,
        email: authData.email || bodyJson.email,
        roles,
        permissions,
        expiresAt: authData.expiresAtUtc || new Date(Date.now() + 8 * 3600000).toISOString(),
      };

      const isSecure = process.env.NODE_ENV === "production";
      const response = NextResponse.json(
        { session },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store",
            "X-Correlation-Id": correlationId,
          },
        },
      );

      // Set HttpOnly session cookie if token is returned
      if (token) {
        response.cookies.set({
          name: cookieName,
          value: token,
          httpOnly: true,
          secure: isSecure,
          sameSite: "lax",
          path: "/",
          maxAge: 8 * 3600, // 8 hours
        });
      }

      return response;
    } catch {
      return NextResponse.json(
        { code: "BACKEND_UNREACHABLE", message: "Unable to reach auth backend.", correlationId },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }
  }

  // 2. Session / Me Handler
  if ((rawPath.endsWith("/auth/session") || rawPath.endsWith("/auth/me")) && method === "GET") {
    if (!sessionToken) {
      return NextResponse.json(
        { code: "UNAUTHENTICATED", message: "No active session." },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }

    try {
      const upstreamRes = await fetch(`${baseUrl}/api/v1/auth/me`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${sessionToken}`,
          "X-Correlation-Id": correlationId,
        },
        cache: "no-store",
      });

      if (!upstreamRes.ok) {
        const res = NextResponse.json(
          { code: "SESSION_EXPIRED", message: "Session expired or invalid." },
          { status: 401, headers: { "Cache-Control": "no-store" } },
        );
        res.cookies.delete(cookieName);
        return res;
      }

      const meData = await upstreamRes.json();
      const roles: AuthorityRole[] = (meData.roles as AuthorityRole[]) || ["SUPER_AUTHORITY_ADMIN"];
      const permissions: string[] =
        meData.permissions ||
        Array.from(new Set(roles.flatMap((r) => ROLE_PERMISSIONS[r] || [])));

      const session = {
        administratorId: meData.userId || meData.axioId || meData.id || "admin-1",
        displayName: meData.fullName || meData.firstName || meData.email || "Administrator",
        email: meData.email || "admin@example.org",
        roles,
        permissions,
        expiresAt: meData.expiresAtUtc || new Date(Date.now() + 8 * 3600000).toISOString(),
      };

      return NextResponse.json(session, {
        status: 200,
        headers: { "Cache-Control": "no-store", "X-Correlation-Id": correlationId },
      });
    } catch {
      return NextResponse.json(
        { code: "BACKEND_UNREACHABLE", message: "Unable to reach session backend.", correlationId },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }
  }

  // 3. Logout Handler
  if (rawPath.endsWith("/auth/logout") && method === "POST") {
    if (sessionToken) {
      try {
        await fetch(`${baseUrl}/api/v1/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${sessionToken}`,
            "X-Correlation-Id": correlationId,
          },
          cache: "no-store",
        });
      } catch {
        // Continue clearing local cookie even if upstream fails
      }
    }

    const response = NextResponse.json(
      { success: true },
      { status: 200, headers: { "Cache-Control": "no-store", "X-Correlation-Id": correlationId } },
    );
    response.cookies.delete(cookieName);
    return response;
  }

  // ---------------------------------------------------------------------------
  // Standard Backend Forwarding
  // ---------------------------------------------------------------------------

  const forwardHeaders: Record<string, string> = {
    Accept: "application/json",
    "X-Correlation-Id": correlationId,
  };

  const contentType = request.headers.get("content-type");
  if (contentType) forwardHeaders["Content-Type"] = contentType;

  const idempotencyKey = request.headers.get("idempotency-key");
  if (idempotencyKey) forwardHeaders["Idempotency-Key"] = idempotencyKey;

  if (sessionToken) {
    forwardHeaders["Authorization"] = `Bearer ${sessionToken}`;
  }

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
      // Body empty or unreadable
    }
  }

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

  const responseContentType = backendResponse.headers.get("content-type") || "";
  const isJson = responseContentType.includes("application/json");

  let responseData: any;
  if (isJson) {
    try {
      const parsedJson = await backendResponse.json();
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
