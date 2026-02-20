"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FeedimIcon } from "@/components/FeedimLogo";
import { feedimAlert } from "@/components/FeedimAlert";
import { Camera, ChevronLeft, Check } from "lucide-react";
import FollowButton from "@/components/FollowButton";
import { Spinner } from "@/components/FeedimLoader";
import VerifiedBadge, { getBadgeVariant } from "@/components/VerifiedBadge";
import AvatarCropModal from "@/components/modals/AvatarCropModal";

const TOTAL_STEPS = 8;
const MIN_TOPIC_TAGS = 5;

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
}

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<false | "next" | "skip" | "prev">(false);
  const [profile, setProfile] = useState<Profile>({});
  const [celebrated, setCelebrated] = useState(false);

  // Step-specific state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
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

  const [skipTopics, setSkipTopics] = useState(false);

  // Load profile and tags on mount
  useEffect(() => {
    loadProfile();
    // Pre-fetch tags to check count — if < 50 tags exist, skip topic step
    fetch("/api/tags?limit=100")
      .then((r) => r.json())
      .then((d) => {
        const tags = d.tags || [];
        setAvailableTags(tags);
        setTagsLoaded(true);
        if (tags.length < 50) setSkipTopics(true);
      })
      .catch(() => {});
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
      router.push("/dashboard");
      return;
    }

    if (data) {
      setProfile(data);
      let currentStep = data.onboarding_step || 1;
      // Skip email verify step if already verified
      if (currentStep === 5 && !!user.email_confirmed_at) {
        currentStep = 6; // Jump to Topics
      }
      setStep(currentStep);
      setAvatarPreview(data.avatar_url || null);
      setBirthDate(data.birth_date || "");
      setGender(data.gender || "");
      setBio(data.bio || "");
    }
    setLoading(false);
  };

  // Resolve next step (skip email verify if already verified, skip topics if < 50 tags)
  const resolveStep = useCallback((s: number) => {
    if (s === 5 && emailVerified) s = 6;
    if (s === 6 && skipTopics) s = 7;
    return s;
  }, [emailVerified, skipTopics]);

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
        feedimAlert("error", data.error || "Bir hata oluştu, lütfen daha sonra tekrar deneyin");
        return;
      }
      setStep(resolveStep(data.next));
    } catch {
      await waitMin();
      feedimAlert("error", "Bağlantı hatası, lütfen daha sonra tekrar deneyin");
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
        feedimAlert("error", data.error || "Bu adım atlanamaz");
        return;
      }
      setStep(resolveStep(data.next));
    } catch {
      await waitMin();
      feedimAlert("error", "Bağlantı hatası, lütfen daha sonra tekrar deneyin");
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
      router.push("/dashboard");
    } catch {
      await waitMin();
      feedimAlert("error", "Bağlantı hatası, lütfen daha sonra tekrar deneyin");
    } finally {
      setProcessing(false);
    }
  }, [router]);

  // Handle next
  const handleNext = useCallback(async () => {
    if (processing) return;

    switch (step) {
      case 1:
        await saveStep();
        break;
      case 2:
        if (!birthDate) { feedimAlert("error", "Doğum tarihi gerekli"); return; }
        await saveStep({ birth_date: birthDate });
        break;
      case 3:
        if (!gender) { feedimAlert("error", "Cinsiyet seçimi gerekli"); return; }
        await saveStep({ gender });
        break;
      case 4:
        await saveStep({ bio });
        break;
      case 5:
        await saveStep();
        break;
      case 6:
        // Topics — must select at least 5
        if (selectedTagIds.size < MIN_TOPIC_TAGS) {
          feedimAlert("error", `En az ${MIN_TOPIC_TAGS} konu seçmelisiniz`);
          return;
        }
        // Follow selected tags in background (fire and forget)
        for (const tagId of selectedTagIds) {
          fetch(`/api/tags/${tagId}/follow`, { method: "POST" }).catch(() => {});
        }
        await saveStep();
        break;
      case 7:
        await saveStep();
        break;
      case 8:
        await completeOnboarding();
        break;
    }
  }, [step, processing, birthDate, gender, bio, selectedTagIds, saveStep, completeOnboarding]);

  // Handle prev
  const handlePrev = useCallback(async () => {
    if (step <= 1 || processing) return;
    setProcessing("prev");
    await new Promise(r => setTimeout(r, 1000));
    let prev = step - 1;
    if (prev === 6 && skipTopics) prev = 5; // Skip topics going back
    if (prev === 5 && emailVerified) prev = 4; // Skip email verify going back
    setStep(prev);
    setProcessing(false);
  }, [step, processing, emailVerified, skipTopics]);

  // Avatar upload — open crop modal
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropFile(file);
    setCropOpen(true);
    e.target.value = "";
  };

  // After crop, upload the cropped file
  const handleCroppedUpload = async (croppedFile: File) => {
    const formData = new FormData();
    formData.append("file", croppedFile);
    try {
      const res = await fetch("/api/profile/avatar", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok && (data.avatar_url || data.url)) {
        setAvatarPreview(data.avatar_url || data.url);
        if (step === 1) await saveStep();
      }
    } catch {
      feedimAlert("error", "Yükleme başarısız, lütfen daha sonra tekrar deneyin");
    }
  };

  // Auto-skip step 6 if skipTopics becomes true while on that step
  useEffect(() => {
    if (step === 6 && skipTopics) {
      setStep(7);
    }
  }, [step, skipTopics]);

  // Load suggestions when reaching step 7
  useEffect(() => {
    if (step === 7 && !suggestionsLoaded) {
      fetch("/api/onboarding")
        .then((r) => r.json())
        .then((d) => setSuggestions(d.suggestions || []))
        .catch(() => {})
        .finally(() => setSuggestionsLoaded(true));
    }
  }, [step, suggestionsLoaded]);

  // Step 8 reached
  useEffect(() => {
    if (step === 8) setCelebrated(true);
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
  const canSkip = [1, 4, 5, 7].includes(step) && step < 8;

  return (
    <div className="min-h-screen text-text-primary">
      <div className="max-w-[500px] w-full mx-auto px-4 pt-[27px] pb-[50px]">
        {/* Progress bar */}
        <div className="flex items-center gap-3 mb-5">
          <FeedimIcon className="h-[36px] w-[36px] shrink-0 text-accent-main" />
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
          {step === 1 && <StepProfilePhoto avatarPreview={avatarPreview} fileInputRef={fileInputRef} onUpload={handleAvatarSelect} profile={profile} />}
          {step === 2 && <StepBirthDate value={birthDate} onChange={setBirthDate} />}
          {step === 3 && <StepGender value={gender} onChange={setGender} />}
          {step === 4 && <StepBiography value={bio} onChange={setBio} />}
          {step === 5 && <StepEmailVerify />}
          {step === 6 && <StepTopicTags tags={availableTags} selectedIds={selectedTagIds} onToggle={(id) => {
            const newSet = new Set(selectedTagIds);
            if (newSet.has(id)) { newSet.delete(id); } else { newSet.add(id); }
            setSelectedTagIds(newSet);
          }} loaded={tagsLoaded} minRequired={MIN_TOPIC_TAGS} />}
          {step === 7 && <StepSuggestions suggestions={suggestions} followedIds={followedIds} onToggle={toggleFollow} loaded={suggestionsLoaded} />}
          {step === 8 && <StepWelcome profile={profile} avatarPreview={avatarPreview} />}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-[10px] mt-[15px]">
          {step > 1 && (
            <button onClick={handlePrev} disabled={!!processing} className="t-btn cancel flex-1 relative" style={{ background: "var(--bg-elevated)" }}>
              {processing === "prev" ? <Spinner size={18} /> : "Geri"}
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!!processing || (step === 6 && selectedTagIds.size < MIN_TOPIC_TAGS)}
            className="t-btn accept flex-1 relative"
          >
            {processing === "next" ? <Spinner size={18} /> : step === 8 ? "Bitir" : "İleri"}
          </button>
        </div>

        {/* Skip */}
        {canSkip && (
          <div className="mt-[11px]">
            <button
              onClick={skipStep}
              disabled={!!processing}
              className="t-btn cancel relative w-full min-h-[38px]"
            >
              {processing === "skip" ? <Spinner size={16} /> : "Bu adımı atla"}
            </button>
          </div>
        )}
      </div>

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

function StepProfilePhoto({ avatarPreview, fileInputRef, onUpload, profile }: {
  avatarPreview: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  profile: Profile;
}) {
  const initials = (profile.full_name?.[0] || profile.name?.[0] || "U").toUpperCase();
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-bold mb-2">Profil fotoğrafı ekle</h2>
        <p className="text-sm text-text-muted">Başkalarının sizi tanıması için bir profil resmi ekleyin</p>
      </div>
      <div className="flex justify-center">
        <div className="relative">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-[150px] h-[150px] rounded-full overflow-hidden bg-bg-secondary border-2 border-border-primary flex items-center justify-center cursor-pointer hover:opacity-80 transition"
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
            ) : (
              <img className="default-avatar-auto w-full h-full rounded-full object-cover" alt="" />
            )}
          </button>
          <div className="absolute bottom-1 right-1 w-10 h-10 rounded-full bg-accent-main text-white flex items-center justify-center shadow-lg pointer-events-none">
            <Camera className="h-5 w-5" />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onUpload}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
}

function StepBirthDate({ value, onChange }: { value: string; onChange: (v: string) => void }) {
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

  const months = [
    "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
  ];

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-bold mb-2">Doğum tarihiniz nedir?</h2>
        <p className="text-sm text-text-muted">Deneyiminizi kişiselleştirmemize yardımcı olur</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <select value={selDay} onChange={(e) => updateDate(selYear, selMonth, e.target.value)} className="select-modern w-full">
          <option value="">Gün</option>
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
            <option key={d} value={String(d)}>{d}</option>
          ))}
        </select>
        <select value={selMonth} onChange={(e) => updateDate(selYear, e.target.value, selDay)} className="select-modern w-full">
          <option value="">Ay</option>
          {months.map((m, i) => (
            <option key={i + 1} value={String(i + 1)}>{m}</option>
          ))}
        </select>
        <select value={selYear} onChange={(e) => updateDate(e.target.value, selMonth, selDay)} className="select-modern w-full">
          <option value="">Yıl</option>
          {Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i).map((y) => (
            <option key={y} value={String(y)}>{y}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function StepGender({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-bold mb-2">Cinsiyetiniz nedir?</h2>
        <p className="text-sm text-text-muted">Deneyiminizi kişiselleştirmemize yardımcı olur</p>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="select-modern w-full"
      >
        <option value="">Cinsiyet seçin</option>
        <option value="male">Erkek</option>
        <option value="female">Kadın</option>
        <option value="other">Diğer</option>
      </select>
    </div>
  );
}

function StepBiography({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-bold mb-2">Kendinizi tanıtmak ister misiniz?</h2>
        <p className="text-sm text-text-muted">Kısa bir biyografi yazın, başkaları sizi daha iyi tanısın</p>
      </div>
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, 150))}
          placeholder="Kendiniz hakkında bir şeyler yazın..."
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
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-bold mb-2">E-posta doğrulaması</h2>
        <p className="text-sm text-text-muted">E-posta adresiniz Supabase tarafından otomatik doğrulanmıştır</p>
      </div>
      <div className="bg-bg-secondary rounded-2xl p-5 text-center">
        <div className="w-12 h-12 rounded-full bg-success/20 text-success flex items-center justify-center mx-auto mb-3">
          <Check className="h-6 w-6" />
        </div>
        <p className="text-sm font-medium">E-posta adresiniz doğrulandı</p>
        <p className="text-xs text-text-muted mt-1">Devam etmek için İleri butonuna basın</p>
      </div>
    </div>
  );
}

function StepTopicTags({ tags, selectedIds, onToggle, loaded, minRequired }: {
  tags: { id: number; name: string; slug: string; post_count: number }[];
  selectedIds: Set<number>;
  onToggle: (id: number) => void;
  loaded: boolean;
  minRequired: number;
}) {
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-bold mb-2">İlgi alanlarını seç</h2>
        <p className="text-sm text-text-muted">
          Sana özel içerikler önerebilmemiz için en az {minRequired} konu seç
        </p>
      </div>
      {!loaded ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <Spinner size={22} />
        </div>
      ) : tags.length === 0 ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <p className="text-sm text-text-muted">Henüz konu etiketi yok</p>
        </div>
      ) : (
        <>
          <div className="mb-3">
            <span className="text-xs text-text-muted">
              {selectedIds.size}/{minRequired} seçildi
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const selected = selectedIds.has(tag.id);
              return (
                <button
                  key={tag.id}
                  onClick={() => onToggle(tag.id)}
                  className={`px-4 py-2.5 rounded-full text-[0.84rem] font-bold border transition-all ${
                    selected
                      ? "bg-accent-main text-white border-accent-main"
                      : "bg-bg-secondary text-text-primary border-border-primary hover:border-accent-main/50"
                  }`}
                >
                  {tag.name}
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
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-bold mb-2">Tanıdıklarınızı bulun</h2>
        <p className="text-sm text-text-muted">Akışınızda gönderileri görmek için kişileri takip edin</p>
      </div>
      {!loaded ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <Spinner size={22} />
        </div>
      ) : suggestions.length === 0 ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <p className="text-sm text-text-muted">Henüz önerilecek kullanıcı yok</p>
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
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold truncate">@{user.username}</span>
                    {user.is_verified && <VerifiedBadge variant={getBadgeVariant(user.premium_plan)} />}
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
  const name = (profile.name || profile.username || "Kullanıcı").trim();
  const initials = name[0]?.toUpperCase() || "U";

  return (
    <div className="text-center py-6">
      <div className="flex justify-center mb-5">
        {avatarPreview ? (
          <img src={avatarPreview} alt="" className="w-[120px] h-[120px] rounded-full object-cover" />
        ) : (
          <img className="default-avatar-auto w-[120px] h-[120px] rounded-full object-cover" alt="" />
        )}
      </div>
      <h2 className="text-2xl font-bold mb-2">Hoş geldin, {name}!</h2>
      <p className="text-sm text-text-muted">Her şey hazır! İnsanlarla bağlantı kurmaya ve anlarını paylaşmayı başlayabilirsin.</p>
    </div>
  );
}

