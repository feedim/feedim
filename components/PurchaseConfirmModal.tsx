"use client";

import { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

/* ─── Types ─── */

interface ConfirmOptions {
  itemName: string;
  coinCost: number;
  currentBalance: number;
  icon?: "ai" | "template";
  onConfirm: () => Promise<{ success: boolean; newBalance?: number; error?: string }>;
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
  const router = useRouter();

  const insufficientBalance = options.currentBalance < options.coinCost;
  const balanceAfter = options.currentBalance - options.coinCost;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleConfirm = async () => {
    if (insufficientBalance) {
      onClose();
      router.push("/dashboard/coins");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await options.onConfirm();
      if (result.success && result.newBalance !== undefined) {
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
        className="w-full max-w-[500px] bg-zinc-900 rounded-t-[32px] p-6 flex flex-col gap-5 animate-[slideUp_0.25s_ease-out]"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <h3 className="text-lg font-bold text-white">Satın Alma Onayı</h3>
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
          <p className="text-sm text-gray-400">{options.itemName}</p>
          <p className="mt-1.5 text-[32px] font-extrabold text-yellow-500 tracking-tight">
            {options.coinCost} FL
          </p>
        </div>

        {/* Balance Info */}
        <div className="bg-yellow-500/[0.06] border border-yellow-500/15 rounded-xl p-3.5 flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <span className="text-[13px] text-gray-400">Mevcut bakiye:</span>
            <span className="text-[13px] font-semibold text-yellow-500">{options.currentBalance} FL</span>
          </div>
          <div className="h-px bg-yellow-500/10" />
          <div className="flex justify-between items-center">
            <span className="text-[13px] text-gray-400">İşlem sonrası:</span>
            <span className={`text-[13px] font-semibold ${insufficientBalance ? "text-red-500" : "text-yellow-500"}`}>
              {insufficientBalance ? "Yetersiz bakiye" : `${balanceAfter} FL`}
            </span>
          </div>
        </div>

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
