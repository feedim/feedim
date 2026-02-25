"use client";

import { useState, InputHTMLAttributes } from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff } from "lucide-react";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export default function PasswordInput(props: PasswordInputProps) {
  const t = useTranslations("auth");
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={`${props.className || ""} pr-11`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-[15px] top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
        aria-label={visible ? t("hidePassword") : t("showPassword")}
        tabIndex={-1}
      >
        {visible ? (
          <EyeOff className="h-[18px] w-[18px]" />
        ) : (
          <Eye className="h-[18px] w-[18px]" />
        )}
      </button>
    </div>
  );
}
