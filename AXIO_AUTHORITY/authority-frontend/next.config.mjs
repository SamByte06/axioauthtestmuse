/** @type {import('next').NextConfig} */
const apiBaseUrl = process.env.NEXT_PUBLIC_AUTHORITY_API_BASE_URL?.trim();
const connectOrigins = ["'self'"];
if (apiBaseUrl) {
  try {
    connectOrigins.push(new URL(apiBaseUrl).origin);
  } catch {
    connectOrigins.push(apiBaseUrl);
  }
}

// Next.js 14 client runtime uses inline bootstrap scripts, requiring 'unsafe-inline'
// when strict cryptographic nonces are not configured.
// 'unsafe-inline' for style-src accommodates CSS-in-JS and Next.js inline style injections.
const cspHeader = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  `connect-src ${connectOrigins.join(" ")}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: [
    "@axio-authority/shared-types",
    "@axio-authority/api-contracts",
    "@axio-authority/validation",
    "@axio-authority/ui",
  ],
  async headers() {
    return [
      {
        // Baseline and hardened security headers for an administrative control plane.
        // The backend API enforces authN/authZ; these headers reduce
        // common browser-side attack surfaces (XSS, clickjacking, MIME-sniffing, downgrade attacks).
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: cspHeader,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
