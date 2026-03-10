"use client";

import { useSearchParams } from "next/navigation";

import { useState, useEffect, useRef } from "react";
import { Plus, X } from "lucide-react";
import { feedimAlert } from "@/components/FeedimAlert";
import AppLayout from "@/components/AppLayout";
import { useTranslations } from "next-intl";

export default function BlockedWordsPage() {
  const t = useTranslations("settings");
  useSearchParams();
  const [blockedWords, setBlockedWords] = useState<string[]>([]);
  const [newBlockedWord, setNewBlockedWord] = useState("");
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const lastAddRef = useRef<number>(0);
  const COOLDOWN_MS = 2000;

  useEffect(() => {
    loadBlockedWords();
  }, []);

  const loadBlockedWords = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/account/blocked-words");
      if (res.ok) {
        const data = await res.json();
        const words = data.words || [];
        setBlockedWords(words);
        localStorage.setItem("fdm-blocked-words", JSON.stringify(words));
      } else {
        // Fallback to localStorage
        const stored = localStorage.getItem("fdm-blocked-words");
        if (stored) setBlockedWords(JSON.parse(stored));
      }
    } catch {
      const stored = localStorage.getItem("fdm-blocked-words");
      if (stored) setBlockedWords(JSON.parse(stored));
    } finally {
      setLoading(false);
    }
  };

  const saveToServer = async (words: string[]) => {
    localStorage.setItem("fdm-blocked-words", JSON.stringify(words));
    try {
      await fetch("/api/account/blocked-words", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words }),
      });
    } catch {}
  };

  const addBlockedWord = () => {
    const word = newBlockedWord.trim().toLowerCase();
    const charCount = word.replace(/\s/g, "").length;
    if (!word || charCount < 3) {
      feedimAlert("error", t("minCharsRequired"));
      return;
    }
    if (blockedWords.includes(word)) {
      feedimAlert("error", t("wordAlreadyInList"));
      return;
    }
    if (blockedWords.length >= 50) {
      feedimAlert("error", t("maxWordsReached"));
      return;
    }
    const now = Date.now();
    const elapsed = now - lastAddRef.current;
    if (elapsed < COOLDOWN_MS) {
      feedimAlert("error", t("addingTooFast"));
      return;
    }

    setAdding(true);
    lastAddRef.current = now;

    const updated = [...blockedWords, word];
    setBlockedWords(updated);
    setNewBlockedWord("");
    saveToServer(updated).finally(() => setAdding(false));
  };

  const removeBlockedWord = (word: string) => {
    const updated = blockedWords.filter(w => w !== word);
    setBlockedWords(updated);
    saveToServer(updated);
  };

  return (
    <AppLayout headerTitle={t("blockedWords")} hideRightSidebar>
      <div className="py-4 px-4">
        <p className="text-sm text-text-muted mb-4">
          {t("blockedWordsPageDesc")}
        </p>

        {loading ? (
          <div className="flex justify-center py-8"><span className="loader" style={{ width: 22, height: 22 }} /></div>
        ) : (
          <>
            {/* Add word input */}
            <div className="flex items-center gap-2 mb-5">
              <input
                type="text"
                value={newBlockedWord}
                onChange={e => setNewBlockedWord(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addBlockedWord(); } }}
                placeholder={t("addWordPlaceholder")}
                maxLength={30}
                disabled={adding}
                className="input-modern flex-1 !py-2 !text-sm"
              />
              <button
                onClick={addBlockedWord}
                disabled={adding || !newBlockedWord.trim() || newBlockedWord.trim().replace(/\s/g, "").length < 3}
                className="i-btn !w-10 !h-10 bg-bg-tertiary text-text-muted disabled:opacity-40 shrink-0"
              >
                {adding ? <span className="loader" style={{ width: 16, height: 16 }} /> : <Plus className="h-4.5 w-4.5" />}
              </button>
            </div>

            {/* Word list */}
            {blockedWords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm text-text-muted">{t("noBlockedWords")}</p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {blockedWords.map(word => (
                    <span key={word} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-bg-tertiary text-sm">
                      {word}
                      <button onClick={() => removeBlockedWord(word)} className="text-text-muted hover:text-error transition ml-0.5">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
                <p className="text-[0.7rem] text-text-muted mt-3">{t("wordCount", { count: blockedWords.length })}</p>
              </>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
