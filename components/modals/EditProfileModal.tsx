"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Trash2 } from "lucide-react";
import EditableAvatar from "@/components/EditableAvatar";
import { createClient } from "@/lib/supabase/client";
import { feedimAlert } from "@/components/FeedimAlert";
import Modal from "./Modal";
import AvatarCropModal from "./AvatarCropModal";
import ProfessionalAccountModal from "./ProfessionalAccountModal";
import LinksModal, { type ProfileLink } from "./LinksModal";
import VerifiedBadge, { getBadgeVariant } from "@/components/VerifiedBadge";
import { VALIDATION } from "@/lib/constants";
import { normalizeUsername, filterNameInput } from "@/lib/utils";
import { isProfessional, getCategoryLabel } from "@/lib/professional";
import { Briefcase, ChevronRight, Mail, Phone, Link as LinkIcon } from "lucide-react";



interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  onReopen?: () => void;
  onLinksChange?: (links: ProfileLink[]) => void;
  openAvatarPicker?: boolean;
}

export default function EditProfileModal({ open, onClose, onSave, onReopen, onLinksChange, openAvatarPicker }: EditProfileModalProps) {
  const t = useTranslations("modals");
  const tc = useTranslations("common");
  const locale = useLocale();
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
  const [links, setLinks] = useState<ProfileLink[]>([]);
  const [linksModalOpen, setLinksModalOpen] = useState(false);
  const [proModalOpen, setProModalOpen] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarPickQueuedRef = useRef(false);
  const skipLoadRef = useRef(false);
  const supabase = createClient();

  useEffect(() => {
    if (open) {
      if (skipLoadRef.current) {
        skipLoadRef.current = false;
        return;
      }
      loadProfile();
    }
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

        // Load links — migrate old website if links is empty
        const profileLinks: ProfileLink[] = Array.isArray(p.links) ? p.links : [];
        if (profileLinks.length === 0 && p.website) {
          setLinks([{ title: "", url: p.website }]);
        } else {
          setLinks(profileLinks);
        }

        // Check username change cooldown (7 days)
        if (p.username_changed_at) {
          const lastChange = new Date(p.username_changed_at).getTime();
          const sevenDays = 7 * 24 * 60 * 60 * 1000;
          const unlockTime = lastChange + sevenDays;
          if (Date.now() < unlockTime) {
            setUsernameLockedUntil(new Date(unlockTime).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" }));
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
      feedimAlert("error", t("fileSizeLimit"));
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
            feedimAlert("error", data.error || t("uploadError"));
          }
        } catch {
          feedimAlert("error", t("errorOccurred"));
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
            name, surname, username, bio,
            links,
            website: links[0]?.url || "",
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
        feedimAlert("error", data.error || t("updateError"));
      }
    } catch {
      feedimAlert("error", t("errorOccurred"));
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
      title={t("editProfile")}
      size="md"
      infoText={t("editProfileInfoText")}
      rightAction={
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="t-btn accept relative !h-9 !px-5 !text-[0.82rem] disabled:opacity-40"
          aria-label={t("editProfile")}
        >
          {saving ? <span className="loader" style={{ width: 16, height: 16 }} /> : tc("save")}
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
                  <p className="text-[1.1rem] font-bold">{username || tc("user")}</p>
                  {isVerified && <VerifiedBadge variant={getBadgeVariant(premiumPlan)} role={role} />}
                </div>
                {avatarUrl && (
                  <button onClick={handleRemoveAvatar} className="text-xs text-error font-semibold flex items-center gap-1 mt-1 hover:underline">
                    {t("removeAvatar")}
                  </button>
                )}
              </div>
            </div>

            {/* Name fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-muted mb-1">{t("firstName")}</label>
                <input type="text" value={name} onChange={e => setName(filterNameInput(e.target.value))} maxLength={VALIDATION.name.max} className="input-modern w-full" placeholder={t("firstName")} />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">{t("lastName")}</label>
                <input type="text" value={surname} onChange={e => setSurname(filterNameInput(e.target.value))} maxLength={VALIDATION.name.max} className="input-modern w-full" placeholder={t("lastName")} />
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block text-xs text-text-muted mb-1">{t("usernameLabel")}</label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(normalizeUsername(e.target.value))}
                  maxLength={VALIDATION.username.max}
                  className={`input-modern w-full ${usernameLockedUntil ? "opacity-60 cursor-not-allowed" : ""}`}
                  placeholder={t("usernamePlaceholder")}
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
                <p className="text-xs text-text-muted mt-1">{t("usernameLockedUntil", { date: usernameLockedUntil })}</p>
              ) : (
                <p className="text-xs text-text-muted mt-1">{t("usernameHint", { min: VALIDATION.username.min, max: VALIDATION.username.max })}</p>
              )}
            </div>

            {/* Bio */}
            <div>
              <label className="block text-xs text-text-muted mb-1">{t("bio")}</label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                maxLength={VALIDATION.bio.max}
                rows={3}
                className="input-modern w-full resize-none !pt-3"
                placeholder={t("bioPlaceholder")}
              />
              <p className="text-xs text-text-muted mt-1 text-right">{bio.length}/{VALIDATION.bio.max}</p>
            </div>

            {/* Links */}
            <div>
              <label className="block text-xs text-text-muted mb-1">{t("linksLabel")}</label>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setTimeout(() => setLinksModalOpen(true), 280);
                }}
                className="w-full h-[50px] flex items-center justify-between px-[18px] rounded-[14px] border-[1.5px] border-border-primary hover:border-text-muted transition text-[0.93rem]"
              >
                <span className="flex items-center gap-2 text-text-secondary">
                  <LinkIcon className="h-4 w-4" />
                  {links.filter(l => l.url.trim()).length > 0
                    ? t("linksCount", { count: links.filter(l => l.url.trim()).length })
                    : t("addLink")
                  }
                </span>
                <ChevronRight className="h-4 w-4 text-text-muted shrink-0" />
              </button>
            </div>

            {/* Birth date */}
            <div>
              <label className="block text-xs text-text-muted mb-1">{t("birthDate")}</label>
              <BirthDateSelect value={birthDate} onChange={setBirthDate} />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs text-text-muted mb-1">{t("genderLabel")}</label>
              <select value={gender} onChange={e => setGender(e.target.value)} className="select-modern w-full">
                <option value="">{t("genderNone")}</option>
                <option value="male">{t("genderMale")}</option>
                <option value="female">{t("genderFemale")}</option>
                <option value="other">{t("genderOther")}</option>
              </select>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs text-text-muted mb-1">{t("phoneLabel")}</label>
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
                    {t("professionalAccountLabel")}
                  </h4>
                  {professionalCategory && (
                    <div>
                      <label className="block text-xs text-text-muted mb-1">{t("category")}</label>
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
                          <Mail className="h-3 w-3" /> {t("contactEmail")}
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
                          <Phone className="h-3 w-3" /> {t("contactPhone")}
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
                      feedimAlert("warning", t("switchToPersonalWarning"), {
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
                              feedimAlert("error", t("accountTypeChangeFailed"));
                            }
                          } catch {
                            feedimAlert("error", t("errorOccurred"));
                          }
                        },
                      });
                    }}
                    className="w-full text-center text-sm text-error font-medium py-2 hover:opacity-70 transition"
                  >
                    {t("switchToPersonal")}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setProModalOpen(true)}
                  className="flex items-center justify-between w-full py-2 group"
                >
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-accent-main" />
                    <span className="text-sm font-medium text-accent-main">{t("switchToProfessional")}</span>
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
    <LinksModal
      open={linksModalOpen}
      onClose={() => setLinksModalOpen(false)}
      onBack={() => {
        setLinksModalOpen(false);
        if (onReopen) {
          skipLoadRef.current = true;
          setTimeout(() => onReopen(), 280);
        }
      }}
      links={links}
      onSave={(saved) => {
        setLinks(saved);
        onLinksChange?.(saved);
      }}
      premiumPlan={premiumPlan}
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
  const t = useTranslations("modals");
  const locale = useLocale();
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

  const months = Array.from({ length: 12 }, (_, i) =>
    new Date(2000, i, 1).toLocaleDateString(locale, { month: "long" })
  );

  return (
    <div className="grid grid-cols-3 gap-2">
      <select value={selDay} onChange={(e) => updateDate(selYear, selMonth, e.target.value)} className="select-modern w-full">
        <option value="">{t("dayLabel")}</option>
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
          <option key={d} value={String(d)}>{d}</option>
        ))}
      </select>
      <select value={selMonth} onChange={(e) => updateDate(selYear, e.target.value, selDay)} className="select-modern w-full">
        <option value="">{t("monthLabel")}</option>
        {months.map((m, i) => (
          <option key={i + 1} value={String(i + 1)}>{m}</option>
        ))}
      </select>
      <select value={selYear} onChange={(e) => updateDate(e.target.value, selMonth, selDay)} className="select-modern w-full">
        <option value="">{t("yearLabel")}</option>
        {Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i).map((y) => (
          <option key={y} value={String(y)}>{y}</option>
        ))}
      </select>
    </div>
  );
}
