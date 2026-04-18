import { cn } from "@/lib/utils";

export function SkeletonCard({ className, lines = 3 }: { className?: string; lines?: number }) {
  return (
    <div className={cn("p-5 rounded-xl border border-border bg-card/30 space-y-3", className)}>
      <div className="flex items-center gap-3">
        <div className="skeleton h-10 w-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-3 w-2/3" />
          <div className="skeleton h-3 w-1/3" />
        </div>
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton h-3 w-full" style={{ width: `${90 - i * 12}%` }} />
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={2} />
      ))}
    </div>
  );
}

export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 p-3 rounded-lg border border-border bg-card/20", className)}>
      <div className="skeleton h-9 w-9 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3 w-1/2" />
        <div className="skeleton h-2 w-1/3" />
      </div>
      <div className="skeleton h-6 w-16 rounded-full" />
    </div>
  );
}
