"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Heart, Eye, UserCheck, BookOpen, MessageCircle, type LucideIcon, Rocket, MapPin } from "lucide-react";
import Modal from "./Modal";
import { BOOST_MIN_DAILY, BOOST_MAX_DAILY, BOOST_MAX_DAYS, BOOST_GOALS, BOOST_AGE_RANGES, BOOST_COUNTRIES } from "@/lib/constants";

const GOAL_ICONS: Record<string, LucideIcon> = { Heart, Eye, UserCheck, BookOpen, MessageCircle };

interface BoostModalProps {
  open: boolean;
  onClose: () => void;
  postId: number;
}

function estimateImpressions(budget: number, days: number, multiplier: number) {
  const base = budget * days * 3 * multiplier;
  const min = Math.round(base * 0.7);
  const max = Math.round(base * 1.3);
  return { min, max };
}

export default function BoostModal({ open, onClose, postId }: BoostModalProps) {
  const t = useTranslations("boost");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const boostKey = (key: string) => key as Parameters<typeof t>[0];
  const [step, setStep] = useState(1);

  // Step 1: Goal
  const [goal, setGoal] = useState("");

  // Step 2: Targeting
  const [targetCountries, setTargetCountries] = useState<string[]>([]);
  const [selectedAgeRanges, setSelectedAgeRanges] = useState<string[]>([]);
  const [targetGender, setTargetGender] = useState("all");

  // Step 3: Budget
  const [dailyBudget, setDailyBudget] = useState(BOOST_MIN_DAILY);
  const [durationDays, setDurationDays] = useState(3);

  const totalCost = dailyBudget * durationDays;
  const budgetValid = dailyBudget >= BOOST_MIN_DAILY && dailyBudget <= BOOST_MAX_DAILY;
  const durationValid = durationDays >= 1 && durationDays <= BOOST_MAX_DAYS;

  const selectedGoal = BOOST_GOALS.find(g => g.id === goal);
  const estimated = useMemo(() => {
    if (!selectedGoal) return { min: 0, max: 0 };
    return estimateImpressions(dailyBudget, durationDays, selectedGoal.multiplier);
  }, [dailyBudget, durationDays, selectedGoal]);

  const canProceedStep1 = !!goal;
  const canProceedStep3 = budgetValid && durationValid;

  const handleCountryChange = (value: string) => {
    setTargetCountries(value === "" ? [] : [value]);
  };

  const toggleAgeRange = (id: string) => {
    setSelectedAgeRanges(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleProceed = () => {
    if (!canProceedStep3 || !goal) return;

    let ageMin: number | null = null;
    let ageMax: number | null = null;
    if (selectedAgeRanges.length > 0) {
      const ranges = BOOST_AGE_RANGES.filter(r => selectedAgeRanges.includes(r.id));
      ageMin = Math.min(...ranges.map(r => r.min));
      ageMax = Math.max(...ranges.map(r => r.max));
    }

    const payload = {
      postId,
      goal,
      daily_budget: dailyBudget,
      duration_days: durationDays,
      target_countries: targetCountries,
      target_gender: targetGender,
      age_min: ageMin,
      age_max: ageMax,
      total_budget: totalCost,
    };

    sessionStorage.setItem("fdm_boost_payment", JSON.stringify(payload));
    onClose();
    router.push("/boost-payment");
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => setStep(1), 300);
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="lg"
      centerOnDesktop
      title={t("feedimAds")}
      footer={
        <div className="flex items-center gap-[10px] px-5 py-4">
          {step > 1 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="t-btn cancel flex-1"
              style={{ background: "var(--bg-elevated)" }}
            >
              {tCommon("back")}
            </button>
          )}
          <button
            onClick={
              step === 1 ? () => { if (canProceedStep1) setStep(2); }
              : step === 2 ? () => setStep(3)
              : undefined
            }
            disabled={
              (step === 1 && !canProceedStep1) ||
              step === 3
            }
            className={`t-btn accept flex-1 ${step === 3 ? "!opacity-60 !cursor-not-allowed" : ""}`}
          >
            {step < 3 ? tCommon("next") : tCommon("betaNotice")}
          </button>
        </div>
      }
    >
      <div className="px-5 py-4" style={{ animation: "fadeUp 0.3s ease" }} key={step}>
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-5">
          <div className={`h-1 flex-1 rounded-full ${step >= 1 ? "bg-accent-main" : "bg-bg-tertiary"}`} />
          <div className={`h-1 flex-1 rounded-full ${step >= 2 ? "bg-accent-main" : "bg-bg-tertiary"}`} />
          <div className={`h-1 flex-1 rounded-full ${step >= 3 ? "bg-accent-main" : "bg-bg-tertiary"}`} />
        </div>

        {/* STEP 1: Goal Selection */}
        {step === 1 && (
          <>
            <div className="mb-5">
              <h2 className="text-xl font-bold mb-2">{t("goalTitle")}</h2>
              <p className="text-sm text-text-muted">{t("goalDescription")}</p>
            </div>

            <div className="space-y-2">
              {BOOST_GOALS.map(g => {
                const Icon = GOAL_ICONS[g.icon];
                const isSelected = goal === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => setGoal(g.id)}
                    className={`w-full flex items-center gap-3.5 p-3.5 rounded-xl border-2 transition text-left ${
                      isSelected
                        ? "border-accent-main bg-accent-main/5"
                        : "border-border-primary hover:border-text-muted/30"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelected ? "bg-accent-main/15 text-accent-main" : "bg-bg-tertiary text-text-muted"
                    }`}>
                      {Icon && <Icon className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[0.88rem] font-semibold">{t(g.labelKey.replace("boost.", ""))}</p>
                      <p className="text-[0.75rem] text-text-muted mt-0.5">{t(boostKey(`${g.labelKey.replace("boost.", "")}Desc`))}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                      isSelected ? "border-accent-main" : "border-border-primary"
                    }`}>
                      {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-accent-main" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* STEP 2: Targeting */}
        {step === 2 && (
          <>
            <div className="mb-5">
              <h2 className="text-xl font-bold mb-2">{t("targeting")}</h2>
              <p className="text-sm text-text-muted">{t("boostDescription")}</p>
            </div>

            {/* Country */}
            <div className="mb-5">
              <label className="text-sm font-semibold text-text-primary mb-2 block">{t("country")}</label>
              <select
                value={targetCountries[0] || ""}
                onChange={e => handleCountryChange(e.target.value)}
                className="select-modern w-full"
              >
                <option value="">{t("allCountries")}</option>
                {BOOST_COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>
                    {t(boostKey(c.labelKey.replace("boost.", "")))}
                  </option>
                ))}
              </select>
            </div>

            {/* Age Range */}
            <div className="mb-5">
              <label className="text-sm font-semibold text-text-primary mb-2 block">{t("ageRange")}</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedAgeRanges([])}
                  className={`px-4 py-1.5 rounded-full text-[0.88rem] font-bold border transition-all ${
                    selectedAgeRanges.length === 0
                      ? "bg-accent-main text-white border-accent-main"
                      : "bg-bg-secondary text-text-primary border-border-primary hover:border-accent-main/50"
                  }`}
                >
                  {t("allAges")}
                </button>
                {BOOST_AGE_RANGES.map(r => (
                  <button
                    key={r.id}
                    onClick={() => toggleAgeRange(r.id)}
                    className={`px-4 py-1.5 rounded-full text-[0.88rem] font-bold border transition-all ${
                      selectedAgeRanges.includes(r.id)
                        ? "bg-accent-main text-white border-accent-main"
                        : "bg-bg-secondary text-text-primary border-border-primary hover:border-accent-main/50"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Gender */}
            <div className="mb-5">
              <label className="text-sm font-semibold text-text-primary mb-2 block">{t("gender")}</label>
              <select
                value={targetGender}
                onChange={e => setTargetGender(e.target.value)}
                className="select-modern w-full"
              >
                <option value="all">{t("allGenders")}</option>
                <option value="male">{t("male")}</option>
                <option value="female">{t("female")}</option>
              </select>
            </div>

            {/* Location (Coming Soon) */}
            <div className="opacity-50">
              <label className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {t("location")}
                <span className="text-[0.65rem] bg-bg-tertiary px-2 py-0.5 rounded-full text-text-muted">{t("locationComingSoon")}</span>
              </label>
            </div>
          </>
        )}

        {/* STEP 3: Budget & Duration */}
        {step === 3 && (
          <>
            <div className="mb-5">
              <h2 className="text-xl font-bold mb-2">{t("budgetAndDuration")}</h2>
            </div>

            {/* Daily Budget */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-text-primary">{t("dailyBudget")}</label>
                <div className="flex items-center gap-1">
                  <span className="text-text-muted text-sm">₺</span>
                  <input
                    type="number"
                    value={dailyBudget}
                    onChange={e => {
                      const v = parseInt(e.target.value) || BOOST_MIN_DAILY;
                      setDailyBudget(Math.min(Math.max(v, BOOST_MIN_DAILY), BOOST_MAX_DAILY));
                    }}
                    min={BOOST_MIN_DAILY}
                    max={BOOST_MAX_DAILY}
                    className="input-modern !w-20 !h-10 text-right !px-2 !py-1 font-semibold"
                  />
                </div>
              </div>
              <input
                type="range"
                min={BOOST_MIN_DAILY}
                max={BOOST_MAX_DAILY}
                step={25}
                value={dailyBudget}
                onChange={e => setDailyBudget(parseInt(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none bg-bg-tertiary accent-accent-main cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-main [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-text-muted">₺{BOOST_MIN_DAILY}</span>
                <span className="text-xs text-text-muted">₺{BOOST_MAX_DAILY.toLocaleString(locale)}</span>
              </div>
            </div>

            {/* Duration */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-text-primary">{t("duration")}</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={durationDays}
                    onChange={e => {
                      const v = parseInt(e.target.value) || 1;
                      setDurationDays(Math.min(Math.max(v, 1), BOOST_MAX_DAYS));
                    }}
                    min={1}
                    max={BOOST_MAX_DAYS}
                    className="input-modern !w-14 !h-10 text-right !px-2 !py-1 font-semibold"
                  />
                  <span className="text-sm text-text-muted">{t("days", { count: "" }).replace(/^\s/, "")}</span>
                </div>
              </div>
              <input
                type="range"
                min={1}
                max={BOOST_MAX_DAYS}
                step={1}
                value={durationDays}
                onChange={e => setDurationDays(parseInt(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none bg-bg-tertiary accent-accent-main cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-main [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-text-muted">1 {t("days", { count: "" })}</span>
                <span className="text-xs text-text-muted">{BOOST_MAX_DAYS} {t("days", { count: "" })}</span>
              </div>
            </div>

            {/* Estimated Impressions */}
            {selectedGoal && (
              <div className="bg-gradient-to-br from-accent-main/10 via-accent-main/5 to-transparent rounded-2xl p-4 text-center mb-5">
                <p className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-1">{t("estimatedImpressions")}</p>
                <p className="text-[1.3rem] font-extrabold text-accent-main">
                  {estimated.min.toLocaleString(locale)} – {estimated.max.toLocaleString(locale)}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {t(boostKey(selectedGoal.labelKey.replace("boost.", "")))}
                </p>
              </div>
            )}

            {/* Summary Card */}
            <div className="bg-bg-secondary rounded-2xl p-4 space-y-2.5">
              <p className="text-[0.8rem] font-bold uppercase tracking-wider text-text-secondary">{t("summary")}</p>

              <div className="text-sm text-text-muted space-y-1">
                <div className="flex justify-between">
                  <span>{t("targeting")}</span>
                  <span className="font-medium text-text-primary text-right max-w-[55%] truncate">
                    {targetCountries.length > 0 ? targetCountries.join(", ") : t("allCountries")}
                    {selectedAgeRanges.length > 0 ? ` · ${selectedAgeRanges.join(", ")}` : ""}
                    {targetGender !== "all" ? ` · ${targetGender === "male" ? t("male") : t("female")}` : ""}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>{t("dailyBudget")}</span>
                  <span className="font-medium text-text-primary">₺{dailyBudget.toLocaleString(locale)}{t("perDay")}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("duration")}</span>
                  <span className="font-medium text-text-primary">{t("days", { count: durationDays })}</span>
                </div>
              </div>

              <div className="h-px bg-border-primary/60" />

              <div className="flex justify-between items-center">
                <span className="text-[0.88rem] font-bold">{t("totalCost")}</span>
                <div className="text-right">
                  <span className="text-[1.05rem] font-bold">₺{totalCost.toLocaleString(locale)}</span>
                  <p className="text-xs text-text-muted">+ {t("vat", { rate: 20 })}</p>
                </div>
              </div>
            </div>

            {/* Duration extension note */}
            <p className="text-xs text-text-muted mt-3">{t("durationNote")}</p>
          </>
        )}
      </div>
    </Modal>
  );
}
