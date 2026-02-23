import LoadingShell from "@/components/LoadingShell";

export default function PostLoading() {
  return (
    <LoadingShell>
      <div className="max-w-[680px] mx-auto px-4 py-6">
        {/* Author */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-bg-tertiary" />
          <div className="space-y-2">
            <div className="h-3.5 w-28 bg-bg-tertiary rounded" />
            <div className="h-3 w-20 bg-bg-tertiary rounded" />
          </div>
        </div>
        {/* Title */}
        <div className="h-7 w-3/4 bg-bg-tertiary rounded mb-4" />
        {/* Media placeholder (works for both video and image) */}
        <div className="aspect-video w-full bg-bg-tertiary rounded-xl mb-6" />
        {/* Content lines */}
        <div className="space-y-3">
          <div className="h-4 w-full bg-bg-tertiary rounded" />
          <div className="h-4 w-full bg-bg-tertiary rounded" />
          <div className="h-4 w-5/6 bg-bg-tertiary rounded" />
          <div className="h-4 w-4/6 bg-bg-tertiary rounded" />
        </div>
        {/* Interaction bar */}
        <div className="flex gap-6 mt-8 pt-4 border-t border-border-primary/20">
          <div className="h-8 w-16 bg-bg-tertiary rounded" />
          <div className="h-8 w-16 bg-bg-tertiary rounded" />
          <div className="h-8 w-16 bg-bg-tertiary rounded" />
        </div>
      </div>
    </LoadingShell>
  );
}
