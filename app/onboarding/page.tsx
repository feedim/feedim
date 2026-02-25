"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { emitNavigationStart } from "@/lib/navigationProgress";
import { createClient } from "@/lib/supabase/client";
import { FeedimIcon } from "@/components/FeedimLogo";
import { feedimAlert } from "@/components/FeedimAlert";
import { Check } from "lucide-react";
import FollowButton from "@/components/FollowButton";
import { Spinner } from "@/components/FeedimLoader";
import { useTranslations } from "next-intl";
import VerifiedBadge, { getBadgeVariant } from "@/components/VerifiedBadge";
import AvatarCropModal from "@/components/modals/AvatarCropModal";
import EditableAvatar from "@/components/EditableAvatar";

const TOTAL_STEPS = 10;
const MIN_TOPIC_TAGS = 1;
const MAX_TOPIC_TAGS = 5;

interface Profile {
  avatar_url?: string;
  name?: string;
  surname?: string;
  full_name?: string;
  username?: string;
  birth_date?: string;
  gender?: string;
  bio?: string;
  onboarding_step?: number;
}

interface Suggestion {
  user_id: string;
  name?: string;
  surname?: string;
  full_name?: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  is_verified?: boolean;
  premium_plan?: string | null;
  role?: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const t = useTranslations("onboarding");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<false | "next" | "skip" | "prev">(false);
  const [profile, setProfile] = useState<Profile>({});
  const [celebrated, setCelebrated] = useState(false);

  // Step-specific state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const avatarLoadStartRef = useRef<number>(0);
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [bio, setBio] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionsLoaded, setSuggestionsLoaded] = useState(false);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [availableTags, setAvailableTags] = useState<{ id: number; name: string; slug: string; post_count: number }[]>([]);
  const [tagsLoaded, setTagsLoaded] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [emailVerified, setEmailVerified] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);

  // Load suggested tags when reaching interests step
  useEffect(() => {
    if (step === 8 && !tagsLoaded) {
      const lang = selectedLanguage || document.cookie.match(/fdm-locale=(\w+)/)?.[1] || "tr";
      fetch(`/api/tags/suggested?lang=${lang}`)
        .then((r) => r.json())
        .then((d) => {
          setAvailableTags(d.tags || []);
          setTagsLoaded(true);
        })
        .catch(() => {});
    }
  }, [step, tagsLoaded, selectedLanguage]);

  // Load profile on mount
  useEffect(() => {
    loadProfile();

    // Başka sekmede giriş/çıkış yapıldığında algıla ve sayfayı yenile
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" || event === "SIGNED_IN") {
        router.replace("/login");
      }
    });
    return () => { subscription.unsubscribe(); };
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login"); return; }

    // Check email verification
    setEmailVerified(!!user.email_confirmed_at);

    const { data } = await supabase
      .from("profiles")
      .select("avatar_url, name, surname, full_name, username, birth_date, gender, bio, onboarding_step, onboarding_completed")
      .eq("user_id", user.id)
      .single();

    if (data?.onboarding_completed) {
      emitNavigationStart();
      router.push("/");
      return;
    }

    if (data) {
      setProfile(data);
      let currentStep = data.onboarding_step || 1;
      // Skip email verify step if already verified
      if (currentStep === 7 && !!user.email_confirmed_at) {
        currentStep = 8; // Jump to Topics
      }
      setStep(currentStep);
      setAvatarPreview(data.avatar_url || null);
      setBirthDate(data.birth_date || "");
      setGender(data.gender || "");
      setBio(data.bio || "");
    }
    setLoading(false);
  };

  // Resolve next step (skip email verify if already verified)
  const resolveStep = useCallback((s: number) => {
    if (s === 7 && emailVerified) s = 8;
    return s;
  }, [emailVerified]);

  // Save step and advance
  const saveStep = useCallback(async (payload: Record<string, unknown> = {}) => {
    setProcessing("next");
    const start = Date.now();
    const waitMin = async () => {
      const elapsed = Date.now() - start;
      if (elapsed < 2000) await new Promise(r => setTimeout(r, 2000 - elapsed));
    };
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step, ...payload }),
      });
      const data = await res.json();
      await waitMin();
      if (!res.ok) {
        feedimAlert("error", data.error || tErrors("generic"));
        return;
      }
      setStep(resolveStep(data.next));
    } catch {
      await waitMin();
      feedimAlert("error", tErrors("connection"));
    } finally {
      setProcessing(false);
    }
  }, [step, resolveStep]);

  // Skip step
  const skipStep = useCallback(async () => {
    setProcessing("skip");
    const start = Date.now();
    const waitMin = async () => {
      const elapsed = Date.now() - start;
      if (elapsed < 2000) await new Promise(r => setTimeout(r, 2000 - elapsed));
    };
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step, action: "skip" }),
      });
      const data = await res.json();
      await waitMin();
      if (!res.ok) {
        feedimAlert("error", data.error || t("cannotSkip"));
        return;
      }
      setStep(resolveStep(data.next));
    } catch {
      await waitMin();
      feedimAlert("error", tErrors("connection"));
    } finally {
      setProcessing(false);
    }
  }, [step, resolveStep]);

  // Complete onboarding
  const completeOnboarding = useCallback(async () => {
    setProcessing("next");
    const start = Date.now();
    const waitMin = async () => {
      const elapsed = Date.now() - start;
      if (elapsed < 2000) await new Promise(r => setTimeout(r, 2000 - elapsed));
    };
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete" }),
      });
      await waitMin();
      emitNavigationStart();
      router.push("/profile");
    } catch {
      await waitMin();
      feedimAlert("error", tErrors("connection"));
    } finally {
      setProcessing(false);
    }
  }, [router, tErrors]);

  // Handle next
  const handleNext = useCallback(async () => {
    if (processing) return;

    switch (step) {
      case 1: {
        // Country — required
        if (!selectedCountry) { feedimAlert("error", t("countryRequired")); return; }
        await saveStep({ country: selectedCountry });
        break;
      }
      case 2: {
        // Language — required, save and reload if language changed
        if (!selectedLanguage) { feedimAlert("error", t("languageRequired")); return; }
        await saveStep({ language: selectedLanguage });
        if (selectedLanguage) {
          document.cookie = `fdm-locale=${selectedLanguage};path=/;max-age=${365 * 24 * 60 * 60}`;
          window.location.reload();
          return;
        }
        break;
      }
      case 3:
        // Upload pending avatar if exists (same flow as EditProfileModal)
        if (pendingAvatarFile) {
          setAvatarUploading(true);
          setAvatarLoading(true);
          avatarLoadStartRef.current = Date.now();
          try {
            const formData = new FormData();
            formData.append("file", pendingAvatarFile);
            const res = await fetch("/api/profile/avatar", { method: "POST", body: formData });
            const data = await res.json();
            if (res.ok) {
              setAvatarPreview(data.url);
              setPendingAvatarFile(null);
            } else {
              feedimAlert("error", data.error || t("avatarUploadFailed"));
              setAvatarLoading(false);
              setAvatarUploading(false);
              return;
            }
          } catch {
            feedimAlert("error", t("avatarUploadFailed"));
            setAvatarLoading(false);
            setAvatarUploading(false);
            return;
          }
          const elapsed = Date.now() - avatarLoadStartRef.current;
          const remain = Math.max(0, 2000 - elapsed);
          await new Promise(r => setTimeout(r, remain));
          setAvatarLoading(false);
          setAvatarUploading(false);
        }
        await saveStep();
        break;
      case 4:
        if (!birthDate) { feedimAlert("error", t("birthDateRequired")); return; }
        await saveStep({ birth_date: birthDate });
        break;
      case 5:
        if (!gender) { feedimAlert("error", t("genderRequired")); return; }
        await saveStep({ gender });
        break;
      case 6:
        await saveStep({ bio });
        break;
      case 7:
        await saveStep();
        break;
      case 8:
        // Topics — must select at least 1
        if (selectedTagIds.size < MIN_TOPIC_TAGS) {
          feedimAlert("error", t("minTopics", { min: MIN_TOPIC_TAGS }));
          return;
        }
        // Follow selected tags in background (fire and forget)
        for (const tagId of selectedTagIds) {
          fetch(`/api/tags/${tagId}/follow`, { method: "POST", keepalive: true }).catch(() => {});
        }
        await saveStep();
        break;
      case 9:
        await saveStep();
        break;
      case 10:
        await completeOnboarding();
        break;
    }
  }, [step, processing, pendingAvatarFile, selectedLanguage, selectedCountry, birthDate, gender, bio, selectedTagIds, saveStep, completeOnboarding]);

  // Handle prev
  const handlePrev = useCallback(async () => {
    if (step <= 1 || processing) return;
    setProcessing("prev");
    await new Promise(r => setTimeout(r, 1000));
    let prev = step - 1;
    if (prev === 7 && emailVerified) prev = 6; // Skip email verify going back
    setStep(prev);
    setProcessing(false);
  }, [step, processing, emailVerified]);

  // Avatar upload — open crop modal (same validation as EditProfileModal)
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      feedimAlert("error", tErrors("fileTooLarge"));
      return;
    }
    setCropFile(file);
    setCropOpen(true);
    e.target.value = "";
  };

  // After crop, save file locally (upload happens on "İleri")
  const handleCroppedUpload = (croppedFile: File) => {
    if (avatarPreview && avatarPreview.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview);
    }
    setPendingAvatarFile(croppedFile);
    setAvatarPreview(URL.createObjectURL(croppedFile));
  };

  // Load suggestions when reaching step 9
  useEffect(() => {
    if (step === 9 && !suggestionsLoaded) {
      fetch("/api/onboarding")
        .then((r) => r.json())
        .then((d) => setSuggestions(d.suggestions || []))
        .catch(() => {})
        .finally(() => setSuggestionsLoaded(true));
    }
  }, [step, suggestionsLoaded]);

  // Step 10 reached
  useEffect(() => {
    if (step === 10) setCelebrated(true);
  }, [step]);

  // Toggle follow
  const toggleFollow = async (userId: string) => {
    const newSet = new Set(followedIds);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setFollowedIds(newSet);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const profile = suggestions.find((s) => s.user_id === userId);
      if (!profile) return;

      await fetch(`/api/users/${profile.username}/follow`, { method: "POST" });
    } catch {}
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-solid-primary">
        <Spinner size={22} />
      </div>
    );
  }

  const progress = (step / TOTAL_STEPS) * 100;
  const canSkip = [3, 6, 7, 8, 9].includes(step) && step < 10;

  return (
    <div className="min-h-screen text-text-primary">
      <div className="max-w-[500px] w-full mx-auto px-4 pt-[27px] pb-[50px]">
        {/* Progress bar */}
        <div className="flex items-center gap-3 mb-5">
          <FeedimIcon className="h-[40px] w-[40px] shrink-0 text-accent-main" />
          <div className="w-px h-4 bg-border-primary shrink-0" />
          <div className="flex-1 h-1 bg-border-primary rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-main rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs font-bold bg-accent-main text-white px-2.5 py-1 rounded-full">
            {step}/{TOTAL_STEPS}
          </span>
        </div>

        {/* Step content */}
        <div className="mb-[10px]" style={{ animation: "fadeUp 0.3s ease" }} key={step}>
          {step === 1 && (
            <StepCountry
              country={selectedCountry}
              onCountryChange={setSelectedCountry}
            />
          )}
          {step === 2 && (
            <StepLanguage
              language={selectedLanguage}
              onLanguageChange={setSelectedLanguage}
            />
          )}
          {step === 3 && (
            <StepProfilePhoto
              avatarPreview={avatarPreview}
              onAvatarClick={() => { if (!avatarUploading && !avatarLoading) fileInputRef.current?.click(); }}
              loading={avatarLoading}
              uploading={avatarUploading}
            />
          )}
          {step === 4 && <StepBirthDate value={birthDate} onChange={setBirthDate} />}
          {step === 5 && <StepGender value={gender} onChange={setGender} />}
          {step === 6 && <StepBiography value={bio} onChange={setBio} />}
          {step === 7 && <StepEmailVerify />}
          {step === 8 && <StepTopicTags tags={availableTags} selectedIds={selectedTagIds} onToggle={(id) => {
            const newSet = new Set(selectedTagIds);
            if (newSet.has(id)) { newSet.delete(id); } else if (newSet.size < MAX_TOPIC_TAGS) { newSet.add(id); }
            setSelectedTagIds(newSet);
          }} loaded={tagsLoaded} minRequired={MIN_TOPIC_TAGS} maxAllowed={MAX_TOPIC_TAGS} />}
          {step === 9 && <StepSuggestions suggestions={suggestions} followedIds={followedIds} onToggle={toggleFollow} loaded={suggestionsLoaded} />}
          {step === 10 && <StepWelcome profile={profile} avatarPreview={avatarPreview} />}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-[10px] mt-[15px]">
          {step > 1 && (
            <button onClick={handlePrev} disabled={!!processing} className="t-btn cancel flex-1 relative" style={{ background: "var(--bg-elevated)" }} aria-label={tCommon("back")}>
              {processing === "prev" ? <Spinner size={18} /> : tCommon("back")}
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!!processing || avatarUploading || (step === 8 && selectedTagIds.size < MIN_TOPIC_TAGS)}
            className="t-btn accept flex-1 relative"
            aria-label={tCommon("next")}
          >
            {processing === "next" ? <Spinner size={18} /> : step === 10 ? tCommon("finish") : tCommon("next")}
          </button>
        </div>

        {/* Skip */}
        {canSkip && (
          <div className="mt-[11px]">
            <button
              onClick={skipStep}
              disabled={!!processing}
              className="t-btn cancel relative w-full min-h-[38px]"
              aria-label={tCommon("skip")}
            >
              {processing === "skip" ? <Spinner size={16} /> : tCommon("skip")}
            </button>
          </div>
        )}
      </div>

      {/* Hidden file input — kept in parent like EditProfileModal */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleAvatarSelect}
        className="hidden"
      />

      <AvatarCropModal
        open={cropOpen}
        onClose={() => setCropOpen(false)}
        file={cropFile}
        onCrop={handleCroppedUpload}
      />
    </div>
  );
}

// ── Step Components ──

function StepCountry({ country, onCountryChange }: {
  country: string;
  onCountryChange: (v: string) => void;
}) {
  const t = useTranslations("onboarding");
  const [countries, setCountries] = useState<{ code: string; name_tr: string; name_en: string; name_az: string }[]>([]);
  const [locale, setLocale] = useState("tr");

  useEffect(() => {
    import("@/lib/countries").then((m) => setCountries(m.COUNTRIES as any));
    const match = document.cookie.match(/fdm-locale=(\w+)/);
    if (match) setLocale(match[1]);
  }, []);

  const nameKey = `name_${locale}` as "name_tr" | "name_en" | "name_az";

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-bold mb-2">{t("country")}</h2>
        <p className="text-sm text-text-muted">{t("countryDesc")}</p>
      </div>
      <select
        value={country}
        onChange={(e) => onCountryChange(e.target.value)}
        className="select-modern w-full"
      >
        <option value="">{t("selectCountry")}</option>
        {countries.map((c) => (
          <option key={c.code} value={c.code}>
            {c[nameKey] || c.name_en}
          </option>
        ))}
      </select>
    </div>
  );
}

function StepLanguage({ language, onLanguageChange }: {
  language: string;
  onLanguageChange: (v: string) => void;
}) {
  const t = useTranslations("onboarding");

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-bold mb-2">{t("language")}</h2>
        <p className="text-sm text-text-muted">{t("languageDesc")}</p>
      </div>
      <select
        value={language}
        onChange={(e) => onLanguageChange(e.target.value)}
        className="select-modern w-full"
      >
        <option value="">—</option>
        <option value="tr">Türkçe</option>
        <option value="en">English</option>
        <option value="az">Azərbaycanca</option>
      </select>
    </div>
  );
}

function StepProfilePhoto({ avatarPreview, onAvatarClick, loading, uploading }: {
  avatarPreview: string | null;
  onAvatarClick: () => void;
  loading: boolean;
  uploading: boolean;
}) {
  const t = useTranslations("onboarding");
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-bold mb-2">{t("addPhoto")}</h2>
        <p className="text-sm text-text-muted">{t("addPhotoDesc")}</p>
      </div>
      <div className="flex justify-center">
        <EditableAvatar
          src={avatarPreview}
          alt=""
          sizeClass="w-[150px] h-[150px]"
          editable={!uploading && !loading}
          loading={loading}
          onClick={onAvatarClick}
        />
      </div>
    </div>
  );
}

function StepBirthDate({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useTranslations("onboarding");
  const tMonths = useTranslations("months");
  const today = new Date();
  const minYear = today.getFullYear() - 120;
  const maxYear = today.getFullYear() - 13;

  // Track individual parts in local state to avoid losing intermediate selections
  const initParts = value ? value.split("-") : ["", "", ""];
  const [selYear, setSelYear] = useState(initParts[0] || "");
  const [selMonth, setSelMonth] = useState(initParts[1] ? String(Number(initParts[1])) : "");
  const [selDay, setSelDay] = useState(initParts[2] ? String(Number(initParts[2])) : "");

  const updateDate = (y: string, m: string, d: string) => {
    setSelYear(y);
    setSelMonth(m);
    setSelDay(d);
    if (y && m && d) {
      onChange(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
    }
  };

  const daysInMonth = selYear && selMonth ? new Date(Number(selYear), Number(selMonth), 0).getDate() : 31;

  const months = Array.from({ length: 12 }, (_, i) => tMonths(String(i + 1)));

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-bold mb-2">{t("birthDate")}</h2>
        <p className="text-sm text-text-muted">{t("birthDateDesc")}</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <select value={selDay} onChange={(e) => updateDate(selYear, selMonth, e.target.value)} className="select-modern w-full">
          <option value="">{t("day")}</option>
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
            <option key={d} value={String(d)}>{d}</option>
          ))}
        </select>
        <select value={selMonth} onChange={(e) => updateDate(selYear, e.target.value, selDay)} className="select-modern w-full">
          <option value="">{t("month")}</option>
          {months.map((m, i) => (
            <option key={i + 1} value={String(i + 1)}>{m}</option>
          ))}
        </select>
        <select value={selYear} onChange={(e) => updateDate(e.target.value, selMonth, selDay)} className="select-modern w-full">
          <option value="">{t("year")}</option>
          {Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i).map((y) => (
            <option key={y} value={String(y)}>{y}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function StepGender({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useTranslations("onboarding");
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-bold mb-2">{t("gender")}</h2>
        <p className="text-sm text-text-muted">{t("birthDateDesc")}</p>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="select-modern w-full"
      >
        <option value="">{t("selectGender")}</option>
        <option value="male">{t("male")}</option>
        <option value="female">{t("female")}</option>
        <option value="other">{t("other")}</option>
      </select>
    </div>
  );
}

function StepBiography({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useTranslations("onboarding");
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-bold mb-2">{t("bio")}</h2>
        <p className="text-sm text-text-muted">{t("bioDesc")}</p>
      </div>
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, 150))}
          placeholder={t("bioPlaceholder")}
          rows={4}
          maxLength={150}
          className="input-modern w-full !h-auto !py-[10px] !px-[11px]"
        />
        <span className="absolute bottom-3 right-3 text-xs text-text-muted">{value.length}/150</span>
      </div>
    </div>
  );
}

function StepEmailVerify() {
  const t = useTranslations("onboarding");
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-bold mb-2">{t("emailVerification")}</h2>
        <p className="text-sm text-text-muted">{t("emailAutoVerified")}</p>
      </div>
      <div className="bg-bg-secondary rounded-2xl p-5 text-center">
        <div className="w-12 h-12 rounded-full bg-success/20 text-success flex items-center justify-center mx-auto mb-3">
          <Check className="h-6 w-6" />
        </div>
        <p className="text-sm font-medium">{t("emailVerified")}</p>
        <p className="text-xs text-text-muted mt-1">{t("pressNext")}</p>
      </div>
    </div>
  );
}

function StepTopicTags({ tags, selectedIds, onToggle, loaded, minRequired, maxAllowed }: {
  tags: { id: number; name: string; slug: string; post_count: number }[];
  selectedIds: Set<number>;
  onToggle: (id: number) => void;
  loaded: boolean;
  minRequired: number;
  maxAllowed: number;
}) {
  const t = useTranslations("onboarding");
  return (
    <div>
      <div className="mb-3">
        <h2 className="text-xl font-bold mb-2">{t("interests")}</h2>
        <p className="text-sm text-text-muted">
          {t("interestsDesc", { min: minRequired, max: maxAllowed })}
        </p>
      </div>
      {!loaded ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <Spinner size={22} />
        </div>
      ) : tags.length === 0 ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <p className="text-sm text-text-muted">{t("noTags")}</p>
        </div>
      ) : (
        <>
          <div className="mb-3">
            <span className="text-xs text-text-muted">
              {selectedIds.size}/{maxAllowed} {t("selected")}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const selected = selectedIds.has(tag.id);
              return (
                <button
                  key={tag.id}
                  onClick={() => onToggle(tag.id)}
                  className={`px-5 py-2 rounded-full text-[0.94rem] font-bold border transition-all ${
                    selected
                      ? "bg-accent-main text-white border-accent-main"
                      : "bg-bg-secondary text-text-primary border-border-primary hover:border-accent-main/50"
                  }`}
                >
                  #{tag.name}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function StepSuggestions({ suggestions, followedIds, onToggle, loaded }: {
  suggestions: Suggestion[];
  followedIds: Set<string>;
  onToggle: (id: string) => void;
  loaded: boolean;
}) {
  const t = useTranslations("onboarding");
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-bold mb-2">{t("findPeople")}</h2>
        <p className="text-sm text-text-muted">{t("findPeopleDesc")}</p>
      </div>
      {!loaded ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <Spinner size={22} />
        </div>
      ) : suggestions.length === 0 ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <p className="text-sm text-text-muted">{t("noSuggestions")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {suggestions.map((user) => {
            const isFollowed = followedIds.has(user.user_id);
            return (
              <div key={user.user_id} className="flex items-center gap-3 py-2.5 px-1">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover shrink-0" />
                ) : (
                  <img className="default-avatar-auto w-11 h-11 rounded-full object-cover shrink-0" alt="" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-0.5">
                    <span className="text-sm font-semibold truncate">@{user.username}</span>
                    {user.is_verified && <VerifiedBadge variant={getBadgeVariant(user.premium_plan)} role={user.role} />}
                  </div>
                  {user.bio && <p className="text-xs text-text-muted truncate">{user.bio}</p>}
                </div>
                <FollowButton following={isFollowed} onClick={() => onToggle(user.user_id)} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StepWelcome({ profile, avatarPreview }: { profile: Profile; avatarPreview: string | null }) {
  const t = useTranslations("onboarding");
  const tCommon = useTranslations("common");
  const name = (profile.name || profile.username || tCommon("user")).trim();

  return (
    <div className="text-center py-6">
      <div className="flex justify-center mb-5">
        {avatarPreview ? (
          <img src={avatarPreview} alt="" className="w-[120px] h-[120px] rounded-full object-cover" />
        ) : (
          <img className="default-avatar-auto w-[120px] h-[120px] rounded-full object-cover" alt="" />
        )}
      </div>
      <h2 className="text-2xl font-bold mb-2">{t("welcome", { name })}</h2>
      <p className="text-sm text-text-muted">{t("welcomeDesc")}</p>
    </div>
  );
}
