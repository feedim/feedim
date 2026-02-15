"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

const AFFILIATE_REF_KEY = "forilove_affiliate_ref";

export default function AffiliateRefCapture() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref && /^[a-zA-Z0-9]{3,20}$/.test(ref)) {
      localStorage.setItem(AFFILIATE_REF_KEY, ref.toUpperCase());
    }
  }, [searchParams]);

  return null;
}
