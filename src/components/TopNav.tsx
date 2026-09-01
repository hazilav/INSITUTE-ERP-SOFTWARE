"use client";

import { useState } from "react";
import { Menu, Search, Building2 } from "lucide-react";
import UserProfileMenu from "./UserProfileMenu";
import NotificationBell from "./NotificationBell";
import GlobalSearchModal from "./GlobalSearchModal";

interface TopNavProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
  institute: {
    name: string;
    logo?: string | null;
  };
  onOpenSidebar: () => void;
}

export default function TopNav({ user, institute, onOpenSidebar }: TopNavProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200/80 sticky top-0 z-30 px-4 lg:px-6 flex items-center justify-between shadow-xs">
        {/* Left section */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSidebar}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl lg:hidden transition-colors"
            aria-label="Open Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/80 text-slate-700 text-sm font-medium border border-slate-200/60">
            <Building2 className="w-4 h-4 text-brand-600" />
            <span className="truncate max-w-[180px] md:max-w-[260px]">{institute.name}</span>
          </div>
        </div>

        {/* Center Search Input Trigger */}
        <div
          onClick={() => setSearchOpen(true)}
          className="flex items-center justify-between cursor-pointer max-w-md flex-1 min-w-0 mx-1.5 sm:mx-4 px-2.5 sm:px-3.5 py-1.5 bg-slate-100/80 hover:bg-slate-100 border border-slate-200/80 rounded-xl text-xs text-slate-500 transition-all shadow-xs"
        >
          <div className="flex items-center gap-2 min-w-0 truncate">
            <Search className="w-4 h-4 text-brand-600 shrink-0" />
            <span className="font-medium text-slate-600 truncate text-[11px] sm:text-xs">Search students, courses...</span>
          </div>
          <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-400 bg-white border border-slate-200 rounded shrink-0">
            Ctrl K
          </kbd>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
          <NotificationBell isStudent={false} />

          <div className="hidden sm:block h-6 w-[1px] bg-slate-200" />

          <UserProfileMenu user={user} institute={institute} />
        </div>
      </header>

      {/* Global Search Modal */}
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
