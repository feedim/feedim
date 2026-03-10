import type { Metadata } from "next";
import { getAlternateLanguages } from "@/lib/seo";

export const OG_LOCALES: Record<string, string> = {
  tr: "tr_TR",
  en: "en_US",
  az: "az_AZ",
};

export const SITE_NAME = "Feedim";
export const DEFAULT_SOCIAL_IMAGE = {
  url: "/imgs/feedim-mail.png",
  width: 1080,
  height: 1080,
  alt: "Feedim",
} as const;

export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://feedim.com";
}

function normalizeDescription(value?: string | null, maxLength = 180) {
  const normalized = (value || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3).trim()}...`;
}

function buildSocialImages(imageUrl?: string | null, title?: string) {
  const images: NonNullable<NonNullable<Metadata["openGraph"]>["images"]> = [];

  if (imageUrl) {
    images.push({
      url: imageUrl,
      alt: title || SITE_NAME,
    });
  }

  images.push({
    url: DEFAULT_SOCIAL_IMAGE.url,
    width: DEFAULT_SOCIAL_IMAGE.width,
    height: DEFAULT_SOCIAL_IMAGE.height,
    alt: title ? `${title} | ${SITE_NAME}` : DEFAULT_SOCIAL_IMAGE.alt,
  });

  return images;
}

function toTwitterImageUrl(image: string | URL | { url?: string | URL }) {
  if (typeof image === "string") return image;
  if (image instanceof URL) return image.toString();
  if (image.url instanceof URL) return image.url.toString();
  return image.url || DEFAULT_SOCIAL_IMAGE.url;
}

interface PageMetadataInput {
  title: string;
  description?: string | null;
  locale: string;
  path: string;
}

export function buildPageMetadata({
  title,
  description,
  locale,
  path,
}: PageMetadataInput): Metadata {
  const siteUrl = getSiteUrl();
  const canonical = `${siteUrl}${path}`;
  const normalizedDescription = normalizeDescription(description);
  const images = buildSocialImages(null, title);
  const imageUrls = images.map(toTwitterImageUrl);

  return {
    title,
    description: normalizedDescription,
    openGraph: {
      title,
      description: normalizedDescription,
      type: "website",
      url: canonical,
      siteName: SITE_NAME,
      locale: OG_LOCALES[locale] || "en_US",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: normalizedDescription,
      images: imageUrls,
    },
    alternates: {
      canonical,
      languages: getAlternateLanguages(path),
    },
  };
}

interface ContentMetadataInput {
  title: string;
  description?: string | null;
  locale: string;
  path: string;
  authorName?: string | null;
  publishedTime?: string | null;
  modifiedTime?: string | null;
  imageUrl?: string | null;
  keywords?: string[];
  videoUrl?: string | null;
  kind?: "article" | "video";
}

export function buildContentMetadata({
  title,
  description,
  locale,
  path,
  authorName,
  publishedTime,
  modifiedTime,
  imageUrl,
  keywords,
  videoUrl,
  kind = "article",
}: ContentMetadataInput): Metadata {
  const siteUrl = getSiteUrl();
  const canonical = `${siteUrl}${path}`;
  const normalizedDescription = normalizeDescription(description || title);
  const images = buildSocialImages(imageUrl, title);
  const imageUrls = images.map(toTwitterImageUrl);

  return {
    title: `${title} | ${SITE_NAME}`,
    description: normalizedDescription,
    keywords,
    authors: authorName ? [{ name: authorName }] : undefined,
    openGraph: {
      title,
      description: normalizedDescription,
      type: kind === "video" ? "video.other" : "article",
      url: canonical,
      publishedTime: publishedTime || undefined,
      modifiedTime: modifiedTime || undefined,
      authors: authorName ? [authorName] : undefined,
      siteName: SITE_NAME,
      locale: OG_LOCALES[locale] || "en_US",
      images,
      ...(kind === "video" && videoUrl
        ? { videos: [{ url: videoUrl, type: "video/mp4" }] }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: normalizedDescription,
      images: imageUrls,
    },
    alternates: {
      canonical,
      languages: getAlternateLanguages(path),
      types: {
        "application/json+oembed": `${siteUrl}/api/oembed?url=${encodeURIComponent(canonical)}&format=json`,
      },
    },
  };
}
