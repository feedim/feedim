import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUserId } from "@/lib/auth";
import { ShieldAlert, CheckCircle } from "lucide-react";
import ModerationBadge from "@/components/ModerationBadge";
import SignOutButton from "./SignOutButton";
import UnblockVerify from "./UnblockVerify";
import UnfreezeButton from "./UnfreezeButton";
import PublicFooter from "@/components/PublicFooter";
import ModerationContent from "@/app/[slug]/moderation/ModerationContent";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function AccountModerationPage() {
  const userId = await getAuthUserId();
  if (!userId) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("status, moderation_reason, frozen_at, updated_at")
    .eq("user_id", userId)
    .single();

  if (!profile) redirect("/");

  // Fetch last decision (frozen hariç tüm durumlar)
  let decisionCode: string | null = null;
  let decisionReason: string | null = null;
  let decisionType: string | null = null;
  let decisionDate: string | null = null;
  if (profile.status !== "frozen") {
    const { data: decision } = await admin
      .from("moderation_decisions")
      .select("decision_code, decision, reason, created_at")
      .eq("target_type", "user")
      .eq("target_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    decisionCode = decision?.decision_code || null;
    decisionReason = decision?.reason || null;
    decisionType = decision?.decision || null;
    decisionDate = decision?.created_at || null;
  }

  const t = await getTranslations("admin");

  const isActive = profile.status === "active";
  const isModeration = profile.status === "moderation";
  const isFrozen = profile.status === "frozen";
  const isBlocked = profile.status === "blocked";
  const isDeleted = profile.status === "deleted";

  if (isActive) {
    return (
      <div className="h-dvh flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
          <div className="max-w-lg w-full space-y-6">
            <div className="flex justify-center">
              <img alt="Feedim" className="feedim-icon-auto h-20 w-20" draggable={false} />
            </div>
            <div className="bg-bg-secondary rounded-[15px] p-5 space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle size={18} className="text-success" />
                <h2 className="text-base font-semibold">{t("accountActive")}</h2>
              </div>
              <ModerationBadge label={t("accountActiveBadge")} variant="approved" />
              <p className="text-sm text-text-muted">
                {t("accountActiveDesc")}
              </p>
              {decisionCode && <ModerationContent decisionCode={decisionCode} minimal />}
              {decisionReason && (
                <div className="bg-success/5 rounded-lg p-3">
                  <p className="text-xs font-medium text-success">{t("lastDecision")}</p>
                  <p className="text-sm text-text-primary mt-0.5 font-semibold">{decisionReason}</p>
                  {decisionDate && (
                    <p className="text-[0.68rem] text-text-muted mt-1">{new Date(decisionDate).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                  )}
                </div>
              )}
              <Link
                href="/"
                className="t-btn bg-text-primary text-bg-primary flex items-center justify-center w-full"
              >
                {t("goHome")}
              </Link>
            </div>
          </div>
        </div>
        <PublicFooter variant="inline" />
      </div>
    );
  }

  const badgeLabel = isDeleted ? t("accountBeingDeleted") : isBlocked ? t("accountClosed") : isFrozen ? t("accountFrozen") : t("accountUnderReview");
  const badgeVariant = (isDeleted || isBlocked) ? "rejected" as const : "review" as const;
  const iconColor = (isDeleted || isBlocked) ? "text-error" : "text-[var(--accent-color)]";

  return (
    <div className="h-dvh flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
        <div className="max-w-lg w-full space-y-6">
          <div className="flex justify-center">
            <img alt="Feedim" className="feedim-icon-auto h-20 w-20" draggable={false} />
          </div>

          <div className="bg-bg-secondary rounded-[15px] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldAlert size={18} className={iconColor} />
              <h2 className="text-base font-semibold">{t("accountStatus")}</h2>
            </div>

            {!isFrozen && <ModerationBadge label={badgeLabel} variant={badgeVariant} />}

            {isModeration && (
              <p className="text-sm text-text-muted">
                {t("accountModerationDesc")}
              </p>
            )}

            {isFrozen && (
              <p className="text-sm text-text-muted">
                {t("accountFrozenDesc")}
              </p>
            )}

            {isBlocked && (
              <p className="text-sm text-text-muted">
                {t("accountClosedDesc")}
              </p>
            )}

            {isDeleted && (
              <p className="text-sm text-text-muted">
                {t("accountDeletedDesc")}
              </p>
            )}

            {isDeleted && profile.updated_at && (() => {
              const remaining = Math.max(0, 14 - Math.floor((Date.now() - new Date(profile.updated_at).getTime()) / (1000 * 60 * 60 * 24)));
              return (
                <p className="text-xs text-error text-left font-medium">
                  {t("permanentDeleteCountdown", { days: remaining })}
                </p>
              );
            })()}

            {decisionCode && <ModerationContent decisionCode={decisionCode} minimal />}

            {profile.moderation_reason && !isFrozen && (
              <div className={`${(isDeleted || isBlocked) ? "bg-error/5" : "bg-[var(--accent-color)]/5"} rounded-lg p-3`}>
                <p className={`text-xs font-medium ${(isDeleted || isBlocked) ? "text-error" : "text-[var(--accent-color)]"}`}>{t("reasonLabel")}</p>
                <p className="text-sm text-text-primary mt-0.5 font-semibold">{profile.moderation_reason}</p>
              </div>
            )}

            {isFrozen && <UnfreezeButton />}
            {isBlocked && <UnblockVerify />}
            {isDeleted && (
              <Link
                href="/help/moderation"
                className="t-btn bg-text-primary text-bg-primary flex items-center justify-center w-full"
              >
                {t("appeal")}
              </Link>
            )}
            {!isFrozen && <SignOutButton />}
          </div>
        </div>
      </div>

      <PublicFooter variant="inline" />
    </div>
  );
}
