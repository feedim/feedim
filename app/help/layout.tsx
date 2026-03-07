import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import HelpLinksHandler from "@/components/HelpLinksHandler";

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen text-text-primary">
      <PublicHeader variant="back" />
      <main className="container mx-auto px-5 sm:px-8 py-10 sm:py-16 max-w-3xl">
        {children}
      </main>
      <HelpLinksHandler />
      <PublicFooter />
    </div>
  );
}
