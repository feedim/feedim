"use client";

import dynamic from "next/dynamic";
import data from "@emoji-mart/data";
import { useEffect, useState } from "react";

import Modal from "./Modal";

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

export default function EmojiPickerPanel({ onEmojiSelect, onClose }: EmojiPickerPanelProps) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const t = document.documentElement.getAttribute("data-theme");
    setTheme(t === "dark" || t === "dim" ? "dark" : "light");
  }, []);

  return (
    <Modal open={true} onClose={onClose} title="Emoji" size="sm" zIndex="z-[10001]" infoText="Emoji seçerek yorumlarına ekleyebilirsin.">
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <div className="overflow-hidden flex justify-center" onClick={(e) => e.stopPropagation()}>
        <Picker
          data={data}
          onEmojiSelect={(emoji: any) => onEmojiSelect(emoji.native)}
          theme={theme}
          locale="tr"
          set="native"
          previewPosition="none"
          skinTonePosition="none"
          maxFrequentRows={2}
          perLine={10}
          emojiButtonSize={38}
          emojiSize={26}
          i18n={{
            search: "Ara",
            search_no_results_1: "Sonuç bulunamadı",
            search_no_results_2: "Farklı bir şey dene",
            pick: "Emoji seç",
            add_custom: "Özel emoji ekle",
            categories: {
              activity: "Aktivite",
              custom: "Özel",
              flags: "Bayraklar",
              foods: "Yemek ve İçecek",
              frequent: "Sık Kullanılan",
              nature: "Hayvanlar ve Doğa",
              objects: "Nesneler",
              people: "Kişiler",
              places: "Seyahat ve Yerler",
              search: "Arama Sonuçları",
              symbols: "Semboller",
            },
          }}
        />
      </div>
    </Modal>
  );
}
