import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="embed-container" style={{ margin: 0, padding: 0, width: "100%", height: "100%", overflow: "hidden" }}>
      {children}
    </div>
  );
}
