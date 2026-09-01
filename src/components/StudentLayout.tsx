"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  GraduationCap,
  PlayCircle,
  CalendarCheck,
  ClipboardList,
  FileBarChart,
  BadgeDollarSign,
  CheckSquare,
  User,
  LogOut,
  Building2,
  Menu,
  X,
  Bell,
} from "lucide-react";
import NotificationBell from "./NotificationBell";

interface StudentLayoutProps {
  children: React.ReactNode;
  student: {
    name: string;
    student_code: string;
    photo?: string | null;
    learning_mode: string;
    course?: { name: string } | null;
    batch?: { name: string } | null;
  };
  instituteName: string;
  instituteMode?: string;
}

export default function StudentLayout({
  children,
  student,
  instituteName,
  instituteMode = "hybrid",
}: StudentLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { name: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
    { name: "My Classes", href: "/student/classes", icon: GraduationCap },
  ];

  // Show Recorded Content for Online & Hybrid modes
  if (instituteMode === "online" || instituteMode === "hybrid") {
    navItems.push({ name: "Recorded Classes", href: "/student/content", icon: PlayCircle });
  }

  navItems.push(
    { name: "Attendance", href: "/student/attendance", icon: CalendarCheck },
    { name: "Activities", href: "/student/activities", icon: ClipboardList },
    { name: "Results", href: "/student/marks", icon: FileBarChart },
    { name: "Fees", href: "/student/fees", icon: BadgeDollarSign },
    { name: "My Tasks", href: "/student/tasks", icon: CheckSquare },
    { name: "Profile", href: "/student/profile", icon: User }
  );

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/student/login");
      router.refresh();
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const initials = student.name
    ? student.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "S";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-slate-900 text-slate-300 flex-col fixed top-0 bottom-0 left-0 z-40">
        {/* Header */}
        <div className="h-16 px-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-500 to-indigo-500 text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h1 className="font-bold text-white text-xs truncate">{instituteName}</h1>
              <p className="text-[10px] text-brand-400 font-mono tracking-wider uppercase">Student Portal</p>
            </div>
          </div>
          <NotificationBell isStudent={true} />
        </div>

        {/* Student Profile Quick Badge */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-800/40">
          <div className="flex items-center gap-3">
            {student.photo ? (
              <img src={student.photo} alt={student.name} className="w-9 h-9 rounded-xl object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-brand-600 text-white font-bold text-xs flex items-center justify-center">
                {initials}
              </div>
            )}
            <div className="truncate">
              <p className="text-xs font-bold text-white truncate">{student.name}</p>
              <p className="text-[11px] font-mono text-brand-400 font-bold">{student.student_code}</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== "/student/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs transition-all ${
                  active
                    ? "bg-brand-600 text-white shadow-lg shadow-brand-600/20 font-bold"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout Footer */}
        <div className="p-3 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 font-semibold text-xs transition-colors"
          >
            <LogOut className="w-4 h-4" /> Log Out
          </button>
        </div>
      </aside>

      {/* Mobile Top Navbar */}
      <header className="lg:hidden h-16 bg-slate-900 text-white px-4 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold text-xs">
            {initials}
          </div>
          <div>
            <h1 className="font-bold text-xs truncate max-w-[160px]">{student.name}</h1>
            <p className="text-[10px] text-brand-400 font-mono">{student.student_code}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-300 hover:text-white rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Dropdown Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-16 bg-slate-900 border-b border-slate-800 z-40 p-4 space-y-2 animate-in slide-in-from-top duration-200">
          <div className="grid grid-cols-2 gap-2">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 p-2.5 sm:p-3 rounded-xl bg-slate-800/80 text-[11px] sm:text-xs font-semibold text-slate-200 hover:bg-brand-600 hover:text-white transition-colors"
              >
                <item.icon className="w-4 h-4 text-brand-400" />
                <span>{item.name}</span>
              </Link>
            ))}
          </div>

          <button
            onClick={handleLogout}
            className="w-full mt-3 py-2.5 rounded-xl bg-rose-900/30 text-rose-300 font-semibold text-xs flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Log Out
          </button>
        </div>
      )}

      {/* Main Content Body */}
      <main className="flex-1 lg:ml-64 p-3 sm:p-6 lg:p-8 pb-20 lg:pb-8 max-w-7xl mx-auto w-full min-w-0">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 z-40 flex items-center justify-around px-2 shadow-lg">
        {navItems.slice(0, 5).map((item) => {
          const active = pathname === item.href || (item.href !== "/student/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center gap-1 p-1 transition-colors ${
                active ? "text-brand-600 font-bold" : "text-slate-400 hover:text-slate-700"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] tracking-tight">{item.name.replace("My ", "")}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
