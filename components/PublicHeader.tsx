import Link from "next/link";
import { FeedimIcon } from "@/components/FeedimLogo";
import { getTranslations } from "next-intl/server";
import { getAuthUserId } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import PublicBackButton from "@/components/PublicBackButton";
import LazyAvatar from "@/components/LazyAvatar";

interface PublicHeaderProps {
  variant?: "home" | "back";
  backLabel?: string;
}

interface PublicHeaderUserInfo {
  username: string;
  avatarUrl: string | null;
}

async function getPublicHeaderUserInfo(): Promise<PublicHeaderUserInfo | null> {
  const userId = await getAuthUserId();
  if (!userId) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("username, avatar_url")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data?.username) return null;
  return {
    username: data.username,
    avatarUrl: data.avatar_url || null,
  };
}

export default async function PublicHeader({ variant = "back", backLabel }: PublicHeaderProps) {
  const [t, userInfo] = await Promise.all([
    getTranslations(),
    getPublicHeaderUserInfo(),
  ]);
  const resolvedBackLabel = backLabel || t("common.back");

  return (
    <header>
      <nav className="container mx-auto px-6 py-6 flex items-center justify-between select-none">
        <Link href="/" aria-label={`Feedim ${t("nav.home")}`} className="flex items-center gap-3">
          <FeedimIcon className="h-14 w-14" />
          <span className="w-px h-7 bg-border-primary" />
          <span className="text-lg font-bold">{t("nav.helpCenter")}</span>
        </Link>
        <div className="flex items-center gap-3">
          {variant === "home" ? (
            !userInfo && (
              <Link href="/login" className="t-btn cancel text-sm h-10 px-5">
                {t("common.login")}
              </Link>
            )
          ) : (
            <PublicBackButton label={resolvedBackLabel} />
          )}
          {userInfo && (
            <Link href={`/u/${userInfo.username}`} className="shrink-0">
              <LazyAvatar src={userInfo.avatarUrl} alt="" sizeClass="h-8 w-8" />
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
