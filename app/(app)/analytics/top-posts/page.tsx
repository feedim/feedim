"use client";

import { useState, useEffect, useLayoutEffect, useCallback } from "react";
import Link from "next/link";
import { Eye, Heart, MessageCircle, Bookmark, Award, Film, Play, FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import AppLayout from "@/components/AppLayout";
import { formatCount } from "@/lib/utils";
import { useUser } from "@/components/UserContext";
import { fetchWithCache, readCache, withCacheScope } from "@/lib/fetchWithCache";
import { FRESHNESS_WINDOWS } from "@/lib/freshnessPolicy";

interface PostData {
  id: string;
  title: string;
  slug: string;
  views: number;
  likes: number;
  comments: number;
  saves: number;
  featured_image?: string;
  published_at: string;
  content_type?: string;
}

function ContentTypeIcon({ type }: { type?: string }) {
  switch (type) {
    case "video": return <Film className="w-5 h-5 text-purple-500" />;
    case "moment": return <Play className="w-5 h-5 text-accent-main" />;
    case "note": return <FileText className="w-5 h-5 text-blue-500" />;
    default: return <FileText className="w-5 h-5 text-text-muted" />;
  }
}

export default function TopPostsPage() {
  const t = useTranslations("analytics");
  const { user: currentUser } = useUser();
  const [loading, setLoading] = useState(true);
  const [allPosts, setAllPosts] = useState<PostData[]>([]);
  const tz = encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const analyticsUrl = withCacheScope(`/api/analytics?period=30d&tz=${tz}`, currentUser?.id ? `viewer:${currentUser.id}` : "guest");

  useLayoutEffect(() => {
    const cached = readCache(analyticsUrl) as { allPosts?: PostData[] } | null;
    if (cached?.allPosts) {
      setAllPosts(cached.allPosts);
      setLoading(false);
    }
  }, [analyticsUrl]);

  const loadPosts = useCallback(async () => {
    if (!readCache(analyticsUrl)) setLoading(true);
    try {
      const data = await fetchWithCache(analyticsUrl, { ttlSeconds: FRESHNESS_WINDOWS.analyticsOverview }) as { allPosts?: PostData[] };
      setAllPosts(data.allPosts || []);
    } catch {} finally { setLoading(false); }
  }, [analyticsUrl]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const maxViews = allPosts.length > 0 ? allPosts[0].views : 1;

  return (
    <AppLayout headerTitle={t("topPosts")} hideRightSidebar>
      <div className="pb-10">
        <div className="px-4 py-3">
          <h2 className="text-[0.82rem] font-semibold flex items-center gap-1.5">
            <Award className="h-4 w-4 text-text-muted" /> {t("topPosts")}
          </h2>
        </div>

        {loading ? (
          <div className="space-y-0 px-4">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex items-center gap-3 py-3 border-b border-border-primary/30">
                <div className="h-[10px] w-5 bg-bg-secondary rounded-[5px] animate-pulse" />
                <div className="flex-1 space-y-[5px]">
                  <div className="h-[10px] w-[60%] bg-bg-secondary rounded-[5px] animate-pulse" />
                  <div className="h-[8px] w-20 bg-bg-secondary rounded-[5px] animate-pulse" />
                </div>
                <div className="h-[10px] w-12 bg-bg-secondary rounded-[5px] animate-pulse" />
              </div>
            ))}
          </div>
        ) : allPosts.length === 0 ? (
          <div className="px-4 py-20 text-center">
            <p className="text-sm text-text-muted">{t("noDataYet")}</p>
          </div>
        ) : (
          <div>
            {allPosts.map((post, i) => {
              const barWidth = maxViews > 0 ? Math.max((post.views / maxViews) * 100, 6) : 6;
              return (
                <Link
                  key={post.id}
                  href={`/${post.slug}`}
                  className="flex items-center gap-3 mx-4 mb-2 px-3 py-3 rounded-xl border border-border-primary/20 hover:bg-bg-secondary transition group"
                >
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold text-text-muted w-5 text-center">{i + 1}</span>
                    <ContentTypeIcon type={post.content_type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.84rem] font-medium truncate group-hover:text-accent-main transition">{post.title}</p>
                    <div className="mt-1.5 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                      <div className="h-full bg-accent-main rounded-full transition-all duration-500" style={{ width: `${barWidth}%` }} />
                    </div>
                    <div className="flex items-center gap-2.5 mt-1">
                      <span className="flex items-center gap-0.5 text-[0.66rem] text-text-muted"><Eye className="h-2.5 w-2.5" /> {formatCount(post.views)}</span>
                      <span className="flex items-center gap-0.5 text-[0.66rem] text-text-muted"><Heart className="h-2.5 w-2.5" /> {formatCount(post.likes)}</span>
                      <span className="flex items-center gap-0.5 text-[0.66rem] text-text-muted"><MessageCircle className="h-2.5 w-2.5" /> {formatCount(post.comments)}</span>
                      <span className="flex items-center gap-0.5 text-[0.66rem] text-text-muted"><Bookmark className="h-2.5 w-2.5" /> {formatCount(post.saves)}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
