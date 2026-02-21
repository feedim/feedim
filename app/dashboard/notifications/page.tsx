"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, Heart, MessageCircle, UserPlus, Award, Coins, Gift, AlertCircle, CheckCheck, Trash2, Sparkles, Undo2, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeDate } from "@/lib/utils";
import AppLayout from "@/components/AppLayout";
import EmptyState from "@/components/EmptyState";
import { NOTIFICATIONS_PAGE_SIZE } from "@/lib/constants";
import Link from "next/link";
import { NotificationListSkeleton } from "@/components/Skeletons";
import LoadMoreTrigger from "@/components/LoadMoreTrigger";
import FollowRequestsModal from "@/components/modals/FollowRequestsModal";
import { isBlockedContent } from "@/lib/blockedWords";
import { useUser } from "@/components/UserContext";

interface Notification {
  id: number;
  type: string;
  content?: string;
  object_id?: number;
  object_type?: string;
  is_read: boolean;
  created_at: string;
  actor_id?: string;
  actor?: {
    username: string;
    full_name?: string;
    name?: string;
    avatar_url?: string;
  } | null;
  post_slug?: string;
}

const iconMap: Record<string, React.ReactNode> = {
  like: <Heart className="h-4 w-4 text-error" />,
  comment: <MessageCircle className="h-4 w-4 text-accent-main" />,
  reply: <MessageCircle className="h-4 w-4 text-accent-main" />,
  mention: <MessageCircle className="h-4 w-4 text-accent-main" />,
  follow: <UserPlus className="h-4 w-4 text-text-primary" />,
  follow_request: <UserPlus className="h-4 w-4 text-text-primary" />,
  follow_accepted: <UserPlus className="h-4 w-4 text-text-primary" />,
  milestone: <Award className="h-4 w-4 text-warning" />,
  coin_earned: <Coins className="h-4 w-4 text-accent-main" />,
  gift_received: <Gift className="h-4 w-4 text-text-primary" />,
  first_post: <Sparkles className="h-4 w-4 text-success" />,
  comeback_post: <Undo2 className="h-4 w-4 text-info" />,
  system: <AlertCircle className="h-4 w-4 text-text-muted" />,
};

function getNotificationLink(n: Notification): string | null {
  if (n.type === "follow" && n.actor?.username) return `/u/${n.actor.username}`;
  if (n.type === "follow_request" && n.actor?.username) return `/u/${n.actor.username}`;
  if (n.type === "follow_accepted" && n.actor?.username) return `/u/${n.actor.username}`;
  if ((n.type === "like" || n.type === "comment" || n.type === "reply" || n.type === "mention" || n.type === "first_post" || n.type === "comeback_post" || n.type === "milestone") && n.post_slug) {
    return `/post/${n.post_slug}`;
  }
  return null;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const supabase = createClient();
  const { user: ctxUser } = useUser();

  // Follow requests state
  const [followRequestCount, setFollowRequestCount] = useState(0);
  const [followRequestAvatars, setFollowRequestAvatars] = useState<string[]>([]);
  const [followRequestsOpen, setFollowRequestsOpen] = useState(false);
  const [isPrivateAccount, setIsPrivateAccount] = useState(false);

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

  const loadNotifications = useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const from = (pageNum - 1) * NOTIFICATIONS_PAGE_SIZE;
      const to = from + NOTIFICATIONS_PAGE_SIZE - 1;

      // Only show notifications from the last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const items = data || [];
      setHasMore(items.length >= NOTIFICATIONS_PAGE_SIZE);

      // Load actor profiles
      const actorIds = [...new Set(items.filter(n => n.actor_id).map(n => n.actor_id))];
      let actorMap = new Map();
      if (actorIds.length > 0) {
        const { data: actors } = await supabase
          .from("profiles")
          .select("user_id, name, full_name, username, avatar_url")
          .in("user_id", actorIds);
        if (actors) {
          actorMap = new Map(actors.map(a => [a.user_id, a]));
        }
      }

      // Load post slugs for post-related notifications
      const postIds = [...new Set(items.filter(n => n.object_id && n.object_type === "post").map(n => n.object_id))];
      let postMap = new Map();
      if (postIds.length > 0) {
        const { data: posts } = await supabase
          .from("posts")
          .select("id, slug")
          .in("id", postIds);
        if (posts) {
          postMap = new Map(posts.map(p => [p.id, p.slug]));
        }
      }

      const enriched = items.map(n => ({
        ...n,
        actor: n.actor_id ? actorMap.get(n.actor_id) || null : null,
        post_slug: n.object_id && n.object_type === "post" ? postMap.get(n.object_id) || null : null,
      }));

      if (pageNum === 1) {
        setNotifications(enriched);
      } else {
        setNotifications(prev => [...prev, ...enriched]);
      }

      // Mark as read
      const unreadIds = items.filter(n => !n.is_read).map(n => n.id);
      if (unreadIds.length > 0) {
        await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
      }
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications", { method: "PUT" });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch {}
  };

  const deleteNotification = async (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      await fetch(`/api/notifications?id=${id}`, { method: "DELETE" });
    } catch {
      loadNotifications(1);
    }
  };

  useEffect(() => {
    loadNotifications(1);
    loadFollowRequestInfo();
  }, []);

  const hasUnread = notifications.some(n => !n.is_read);

  return (
    <AppLayout headerTitle="Bildirimler" hideRightSidebar>
      <div>
        {/* Follow Requests Banner */}
        {isPrivateAccount && followRequestCount > 0 && (
          <>
            <button
              onClick={() => setFollowRequestsOpen(true)}
              className="w-full flex items-center gap-3 mx-3 my-2 px-4 py-3.5 rounded-lg bg-bg-secondary hover:bg-bg-tertiary transition text-left"
              style={{ width: "calc(100% - 1.5rem)" }}
            >
              {/* Stacked avatars */}
              <div className="relative shrink-0" style={{ width: followRequestAvatars.length > 1 ? 40 + (followRequestAvatars.length - 1) * 12 : 40, height: 40 }}>
                {followRequestAvatars.length > 0 ? (
                  followRequestAvatars.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt=""
                      className="absolute top-0 h-10 w-10 rounded-full object-cover border-2 border-bg-primary"
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
          <NotificationListSkeleton count={5} />
        ) : notifications.length === 0 && !(isPrivateAccount && followRequestCount > 0) ? (
          /* empty state below */
          <EmptyState
            title="Bildirim yok"
            description="Yeni bildirimler burada görünecek."
          />
        ) : (
          <>
            {hasUnread && (
              <div className="flex justify-end px-3 sm:px-4 py-2 border-b border-border-primary">
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1.5 text-xs font-medium text-accent-main hover:text-accent-main/80 transition"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Tümünü okundu yap
                </button>
              </div>
            )}
            <div className="px-1.5">
              {notifications.filter(n => n.actor_id === ctxUser?.id || !isBlockedContent(n.content || "")).map((n) => {
                const actorName = n.actor?.username ? `@${n.actor.username}` : "Birisi";
                const link = getNotificationLink(n);
                const Wrapper = link ? Link : "div";
                const wrapperProps = link ? { href: link } : {};

                return (
                  <Wrapper
                    key={n.id}
                    {...wrapperProps as any}
                    className={`group flex gap-3 py-3.5 px-4 my-[5px] rounded-[15px] transition ${!n.is_read ? "bg-accent-main/5" : "hover:bg-bg-secondary"}`}
                  >
                    {/* Avatar or icon */}
                    {n.actor?.avatar_url ? (
                      <img src={n.actor.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-bg-secondary flex items-center justify-center shrink-0">
                        {iconMap[n.type] || <Bell className="h-4 w-4 text-text-muted" />}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-snug">
                        <span className="font-semibold">{actorName}</span>{" "}
                        <span className="text-text-muted">{n.content || getDefaultText(n.type)}</span>
                      </p>
                      <p className="text-xs text-text-muted mt-1">{formatRelativeDate(n.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!n.is_read && (
                        <div className="w-2 h-2 rounded-full bg-accent-main" />
                      )}
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteNotification(n.id); }}
                        className="opacity-0 group-hover:opacity-100 p-2 rounded-full hover:bg-bg-secondary transition text-text-muted hover:text-error"
                        title="Sil"
                      >
                        <Trash2 className="h-[18px] w-[18px]" />
                      </button>
                    </div>
                  </Wrapper>
                );
              })}
            </div>

            <LoadMoreTrigger onLoadMore={() => { const next = page + 1; setPage(next); loadNotifications(next); }} loading={loading} hasMore={hasMore} />
          </>
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
    </AppLayout>
  );
}

function getDefaultText(type: string): string {
  switch (type) {
    case "like": return "gönderini beğendi";
    case "comment": return "gönderine yorum yaptı";
    case "reply": return "yorumuna yanıt verdi";
    case "mention": return "senden bahsetti";
    case "follow": return "seni takip etmeye başladı";
    case "follow_request": return "seni takip etmek istiyor";
    case "follow_accepted": return "takip isteğini kabul etti";
    case "first_post": return "ilk gönderisini yayınladı!";
    case "comeback_post": return "uzun bir aradan sonra yeni gönderi yayınladı!";
    case "milestone": return "bir başarıya ulaştın!";
    case "coin_earned": return "Jeton kazandın";
    case "gift_received": return "sana hediye gönderdi";
    case "premium_expired": return "premium üyeliğiniz sona erdi";
    case "system": return "sistem bildirimi";
    default: return "";
  }
}
