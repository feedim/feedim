"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Coins, Plus } from "lucide-react";
import Modal from "./Modal";
import { GIFT_TYPES } from "@/lib/constants";
import { formatCount } from "@/lib/utils";
import { feedimAlert } from "@/components/FeedimAlert";
import { useAuthModal } from "@/components/AuthModal";

type GiftKey = keyof typeof GIFT_TYPES;

interface GiftModalProps {
  open: boolean;
  onClose: () => void;
  postId: number;
  onGiftSent?: (balance: number) => void;
}

interface RecentGift {
  gift_type: GiftKey;
  coin_amount: number;
  created_at: string;
  sender: { username: string; full_name?: string; avatar_url?: string };
}

const giftKeys = Object.keys(GIFT_TYPES) as GiftKey[];

/* ── SVG Gift Icons ── */

function RoseIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path d="M24 38c0 0-2-8-2-14s4-10 4-10-2 4 0 8 2 6 0 10c-1 2-2 6-2 6z" fill="#2D8C3C" />
      <path d="M20 14c-4-2-6 2-4 6s6 6 8 4 4-4 4-8-2-6-4-4-2 4 0 6" fill="#E8365D" />
      <path d="M28 12c2-4 0-6-2-4s-4 4-2 8c1 2 4 4 6 2s2-4 0-6" fill="#D42E53" />
      <ellipse cx="22" cy="16" rx="2" ry="1.5" fill="#F06288" opacity="0.5" />
    </svg>
  );
}

function CoffeeIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect x="8" y="18" width="24" height="22" rx="4" fill="#C08B5C" />
      <rect x="11" y="18" width="18" height="4" rx="2" fill="#D4A574" />
      <path d="M32 24h4a4 4 0 010 8h-4" stroke="#C08B5C" strokeWidth="3" strokeLinecap="round" />
      <path d="M16 10c0-2 2-4 2-6" stroke="#A0A0A0" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <path d="M22 12c0-2 2-4 2-6" stroke="#A0A0A0" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

function HeartIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="heart-g" x1="8" y1="8" x2="40" y2="40">
          <stop stopColor="#FF6B8A" />
          <stop offset="1" stopColor="#EE3A6D" />
        </linearGradient>
      </defs>
      <path d="M24 42s-14-8.4-14-20a9 9 0 0118 0 9 9 0 0118 0c0 11.6-14 20-14 20z" fill="url(#heart-g)" />
      <ellipse cx="17.5" cy="18" rx="3" ry="2.5" fill="white" opacity="0.25" />
    </svg>
  );
}

function FireIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="fire-g" x1="16" y1="40" x2="32" y2="8">
          <stop stopColor="#FF6B00" />
          <stop offset="0.5" stopColor="#FF9500" />
          <stop offset="1" stopColor="#FFD54F" />
        </linearGradient>
      </defs>
      <path d="M24 4c0 8-10 14-10 24a14 14 0 0028 0c0-6-4-10-6-14s0-8 0-8c-2 4-6 6-6 2s-2-4-6-4z" fill="url(#fire-g)" />
      <path d="M24 44a8 8 0 01-8-8c0-6 4-8 6-12 1 3 4 4 6 8a10 10 0 01-4 12z" fill="#FFECB3" opacity="0.6" />
    </svg>
  );
}

function StarIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="star-g" x1="10" y1="6" x2="38" y2="44">
          <stop stopColor="#FFD54F" />
          <stop offset="1" stopColor="#FFB300" />
        </linearGradient>
      </defs>
      <path d="M24 4l5.8 12.6L43 18.4l-9.5 9 2.5 13.6L24 34.6 12 41l2.5-13.6-9.5-9 13.2-1.8z" fill="url(#star-g)" />
      <path d="M24 4l5.8 12.6L43 18.4l-9.5 9 2.5 13.6L24 34.6" fill="white" opacity="0.15" />
    </svg>
  );
}

function CrownIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="crown-g" x1="6" y1="12" x2="42" y2="40">
          <stop stopColor="#FFD54F" />
          <stop offset="1" stopColor="#F9A825" />
        </linearGradient>
      </defs>
      <path d="M6 36l4-20 8 8 6-14 6 14 8-8 4 20H6z" fill="url(#crown-g)" />
      <rect x="6" y="36" width="36" height="5" rx="2" fill="#F9A825" />
      <circle cx="10" cy="16" r="2.5" fill="#FFD54F" />
      <circle cx="24" cy="10" r="2.5" fill="#FFD54F" />
      <circle cx="38" cy="16" r="2.5" fill="#FFD54F" />
      <circle cx="16" cy="34" r="2" fill="#FF8F00" opacity="0.4" />
      <circle cx="24" cy="33" r="2" fill="#FF8F00" opacity="0.4" />
      <circle cx="32" cy="34" r="2" fill="#FF8F00" opacity="0.4" />
    </svg>
  );
}

function DiamondIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="dia-g" x1="8" y1="4" x2="40" y2="44">
          <stop stopColor="#90CAF9" />
          <stop offset="0.5" stopColor="#5C6BC0" />
          <stop offset="1" stopColor="#7E57C2" />
        </linearGradient>
      </defs>
      <path d="M24 44L4 18l8-12h24l8 12L24 44z" fill="url(#dia-g)" />
      <path d="M4 18h40" stroke="white" strokeWidth="1" opacity="0.3" />
      <path d="M12 6l4 12L24 44 32 18l4-12" stroke="white" strokeWidth="1" opacity="0.2" />
      <path d="M16 18L24 44l8-26" fill="white" opacity="0.1" />
    </svg>
  );
}

function RocketIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="rocket-g" x1="20" y1="4" x2="28" y2="36">
          <stop stopColor="#E0E0E0" />
          <stop offset="1" stopColor="#BDBDBD" />
        </linearGradient>
      </defs>
      <path d="M24 4c-4 8-8 16-8 26h16c0-10-4-18-8-26z" fill="url(#rocket-g)" />
      <path d="M24 4c-2 4-4 10-5 18h10c-1-8-3-14-5-18z" fill="white" opacity="0.3" />
      <path d="M16 30c-4-2-8 0-8 4l8-2z" fill="#5C6BC0" />
      <path d="M32 30c4-2 8 0 8 4l-8-2z" fill="#5C6BC0" />
      <ellipse cx="24" cy="20" rx="3" ry="3.5" fill="#42A5F5" />
      <ellipse cx="24" cy="20" rx="1.5" ry="2" fill="#1565C0" />
      <path d="M18 34l-2 10 6-4h4l6 4-2-10H18z" fill="#FF7043" />
      <path d="M22 34l-1 8 3-3 3 3-1-8h-4z" fill="#FFD54F" />
    </svg>
  );
}

function UnicornIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="uni-horn" x1="26" y1="2" x2="30" y2="16">
          <stop stopColor="#FFD54F" />
          <stop offset="1" stopColor="#FF8F00" />
        </linearGradient>
        <linearGradient id="uni-mane" x1="10" y1="12" x2="20" y2="32">
          <stop stopColor="#E040FB" />
          <stop offset="0.5" stopColor="#7C4DFF" />
          <stop offset="1" stopColor="#448AFF" />
        </linearGradient>
      </defs>
      <ellipse cx="24" cy="28" rx="12" ry="10" fill="white" />
      <ellipse cx="24" cy="28" rx="12" ry="10" fill="#F5F5F5" />
      <circle cx="22" cy="20" r="8" fill="white" />
      <path d="M26 6l-2 12h4L26 6z" fill="url(#uni-horn)" />
      <path d="M14 14c-2 2-4 8-4 14 2-4 4-8 6-10s2-6 2-8c-2 0-3 2-4 4z" fill="url(#uni-mane)" />
      <circle cx="19" cy="19" r="1.5" fill="#424242" />
      <ellipse cx="20" cy="19" rx="0.5" ry="0.8" fill="white" />
      <path d="M16 24c1 1 3 1.5 5 1" stroke="#FFCDD2" strokeWidth="1.5" strokeLinecap="round" />
      <ellipse cx="16" cy="22" rx="2" ry="1.5" fill="#FFCDD2" opacity="0.4" />
    </svg>
  );
}

function PlanetIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="planet-g" x1="10" y1="10" x2="38" y2="38">
          <stop stopColor="#7C4DFF" />
          <stop offset="0.5" stopColor="#536DFE" />
          <stop offset="1" stopColor="#448AFF" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="12" fill="url(#planet-g)" />
      <ellipse cx="24" cy="24" rx="20" ry="5" fill="none" stroke="#B388FF" strokeWidth="2.5" opacity="0.6" transform="rotate(-20 24 24)" />
      <ellipse cx="20" cy="20" rx="3" ry="2" fill="white" opacity="0.15" />
      <circle cx="28" cy="28" r="2" fill="#311B92" opacity="0.2" />
      <circle cx="20" cy="27" r="1.2" fill="#311B92" opacity="0.15" />
    </svg>
  );
}

const GIFT_ICONS: Record<GiftKey, (size?: number) => React.ReactElement> = {
  rose: (s) => <RoseIcon size={s} />,
  coffee: (s) => <CoffeeIcon size={s} />,
  heart: (s) => <HeartIcon size={s} />,
  fire: (s) => <FireIcon size={s} />,
  star: (s) => <StarIcon size={s} />,
  crown: (s) => <CrownIcon size={s} />,
  diamond: (s) => <DiamondIcon size={s} />,
  rocket: (s) => <RocketIcon size={s} />,
  unicorn: (s) => <UnicornIcon size={s} />,
  planet: (s) => <PlanetIcon size={s} />,
};

// Per-gift glow color for celebration
const GIFT_GLOW: Record<GiftKey, string> = {
  rose: "rgba(232,54,93,0.45)",
  coffee: "rgba(192,139,92,0.35)",
  heart: "rgba(255,64,129,0.45)",
  fire: "rgba(255,107,0,0.45)",
  star: "rgba(255,213,79,0.45)",
  crown: "rgba(249,168,37,0.45)",
  diamond: "rgba(92,107,192,0.45)",
  rocket: "rgba(66,165,245,0.45)",
  unicorn: "rgba(124,77,255,0.45)",
  planet: "rgba(83,109,254,0.45)",
};

export default function GiftModal({ open, onClose, postId, onGiftSent }: GiftModalProps) {
  const [selected, setSelected] = useState<GiftKey | null>(null);
  const [sending, setSending] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [recentGifts, setRecentGifts] = useState<RecentGift[]>([]);
  const [count, setCount] = useState(1);
  const { requireAuth } = useAuthModal();

  // Celebration state — fullscreen, modal is closed
  const [celebration, setCelebration] = useState<{ key: GiftKey; count: number } | null>(null);
  const [showDone, setShowDone] = useState(false);
  const celebrationRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    try {
      const [profileRes, giftsRes] = await Promise.all([
        fetch("/api/profile"),
        fetch(`/api/posts/${postId}/gift`),
      ]);
      const profileData = await profileRes.json();
      const giftsData = await giftsRes.json();
      setBalance(profileData.profile?.coin_balance || 0);
      setRecentGifts(giftsData.recentGifts || []);
    } catch {}
  }, [postId]);

  useEffect(() => {
    if (open) {
      setSelected(null);
      setCount(1);
      loadData();
    }
  }, [open, loadData]);

  const selectedGift = selected ? GIFT_TYPES[selected] : null;
  const totalCost = selectedGift ? selectedGift.coins * count : 0;
  const canAffordSelected = balance !== null && totalCost <= balance;

  const handleSend = async () => {
    if (!selected) return;
    const user = await requireAuth();
    if (!user) return;

    if (!canAffordSelected) {
      feedimAlert("error", "Yetersiz jeton bakiyesi");
      return;
    }

    setSending(true);
    try {
      let lastBalance = balance;
      for (let i = 0; i < count; i++) {
        const res = await fetch(`/api/posts/${postId}/gift`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gift_type: selected }),
        });
        const data = await res.json();
        if (!res.ok) {
          feedimAlert("error", data.error || "Bir hata oluştu");
          if (i > 0) loadData();
          return;
        }
        lastBalance = data.sender_balance;
      }

      setBalance(lastBalance);
      onGiftSent?.(lastBalance!);

      // Refresh recent gifts in background
      fetch(`/api/posts/${postId}/gift`).then(r => r.json()).then(d => setRecentGifts(d.recentGifts || [])).catch(() => {});

      // Close modal, show fullscreen celebration
      const sentKey = selected;
      const sentCount = count;
      onClose();
      setCelebration({ key: sentKey, count: sentCount });
      setShowDone(false);

      // Show done button after sequential animations complete
      setTimeout(() => setShowDone(true), 1800);
    } catch {
      feedimAlert("error", "Bir hata oluştu");
    } finally {
      setSending(false);
    }
  };

  const dismissCelebration = () => {
    setCelebration(null);
    setShowDone(false);
    setSelected(null);
    setCount(1);
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        size="md"
        hideHeader
        footer={
          <div className="px-5 pb-5 pt-3 border-t border-border-primary/50">
            {selected && (
              <div className="flex items-center gap-2 mb-3 justify-center">
                <button
                  onClick={() => setCount(c => Math.max(1, c - 1))}
                  disabled={count <= 1}
                  className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center text-lg font-bold disabled:opacity-30 active:scale-90 transition"
                >
                  -
                </button>
                <span className="text-[1.1rem] font-bold w-8 text-center">{count}</span>
                <button
                  onClick={() => {
                    const nextCost = selectedGift!.coins * (count + 1);
                    if (balance !== null && nextCost <= balance) setCount(c => c + 1);
                  }}
                  disabled={balance !== null && selectedGift ? selectedGift.coins * (count + 1) > balance : true}
                  className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center disabled:opacity-30 active:scale-90 transition"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <span className="text-[0.72rem] text-text-muted ml-1">
                  = {totalCost} jeton
                </span>
              </div>
            )}

            <button
              onClick={handleSend}
              disabled={!selected || sending || !canAffordSelected}
              className="t-btn accept w-full !py-3.5 !text-[0.88rem] disabled:opacity-40"
            >
              {sending
                ? <span className="loader" style={{ width: 18, height: 18 }} />
                : selected
                  ? `${count > 1 ? `${count}x ` : ""}${GIFT_TYPES[selected].name} Gonder`
                  : "Hediye Secin"
              }
            </button>
          </div>
        }
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-[1.05rem] font-bold">Hediye Gonder</h2>
          <div className="flex items-center gap-1.5 bg-bg-tertiary backdrop-blur-sm px-3 py-1.5 rounded-full">
            <Coins className="h-3.5 w-3.5 text-accent-main" />
            <span className="text-[0.78rem] font-bold">
              {balance !== null ? formatCount(balance) : "..."}
            </span>
          </div>
        </div>

        {/* Gift grid */}
        <div className="px-5 pb-4">
          <div className="grid grid-cols-2 gap-2.5">
            {giftKeys.map(key => {
              const gift = GIFT_TYPES[key];
              const isSelected = selected === key;
              const canAfford = balance !== null && balance >= gift.coins;
              return (
                <button
                  key={key}
                  onClick={() => { setSelected(key); setCount(1); }}
                  disabled={!canAfford}
                  className={`relative flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all duration-200 ${
                    isSelected
                      ? "bg-accent-main/10 ring-2 ring-accent-main"
                      : canAfford
                        ? "bg-bg-tertiary hover:bg-bg-tertiary active:scale-[0.97]"
                        : "bg-bg-tertiary opacity-35"
                  }`}
                >
                  <div className={`shrink-0 transition-transform duration-200 ${isSelected ? "scale-110" : ""}`}>
                    {GIFT_ICONS[key](38)}
                  </div>
                  <div className="flex flex-col items-start min-w-0">
                    <span className="text-[0.78rem] font-semibold leading-tight">{gift.name}</span>
                    <span className="text-[0.66rem] text-text-muted flex items-center gap-0.5 mt-0.5">
                      <Coins className="h-2.5 w-2.5 text-accent-main" />
                      {gift.coins}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Recent gifts — compact row under grid */}
          {recentGifts.length > 0 && (
            <div className="mt-4 pt-3 border-t border-border-primary/30">
              <p className="text-[0.65rem] text-text-muted font-medium uppercase tracking-wider mb-2">Son hediyeler</p>
              <div className="flex flex-wrap gap-1.5">
                {recentGifts.slice(0, 8).map((g, i) => (
                  <div key={i} className="flex items-center gap-1 bg-bg-tertiary rounded-full pl-0.5 pr-2 py-0.5">
                    {g.sender?.avatar_url ? (
                      <img src={g.sender.avatar_url} alt="" className="w-4 h-4 rounded-full object-cover" />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-bg-tertiary" />
                    )}
                    <span className="flex shrink-0">{GIFT_ICONS[g.gift_type]?.(14)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* ── Fullscreen Celebration Overlay ── */}
      {celebration && typeof document !== "undefined" && createPortal(
        <div
          ref={celebrationRef}
          className="fixed inset-0 z-[99999] flex items-center justify-center gift-celebration-backdrop"
          onClick={showDone ? dismissCelebration : undefined}
        >
          {/* Subtle glow behind icon */}
          <div
            className="absolute rounded-full gift-celebration-glow"
            style={{
              width: 200,
              height: 200,
              background: `radial-gradient(circle, ${GIFT_GLOW[celebration.key]} 0%, transparent 70%)`,
            }}
          />

          {/* Center content — sequential reveal */}
          <div className="relative z-10 flex flex-col items-center pointer-events-auto" onClick={e => e.stopPropagation()}>
            {/* Gift icon — step 1 */}
            <div className="gift-celebration-icon mb-5">
              {GIFT_ICONS[celebration.key](100)}
            </div>

            {/* Gift name + count — step 2 */}
            <p className="text-white font-bold text-[1.15rem] gift-celebration-text" style={{ animationDelay: "0.4s" }}>
              {GIFT_TYPES[celebration.key].name}{celebration.count > 1 ? ` x${celebration.count}` : ""}
            </p>

            {/* Sent label — step 3 */}
            <p className="text-white/60 text-[0.82rem] font-medium mt-1.5 gift-celebration-text" style={{ animationDelay: "0.7s" }}>
              Gonderildi!
            </p>

            {/* Done button — step 4, appears after all animations */}
            {showDone && (
              <button
                onClick={dismissCelebration}
                className="t-btn mt-8 w-[180px] bg-white text-black gift-celebration-text"
                style={{ animationDelay: "0s" }}
              >
                Tamam
              </button>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
