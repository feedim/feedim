"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const AFFILIATE_REF_KEY = "forilove_affiliate_ref";

export default function AffiliateRefCapture() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref && /^[a-zA-Z0-9]{3,20}$/.test(ref)) {
      const code = ref.toLocaleUpperCase('tr-TR');
      localStorage.setItem(AFFILIATE_REF_KEY, code);

      // If user is logged in, persist to profile (only if not already set)
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          supabase
            .from("profiles")
            .select("affiliate_referral_code")
            .eq("user_id", user.id)
            .single()
            .then(({ data: profile }) => {
              if (profile && !profile.affiliate_referral_code) {
                supabase
                  .from("profiles")
                  .update({ affiliate_referral_code: code })
                  .eq("user_id", user.id)
                  .then(() => {});
              }
            });
        }
      });
    }
  }, [searchParams]);

  return null;
}
