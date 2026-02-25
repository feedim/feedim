"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Lock, Link as LinkIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { feedimAlert } from "@/components/FeedimAlert";
import Modal from "./Modal";

export interface ProfileLink {
  title: string;
  url: string;
}

interface LinksModalProps {
  open: boolean;
  onClose: () => void;
  onBack: () => void;
  links: ProfileLink[];
  onSave: (links: ProfileLink[]) => void;
  premiumPlan: string | null;
}

const MAX_LINKS = 2;
const MIN_TITLE = 5;
const MAX_TITLE = 30;
const MAX_URL = 255;

export default function LinksModal({ open, onClose, onBack, links, onSave, premiumPlan }: LinksModalProps) {
  const t = useTranslations("modals");
  const tc = useTranslations("common");
  const router = useRouter();
  const [slots, setSlots] = useState<ProfileLink[]>([]);
  const [saving, setSaving] = useState(false);

  const canUseExtra = premiumPlan === "max" || premiumPlan === "business";

  useEffect(() => {
    if (open) {
      const initial = links.length > 0 ? [...links] : [{ title: "", url: "" }];
      if (canUseExtra && initial.length < MAX_LINKS) {
        initial.push({ title: "", url: "" });
      }
      setSlots(initial.slice(0, canUseExtra ? MAX_LINKS : 1));
    }
  }, [open, links, canUseExtra]);

  const updateSlot = (index: number, field: "title" | "url", value: string) => {
    setSlots(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const handleSave = async () => {
    const filtered = slots.filter(s => s.url.trim());

    // Validate each link
    for (const link of filtered) {
      // URL must start with http:// or https://
      const url = link.url.trim();
      if (!/^https?:\/\//i.test(url)) {
        feedimAlert("error", t("linkUrlInvalid"));
        return;
      }
      // Title is required and min 5 chars
      const title = link.title.trim();
      if (!title || title.length < MIN_TITLE) {
        feedimAlert("error", t("linkTitleMin", { min: MIN_TITLE }));
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          links: filtered,
          website: filtered[0]?.url || "",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onSave(filtered);
        onBack();
      } else {
        feedimAlert("error", data.error || t("updateError"));
      }
    } catch {
      feedimAlert("error", t("errorOccurred"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onBack}
      title={t("linksModalTitle")}
      size="md"
      rightAction={
        <button
          onClick={handleSave}
          disabled={saving}
          className="t-btn accept relative !h-9 !px-5 !text-[0.82rem] disabled:opacity-40"
        >
          {saving ? <span className="loader" style={{ width: 16, height: 16 }} /> : tc("save")}
        </button>
      }
    >
      <div className="px-4 py-4 space-y-4">
        {slots.map((slot, i) => (
          <div key={i}>
            <label className="block text-xs font-semibold text-text-muted mb-2">
              {t("linkSlot", { number: i + 1 })}
            </label>
            <div className="space-y-2">
              <input
                type="text"
                value={slot.title}
                onChange={e => updateSlot(i, "title", e.target.value)}
                minLength={MIN_TITLE}
                maxLength={MAX_TITLE}
                className="input-modern w-full"
                placeholder={t("linkTitle")}
              />
              <input
                type="url"
                value={slot.url}
                onChange={e => updateSlot(i, "url", e.target.value)}
                maxLength={MAX_URL}
                className="input-modern w-full"
                placeholder="https://..."
              />
            </div>
          </div>
        ))}

        {!canUseExtra && (
          <div className="pt-2">
            <div className="rounded-2xl border border-border-primary px-5 py-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-accent-main/10 flex items-center justify-center mx-auto">
                <LinkIcon className="h-6 w-6 text-accent-main" />
              </div>
              <h3 className="text-[0.95rem] font-bold">{t("linksPremiumTitle")}</h3>
              <p className="text-[0.8rem] text-text-muted leading-relaxed">{t("linksMaxFree")}</p>
              <button
                onClick={() => {
                  onClose();
                  router.push("/premium");
                }}
                className="w-full t-btn accept !text-[0.84rem]"
              >
                {t("linksBrowsePremium")}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
