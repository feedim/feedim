"use client";

import { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/* ─── Types ─── */

export interface CouponInfo {
  code: string;
  couponId: string;
  discountPercent: number;
}

interface ConfirmOptions {
  itemName: string;
  description?: string;
  coinCost: number;
  originalPrice?: number;
  discountLabel?: string;
  currentBalance: number;
  icon?: "ai" | "template";
  allowCoupon?: boolean;
  onConfirm: (couponInfo?: CouponInfo) => Promise<{ success: boolean; newBalance?: number; error?: string }>;
}

type ConfirmResult = { success: true; newBalance: number } | null;

/* ─── Context ─── */

interface PurchaseConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<ConfirmResult>;
}

const PurchaseConfirmContext = createContext<PurchaseConfirmContextValue | null>(null);

export function usePurchaseConfirm() {
  const ctx = useContext(PurchaseConfirmContext);
  if (!ctx) throw new Error("usePurchaseConfirm must be used within PurchaseConfirmProvider");
  return ctx;
}

/* ─── Provider ─── */

export function PurchaseConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((result: ConfirmResult) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<ConfirmResult> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setOptions(opts);
    });
  }, []);

  const handleClose = useCallback(() => {
    resolveRef.current?.(null);
    resolveRef.current = null;
    setOptions(null);
  }, []);

  const handleResult = useCallback((result: ConfirmResult) => {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setOptions(null);
  }, []);

  return (
    <PurchaseConfirmContext.Provider value={{ confirm }}>
      {children}
      {options && (
        <PurchaseConfirmSheet
          options={options}
          onClose={handleClose}
          onResult={handleResult}
        />
      )}
    </PurchaseConfirmContext.Provider>
  );
}

/* ─── Bottom Sheet ─── */

interface SheetProps {
  options: ConfirmOptions;
  onClose: () => void;
  onResult: (result: ConfirmResult) => void;
}

function PurchaseConfirmSheet({ options, onClose, onResult }: SheetProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponInfo | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponOpen, setCouponOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Calculate effective cost with coupon
  const effectiveCost = appliedCoupon
    ? Math.max(0, Math.round(options.coinCost * (1 - appliedCoupon.discountPercent / 100)))
    : options.coinCost;

  const insufficientBalance = options.currentBalance < effectiveCost;
  const balanceAfter = options.currentBalance - effectiveCost;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleApplyCoupon = async () => {
    const trimmed = couponCode.trim();
    if (!trimmed) return;

    setCouponLoading(true);
    setCouponError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCouponError("Oturum bulunamadı");
        return;
      }

      const { data, error } = await supabase.rpc('validate_coupon', {
        p_code: trimmed,
        p_user_id: user.id,
      });

      if (error) {
        setCouponError("Kupon doğrulanamadı");
        return;
      }

      if (data?.valid) {
        setAppliedCoupon({
          code: trimmed,
          couponId: data.coupon_id,
          discountPercent: data.discount_percent,
        });
        setCouponError(null);
      } else {
        setCouponError(data?.error || "Geçersiz kupon kodu");
      }
    } catch {
      setCouponError("Bir hata oluştu");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError(null);
  };

  const handleConfirm = async () => {
    if (insufficientBalance) {
      onClose();
      router.push("/dashboard/coins");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await options.onConfirm(appliedCoupon || undefined);
      if (result.success && result.newBalance !== undefined) {
        // Record coupon usage after successful purchase
        if (appliedCoupon) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.rpc('record_coupon_usage', {
              p_coupon_id: appliedCoupon.couponId,
              p_user_id: user.id,
            });
          }
        }
        onResult({ success: true, newBalance: result.newBalance });
      } else {
        setError(result.error || "İşlem başarısız oldu");
      }
    } catch (err: any) {
      setError(err.message || "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9999999] flex items-end justify-center bg-black/70 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[500px] bg-zinc-900 rounded-t-[32px] p-6 flex flex-col gap-3 animate-[slideUp_0.25s_ease-out]"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h3 className="text-lg font-bold text-white">Satın Alma Onayı</h3>
            <p className="text-xs text-gray-400 mt-0.5">Satın almak için işlemi onaylayın</p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            aria-label="Kapat"
            className="flex items-center justify-center w-9 h-9 rounded-full bg-white/10 text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Coin Cost */}
        <div className="text-center pt-1">
          {(options.discountLabel || appliedCoupon) && (
            <div className="flex items-center justify-center gap-2 mb-2">
              {options.discountLabel && (
                <span className="inline-block bg-pink-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase">
                  {options.discountLabel}
                </span>
              )}
              {appliedCoupon && (
                <span className="inline-block bg-yellow-500/20 text-yellow-500 text-xs font-bold px-3 py-1 rounded-full uppercase">
                  -%{appliedCoupon.discountPercent} KUPON
                </span>
              )}
            </div>
          )}
          <div className="flex items-center justify-center gap-2 mt-1.5">
            {(options.originalPrice && options.originalPrice !== options.coinCost) || appliedCoupon ? (
              <span className="text-xl font-bold text-gray-500 line-through decoration-red-500/70 decoration-2">
                {appliedCoupon ? options.coinCost : options.originalPrice} FL
              </span>
            ) : null}
            <span className="text-[32px] font-extrabold text-yellow-500 tracking-tight">
              {effectiveCost} FL
            </span>
          </div>
          <p className="text-sm text-gray-400">{options.itemName}</p>
        </div>

        {/* Balance Info */}
        <div className="border border-white/10 rounded-xl p-3.5 flex flex-col gap-1.5">
          <div className="flex justify-between items-center pb-0.5">
            <span className="text-[14px] text-gray-400">Mevcut bakiye:</span>
            <span className="text-[14px] font-semibold text-white">{options.currentBalance} FL</span>
          </div>
          <div className="h-px bg-yellow-500/10" />
          <div className="flex justify-between items-center pt-0.5">
            <span className="text-[14px] text-gray-400">İşlem sonrası:</span>
            <span className={`text-[14px] font-semibold ${insufficientBalance ? "text-red-500" : "text-yellow-500"}`}>
              {insufficientBalance ? "Yetersiz bakiye" : `${balanceAfter} FL`}
            </span>
          </div>
        </div>

        {/* Coupon Section - between balance and buttons */}
        {options.allowCoupon && (
          <div>
            {!appliedCoupon ? (
              <>
                {!couponOpen ? (
                  <button
                    onClick={() => setCouponOpen(true)}
                    className="w-full text-center text-[13px] text-gray-500 hover:text-gray-300 transition-colors py-0.5"
                  >
                    Kupon kodum var
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => { setCouponCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')); setCouponError(null); }}
                        placeholder="9 haneli kod"
                        maxLength={9}
                        autoFocus
                        className="flex-1 bg-transparent border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/25 transition tracking-widest font-mono"
                      />
                      <button
                        onClick={handleApplyCoupon}
                        disabled={couponLoading || !couponCode.trim()}
                        className="px-5 py-2.5 text-sm shrink-0 rounded-lg font-semibold transition"
                        style={{ background: "var(--color-yellow-500)", color: "black" }}
                      >
                        {couponLoading ? (
                          <span className="inline-block w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                        ) : (
                          "Uygula"
                        )}
                      </button>
                    </div>
                    {couponError && (
                      <p className="text-xs text-red-500">{couponError}</p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-between py-0.5">
                <span className="text-sm text-yellow-500">
                  {appliedCoupon.code} <span className="text-gray-500">·</span> <span className="text-gray-400">%{appliedCoupon.discountPercent} indirim</span>
                </span>
                <button
                  onClick={handleRemoveCoupon}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Kaldır
                </button>
              </div>
            )}
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-col gap-2">
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="btn-primary w-full"
            style={{ background: "var(--color-yellow-500)", color: "black" }}
          >
            {loading ? (
              <span className="inline-block w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            ) : insufficientBalance ? (
              "Coin Al"
            ) : (
              "Onayla ve Satın Al"
            )}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="btn-secondary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Vazgeç
          </button>
        </div>

        {/* Error */}
        {error && (
          <p className="text-[13px] text-red-500 text-center">{error}</p>
        )}
      </div>
    </div>,
    document.body
  );
}
