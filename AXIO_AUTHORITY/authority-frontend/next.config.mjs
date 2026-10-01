/** @type {import('next').NextConfig} */
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
        // Baseline security headers for an administrative console.
        // The backend API enforces authN/authZ; these headers reduce
        // common browser-side attack surface.
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
