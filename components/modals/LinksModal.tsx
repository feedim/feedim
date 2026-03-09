"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Trash2, Plus, Link as LinkIcon, Lock } from "lucide-react";
import { feedimAlert } from "@/components/FeedimAlert";
import Modal from "./Modal";
import { useUser } from "@/components/UserContext";

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

const MAX_LINKS_FREE = 1;
const MAX_LINKS_PREMIUM = 5;
const MIN_TITLE = 5;
const MAX_TITLE = 30;
const MAX_URL = 255;

export default function LinksModal({ open, onClose, onBack, links, onSave, premiumPlan }: LinksModalProps) {
  const t = useTranslations("modals");
  const tc = useTranslations("common");
  const router = useRouter();
  const { user } = useUser();
  const [slots, setSlots] = useState<ProfileLink[]>([]);
  const [saving, setSaving] = useState(false);

  const canMultiLink = user?.role === "admin" || premiumPlan === "max" || premiumPlan === "business";
  const maxLinks = canMultiLink ? MAX_LINKS_PREMIUM : MAX_LINKS_FREE;

  useEffect(() => {
    if (open) {
      const initial = links.length > 0 ? [...links] : [];
      setSlots(initial.slice(0, maxLinks));
    }
  }, [open, links, maxLinks]);

  const updateSlot = (index: number, field: "title" | "url", value: string) => {
    setSlots(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const removeSlot = (index: number) => {
    setSlots(prev => prev.filter((_, i) => i !== index));
  };

  const addSlot = () => {
    if (slots.length >= maxLinks) {
      if (!canMultiLink) {
        feedimAlert("info", t("linksRequirePremium"));
        router.push("/settings/premium");
        return;
      }
      return;
    }
    setSlots(prev => [...prev, { title: "", url: "" }]);
  };

  const handleSave = async () => {
    const filtered = slots.filter(s => s.url.trim());

    // Normalize URLs: auto-add https://, convert http:// → https://
    for (const link of filtered) {
      let url = link.url.trim();
      if (url && !/^https?:\/\//i.test(url)) {
        url = "https://" + url;
      }
      url = url.replace(/^http:\/\//i, "https://");
      link.url = url;
      if (!/^https:\/\//i.test(url)) {
        feedimAlert("error", t("linkUrlInvalid"));
        return;
      }
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
      onClose={onClose}
      title={t("linksModalTitle")}
      size="md"
      rightAction={
        <button
          onClick={handleSave}
          disabled={saving}
          className="t-btn accept relative !h-10 !px-5 !text-[0.82rem] disabled:opacity-40"
        >
          {saving ? <span className="loader" style={{ width: 16, height: 16 }} /> : tc("save")}
        </button>
      }
    >
      <div className="px-4 py-4 space-y-4">
        {slots.length === 0 && (
          <div className="text-center py-6 text-text-muted">
            <LinkIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">{t("noLinks")}</p>
          </div>
        )}

        {slots.map((slot, i) => (
          <div key={i}>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-text-muted">
                {t("linkSlot", { number: i + 1 })}
              </label>
              <button
                type="button"
                onClick={() => removeSlot(i)}
                className="p-1.5 rounded-lg text-text-muted hover:text-error hover:bg-error/10 transition"
                aria-label={tc("delete")}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
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

        {slots.length < maxLinks ? (
          <button
            type="button"
            onClick={addSlot}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-[14px] border-[1.5px] border-border-primary hover:border-text-muted text-text-muted hover:text-text-primary transition text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            {t("addLink")}
          </button>
        ) : !canMultiLink && slots.length >= MAX_LINKS_FREE ? (
          <div className="px-4 py-5 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-accent-main/10 flex items-center justify-center mx-auto">
              <Lock className="h-6 w-6 text-accent-main" />
            </div>
            <p className="text-sm text-text-muted leading-relaxed">{t("linksRequirePremium")}</p>
            <button
              type="button"
              onClick={() => { router.push("/settings/premium"); }}
              className="w-full t-btn accept"
            >
              {t("upgradePlan")}
            </button>
          </div>
        ) : null}

        <p className="text-[0.7rem] text-text-muted text-center">
          {t("linksLimit", { max: maxLinks })}
        </p>
      </div>
    </Modal>
  );
}
