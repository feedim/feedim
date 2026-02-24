import LoadingShell from "@/components/LoadingShell";

export default function DashboardLoading() {
  return (
    <LoadingShell>
      <div className="px-3 sm:px-4 py-4 space-y-5">
        {[1, 2, 3].map(i => (
          <div key={i} className="space-y-3 pb-5 border-b border-border-primary/20">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-bg-tertiary" />
              <div className="space-y-1.5">
                <div className="h-3.5 w-24 bg-bg-tertiary rounded" />
                <div className="h-3 w-16 bg-bg-tertiary rounded" />
              </div>
            </div>
            <div className="h-5 w-3/4 bg-bg-tertiary rounded" />
            <div className="space-y-2">
              <div className="h-3.5 w-full bg-bg-tertiary rounded" />
              <div className="h-3.5 w-5/6 bg-bg-tertiary rounded" />
            </div>
            <div className="flex gap-6 pt-2">
              <div className="h-7 w-14 bg-bg-tertiary rounded" />
              <div className="h-7 w-14 bg-bg-tertiary rounded" />
              <div className="h-7 w-14 bg-bg-tertiary rounded" />
            </div>
          </div>
        ))}
      </div>
    </LoadingShell>
  );
}
