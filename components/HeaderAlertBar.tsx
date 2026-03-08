"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useUser } from "@/components/UserContext";
import { useTranslations } from "next-intl";

type AlertType = "email_not_verified";

interface Alert {
  type: AlertType;
  message: string;
  href: string;
}

export default function HeaderAlertBar() {
  const { user } = useUser();
  const t = useTranslations("auth");
  const router = useRouter();
  const [dismissed, setDismissed] = useState<Set<AlertType>>(new Set());

  if (!user) return null;

  const alerts: Alert[] = [];

  if (!user.emailVerified) {
    alerts.push({
      type: "email_not_verified",
      message: t("emailNotVerified"),
      href: "/security",
    });
  }

  const active = alerts.filter((a) => !dismissed.has(a.type));
  if (active.length === 0) return null;

  const alert = active[0];

  return (
    <div className="bg-accent-main text-white text-[0.78rem] font-medium sticky top-0 z-50">
      <div className="flex items-center justify-between px-3 py-1.5">
        <button
          onClick={() => router.push(alert.href)}
          className="flex-1 text-left truncate hover:underline cursor-pointer"
        >
          {alert.message}
        </button>
        <button
          onClick={() => setDismissed((prev) => new Set(prev).add(alert.type))}
          className="shrink-0 ml-2 p-0.5 rounded hover:bg-white/20 transition"
          aria-label="Kapat"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
