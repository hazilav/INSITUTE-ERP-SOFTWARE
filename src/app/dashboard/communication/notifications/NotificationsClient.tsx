"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  Check,
  ExternalLink,
  Sliders,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Sparkles,
} from "lucide-react";

interface NotificationItem {
  id: string;
  type: string;
  category: string;
  title: string;
  message: string;
  priority: string;
  action_url?: string | null;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
}

interface NotificationsClientProps {
  isStudent?: boolean;
  role: string;
}

export default function NotificationsClient({
  isStudent = false,
  role,
}: NotificationsClientProps) {
  const [tab, setTab] = useState<"all" | "unread" | "important" | "settings">("all");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Preference Settings State
  const [preferences, setPreferences] = useState<Record<string, boolean>>({
    Academic: true,
    Attendance: true,
    Finance: true,
    Tasks: true,
    System: true,
  });

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`/api/notifications?filter=${tab}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (err) {
      console.error("Failed to load notifications", err);
    }
  };

  const fetchPreferences = async () => {
    try {
      const res = await fetch("/api/notifications/preferences");
      const data = await res.json();
      if (res.ok && data.success) {
        setPreferences(data.preferences);
      }
    } catch (err) {
      console.error("Failed to load preferences", err);
    }
  };

  useEffect(() => {
    if (tab !== "settings") {
      fetchNotifications();
    } else {
      fetchPreferences();
    }
  }, [tab]);

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notification_id: id }),
      });
      if (res.ok) fetchNotifications();
    } catch (err) {
      console.error("Failed to mark notification as read", err);
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
      if (res.ok) fetchNotifications();
    } catch (err) {
      console.error("Failed to mark all as read", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePreference = async (category: string, currentVal: boolean) => {
    const newVal = !currentVal;
    setPreferences((prev) => ({ ...prev, [category]: newVal }));
    try {
      await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, enabled: newVal }),
      });
    } catch (err) {
      console.error("Failed to update preference", err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Bell className="w-7 h-7 text-brand-600" /> Notification Center
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Real-time activity alerts, reminders, and category preferences
          </p>
        </div>

        {tab !== "settings" && unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-colors self-start sm:self-auto shadow-xs"
          >
            <CheckCheck className="w-4 h-4 text-emerald-600" /> Mark All as Read
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setTab("all")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            tab === "all"
              ? "bg-brand-600 text-white shadow-md shadow-brand-500/20"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          All Notifications
        </button>

        <button
          onClick={() => setTab("unread")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            tab === "unread"
              ? "bg-brand-600 text-white shadow-md shadow-brand-500/20"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <span>Unread</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-rose-500 text-white font-extrabold">
              {unreadCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setTab("important")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            tab === "important"
              ? "bg-brand-600 text-white shadow-md shadow-brand-500/20"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          Important / Urgent
        </button>

        <button
          onClick={() => setTab("settings")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ml-auto flex items-center gap-1.5 ${
            tab === "settings"
              ? "bg-brand-600 text-white shadow-md shadow-brand-500/20"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" /> Notification Settings
        </button>
      </div>

      {/* Main Content Area */}
      {tab !== "settings" ? (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-3">
          {notifications.length > 0 ? (
            <div className="space-y-3">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                    !n.is_read
                      ? "bg-brand-50/50 border-brand-200/80 shadow-xs"
                      : "bg-slate-50/60 border-slate-100"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {!n.is_read ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-brand-600 shrink-0 mt-1.5" />
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0 mt-1.5" />
                    )}

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{n.title}</span>

                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded capitalize ${
                            n.priority === "Urgent"
                              ? "bg-rose-100 text-rose-800 border border-rose-200"
                              : n.priority === "Important"
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {n.priority}
                        </span>

                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-purple-50 text-purple-700 border border-purple-200">
                          {n.type}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>

                      <p className="text-[11px] font-mono text-slate-400">
                        {new Date(n.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {!n.is_read && (
                      <button
                        onClick={() => handleMarkAsRead(n.id)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs flex items-center gap-1 shadow-2xs"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-600" /> Mark Read
                      </button>
                    )}

                    {n.action_url && (
                      <Link
                        href={n.action_url}
                        className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs flex items-center gap-1 shadow-xs transition-colors"
                      >
                        View Record <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-16 text-center text-xs text-slate-400">
              No notifications found in this view.
            </div>
          )}
        </div>
      ) : (
        /* Settings Tab */
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6 max-w-3xl">
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg">Notification Preferences</h3>
            <p className="text-xs text-slate-500 mt-1">
              Select which in-app notification categories you wish to receive
            </p>
          </div>

          <div className="space-y-4">
            {["Academic", "Attendance", "Finance", "Tasks", "System"].map((category) => (
              <div
                key={category}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between"
              >
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{category} Notifications</h4>
                  <p className="text-xs text-slate-500">
                    Receive alerts for {category.toLowerCase()} events and updates.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences[category] !== false}
                    onChange={() => handleTogglePreference(category, preferences[category] !== false)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                </label>
              </div>
            ))}

            {/* Critical Security Guard Note */}
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <strong className="block font-bold">Critical Security Notifications are Always Active</strong>
                <span>
                  Account security alerts (e.g. password changes and status updates) cannot be disabled.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
