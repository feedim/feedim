"use client";

import { useState, useEffect } from "react";
import { Copy, Check, Users, Coins, Gift } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

interface ReferralStats {
  referral_code: string;
  total_referrals: number;
  total_earnings: number;
}

export default function ReferralSection({ userId }: { userId: string }) {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasReferrer, setHasReferrer] = useState(true);
  const [referralInput, setReferralInput] = useState('');
  const [submittingCode, setSubmittingCode] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadReferralStats();
  }, [userId]);

  const loadReferralStats = async () => {
    try {
      // Get referral code from profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("user_id", userId)
        .maybeSingle();

      if (profileError) throw profileError;

      // If no profile yet, return empty stats
      if (!profileData) {
        setStats({
          referral_code: "",
          total_referrals: 0,
          total_earnings: 0,
        });
        setLoading(false);
        return;
      }

      // Get referral stats
      const { data: statsData, error: statsError } = await supabase.rpc("get_referral_stats", {
        user_id_param: userId,
      });

      if (statsError) throw statsError;

      setStats({
        referral_code: profileData?.referral_code || "",
        total_referrals: statsData?.total_referrals || 0,
        total_earnings: statsData?.total_earnings || 0,
      });

      // Referrer kontrolü
      const { data: existingRef } = await supabase
        .from('referrals')
        .select('id')
        .eq('referred_id', userId)
        .maybeSingle();
      setHasReferrer(!!existingRef);
    } catch (error) {
      // Silent error handling
    } finally {
      setLoading(false);
    }
  };

  const getReferralLink = () => {
    if (!stats?.referral_code) return "";
    return `${window.location.origin}/register?ref=${stats.referral_code}`;
  };

  const copyReferralLink = async () => {
    const link = getReferralLink();
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Referans linki kopyalandı!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Kopyalama başarısız");
    }
  };

  const applyReferralCode = async () => {
    const code = referralInput.trim();
    if (!code || !/^[a-zA-Z0-9]{1,20}$/.test(code)) {
      toast.error('Geçersiz referans kodu');
      return;
    }
    setSubmittingCode(true);
    try {
      const { data, error } = await supabase.rpc('process_referral_signup', {
        p_new_user_id: userId,
        p_referral_code: code,
      });
      if (error) throw error;
      if (data?.success) {
        toast.success('Referans kodu uygulandı');
        setHasReferrer(true);
        setReferralInput('');
      } else {
        const msg = data?.message || '';
        const tr: Record<string, string> = {
          'Cannot refer yourself': 'Kendi referans kodunuzu kullanamazsınız',
          'Invalid referral code': 'Geçersiz referans kodu',
          'Already referred': 'Zaten bir referans kodunuz var',
          'Referral code not found': 'Referans kodu bulunamadı',
          'User already has a referrer': 'Zaten bir referans kodunuz var',
        };
        toast.error(tr[msg] || 'Referans kodu uygulanamadı');
      }
    } catch {
      toast.error('Referans kodu uygulanamadı');
    } finally {
      setSubmittingCode(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-zinc-900 rounded-xl p-6 animate-pulse">
        <div className="h-6 bg-white/5 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-white/5 rounded w-2/3"></div>
      </div>
    );
  }

  return (
    <details className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 rounded-xl border border-pink-500/20 group">
      <summary className="flex items-center justify-between p-4 sm:p-6 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <div className="flex items-center gap-3 text-left min-w-0">
          <div className="p-2 bg-pink-500/20 rounded-lg shrink-0">
            <Gift className="h-6 w-6 text-pink-500" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-lg">Arkadaşlarını Davet Et</h3>
            <p className="text-sm text-gray-400">Arkadaşların FL satın alırsa %5 komisyon kazan.</p>
          </div>
        </div>
        <svg
          className="h-5 w-5 text-gray-400 transition-transform group-open:rotate-180 shrink-0 ml-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </summary>

      <div className="px-3 sm:px-4 pb-3 sm:pb-4">

      {/* Referral Link */}
      <div className="bg-black/20 rounded-lg p-3 sm:p-4 mb-4">
        <label className="block text-sm text-gray-400 mb-2">
          Referans Linkini Paylaş
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={getReferralLink()}
            readOnly
            className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-3 sm:px-4 py-2 text-sm text-white truncate"
          />
          <button
            onClick={copyReferralLink}
            className="btn-secondary px-4 py-2 h-auto"
          >
            {copied ? (
              <Check className="h-5 w-5 text-pink-500" />
            ) : (
              <Copy className="h-5 w-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Referans Kodun: <span className="font-bold text-pink-500">{stats?.referral_code}</span>
        </p>
      </div>

      {/* Referral Code Input */}
      {!hasReferrer && (
        <div className="bg-black/20 rounded-lg p-3 sm:p-4 mb-4">
          <label className="block text-sm text-gray-400 mb-2">Referans Kodu Gir</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={referralInput}
              onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
              placeholder="Referans kodunu gir"
              maxLength={20}
              className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-3 sm:px-4 py-2 text-sm text-white"
            />
            <button onClick={applyReferralCode} disabled={submittingCode || !referralInput.trim()}
              className="btn-secondary px-4 py-2 h-auto text-sm disabled:opacity-50">
              {submittingCode ? '...' : 'Uygula'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">Bir kez girilir, sonra değiştirilemez.</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-black/20 rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-400">Toplam Davet</span>
          </div>
          <p className="text-2xl font-bold">{stats?.total_referrals || 0}</p>
        </div>

        <div className="bg-black/20 rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-1">
            <Coins className="h-4 w-4 text-yellow-500" />
            <span className="text-sm text-gray-400">Toplam Kazanç</span>
          </div>
          <p className="text-2xl font-bold text-yellow-500">
            {stats?.total_earnings || 0} <span className="text-sm">FL</span>
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="mt-4 p-3 sm:p-4 bg-black/20 rounded-lg">
        <h4 className="font-semibold mb-2 text-sm">Nasıl Çalışır?</h4>
        <ul className="text-sm text-gray-400 space-y-1">
          <li>• Arkadaşını davet et (referans linki ile kayıt olsun)</li>
          <li>• Arkadaşın şablon satın aldığında <span className="text-yellow-500 font-bold">%5 komisyon</span> kazanırsın</li>
          <li>• Minimum komisyon: <span className="text-yellow-500 font-bold">5 FL</span></li>
        </ul>
      </div>
      </div>
    </details>
  );
}
