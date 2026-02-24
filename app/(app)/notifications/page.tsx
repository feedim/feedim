"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { Bell, Heart, MessageCircle, UserPlus, Award, Coins, Gift, AlertCircle, CheckCheck, Sparkles, Undo2, ChevronRight, Clock, CheckCircle, XCircle, Copyright, Eye, Smartphone, Monitor } from "lucide-react";
import { formatRelativeDate } from "@/lib/utils";
import { encodeId } from "@/lib/hashId";
import AppLayout from "@/components/AppLayout";
import EmptyState from "@/components/EmptyState";
import Link from "next/link";
import LoadMoreTrigger from "@/components/LoadMoreTrigger";
import FollowRequestsModal from "@/components/modals/FollowRequestsModal";
import UserListModal from "@/components/modals/UserListModal";
import LikesModal from "@/components/modals/LikesModal";
import UserListItem from "@/components/UserListItem";
import FollowButton from "@/components/FollowButton";
import { useUser } from "@/components/UserContext";
import { cn } from "@/lib/utils";

interface GroupedNotification {
  id: string;
  type: string;
  is_grouped: boolean;
  actors?: { username: string; avatar_url?: string; full_name?: string }[];
  actor_count?: number;
  actor?: { username: string; avatar_url?: string; full_name?: string } | null;
  object_id?: number;
  object_type?: string;
  post_slug?: string | null;
  post_thumbnail?: string | null;
  comment_post_slug?: string | null;
  content?: string;
  is_read: boolean;
  latest_at: string;
  notification_ids: number[];
}

interface SuggestedUser {
  user_id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  is_verified?: boolean;
  premium_plan?: string | null;
  role?: string;
  bio?: string;
}

type NotifTab = "social" | "system";

const iconMap: Record<string, React.ReactNode> = {
  like: <Heart className="h-4 w-4 text-error" />,
  comment: <MessageCircle className="h-4 w-4 text-accent-main" />,
  reply: <MessageCircle className="h-4 w-4 text-accent-main" />,
  mention: <MessageCircle className="h-4 w-4 text-accent-main" />,
  follow: <UserPlus className="h-4 w-4 text-text-primary" />,
  follow_request: <UserPlus className="h-4 w-4 text-text-primary" />,
  follow_accepted: <UserPlus className="h-4 w-4 text-text-primary" />,
  comment_like: <Heart className="h-4 w-4 text-error" />,
  milestone: <Award className="h-4 w-4 text-warning" />,
  view_milestone: <Eye className="h-4 w-4 text-warning" />,
  coin_earned: <Coins className="h-4 w-4 text-accent-main" />,
  gift_received: <Gift className="h-4 w-4 text-text-primary" />,
  first_post: <Sparkles className="h-4 w-4 text-success" />,
  comeback_post: <Undo2 className="h-4 w-4 text-info" />,
  system: <AlertCircle className="h-4 w-4 text-text-muted" />,
  device_login: <Smartphone className="h-4 w-4 text-text-muted" />,
  premium_expired: <AlertCircle className="h-4 w-4 text-warning" />,
  moderation_review: <Clock className="h-4 w-4 text-accent-main" />,
  moderation_approved: <CheckCircle className="h-4 w-4 text-success" />,
  moderation_rejected: <XCircle className="h-4 w-4 text-error" />,
  account_moderation: <AlertCircle className="h-4 w-4 text-warning" />,
  copyright_detected: <Copyright className="h-4 w-4 text-warning" />,
};

function getGroupedNotificationLink(n: GroupedNotification): string | null {
  // Grouped likes → modal (handled in component)
  if (n.is_grouped && n.type === "like") return null;
  // Grouped follows → modal (handled in component)
  if (n.is_grouped && n.type === "follow") return null;

  // Single notifications
  if (n.type === "follow" && n.actor?.username) return `/u/${n.actor.username}`;
  if (n.type === "follow_request" && n.actor?.username) return `/u/${n.actor.username}`;
  if (n.type === "follow_accepted" && n.actor?.username) return `/u/${n.actor.username}`;
  if (n.type === "account_moderation") return `/account-moderation`;
  if (n.type === "device_login") return `/security`;
  if (n.type === "view_milestone" && n.post_slug) return `/${n.post_slug}`;
  if (n.type === "copyright_detected" && n.object_type === "post" && n.post_slug) return `/${n.post_slug}`;
  if (n.type === "copyright_similar_detected" && n.object_type === "post" && n.post_slug) return `/${n.post_slug}`;
  if ((n.type === "moderation_review" || n.type === "moderation_approved" || n.type === "moderation_rejected") && n.object_type === "post" && n.post_slug) {
    return `/${n.post_slug}/moderation`;
  }
  if ((n.type === "moderation_review" || n.type === "moderation_approved" || n.type === "moderation_rejected") && n.object_type === "comment" && n.comment_post_slug && n.object_id) {
    return `/${n.comment_post_slug}/moderation?comment=${encodeId(n.object_id)}`;
  }
  if ((n.type === "like" || n.type === "comment" || n.type === "reply" || n.type === "mention" || n.type === "first_post" || n.type === "comeback_post" || n.type === "milestone" || n.type === "view_milestone") && n.post_slug) {
    return `/${n.post_slug}`;
  }
  if (n.object_type === "comment" && n.comment_post_slug && n.object_id) {
    return `/${n.comment_post_slug}?comment=${encodeId(n.object_id)}`;
  }
  return null;
}

function getGroupedText(n: GroupedNotification): React.ReactNode {
  if (n.is_grouped) {
    const firstActor = n.actors?.[0];
    const count = (n.actor_count || 1) - 1;
    const name = firstActor?.username ? `@${firstActor.username}` : "Birisi";

    if (n.type === "like") {
      return (
        <>
          <span className="font-semibold">{name}</span>
          {count > 0 && <> ve <span className="font-semibold">di{"\u011F"}er {count} ki{"\u015F"}i</span></>}
          {" "}<span className="text-text-muted">{n.content || "g\u00F6nderinizi be\u011Fendi"}</span>
        </>
      );
    }
    if (n.type === "follow") {
      return (
        <>
          <span className="font-semibold">{name}</span>
          {count > 0 && <> ve <span className="font-semibold">di{"\u011F"}er {count} ki{"\u015F"}i</span></>}
          {" "}<span className="text-text-muted">sizi takip etmeye ba{"\u015F"}lad{"\u0131"}</span>
        </>
      );
    }
  }

  // Single notification
  const actorName = n.actor?.username ? `@${n.actor.username}` : "";
  const isSystem = ["system", "account_moderation", "device_login", "premium_expired", "view_milestone"].includes(n.type);

  return (
    <>
      {actorName && !isSystem && <><span className="font-semibold">{actorName}</span>{" "}</>}
      <span className={isSystem ? "text-text-primary font-medium" : "text-text-muted"}>
        {n.content || getDefaultText(n.type)}
      </span>
    </>
  );
}

function groupByTimeSection(notifications: GroupedNotification[]): { label: string; items: GroupedNotification[] }[] {
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;

  const recent: GroupedNotification[] = [];
  const older: GroupedNotification[] = [];

  for (const n of notifications) {
    const age = now - new Date(n.latest_at).getTime();
    if (age <= sevenDays) {
      recent.push(n);
    } else if (age <= thirtyDays) {
      older.push(n);
    }
  }

  const sections: { label: string; items: GroupedNotification[] }[] = [];
  if (recent.length > 0) sections.push({ label: "Son 7 g\u00FCn", items: recent });
  if (older.length > 0) sections.push({ label: "Son 30 g\u00FCn", items: older });
  return sections;
}

export default function NotificationsPage() {
  useSearchParams();
  const [activeTab, setActiveTab] = useState<NotifTab>("social");
  const [notifications, setNotifications] = useState<GroupedNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const { user: ctxUser } = useUser();

  // Follow requests state
  const [followRequestCount, setFollowRequestCount] = useState(0);
  const [followRequestAvatars, setFollowRequestAvatars] = useState<string[]>([]);
  const [followRequestsOpen, setFollowRequestsOpen] = useState(false);
  const [isPrivateAccount, setIsPrivateAccount] = useState(false);

  // Group modal state
  const [followGroupNotif, setFollowGroupNotif] = useState<GroupedNotification | null>(null);
  const [likeGroupPostId, setLikeGroupPostId] = useState<number | null>(null);

  // Suggestions state
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());

  const loadFollowRequestInfo = useCallback(async () => {
    try {
      const profileRes = await fetch("/api/profile");
      const profileData = await profileRes.json();
      if (!profileData.profile) return;

      const isPrivate = profileData.profile.account_private === true;
      setIsPrivateAccount(isPrivate);
      if (!isPrivate) return;

      const reqRes = await fetch(`/api/users/${profileData.profile.username}/follow-request`);
      const reqData = await reqRes.json();
      const requests = reqData.requests || [];

      setFollowRequestCount(requests.length);
      setFollowRequestAvatars(
        requests
          .slice(0, 3)
          .map((r: any) => r.profile?.avatar_url)
          .filter(Boolean)
      );
    } catch {
      // Silent
    }
  }, []);

  const loadNotifications = useCallback(async (tab: NotifTab, pageNum: number) => {
    if (pageNum === 1) setLoading(true);
    try {
      const res = await fetch(`/api/notifications/grouped?tab=${tab}&page=${pageNum}`);
      const data = await res.json();
      if (res.ok) {
        if (pageNum === 1) {
          setNotifications(data.notifications || []);
        } else {
          setNotifications(prev => [...prev, ...(data.notifications || [])]);
        }
        setHasMore(data.hasMore || false);
        setPage(pageNum);
      }
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSuggestions = useCallback(async () => {
    try {
      const res = await fetch("/api/suggestions?limit=6");
      const data = await res.json();
      setSuggestions(data.users || []);
    } catch {
      // Silent
    }
  }, []);

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications", { method: "PUT" });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch {}
  };

  const handleTabChange = (tab: NotifTab) => {
    setActiveTab(tab);
    setNotifications([]);
    setPage(1);
    loadNotifications(tab, 1);
  };

  const handleFollow = useCallback(async (userId: string) => {
    const wasFollowing = followingSet.has(userId);
    setFollowingSet(prev => {
      const next = new Set(prev);
      if (wasFollowing) next.delete(userId); else next.add(userId);
      return next;
    });
    try {
      const res = await fetch(`/api/users/${userId}/follow`, { method: "POST" });
      if (!res.ok) {
        setFollowingSet(prev => {
          const next = new Set(prev);
          if (wasFollowing) next.add(userId); else next.delete(userId);
          return next;
        });
      }
    } catch {
      setFollowingSet(prev => {
        const next = new Set(prev);
        if (wasFollowing) next.add(userId); else next.delete(userId);
        return next;
      });
    }
  }, [followingSet]);

  useEffect(() => {
    loadNotifications("social", 1);
    loadFollowRequestInfo();
    loadSuggestions();
  }, []);

  const hasUnread = notifications.some(n => !n.is_read);
  const sections = groupByTimeSection(notifications);

  return (
    <AppLayout headerTitle="Bildirimler" hideRightSidebar>
      {/* Tab bar */}
      <div className="sticky top-[53px] z-20 bg-bg-primary sticky-ambient border-b border-border-primary">
        <div className="flex">
          <button
            onClick={() => handleTabChange("social")}
            className={cn(
              "flex-1 py-3 text-[0.95rem] font-bold text-center border-b-[2.5px] transition-colors",
              activeTab === "social"
                ? "border-accent-main text-text-primary"
                : "border-transparent text-text-muted"
            )}
          >
            Kişisel
          </button>
          <button
            onClick={() => handleTabChange("system")}
            className={cn(
              "flex-1 py-3 text-[0.95rem] font-bold text-center border-b-[2.5px] transition-colors",
              activeTab === "system"
                ? "border-accent-main text-text-primary"
                : "border-transparent text-text-muted"
            )}
          >
            Sistem
          </button>
        </div>
      </div>

      <div>
        {/* Follow Requests Banner — only on social tab */}
        {activeTab === "social" && isPrivateAccount && followRequestCount > 0 && (
          <>
            <button
              onClick={() => setFollowRequestsOpen(true)}
              className="w-full flex items-center gap-3 mx-3 my-2 px-4 py-3.5 rounded-lg bg-bg-secondary hover:bg-bg-tertiary transition text-left"
              style={{ width: "calc(100% - 1.5rem)" }}
            >
              <div className="relative shrink-0" style={{ width: followRequestAvatars.length > 1 ? 40 + (followRequestAvatars.length - 1) * 12 : 40, height: 40 }}>
                {followRequestAvatars.length > 0 ? (
                  followRequestAvatars.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt=""
                      className="absolute top-0 h-10 w-10 rounded-full object-cover border border-bg-primary"
                      style={{ left: i * 12, zIndex: 3 - i }}
                    />
                  ))
                ) : (
                  <div className="h-10 w-10 rounded-full bg-accent-main/10 flex items-center justify-center">
                    <UserPlus className="h-5 w-5 text-accent-main" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Takip istekleri</p>
                <p className="text-xs text-text-muted">
                  {followRequestCount > 99 ? "99+" : followRequestCount} bekleyen istek
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="bg-accent-main text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                  {followRequestCount > 99 ? "99+" : followRequestCount}
                </span>
                <ChevronRight className="h-4 w-4 text-text-muted" />
              </div>
            </button>
            <div className="mx-3 mt-[5px] border-b border-border-primary/40" />
          </>
        )}

        {loading && notifications.length === 0 ? (
          <div className="flex justify-center py-8"><span className="loader" style={{ width: 22, height: 22 }} /></div>
        ) : notifications.length === 0 ? (
          <EmptyState
            title="Bildirim yok"
            description={activeTab === "social" ? "Yeni etkile\u015Fimler burada g\u00F6r\u00FCnecek." : "Sistem bildirimleri burada g\u00F6r\u00FCnecek."}
          />
        ) : (
          <>
            {hasUnread && (
              <div className="flex justify-end px-3 sm:px-4 py-2">
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1.5 text-xs font-medium text-accent-main hover:text-accent-main/80 transition"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  T{"\u00FC"}m{"\u00FC"}n{"\u00FC"} okundu yap
                </button>
              </div>
            )}

            {sections.map(section => (
              <div key={section.label}>
                <div className="px-4 pt-4 pb-2">
                  <h3 className="text-[0.78rem] font-bold text-text-muted uppercase tracking-wider">{section.label}</h3>
                </div>
                <div className="px-1.5">
                  {section.items.map(n => {
                    const link = getGroupedNotificationLink(n);

                    return (
                      <div
                        key={n.id}
                        className={cn(
                          "group relative flex items-center gap-3 py-3 px-3 my-[2px] rounded-[15px] transition",
                          !n.is_read ? "bg-accent-main/5" : "hover:bg-bg-secondary"
                        )}
                      >
                        {link && (
                          <Link href={link} className="absolute inset-0 z-0 rounded-[15px]" aria-label="Bildirime git" />
                        )}
                        {n.is_grouped && n.type === "follow" && (
                          <button onClick={() => setFollowGroupNotif(n)} className="absolute inset-0 z-0 rounded-[15px]" />
                        )}
                        {n.is_grouped && n.type === "like" && n.object_id && (
                          <button onClick={() => setLikeGroupPostId(n.object_id!)} className="absolute inset-0 z-0 rounded-[15px]" />
                        )}

                        {/* Left: Stacked avatars or icon */}
                        <div className="shrink-0 z-[1] pointer-events-none">
                          {n.is_grouped && n.actors && n.actors.length > 0 ? (
                            <div className="relative" style={{ width: Math.min(n.actors.length, 3) > 1 ? 40 + (Math.min(n.actors.length, 3) - 1) * 10 : 40, height: 40 }}>
                              {n.actors.slice(0, 3).map((actor, i) => (
                                <div key={i} className="absolute top-0" style={{ left: i * 10, zIndex: 3 - i }}>
                                  {actor.avatar_url ? (
                                    <img src={actor.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover border border-bg-primary" />
                                  ) : (
                                    <img className="default-avatar-auto h-10 w-10 rounded-full object-cover border border-bg-primary" alt="" />
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : n.actor?.avatar_url ? (
                            <img src={n.actor.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-bg-secondary flex items-center justify-center">
                              {iconMap[n.type] || <Bell className="h-4 w-4 text-text-muted" />}
                            </div>
                          )}
                        </div>

                        {/* Middle: Text */}
                        <div className="flex-1 min-w-0 z-[1] pointer-events-none">
                          <p className="text-sm leading-snug">
                            {getGroupedText(n)}
                          </p>
                          <p className="text-xs text-text-muted mt-0.5">{formatRelativeDate(n.latest_at)}</p>
                        </div>

                        {/* Right: Post thumbnail or unread dot */}
                        <div className="shrink-0 z-[1] pointer-events-none flex items-center gap-2">
                          {n.post_thumbnail && (
                            <img
                              src={n.post_thumbnail}
                              alt=""
                              className="h-10 w-10 rounded-[9px] object-cover"
                              loading="lazy"
                            />
                          )}
                          {!n.is_read && (
                            <div className="w-2 h-2 rounded-full bg-accent-main shrink-0" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <LoadMoreTrigger
              onLoadMore={() => loadNotifications(activeTab, page + 1)}
              loading={loading}
              hasMore={hasMore}
            />
          </>
        )}

        {/* Suggestions section — bottom of social tab when no more items */}
        {!hasMore && !loading && activeTab === "social" && suggestions.length > 0 && (
          <div className="px-3 sm:px-4 py-4 mt-2 border-t border-border-primary">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[0.9rem] font-bold">Ki{"\u015F"}ileri Bul</h3>
              <Link href="/suggestions" className="text-xs font-medium text-accent-main hover:text-accent-main/80 transition">
                T{"\u00FC"}m{"\u00FC"}n{"\u00FC"} G{"\u00F6"}r
              </Link>
            </div>
            <div className="space-y-0.5">
              {suggestions.map(user => (
                <UserListItem
                  key={user.user_id}
                  user={user}
                  autoSubtitle
                  action={
                    <FollowButton
                      following={followingSet.has(user.user_id)}
                      onClick={() => handleFollow(user.user_id)}
                    />
                  }
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Follow Requests Modal */}
      <FollowRequestsModal
        open={followRequestsOpen}
        onClose={() => {
          setFollowRequestsOpen(false);
          loadFollowRequestInfo();
        }}
      />

      {/* Grouped Follow Modal */}
      <UserListModal
        open={!!followGroupNotif}
        onClose={() => setFollowGroupNotif(null)}
        title="Takip Edenler"
        infoText="Sizi takip etmeye başlayan kişiler"
        fetchUrl={followGroupNotif ? `/api/notifications/actors?ids=${followGroupNotif.notification_ids.join(",")}` : ""}
        emptyText="Kişi bulunamadı"
        filterTabs={[]}
      />

      {/* Grouped Like Modal */}
      <LikesModal
        open={!!likeGroupPostId}
        onClose={() => setLikeGroupPostId(null)}
        postId={likeGroupPostId || 0}
      />
    </AppLayout>
  );
}

function getDefaultText(type: string): string {
  switch (type) {
    case "like": return "g\u00F6nderinizi be\u011Fendi";
    case "comment": return "g\u00F6nderinize yorum yapt\u0131";
    case "reply": return "yorumunuza yan\u0131t verdi";
    case "mention": return "sizden bahsetti";
    case "follow": return "sizi takip etmeye ba\u015Flad\u0131";
    case "follow_request": return "sizi takip etmek istiyor";
    case "follow_accepted": return "takip iste\u011Finizi kabul etti";
    case "comment_like": return "yorumunuzu be\u011Fendi";
    case "first_post": return "ilk g\u00F6nderisini yay\u0131nlad\u0131!";
    case "comeback_post": return "uzun bir aradan sonra yeni g\u00F6nderi yay\u0131nlad\u0131!";
    case "milestone": return "bir ba\u015Far\u0131ya ula\u015Ft\u0131n!";
    case "view_milestone": return "g\u00F6sterime ula\u015Ft\u0131!";
    case "coin_earned": return "Jeton kazand\u0131n";
    case "gift_received": return "sana hediye g\u00F6nderdi";
    case "premium_expired": return "premium \u00FCyeli\u011Finiz sona erdi";
    case "system": return "sistem bildirimi";
    case "device_login": return "yeni cihazdan giri\u015F yap\u0131ld\u0131";
    case "moderation_review": return "i\u00E7eri\u011Finiz inceleniyor";
    case "moderation_approved": return "i\u00E7eri\u011Finiz onayland\u0131";
    case "moderation_rejected": return "i\u00E7eri\u011Finiz kald\u0131r\u0131ld\u0131";
    case "account_moderation": return "hesab\u0131n\u0131z inceleme alt\u0131nda";
    case "copyright_detected": return "i\u00E7eri\u011Finize benzer bir g\u00F6nderi tespit edildi";
    default: return "";
  }
}
