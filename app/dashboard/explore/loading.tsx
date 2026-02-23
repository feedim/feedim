import LoadingShell from "@/components/LoadingShell";

export default function Loading() {
  return (
    <LoadingShell>
      <div className="px-3 sm:px-4 py-4 space-y-5">
        <div className="h-10 w-full bg-bg-tertiary rounded-xl" />
        <div className="flex gap-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-8 w-20 bg-bg-tertiary rounded-full" />
          ))}
        </div>
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
          </div>
        ))}
      </div>
    </LoadingShell>
  );
}
