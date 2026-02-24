import LoadingShell from "@/components/LoadingShell";

export default function Loading() {
  return (
    <LoadingShell>
      {/* Header */}
      <div className="px-4 flex items-center justify-between h-[53px]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full skeleton" />
          <div className="h-4 w-24 rounded-lg skeleton" />
        </div>
        <div className="flex items-center gap-1">
          <div className="w-9 h-9 rounded-full skeleton" />
        </div>
      </div>

      <div className="px-4 py-6">
        {/* Avatar + Stats row */}
        <div className="flex items-start gap-4 mb-4">
          <div className="w-24 h-24 rounded-full skeleton shrink-0" />
          <div className="flex-1 flex items-center justify-around pt-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="text-center space-y-1.5">
                <div className="h-5 w-8 mx-auto rounded-lg skeleton" />
                <div className="h-3 w-12 mx-auto rounded-lg skeleton" />
              </div>
            ))}
          </div>
        </div>

        {/* Name & Bio */}
        <div className="mb-4 space-y-2">
          <div className="h-5 w-36 rounded-lg skeleton" />
          <div className="h-3.5 w-full rounded-lg skeleton" />
          <div className="h-3.5 w-2/3 rounded-lg skeleton" />
          <div className="h-3 w-40 rounded-lg skeleton" />
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mb-5">
          <div className="h-10 flex-1 rounded-xl skeleton" />
          <div className="h-10 w-10 rounded-xl skeleton" />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border-primary/20 mb-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex-1 flex justify-center py-3">
              <div className="h-4 w-16 rounded-lg skeleton" />
            </div>
          ))}
        </div>

        {/* Post list placeholders */}
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-3">
              <div className="w-[42px] h-[42px] rounded-full skeleton shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-3.5 w-20 rounded-lg skeleton" />
                  <div className="h-3 w-10 rounded-lg skeleton" />
                </div>
                <div className="h-3.5 w-full rounded-lg skeleton" />
                <div className="h-3.5 w-4/5 rounded-lg skeleton" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </LoadingShell>
  );
}
