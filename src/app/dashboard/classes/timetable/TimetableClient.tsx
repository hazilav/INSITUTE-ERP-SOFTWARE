"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/Modal";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  Plus,
  Filter,
  Clock,
  MapPin,
  Video,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  RefreshCw,
  X,
  FileText,
  ChevronLeft,
  ChevronRight,
  DoorOpen,
} from "lucide-react";

interface TimetableClientProps {
  instituteName: string;
  userRole: string;
  userId: string;
  courses: { id: string; name: string }[];
  batches: { id: string; name: string }[];
  mentors: { id: string; name: string }[];
  rooms: { id: string; name: string; room_number: string; capacity: number }[];
}

export default function TimetableClient({
  instituteName,
  userRole,
  userId,
  courses,
  batches,
  mentors,
  rooms,
}: TimetableClientProps) {
  const [viewMode, setViewMode] = useState<"today" | "week" | "month">("week");
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    return new Date(d.setDate(diff));
  });

  // Filters
  const [selectedCourse, setSelectedCourse] = useState("ALL");
  const [selectedBatch, setSelectedBatch] = useState("ALL");
  const [selectedMentor, setSelectedMentor] = useState(userRole === "MENTOR" ? userId : "ALL");
  const [selectedClassType, setSelectedClassType] = useState("ALL");
  const [selectedRoom, setSelectedRoom] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<any | null>(null);

  // Modals
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Schedule Form State
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [courseId, setCourseId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [mentorId, setMentorId] = useState(userRole === "MENTOR" ? userId : "");
  const [classType, setClassType] = useState("physical"); // physical, live_online, hybrid
  const [classDate, setClassDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("10:00 AM");
  const [endTime, setEndTime] = useState("11:00 AM");
  const [roomId, setRoomId] = useState("");
  const [meetingPlatform, setMeetingPlatform] = useState("Zoom");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [meetingIdStr, setMeetingIdStr] = useState("");
  const [meetingPassword, setMeetingPassword] = useState("");

  // Recurrence
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState("weekly");
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>(["MON", "WED"]);
  const [endDate, setEndDate] = useState("");

  // Reschedule / Cancel Form State
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleStartTime, setRescheduleStartTime] = useState("10:00 AM");
  const [rescheduleEndTime, setRescheduleEndTime] = useState("11:00 AM");
  const [cancellationReason, setCancellationReason] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [formWarnings, setFormWarnings] = useState<string[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchClasses();
  }, [currentWeekStart, viewMode, selectedCourse, selectedBatch, selectedMentor, selectedClassType, selectedRoom]);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      let url = `/api/classes?view=${viewMode}&startDate=${currentWeekStart.toISOString().slice(0, 10)}`;
      if (selectedCourse !== "ALL") url += `&course_id=${selectedCourse}`;
      if (selectedBatch !== "ALL") url += `&batch_id=${selectedBatch}`;
      if (selectedMentor !== "ALL") url += `&mentor_id=${selectedMentor}`;
      if (selectedClassType !== "ALL") url += `&class_type=${selectedClassType}`;
      if (selectedRoom !== "ALL") url += `&room_id=${selectedRoom}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setClasses(data.classes);
      }
    } catch (err) {
      console.error("Failed to fetch classes", err);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormErrors([]);
    setFormWarnings([]);
    setMessage(null);

    try {
      const res = await fetch("/api/classes/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          topic,
          course_id: courseId,
          batch_id: batchId,
          mentor_id: mentorId || null,
          class_type: classType,
          date: classDate,
          start_time: startTime,
          end_time: endTime,
          room_id: roomId || null,
          meeting_platform: meetingPlatform,
          meeting_link: meetingUrl,
          meeting_id: meetingIdStr,
          meeting_password: meetingPassword,
          is_recurring: isRecurring,
          recurrence_type: recurrenceType,
          days_of_week: daysOfWeek,
          end_date: endDate,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: data.message });
        if (data.warnings && data.warnings.length > 0) {
          setFormWarnings(data.warnings);
        }
        setShowScheduleModal(false);
        resetScheduleForm();
        fetchClasses();
      } else {
        if (data.conflicts) {
          setFormErrors(data.conflicts);
        } else {
          setFormErrors([data.error || "Failed to schedule class."]);
        }
      }
    } catch (err: any) {
      setFormErrors([err.message || "Network error while scheduling class."]);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass) return;
    setSubmitting(true);
    setFormErrors([]);

    try {
      const res = await fetch(`/api/classes/${selectedClass.id}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: rescheduleDate,
          start_time: rescheduleStartTime,
          end_time: rescheduleEndTime,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "Class rescheduled successfully." });
        setShowRescheduleModal(false);
        setSelectedClass(null);
        fetchClasses();
      } else {
        setFormErrors(data.conflicts || [data.error || "Failed to reschedule class."]);
      }
    } catch (err: any) {
      setFormErrors([err.message || "Network error."]);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !cancellationReason.trim()) return;
    setSubmitting(true);
    setFormErrors([]);

    try {
      const res = await fetch(`/api/classes/${selectedClass.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cancellation_reason: cancellationReason,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "Class cancelled successfully." });
        setShowCancelModal(false);
        setSelectedClass(null);
        setCancellationReason("");
        fetchClasses();
      } else {
        setFormErrors([data.error || "Failed to cancel class."]);
      }
    } catch (err: any) {
      setFormErrors([err.message || "Network error."]);
    } finally {
      setSubmitting(false);
    }
  };

  const resetScheduleForm = () => {
    setTitle("");
    setTopic("");
    setCourseId("");
    setBatchId("");
    setMentorId(userRole === "MENTOR" ? userId : "");
    setClassType("physical");
    setClassDate(new Date().toISOString().slice(0, 10));
    setStartTime("10:00 AM");
    setEndTime("11:00 AM");
    setRoomId("");
    setMeetingUrl("");
    setMeetingIdStr("");
    setMeetingPassword("");
    setIsRecurring(false);
    setEndDate("");
  };

  // Helper for generating week days (Monday to Sunday)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Timetable & Class Schedule
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Weekly Interactive Calendar & Conflict Detection Engine — {instituteName}
          </p>
        </div>

        {userRole !== "STUDENT" && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                resetScheduleForm();
                setShowScheduleModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/20 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Schedule Class
            </button>
          </div>
        )}
      </div>

      {/* Alert Banner */}
      {message && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold border flex items-center justify-between ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="underline text-[11px]">Dismiss</button>
        </div>
      )}

      {/* Top Controls & Filter Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* View Selector (Today, Week, Month) & Date Nav */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setViewMode("today")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  viewMode === "today" ? "bg-white text-brand-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setViewMode("week")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  viewMode === "week" ? "bg-white text-brand-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode("month")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  viewMode === "month" ? "bg-white text-brand-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Month
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const d = new Date(currentWeekStart);
                  d.setDate(d.getDate() - 7);
                  setCurrentWeekStart(d);
                }}
                className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold text-slate-800 px-2 font-mono">
                {currentWeekStart.toLocaleDateString()} – {weekDays[6].toLocaleDateString()}
              </span>
              <button
                onClick={() => {
                  const d = new Date(currentWeekStart);
                  d.setDate(d.getDate() + 7);
                  setCurrentWeekStart(d);
                }}
                className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchClasses}
            className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {/* Multi-Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 pt-2 border-t border-slate-100">
          <div>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-700"
            >
              <option value="ALL">All Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-700"
            >
              <option value="ALL">All Batches</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedMentor}
              onChange={(e) => setSelectedMentor(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-700"
            >
              <option value="ALL">All Mentors</option>
              {mentors.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedClassType}
              onChange={(e) => setSelectedClassType(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-700"
            >
              <option value="ALL">All Class Types</option>
              <option value="physical">Offline</option>
              <option value="live_online">Live Online</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>

          <div>
            <select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-700"
            >
              <option value="ALL">All Rooms</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>{r.name} ({r.room_number})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Weekly Timetable Calendar Grid */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-xs text-slate-400">Loading weekly timetable...</div>
        ) : (
          <div className="overflow-x-auto w-full">
            <div className="min-w-[900px] grid grid-cols-7 divide-x divide-slate-200 border-b border-slate-200 bg-slate-50">
              {weekDays.map((d, i) => {
                const isToday = new Date().toDateString() === d.toDateString();
                return (
                  <div
                    key={i}
                    className={`p-3 text-center ${isToday ? "bg-brand-50/50" : ""}`}
                  >
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      {dayNames[i]}
                    </span>
                    <span
                      className={`font-mono text-sm font-extrabold ${
                        isToday ? "text-brand-600 bg-brand-100/60 px-2 py-0.5 rounded-lg inline-block mt-0.5" : "text-slate-900"
                      }`}
                    >
                      {d.getDate()} {d.toLocaleDateString("en-US", { month: "short" })}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="min-w-[900px] grid grid-cols-7 divide-x divide-slate-100 min-h-[450px]">
              {weekDays.map((d, i) => {
                const dayStr = d.toISOString().slice(0, 10);
                const dayClasses = classes.filter((c) => {
                  const cDate = new Date(c.date).toISOString().slice(0, 10);
                  return cDate === dayStr;
                });

                return (
                  <div key={i} className="p-2 space-y-2.5 bg-white">
                    {dayClasses.map((cls) => (
                      <div
                        key={cls.id}
                        onClick={() => setSelectedClass(cls)}
                        className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all hover:shadow-md ${
                          cls.status === "Cancelled"
                            ? "bg-rose-50/60 border-rose-200 text-rose-900 opacity-75"
                            : cls.status === "Rescheduled"
                            ? "bg-amber-50/60 border-amber-200 text-amber-900"
                            : cls.class_type === "physical"
                            ? "bg-blue-50/60 border-blue-200 text-blue-900"
                            : cls.class_type === "live_online"
                            ? "bg-purple-50/60 border-purple-200 text-purple-900"
                            : "bg-emerald-50/60 border-emerald-200 text-emerald-900"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-bold font-mono text-[10px]">
                            {cls.start_time} - {cls.end_time}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                              cls.status === "Cancelled"
                                ? "bg-rose-200 text-rose-800"
                                : cls.status === "Rescheduled"
                                ? "bg-amber-200 text-amber-800"
                                : "bg-white/80 text-slate-800"
                            }`}
                          >
                            {cls.class_type === "physical" ? "Offline" : cls.class_type === "live_online" ? "Online" : "Hybrid"}
                          </span>
                        </div>

                        <h4 className="font-extrabold text-slate-900 line-clamp-1">{cls.title}</h4>
                        <p className="text-[11px] text-slate-600 truncate mt-0.5">
                          {cls.course?.name} • {cls.batch?.name}
                        </p>

                        <div className="mt-2 pt-1.5 border-t border-slate-200/50 flex items-center justify-between text-[10px] text-slate-500">
                          <span className="truncate">👤 {cls.mentor?.name || "Unassigned"}</span>
                          {cls.roomItem && <span>🚪 {cls.roomItem.room_number}</span>}
                        </div>
                      </div>
                    ))}

                    {dayClasses.length === 0 && (
                      <div className="h-full min-h-[80px] flex items-center justify-center text-[11px] text-slate-300 italic">
                        No classes
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Modal
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          title="Schedule Class"
          subtitle="Configure class timetable, assigned mentor, and room"
          icon={<CalendarIcon className="w-5 h-5 text-brand-600" />}
          maxWidth="2xl"
          footer={
            <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 w-full">
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="w-full sm:w-auto flex-1 py-2 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleScheduleSubmit}
                disabled={submitting}
                className="w-full sm:w-auto flex-[2] py-2 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs disabled:opacity-50"
              >
                {submitting ? "Checking Conflicts..." : "Schedule Class"}
              </button>
            </div>
          }
        >
          {formErrors.length > 0 && (
            <div className="p-3 rounded-2xl bg-rose-50 text-rose-800 border border-rose-200 text-xs space-y-1">
              {formErrors.map((err, i) => (
                <p key={i} className="font-bold flex items-center gap-1.5">
                  ⚠️ {err}
                </p>
              ))}
            </div>
          )}

          {formWarnings.length > 0 && (
            <div className="p-3 rounded-2xl bg-amber-50 text-amber-800 border border-amber-200 text-xs space-y-1">
              {formWarnings.map((warn, i) => (
                <p key={i} className="font-bold flex items-center gap-1.5">
                  💡 {warn}
                </p>
              ))}
            </div>
          )}

          <form onSubmit={handleScheduleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Class Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Digital Marketing Strategy"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Course *</label>
                <select
                  required
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none"
                >
                  <option value="">Select Course</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Batch *</label>
                <select
                  required
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none"
                >
                  <option value="">Select Batch</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Mentor</label>
                <select
                  value={mentorId}
                  onChange={(e) => setMentorId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none"
                >
                  <option value="">Unassigned</option>
                  {mentors.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Class Type *</label>
                <select
                  value={classType}
                  onChange={(e) => setClassType(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none font-bold"
                >
                  <option value="physical">Offline Classroom</option>
                  <option value="live_online">Live Online</option>
                  <option value="hybrid">Hybrid (Offline + Online)</option>
                </select>
              </div>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={classDate}
                  onChange={(e) => setClassDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Start Time *</label>
                <input
                  type="text"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="10:00 AM"
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-slate-800 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">End Time *</label>
                <input
                  type="text"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  placeholder="11:30 AM"
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-slate-800 focus:outline-none"
                />
              </div>
            </div>

            {/* Physical / Hybrid Fields */}
            {(classType === "physical" || classType === "hybrid") && (
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assigned Classroom / Room</label>
                  <select
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-white font-medium"
                  >
                    <option value="">Select Room (Optional)</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.room_number}) — Cap: {r.capacity}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Online / Hybrid Fields */}
            {(classType === "live_online" || classType === "hybrid") && (
              <div className="p-3 rounded-2xl bg-purple-50/60 border border-purple-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-purple-900 mb-1">Platform</label>
                    <select
                      value={meetingPlatform}
                      onChange={(e) => setMeetingPlatform(e.target.value)}
                      className="w-full p-2 rounded-xl border border-purple-200 bg-white font-medium"
                    >
                      <option value="Zoom">Zoom</option>
                      <option value="Google Meet">Google Meet</option>
                      <option value="Microsoft Teams">Microsoft Teams</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-purple-900 mb-1">Meeting URL</label>
                    <input
                      type="url"
                      value={meetingUrl}
                      onChange={(e) => setMeetingUrl(e.target.value)}
                      placeholder="https://zoom.us/j/..."
                      className="w-full p-2 rounded-xl border border-purple-200 bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Recurrence Toggle */}
            <div className="p-3 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-900">Repeat Class Schedule</span>
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                />
              </div>

              {isRecurring && (
                <div className="pt-2 border-t border-indigo-200/60 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Frequency</label>
                      <select
                        value={recurrenceType}
                        onChange={(e) => setRecurrenceType(e.target.value)}
                        className="w-full p-2 rounded-xl border border-slate-200 bg-white font-bold"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly (Every week)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">End Date *</label>
                      <input
                        type="date"
                        required
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full p-2 rounded-xl border border-slate-200 bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </form>
        </Modal>

      {/* Class Details Modal */}
      {selectedClass && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">
                  {selectedClass.class_type === "physical" ? "Offline" : selectedClass.class_type === "live_online" ? "Online" : "Hybrid"}
                </span>
                <h3 className="font-bold text-slate-900 text-base mt-1">{selectedClass.title}</h3>
              </div>
              <button onClick={() => setSelectedClass(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-700">
              <p><strong>Course:</strong> {selectedClass.course?.name}</p>
              <p><strong>Batch:</strong> {selectedClass.batch?.name}</p>
              <p><strong>Mentor:</strong> {selectedClass.mentor?.name || "Unassigned"}</p>
              <p><strong>Date & Time:</strong> {new Date(selectedClass.date).toLocaleDateString()} ({selectedClass.start_time} - {selectedClass.end_time})</p>
              {selectedClass.roomItem && <p><strong>Room:</strong> {selectedClass.roomItem.name} ({selectedClass.roomItem.room_number})</p>}
              {selectedClass.meeting_link && (
                <p>
                  <strong>Meeting URL:</strong>{" "}
                  <a href={selectedClass.meeting_link} target="_blank" rel="noreferrer" className="text-brand-600 font-bold underline">
                    Join {selectedClass.meeting_platform || "Online"}
                  </a>
                </p>
              )}
              {selectedClass.cancellation_reason && (
                <p className="text-rose-600 font-bold"><strong>Cancellation Reason:</strong> {selectedClass.cancellation_reason}</p>
              )}
            </div>

            {/* Quick Actions */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <Link
                href={`/dashboard/attendance?batch=${selectedClass.batch_id}`}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
              >
                Mark Attendance
              </Link>

              {userRole !== "STUDENT" && selectedClass.status !== "Cancelled" && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setRescheduleDate(new Date(selectedClass.date).toISOString().slice(0, 10));
                      setRescheduleStartTime(selectedClass.start_time || "10:00 AM");
                      setRescheduleEndTime(selectedClass.end_time || "11:00 AM");
                      setShowRescheduleModal(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-100 text-amber-800 font-bold text-xs"
                  >
                    Reschedule
                  </button>
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-rose-100 text-rose-800 font-bold text-xs"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      <Modal
        isOpen={showRescheduleModal && !!selectedClass}
        onClose={() => setShowRescheduleModal(false)}
        title="Reschedule Class"
        subtitle={`Update date and time for ${selectedClass?.title}`}
        icon={<Clock className="w-5 h-5 text-amber-600" />}
        maxWidth="md"
        footer={
          <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 w-full">
            <button
              type="button"
              onClick={() => setShowRescheduleModal(false)}
              className="w-full sm:w-auto flex-1 py-2 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRescheduleSubmit}
              disabled={submitting}
              className="w-full sm:w-auto flex-[2] py-2 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Confirm Reschedule"}
            </button>
          </div>
        }
      >
        {selectedClass && (
          <form onSubmit={handleRescheduleSubmit} className="space-y-3 text-xs">
            {formErrors.length > 0 && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-800 text-xs font-bold">
                {formErrors.join(", ")}
              </div>
            )}
            <div>
              <label className="block font-bold text-slate-700 mb-1">New Date *</label>
              <input
                type="date"
                required
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">New Start Time *</label>
                <input
                  type="text"
                  required
                  value={rescheduleStartTime}
                  onChange={(e) => setRescheduleStartTime(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">New End Time *</label>
                <input
                  type="text"
                  required
                  value={rescheduleEndTime}
                  onChange={(e) => setRescheduleEndTime(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono"
                />
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* Cancel Class Modal */}
      <Modal
        isOpen={showCancelModal && !!selectedClass}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Class"
        subtitle={`Cancel class session for ${selectedClass?.title}`}
        icon={<XCircle className="w-5 h-5 text-rose-600" />}
        maxWidth="md"
        footer={
          <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 w-full">
            <button
              type="button"
              onClick={() => setShowCancelModal(false)}
              className="w-full sm:w-auto flex-1 py-2 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleCancelSubmit}
              disabled={submitting}
              className="w-full sm:w-auto flex-[2] py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs disabled:opacity-50"
            >
              {submitting ? "Cancelling..." : "Confirm Cancellation"}
            </button>
          </div>
        }
      >
        {selectedClass && (
          <form onSubmit={handleCancelSubmit} className="space-y-3 text-xs">
            <p className="text-xs text-slate-500">
              Please state a cancellation reason (will be logged in history and notified to students):
            </p>
            <textarea
              rows={3}
              required
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              placeholder="e.g. Mentor unavailable due to personal emergency"
              className="w-full p-3 rounded-xl border border-slate-200 text-slate-800"
            />
          </form>
        )}
      </Modal>
    </div>
  );
}
