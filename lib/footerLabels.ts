import { getTranslations } from "next-intl/server";

export interface PublicFooterLabels {
  help: string;
  about: string;
  termsLong: string;
  terms: string;
  privacy: string;
  communityGuidelines: string;
  contact: string;
  disclaimer: string;
  paymentMethods: string;
  allRightsReserved: string;
  goPremium: string;
}

export const defaultPublicFooterLabels: PublicFooterLabels = {
  help: "Help",
  about: "About",
  termsLong: "Terms of Service",
  terms: "Terms",
  privacy: "Privacy",
  communityGuidelines: "Community Guidelines",
  contact: "Contact",
  disclaimer: "Disclaimer",
  paymentMethods: "Payment methods",
  allRightsReserved: "All rights reserved.",
  goPremium: "Go Premium",
};

export function createFooterLabels({
  tFooter,
  tCommon,
}: {
  tFooter: (key: string) => string;
  tCommon: (key: string) => string;
}): PublicFooterLabels {
  return {
    help: tFooter("help"),
    about: tFooter("about"),
    termsLong: tFooter("termsLong"),
    terms: tFooter("terms"),
    privacy: tFooter("privacy"),
    communityGuidelines: tFooter("communityGuidelines"),
    contact: tFooter("contact"),
    disclaimer: tFooter("disclaimer"),
    paymentMethods: tFooter("paymentMethods"),
    allRightsReserved: tFooter("allRightsReserved"),
    goPremium: tCommon("goPremium"),
  };
}

export async function getPublicFooterLabels(): Promise<PublicFooterLabels> {
  const [tFooter, tCommon] = await Promise.all([
    getTranslations("footer"),
    getTranslations("common"),
  ]);

  return createFooterLabels({ tFooter, tCommon });
}
