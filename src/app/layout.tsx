import type { Metadata } from "next";
import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}
