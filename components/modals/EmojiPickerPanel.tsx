"use client";

import dynamic from "next/dynamic";
import baseData from "@emoji-mart/data";
import { useEffect, useState, useMemo, useRef } from "react";

import { useLocale, useTranslations } from "next-intl";
import Modal from "./Modal";
import { getLocalizedEmojiData } from "@/lib/emojiLocales";

const Picker = dynamic(() => import("@emoji-mart/react").then((mod) => mod.default), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[320px]">
      <span className="loader" />
    </div>
  ),
});

interface EmojiPickerPanelProps {
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
}

interface EmojiMartSelection {
  native?: string;
}

type ScrollLockStyle = CSSStyleDeclaration & {
  webkitOverflowScrolling?: string;
};

export default function EmojiPickerPanel({ onEmojiSelect, onClose }: EmojiPickerPanelProps) {
  const t = useTranslations("modals");
  const tEmoji = useTranslations("emojiPicker");
  const locale = useLocale();
  const [theme] = useState<"light" | "dark">(() => {
    if (typeof document === "undefined") return "light";
    const currentTheme = document.documentElement.getAttribute("data-theme");
    return currentTheme === "dark" || currentTheme === "dim" ? "dark" : "light";
  });
  const pickerHostRef = useRef<HTMLDivElement>(null);

  // Augment emoji data with TR/AZ keywords for search
  const localizedData = useMemo(() => getLocalizedEmojiData(baseData, locale), [locale]);

  // Inject global CSS for emoji-mart overrides
  useEffect(() => {
    const id = "emoji-mart-overrides";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      em-emoji-picker {
        width: 100% !important;
        max-width: 100% !important;
        min-width: 0 !important;
        border: none !important;
        --border-radius: 0 !important;
        overflow-x: hidden !important;
      }
      em-emoji-picker .sticky {
        font-size: 0.7rem !important;
        font-weight: 600 !important;
        margin-top: 4px !important;
      }
      em-emoji-picker .scroll {
        overflow-x: hidden !important;
      }
    `;
    document.head.appendChild(style);
    return () => { document.getElementById(id)?.remove(); };
  }, []);

  useEffect(() => {
    let rafId = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const applyScrollFix = () => {
      const pickerHost = pickerHostRef.current?.querySelector("em-emoji-picker") as
        | (HTMLElement & { shadowRoot?: ShadowRoot | null })
        | null;
      if (!pickerHost) return false;

      pickerHost.setAttribute("data-scroll-lock-allow", "true");
      pickerHost.style.touchAction = "pan-y";

      const shadowRoot = pickerHost.shadowRoot;
      if (!shadowRoot) return false;

      const scrollEl = shadowRoot.querySelector(".scroll") as HTMLElement | null;
      const rootEl = shadowRoot.querySelector("#root") as HTMLElement | null;

      if (rootEl) {
        rootEl.style.touchAction = "pan-y";
      }

      if (!scrollEl) return false;

      scrollEl.style.touchAction = "pan-y";
      scrollEl.style.overscrollBehavior = "contain";
      (scrollEl.style as ScrollLockStyle).webkitOverflowScrolling = "touch";

      return true;
    };

    const tryApply = () => {
      if (applyScrollFix()) return;
      rafId = window.requestAnimationFrame(() => {
        timeoutId = setTimeout(tryApply, 60);
      });
    };

    tryApply();

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return (
    <Modal open={true} onClose={onClose} title={t("emojiTitle")} size="sm" zIndex="z-[10001]" infoText={t("emojiPickerInfo")}>
      <div
        ref={pickerHostRef}
        data-scroll-lock-allow="true"
        className="w-full overflow-x-hidden touch-pan-y [&>div]:w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <Picker
          data={localizedData}
          onEmojiSelect={(emoji: EmojiMartSelection) => onEmojiSelect(emoji.native || "")}
          theme={theme}
          locale={locale}
          set="native"
          previewPosition="none"
          skinTonePosition="none"
          maxFrequentRows={2}
          perLine={8}
          emojiButtonSize={38}
          emojiSize={26}
          dynamicWidth
          i18n={{
            search: tEmoji("search"),
            search_no_results_1: tEmoji("noResults1"),
            search_no_results_2: tEmoji("noResults2"),
            pick: tEmoji("pick"),
            add_custom: tEmoji("addCustom"),
            categories: {
              activity: tEmoji("catActivity"),
              custom: tEmoji("catCustom"),
              flags: tEmoji("catFlags"),
              foods: tEmoji("catFoods"),
              frequent: tEmoji("catFrequent"),
              nature: tEmoji("catNature"),
              objects: tEmoji("catObjects"),
              people: tEmoji("catPeople"),
              places: tEmoji("catPlaces"),
              search: tEmoji("catSearch"),
              symbols: tEmoji("catSymbols"),
            },
          }}
        />
      </div>
    </Modal>
  );
}
