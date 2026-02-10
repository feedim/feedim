"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SignupPage() {
  return (
    <Suspense>
      <SignupRedirect />
    </Suspense>
  );
}

function SignupRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      router.replace(`/register?ref=${ref}`);
    } else {
      router.replace("/register");
    }
  }, [router, searchParams]);

  return null;
}
