import LoadingShell from "@/components/LoadingShell";

export default function Loading() {
  return (
    <LoadingShell>
      <div className="px-3 sm:px-4 py-4 space-y-1">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-center gap-3 px-3 py-3.5">
            <div className="w-10 h-10 rounded-full bg-bg-tertiary shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-4/5 bg-bg-tertiary rounded" />
              <div className="h-3 w-1/3 bg-bg-tertiary rounded" />
            </div>
          </div>
        ))}
      </div>
    </LoadingShell>
  );
}
