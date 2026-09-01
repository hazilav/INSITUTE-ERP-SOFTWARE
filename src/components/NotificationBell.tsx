"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Bell, Check, ExternalLink, ShieldAlert, CheckCircle2, Clock } from "lucide-react";

interface NotificationItem {
  id: string;
  type: string;
  category: string;
  title: string;
  message: string;
  priority: string;
  action_url?: string | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationBellProps {
  isStudent?: boolean;
}

export default function NotificationBell({ isStudent = false }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications?limit=10");
      const data = await res.json();
      if (res.ok && data.success) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (err) {
      console.error("Failed to fetch bell notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Polling every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notification_id: id }),
      });
      if (res.ok) {
        fetchNotifications();
      }
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mark_all: true }),
      });
      if (res.ok) {
        fetchNotifications();
      }
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    } finally {
      setLoading(false);
    }
  };

  const targetAllUrl = isStudent ? "/student/notifications" : "/dashboard/communication/notifications";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-white text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={loading}
                className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-semibold flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.length > 0 ? (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    if (!n.is_read) handleMarkAsRead(n.id);
                  }}
                  className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer flex gap-3 ${
                    !n.is_read ? "bg-brand-50/40 dark:bg-brand-950/20" : ""
                  }`}
                >
                  <div className="pt-0.5">
                    {!n.is_read ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-brand-600 block mt-1" />
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700 block mt-1" />
                    )}
                  </div>

                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">{n.title}</span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{n.message}</p>

                    {n.action_url && (
                      <Link
                        href={n.action_url}
                        onClick={() => setOpen(false)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:underline pt-1"
                      >
                        View Details <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                No notifications right now.
              </div>
            )}
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 text-center">
            <Link
              href={targetAllUrl}
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
            >
              View Notification Center &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
