"use client";

import { useState } from "react";
import { CheckSquare, Plus, CheckCircle2, Clock, AlertCircle } from "lucide-react";

interface StudentTaskItem {
  id: string;
  title: string;
  description?: string | null;
  task_type: string;
  due_date?: string | null;
  status: string;
  priority: string;
}

export default function StudentTasksClient({
  initialTasks,
}: {
  initialTasks: StudentTaskItem[];
}) {
  const [tasks, setTasks] = useState<StudentTaskItem[]>(initialTasks);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [taskType, setTaskType] = useState("assignment");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("Medium");

  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/student/tasks");
      const data = await res.json();
      if (res.ok && data.success) {
        setTasks(data.tasks);
      }
    } catch (err) {
      console.error("Failed to refresh tasks", err);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/student/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          task_type: taskType,
          due_date: dueDate || null,
          priority,
        }),
      });

      if (res.ok) {
        setTitle("");
        setDescription("");
        setDueDate("");
        setShowAddForm(false);
        fetchTasks();
      }
    } catch (err) {
      console.error("Failed to add task", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "Completed" ? "Pending" : "Completed";
    try {
      const res = await fetch("/api/student/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId, status: nextStatus }),
      });
      if (res.ok) fetchTasks();
    } catch (err) {
      console.error("Failed to update task", err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            My Personal Student Tasks
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Track reading assignments, project milestones, and exam preparation
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-md shadow-brand-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Personal Task
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddTask} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4 animate-in zoom-in-95 duration-150">
          <h3 className="font-bold text-slate-900 text-sm">Add New Student Task</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Task Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Read Chapter 4 for Physics"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Task Type
              </label>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white capitalize"
              >
                <option value="assignment">Submit Assignment</option>
                <option value="reading">Complete Reading</option>
                <option value="video">Watch Recorded Class</option>
                <option value="project">Complete Project</option>
                <option value="exam">Attend Assessment</option>
                <option value="other">Other Task</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              >
                <option value="Low">Low Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="High">High Priority</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-sm"
            >
              {loading ? "Saving..." : "Save Task"}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        {tasks.length > 0 ? (
          <div className="space-y-2">
            {tasks.map((t) => (
              <div
                key={t.id}
                className={`p-4 rounded-2xl border flex items-center justify-between gap-3 transition-colors ${
                  t.status === "Completed"
                    ? "bg-slate-50/60 border-slate-100 opacity-75"
                    : "bg-slate-50 border-slate-200/80"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={t.status === "Completed"}
                    onChange={() => handleToggleTaskStatus(t.id, t.status)}
                    className="w-5 h-5 text-brand-600 rounded cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <span
                      className={`font-bold text-slate-900 text-sm block ${
                        t.status === "Completed" ? "line-through text-slate-400" : ""
                      }`}
                    >
                      {t.title}
                    </span>
                    <span className="text-[11px] text-slate-500 capitalize">
                      {t.task_type} • Priority: <strong className="text-slate-700">{t.priority}</strong>
                    </span>
                  </div>
                </div>

                {t.due_date && (
                  <span className="font-mono text-xs text-slate-500 flex items-center gap-1 shrink-0">
                    <Clock className="w-3.5 h-3.5" /> Due {new Date(t.due_date).toLocaleDateString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-slate-400">
            No personal tasks added yet. Click "+ Add Personal Task" to create one.
          </div>
        )}
      </div>
    </div>
  );
}
