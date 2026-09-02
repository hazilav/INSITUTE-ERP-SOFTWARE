import type { Metadata, Viewport } from "next";
import "./globals.css";
import NetworkStatusListener from "@/components/NetworkStatusListener";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0f172a",
};

export const metadata: Metadata = {
  title: "Institute Management CRM",
  description: "Professional Multi-Tenant Institute Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-50 text-slate-900 selection:bg-brand-500 selection:text-white">
        <NetworkStatusListener />
        {children}
      </body>
    </html>
  );
}
