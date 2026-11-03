import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST, GET, DELETE } from "@/app/api/backend/[...path]/route";

describe("Server-Side BFF Proxy Route Handler (D2, D3, D5)", () => {
  beforeEach(() => {
    process.env.BACKEND_API_BASE_URL = "https://api.backend.test";
  });

  function makeRequest(
    url: string,
    options: {
      method?: string;
      headers?: Record<string, string>;
      body?: any;
    } = {},
  ): NextRequest {
    const headers = new Headers({
      host: "localhost:3000",
      origin: "http://localhost:3000",
      "x-axio-authority-client": "true",
      ...(options.headers || {}),
    });

    return new NextRequest(new URL(url, "http://localhost:3000"), {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  }

  describe("Path Allowlist & Traversal Protection", () => {
    it("rejects path traversal sequences (..)", async () => {
      const req = makeRequest("http://localhost:3000/api/backend/api/v1/admin/../secret");
      const res = await GET(req, { params: { path: ["api", "v1", "admin", "..", "secret"] } });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.code).toBe("FORBIDDEN_PATH");
      expect(data.message).toContain("traversal");
    });

    it("rejects encoded traversal sequences (%2e, %2f, %5c)", async () => {
      const req = makeRequest("http://localhost:3000/api/backend/api/v1/admin/%2e%2e/secret");
      const res = await GET(req, { params: { path: ["api", "v1", "admin", "%2e%2e", "secret"] } });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.code).toBe("FORBIDDEN_PATH");
    });

    it("rejects absolute URLs and schemes", async () => {
      const req = makeRequest("http://localhost:3000/api/backend/https://evil.com/api");
      const res = await GET(req, { params: { path: ["https:", "evil.com", "api"] } });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.code).toBe("FORBIDDEN_PATH");
    });

    it("rejects paths not in the allowed API prefix list", async () => {
      const req = makeRequest("http://localhost:3000/api/backend/api/v1/clinical/patients");
      const res = await GET(req, { params: { path: ["api", "v1", "clinical", "patients"] } });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.code).toBe("FORBIDDEN_PATH");
      expect(data.message).toContain("not in the allowed API proxy list");
    });
  });

  describe("CSRF Protection", () => {
    it("rejects mutating requests without custom client header", async () => {
      const req = makeRequest("http://localhost:3000/api/backend/api/v1/admin/hospitals", {
        method: "POST",
        headers: {
          "x-axio-authority-client": "",
          "x-correlation-id": "",
          "x-requested-with": "",
        },
      });
      const res = await POST(req, { params: { path: ["api", "v1", "admin", "hospitals"] } });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.code).toBe("CSRF_VALIDATION_FAILED");
    });

    it("rejects mutating requests with mismatched origin and host", async () => {
      const req = makeRequest("http://localhost:3000/api/backend/api/v1/admin/hospitals", {
        method: "POST",
        headers: {
          origin: "http://malicious-site.attacker",
          host: "localhost:3000",
          "x-axio-authority-client": "true",
        },
      });
      const res = await POST(req, { params: { path: ["api", "v1", "admin", "hospitals"] } });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.code).toBe("CSRF_VALIDATION_FAILED");
    });
  });

  describe("Configuration & Environment Guards", () => {
    it("returns 503 when BACKEND_API_BASE_URL is not set", async () => {
      delete process.env.BACKEND_API_BASE_URL;

      const req = makeRequest("http://localhost:3000/api/backend/api/v1/admin/tenants/t-1");
      const res = await GET(req, { params: { path: ["api", "v1", "admin", "tenants", "t-1"] } });
      expect(res.status).toBe(503);
      const data = await res.json();
      expect(data.code).toBe("BACKEND_NOT_CONFIGURED");
    });
  });
});
