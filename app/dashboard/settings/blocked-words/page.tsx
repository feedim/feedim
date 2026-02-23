"use client";

import { useSearchParams } from "next/navigation";

import { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { feedimAlert } from "@/components/FeedimAlert";
import AppLayout from "@/components/AppLayout";

export default function BlockedWordsPage() {
  useSearchParams();
  const [blockedWords, setBlockedWords] = useState<string[]>([]);
  const [newBlockedWord, setNewBlockedWord] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("fdm-blocked-words");
      if (stored) setBlockedWords(JSON.parse(stored));
    } catch {}
  }, []);

  const addBlockedWord = () => {
    const word = newBlockedWord.trim().toLowerCase();
    if (!word || word.length < 2) return;
    if (blockedWords.includes(word)) {
      feedimAlert("error", "Bu kelime zaten listede");
      return;
    }
    if (blockedWords.length >= 50) {
      feedimAlert("error", "En fazla 50 kelime eklenebilir");
      return;
    }
    const updated = [...blockedWords, word];
    setBlockedWords(updated);
    localStorage.setItem("fdm-blocked-words", JSON.stringify(updated));
    setNewBlockedWord("");
  };

  const removeBlockedWord = (word: string) => {
    const updated = blockedWords.filter(w => w !== word);
    setBlockedWords(updated);
    localStorage.setItem("fdm-blocked-words", JSON.stringify(updated));
  };

  return (
    <AppLayout headerTitle="Engellenen Kelimeler" hideRightSidebar>
      <div className="py-4 px-4">
        <p className="text-sm text-text-muted mb-4">
          Eklenen kelimeleri içeren yorumlar, yanıtlar ve bildirimler gizlenir.
        </p>

        {/* Add word input */}
        <div className="flex gap-2 mb-5">
          <input
            type="text"
            value={newBlockedWord}
            onChange={e => setNewBlockedWord(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addBlockedWord(); } }}
            placeholder="Kelime ekle..."
            maxLength={30}
            className="input-modern flex-1 !py-2 !text-sm"
          />
          <button
            onClick={addBlockedWord}
            disabled={!newBlockedWord.trim() || newBlockedWord.trim().length < 2}
            className="i-btn !w-10 !h-10 bg-bg-tertiary text-text-muted hover:text-text-primary disabled:opacity-40 shrink-0"
          >
            <Plus className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Word list */}
        {blockedWords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-text-muted">Engellenen kelime yok</p>
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
            <p className="text-[0.7rem] text-text-muted mt-3">{blockedWords.length}/50 kelime</p>
          </>
        )}
      </div>
    </AppLayout>
  );
}
