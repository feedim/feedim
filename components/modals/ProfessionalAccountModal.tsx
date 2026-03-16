"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { emitNavigationStart } from "@/lib/navigationProgress";
import { Briefcase, ChevronRight, Check, Lock, Phone } from "lucide-react";
import Modal from "./Modal";
import { PROFESSIONAL_CATEGORIES } from "@/lib/constants";
import { feedimAlert } from "@/components/FeedimAlert";
import { useUser } from "@/components/UserContext";
import PhoneInput from "@/components/PhoneInput";

interface ProfessionalAccountModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: (data: { account_type: string; professional_category: string; contact_email: string; contact_phone: string }) => void;
  isPrivate: boolean;
  onMakePublic: () => Promise<boolean>;
  /** Start at a specific step (1=type, 2=category, 3=contact) */
  initialStep?: number;
}

export default function ProfessionalAccountModal({ open, onClose, onComplete, isPrivate, onMakePublic, initialStep }: ProfessionalAccountModalProps) {
  const router = useRouter();
  const t = useTranslations("modals");
  const tc = useTranslations("common");
  const tProf = useTranslations("professional");
  const { user: currentUser } = useUser();
  const plan = currentUser?.premiumPlan;
  const isPremium = currentUser?.isPremium === true;
  const isAdmin = currentUser?.role === "admin";
  // Creator hesap herkese açık, Business hesap sadece Business abonelerine
  const canUseBusiness = isAdmin || (isPremium && plan === "business");
  const defaultStep = initialStep ?? (isPrivate ? 0 : 1);
  const [step, setStep] = useState(defaultStep);
  const [accountType, setAccountType] = useState<"creator" | "business">("creator");
  const [category, setCategory] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [stepping, setStepping] = useState<string | null>(null);

  const totalSteps = 4;

  // Reset step when modal opens
  useEffect(() => {
    if (open) {
      setStep(initialStep ?? (isPrivate ? 0 : 1));
      setStepping(null);
    }
  }, [open, initialStep, isPrivate]);

  const handleClose = () => {
    setStep(initialStep ?? (isPrivate ? 0 : 1));
    setAccountType("creator");
    setCategory("");
    setContactEmail("");
    setContactPhone("");
    setStepping(null);
    onClose();
  };

  const goToStep = (nextStep: number, key: string) => {
    setStepping(key);
    setTimeout(() => {
      setStep(nextStep);
      setStepping(null);
    }, 500);
  };

  const [makingPublic, setMakingPublic] = useState(false);

  const handleMakePublic = async () => {
    setMakingPublic(true);
    try {
      const [success] = await Promise.all([
        onMakePublic(),
        new Promise(r => setTimeout(r, 2000)),
      ]);
      if (success) {
        setStep(1);
      }
    } finally {
      setMakingPublic(false);
    }
  };

  const handleComplete = async () => {
    if (contactEmail && contactEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contactEmail.trim())) {
        feedimAlert("error", t("invalidEmail"));
        return;
      }
    }

    setSaving(true);
    try {
      const [res] = await Promise.all([
        fetch("/api/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            account_type: accountType,
            professional_category: category,
            contact_email: contactEmail.trim() || null,
            contact_phone: contactPhone.trim() || null,
          }),
        }),
        new Promise(r => setTimeout(r, 2000)),
      ]);

      if (!res.ok) {
        const data = await res.json();
        feedimAlert("error", data.error || t("errorOccurred"));
        return;
      }

      setStep(4);
    } catch {
      feedimAlert("error", t("errorOccurred"));
    } finally {
      setSaving(false);
    }
  };

  const handleDone = () => {
    onComplete({
      account_type: accountType,
      professional_category: category,
      contact_email: contactEmail.trim(),
      contact_phone: contactPhone.trim(),
    });
    handleClose();
  };

  const categories = accountType === "creator" ? PROFESSIONAL_CATEGORIES.creator : PROFESSIONAL_CATEGORIES.business;

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="px-4 py-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-accent-main/10 flex items-center justify-center mx-auto">
              <Lock className="h-7 w-7 text-accent-main" />
            </div>
            <h3 className="text-lg font-bold">{t("privateAccountWarning")}</h3>
            <p className="text-sm text-text-muted leading-relaxed">
              {t("privateAccountProWarning")}
            </p>
            <div className="space-y-2 pt-2">
              <button
                onClick={handleMakePublic}
                disabled={makingPublic}
                className="w-full t-btn accept disabled:opacity-50"
                aria-label={t("makePublic")}
              >
                {makingPublic ? <span className="loader" style={{ width: 16, height: 16 }} /> : t("makePublic")}
              </button>
              <button onClick={handleClose} disabled={makingPublic} className="w-full t-btn cancel disabled:opacity-50">
                {t("giveUp")}
              </button>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="px-4 py-6 space-y-4">
            <div className="mb-2">
              <p className="text-sm text-text-muted">{t("accountTypeDesc")}</p>
            </div>
            <button
              onClick={() => { setAccountType("creator"); setCategory(""); goToStep(2, "creator"); }}
              disabled={!!stepping}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border-primary hover:border-text-muted transition disabled:opacity-60"
            >
              <div className="w-12 h-12 rounded-full bg-accent-main/10 flex items-center justify-center shrink-0">
                <svg className="h-6 w-6 text-accent-main" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </div>
              <div className="text-left flex-1">
                <p className="font-semibold">{t("creatorLabel")}</p>
                <p className="text-xs text-text-muted mt-0.5">{t("creatorDesc")}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-text-muted shrink-0" />
            </button>
            <button
              onClick={() => {
                if (!canUseBusiness) {
                  feedimAlert("error", t("businessOnlyError"));
                  return;
                }
                setAccountType("business"); setCategory(""); goToStep(2, "business");
              }}
              disabled={!!stepping}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border-primary transition disabled:opacity-60 ${canUseBusiness ? "hover:border-text-muted" : "opacity-60 hover:opacity-80"}`}
            >
              <div className="w-12 h-12 rounded-full bg-accent-main/10 flex items-center justify-center shrink-0">
                <Briefcase className="h-6 w-6 text-accent-main" />
              </div>
              <div className="text-left flex-1">
                <p className="font-semibold">{t("businessLabel")}</p>
                <p className="text-xs text-text-muted mt-0.5">
                  {canUseBusiness ? t("businessDesc") : t("businessOnlyDesc")}
                </p>
              </div>
              {canUseBusiness ? (
                <ChevronRight className="h-5 w-5 text-text-muted shrink-0" />
              ) : (
                <Lock className="h-4 w-4 text-text-muted shrink-0" />
              )}
            </button>
          </div>
        );

      case 2:
        return (
          <div className="px-4 py-6 space-y-4">
            <div className="mb-2">
              <h3 className="text-lg font-bold">{t("selectCategoryTitle")}</h3>
              <p className="text-sm text-text-muted mt-1">{t("selectCategoryDesc")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                    category === cat.value
                      ? "bg-accent-main text-white"
                      : "bg-bg-tertiary text-text-secondary hover:bg-bg-tertiary"
                  }`}
                >
                  {tProf(cat.labelKey.split('.')[1])}
                </button>
              ))}
            </div>
            <div className="pt-2">
              <button
                onClick={() => {
                  if (accountType === "creator") {
                    handleComplete();
                  } else {
                    goToStep(3, "continue");
                  }
                }}
                disabled={!category || saving || !!stepping}
                className="w-full t-btn accept disabled:opacity-40"
                aria-label={accountType === "creator" ? t("complete") : t("continue")}
              >
                {(saving || stepping === "continue") ? <span className="loader" style={{ width: 16, height: 16 }} /> : accountType === "creator" ? t("complete") : t("continue")}
              </button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="px-4 py-6 space-y-4">
            <div className="mb-2">
              <h3 className="text-lg font-bold">{t("contactInfo")}</h3>
              <p className="text-sm text-text-muted mt-1">{t("contactInfoDesc")}</p>
            </div>
              <div>
                <label className="text-xs text-text-muted mb-1">{t("contactEmail")}</label>
                <input
                  type="email"
                  value={contactEmail}
                onChange={e => setContactEmail(e.target.value)}
                className="input-modern w-full"
                placeholder="contact@example.com"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs text-text-muted mb-1">
                <Phone className="h-3.5 w-3.5" /> {t("contactPhone")}
              </label>
              <PhoneInput value={contactPhone} onChange={setContactPhone} />
            </div>
            <div className="pt-2">
              <button
                onClick={handleComplete}
                disabled={saving}
                className="w-full t-btn accept disabled:opacity-40"
                aria-label={t("complete")}
              >
                {saving ? <span className="loader" style={{ width: 16, height: 16 }} /> : t("complete")}
              </button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="px-4 py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-accent-main/10 flex items-center justify-center mx-auto">
              <Check className="h-8 w-8 text-accent-main" />
            </div>
            <h3 className="text-lg font-bold">{t("proAccountActive")}</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              {t("proAccountActiveDesc")}
            </p>
            <button onClick={() => { handleDone(); emitNavigationStart(); router.push("/profile"); }} className="w-full t-btn accept">
              {t("goToProfileBtn")}
            </button>
          </div>
        );
    }
  };

  // Calculate progress (don't show progress on step 0 and step 4)
  const showProgress = step >= 1 && step <= 3;
  const stepLabels = accountType === "creator"
    ? [1, 2] // type → category
    : [1, 2, 3]; // type → category → contact
  const currentStepIndex = stepLabels.indexOf(step);

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={t("proAccountTitle")}
      size="md"
      zIndex="z-[10001]"
      infoText={t("proAccountInfoText")}
      leftAction={
        step > 1 && step < 4 && !stepping ? (
          <button onClick={() => setStep(step - 1)} className="i-btn !w-10 !h-10 text-text-muted" aria-label={tc("back")}>
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
        ) : undefined
      }
    >
      {showProgress && (
        <div className="flex items-center justify-center gap-0 px-4 pt-3">
          {stepLabels.map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-[0.65rem] font-bold transition-colors ${
                step > s ? "bg-accent-main text-white" : step === s ? "bg-accent-main text-white" : "bg-bg-tertiary text-text-muted"
              }`}>
                {step > s ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              {i < stepLabels.length - 1 && (
                <div className={`w-10 h-[2px] transition-colors ${step > s ? "bg-accent-main" : "bg-bg-tertiary"}`} />
              )}
            </div>
          ))}
        </div>
      )}
      {renderStep()}
    </Modal>
  );
}
