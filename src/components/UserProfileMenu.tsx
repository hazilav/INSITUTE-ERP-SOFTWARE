"use client";

import { useState, useRef, useEffect } from "react";
import { LogOut, User as UserIcon, Shield, Building2, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";

interface UserProfileMenuProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
  institute: {
    name: string;
    logo?: string | null;
  };
}

export default function UserProfileMenu({ user, institute }: UserProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout failed", err);
      setLoggingOut(false);
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case "OWNER":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "ADMIN":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "STAFF":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "MENTOR":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "STUDENT":
        return "bg-slate-100 text-slate-700 border-slate-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 p-1.5 pr-3 rounded-xl hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      >
        <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-semibold text-sm flex items-center justify-center shadow-sm">
          {initials}
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-sm font-semibold text-slate-800 leading-tight">{user.name}</p>
          <p className="text-xs text-slate-500 capitalize">{user.role.toLowerCase()}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-xs sm:hidden"
            onClick={() => setIsOpen(false)}
          />

          <div className="fixed top-16 left-3 right-3 sm:absolute sm:top-auto sm:left-auto sm:right-0 sm:mt-2 sm:w-72 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 max-h-[85vh] overflow-y-auto">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-sm font-bold text-slate-900">{user.name}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
              
              <div className="flex items-center gap-2 mt-2.5">
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-md border ${getRoleBadgeStyle(user.role)}`}>
                  {user.role}
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1 truncate">
                  <Building2 className="w-3.5 h-3.5" /> {institute.name}
                </span>
              </div>
            </div>

            <div className="px-2 py-1.5">
              <div className="px-3 py-2 text-xs text-slate-400 font-medium flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-emerald-500" /> Multi-Tenant Secured
              </div>
            </div>

            <div className="border-t border-slate-100 pt-1 px-2">
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium disabled:opacity-50"
              >
                <LogOut className="w-4 h-4" />
                {loggingOut ? "Logging out..." : "Logout"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
