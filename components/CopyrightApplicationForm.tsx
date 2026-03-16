"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { feedimAlert } from "@/components/FeedimAlert";
import PuzzleCaptcha from "@/components/PuzzleCaptcha";
import PhoneInput from "@/components/PhoneInput";
import { useUser } from "@/components/UserContext";

interface CopyrightApplicationFormProps {
  onSubmit: () => void;
}

export default function CopyrightApplicationForm({ onSubmit }: CopyrightApplicationFormProps) {
  const t = useTranslations("copyright");
  const { user } = useUser();
  const isAdmin = user?.role === "admin";
  const [companyName, setCompanyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [proofUrls, setProofUrls] = useState<string[]>([""]);
  const [submitting, setSubmitting] = useState(false);
  const [captchaOpen, setCaptchaOpen] = useState(false);

  const addProofUrl = () => {
    if (proofUrls.length < 5) setProofUrls([...proofUrls, ""]);
  };

  const updateProofUrl = (index: number, value: string) => {
    const updated = [...proofUrls];
    updated[index] = value;
    setProofUrls(updated);
  };

  const removeProofUrl = (index: number) => {
    if (proofUrls.length <= 1) return;
    setProofUrls(proofUrls.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!companyName.trim() || companyName.trim().length < 2) {
      feedimAlert("error", t("companyNameMinLength"));
      return;
    }
    if (!contactEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
      feedimAlert("error", t("validEmailRequired"));
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      feedimAlert("error", t("descriptionMinLength"));
      return;
    }
    if (isAdmin) {
      void handleCaptchaVerify();
      return;
    }
    setCaptchaOpen(true);
  };

  const handleCaptchaVerify = async () => {
    setCaptchaOpen(false);
    setSubmitting(true);
    try {
      const validUrls = proofUrls.filter(u => u.trim().length > 0);
      const res = await fetch("/api/copyright-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: companyName.trim(),
          contact_email: contactEmail.trim(),
          contact_phone: contactPhone.trim() || undefined,
          company_website: companyWebsite.trim() || undefined,
          description: description.trim(),
          proof_urls: validUrls.length > 0 ? validUrls : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        feedimAlert("error", data.error || t("applicationSubmitFailed"));
        return;
      }
      onSubmit();
    } catch {
      feedimAlert("error", t("genericError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-text-muted font-medium mb-1 block">{t("companyNameLabel")}</label>
        <input
          value={companyName}
          onChange={e => setCompanyName(e.target.value)}
          className="input-modern w-full"
          placeholder={t("companyNamePlaceholder")}
          maxLength={200}
        />
      </div>
      <div>
        <label className="text-xs text-text-muted font-medium mb-1 block">{t("contactEmailLabel")}</label>
        <input
          type="email"
          value={contactEmail}
          onChange={e => setContactEmail(e.target.value)}
          className="input-modern w-full"
          placeholder={t("placeholderCompanyEmail")}
          maxLength={200}
        />
      </div>
      <div>
        <label className="text-xs text-text-muted font-medium mb-1 block">{t("phoneLabel")}</label>
        <PhoneInput value={contactPhone} onChange={setContactPhone} />
      </div>
      <div>
        <label className="text-xs text-text-muted font-medium mb-1 block">{t("websiteLabel")}</label>
        <input
          value={companyWebsite}
          onChange={e => setCompanyWebsite(e.target.value)}
          className="input-modern w-full"
          placeholder={t("placeholderCompanyUrl")}
          maxLength={500}
        />
      </div>
      <div>
        <label className="text-xs text-text-muted font-medium mb-1 block">{t("descriptionLabel")}</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="input-modern w-full resize-none"
          placeholder={t("descriptionPlaceholder")}
          rows={4}
          maxLength={2000}
        />
      </div>
      <div>
        <label className="text-xs text-text-muted font-medium mb-1 block">{t("proofLinksLabel")}</label>
        {proofUrls.map((url, i) => (
          <div key={i} className="flex gap-2 mb-1">
            <input
              value={url}
              onChange={e => updateProofUrl(i, e.target.value)}
              className="input-modern w-full"
              placeholder="https://..."
              maxLength={500}
            />
            {proofUrls.length > 1 && (
              <button
                onClick={() => removeProofUrl(i)}
                className="shrink-0 text-xs text-error hover:text-error/80"
              >{t("removeLink")}</button>
            )}
          </div>
        ))}
        {proofUrls.length < 5 && (
          <button
            onClick={addProofUrl}
            className="text-xs text-accent-main hover:text-accent-main/80"
          >{t("addLink")}</button>
        )}
      </div>
      <p className="text-[0.7rem] text-text-muted leading-relaxed">
        {t("applicationDisclaimer")}
      </p>
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="t-btn accept w-full relative disabled:opacity-40"
        aria-label={t("submitApplication")}
      >
        {submitting ? <span className="loader" style={{ width: 16, height: 16 }} /> : t("submitApplication")}
      </button>

      <PuzzleCaptcha open={captchaOpen} onClose={() => setCaptchaOpen(false)} onVerify={handleCaptchaVerify} />
    </div>
  );
}
