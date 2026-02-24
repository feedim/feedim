"use client";

import { useState, useEffect, lazy, Suspense, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Settings, Calendar, Link as LinkIcon, MoreHorizontal, Lock, Briefcase, Mail, Phone, Clock } from "lucide-react";
import { formatCount } from "@/lib/utils";
import EditableAvatar from "@/components/EditableAvatar";
import PostListSection from "@/components/PostListSection";
import VerifiedBadge, { getBadgeVariant } from "@/components/VerifiedBadge";
import { useAuthModal } from "@/components/AuthModal";
import { useUser } from "@/components/UserContext";
import { feedimAlert } from "@/components/FeedimAlert";
import FollowButton from "@/components/FollowButton";
import { getCategoryLabel, isProfessional } from "@/lib/professional";
import SuggestionCarousel from "@/components/SuggestionCarousel";
import ShareIcon from "@/components/ShareIcon";
import MomentGridCard from "@/components/MomentGridCard";


const EditProfileModal = lazy(() => import("@/components/modals/EditProfileModal"));
const FollowersModal = lazy(() => import("@/components/modals/FollowersModal"));
const FollowingModal = lazy(() => import("@/components/modals/FollowingModal"));
const AvatarViewModal = lazy(() => import("@/components/modals/AvatarViewModal"));
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
  role?: string;
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
  status?: string;
}

export default function ProfileView({ profile: initialProfile }: { profile: Profile }) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [following, setFollowing] = useState(initialProfile.is_following || false);
  const [requested, setRequested] = useState(initialProfile.has_follow_request || false);
  const [followerCount, setFollowerCount] = useState(initialProfile.follower_count || 0);
  const [isBlocked, setIsBlocked] = useState(initialProfile.is_blocked || false);
  const [isBlockedBy, setIsBlockedBy] = useState(initialProfile.is_blocked_by || false);
  const [activeTab, setActiveTab] = useState<"all" | "posts" | "notes" | "moments" | "video" | "likes" | "comments">("all");
  // "all" tab (no filter)
  const [allPosts, setAllPosts] = useState<any[]>([]);
  const [allLoading, setAllLoading] = useState(true);
  const [allPage, setAllPage] = useState(1);
  const [allHasMore, setAllHasMore] = useState(false);
  // "posts" tab (article only)
  const [articlePosts, setArticlePosts] = useState<any[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [articlesPage, setArticlesPage] = useState(1);
  const [articlesHasMore, setArticlesHasMore] = useState(false);
  const [articlesLoaded, setArticlesLoaded] = useState(false);
  // "video" tab
  const [videoPosts, setVideoPosts] = useState<any[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [videosPage, setVideosPage] = useState(1);
  const [videosHasMore, setVideosHasMore] = useState(false);
  const [videosLoaded, setVideosLoaded] = useState(false);
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
  const [momentPosts, setMomentPosts] = useState<any[]>([]);
  const [momentsLoading, setMomentsLoading] = useState(false);
  const [momentsPage, setMomentsPage] = useState(1);
  const [momentsHasMore, setMomentsHasMore] = useState(false);
  const [momentsLoaded, setMomentsLoaded] = useState(false);
  const [notePosts, setNotePosts] = useState<any[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesPage, setNotesPage] = useState(1);
  const [notesHasMore, setNotesHasMore] = useState(false);
  const [notesLoaded, setNotesLoaded] = useState(false);
  // Modals
  const [editOpen, setEditOpen] = useState(false);
  const [editAvatarOnOpen, setEditAvatarOnOpen] = useState(false);
  const [followersOpen, setFollowersOpen] = useState(false);
  const [followingOpen, setFollowingOpen] = useState(false);
  const [avatarViewOpen, setAvatarViewOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [visitorsOpen, setVisitorsOpen] = useState(false);
  const [followRequestsOpen, setFollowRequestsOpen] = useState(false);
  const [mutualFollowersOpen, setMutualFollowersOpen] = useState(false);
  const [totalViews, setTotalViews] = useState<number | null>(null);

  // Admin panel
  const [adminTab, setAdminTab] = useState<"recent_users" | "recent_posts" | "reports">("recent_users");
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminPosts, setAdminPosts] = useState<any[]>([]);
  const [adminReports, setAdminReports] = useState<any[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminLoaded, setAdminLoaded] = useState<Record<string, boolean>>({});

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { requireAuth } = useAuthModal();
  const { user: currentUser } = useUser();
  const isAnyBlocked = isBlocked || isBlockedBy;
  const statsDisabled = isAnyBlocked || (profile.account_private && !profile.is_own && !following);
  const displayName = isAnyBlocked ? "Kullanıcı" : (profile.full_name || [profile.name, profile.surname].filter(Boolean).join(" ") || profile.username);
  const initials = ((profile.name?.[0] || "") + (profile.surname?.[0] || "")).toUpperCase() || profile.username[0]?.toUpperCase() || "U";

  // Track profile visit
  useEffect(() => {
    if (!profile.is_own && !isAnyBlocked) {
      fetch(`/api/users/${profile.username}/visit`, { method: "POST", keepalive: true }).catch(() => {});
    }
  }, [profile.username, profile.is_own, isAnyBlocked]);

  useEffect(() => {
    if (!isAnyBlocked) {
      loadAll(1);
    }
    if (profile.is_own) {
      fetch("/api/analytics?period=30d")
        .then(r => r.json())
        .then(d => setTotalViews(d.overview?.totalViews || 0))
        .catch(() => {});
    }
  }, []);

  // Auth gate for load more (page 2+)
  const authGate = useCallback(async (pageNum: number): Promise<boolean> => {
    if (pageNum > 1 && !currentUser) {
      const user = await requireAuth();
      return !!user;
    }
    return true;
  }, [currentUser, requireAuth]);

  const loadAll = useCallback(async (pageNum: number) => {
    if (!(await authGate(pageNum))) return;
    setAllLoading(true);
    try {
      const res = await fetch(`/api/users/${profile.username}/posts?page=${pageNum}`);
      const data = await res.json();
      if (pageNum === 1) {
        setAllPosts(data.posts || []);
      } else {
        setAllPosts(prev => [...prev, ...(data.posts || [])]);
      }
      setAllHasMore(data.hasMore || false);
    } catch {
      // Silent
    } finally {
      setAllLoading(false);
    }
  }, [profile.username, authGate]);

  const loadArticles = useCallback(async (pageNum: number) => {
    if (!(await authGate(pageNum))) return;
    setArticlesLoading(true);
    try {
      const res = await fetch(`/api/users/${profile.username}/posts?page=${pageNum}&content_type=article`);
      const data = await res.json();
      if (pageNum === 1) {
        setArticlePosts(data.posts || []);
      } else {
        setArticlePosts(prev => [...prev, ...(data.posts || [])]);
      }
      setArticlesHasMore(data.hasMore || false);
      setArticlesLoaded(true);
    } catch {
      // Silent
    } finally {
      setArticlesLoading(false);
    }
  }, [profile.username, authGate]);

  const loadVideos = useCallback(async (pageNum: number) => {
    if (!(await authGate(pageNum))) return;
    setVideosLoading(true);
    try {
      const res = await fetch(`/api/users/${profile.username}/posts?page=${pageNum}&content_type=video`);
      const data = await res.json();
      if (pageNum === 1) {
        setVideoPosts(data.posts || []);
      } else {
        setVideoPosts(prev => [...prev, ...(data.posts || [])]);
      }
      setVideosHasMore(data.hasMore || false);
      setVideosLoaded(true);
    } catch {
      // Silent
    } finally {
      setVideosLoading(false);
    }
  }, [profile.username, authGate]);

  const loadLikes = useCallback(async (pageNum: number) => {
    if (!(await authGate(pageNum))) return;
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
  }, [profile.username, authGate]);

  const loadComments = useCallback(async (pageNum: number) => {
    if (!(await authGate(pageNum))) return;
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
  }, [profile.username, authGate]);

  const loadMoments = useCallback(async (pageNum: number) => {
    if (!(await authGate(pageNum))) return;
    setMomentsLoading(true);
    try {
      const res = await fetch(`/api/users/${profile.username}/posts?page=${pageNum}&content_type=moment`);
      const data = await res.json();
      if (pageNum === 1) {
        setMomentPosts(data.posts || []);
      } else {
        setMomentPosts(prev => [...prev, ...(data.posts || [])]);
      }
      setMomentsHasMore(data.hasMore || false);
      setMomentsLoaded(true);
    } catch {
      // Silent
    } finally {
      setMomentsLoading(false);
    }
  }, [profile.username, authGate]);

  const loadNotes = useCallback(async (pageNum: number) => {
    if (!(await authGate(pageNum))) return;
    setNotesLoading(true);
    try {
      const res = await fetch(`/api/users/${profile.username}/posts?page=${pageNum}&content_type=note`);
      const data = await res.json();
      if (pageNum === 1) {
        setNotePosts(data.posts || []);
      } else {
        setNotePosts(prev => [...prev, ...(data.posts || [])]);
      }
      setNotesHasMore(data.hasMore || false);
      setNotesLoaded(true);
    } catch {
      // Silent
    } finally {
      setNotesLoading(false);
    }
  }, [profile.username, authGate]);

  // Load data when tab switches for the first time
  useEffect(() => {
    if (activeTab === "posts" && !articlesLoaded) {
      loadArticles(1);
    }
    if (activeTab === "video" && !videosLoaded) {
      loadVideos(1);
    }
    if (activeTab === "likes" && !likesLoaded) {
      loadLikes(1);
    }
    if (activeTab === "comments" && !commentsLoaded) {
      loadComments(1);
    }
    if (activeTab === "moments" && !momentsLoaded) {
      loadMoments(1);
    }
    if (activeTab === "notes" && !notesLoaded) {
      loadNotes(1);
    }
  }, [activeTab]);

  const isAdminOrMod = currentUser?.role === "admin" || currentUser?.role === "moderator";

  const loadAdminTab = useCallback(async (tab: string) => {
    if (adminLoaded[tab]) return;
    setAdminLoading(true);
    try {
      const res = await fetch(`/api/admin/moderation?tab=${tab}&page=1`);
      const data = await res.json();
      if (tab === "recent_users") setAdminUsers(data.users || []);
      else if (tab === "recent_posts") setAdminPosts(data.posts || []);
      else if (tab === "reports") setAdminReports(data.reports || []);
      setAdminLoaded(prev => ({ ...prev, [tab]: true }));
    } catch {}
    setAdminLoading(false);
  }, [adminLoaded]);

  // Load admin data when admin tab switches
  useEffect(() => {
    if (profile.is_own && isAdminOrMod) {
      loadAdminTab(adminTab);
    }
  }, [adminTab, profile.is_own, isAdminOrMod]);

  const doUnfollow = async () => {
    // Wait for API before updating state (alert shows loader meanwhile)
    const res = await fetch(`/api/users/${profile.username}/follow`, { method: "POST", keepalive: true });
    if (res.ok) {
      if (requested) {
        setRequested(false);
      } else {
        setFollowing(false);
        setFollowerCount(c => Math.max(0, c - 1));
      }
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
    const res = await fetch(`/api/users/${profile.username}/follow`, { method: "POST", keepalive: true });
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
        feedimAlert("error", data.error || "Günlük takip limitine ulaştın");
      }
    }
  }, [profile.username, profile.account_private, following, requested, requireAuth]);

  const handleBlock = useCallback(() => {
    if (!isBlocked) {
      feedimAlert("warning", `@${profile.username} adlı kullanıcıyı engellemek istediğinize emin misiniz? Engellediğinizde aranızdaki takip ilişkisi kaldırılır ve birbirinizin içeriklerini göremezsiniz.`, {
        showYesNo: true,
        onYes: () => {
          const prevFollowing = following;
          const prevRequested = requested;
          const prevFollowerCount = followerCount;
          const prevPosts = allPosts;
          const prevLikedPosts = likedPosts;
          setIsBlocked(true);
          setFollowing(false);
          setRequested(false);
          setFollowerCount(0);
          setAllPosts([]);
          setLikedPosts([]);

          fetch(`/api/users/${profile.username}/block`, { method: "POST", keepalive: true }).then(res => {
            if (!res.ok) {
              setIsBlocked(false);
              setFollowing(prevFollowing);
              setRequested(prevRequested);
              setFollowerCount(prevFollowerCount);
              setAllPosts(prevPosts);
              setLikedPosts(prevLikedPosts);
            }
          }).catch(() => {
            setIsBlocked(false);
            setFollowing(prevFollowing);
            setRequested(prevRequested);
            setFollowerCount(prevFollowerCount);
            setAllPosts(prevPosts);
            setLikedPosts(prevLikedPosts);
          });
        },
      });
    } else {
      feedimAlert("question", `@${profile.username} adlı kullanıcının engelini kaldırmak istediğinize emin misiniz?`, {
        showYesNo: true,
        onYes: () => {
          setIsBlocked(false);
          fetch(`/api/users/${profile.username}/block`, { method: "POST", keepalive: true }).then(res => {
            if (!res.ok) setIsBlocked(true);
          }).catch(() => setIsBlocked(true));
        },
      });
    }
  }, [profile.username, isBlocked, following, requested, followerCount, allPosts, likedPosts]);

  const handleAvatarClick = useCallback(() => {
    if (!isAnyBlocked) setAvatarViewOpen(true);
  }, [isAnyBlocked]);

  return (
    <div>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-bg-primary sticky-ambient">
        <nav className="px-4 flex items-center justify-between h-[53px]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.back()}
              className="i-btn !w-8 !h-8 text-text-muted hover:text-text-primary"
              aria-label="Geri"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <span className="text-[1.1rem] font-semibold">{isBlockedBy ? "Kullanıcı" : `@${profile.username}`}</span>
          </div>
          <div className="flex items-center gap-1">
            {profile.is_own && (
              <Link href="/settings" className="i-btn !w-9 !h-9 text-text-muted hover:text-text-primary flex items-center justify-center" aria-label="Ayarlar">
                <Settings className="h-5 w-5" />
              </Link>
            )}
            <button
              onClick={() => setMoreOpen(true)}
              className="i-btn !w-9 !h-9 text-text-muted hover:text-text-primary"
              aria-label="Daha fazla seçenek"
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
            <EditableAvatar
              src={isAnyBlocked ? null : profile.avatar_url}
              alt={displayName}
              sizeClass="w-24 h-24"
              editable={false}
              loading={false}
              onClick={isAnyBlocked ? undefined : handleAvatarClick}
            />
          </div>

          {/* Stats */}
          <div className="flex-1 flex items-center justify-around pt-2">
            <div className="text-center">
              <p className="text-[1.05rem] font-bold">{isAnyBlocked ? "0" : formatCount(profile.post_count || 0)}</p>
              <p className="text-[0.78rem] text-text-muted">Gönderi</p>
            </div>
            <button onClick={statsDisabled ? undefined : () => setFollowersOpen(true)} className={`text-center ${statsDisabled ? "cursor-default" : ""}`}>
              <p className="text-[1.05rem] font-bold">{isAnyBlocked ? "0" : formatCount(followerCount)}</p>
              <p className="text-[0.78rem] text-text-muted">Takipçi</p>
            </button>
            <button onClick={statsDisabled ? undefined : () => setFollowingOpen(true)} className={`text-center ${statsDisabled ? "cursor-default" : ""}`}>
              <p className="text-[1.05rem] font-bold">{isAnyBlocked ? "0" : formatCount(profile.following_count || 0)}</p>
              <p className="text-[0.78rem] text-text-muted">Takip</p>
            </button>
          </div>
        </div>

        {/* Name & Bio */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5">
            <h1 className="text-[1.1rem] font-bold truncate">{displayName}</h1>
            {!isAnyBlocked && (profile.role === "admin" || profile.is_verified) && (
              <VerifiedBadge size="md" variant={getBadgeVariant(profile.premium_plan)} role={profile.role} />
            )}
            {!isAnyBlocked && profile.role === "admin" ? (
              <span className="text-[10px] font-bold bg-[#ff6200]/15 text-[#ff6200] px-1.5 py-0.5 rounded-full">ADMIN</span>
            ) : !isAnyBlocked && profile.is_premium && profile.premium_plan && !["basic"].includes(profile.premium_plan) ? (
              <span className="text-[10px] font-bold bg-accent-main/15 text-accent-main px-1.5 py-0.5 rounded-full">
                {profile.premium_plan === "business" ? "BUSINESS" : profile.premium_plan === "max" ? "MAX" : profile.premium_plan === "super" ? "SUPER" : "PRO"}
              </span>
            ) : null}
          </div>
          {!isAnyBlocked && (
            <div className="mt-1 space-y-1">
              {profile.bio && <p className="text-[0.84rem] text-text-secondary leading-snug">{profile.bio}</p>}
              {profile.website && (
                <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[0.8rem] text-accent-main hover:underline">
                  <LinkIcon className="h-3.5 w-3.5" /> {profile.website.replace(/https?:\/\//, "")}
                </a>
              )}
              {profile.created_at && (
                <span className="flex items-center gap-1 text-[0.78rem] text-text-muted">
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
            <button onClick={() => setMutualFollowersOpen(true)} className="flex items-center gap-1.5 mt-2.5 w-full text-left hover:opacity-80 transition">
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
                  ? <><span className="font-semibold text-text-primary">{profile.mutual_followers[0].full_name || `@${profile.mutual_followers[0].username}`}</span> takip ediyor</>
                  : profile.mutual_followers.length === 2
                    ? <><span className="font-semibold text-text-primary">{profile.mutual_followers[0].full_name || `@${profile.mutual_followers[0].username}`}</span> ve <span className="font-semibold text-text-primary">{profile.mutual_followers[1].full_name || `@${profile.mutual_followers[1].username}`}</span> takip ediyor</>
                    : <><span className="font-semibold text-text-primary">{profile.mutual_followers[0].full_name || `@${profile.mutual_followers[0].username}`}</span>, <span className="font-semibold text-text-primary">{profile.mutual_followers[1].full_name || `@${profile.mutual_followers[1].username}`}</span> ve <span className="font-semibold text-text-primary">diğerleri</span> takip ediyor</>
                }
              </span>
            </button>
          )}
        </div>

        {/* Analytics button (own profile, premium only) */}
        {profile.is_own && profile.is_premium && (
          <Link
            href="/analytics"
            className="flex flex-col w-full mb-3 py-3 px-4 rounded-[15px] bg-bg-tertiary hover:opacity-90 transition"
          >
            <span className="text-[0.88rem] font-bold">İstatistikler</span>
            {totalViews === null ? (
              <div className="skeleton h-3.5 w-40 rounded mt-1.5" />
            ) : (
              <span className="flex items-center gap-1 text-[0.78rem] text-text-muted mt-0.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-primary"><path d="M21 21H6.2C5.08 21 4.52 21 4.09 20.782C3.72 20.59 3.41 20.284 3.22 19.908C3 19.48 3 18.92 3 17.8V3" /><path d="M7 15l4-6 4 4 6-8" /></svg>
                Son 30 günde {formatCount(totalViews)} görüntülenme
              </span>
            )}
          </Link>
        )}


        {/* Action buttons */}
        <div className="flex gap-2 mb-3">
          {profile.is_own ? (
            <>
              <button onClick={() => setEditOpen(true)} data-hotkey="edit-profile" className="flex-1 t-btn cancel" style={{ padding: "0 14px", fontSize: "0.82rem" }}>
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
                Profili Düzenle
              </button>
              <button onClick={() => setShareOpen(true)} data-hotkey="share" className="flex-1 t-btn cancel" style={{ padding: "0 14px", fontSize: "0.82rem" }}>
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
              <button onClick={() => setShareOpen(true)} data-hotkey="share" className="flex-1 t-btn cancel">
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
              <button onClick={() => setShareOpen(true)} data-hotkey="share" className="flex-1 t-btn cancel">
                <ShareIcon className="h-4 w-4" /> Paylaş
              </button>
            </>
          ) : (
            <>
              <FollowButton following={following} onClick={handleFollow} variant="profile" className="flex-1" />
              <button onClick={() => setShareOpen(true)} data-hotkey="share" className="flex-1 t-btn cancel">
                <ShareIcon className="h-4 w-4" /> Paylaş
              </button>
            </>
          )}
        </div>

        {/* Suggestion carousel for 0-follower profiles */}
        {!profile.is_own && !isAnyBlocked && followerCount === 0 && (
          <div className="-mx-4 mb-3">
            <SuggestionCarousel excludeUserId={profile.user_id} />
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
              <p className="text-[0.78rem] text-accent-main font-medium">Onaylı rozet, analitik ve daha fazlası</p>
            </div>
            <svg className="h-4 w-4 text-text-muted shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
          </Link>
        )}


        {/* Tabs */}
        {!isAnyBlocked && (!profile.account_private || profile.is_own || following) && (
          <>
            <div className="flex gap-[10px] border-b border-border-primary overflow-x-auto scrollbar-hide">
              {([
                { id: "all", label: "Hepsi" },
                { id: "posts", label: "Gönderiler" },
                { id: "notes", label: "Notlar" },
                { id: "moments", label: "Moments" },
                { id: "video", label: "Video" },
                { id: "likes", label: "Beğeniler" },
                { id: "comments", label: "Yorumlar" },
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`shrink-0 px-3 py-3 text-[0.95rem] font-semibold border-b-[2.5px] transition whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-accent-main text-text-primary"
                      : "border-transparent text-text-muted"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* All Tab */}
            {activeTab === "all" && (
              <div className="pt-2 -mx-4">
                {mounted ? (
                  <PostListSection
                    posts={allPosts}
                    loading={allLoading}
                    hasMore={allHasMore}
                    onLoadMore={() => { setAllPage(p => p + 1); loadAll(allPage + 1); }}
                    emptyTitle="Henüz gönderi yok"
                    emptyDescription={profile.is_own ? "İlk gönderinizi yazmaya başlayın!" : "Bu kullanıcı henüz gönderi yazmamış."}
                  />
                ) : null}
              </div>
            )}

            {/* Posts (Articles) Tab */}
            {activeTab === "posts" && (
              <div className="pt-2 -mx-4">
                {mounted ? (
                  <PostListSection
                    posts={articlePosts}
                    loading={articlesLoading}
                    hasMore={articlesHasMore}
                    onLoadMore={() => { setArticlesPage(p => p + 1); loadArticles(articlesPage + 1); }}
                    emptyTitle="Henüz gönderi yok"
                    emptyDescription={profile.is_own ? "İlk gönderinizi yazmaya başlayın!" : "Bu kullanıcı henüz gönderi yazmamış."}
                  />
                ) : null}
              </div>
            )}

            {/* Notes Tab */}
            {activeTab === "notes" && (
              <div className="pt-2 -mx-4">
                {mounted ? (
                  <PostListSection
                    posts={notePosts}
                    loading={notesLoading}
                    hasMore={notesHasMore}
                    onLoadMore={() => { setNotesPage(p => p + 1); loadNotes(notesPage + 1); }}
                    emptyTitle="Henüz not yok"
                    emptyDescription={profile.is_own ? "İlk notunuzu paylaşmaya başlayın!" : "Bu kullanıcı henüz not paylaşmamış."}
                  />
                ) : null}
              </div>
            )}

            {/* Moments Tab */}
            {activeTab === "moments" && (
              <div className="-mx-4 sm:mx-0">
                {momentsLoading && !momentsLoaded ? (
                  <div className="flex justify-center py-8"><span className="loader" style={{ width: 22, height: 22 }} /></div>
                ) : momentPosts.length === 0 ? (
                  <div className="text-center py-12 sm:py-20">
                    <h2 className="text-lg sm:text-xl font-bold mb-2">Henüz moment yok</h2>
                    <p className="text-[13px] text-text-muted mb-5 sm:mb-6 px-4 max-w-[300px] mx-auto">
                      {profile.is_own ? "İlk momentinizi oluşturun!" : "Bu kullanıcı henüz moment paylaşmamış."}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-0.5">
                      {momentPosts.map((m: any) => (
                        <MomentGridCard key={m.id} moment={m} />
                      ))}
                    </div>
                    {momentsHasMore && (
                      <div className="flex justify-center py-4">
                        <button
                          onClick={() => { setMomentsPage(p => p + 1); loadMoments(momentsPage + 1); }}
                          disabled={momentsLoading}
                          className="text-sm text-accent-main font-medium hover:underline disabled:opacity-50"
                        >
                          {momentsLoading ? "Yükleniyor..." : "Daha fazla"}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Video Tab */}
            {activeTab === "video" && (
              <div className="pt-2 -mx-4">
                {mounted ? (
                  <PostListSection
                    posts={videoPosts}
                    loading={videosLoading}
                    hasMore={videosHasMore}
                    onLoadMore={() => { setVideosPage(p => p + 1); loadVideos(videosPage + 1); }}
                    emptyTitle="Henüz video yok"
                    emptyDescription={profile.is_own ? "İlk videonuzu paylaşmaya başlayın!" : "Bu kullanıcı henüz video paylaşmamış."}
                  />
                ) : null}
              </div>
            )}

            {/* Likes Tab */}
            {activeTab === "likes" && (
              <div className="pt-2 -mx-4">
                {mounted ? (
                  <PostListSection
                    posts={likedPosts}
                    loading={likesLoading}
                    hasMore={likesHasMore}
                    onLoadMore={() => { setLikesPage(p => p + 1); loadLikes(likesPage + 1); }}
                    emptyTitle="Henüz beğeni yok"
                    emptyDescription={profile.is_own ? "Beğendikleriniz burada görünecek." : "Bu kullanıcı henüz bir gönderi beğenmemiş."}
                  />
                ) : null}
              </div>
            )}

            {/* Comments Tab */}
            {activeTab === "comments" && (
              <div className="pt-2 -mx-4">
                {mounted ? (
                  <PostListSection
                    posts={commentedPosts}
                    loading={commentsLoading}
                    hasMore={commentsHasMore}
                    onLoadMore={() => { setCommentsPage(p => p + 1); loadComments(commentsPage + 1); }}
                    emptyTitle="Henüz yorum yok"
                    emptyDescription={profile.is_own ? "Yorum yaptığınız gönderiler burada görünecek." : "Bu kullanıcı henüz bir gönderiye yorum yapmamış."}
                  />
                ) : null}
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
        onClose={() => {
          setEditOpen(false);
          setEditAvatarOnOpen(false);
        }}
        openAvatarPicker={editAvatarOnOpen}
        onSave={(updated) => { setProfile({ ...profile, ...updated }); setEditOpen(false); }}
      />
      <FollowersModal open={followersOpen} onClose={() => setFollowersOpen(false)} username={profile.username} />
      <FollowingModal open={followingOpen} onClose={() => setFollowingOpen(false)} username={profile.username} />

      <AvatarViewModal
        open={avatarViewOpen}
        onClose={() => setAvatarViewOpen(false)}
        avatarUrl={profile.avatar_url || null}
        name={displayName}
        isOwn={!!profile.is_own}
        onEdit={() => {
          setAvatarViewOpen(false);
          setEditAvatarOnOpen(true);
          setEditOpen(true);
        }}
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
