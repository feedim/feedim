import LoadingShell from "@/components/LoadingShell";

export default function Loading() {
  return (
    <LoadingShell>
      {/* Moments carousel skeleton */}
      <div className="px-3 sm:px-4 py-3">
        <div className="flex gap-2.5 overflow-hidden">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="w-[100px] shrink-0">
              <div className="aspect-[9/16] bg-bg-tertiary rounded-xl" />
              <div className="h-3 w-16 bg-bg-tertiary rounded mt-1.5 mx-auto" />
            </div>
          ))}
        </div>
      </div>
      {/* Video grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-7 p-4 sm:p-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <div key={i}>
            <div className="aspect-video bg-bg-tertiary rounded-xl" />
            <div className="flex items-center gap-2.5 mt-3">
              <div className="w-9 h-9 rounded-full bg-bg-tertiary shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-4/5 bg-bg-tertiary rounded" />
                <div className="h-3 w-1/2 bg-bg-tertiary rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </LoadingShell>
  );
}
