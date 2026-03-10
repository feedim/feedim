const pulse = "animate-pulse";
const bone = `h-[11px] bg-bg-secondary rounded-[5px] ${pulse}`;
const article = "pt-[4px] pb-[9px] px-[12px] rounded-[24px] overflow-hidden";

function PostSkeleton() {
  return (
    <article className={article}>
      <div className="flex gap-2.5 items-stretch">
        <div className="shrink-0 w-[42px] pt-[3px] flex flex-col items-center">
          <div className="h-[42px] w-[42px] rounded-full bg-bg-secondary animate-pulse" />
        </div>
        <div className="flex-1 min-w-0 flex flex-col p-[5px]">
          <div className={`${bone} w-[120px]`} />
          <div className={`${bone} w-[80%] mt-2`} />
          <div className={`${bone} w-[50%] mt-[5px]`} />
          <div className="mt-3 rounded-[12px] sm:rounded-[21px] w-full aspect-[4/3] sm:aspect-[3/2] bg-bg-secondary animate-pulse" />
        </div>
      </div>
    </article>
  );
}

function VideoSkeleton() {
  return (
    <article className={article}>
      <div className="flex gap-2.5 items-stretch">
        <div className="shrink-0 w-[42px] pt-[3px] flex flex-col items-center">
          <div className="h-[42px] w-[42px] rounded-full bg-bg-secondary animate-pulse" />
        </div>
        <div className="flex-1 min-w-0 flex flex-col p-[5px]">
          <div className={`${bone} w-[100px]`} />
          <div className={`${bone} w-[65%] mt-2`} />
          <div className="mt-3 rounded-[12px] sm:rounded-[21px] w-full min-h-[180px] sm:min-h-[160px] aspect-[3/4] sm:aspect-video bg-bg-secondary animate-pulse" />
        </div>
      </div>
    </article>
  );
}

function NoteSkeleton() {
  return (
    <article className={article}>
      <div className="flex gap-2.5 items-stretch">
        <div className="shrink-0 w-[42px] pt-[3px] flex flex-col items-center">
          <div className="h-[42px] w-[42px] rounded-full bg-bg-secondary animate-pulse" />
        </div>
        <div className="flex-1 min-w-0 flex flex-col p-[5px]">
          <div className={`${bone} w-[110px]`} />
          <div className={`${bone} w-[95%] mt-2`} />
          <div className={`${bone} w-[70%] mt-[5px]`} />
        </div>
      </div>
    </article>
  );
}

export default function PostCardSkeleton({ count = 5, variant }: { count?: number; variant?: "post" | "video" | "note" | "mixed" }) {
  const pattern = variant === "mixed" || !variant
    ? ["post", "video", "note", "post", "video"] as const
    : Array(count).fill(variant) as ("post" | "video" | "note")[];

  return (
    <div className="flex flex-col gap-[16px] mt-[10px]">
      {Array.from({ length: count }).map((_, i) => {
        const type = pattern[i % pattern.length];
        if (type === "video") return <VideoSkeleton key={i} />;
        if (type === "note") return <NoteSkeleton key={i} />;
        return <PostSkeleton key={i} />;
      })}
    </div>
  );
}

function VideoGridItemSkeleton() {
  return (
    <div>
      <div className="w-full aspect-video min-h-[120px] bg-bg-secondary rounded-xl mb-3 animate-pulse" />
      <div className="flex gap-2.5">
        <div className="h-10 w-10 rounded-full bg-bg-secondary shrink-0 animate-pulse" />
        <div className="flex-1 min-w-0 space-y-2 pt-0.5">
          <div className={`${bone} w-[85%]`} />
          <div className={`${bone} w-[55%]`} />
          <div className="h-[8px] w-[40%] bg-bg-secondary rounded-[5px] animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function VideoGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
      {Array.from({ length: count }).map((_, i) => (
        <VideoGridItemSkeleton key={i} />
      ))}
    </div>
  );
}

export { PostSkeleton, VideoSkeleton, NoteSkeleton };
