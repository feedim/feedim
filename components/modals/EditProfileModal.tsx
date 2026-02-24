"use client";

import { useState, useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";
import EditableAvatar from "@/components/EditableAvatar";
import { createClient } from "@/lib/supabase/client";
import { feedimAlert } from "@/components/FeedimAlert";
import Modal from "./Modal";
import AvatarCropModal from "./AvatarCropModal";
import ProfessionalAccountModal from "./ProfessionalAccountModal";
import VerifiedBadge, { getBadgeVariant } from "@/components/VerifiedBadge";
import { VALIDATION } from "@/lib/constants";
import { normalizeUsername, filterNameInput } from "@/lib/utils";
import { isProfessional, getCategoryLabel } from "@/lib/professional";
import { Briefcase, ChevronRight, Mail, Phone } from "lucide-react";



interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  openAvatarPicker?: boolean;
}

export default function EditProfileModal({ open, onClose, onSave, openAvatarPicker }: EditProfileModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const avatarLoaderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const avatarLoadStartRef = useRef<number>(0);
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [pendingAvatarPreview, setPendingAvatarPreview] = useState<string | null>(null);
  const [pendingAvatarRemove, setPendingAvatarRemove] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [originalUsername, setOriginalUsername] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [premiumPlan, setPremiumPlan] = useState<string | null>(null);
  const [role, setRole] = useState<string | undefined>(undefined);
  const [accountType, setAccountType] = useState("personal");
  const [professionalCategory, setProfessionalCategory] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [usernameLockedUntil, setUsernameLockedUntil] = useState<string | null>(null);
  const [proModalOpen, setProModalOpen] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarPickQueuedRef = useRef(false);
  const supabase = createClient();

  useEffect(() => {
    if (open) loadProfile();
  }, [open]);

  useEffect(() => {
    return () => {
      if (pendingAvatarPreview) URL.revokeObjectURL(pendingAvatarPreview);
    };
  }, [pendingAvatarPreview]);

  useEffect(() => {
    if (!open) {
      avatarPickQueuedRef.current = false;
      return;
    }
    if (openAvatarPicker) {
      avatarPickQueuedRef.current = true;
    }
  }, [open, openAvatarPicker]);

  useEffect(() => {
    if (!open) return;
    if (!avatarPickQueuedRef.current) return;
    if (loading || avatarUploading || avatarLoading) return;
    const t = setTimeout(() => {
      fileInputRef.current?.click();
      avatarPickQueuedRef.current = false;
    }, 0);
    return () => clearTimeout(t);
  }, [open, loading, avatarUploading, avatarLoading]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/profile");
      const data = await res.json();
      if (data.profile) {
        const p = data.profile;
        setName(p.name || "");
        setSurname(p.surname || "");
        setUsername(p.username || "");
        setOriginalUsername(p.username || "");
        setBio(p.bio || "");
        setWebsite(p.website || "");
        setBirthDate(p.birth_date || "");
        setGender(p.gender || "");
        setPhone(p.phone_number || "");
        setAvatarUrl(p.avatar_url);
        setIsVerified(p.is_verified || false);
        setPremiumPlan(p.premium_plan || null);
        setRole(p.role || undefined);
        setAccountType(p.account_type || "personal");
        setProfessionalCategory(p.professional_category || "");
        setContactEmail(p.contact_email || "");
        setContactPhone(p.contact_phone || "");
        setIsPrivate(p.account_private || false);

        // Check username change cooldown (7 days)
        if (p.username_changed_at) {
          const lastChange = new Date(p.username_changed_at).getTime();
          const sevenDays = 7 * 24 * 60 * 60 * 1000;
          const unlockTime = lastChange + sevenDays;
          if (Date.now() < unlockTime) {
            setUsernameLockedUntil(new Date(unlockTime).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }));
          } else {
            setUsernameLockedUntil(null);
          }
        } else {
          setUsernameLockedUntil(null);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!username || username === originalUsername) {
      setUsernameAvailable(null);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/users/check-username?username=${encodeURIComponent(username)}`);
      const data = await res.json();
      setUsernameAvailable(data.available);
    }, 500);
    return () => clearTimeout(timer);
  }, [username, originalUsername]);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      feedimAlert("error", "Dosya boyutu 10MB'dan küçük olmalı");
      return;
    }
    setCropFile(file);
    setCropOpen(true);
    e.target.value = "";
  };

  const handleCroppedUpload = async (croppedFile: File) => {
    if (pendingAvatarPreview) URL.revokeObjectURL(pendingAvatarPreview);
    setPendingAvatarFile(croppedFile);
    setPendingAvatarPreview(URL.createObjectURL(croppedFile));
    setPendingAvatarRemove(false);
  };

  const handleRemoveAvatar = async () => {
    if (pendingAvatarPreview) URL.revokeObjectURL(pendingAvatarPreview);
    setPendingAvatarFile(null);
    setPendingAvatarPreview(null);
    setPendingAvatarRemove(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let newAvatarUrl = avatarUrl;
      if (pendingAvatarRemove) {
        const res = await fetch("/api/profile/avatar", { method: "DELETE" });
        if (res.ok) newAvatarUrl = null;
      }
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
            newAvatarUrl = data.url;
          } else {
            feedimAlert("error", data.error || "Yükleme hatası");
          }
        } catch {
          feedimAlert("error", "Bir hata oluştu");
        } finally {
          const elapsed = Date.now() - avatarLoadStartRef.current;
          const remain = Math.max(0, 2000 - elapsed);
          if (avatarLoaderTimerRef.current) clearTimeout(avatarLoaderTimerRef.current);
          await new Promise(r => setTimeout(r, remain));
          setAvatarLoading(false);
          setAvatarUploading(false);
        }
      }

      const [res] = await Promise.all([
        fetch("/api/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name, surname, username, bio, website,
            birth_date: birthDate || null,
            gender: gender || null,
            phone_number: phone || null,
            ...(accountType === "business" && {
              contact_email: contactEmail.trim() || null,
              contact_phone: contactPhone.trim() || null,
            }),
          }),
        }),
        new Promise(r => setTimeout(r, 2000)),
      ]);
      const data = await res.json();
      if (res.ok) {
        setAvatarUrl(newAvatarUrl);
        setPendingAvatarFile(null);
        setPendingAvatarRemove(false);
        if (pendingAvatarPreview) URL.revokeObjectURL(pendingAvatarPreview);
        setPendingAvatarPreview(null);
        onSave({ ...data.profile, avatar_url: newAvatarUrl });
      } else {
        feedimAlert("error", data.error || "Güncelleme hatası");
      }
    } catch {
      feedimAlert("error", "Bir hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  const initials = ((name?.[0] || "") + (surname?.[0] || "")).toUpperCase() || "U";

  return (
    <>
    <Modal
      open={open}
      onClose={onClose}
      title="Profili Düzenle"
      size="md"
      infoText="Profil bilgilerini, fotoğrafını ve biyografini buradan düzenleyebilirsin."
      rightAction={
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="t-btn accept relative !h-9 !px-5 !text-[0.82rem] disabled:opacity-40"
          aria-label="Profili Kaydet"
        >
          {saving ? <span className="loader" style={{ width: 16, height: 16 }} /> : "Kaydet"}
        </button>
      }
    >
      <div className="px-4 py-4 space-y-5">
        {loading ? (
          <div className="flex justify-center py-8"><span className="loader" style={{ width: 22, height: 22 }} /></div>
        ) : (
          <>
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <EditableAvatar
                  src={pendingAvatarRemove ? null : (pendingAvatarPreview || avatarUrl)}
                  alt=""
                  sizeClass="w-20 h-20"
                  editable={!avatarUploading && !avatarLoading}
                  loading={avatarLoading}
                  onClick={() => { if (!avatarUploading && !avatarLoading) fileInputRef.current?.click(); }}
                  onLoad={() => setAvatarLoading(false)}
                  onError={() => setAvatarLoading(false)}
                />
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1">
                  <p className="text-[1.1rem] font-bold">{username || "kullanıcı"}</p>
                  {isVerified && <VerifiedBadge variant={getBadgeVariant(premiumPlan)} role={role} />}
                </div>
                {avatarUrl && (
                  <button onClick={handleRemoveAvatar} className="text-xs text-error font-semibold flex items-center gap-1 mt-1 hover:underline">
                    Avatarı kaldır
                  </button>
                )}
              </div>
            </div>

            {/* Name fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-muted mb-1">Ad</label>
                <input type="text" value={name} onChange={e => setName(filterNameInput(e.target.value))} maxLength={VALIDATION.name.max} className="input-modern w-full" placeholder="Ad" />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Soyad</label>
                <input type="text" value={surname} onChange={e => setSurname(filterNameInput(e.target.value))} maxLength={VALIDATION.name.max} className="input-modern w-full" placeholder="Soyad" />
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block text-xs text-text-muted mb-1">Kullanıcı Adı</label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(normalizeUsername(e.target.value))}
                  maxLength={VALIDATION.username.max}
                  className={`input-modern w-full ${usernameLockedUntil ? "opacity-60 cursor-not-allowed" : ""}`}
                  placeholder="kullanıcı_adı"
                  readOnly={!!usernameLockedUntil}
                />
                {!usernameLockedUntil && usernameAvailable !== null && username !== originalUsername && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    {usernameAvailable ? (
                      <svg className="h-4 w-4 text-text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                    ) : (
                      <svg className="h-4 w-4 text-error" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    )}
                  </span>
                )}
              </div>
              {usernameLockedUntil ? (
                <p className="text-xs text-text-muted mt-1">{usernameLockedUntil} tarihinde değiştirebileceksiniz</p>
              ) : (
                <p className="text-xs text-text-muted mt-1">{VALIDATION.username.min}-{VALIDATION.username.max} karakter, harf, rakam, nokta ve alt çizgi</p>
              )}
            </div>

            {/* Bio */}
            <div>
              <label className="block text-xs text-text-muted mb-1">Biyografi</label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                maxLength={VALIDATION.bio.max}
                rows={3}
                className="input-modern w-full resize-none !pt-3"
                placeholder="Kendinizi kısaca anlatın..."
              />
              <p className="text-xs text-text-muted mt-1 text-right">{bio.length}/{VALIDATION.bio.max}</p>
            </div>

            {/* Website */}
            <div>
              <label className="block text-xs text-text-muted mb-1">Website</label>
              <input
                type="url"
                value={website}
                onChange={e => setWebsite(e.target.value)}
                maxLength={VALIDATION.website.max}
                className="input-modern w-full"
                placeholder="https://..."
              />
            </div>

            {/* Birth date */}
            <div>
              <label className="block text-xs text-text-muted mb-1">Doğum Tarihi</label>
              <BirthDateSelect value={birthDate} onChange={setBirthDate} />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs text-text-muted mb-1">Cinsiyet</label>
              <select value={gender} onChange={e => setGender(e.target.value)} className="select-modern w-full">
                <option value="">Belirtmek istemiyorum</option>
                <option value="male">Erkek</option>
                <option value="female">Kadın</option>
                <option value="other">Diğer</option>
              </select>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs text-text-muted mb-1">Telefon</label>
              <input
                type="tel"
                value={phone}
                onChange={e => {
                  const val = e.target.value.replace(/[^0-9+\s()-]/g, "");
                  setPhone(val);
                }}
                maxLength={20}
                className="input-modern w-full"
                placeholder="+90 5XX XXX XX XX"
                inputMode="tel"
              />
            </div>

            {/* Professional Account Section */}
            <div className="border-t border-border-primary pt-4">
              {isProfessional(accountType) ? (
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-accent-main" />
                    Profesyonel Hesap
                  </h4>
                  {professionalCategory && (
                    <div>
                      <label className="block text-xs text-text-muted mb-1">Kategori</label>
                      <button
                        onClick={() => setProModalOpen(true)}
                        className="w-full text-left text-sm text-text-secondary py-2 px-3 bg-bg-tertiary rounded-lg hover:bg-bg-tertiary transition flex items-center justify-between"
                      >
                        <span>{getCategoryLabel(accountType, professionalCategory)}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-text-muted shrink-0" />
                      </button>
                    </div>
                  )}
                  {accountType === "business" && (
                    <>
                      <div>
                        <label className="flex items-center gap-1.5 text-xs text-text-muted mb-1">
                          <Mail className="h-3 w-3" /> İletişim E-postası
                        </label>
                        <input
                          type="email"
                          value={contactEmail}
                          onChange={e => setContactEmail(e.target.value)}
                          className="input-modern w-full"
                          placeholder="iletisim@ornek.com"
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-1.5 text-xs text-text-muted mb-1">
                          <Phone className="h-3 w-3" /> İletişim Telefonu
                        </label>
                        <input
                          type="tel"
                          value={contactPhone}
                          onChange={e => {
                            const val = e.target.value.replace(/[^0-9+\s()-]/g, "");
                            setContactPhone(val);
                          }}
                          maxLength={20}
                          className="input-modern w-full"
                          placeholder="+90 5XX XXX XX XX"
                          inputMode="tel"
                        />
                      </div>
                    </>
                  )}
                  <button
                    onClick={() => {
                      feedimAlert("warning", "Kişisel hesaba geçerseniz profesyonel hesap özellikleri (istatistikler, kategori, iletişim butonları) kaldırılacak.", {
                        showYesNo: true,
                        onYes: async () => {
                          try {
                            const [res] = await Promise.all([
                              fetch("/api/profile", {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ account_type: "personal" }),
                              }),
                              new Promise(r => setTimeout(r, 2000)),
                            ]);
                            if (res.ok) {
                              setAccountType("personal");
                              setProfessionalCategory("");
                              setContactEmail("");
                              setContactPhone("");
                              // silent
                            } else {
                              feedimAlert("error", "Hesap türü değiştirilemedi");
                            }
                          } catch {
                            feedimAlert("error", "Bir hata oluştu");
                          }
                        },
                      });
                    }}
                    className="w-full text-center text-sm text-error font-medium py-2 hover:opacity-70 transition"
                  >
                    Kişisel hesaba geç
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setProModalOpen(true)}
                  className="flex items-center justify-between w-full py-2 group"
                >
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-accent-main" />
                    <span className="text-sm font-medium text-accent-main">Profesyonel hesaba geç</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-accent-main" />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
    <AvatarCropModal
      open={cropOpen}
      onClose={() => setCropOpen(false)}
      file={cropFile}
      onCrop={handleCroppedUpload}
    />
    <ProfessionalAccountModal
      open={proModalOpen}
      onClose={() => setProModalOpen(false)}
      onComplete={(data) => {
        setAccountType(data.account_type);
        setProfessionalCategory(data.professional_category);
        setContactEmail(data.contact_email);
        setContactPhone(data.contact_phone);
        setIsPrivate(false);
      }}
      isPrivate={isPrivate}
      initialStep={isProfessional(accountType) ? 1 : undefined}
      onMakePublic={async () => {
        try {
          const res = await fetch("/api/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ account_private: false }),
          });
          if (res.ok) {
            setIsPrivate(false);
            return true;
          }
          return false;
        } catch {
          return false;
        }
      }}
    />
    </>
  );
}

function BirthDateSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const today = new Date();
  const minYear = today.getFullYear() - 120;
  const maxYear = today.getFullYear() - 13;

  const initParts = value ? value.split("-") : ["", "", ""];
  const [selYear, setSelYear] = useState(initParts[0] || "");
  const [selMonth, setSelMonth] = useState(initParts[1] ? String(Number(initParts[1])) : "");
  const [selDay, setSelDay] = useState(initParts[2] ? String(Number(initParts[2])) : "");

  // Sync from parent when value changes (e.g. on load)
  useEffect(() => {
    const parts = value ? value.split("-") : ["", "", ""];
    setSelYear(parts[0] || "");
    setSelMonth(parts[1] ? String(Number(parts[1])) : "");
    setSelDay(parts[2] ? String(Number(parts[2])) : "");
  }, [value]);

  const updateDate = (y: string, m: string, d: string) => {
    setSelYear(y);
    setSelMonth(m);
    setSelDay(d);
    if (y && m && d) {
      onChange(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
    } else {
      onChange("");
    }
  };

  const daysInMonth = selYear && selMonth ? new Date(Number(selYear), Number(selMonth), 0).getDate() : 31;

  const months = [
    "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
  ];

  return (
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
  );
}
