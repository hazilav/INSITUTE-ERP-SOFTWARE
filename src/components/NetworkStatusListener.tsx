"use client";

import { useState, useEffect } from "react";
import { Wifi, WifiOff } from "lucide-react";

export default function NetworkStatusListener() {
  const [isOnline, setIsOnline] = useState(true);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowRestored(true);
      const timer = setTimeout(() => setShowRestored(false), 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowRestored(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline && !showRestored) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
      {!isOnline ? (
        <div className="px-4 py-2 rounded-full bg-slate-900 text-white shadow-xl border border-slate-700 text-xs font-bold flex items-center gap-2">
          <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
          <span>You&apos;re offline. Changes will sync when reconnected.</span>
        </div>
      ) : (
        <div className="px-4 py-2 rounded-full bg-emerald-600 text-white shadow-xl text-xs font-bold flex items-center gap-2">
          <Wifi className="w-4 h-4 text-white shrink-0" />
          <span>Connection restored.</span>
        </div>
      )}
    </div>
  );
}
