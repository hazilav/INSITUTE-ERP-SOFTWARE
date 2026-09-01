import { TableSkeleton } from "@/components/Skeleton";

export default function StaffLoading() {
  return (
    <div className="space-y-6 animate-pulse p-2">
      <div className="flex justify-between items-center">
        <div className="h-8 bg-slate-200 rounded-xl w-48" />
        <div className="h-10 bg-slate-200 rounded-xl w-32" />
      </div>
      <TableSkeleton rows={6} />
    </div>
  );
}
