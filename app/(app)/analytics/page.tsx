"use client";

import { useSearchParams } from "next/navigation";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Heart, MessageCircle, Bookmark, Users, TrendingUp,
  FileText, Eye, Briefcase, ArrowUpRight, ArrowDownRight, Minus, ChevronRight,
  BarChart3, Activity, Clock, CalendarDays, Zap, Award, ChevronDown, ChevronUp,
  Coins, Film, Play, CheckCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import AppLayout from "@/components/AppLayout";
import NoImage from "@/components/NoImage";
import ShareIcon from "@/components/ShareIcon";
import { formatCount, formatRelativeDate } from "@/lib/utils";
import { isProfessional } from "@/lib/professional";
import { Lock } from "lucide-react";
import { useUser } from "@/components/UserContext";

/* ─── Types ─── */
interface OverviewData {
  totalViews: number; totalLikes: number; totalComments: number; totalSaves: number;
  totalShares: number; followerCount: number; followingCount: number;
  newFollowers: number; postCount: number; engagementRate: number;
  avgViewsPerPost: number; avgLikesPerPost: number; avgCommentsPerPost: number; avgReadingTime: number;
}
interface PeriodCounts { views: number; likes: number; comments: number; saves: number; shares: number; followers: number }
interface DayData { date: string; count: number }
interface HourData { hour: number; count: number }
interface WeekdayData { day: number; views: number; likes: number }
interface PostData { id: string; title: string; slug: string; views: number; likes: number; comments: number; saves: number; featured_image?: string; published_at: string }
interface EarningsData { coinBalance: number; totalEarned: number; periodEarned: number; qualifiedReads: number; premiumReads: number }
interface VideoAnalyticsData {
  videoCount: number; totalWatchHours: number; avgWatchDuration: number;
  avgWatchPercentage: number; completionRate: number; totalWatchers: number;
  topVideos: { id: string; title: string; slug: string; featured_image?: string; views: number; watchHours: number; video_duration?: number }[];
}
type ChartMetric = "views" | "likes" | "comments" | "followers";

// Weekday names will be provided by translations

/* ─── Smart percentage: no absurd 100%/600% ─── */
function smartChange(current: number, previous: number): { text: string; isUp: boolean; show: boolean } {
  const diff = current - previous;
  if (diff === 0) return { text: "", isUp: true, show: false };

  // If previous is 0, show absolute change instead of %
  if (previous === 0) {
    return { text: `+${current}`, isUp: true, show: current > 0 };
  }

  const pct = Math.round(((current - previous) / previous) * 100);

  // Cap at ±99% for display sanity
  const cappedPct = Math.min(Math.abs(pct), 99);
  const sign = diff > 0 ? "+" : "-";

  return { text: `${sign}${cappedPct}%`, isUp: diff > 0, show: true };
}

/* ─────────────────────────────────────
   Main Page
───────────────────────────────────── */
export default function AnalyticsPage() {
  useSearchParams();
  const t = useTranslations("analytics");
  const { user: ctxUser, isLoggedIn } = useUser();
  const authorized = isLoggedIn ? (ctxUser?.isPremium ?? false) : false;
  const isPro = isProfessional(ctxUser?.accountType);

  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30d");
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [periodCounts, setPeriodCounts] = useState<PeriodCounts | null>(null);
  const [prev, setPrev] = useState<PeriodCounts | null>(null);
  const [viewsByDay, setViewsByDay] = useState<DayData[]>([]);
  const [likesByDay, setLikesByDay] = useState<DayData[]>([]);
  const [commentsByDay, setCommentsByDay] = useState<DayData[]>([]);
  const [followersByDay, setFollowersByDay] = useState<DayData[]>([]);
  const [peakHours, setPeakHours] = useState<HourData[]>([]);
  const [weekdayBreakdown, setWeekdayBreakdown] = useState<WeekdayData[]>([]);
  const [topPosts, setTopPosts] = useState<PostData[]>([]);
  const [allPosts, setAllPosts] = useState<PostData[]>([]);
  const [chartMetric, setChartMetric] = useState<ChartMetric>("views");
  const [showAllPosts, setShowAllPosts] = useState(false);
  const [earnings, setEarnings] = useState<EarningsData>({ coinBalance: 0, totalEarned: 0, periodEarned: 0, qualifiedReads: 0, premiumReads: 0 });
  const [videoAnalytics, setVideoAnalytics] = useState<VideoAnalyticsData | null>(null);

  const loadAnalytics = useCallback(async (p: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?period=${p}`);
      const data = await res.json();
      setOverview(data.overview); setPeriodCounts(data.periodCounts); setPrev(data.prev);
      setViewsByDay(data.viewsByDay || []); setLikesByDay(data.likesByDay || []);
      setCommentsByDay(data.commentsByDay || []); setFollowersByDay(data.followersByDay || []);
      setPeakHours(data.peakHours || []); setWeekdayBreakdown(data.weekdayBreakdown || []);
      setTopPosts(data.topPosts || []); setAllPosts(data.allPosts || []);
      setEarnings(data.earnings || { coinBalance: 0, totalEarned: 0, periodEarned: 0, qualifiedReads: 0, premiumReads: 0 });
      setVideoAnalytics(data.videoAnalytics || null);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (authorized) loadAnalytics(period);
  }, [period, loadAnalytics, authorized]);

  if (!authorized) return (
    <AppLayout headerTitle={t("title")} hideRightSidebar>
      <div className="px-4 py-20 text-center">
        <div className="w-14 h-14 rounded-full bg-accent-main/10 flex items-center justify-center mx-auto mb-4">
          <Lock className="h-7 w-7 text-accent-main" />
        </div>
        <h2 className="text-lg font-bold mb-2">{t("premiumRequired")}</h2>
        <p className="text-sm text-text-muted mb-6 leading-relaxed">{t("premiumRequiredDesc")}</p>
        <Link href="/settings/premium" className="t-btn accept inline-flex">{t("goPremium")}</Link>
      </div>
    </AppLayout>
  );

  const periodLabel = period === "7d" ? t("period7d") : period === "30d" ? t("period30d") : t("period90d");
  const WEEKDAY_NAMES = [t("weekdaySun"), t("weekdayMon"), t("weekdayTue"), t("weekdayWed"), t("weekdayThu"), t("weekdayFri"), t("weekdaySat")];
  const hasData = (overview?.postCount || 0) > 0;

  return (
    <AppLayout headerTitle={t("title")} hideRightSidebar>
      <div className="pb-10">
        {/* Period tabs */}
        <div className="flex items-center gap-1 px-4 py-3 sticky top-0 z-10 bg-bg-primary sticky-ambient">
          {(["7d", "30d", "90d"] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-full text-[0.8rem] font-semibold transition ${period === p ? "bg-text-primary text-bg-primary" : "text-text-muted hover:text-text-primary"}`}
            >{p === "7d" ? t("period7d") : p === "30d" ? t("period30d") : t("period90d")}</button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><span className="loader" style={{ width: 22, height: 22 }} /></div>
        ) : !hasData ? (
          <div className="px-4 py-20 text-center">
            <TrendingUp className="h-14 w-14 text-text-muted mx-auto mb-4" />
            <p className="text-lg font-bold">{t("noDataYet")}</p>
            <p className="text-sm text-text-muted mt-2 leading-relaxed whitespace-pre-line">{t("noDataDesc")}</p>
            <Link href="/create" className="t-btn accept inline-flex mt-6">{t("createPost")}</Link>
          </div>
        ) : (
          <>
            {/* 1. Earnings Card */}
            <EarningsCard earnings={earnings} periodLabel={periodLabel} isPro={isPro} />

            {/* 2. Hero Summary */}
            <HeroCard overview={overview} periodCounts={periodCounts} prev={prev} periodLabel={periodLabel} />

            {/* 3. Metric Grid */}
            <div className="grid grid-cols-2 gap-2.5 mx-4 mt-4">
              <MetricCard icon={Eye} label={t("views")} value={periodCounts?.views || 0} prev={prev?.views || 0} prevLabel={t("previousPeriod", { value: "" })} />
              <MetricCard icon={Heart} label={t("likes")} value={periodCounts?.likes || 0} prev={prev?.likes || 0} prevLabel={t("previousPeriod", { value: "" })} />
              <MetricCard icon={MessageCircle} label={t("comments")} value={periodCounts?.comments || 0} prev={prev?.comments || 0} prevLabel={t("previousPeriod", { value: "" })} />
              <MetricCard icon={Bookmark} label={t("saves")} value={periodCounts?.saves || 0} prev={prev?.saves || 0} prevLabel={t("previousPeriod", { value: "" })} />
              <MetricCard icon={ShareIcon} label={t("shares")} value={periodCounts?.shares || 0} prev={prev?.shares || 0} prevLabel={t("previousPeriod", { value: "" })} />
              <MetricCard icon={Users} label={t("newFollowers")} value={periodCounts?.followers || 0} prev={prev?.followers || 0} prevLabel={t("previousPeriod", { value: "" })} />
            </div>

            {/* 4. Quick Stats Row */}
            <div className="flex gap-2 mx-4 mt-3 overflow-x-auto no-scrollbar">
              <QuickStat icon={FileText} label={t("posts")} value={String(overview?.postCount || 0)} />
              <QuickStat icon={Users} label={t("followers")} value={formatCount(overview?.followerCount || 0)} />
              <QuickStat icon={Activity} label={t("engagement")} value={`${Math.min(overview?.engagementRate || 0, 99)}%`} />
              <QuickStat icon={Eye} label={t("avgRead")} value={formatCount(overview?.avgViewsPerPost || 0)} />
              <QuickStat icon={Clock} label={t("avgDuration")} value={`${overview?.avgReadingTime || 0} ${t("min")}`} />
              <QuickStat icon={Heart} label={t("avgLikes")} value={String(overview?.avgLikesPerPost || 0)} />
            </div>

            {/* 5. Chart */}
            <ChartSection
              chartMetric={chartMetric} setChartMetric={setChartMetric}
              viewsByDay={viewsByDay} likesByDay={likesByDay}
              commentsByDay={commentsByDay} followersByDay={followersByDay}
            />

            {/* 6. Peak Hours Heatmap */}
            {peakHours.some(h => h.count > 0) && <PeakHoursCard peakHours={peakHours} />}

            {/* 7. Weekday Breakdown */}
            {weekdayBreakdown.some(w => w.views > 0 || w.likes > 0) && <WeekdayCard weekdayBreakdown={weekdayBreakdown} />}

            {/* 8. Insights */}
            <InsightsCard
              overview={overview} periodCounts={periodCounts} prev={prev}
              peakHours={peakHours} weekdayBreakdown={weekdayBreakdown}
              periodLabel={periodLabel}
            />

            {/* 9. Video Analytics */}
            {videoAnalytics && <VideoAnalyticsCard data={videoAnalytics} periodLabel={periodLabel} />}

            {/* 10. Top Posts */}
            {topPosts.length > 0 && (
              <Section icon={Award} title={t("topPosts")}>
                {topPosts.map((post, i) => (
                  <TopPostRow key={post.id} post={post} rank={i + 1} maxViews={topPosts[0].views} />
                ))}
              </Section>
            )}

            {/* 10. All Posts */}
            {allPosts.length > 5 && (
              <div className="mt-2">
                <button
                  onClick={() => setShowAllPosts(!showAllPosts)}
                  className="flex items-center gap-2 px-4 py-3 w-full text-left text-[0.82rem] font-semibold text-accent-main hover:bg-bg-secondary transition"
                >
                  {showAllPosts ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  {showAllPosts ? t("showLess") : t("showAllPosts", { count: allPosts.length })}
                </button>
                {showAllPosts && (
                  <div>
                    {allPosts.slice(5).map((post, i) => (
                      <TopPostRow key={post.id} post={post} rank={i + 6} maxViews={allPosts[0].views} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}

/* ─────────────────────────────────────
   Section Wrapper
───────────────────────────────────── */
function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h3 className="px-4 text-[0.82rem] font-semibold flex items-center gap-1.5 mb-2">
        <Icon className="h-4 w-4 text-text-muted" /> {title}
      </h3>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────
   Earnings Card
───────────────────────────────────── */
function EarningsCard({ earnings, periodLabel, isPro }: { earnings: EarningsData; periodLabel: string; isPro: boolean }) {
  const t = useTranslations("analytics");
  if (!isPro) {
    return (
      <div className="mx-4 mb-4 rounded-2xl overflow-hidden bg-gradient-to-r from-accent-main/10 via-accent-main/5 to-transparent relative">
        <div className="p-4 opacity-30 pointer-events-none select-none">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-accent-main/15 flex items-center justify-center shrink-0">
              <Coins className="h-5 w-5 text-accent-main" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[0.72rem] text-text-muted">{t("tokenBalance")}</p>
              <p className="text-xl font-extrabold">0 <span className="text-sm font-semibold text-text-muted">{t("token")}</span></p>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3 ml-15">
            <div><p className="text-[0.62rem] text-text-muted">{t("last", { period: periodLabel })}</p><p className="text-sm font-bold">0</p></div>
            <div className="w-px h-6 bg-border-primary" />
            <div><p className="text-[0.62rem] text-text-muted">{t("total")}</p><p className="text-sm font-bold">0</p></div>
          </div>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-accent-main/10 flex items-center justify-center mx-auto mb-2">
            <Lock className="h-7 w-7 text-accent-main" />
          </div>
          <p className="text-[0.78rem] font-semibold text-text-primary">{t("proAccountRequired")}</p>
          <Link href="/settings" className="text-[0.68rem] text-accent-main font-medium mt-1">{t("goToSettings")}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-4 mb-4 rounded-2xl overflow-hidden bg-gradient-to-r from-accent-main/10 via-accent-main/5 to-transparent">
      <div className="p-4">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-accent-main/15 flex items-center justify-center shrink-0">
            <Coins className="h-5 w-5 text-accent-main" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[0.72rem] text-text-muted">{t("tokenBalance")}</p>
            <p className="text-xl font-extrabold">{formatCount(earnings.coinBalance)} <span className="text-sm font-semibold text-text-muted">{t("token")}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-3 ml-15">
          <div>
            <p className="text-[0.62rem] text-text-muted">{t("last", { period: periodLabel })}</p>
            <p className="text-sm font-bold">+{formatCount(earnings.periodEarned)}</p>
          </div>
          <div className="w-px h-6 bg-border-primary" />
          <div>
            <p className="text-[0.62rem] text-text-muted">{t("totalEarnings")}</p>
            <p className="text-sm font-bold">{formatCount(earnings.totalEarned)}</p>
          </div>
          <div className="w-px h-6 bg-border-primary" />
          <div>
            <p className="text-[0.62rem] text-text-muted">{t("qualifiedReads")}</p>
            <p className="text-sm font-bold">{formatCount(earnings.qualifiedReads)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────
   Hero Card
───────────────────────────────────── */
function HeroCard({ overview, periodCounts, prev, periodLabel }: {
  overview: OverviewData | null; periodCounts: PeriodCounts | null; prev: PeriodCounts | null; periodLabel: string;
}) {
  const t = useTranslations("analytics");
  const reach = periodCounts?.views || 0;
  const prevReach = prev?.views || 0;
  const engagement = (periodCounts?.likes || 0) + (periodCounts?.comments || 0) + (periodCounts?.saves || 0) + (periodCounts?.shares || 0);
  const prevEngagement = (prev?.likes || 0) + (prev?.comments || 0) + (prev?.saves || 0) + (prev?.shares || 0);
  const followers = periodCounts?.followers || 0;
  const prevFollowersVal = prev?.followers || 0;

  return (
    <div className="mx-4 rounded-2xl overflow-hidden bg-gradient-to-br from-accent-main/12 via-accent-main/5 to-transparent">
      <div className="p-5">
        <p className="text-[0.72rem] text-text-muted font-medium uppercase tracking-wider mb-4">{t("last", { period: periodLabel })}</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-[1.75rem] font-extrabold leading-none">{formatCount(reach)}</p>
            <p className="text-[0.7rem] text-text-muted mt-1">{t("reach")}</p>
            <ChangeBadge current={reach} previous={prevReach} />
          </div>
          <div>
            <p className="text-[1.75rem] font-extrabold leading-none">{formatCount(engagement)}</p>
            <p className="text-[0.7rem] text-text-muted mt-1">{t("engagement")}</p>
            <ChangeBadge current={engagement} previous={prevEngagement} />
          </div>
          <div>
            <p className="text-[1.75rem] font-extrabold leading-none">+{formatCount(followers)}</p>
            <p className="text-[0.7rem] text-text-muted mt-1">{t("followers")}</p>
            <ChangeBadge current={followers} previous={prevFollowersVal} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────
   Change Badge (accent color, smart %)
───────────────────────────────────── */
function ChangeBadge({ current, previous }: { current: number; previous: number }) {
  const change = smartChange(current, previous);
  if (!change.show) return null;
  return (
    <span className={`inline-flex items-center gap-0.5 mt-1.5 text-[0.62rem] font-bold px-1.5 py-0.5 rounded-full ${
      change.isUp ? "bg-accent-main/10 text-accent-main" : "bg-error/10 text-error"
    }`}>
      {change.isUp ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
      {change.text}
    </span>
  );
}

/* ─────────────────────────────────────
   Metric Card
───────────────────────────────────── */
function MetricCard({ icon: Icon, label, value, prev, prevLabel }: { icon: any; label: string; value: number; prev: number; prevLabel?: string }) {
  const t = useTranslations("analytics");
  const change = smartChange(value, prev);
  return (
    <div className="bg-bg-secondary rounded-[15px] p-3.5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-text-muted" />
          <span className="text-[0.72rem] text-text-muted">{label}</span>
        </div>
        {change.show && (
          <span className={`text-[0.62rem] font-bold flex items-center gap-0.5 px-1.5 py-0.5 rounded-full ${change.isUp ? "bg-accent-main/10 text-accent-main" : "bg-error/10 text-error"}`}>
            {change.isUp ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
            {change.text}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold">{formatCount(value)}</p>
      {prev > 0 && <p className="text-[0.62rem] text-text-muted mt-0.5">{t("previousPeriod", { value: formatCount(prev) })}</p>}
    </div>
  );
}

/* ─────────────────────────────────────
   Quick Stat Pill
───────────────────────────────────── */
function QuickStat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 bg-bg-secondary rounded-full px-3.5 py-2 shrink-0">
      <Icon className="h-3.5 w-3.5 text-text-muted" />
      <span className="text-[0.72rem] font-bold whitespace-nowrap">{value}</span>
      <span className="text-[0.65rem] text-text-muted whitespace-nowrap">{label}</span>
    </div>
  );
}

/* ─────────────────────────────────────
   Chart
───────────────────────────────────── */
function ChartSection({ chartMetric, setChartMetric, viewsByDay, likesByDay, commentsByDay, followersByDay }: {
  chartMetric: ChartMetric; setChartMetric: (m: ChartMetric) => void;
  viewsByDay: DayData[]; likesByDay: DayData[]; commentsByDay: DayData[]; followersByDay: DayData[];
}) {
  const t = useTranslations("analytics");
  const dataMap: Record<ChartMetric, DayData[]> = { views: viewsByDay, likes: likesByDay, comments: commentsByDay, followers: followersByDay };
  const labelMap: Record<ChartMetric, string> = { views: t("views"), likes: t("likes"), comments: t("comments"), followers: t("followers") };
  const chartData = dataMap[chartMetric];
  const maxCount = Math.max(...chartData.map(d => d.count), 1);
  const total = chartData.reduce((s, d) => s + d.count, 0);
  const avg = chartData.length > 0 ? Math.round(total / chartData.length * 10) / 10 : 0;

  if (chartData.length === 0) return null;

  return (
    <div className="mx-4 mt-5">
      <div className="bg-bg-secondary rounded-[15px] p-4">
        <div className="flex items-center gap-1 mb-1 overflow-x-auto no-scrollbar">
          {(Object.keys(labelMap) as ChartMetric[]).map(m => (
            <button key={m} onClick={() => setChartMetric(m)}
              className={`px-3 py-1 rounded-full text-[0.72rem] font-medium transition whitespace-nowrap ${chartMetric === m ? "bg-text-primary text-bg-primary" : "text-text-muted hover:text-text-primary"}`}
            >{labelMap[m]}</button>
          ))}
        </div>
        <div className="flex items-end gap-3 mt-2 mb-4">
          <span className="text-2xl font-bold">{formatCount(total)}</span>
          <span className="text-[0.72rem] text-text-muted mb-0.5">{t("chartTotal")}</span>
          <span className="text-[0.72rem] text-text-muted mb-0.5">{t("chartAvgPerDay", { avg })}</span>
        </div>

        <div className="flex items-end gap-[1.5px] h-36">
          {chartData.map((d, i) => {
            const height = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
            const isToday = i === chartData.length - 1;
            return (
              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-text-primary text-bg-primary text-[10px] font-semibold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none z-10 shadow-md">
                  <span className="block text-center">{d.count}</span>
                  <span className="block text-center text-[8px] opacity-70">{new Date(d.date).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}</span>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-text-primary" />
                </div>
                <div
                  className={`w-full rounded-t-[2px] transition-all duration-200 ${isToday ? "bg-accent-main" : "bg-accent-main/50 group-hover:bg-accent-main/80"}`}
                  style={{ height: `${Math.max(height, 1.5)}%` }}
                />
              </div>
            );
          })}
        </div>

        <div className="flex justify-between mt-2.5">
          <span className="text-[10px] text-text-muted">{chartData.length > 0 && new Date(chartData[0].date).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}</span>
          {chartData.length > 14 && <span className="text-[10px] text-text-muted">{new Date(chartData[Math.floor(chartData.length / 2)].date).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}</span>}
          <span className="text-[10px] text-text-muted">{chartData.length > 0 && new Date(chartData[chartData.length - 1].date).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────
   Peak Hours Heatmap
───────────────────────────────────── */
function PeakHoursCard({ peakHours }: { peakHours: HourData[] }) {
  const t = useTranslations("analytics");
  const maxH = Math.max(...peakHours.map(h => h.count), 1);
  const peakHour = peakHours.reduce((a, b) => a.count > b.count ? a : b);

  return (
    <div className="mx-4 mt-5">
      <div className="bg-bg-secondary rounded-[15px] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[0.82rem] font-semibold flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-text-muted" /> {t("activeHours")}
          </h3>
          <span className="text-[0.68rem] text-text-muted">{t("peakHour", { hour: String(peakHour.hour).padStart(2, "0") })}</span>
        </div>
        <div className="grid grid-cols-12 gap-1">
          {peakHours.slice(0, 24).map(h => {
            const intensity = maxH > 0 ? h.count / maxH : 0;
            return (
              <div key={h.hour} className="flex flex-col items-center gap-1 group relative">
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-text-primary text-bg-primary text-[9px] font-medium px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none z-10">
                  {h.count}
                </div>
                <div
                  className="w-full aspect-square rounded-[3px] transition-colors"
                  style={{
                    backgroundColor: intensity === 0
                      ? "var(--bg-tertiary)"
                      : `color-mix(in srgb, var(--accent-main) ${Math.round(intensity * 100)}%, var(--bg-tertiary))`,
                  }}
                />
                {h.hour % 3 === 0 && (
                  <span className="text-[8px] text-text-muted leading-none">{String(h.hour).padStart(2, "0")}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────
   Weekday Breakdown
───────────────────────────────────── */
function WeekdayCard({ weekdayBreakdown }: { weekdayBreakdown: WeekdayData[] }) {
  const t = useTranslations("analytics");
  const WEEKDAY_NAMES = [t("weekdaySun"), t("weekdayMon"), t("weekdayTue"), t("weekdayWed"), t("weekdayThu"), t("weekdayFri"), t("weekdaySat")];
  const maxViews = Math.max(...weekdayBreakdown.map(w => w.views), 1);
  const bestDay = weekdayBreakdown.reduce((a, b) => a.views > b.views ? a : b);

  return (
    <div className="mx-4 mt-4">
      <div className="bg-bg-secondary rounded-[15px] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[0.82rem] font-semibold flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-text-muted" /> {t("weeklyBreakdown")}
          </h3>
          <span className="text-[0.68rem] text-text-muted">{t("bestDay", { day: WEEKDAY_NAMES[bestDay.day] })}</span>
        </div>
        <div className="space-y-2">
          {weekdayBreakdown.map(w => {
            const barW = maxViews > 0 ? (w.views / maxViews) * 100 : 0;
            return (
              <div key={w.day} className="flex items-center gap-2.5">
                <span className="text-[0.72rem] font-medium w-7 text-text-muted">{WEEKDAY_NAMES[w.day]}</span>
                <div className="flex-1 h-5 bg-bg-tertiary rounded-full overflow-hidden">
                  <div className="h-full bg-accent-main/60 rounded-full transition-all duration-500" style={{ width: `${Math.max(barW, 2)}%` }} />
                </div>
                <span className="text-[0.68rem] text-text-muted w-10 text-right">{formatCount(w.views)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────
   Insights Card (realistic, no hype)
───────────────────────────────────── */
function InsightsCard({ overview, periodCounts, prev, peakHours, weekdayBreakdown, periodLabel }: {
  overview: OverviewData | null; periodCounts: PeriodCounts | null; prev: PeriodCounts | null;
  peakHours: HourData[]; weekdayBreakdown: WeekdayData[]; periodLabel: string;
}) {
  const t = useTranslations("analytics");
  const WEEKDAY_NAMES = [t("weekdaySun"), t("weekdayMon"), t("weekdayTue"), t("weekdayWed"), t("weekdayThu"), t("weekdayFri"), t("weekdaySat")];
  const insights: { icon: any; text: string }[] = [];

  const totalViews = periodCounts?.views || 0;
  const totalInteractions = (periodCounts?.likes || 0) + (periodCounts?.comments || 0) + (periodCounts?.saves || 0);

  // Only show insights when there's meaningful data (at least 10 views)
  if (totalViews < 10 && totalInteractions < 5) return null;

  // Engagement rate — only mention if views > 10
  if (totalViews >= 10) {
    const er = totalViews > 0 ? Math.round((totalInteractions / totalViews) * 100) : 0;
    const cappedEr = Math.min(er, 99);
    if (cappedEr >= 10) insights.push({ icon: Zap, text: t("insightEngagementHigh", { rate: cappedEr }) });
    else if (cappedEr >= 3) insights.push({ icon: Activity, text: t("insightEngagement", { rate: cappedEr }) });
  }

  // Best day — only if at least 2 different days have views
  if (weekdayBreakdown.filter(w => w.views > 0).length >= 2) {
    const best = weekdayBreakdown.reduce((a, b) => a.views > b.views ? a : b);
    insights.push({ icon: CalendarDays, text: t("insightBestDay", { day: WEEKDAY_NAMES[best.day] }) });
  }

  // Peak hour — only if at least 3 different hours have activity
  if (peakHours.filter(h => h.count > 0).length >= 3) {
    const peak = peakHours.reduce((a, b) => a.count > b.count ? a : b);
    insights.push({ icon: Clock, text: t("insightPeakHour", { hour: String(peak.hour).padStart(2, "0") }) });
  }

  // Growth — only with meaningful previous period data
  const prevViews = prev?.views || 0;
  if (prevViews >= 5 && totalViews >= 5) {
    const growth = Math.round(((totalViews - prevViews) / prevViews) * 100);
    const cappedGrowth = Math.min(Math.abs(growth), 99);
    if (growth > 10) insights.push({ icon: TrendingUp, text: t("insightGrowthUp", { rate: cappedGrowth }) });
    else if (growth < -10) insights.push({ icon: TrendingUp, text: t("insightGrowthDown", { rate: cappedGrowth }) });
  }

  // Avg views — only if meaningful
  if ((overview?.avgViewsPerPost || 0) >= 5) {
    insights.push({ icon: BarChart3, text: t("insightAvgViews", { count: formatCount(overview?.avgViewsPerPost || 0) }) });
  }

  if (insights.length === 0) return null;

  return (
    <div className="mx-4 mt-5">
      <div className="bg-gradient-to-br from-accent-main/8 to-transparent rounded-xl p-4">
        <h3 className="text-[0.82rem] font-semibold flex items-center gap-1.5 mb-3">
          <Zap className="h-4 w-4 text-accent-main" /> {t("insights")}
        </h3>
        <div className="space-y-2.5">
          {insights.map((ins, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-full bg-accent-main/10 flex items-center justify-center shrink-0 mt-0.5">
                <ins.icon className="h-3 w-3 text-accent-main" />
              </div>
              <p className="text-[0.78rem] text-text-secondary leading-snug">{ins.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────
   Video Analytics Card
───────────────────────────────────── */
function fmtDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}sn`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}dk`;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return m > 0 ? `${h}sa ${m}dk` : `${h}sa`;
}

function VideoAnalyticsCard({ data, periodLabel }: { data: VideoAnalyticsData; periodLabel: string }) {
  const t = useTranslations("analytics");
  return (
    <div className="mx-4 mt-5">
      <div className="bg-gradient-to-br from-purple-500/8 via-purple-400/3 to-transparent rounded-xl overflow-hidden">
        <div className="p-4">
          <h3 className="text-[0.82rem] font-semibold flex items-center gap-1.5 mb-4">
            <Film className="h-4 w-4 text-purple-500" /> {t("videoStats")}
            <span className="text-[0.65rem] text-text-muted font-normal ml-1">{t("last", { period: periodLabel })}</span>
          </h3>

          {/* Summary grid */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-bg-secondary rounded-[15px] p-3">
              <div className="flex items-center gap-1 mb-1.5">
                <Clock className="h-3 w-3 text-text-muted" />
                <span className="text-[0.65rem] text-text-muted">{t("totalWatch")}</span>
              </div>
              <p className="text-xl font-bold">{data.totalWatchHours}<span className="text-[0.72rem] text-text-muted font-semibold ml-1">{t("hours")}</span></p>
            </div>
            <div className="bg-bg-secondary rounded-[15px] p-3">
              <div className="flex items-center gap-1 mb-1.5">
                <Play className="h-3 w-3 text-text-muted" />
                <span className="text-[0.65rem] text-text-muted">{t("avgWatchDuration")}</span>
              </div>
              <p className="text-xl font-bold">{fmtDuration(data.avgWatchDuration)}</p>
            </div>
            <div className="bg-bg-secondary rounded-[15px] p-3">
              <div className="flex items-center gap-1 mb-1.5">
                <Activity className="h-3 w-3 text-text-muted" />
                <span className="text-[0.65rem] text-text-muted">{t("avgWatchPercent")}</span>
              </div>
              <p className="text-xl font-bold">%{data.avgWatchPercentage}</p>
            </div>
            <div className="bg-bg-secondary rounded-[15px] p-3">
              <div className="flex items-center gap-1 mb-1.5">
                <CheckCircle className="h-3 w-3 text-text-muted" />
                <span className="text-[0.65rem] text-text-muted">{t("completionRate")}</span>
              </div>
              <p className="text-xl font-bold">%{data.completionRate}</p>
            </div>
          </div>

          {/* Quick stats pills */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar mb-3">
            <div className="flex items-center gap-1.5 bg-bg-secondary rounded-full px-3 py-1.5 shrink-0">
              <Film className="h-3 w-3 text-text-muted" />
              <span className="text-[0.68rem] font-bold">{data.videoCount}</span>
              <span className="text-[0.62rem] text-text-muted">{t("videoCount")}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-bg-secondary rounded-full px-3 py-1.5 shrink-0">
              <Eye className="h-3 w-3 text-text-muted" />
              <span className="text-[0.68rem] font-bold">{formatCount(data.totalWatchers)}</span>
              <span className="text-[0.62rem] text-text-muted">{t("watchers")}</span>
            </div>
          </div>

          {/* Top Videos */}
          {data.topVideos.length > 0 && (
            <div>
              <p className="text-[0.68rem] text-text-muted font-medium uppercase tracking-wider mb-2">{t("mostWatched")}</p>
              <div className="space-y-1">
                {data.topVideos.map((video, i) => (
                  <Link
                    key={video.id}
                    href={`/${video.slug}`}
                    className="flex items-center gap-2.5 py-2 px-1 -mx-1 rounded-lg hover:bg-bg-secondary transition group"
                  >
                    <span className="text-[0.72rem] font-bold text-text-muted w-4 text-center shrink-0">{i + 1}</span>
                    {video.featured_image ? (
                      <img src={video.featured_image} alt="" className="w-14 h-8 rounded-md object-cover shrink-0" />
                    ) : (
                      <NoImage className="w-14 h-8 rounded-md shrink-0" iconSize={14} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[0.78rem] font-medium truncate group-hover:text-accent-main transition">{video.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[0.62rem] text-text-muted">{t("viewCount", { count: formatCount(video.views) })}</span>
                        <span className="text-[0.62rem] text-text-muted">{t("watchHours", { hours: video.watchHours })}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────
   Top Post Row
───────────────────────────────────── */
function TopPostRow({ post, rank, maxViews }: { post: PostData; rank: number; maxViews: number }) {
  const barWidth = maxViews > 0 ? Math.max((post.views / maxViews) * 100, 6) : 6;

  return (
    <Link href={`/${post.slug}`} className="flex items-center gap-3 px-4 py-3 hover:bg-bg-secondary transition group">
      <span className="text-sm font-bold text-text-muted w-5 text-center shrink-0">{rank}</span>
      {post.featured_image ? (
        <img src={post.featured_image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
      ) : (
        <NoImage className="w-12 h-12 rounded-lg shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[0.84rem] font-medium truncate group-hover:text-accent-main transition">{post.title}</p>
        <div className="mt-1.5 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
          <div className="h-full bg-accent-main/50 rounded-full transition-all duration-500" style={{ width: `${barWidth}%` }} />
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
}
