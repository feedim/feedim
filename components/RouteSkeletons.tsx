import AppLayout from "@/components/AppLayout";
import ColumnHeader from "@/components/ColumnHeader";
import PostCardSkeleton, { VideoGridSkeleton } from "@/components/PostCardSkeleton";

const bone = "bg-bg-secondary rounded-[5px] animate-pulse";

function ActionBarSkeleton() {
  return (
    <div className="flex items-center gap-2 py-2 select-none">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex-1 h-[46px] rounded-xl bg-bg-secondary animate-pulse" />
      ))}
    </div>
  );
}

function DetailAuthorRowSkeleton() {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="h-10 w-10 rounded-full bg-bg-secondary shrink-0 animate-pulse" />
      <div className="flex-1 min-w-0">
        <div className={`h-[12px] w-[126px] ${bone}`} />
        <div className={`h-[9px] w-[86px] ${bone} mt-2`} />
      </div>
      <div className="h-[30px] w-[88px] rounded-full bg-bg-secondary animate-pulse" />
    </div>
  );
}

function RelatedPostsSkeleton({ variant = "mixed" }: { variant?: "post" | "video" | "note" | "mixed" }) {
  return (
    <div className="px-2.5 sm:px-3 pb-6">
      <div className={`h-[14px] w-[132px] ${bone} mb-4`} />
      <PostCardSkeleton count={3} variant={variant} />
    </div>
  );
}

export function PostsRouteSkeleton() {
  return (
    <AppLayout>
      <div className="px-2.5 sm:px-3">
        <PostCardSkeleton count={5} />
      </div>
    </AppLayout>
  );
}

export function NotesRouteSkeleton() {
  return (
    <AppLayout>
      <div className="px-2.5 sm:px-3 mt-4 mb-3">
        <div className="w-full flex items-center gap-3 px-4 py-3.5 bg-bg-secondary rounded-[18px]">
          <div className="h-9 w-9 rounded-full bg-bg-tertiary shrink-0 animate-pulse" />
          <div className={`h-[11px] w-[42%] ${bone}`} />
        </div>
      </div>
      <div className="px-2.5 sm:px-3">
        <PostCardSkeleton count={5} variant="note" />
      </div>
    </AppLayout>
  );
}

export function VideosRouteSkeleton() {
  return (
    <div className="min-h-screen">
      <ColumnHeader />
      <div className="px-4 pt-2 pb-1 overflow-hidden">
        <div className="flex gap-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-[88px] shrink-0">
              <div className="h-[126px] rounded-[22px] bg-bg-secondary animate-pulse" />
              <div className={`h-[8px] w-[68px] ${bone} mt-2 mx-auto`} />
            </div>
          ))}
        </div>
      </div>
      <div className="p-4 sm:p-6">
        <VideoGridSkeleton count={6} />
      </div>
    </div>
  );
}

export function NoteDetailSkeleton() {
  return (
    <article>
      <div className="px-3 sm:px-3 py-3 md:py-5">
        <DetailAuthorRowSkeleton />
        <div className="space-y-2.5">
          <div className={`h-[12px] w-[92%] ${bone}`} />
          <div className={`h-[12px] w-full ${bone}`} />
          <div className={`h-[12px] w-[96%] ${bone}`} />
          <div className={`h-[12px] w-[88%] ${bone}`} />
          <div className={`h-[12px] w-[72%] ${bone}`} />
        </div>
        <div className={`h-[10px] w-[84px] ${bone} mt-4`} />
        <div className="flex flex-wrap gap-2 mt-[9px] mb-[6px]">
          <div className="h-8 w-24 rounded-full bg-bg-secondary animate-pulse" />
          <div className="h-8 w-20 rounded-full bg-bg-secondary animate-pulse" />
        </div>
        <div className="flex items-center gap-1.5 mt-2 mb-1">
          <div className="flex -space-x-1.5 shrink-0">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-6 w-6 rounded-full bg-bg-secondary border border-border-primary animate-pulse" />
            ))}
          </div>
          <div className={`h-[11px] w-[180px] ${bone}`} />
        </div>
        <ActionBarSkeleton />
      </div>
      <RelatedPostsSkeleton variant="mixed" />
    </article>
  );
}

export function PostDetailSkeleton() {
  return (
    <article className="px-3 sm:px-4 py-4">
      <DetailAuthorRowSkeleton />
      <div className="space-y-2.5">
        <div className={`h-[12px] w-[78%] ${bone}`} />
        <div className={`h-[12px] w-full ${bone}`} />
        <div className={`h-[12px] w-[94%] ${bone}`} />
      </div>
      <div className="mt-4 rounded-[16px] sm:rounded-[21px] w-full aspect-[4/3] bg-bg-secondary animate-pulse" />
      <div className="mt-4 flex items-center gap-3">
        <div className={`h-[10px] w-[74px] ${bone}`} />
        <div className={`h-[10px] w-[62px] ${bone}`} />
      </div>
      <div className="flex flex-wrap gap-2 mt-[9px] mb-[6px]">
        <div className="h-8 w-24 rounded-full bg-bg-secondary animate-pulse" />
        <div className="h-8 w-20 rounded-full bg-bg-secondary animate-pulse" />
      </div>
      <ActionBarSkeleton />
      <RelatedPostsSkeleton variant="mixed" />
    </article>
  );
}

export function VideoDetailSkeleton() {
  return (
    <article className="px-3 sm:px-4" style={{ overflowX: "clip" }}>
      <div className="mb-3 -mx-3 sm:-mx-4 sm:mx-0 aspect-video bg-bg-secondary animate-pulse" />
      <div className={`h-[22px] w-[82%] ${bone}`} />
      <div className="flex items-center gap-3 mt-3 mb-3">
        <div className={`h-[10px] w-[92px] ${bone}`} />
        <div className={`h-[10px] w-[56px] ${bone}`} />
      </div>
      <DetailAuthorRowSkeleton />
      <div className="space-y-2.5 mt-4">
        <div className={`h-[11px] w-full ${bone}`} />
        <div className={`h-[11px] w-[94%] ${bone}`} />
        <div className={`h-[11px] w-[72%] ${bone}`} />
      </div>
      <div className="flex flex-wrap gap-2 mt-[10px] mb-[6px]">
        <div className="h-8 w-24 rounded-full bg-bg-secondary animate-pulse" />
        <div className="h-8 w-20 rounded-full bg-bg-secondary animate-pulse" />
      </div>
      <ActionBarSkeleton />
      <div className="mt-4 pb-6">
        <div className={`h-[14px] w-[124px] ${bone} mb-4`} />
        <VideoGridSkeleton count={4} />
      </div>
    </article>
  );
}
