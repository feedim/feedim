"use client";

import { useState, useEffect, type ReactNode } from "react";

export default function LoadingShell({ children }: { children?: ReactNode }) {
  const [phase, setPhase] = useState<"loader" | "skeleton">("loader");

  useEffect(() => {
    const timer = setTimeout(() => setPhase("skeleton"), 500);
    return () => clearTimeout(timer);
  }, []);

  if (phase === "loader") {
    return (
      <div className="flex items-center justify-center py-32">
        <span className="loader" style={{ width: 22, height: 22 }} />
      </div>
    );
  }

  return <div className="animate-pulse">{children}</div>;
}
