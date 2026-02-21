"use client";

/* ─── Base skeleton building block ─── */
function Bone({ className }: { className: string }) {
  return <div className={`skeleton ${className}`} />;
}

function Repeat<T>({ count, children }: { count: number; children: (i: number) => React.ReactNode }) {
  return <>{Array.from({ length: count }).map((_, i) => children(i))}</>;
}

/* ─── Post Card (List Layout) ─── */
export function PostCardSkeleton() {
  return (
    <div className="my-[5px] mx-1 sm:mx-3 py-4 px-2.5 sm:px-4 rounded-[14px]">
      <div className="flex items-center gap-2.5 mb-3">
        <Bone className="h-9 w-9 rounded-full shrink-0" />
        <div className="space-y-1.5">
          <Bone className="h-3.5 w-24 rounded-xl" />
          <Bone className="h-2.5 w-16 rounded-xl" />
        </div>
      </div>
      <div className="flex gap-4">
        <div className="flex-1 space-y-2">
          <Bone className="h-5 w-4/5 rounded-xl" />
          <Bone className="h-3.5 w-full rounded-xl" />
          <Bone className="h-3.5 w-3/5 rounded-xl" />
        </div>
        <Bone className="w-[120px] h-[80px] rounded-xl shrink-0" />
      </div>
      <div className="flex items-center gap-4 mt-3">
        <Bone className="h-3 w-10 rounded-xl" />
        <Bone className="h-3 w-10 rounded-xl" />
        <Bone className="h-3 w-10 rounded-xl" />
      </div>
    </div>
  );
}

export function PostGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div>
      <Repeat count={count}>{(i) => <PostCardSkeleton key={i} />}</Repeat>
    </div>
  );
}

/* ─── User Row ─── */
export function UserRowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3 px-2">
      <Bone className="h-11 w-11 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Bone className="h-3.5 w-28 rounded-xl" />
        <Bone className="h-3 w-20 rounded-xl" />
      </div>
      <Bone className="h-8 w-20 rounded-full shrink-0" />
    </div>
  );
}

export function UserListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div>
      <Repeat count={count}>{(i) => <UserRowSkeleton key={i} />}</Repeat>
    </div>
  );
}

/* ─── Comment ─── */
export function CommentSkeleton() {
  return (
    <div className="flex gap-3">
      <Bone className="h-8 w-8 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Bone className="h-3 w-24 rounded-xl" />
        <Bone className="h-3 w-3/4 rounded-xl" />
      </div>
    </div>
  );
}

export function CommentListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      <Repeat count={count}>{(i) => <CommentSkeleton key={i} />}</Repeat>
    </div>
  );
}

/* ─── Comment Detail (modal — with reply lines) ─── */
export function CommentDetailSkeleton() {
  return (
    <div className="flex py-[9px] px-[11px] gap-[7px]">
      <Bone className="h-[34px] w-[34px] rounded-full shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <Bone className="h-3 w-20 rounded-xl" />
        <Bone className="h-2.5 w-14 rounded-xl" />
        <Bone className="h-3 w-4/5 rounded-xl mt-1" />
        <Bone className="h-3 w-2/3 rounded-xl" />
      </div>
    </div>
  );
}

export function CommentDetailListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-0">
      <Repeat count={count}>{(i) => <CommentDetailSkeleton key={i} />}</Repeat>
    </div>
  );
}

/* ─── Transaction ─── */
export function TransactionCardSkeleton() {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-border-primary">
      <div className="flex-1 space-y-2">
        <Bone className="h-4 w-1/2 rounded-xl" />
        <Bone className="h-3 w-1/4 rounded-xl" />
      </div>
      <div className="space-y-2 ml-4">
        <Bone className="h-5 w-14 rounded-xl ml-auto" />
        <Bone className="h-3 w-16 rounded-xl ml-auto" />
      </div>
    </div>
  );
}

export function TransactionListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-1">
      <Repeat count={count}>{(i) => <TransactionCardSkeleton key={i} />}</Repeat>
    </div>
  );
}

/* ─── Profile ─── */
export function ProfileSkeleton() {
  return (
    <div className="max-w-md mx-auto space-y-6 pt-4">
      <div className="flex flex-col items-center gap-3">
        <Bone className="w-20 h-20 rounded-full" />
        <Bone className="h-5 w-36 rounded-xl" />
        <Bone className="h-3 w-48 rounded-xl" />
      </div>
      <div className="flex justify-center gap-8">
        <Repeat count={3}>
          {(i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <Bone className="h-5 w-10 rounded-xl" />
              <Bone className="h-3 w-14 rounded-xl" />
            </div>
          )}
        </Repeat>
      </div>
      <div className="space-y-2 pt-2">
        <Repeat count={5}>
          {(i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-bg-secondary">
              <Bone className="w-5 h-5 rounded-lg shrink-0" />
              <Bone className="h-4 w-28 rounded-xl" />
              <Bone className="h-4 w-4 rounded-md ml-auto" />
            </div>
          )}
        </Repeat>
      </div>
    </div>
  );
}

/* ─── Coin Page ─── */
export function CoinPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-2 py-4">
        <Bone className="h-3 w-20 rounded-xl" />
        <Bone className="h-9 w-40 rounded-xl" />
      </div>
      <div className="space-y-3">
        <Repeat count={4}>
          {(i) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-[21px] bg-bg-secondary">
              <div className="flex items-center gap-3">
                <Bone className="w-5 h-5 rounded-full shrink-0" />
                <div className="space-y-1.5">
                  <Bone className="h-5 w-28 rounded-xl" />
                  <Bone className="h-3 w-20 rounded-xl" />
                </div>
              </div>
              <Bone className="h-6 w-14 rounded-xl" />
            </div>
          )}
        </Repeat>
      </div>
      <Bone className="h-14 w-full rounded-[21px]" />
    </div>
  );
}

/* ─── Notification ─── */
export function NotificationSkeleton() {
  return (
    <div className="flex gap-3 py-3.5 px-4 my-[5px] mx-1.5 rounded-[15px]">
      <Bone className="h-10 w-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-2 pt-0.5">
        <Bone className="h-3.5 w-4/5 rounded-xl" />
        <Bone className="h-2.5 w-1/4 rounded-xl" />
      </div>
    </div>
  );
}

export function NotificationListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div>
      <Repeat count={count}>{(i) => <NotificationSkeleton key={i} />}</Repeat>
    </div>
  );
}

/* ─── Settings ─── */
export function SettingsItemSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3 px-4 py-4">
      <Repeat count={count}>{(i) => <Bone key={i} className="h-14 rounded-xl" />}</Repeat>
    </div>
  );
}

/* ─── Analytics ─── */
export function AnalyticsSkeleton() {
  return (
    <div className="px-4 space-y-4 py-2">
      <Bone className="h-32 rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        <Repeat count={4}>{(i) => <Bone key={i} className="h-24 rounded-xl" />}</Repeat>
      </div>
      <Bone className="h-48 rounded-xl" />
      <Bone className="h-36 rounded-xl" />
    </div>
  );
}

/* ─── Video Card (Grid) ─── */
export function VideoCardSkeleton() {
  return (
    <div className="space-y-2">
      <Bone className="w-full aspect-video rounded-xl" />
      <div className="flex gap-3 px-1">
        <Bone className="h-9 w-9 rounded-full shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Bone className="h-4 w-4/5 rounded-xl" />
          <Bone className="h-3 w-2/5 rounded-xl" />
          <Bone className="h-3 w-1/3 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function VideoGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-4 gap-y-7 p-4 sm:p-6">
      <Repeat count={count}>{(i) => <VideoCardSkeleton key={i} />}</Repeat>
    </div>
  );
}

/* ─── Moment Grid (Profile) ─── */
export function MomentGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-0.5">
      <Repeat count={count}>{(i) => <Bone key={i} className="aspect-[9/16]" />}</Repeat>
    </div>
  );
}

/* ─── Stats Modal ─── */
export function StatsSkeleton() {
  return (
    <div className="space-y-3">
      <Bone className="h-20 rounded-xl" />
      <div className="grid grid-cols-2 gap-2">
        <Repeat count={4}>{(i) => <Bone key={i} className="h-16 rounded-xl" />}</Repeat>
      </div>
      <Bone className="h-32 rounded-xl" />
    </div>
  );
}
