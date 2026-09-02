"use client";

import { useState, useEffect } from "react";
import { DoorOpen, Plus, Trash2, Edit2, CheckCircle2, XCircle, X } from "lucide-react";
import Modal from "@/components/Modal";

interface RoomsClientProps {
  instituteName: string;
}

export default function RoomsClient({ instituteName }: RoomsClientProps) {
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [capacity, setCapacity] = useState("30");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("Available");

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/rooms");
      const data = await res.json();
      if (data.success) {
        setRooms(data.rooms);
      }
    } catch (err) {
      console.error("Failed to fetch rooms", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !roomNumber.trim()) return;

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          room_number: roomNumber,
          capacity: parseInt(capacity, 10),
          location,
          status,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "Room added successfully." });
        setShowModal(false);
        setName("");
        setRoomNumber("");
        setCapacity("30");
        setLocation("");
        fetchRooms();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to add room." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Network error." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "Available" ? "Inactive" : "Available";
    try {
      const res = await fetch(`/api/rooms/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        fetchRooms();
      }
    } catch (err) {
      console.error("Failed to toggle room status", err);
    }
  };

  const handleDeleteRoom = async (id: string) => {
    if (!confirm("Are you sure you want to delete this classroom?")) return;
    try {
      const res = await fetch(`/api/rooms/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchRooms();
      }
    } catch (err) {
      console.error("Failed to delete room", err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Classroom & Facility Management
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Physical Room Roster & Seating Capacities — {instituteName}
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/20 transition-all flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Add Room
        </button>
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

      {/* Rooms Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-base">Classrooms ({rooms.length})</h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading rooms...</div>
        ) : rooms.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Room Number</th>
                  <th className="py-3 px-4">Room Name</th>
                  <th className="py-3 px-4 text-center">Seating Capacity</th>
                  <th className="py-3 px-4">Location / Building</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {rooms.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-extrabold text-slate-900">{r.room_number}</td>
                    <td className="py-3.5 px-4 font-bold text-brand-700">{r.name}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-900 font-mono">{r.capacity} seats</td>
                    <td className="py-3.5 px-4 text-slate-600">{r.location || "Main Building"}</td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(r.id, r.status)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          r.status === "Available"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {r.status}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDeleteRoom(r.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-slate-400">No rooms created yet. Click "+ Add Room" above.</div>
        )}
      </div>

      {/* Add Room Modal */}
      {showModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowModal(false)}
          title="Add Classroom"
          subtitle="Configure room location, physical capacity, and availability"
          icon={<DoorOpen className="w-5 h-5 text-brand-600" />}
          maxWidth="md"
          footer={
            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddRoom}
                disabled={submitting}
                className="flex-1 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-brand-500/20 flex items-center justify-center transition-all disabled:opacity-50 cursor-pointer"
              >
                {submitting ? "Saving..." : "Save Room"}
              </button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Room Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Computer Science Lab 1"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Room Number *</label>
                <input
                  type="text"
                  required
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  placeholder="e.g. 201"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Capacity *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Location / Building</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Academic Block A, 2nd Floor"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              >
                <option value="Available">Available</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
