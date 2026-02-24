import LoadingShell from "@/components/LoadingShell";

export default function Loading() {
  return (
    <LoadingShell>
      <div className="px-3 sm:px-4 py-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="aspect-[9/16] bg-bg-tertiary rounded-xl" />
          ))}
        </div>
      </div>
    </LoadingShell>
  );
}
