"use client";

import { useEffect } from "react";
import {useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@/components/UserContext";

export default function ProfilePage() {
  useSearchParams();
  const router = useRouter();
  const { user, isLoggedIn } = useUser();

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/login");
      return;
    }
    if (user?.username) {
      router.replace(`/u/${user.username}`);
    } else {
      router.replace("/dashboard");
    }
  }, [isLoggedIn, user, router]);

  return null;
}
