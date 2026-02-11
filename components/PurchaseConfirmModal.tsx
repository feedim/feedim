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

const BRAND_PINK = "lab(49.5493 79.8381 2.31768)";

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
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999999,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 500,
          background: "#18181b",
          borderRadius: "32px 32px 0 0",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 20,
          animation: "slideUp 0.25s ease-out",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: 12,
            borderBottom: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#fff" }}>
            Satın Alma Onayı
          </h3>
          <button
            onClick={onClose}
            disabled={loading}
            aria-label="Kapat"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: 9999,
              background: "rgba(255,255,255,0.1)",
              border: "none",
              color: "#9ca3af",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.5 : 1,
              transition: "background 0.15s, color 0.15s",
              padding: 0,
              flexShrink: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Balance Info */}
        <div
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, color: "#9ca3af", margin: 0 }}>Mevcut bakiye:</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#fff", margin: 0 }}>
              {options.currentBalance} FL
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, color: "#9ca3af", margin: 0 }}>İşlem sonrası:</span>
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: insufficientBalance ? "#ef4444" : "#22c55e",
                margin: 0,
              }}
            >
              {insufficientBalance ? "Yetersiz bakiye" : `${balanceAfter} FL`}
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="btn-primary"
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {loading ? (
              <span
                style={{
                  width: 20,
                  height: 20,
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTopColor: "#fff",
                  borderRadius: 9999,
                  display: "inline-block",
                  animation: "spin 0.6s linear infinite",
                }}
              />
            ) : insufficientBalance ? (
              "Coin Al"
            ) : (
              "Onayla ve Satın Al"
            )}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px 0",
              borderRadius: 12,
              border: "none",
              background: "rgba(255,255,255,0.08)",
              color: "#9ca3af",
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.5 : 1,
              transition: "opacity 0.15s",
            }}
          >
            Vazgeç
          </button>
        </div>

        {/* Error */}
        {error && (
          <p style={{ margin: 0, fontSize: 13, color: "#ef4444", textAlign: "center" }}>
            {error}
          </p>
        )}
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>,
    document.body
  );
}
