import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth/session";
import { AxioToastProvider } from "@/components/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "AxioVital Authority",
  description:
    "AxioVital Authority — the platform control plane for the AxioVital B2B healthcare network.",
  robots: { index: false, follow: false }, // admin console: never indexed
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-slate-100 font-sans text-slate-900 antialiased">
        <AuthProvider>
          <AxioToastProvider>{children}</AxioToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
