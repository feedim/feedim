"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";
import Modal from "./Modal";
import type { ProfileLink } from "./LinksModal";

interface ProfileLinksModalProps {
  open: boolean;
  onClose: () => void;
  links: ProfileLink[];
  displayName: string;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/https?:\/\//, "").split("/")[0];
  }
}

export default function ProfileLinksModal({ open, onClose, links, displayName }: ProfileLinksModalProps) {
  const t = useTranslations("profile");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("linksModalTitle")}
      size="sm"
    >
      <div className="px-4 py-3 space-y-2">
        {links.map((link, i) => (
          <Link
            key={i}
            href={`/leaving?url=${encodeURIComponent(link.url)}`}
            rel="nofollow noopener noreferrer"
            className="flex items-center gap-3 py-3.5 px-4 rounded-[15px] bg-bg-tertiary hover:bg-bg-tertiary/70 transition group"
          >
            <div className="flex-1 min-w-0">
              <p className="text-[0.88rem] font-semibold text-text-primary truncate">
                {link.title || getDomain(link.url)}
              </p>
              <p className="text-[0.75rem] text-text-muted truncate mt-0.5">
                {getDomain(link.url)}
              </p>
            </div>
            <ExternalLink className="h-4 w-4 text-text-muted shrink-0 group-hover:text-accent-main transition" />
          </Link>
        ))}
      </div>
    </Modal>
  );
}
