"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { smartBack } from "@/lib/smartBack";

interface PublicBackButtonProps {
  label: string;
}

export default function PublicBackButton({ label }: PublicBackButtonProps) {
  const router = useRouter();

  return (
    <button
      onClick={() => smartBack(router, "/")}
      className="flex items-center gap-2 p-4 -m-4 text-text-muted hover:text-text-primary transition"
    >
      <ArrowLeft className="h-5 w-5" />
      <span className="text-[0.95rem]">{label}</span>
    </button>
  );
}
