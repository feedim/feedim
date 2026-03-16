import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import HelpLinksHandler from "@/components/HelpLinksHandler";
import { getPublicFooterLabels } from "@/lib/footerLabels";

export default async function HelpLayout({ children }: { children: React.ReactNode }) {
  const footerLabels = await getPublicFooterLabels();

  return (
    <div className="min-h-screen text-text-primary public-page">
      <PublicHeader variant="back" />
      <main className="container mx-auto px-5 sm:px-8 py-10 sm:py-16 max-w-3xl">
        {children}
      </main>
      <HelpLinksHandler />
      <PublicFooter labels={footerLabels} />
    </div>
  );
}
