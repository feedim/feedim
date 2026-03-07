import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`html,body,.embed-container{margin:0;padding:0;width:100%;height:100%;overflow:hidden}`}</style>
      <div className="embed-container">
        {children}
      </div>
    </>
  );
}
