"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { emitNavigationStart } from "@/lib/navigationProgress";
import { ArrowLeft } from "lucide-react";
import { FeedimIcon } from "@/components/FeedimLogo";
import { createClient } from "@/lib/supabase/client";

interface PublicHeaderProps {
  variant?: "home" | "back";
  backLabel?: string;
}

export default function PublicHeader({ variant = "back", backLabel = "Geri" }: PublicHeaderProps) {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<{ username: string; avatarUrl: string | null } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from("profiles").select("username, avatar_url").eq("user_id", user.id).single().then(({ data }) => {
          if (data) setUserInfo({ username: data.username, avatarUrl: data.avatar_url });
        });
      }
    });
  }, []);

  return (
    <header>
      <nav className="container mx-auto px-6 py-6 flex items-center justify-between">
        <Link href="/" aria-label="Feedim Ana Sayfa" className="flex items-center gap-3">
          <FeedimIcon className="h-14 w-14" />
          <span className="w-px h-7 bg-border-primary" />
          <span className="text-lg font-semibold">Yardım Merkezi</span>
        </Link>
        <div className="flex items-center gap-3">
          {variant === "home" ? (
            !userInfo && (
              <Link href="/login" className="t-btn cancel text-sm h-10 px-5">
                Giriş Yap
              </Link>
            )
          ) : (
            <button
              onClick={() => {
                if (window.history.length > 2) router.back();
                else { emitNavigationStart(); router.push("/"); }
              }}
              className="flex items-center gap-2 text-text-muted hover:text-text-primary transition"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>{backLabel}</span>
            </button>
          )}
          {userInfo && (
            <Link href={`/u/${userInfo.username}`} className="shrink-0">
              {userInfo.avatarUrl ? (
                <img src={userInfo.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <img className="default-avatar-auto h-8 w-8 rounded-full object-cover" alt="" />
              )}
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
