"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { openFilePicker } from "@/lib/openFilePicker";
import { emitNavigationStart } from "@/lib/navigationProgress";
import { createClient } from "@/lib/supabase/client";
import { FeedimIcon } from "@/components/FeedimLogo";
import { feedimAlert } from "@/components/FeedimAlert";
import {
  Check, Clapperboard, Music, Trophy, Cpu, Gamepad2, UtensilsCrossed,
  Shirt, Plane, GraduationCap, Newspaper, Palette, HeartPulse, Briefcase,
  Laugh, PawPrint, FlaskConical, Car, Film, BookOpen, Sparkles,
} from "lucide-react";
import { INTEREST_CATEGORIES, INTEREST_MIN_SELECT, INTEREST_MAX_SELECT } from "@/lib/constants";
import FollowButton from "@/components/FollowButton";
import LazyAvatar from "@/components/LazyAvatar";
import { Spinner } from "@/components/FeedimLoader";
import { useTranslations } from "next-intl";
import VerifiedBadge, { getBadgeVariant } from "@/components/VerifiedBadge";
import AvatarCropModal from "@/components/modals/AvatarCropModal";
import EditableAvatar from "@/components/EditableAvatar";

const TOTAL_STEPS = 10;

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
  const [step, _setStep] = useState(1);
  const setStep = useCallback((s: number | ((prev: number) => number)) => {
    _setStep(s);
    window.scrollTo(0, 0);
  }, []);
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
  const [pendingFollowIds, setPendingFollowIds] = useState<Set<string>>(new Set());
  const [selectedInterestIds, setSelectedInterestIds] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [emailVerified, setEmailVerified] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);

  // Load profile on mount
  useEffect(() => {
    loadProfile();

    // Başka sekmede çıkış yapıldığında algıla ve login'e yönlendir
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
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
      .select("avatar_url, name, surname, full_name, username, birth_date, gender, bio, language, country, onboarding_step, onboarding_completed")
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
      setSelectedLanguage((data as any).onboarding_step && (data as any).onboarding_step >= 2 ? ((data as any).language || "") : "");
      setSelectedCountry((data as any).country || "");
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
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete" }),
      });
      await waitMin();
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        feedimAlert("error", data.error || tErrors("generic"));
        return;
      }
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
    if (processing || avatarUploading) return;

    switch (step) {
      case 1: {
        // Country — required
        if (!selectedCountry) { feedimAlert("error", t("countryRequired")); return; }
        await saveStep({ country: selectedCountry });
        break;
      }
      case 2: {
        // Language — required, save and refresh translations without full reload
        if (!selectedLanguage) { feedimAlert("error", t("languageRequired")); return; }
        await saveStep({ language: selectedLanguage });
        if (selectedLanguage) {
          document.cookie = `fdm-locale=${selectedLanguage};path=/;max-age=${365 * 24 * 60 * 60}`;
          router.refresh();
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
        if (selectedInterestIds.size < INTEREST_MIN_SELECT) {
          feedimAlert("error", t("minInterests", { min: INTEREST_MIN_SELECT }));
          return;
        }
        await saveStep({ interest_ids: Array.from(selectedInterestIds) });
        break;
      case 9:
        await saveStep();
        break;
      case 10:
        await completeOnboarding();
        break;
    }
  }, [step, processing, pendingAvatarFile, selectedLanguage, selectedCountry, birthDate, gender, bio, selectedInterestIds, saveStep, completeOnboarding]);

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
        .then((d) => {
          setSuggestions(d.suggestions || []);
          setSuggestionsLoaded(true);
        })
        .catch(() => {
          // Hata durumunda yeniden denemeye izin ver (suggestionsLoaded false kalır)
        });
    }
  }, [step, suggestionsLoaded]);

  // Step 10 reached
  useEffect(() => {
    if (step === 10) setCelebrated(true);
  }, [step]);

  // Toggle follow
  const toggleFollow = async (target: Suggestion) => {
    const userId = target.user_id;
    if (pendingFollowIds.has(userId)) return;

    const wasFollowed = followedIds.has(userId);

    setPendingFollowIds((prev) => {
      const next = new Set(prev);
      next.add(userId);
      return next;
    });

    setFollowedIds((prev) => {
      const next = new Set(prev);
      if (wasFollowed) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });

    try {
      const res = await fetch(`/api/users/${target.username}/follow`, { method: "POST", keepalive: true });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setFollowedIds((prev) => {
          const next = new Set(prev);
          if (wasFollowed) {
            next.add(userId);
          } else {
            next.delete(userId);
          }
          return next;
        });

        if (res.status === 404) {
          setSuggestions((prev) => prev.filter((suggestion) => suggestion.user_id !== userId));
          return;
        }

        feedimAlert("error", data.error || tErrors("generic"));
        return;
      }

      setFollowedIds((prev) => {
        const next = new Set(prev);
        if (data.following || data.requested) {
          next.add(userId);
        } else {
          next.delete(userId);
        }
        return next;
      });
    } catch {
      setFollowedIds((prev) => {
        const next = new Set(prev);
        if (wasFollowed) {
          next.add(userId);
        } else {
          next.delete(userId);
        }
        return next;
      });
      feedimAlert("error", tErrors("connection"));
    } finally {
      setPendingFollowIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-solid-primary">
        <Spinner size={22} />
      </div>
    );
  }

  const progress = (step / TOTAL_STEPS) * 100;
  const canSkip = [3, 6, 7, 9].includes(step) && step < 10;

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
              onAvatarClick={() => { if (!avatarUploading && !avatarLoading) openFilePicker(fileInputRef.current); }}
              loading={avatarLoading}
              uploading={avatarUploading}
            />
          )}
          {step === 4 && <StepBirthDate value={birthDate} onChange={setBirthDate} />}
          {step === 5 && <StepGender value={gender} onChange={setGender} />}
          {step === 6 && <StepBiography value={bio} onChange={setBio} />}
          {step === 7 && <StepEmailVerify />}
          {step === 8 && <StepInterests selectedIds={selectedInterestIds} onToggle={(id) => {
            const newSet = new Set(selectedInterestIds);
            if (newSet.has(id)) { newSet.delete(id); } else if (newSet.size < INTEREST_MAX_SELECT) { newSet.add(id); }
            setSelectedInterestIds(newSet);
          }} />}
          {step === 9 && (
            <StepSuggestions
              suggestions={suggestions}
              followedIds={followedIds}
              pendingFollowIds={pendingFollowIds}
              onToggle={toggleFollow}
              loaded={suggestionsLoaded}
            />
          )}
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
            disabled={!!processing || avatarUploading || (step === 8 && selectedInterestIds.size < INTEREST_MIN_SELECT)}
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
  const maxYear = today.getFullYear() - 15;

  // Track individual parts in local state to avoid losing intermediate selections
  const initParts = value && /^\d{4}-\d{1,2}-\d{1,2}$/.test(value) ? value.split("-") : ["", "", ""];
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
        <p className="text-sm text-text-muted">{t("genderDesc")}</p>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="select-modern w-full"
      >
        <option value="">{t("selectGender")}</option>
        <option value="male">{t("male")}</option>
        <option value="female">{t("female")}</option>
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

const INTEREST_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Clapperboard, Music, Trophy, Cpu, Gamepad2, UtensilsCrossed,
  Shirt, Plane, GraduationCap, Newspaper, Palette, HeartPulse,
  Briefcase, Laugh, PawPrint, FlaskConical, Car, Film, BookOpen, Sparkles,
};

function StepInterests({ selectedIds, onToggle }: {
  selectedIds: Set<number>;
  onToggle: (id: number) => void;
}) {
  const t = useTranslations("onboarding");
  const tInterests = useTranslations("interests");
  return (
    <div>
      <div className="mb-3">
        <p className="text-sm text-text-muted">
          {t("chooseInterestsDesc", { min: INTEREST_MIN_SELECT, max: INTEREST_MAX_SELECT })}
        </p>
      </div>
      <div className="mb-3">
        <span className={`text-xs font-medium ${selectedIds.size >= INTEREST_MIN_SELECT ? "text-accent-main" : "text-text-muted"}`}>
          {selectedIds.size}/{INTEREST_MAX_SELECT} {t("selected")}
          {selectedIds.size < INTEREST_MIN_SELECT && (
            <span className="text-text-muted/60 ml-1">({t("minRequired", { min: INTEREST_MIN_SELECT })})</span>
          )}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {INTEREST_CATEGORIES.map((cat) => {
          const selected = selectedIds.has(cat.id);
          const IconComp = INTEREST_ICON_MAP[cat.icon];
          return (
            <button
              key={cat.id}
              onClick={() => onToggle(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[0.8rem] font-medium border transition-all ${
                selected
                  ? "bg-accent-main text-white border-accent-main scale-[1.02]"
                  : "bg-bg-secondary text-text-primary border-border-primary hover:border-accent-main/50"
              }`}
            >
              {IconComp && <IconComp className="h-3.5 w-3.5 shrink-0" />}
              <span>{tInterests(cat.slug)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepSuggestions({ suggestions, followedIds, pendingFollowIds, onToggle, loaded }: {
  suggestions: Suggestion[];
  followedIds: Set<string>;
  pendingFollowIds: Set<string>;
  onToggle: (user: Suggestion) => void;
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
        <div className="space-y-2 min-h-[200px]">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="flex items-center gap-3 py-2.5 px-1">
              <div className="w-11 h-11 rounded-full bg-bg-secondary shrink-0 animate-pulse" />
              <div className="flex-1 min-w-0 space-y-[6px]">
                <div className="h-[10px] w-24 bg-bg-secondary rounded-[5px] animate-pulse" />
                <div className="h-[8px] w-32 bg-bg-secondary rounded-[5px] animate-pulse" />
              </div>
              <div className="h-8 w-20 bg-bg-secondary rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      ) : suggestions.length === 0 ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <p className="text-sm text-text-muted">{t("noSuggestions")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {suggestions.map((user) => {
            const isFollowed = followedIds.has(user.user_id);
            const isPending = pendingFollowIds.has(user.user_id);
            return (
              <div key={user.user_id} className="flex items-center gap-3 py-2.5 px-1">
                <LazyAvatar src={user.avatar_url} alt="" sizeClass="w-11 h-11" className="shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-0.5">
                    <span className="text-sm font-semibold truncate">@{user.username}</span>
                    {user.is_verified && <VerifiedBadge variant={getBadgeVariant(user.premium_plan)} role={user.role} />}
                  </div>
                  {user.bio && <p className="block max-w-[165px] overflow-hidden text-ellipsis whitespace-nowrap text-xs text-text-muted sm:max-w-[195px]">{user.bio}</p>}
                </div>
                <FollowButton following={isFollowed} onClick={() => onToggle(user)} disabled={isPending} />
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
        <LazyAvatar src={avatarPreview} alt="" sizeClass="w-[120px] h-[120px]" />
      </div>
      <h2 className="text-xl font-bold mb-2">{t("welcome", { name })}</h2>
      <p className="text-xs text-text-muted">{t("welcomeDesc")}</p>
    </div>
  );
}
