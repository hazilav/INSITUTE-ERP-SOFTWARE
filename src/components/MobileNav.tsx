"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  MoreHorizontal,
  GraduationCap,
  CalendarCheck,
  BadgeDollarSign,
  UserCheck,
  BarChart3,
  FileText,
  Settings,
  BookOpen,
  Layers,
  FileBarChart,
  User,
  X,
  UserPlus,
} from "lucide-react";

interface MobileNavProps {
  role: string;
}

export default function MobileNav({ role }: MobileNavProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  // Section 17: STUDENT MOBILE NAVIGATION
  if (role === "STUDENT") {
    const studentTabs = [
      { name: "Home", href: "/student/dashboard", icon: LayoutDashboard },
      { name: "Classes", href: "/student/classes", icon: GraduationCap },
      { name: "Activities", href: "/student/activities", icon: ClipboardList },
      { name: "Progress", href: "/student/marks", icon: FileBarChart },
      { name: "Profile", href: "/student/profile", icon: User },
    ];

    return (
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
        {studentTabs.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all ${
                isActive ? "text-brand-600 font-extrabold" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] tracking-tight">{tab.name}</span>
            </Link>
          );
        })}
      </div>
    );
  }

  // Section 16: STAFF MOBILE NAVIGATION
  if (role === "STAFF" || role === "MENTOR") {
    const staffTabs = [
      { name: "Home", href: "/dashboard", icon: LayoutDashboard },
      { name: "Tasks", href: "/dashboard/reports/staff-tasks", icon: ClipboardList },
      { name: "Classes", href: "/dashboard/classes", icon: GraduationCap },
      { name: "Students", href: "/dashboard/students", icon: Users },
    ];

    const staffMoreItems = [
      { name: "Activities", href: "/dashboard/activities", icon: ClipboardList },
      { name: "Attendance", href: "/dashboard/staff/my-attendance", icon: CalendarCheck },
      { name: "Profile", href: "/dashboard/staff", icon: User },
    ];

    return (
      <>
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
          {staffTabs.map((tab) => {
            const isActive = pathname === tab.href;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all ${
                  isActive ? "text-brand-600 font-extrabold" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] tracking-tight">{tab.name}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-slate-500 hover:text-slate-900 font-medium"
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">More</span>
          </button>
        </div>

        {moreOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setMoreOpen(false)} />
            <div className="relative bg-white rounded-t-3xl p-6 border-t border-slate-100 shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm">Staff Menu</h3>
                <button onClick={() => setMoreOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {staffMoreItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-slate-50 hover:bg-brand-50 text-slate-700 hover:text-brand-600 font-bold text-xs text-center border border-slate-100 transition-colors"
                    >
                      <Icon className="w-5 h-5 text-brand-600" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Section 15: OWNER / ADMIN MOBILE NAVIGATION
  const ownerTabs = [
    { name: "Home", href: "/dashboard", icon: LayoutDashboard },
    { name: "Students", href: "/dashboard/students", icon: Users },
    { name: "Tasks", href: "/dashboard/reports/staff-tasks", icon: ClipboardList },
  ];

  const ownerMoreItems = [
    { name: "Admissions", href: "/dashboard/admissions", icon: UserPlus },
    { name: "Courses", href: "/dashboard/courses", icon: BookOpen },
    { name: "Batches", href: "/dashboard/batches", icon: Layers },
    { name: "Classes", href: "/dashboard/classes", icon: GraduationCap },
    { name: "Attendance", href: "/dashboard/attendance", icon: CalendarCheck },
    { name: "Fees", href: "/dashboard/fees", icon: BadgeDollarSign },
    { name: "Staff & Mentors", href: "/dashboard/staff", icon: UserCheck },
    { name: "Reports", href: "/dashboard/reports", icon: BarChart3 },
    { name: "Documents", href: "/dashboard/students/documents", icon: FileText },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <>
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
        {ownerTabs.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all ${
                isActive ? "text-brand-600 font-extrabold" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] tracking-tight">{tab.name}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-slate-500 hover:text-slate-900 font-medium"
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px] tracking-tight">More</span>
        </button>
      </div>

      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setMoreOpen(false)} />
          <div className="relative bg-white rounded-t-3xl p-6 border-t border-slate-100 shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-200 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">CRM Modules</h3>
              <button onClick={() => setMoreOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {ownerMoreItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-slate-50 hover:bg-brand-50 text-slate-700 hover:text-brand-600 font-bold text-xs text-center border border-slate-100 transition-colors"
                  >
                    <Icon className="w-5 h-5 text-brand-600" />
                    <span className="truncate w-full">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
