/**
 * API error handling — administrator-facing messages.
 * No stack traces, no secrets; every failure carries a correlation ID.
 */
import { describe, expect, it } from "vitest";
import {
  administratorMessageFor,
  AuthorityApiError,
  BackendNotConfiguredError,
} from "@/lib/api/client";

describe("administratorMessageFor", () => {
  it("maps each status to a human message", () => {
    expect(administratorMessageFor(401)).toMatch(/session has expired/i);
    expect(administratorMessageFor(403)).toMatch(/do not have permission/i);
    expect(administratorMessageFor(404)).toMatch(/not found/i);
    expect(administratorMessageFor(409)).toMatch(/conflicts/i);
    expect(administratorMessageFor(429)).toMatch(/too many requests/i);
    expect(administratorMessageFor(500)).toMatch(/internal error/i);
    expect(administratorMessageFor(503)).toMatch(/unavailable/i);
  });

  it("appends the correlation ID when provided", () => {
    expect(administratorMessageFor(500, "AX-REQ-ABC123")).toContain("AX-REQ-ABC123");
  });

  it("never leaks internals", () => {
    for (const status of [400, 401, 403, 404, 409, 422, 429, 500, 503]) {
      const msg = administratorMessageFor(status, "AX-REQ-X");
      expect(msg).not.toMatch(/stack|trace|password|secret|postgres/i);
    }
  });
});

describe("AuthorityApiError", () => {
  it("carries status, code, and correlation ID", () => {
    const err = new AuthorityApiError(
      403,
      { code: "FORBIDDEN", message: "Denied.", correlationId: "AX-REQ-1" },
      "Denied.",
    );
    expect(err.status).toBe(403);
    expect(err.code).toBe("FORBIDDEN");
    expect(err.correlationId).toBe("AX-REQ-1");
    expect(err.message).toBe("Denied.");
  });
});

describe("BackendNotConfiguredError", () => {
  it("tells the administrator exactly what to configure", () => {
    const err = new BackendNotConfiguredError();
    expect(err.message).toMatch(/NEXT_PUBLIC_AUTHORITY_API_BASE_URL/);
  });
});
