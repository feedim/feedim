"use client";

const shimmer = "animate-pulse bg-white/[0.06]";

export function TemplateCardSkeleton() {
  return (
    <div className="rounded-3xl overflow-hidden border border-white/10" style={{ background: 'rgba(255,255,255,0.03)' }}>
      <div className={`${shimmer} h-48 sm:h-56 w-full rounded-t-3xl`} />
      <div className="p-4 space-y-3">
        <div className={`${shimmer} h-5 w-3/4 rounded-lg`} />
        <div className={`${shimmer} h-3 w-1/2 rounded-lg`} />
        <div className="flex items-center justify-between pt-2">
          <div className={`${shimmer} h-8 w-20 rounded-full`} />
          <div className={`${shimmer} h-10 w-24 rounded-full`} />
        </div>
      </div>
    </div>
  );
}

export function TemplateGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
      {Array.from({ length: count }).map((_, i) => (
        <TemplateCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProjectCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 p-4 flex items-center gap-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
      <div className={`${shimmer} w-14 h-14 rounded-xl shrink-0`} />
      <div className="flex-1 space-y-2">
        <div className={`${shimmer} h-4 w-2/3 rounded-lg`} />
        <div className={`${shimmer} h-3 w-1/3 rounded-lg`} />
      </div>
      <div className={`${shimmer} h-8 w-8 rounded-full shrink-0`} />
    </div>
  );
}

export function ProjectListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <ProjectCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function TransactionCardSkeleton() {
  return (
    <div className="border-b border-white/10 pb-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 space-y-2">
          <div className={`${shimmer} h-4 w-2/3 rounded-lg`} />
          <div className={`${shimmer} h-3 w-1/3 rounded-lg`} />
        </div>
        <div className="text-right space-y-2 ml-4">
          <div className={`${shimmer} h-5 w-16 rounded-lg ml-auto`} />
          <div className={`${shimmer} h-3 w-20 rounded-lg ml-auto`} />
        </div>
      </div>
    </div>
  );
}

export function TransactionListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <TransactionCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Avatar */}
      <div className="flex flex-col items-center gap-3">
        <div className={`${shimmer} w-20 h-20 rounded-full`} />
        <div className={`${shimmer} h-5 w-32 rounded-lg`} />
        <div className={`${shimmer} h-3 w-48 rounded-lg`} />
      </div>
      {/* Fields */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={`${shimmer} h-12 w-full rounded-xl`} />
        ))}
      </div>
      {/* Coin card */}
      <div className={`${shimmer} h-24 w-full rounded-2xl`} />
    </div>
  );
}

export function CoinPageSkeleton() {
  return (
    <div className="max-w-[600px] mx-auto space-y-8">
      <div className="flex flex-col items-center gap-3">
        <div className={`${shimmer} h-16 w-40 rounded-lg`} />
        <div className={`${shimmer} h-4 w-24 rounded-lg`} />
      </div>
      <div className={`${shimmer} h-12 w-full rounded-xl`} />
      <div className={`${shimmer} h-14 w-full rounded-full`} />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={`${shimmer} h-16 w-full rounded-2xl`} />
        ))}
      </div>
    </div>
  );
}
