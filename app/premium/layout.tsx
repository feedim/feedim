import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { getAlternateLanguages } from "@/lib/seo";

const OG_LOCALES: Record<string, string> = { tr: "tr_TR", en: "en_US", az: "az_AZ" };

const faqKeys = [
  "Cancel", "SwitchPlan", "Earn", "Withdraw", "Badge", "Limits",
  "LongPost", "Visitors", "Expire", "Annual", "Payment", "Analytics", "2FA", "Business",
];

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  const locale = await getLocale();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://feedim.com";
  return {
    title: t("premiumTitle"),
    description: t("premiumDescription"),
    keywords: t("premiumKeywords").split(", "),
    openGraph: {
      title: t("premiumTitle"),
      description: t("premiumShortDescription"),
      type: "website",
      url: `${baseUrl}/premium`,
      siteName: "Feedim",
      locale: OG_LOCALES[locale] || "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: t("premiumTitle"),
      description: t("premiumShortDescription"),
    },
    alternates: {
      canonical: `${baseUrl}/premium`,
      languages: getAlternateLanguages("/premium"),
    },
  };
}

export default async function PremiumLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("premium");
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://feedim.com";

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqKeys.map((key) => ({
      "@type": "Question",
      name: t(`faq${key}Q` as any),
      acceptedAnswer: {
        "@type": "Answer",
        text: t(`faq${key}A` as any),
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {children}
    </>
  );
}
