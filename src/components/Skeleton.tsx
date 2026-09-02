export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-slate-200/70 animate-pulse rounded-xl ${className}`}
    />
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full space-y-3">
      <div className="h-10 bg-slate-100 rounded-xl w-full animate-pulse" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 bg-slate-50 border border-slate-100 rounded-xl w-full flex items-center px-4 justify-between gap-4">
          <div className="h-4 bg-slate-200/80 rounded w-1/4 animate-pulse" />
          <div className="h-4 bg-slate-200/80 rounded w-1/6 animate-pulse" />
          <div className="h-4 bg-slate-200/80 rounded w-1/5 animate-pulse" />
          <div className="h-4 bg-slate-200/80 rounded w-1/12 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse p-2">
      <div className="h-28 bg-slate-200/70 rounded-3xl w-full" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-slate-100 rounded-2xl p-5 border border-slate-200/60" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="h-64 bg-slate-100 rounded-2xl lg:col-span-2 border border-slate-200/60" />
        <div className="h-64 bg-slate-100 rounded-2xl border border-slate-200/60" />
      </div>
    </div>
  );
}

export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-24 bg-white rounded-2xl p-5 border border-slate-200/70 shadow-xs flex items-center justify-between animate-pulse">
          <div className="space-y-2 w-1/2">
            <div className="h-3 bg-slate-200 rounded w-3/4" />
            <div className="h-6 bg-slate-200 rounded w-1/2" />
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="h-28 bg-gradient-to-r from-slate-200 to-slate-300 rounded-3xl w-full animate-pulse" />
  );
}
