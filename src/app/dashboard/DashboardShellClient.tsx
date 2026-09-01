"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopNav from "@/components/TopNav";
import MobileNav from "@/components/MobileNav";

interface DashboardShellClientProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    institute_id: string;
  };
  institute: {
    id: string;
    name: string;
    logo?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  };
  children: React.ReactNode;
}

export default function DashboardShellClient({
  user,
  institute,
  children,
}: DashboardShellClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row">
      {/* Sidebar Navigation */}
      <Sidebar
        instituteName={institute.name}
        logo={institute.logo}
        role={user.role}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen min-w-0 w-full">
        {/* Top Navbar */}
        <TopNav
          user={user}
          institute={institute}
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        {/* Dynamic Page Content */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 pb-20 md:pb-8 max-w-7xl w-full mx-auto min-w-0">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav role={user.role} />
    </div>
  );
}
