"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { X } from "lucide-react";
import { useUser } from "@/components/UserContext";

type AlertType = "email_not_verified";

interface Alert {
  type: AlertType;
  message: string;
  cta: string;
  href: string;
}

interface HeaderAlertBarLabels {
  emailNotVerified: string;
  clickHere: string;
  close: string;
}

export default function HeaderAlertBar({ labels }: { labels: HeaderAlertBarLabels }) {
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState<Set<AlertType>>(new Set());
  const barRef = useRef<HTMLDivElement>(null);

  const isHomePage = pathname === "/" || pathname === "/dashboard";

  const alerts: Alert[] = [];

  if (user && !user.emailVerified) {
    alerts.push({
      type: "email_not_verified",
      message: labels.emailNotVerified,
      cta: labels.clickHere,
      href: "/security",
    });
  }

  const active = alerts.filter((a) => !dismissed.has(a.type));
  const visible = isHomePage && active.length > 0;

  // useLayoutEffect runs before paint — prevents content flash under the bar
  useLayoutEffect(() => {
    if (visible && barRef.current) {
      const h = barRef.current.offsetHeight;
      document.documentElement.style.setProperty("--alert-bar-h", `${h}px`);
      document.documentElement.classList.add("has-alert-bar");
    } else {
      document.documentElement.style.setProperty("--alert-bar-h", "0px");
      document.documentElement.classList.remove("has-alert-bar");
    }
    return () => {
      document.documentElement.style.setProperty("--alert-bar-h", "0px");
      document.documentElement.classList.remove("has-alert-bar");
    };
  }, [visible]);

  if (!visible) return null;

  const alert = active[0];

  return (
    <>
    {/* Inline style prevents layout flash before useLayoutEffect runs */}
    <style dangerouslySetInnerHTML={{ __html: `:root { --alert-bar-h: 28px; } #dashboard-shell main { padding-top: var(--alert-bar-h); }` }} />
    <div
      ref={barRef}
      className="bg-accent-main text-white text-[0.66rem] font-medium fixed top-0 left-0 right-0 z-[60]"
    >
      <div className="flex items-center justify-between px-3 py-1.5">
        <p className="flex-1 truncate sm:text-center">
          {alert.message}{" "}
          <button
            onClick={() => router.push(alert.href)}
            className="underline font-bold cursor-pointer"
          >
            {alert.cta}
          </button>
        </p>
        <button
          onClick={() => setDismissed((prev) => new Set(prev).add(alert.type))}
          className="shrink-0 ml-2 p-0.5 rounded hover:bg-white/20 transition"
          aria-label={labels.close}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
    </>
  );
}
