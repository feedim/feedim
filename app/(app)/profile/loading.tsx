import LoadingShell from "@/components/LoadingShell";

export default function Loading() {
  return (
    <LoadingShell>
      <div className="px-3 sm:px-4 py-4">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-20 h-20 rounded-full bg-bg-tertiary shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-32 bg-bg-tertiary rounded" />
            <div className="h-3.5 w-24 bg-bg-tertiary rounded" />
          </div>
        </div>
        <div className="h-4 w-full bg-bg-tertiary rounded mb-2" />
        <div className="h-4 w-2/3 bg-bg-tertiary rounded mb-5" />
        <div className="flex gap-6 mb-5">
          <div className="h-4 w-20 bg-bg-tertiary rounded" />
          <div className="h-4 w-20 bg-bg-tertiary rounded" />
          <div className="h-4 w-20 bg-bg-tertiary rounded" />
        </div>
        <div className="space-y-4 pt-4 border-t border-border-primary/20">
          {[1, 2].map(i => (
            <div key={i} className="space-y-2">
              <div className="h-5 w-3/4 bg-bg-tertiary rounded" />
              <div className="h-3.5 w-full bg-bg-tertiary rounded" />
              <div className="h-3.5 w-5/6 bg-bg-tertiary rounded" />
            </div>
          ))}
        </div>
      </div>
    </LoadingShell>
  );
}
