"use client";

export default function FeedimLoader({ size = 22 }: { size?: number }) {
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-solid-primary">
      <span
        className="loader"
        style={{ width: size, height: size, position: "relative", margin: 0 }}
      />
    </div>
  );
}

/** Inline spinner for buttons, cards, etc. */
export function Spinner({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`loader ${className}`}
      style={{ width: size, height: size, position: "relative", margin: 0 }}
    />
  );
}
