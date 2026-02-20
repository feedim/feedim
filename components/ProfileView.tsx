"use client";

import { useState, useEffect, useRef, lazy, Suspense, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Settings, Calendar, Link as LinkIcon, MoreHorizontal, PenLine, Heart, MessageCircle, Lock, BarChart3, Briefcase, Mail, Phone, ShieldCheck, Clock } from "lucide-react";
import { formatCount } from "@/lib/utils";
import PostListSection from "@/components/PostListSection";
import VerifiedBadge, { getBadgeVariant } from "@/components/VerifiedBadge";
import { useAuthModal } from "@/components/AuthModal";
import { useUser } from "@/components/UserContext";
import { feedimAlert } from "@/components/FeedimAlert";
import FollowButton from "@/components/FollowButton";
import { getCategoryLabel, isProfessional } from "@/lib/professional";
import SuggestionCarousel from "@/components/SuggestionCarousel";
import ShareIcon from "@/components/ShareIcon";

const EditProfileModal = lazy(() => import("@/components/modals/EditProfileModal"));
const FollowersModal = lazy(() => import("@/components/modals/FollowersModal"));
const FollowingModal = lazy(() => import("@/components/modals/FollowingModal"));
const AvatarViewModal = lazy(() => import("@/components/modals/AvatarViewModal"));
const AvatarCropModal = lazy(() => import("@/components/modals/AvatarCropModal"));
const ProfileMoreModal = lazy(() => import("@/components/modals/ProfileMoreModal"));
const ShareModal = lazy(() => import("@/components/modals/ShareModal"));
const ProfileVisitorsModal = lazy(() => import("@/components/modals/ProfileVisitorsModal"));
const FollowRequestsModal = lazy(() => import("@/components/modals/FollowRequestsModal"));
const MutualFollowersModal = lazy(() => import("@/components/modals/MutualFollowersModal"));

interface Profile {
  user_id: string;
  name?: string;
  surname?: string;
  full_name?: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  website?: string;
  is_verified?: boolean;
  premium_plan?: string | null;
  is_premium?: boolean;
  post_count?: number;
  follower_count?: number;
  following_count?: number;
  created_at?: string;
  coin_balance?: number;
  is_following?: boolean;
  is_own?: boolean;
  is_blocked?: boolean;
  is_blocked_by?: boolean;
  has_follow_request?: boolean;
  follow_request_count?: number;
  account_private?: boolean;
  account_type?: string;
  professional_category?: string;
  contact_email?: string;
  contact_phone?: string;
  mutual_followers?: { username: string; avatar_url: string | null; full_name: string | null }[];
}

export default function ProfileView({ profile: initialProfile }: { profile: Profile }) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [following, setFollowing] = useState(initialProfile.is_following || false);
  const [requested, setRequested] = useState(initialProfile.has_follow_request || false);
  const [followerCount, setFollowerCount] = useState(initialProfile.follower_count || 0);
  const [isBlocked, setIsBlocked] = useState(initialProfile.is_blocked || false);
  const [isBlockedBy, setIsBlockedBy] = useState(initialProfile.is_blocked_by || false);
  const [activeTab, setActiveTab] = useState<"posts" | "likes" | "comments">("posts");
  const [posts, setPosts] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [likedPosts, setLikedPosts] = useState<any[]>([]);
  const [likesLoading, setLikesLoading] = useState(false);
  const [likesPage, setLikesPage] = useState(1);
  const [likesHasMore, setLikesHasMore] = useState(false);
  const [likesLoaded, setLikesLoaded] = useState(false);
  const [commentedPosts, setCommentedPosts] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsPage, setCommentsPage] = useState(1);
  const [commentsHasMore, setCommentsHasMore] = useState(false);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Modals
  const [editOpen, setEditOpen] = useState(false);
  const [followersOpen, setFollowersOpen] = useState(false);
  const [followingOpen, setFollowingOpen] = useState(false);
  const [avatarViewOpen, setAvatarViewOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [visitorsOpen, setVisitorsOpen] = useState(false);
  const [followRequestsOpen, setFollowRequestsOpen] = useState(false);
  const [mutualFollowersOpen, setMutualFollowersOpen] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [totalViews, setTotalViews] = useState<number | null>(null);
  const [scores, setScores] = useState<{ profile: number; spam: number; trust: number } | null>(null);

  const { requireAuth } = useAuthModal();
  const { user: currentUser } = useUser();
  const isAnyBlocked = isBlocked || isBlockedBy;
  const statsDisabled = isAnyBlocked || (profile.account_private && !profile.is_own && !following);
  const displayName = isAnyBlocked ? "Kullanıcı" : (profile.full_name || [profile.name, profile.surname].filter(Boolean).join(" ") || profile.username);
  const initials = ((profile.name?.[0] || "") + (profile.surname?.[0] || "")).toUpperCase() || profile.username[0]?.toUpperCase() || "U";

  // Track profile visit
  useEffect(() => {
    if (!profile.is_own && !isAnyBlocked) {
      fetch(`/api/users/${profile.username}/visit`, { method: "POST" }).catch(() => {});
    }
  }, [profile.username, profile.is_own, isAnyBlocked]);

  useEffect(() => {
    if (!isAnyBlocked) {
      loadPosts(1);
    }
    if (profile.is_own) {
      fetch("/api/analytics?period=30d")
        .then(r => r.json())
        .then(d => setTotalViews(d.overview?.totalViews || 0))
        .catch(() => {});
      // Load profile scores
      fetch("/api/profile")
        .then(r => r.json())
        .then(d => {
          if (d.profile?.profile_score !== undefined) {
            setScores({ profile: d.profile.profile_score || 0, spam: d.profile.spam_score || 0, trust: d.profile.trust_level || 1 });
          }
        })
        .catch(() => {});
    }
  }, []);

  const loadPosts = useCallback(async (pageNum: number) => {
    setPostsLoading(true);
    try {
      const res = await fetch(`/api/users/${profile.username}/posts?page=${pageNum}`);
      const data = await res.json();
      if (pageNum === 1) {
        setPosts(data.posts || []);
      } else {
        setPosts(prev => [...prev, ...(data.posts || [])]);
      }
      setHasMore(data.hasMore || false);
    } catch {
      // Silent
    } finally {
      setPostsLoading(false);
    }
  }, [profile.username]);

  const loadLikes = useCallback(async (pageNum: number) => {
    setLikesLoading(true);
    try {
      const res = await fetch(`/api/users/${profile.username}/likes?page=${pageNum}`);
      const data = await res.json();
      if (pageNum === 1) {
        setLikedPosts(data.posts || []);
      } else {
        setLikedPosts(prev => [...prev, ...(data.posts || [])]);
      }
      setLikesHasMore(data.hasMore || false);
      setLikesLoaded(true);
    } catch {
      // Silent
    } finally {
      setLikesLoading(false);
    }
  }, [profile.username]);

  const loadComments = useCallback(async (pageNum: number) => {
    setCommentsLoading(true);
    try {
      const res = await fetch(`/api/users/${profile.username}/comments?page=${pageNum}`);
      const data = await res.json();
      if (pageNum === 1) {
        setCommentedPosts(data.posts || []);
      } else {
        setCommentedPosts(prev => [...prev, ...(data.posts || [])]);
      }
      setCommentsHasMore(data.hasMore || false);
      setCommentsLoaded(true);
    } catch {
      // Silent
    } finally {
      setCommentsLoading(false);
    }
  }, [profile.username]);

  // Load likes/comments when tab switches for the first time
  useEffect(() => {
    if (activeTab === "likes" && !likesLoaded) {
      loadLikes(1);
    }
    if (activeTab === "comments" && !commentsLoaded) {
      loadComments(1);
    }
  }, [activeTab]);

  const doUnfollow = async () => {
    if (requested) {
      setRequested(false);
      const res = await fetch(`/api/users/${profile.username}/follow`, { method: "POST" });
      if (!res.ok) setRequested(true);
      return;
    }
    setFollowing(false);
    setFollowerCount(c => Math.max(0, c - 1));
    const res = await fetch(`/api/users/${profile.username}/follow`, { method: "POST" });
    if (!res.ok) {
      setFollowing(true);
      setFollowerCount(c => c + 1);
    }
  };

  const handleFollow = useCallback(async () => {
    const user = await requireAuth();
    if (!user) return;

    if (following || requested) {
      feedimAlert("question", "Takibi bırakmak istiyor musunuz?", { showYesNo: true, onYes: doUnfollow });
      return;
    }

    // Follow or send request — optimistic update
    if (profile.account_private) {
      setRequested(true);
    } else {
      setFollowing(true);
      setFollowerCount(c => c + 1);
    }
    const res = await fetch(`/api/users/${profile.username}/follow`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      if (data.requested && !profile.account_private) {
        setFollowing(false);
        setFollowerCount(c => Math.max(0, c - 1));
        setRequested(true);
      }
    } else {
      if (profile.account_private) {
        setRequested(false);
      } else {
        setFollowing(false);
        setFollowerCount(c => Math.max(0, c - 1));
      }
      if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        feedimAlert("error", data.error || "Günlük takip limitine ulaştın.");
      }
    }
  }, [profile.username, profile.account_private, following, requested, requireAuth]);

  const handleBlock = useCallback(async () => {
    if (!isBlocked) {
      // Confirm before blocking
      feedimAlert("warning", `@${profile.username} adlı kullanıcıyı engellemek istediğinize emin misiniz? Engellediğinizde aranızdaki takip ilişkisi kaldırılır ve birbirinizin içeriklerini göremezsiniz.`, {
        showYesNo: true,
        onYes: async () => {
          const res = await fetch(`/api/users/${profile.username}/block`, { method: "POST" });
          if (res.ok) {
            const data = await res.json();
            setIsBlocked(data.blocked);
            setFollowing(false);
            setRequested(false);
            setFollowerCount(0);
            setPosts([]);
            setLikedPosts([]);
          }
        },
      });
    } else {
      // Confirm before unblocking
      feedimAlert("question", `@${profile.username} adlı kullanıcının engelini kaldırmak istediğinize emin misiniz?`, {
        showYesNo: true,
        onYes: async () => {
          const res = await fetch(`/api/users/${profile.username}/block`, { method: "POST" });
          if (res.ok) {
            const data = await res.json();
            setIsBlocked(data.blocked);
          }
        },
      });
    }
  }, [profile.username, isBlocked]);

  const handleAvatarSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropFile(file);
    setCropOpen(true);
    e.target.value = "";
  }, []);

  const handleCroppedUpload = useCallback(async (croppedFile: File) => {
    const formData = new FormData();
    formData.append("file", croppedFile);
    try {
      const res = await fetch("/api/profile/avatar", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        setProfile(prev => ({ ...prev, avatar_url: data.url || data.avatar_url }));
      }
    } catch {
      // Silent
    }
  }, []);

  const handleAvatarClick = useCallback(() => {
    if (profile.is_own) {
      // Own profile: open file picker to change avatar
      avatarInputRef.current?.click();
    } else {
      // Other profile: view avatar (works with both custom and default avatars)
      setAvatarViewOpen(true);
    }
  }, [profile.is_own]);

  return (
    <div>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-bg-primary sticky-ambient">
        <nav className="px-4 flex items-center justify-between h-[53px]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.back()}
              className="i-btn !w-8 !h-8 text-text-muted hover:text-text-primary"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <span className="text-[1.1rem] font-semibold">{isBlockedBy ? "Kullanıcı" : `@${profile.username}`}</span>
          </div>
          <div className="flex items-center gap-1">
            {profile.is_own && (
              <Link href="/dashboard/settings" className="i-btn !w-9 !h-9 text-text-muted hover:text-text-primary flex items-center justify-center">
                <Settings className="h-5 w-5" />
              </Link>
            )}
            <button
              onClick={() => setMoreOpen(true)}
              className="i-btn !w-9 !h-9 text-text-muted hover:text-text-primary"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </div>
        </nav>
      </header>

      <main className="px-4 py-6">
        {/* Profile header */}
        <div className="flex items-start gap-4 mb-4">
          {/* Avatar */}
          <div className="relative shrink-0">
            <button onClick={isAnyBlocked ? undefined : handleAvatarClick} className="block">
              {isAnyBlocked ? (
                <img className="default-avatar-auto w-20 h-20 rounded-full object-cover" alt="" loading="lazy" />
              ) : profile.avatar_url ? (
                <img src={profile.avatar_url} alt={displayName} className="w-20 h-20 rounded-full object-cover cursor-pointer" loading="lazy" />
              ) : (
                <img className="default-avatar-auto w-20 h-20 rounded-full object-cover cursor-pointer" alt="" loading="lazy" />
              )}
            </button>
            {profile.is_own && (
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarSelect}
                className="hidden"
              />
            )}
          </div>

          {/* Stats */}
          <div className="flex-1 flex items-center justify-around pt-2">
            <div className="text-center">
              <p className="text-[1.05rem] font-bold">{isAnyBlocked ? "0" : formatCount(profile.post_count || 0)}</p>
              <p className="text-[0.72rem] text-text-muted">Gönderi</p>
            </div>
            <button onClick={statsDisabled ? undefined : () => setFollowersOpen(true)} className={`text-center ${statsDisabled ? "cursor-default" : ""}`}>
              <p className="text-[1.05rem] font-bold">{isAnyBlocked ? "0" : formatCount(followerCount)}</p>
              <p className="text-[0.72rem] text-text-muted">Takipçi</p>
            </button>
            <button onClick={statsDisabled ? undefined : () => setFollowingOpen(true)} className={`text-center ${statsDisabled ? "cursor-default" : ""}`}>
              <p className="text-[1.05rem] font-bold">{isAnyBlocked ? "0" : formatCount(profile.following_count || 0)}</p>
              <p className="text-[0.72rem] text-text-muted">Takip</p>
            </button>
          </div>
        </div>

        {/* Name & Bio */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5">
            <h1 className="text-[1.1rem] font-bold truncate">{displayName}</h1>
            {!isAnyBlocked && profile.is_verified && <VerifiedBadge size="md" variant={getBadgeVariant(profile.premium_plan)} />}
            {!isAnyBlocked && profile.is_premium && profile.premium_plan && profile.premium_plan !== "basic" && (
              <span className="text-[10px] font-bold bg-accent-main/15 text-accent-main px-1.5 py-0.5 rounded-full">
                {profile.premium_plan === "max" ? "MAX" : "PRO"}
              </span>
            )}
          </div>
          {!isAnyBlocked && (
            <div className="mt-1.5 space-y-1">
              {profile.bio && <p className="text-[0.84rem] text-text-secondary leading-snug">{profile.bio}</p>}
              {profile.website && (
                <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[0.8rem] text-accent-main hover:underline">
                  <LinkIcon className="h-3.5 w-3.5" /> {profile.website.replace(/https?:\/\//, "")}
                </a>
              )}
              {profile.created_at && (
                <span className="flex items-center gap-1 text-[0.72rem] text-text-muted">
                  <Calendar className="h-3 w-3" /> {new Date(profile.created_at).toLocaleDateString("tr-TR", { month: "long", year: "numeric" })} tarihinde katıldı
                </span>
              )}
              {isProfessional(profile.account_type) && profile.professional_category && (
                <span className="inline-flex items-center gap-1 text-[0.75rem] text-text-muted bg-bg-secondary px-2 py-0.5 rounded-full w-fit">
                  <Briefcase className="h-3 w-3" />
                  {getCategoryLabel(profile.account_type!, profile.professional_category)}
                </span>
              )}
              {profile.account_type === "business" && (profile.contact_email || profile.contact_phone) && (
                <div className="flex items-center gap-2 mt-1">
                  {profile.contact_email && (
                    <a
                      href={`mailto:${profile.contact_email}`}
                      className="inline-flex items-center gap-1.5 text-[0.78rem] font-medium text-accent-main bg-accent-main/10 px-3 py-1.5 rounded-full hover:bg-accent-main/20 transition"
                    >
                      <Mail className="h-3.5 w-3.5" /> E-posta
                    </a>
                  )}
                  {profile.contact_phone && (
                    <a
                      href={`tel:${profile.contact_phone}`}
                      className="inline-flex items-center gap-1.5 text-[0.78rem] font-medium text-accent-main bg-accent-main/10 px-3 py-1.5 rounded-full hover:bg-accent-main/20 transition"
                    >
                      <Phone className="h-3.5 w-3.5" /> Ara
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Mutual followers */}
          {!isAnyBlocked && !profile.is_own && profile.mutual_followers && profile.mutual_followers.length > 0 && (
            <div className="flex items-center gap-2.5 mt-2.5">
              <div className="flex -space-x-2">
                {profile.mutual_followers.slice(0, 3).map((m) => (
                  m.avatar_url ? (
                    <img key={m.username} src={m.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover border-2 border-bg-primary" loading="lazy" />
                  ) : (
                    <img key={m.username} className="default-avatar-auto h-7 w-7 rounded-full object-cover border-2 border-bg-primary" alt="" loading="lazy" />
                  )
                ))}
              </div>
              <span className="text-[0.82rem] text-text-muted">
                {profile.mutual_followers.length === 1
                  ? <><Link href={`/u/${profile.mutual_followers[0].username}`} className="font-semibold text-text-primary hover:underline">{profile.mutual_followers[0].full_name || profile.mutual_followers[0].username}</Link> takip ediyor</>
                  : profile.mutual_followers.length === 2
                    ? <><Link href={`/u/${profile.mutual_followers[0].username}`} className="font-semibold text-text-primary hover:underline">{profile.mutual_followers[0].full_name || profile.mutual_followers[0].username}</Link> ve <Link href={`/u/${profile.mutual_followers[1].username}`} className="font-semibold text-text-primary hover:underline">{profile.mutual_followers[1].full_name || profile.mutual_followers[1].username}</Link> takip ediyor</>
                    : <><Link href={`/u/${profile.mutual_followers[0].username}`} className="font-semibold text-text-primary hover:underline">{profile.mutual_followers[0].full_name || profile.mutual_followers[0].username}</Link>, <Link href={`/u/${profile.mutual_followers[1].username}`} className="font-semibold text-text-primary hover:underline">{profile.mutual_followers[1].full_name || profile.mutual_followers[1].username}</Link> ve <button onClick={() => setMutualFollowersOpen(true)} className="font-semibold text-text-primary hover:underline">diğerleri</button> takip ediyor</>
                }
              </span>
            </div>
          )}
        </div>

        {/* Analytics button (own profile, premium only) */}
        {profile.is_own && profile.is_premium && (
          <Link
            href="/dashboard/analytics"
            className="flex flex-col w-full mb-3 py-3 px-4 rounded-[15px] bg-bg-tertiary hover:opacity-90 transition"
          >
            <span className="text-[0.88rem] font-bold">İstatistikler</span>
            {totalViews === null ? (
              <div className="skeleton h-3.5 w-40 rounded mt-1.5" />
            ) : (
              <span className="flex items-center gap-1 text-[0.72rem] text-text-muted mt-0.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-primary"><path d="M21 21H6.2C5.08 21 4.52 21 4.09 20.782C3.72 20.59 3.41 20.284 3.22 19.908C3 19.48 3 18.92 3 17.8V3" /><path d="M7 15l4-6 4 4 6-8" /></svg>
                Son 30 günde {formatCount(totalViews)} görüntülenme
              </span>
            )}
          </Link>
        )}

        {/* Profile Score — own profile only */}
        {profile.is_own && scores && (
          <div className="mb-3 px-4 py-2.5 rounded-[13px] bg-accent-main/10 border border-accent-main/20">
            <div className="flex items-center gap-1.5 mb-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-accent-main" />
              <span className="text-xs font-semibold text-text-primary">Profil Puanı</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span><span className="text-text-muted">P:</span><span className="font-bold text-accent-main ml-0.5">{scores.profile}</span></span>
              <span><span className="text-text-muted">S:</span><span className={`font-bold ml-0.5 ${scores.spam >= 40 ? "text-error" : scores.spam >= 20 ? "text-warning" : "text-success"}`}>{scores.spam}</span></span>
              <span><span className="text-text-muted">T:</span><span className="font-bold text-accent-main ml-0.5">L{scores.trust}</span></span>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 mb-3">
          {profile.is_own ? (
            <>
              <button onClick={() => setEditOpen(true)} className="flex-1 t-btn cancel">
                Profili Düzenle
              </button>
              <button onClick={() => setShareOpen(true)} className="flex-1 t-btn cancel">
                <ShareIcon className="h-4 w-4" /> Profili Paylaş
              </button>
            </>
          ) : isBlockedBy ? (
            <div className="flex-1" />
          ) : isBlocked ? (
            <>
              <button
                onClick={handleBlock}
                className="flex-1 t-btn cancel text-error"
              >
                Engeli Kaldır
              </button>
              <button onClick={() => setShareOpen(true)} className="flex-1 t-btn cancel">
                <ShareIcon className="h-4 w-4" /> Paylaş
              </button>
            </>
          ) : requested ? (
            <>
              <button
                onClick={handleFollow}
                className="flex-1 t-btn cancel"
              >
                <Clock className="h-4 w-4" /> İstek
              </button>
              <button onClick={() => setShareOpen(true)} className="flex-1 t-btn cancel">
                <ShareIcon className="h-4 w-4" /> Paylaş
              </button>
            </>
          ) : (
            <>
              <FollowButton following={following} onClick={handleFollow} variant="profile" className="flex-1" />
              <button onClick={() => setShareOpen(true)} className="flex-1 t-btn cancel">
                <ShareIcon className="h-4 w-4" /> Paylaş
              </button>
            </>
          )}
        </div>

        {/* Suggestion carousel for 0-follower profiles */}
        {!profile.is_own && !isAnyBlocked && followerCount === 0 && (
          <div className="-mx-4 mb-3">
            <SuggestionCarousel />
          </div>
        )}

        {/* Private account guard */}
        {!profile.is_own && profile.account_private && !following && !isAnyBlocked && (
          <div className="border-t border-border-primary py-10 text-center">
            <Lock className="h-10 w-10 text-text-muted mx-auto mb-3" />
            <p className="font-semibold text-[0.95rem] mb-1">Bu Hesap Gizli</p>
            <p className="text-sm text-text-muted">Gönderileri görmek için bu hesabı takip edin.</p>
          </div>
        )}

        {/* Premium promotion banner — shown to non-premium logged-in users on own profile */}
        {profile.is_own && currentUser && !currentUser.isPremium && (
          <Link
            href="/premium"
            className="flex items-center gap-3 px-4 py-3 mb-3 rounded-[13px] bg-accent-main/[0.06] hover:bg-accent-main/[0.10] transition-colors"
          >
            <VerifiedBadge size="md" className="shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[0.82rem] font-semibold text-text-primary leading-snug">Premium'a geç, farkını göster</p>
              <p className="text-[0.72rem] text-accent-main font-medium">Onaylı rozet, analitik ve daha fazlası</p>
            </div>
            <svg className="h-4 w-4 text-text-muted shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
          </Link>
        )}

        {/* Tabs */}
        {!isAnyBlocked && (!profile.account_private || profile.is_own || following) && (
          <>
            <div className="flex border-b border-border-primary">
              <button
                onClick={() => setActiveTab("posts")}
                className={`flex-1 flex items-center justify-center py-3 transition relative ${
                  activeTab === "posts" ? "text-text-primary" : "text-text-muted"
                }`}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={activeTab === "posts" ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
                {activeTab === "posts" && <div className="absolute bottom-0 left-1/4 right-1/4 h-[3px] bg-accent-main rounded-full" />}
              </button>
              <button
                onClick={() => setActiveTab("comments")}
                className={`flex-1 flex items-center justify-center py-3 transition relative ${
                  activeTab === "comments" ? "text-text-primary" : "text-text-muted"
                }`}
              >
                <MessageCircle className="h-[22px] w-[22px]" strokeWidth={activeTab === "comments" ? 2.2 : 1.8} />
                {activeTab === "comments" && <div className="absolute bottom-0 left-1/4 right-1/4 h-[3px] bg-accent-main rounded-full" />}
              </button>
              <button
                onClick={() => setActiveTab("likes")}
                className={`flex-1 flex items-center justify-center py-3 transition relative ${
                  activeTab === "likes" ? "text-text-primary" : "text-text-muted"
                }`}
              >
                <Heart className="h-[22px] w-[22px]" strokeWidth={activeTab === "likes" ? 2.2 : 1.8} />
                {activeTab === "likes" && <div className="absolute bottom-0 left-1/4 right-1/4 h-[3px] bg-accent-main rounded-full" />}
              </button>
            </div>

            {/* Posts Tab */}
            {activeTab === "posts" && (
              <div className="pt-2 -mx-4">
                <PostListSection
                  posts={posts}
                  loading={postsLoading}
                  hasMore={hasMore}
                  onLoadMore={() => { setPage(p => p + 1); loadPosts(page + 1); }}
                  emptyTitle="Henüz gönderi yok"
                  emptyDescription={profile.is_own ? "İlk gönderinizi yazmaya başlayın!" : "Bu kullanıcı henüz gönderi yazmamış."}
                />
              </div>
            )}

            {/* Comments Tab */}
            {activeTab === "comments" && (
              <div className="pt-2 -mx-4">
                <PostListSection
                  posts={commentedPosts}
                  loading={commentsLoading}
                  hasMore={commentsHasMore}
                  onLoadMore={() => { setCommentsPage(p => p + 1); loadComments(commentsPage + 1); }}
                  emptyTitle="Henüz yorum yok"
                  emptyDescription={profile.is_own ? "Yorum yaptığınız gönderiler burada görünecek." : "Bu kullanıcı henüz bir gönderiye yorum yapmamış."}
                />
              </div>
            )}

            {/* Likes Tab */}
            {activeTab === "likes" && (
              <div className="pt-2 -mx-4">
                <PostListSection
                  posts={likedPosts}
                  loading={likesLoading}
                  hasMore={likesHasMore}
                  onLoadMore={() => { setLikesPage(p => p + 1); loadLikes(likesPage + 1); }}
                  emptyTitle="Henüz beğeni yok"
                  emptyDescription={profile.is_own ? "Beğendikleriniz burada görünecek." : "Bu kullanıcı henüz bir gönderi beğenmemiş."}
                />
              </div>
            )}

          </>
        )}

        {isAnyBlocked && !profile.is_own && (
          <div className="border-t border-border-primary pt-8 text-center">
            <Lock className="h-10 w-10 text-text-muted mx-auto mb-3" />
            {isBlockedBy ? (
              <>
                <p className="font-semibold text-[0.95rem] mb-1">Bu içerik kullanılamıyor</p>
                <p className="text-sm text-text-muted">Bu kullanıcının profilini görüntüleyemezsiniz.</p>
              </>
            ) : (
              <>
                <p className="font-semibold text-[0.95rem] mb-1">Kullanıcı engellendi</p>
                <p className="text-sm text-text-muted">Bu kullanıcıyı engellediniz. İçeriklerini göremezsiniz.</p>
              </>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      <EditProfileModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={(updated) => { setProfile({ ...profile, ...updated }); setEditOpen(false); }}
      />
      <FollowersModal open={followersOpen} onClose={() => setFollowersOpen(false)} username={profile.username} />
      <FollowingModal open={followingOpen} onClose={() => setFollowingOpen(false)} username={profile.username} />

      <AvatarViewModal
        open={avatarViewOpen}
        onClose={() => setAvatarViewOpen(false)}
        avatarUrl={profile.avatar_url || null}
        name={displayName}
      />

      <ProfileMoreModal
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        username={profile.username}
        userId={profile.user_id}
        isBlocked={isBlocked}
        onBlock={handleBlock}
        onShare={() => setShareOpen(true)}
        onVisitors={() => setVisitorsOpen(true)}
        isOwn={profile.is_own || false}
      />

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        url={`/u/${profile.username}`}
        title={`${displayName} (@${profile.username})`}
      />

      {profile.is_own && (
        <ProfileVisitorsModal
          open={visitorsOpen}
          onClose={() => setVisitorsOpen(false)}
          username={profile.username}
        />
      )}

      <AvatarCropModal
        open={cropOpen}
        onClose={() => setCropOpen(false)}
        file={cropFile}
        onCrop={handleCroppedUpload}
      />

      {profile.is_own && (
        <FollowRequestsModal
          open={followRequestsOpen}
          onClose={() => setFollowRequestsOpen(false)}
        />
      )}

      <MutualFollowersModal
        open={mutualFollowersOpen}
        onClose={() => setMutualFollowersOpen(false)}
        username={profile.username}
      />
    </div>
  );
}
