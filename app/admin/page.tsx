"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, TrendingUp, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import StatsCard from "@/components/StatsCard";

interface Stats {
  totalTemplates: number;
  totalSales: number;
  totalRevenue: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ totalTemplates: 0, totalSales: 0, totalRevenue: 0 });
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Check if user is admin
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (!profile || profile.role !== "admin") {
        toast.error("Bu sayfaya erişim yetkiniz yok");
        router.push("/dashboard");
        return;
      }

      setUserRole(profile.role);
      loadStats();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(error);
      }
      toast.error("Yükleme hatası");
      router.push("/dashboard");
    }
  };

  const loadStats = async () => {
    try {
      // Load total templates count
      const { count: templatesCount } = await supabase
        .from("templates")
        .select("*", { count: 'exact', head: true });

      // Load all completed purchases
      const { data: purchases, count: salesCount } = await supabase
        .from("purchases")
        .select("coins_spent", { count: 'exact' })
        .eq("payment_status", "completed");

      // Calculate total revenue
      const totalRevenue = purchases?.reduce((sum, p) => sum + (p.coins_spent || 0), 0) || 0;

      setStats({
        totalTemplates: templatesCount || 0,
        totalSales: salesCount || 0,
        totalRevenue,
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(error);
      }
      toast.error("İstatistikler yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <Heart className="h-12 w-12 text-pink-500 fill-pink-500 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl min-h-[73px]">
        <nav className="container mx-auto px-6 flex items-center justify-between min-h-[73px]">
          <button onClick={() => router.back()} className="flex items-center gap-2 transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Geri</span>
          </button>
          <h1 className="text-lg font-semibold">Admin Panel</h1>
          <div className="w-16"></div>
        </nav>
      </header>

      <main className="container mx-auto px-6 py-16 max-w-6xl">
        {/* Stats */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-6">Sistem İstatistikleri</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsCard
              icon={Heart}
              iconColor="text-pink-500"
              iconBgColor="bg-pink-500/10"
              label="Toplam Şablon"
              value={stats.totalTemplates}
            />
            <StatsCard
              icon={TrendingUp}
              iconColor="text-green-500"
              iconBgColor="bg-green-500/10"
              label="Toplam Satış"
              value={stats.totalSales}
            />
            <div className="bg-zinc-900 rounded-2xl p-6 border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-yellow-500">LP</span>
                </div>
                <h3 className="text-sm text-gray-400">Toplam Satış Coin</h3>
              </div>
              <p className="text-3xl font-bold">{stats.totalRevenue}</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Yönetim</h2>
          <div className="grid gap-4">
            <Link href="/admin/fix-templates">
              <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 hover:bg-zinc-800 transition-colors cursor-pointer">
                <h3 className="text-xl font-bold mb-2">Şablonları Düzelt</h3>
                <p className="text-gray-400 text-sm">Şablon verilerini düzenle ve onar</p>
              </div>
            </Link>
            <Link href="/admin/migrate">
              <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 hover:bg-zinc-800 transition-colors cursor-pointer">
                <h3 className="text-xl font-bold mb-2">Veri Taşıma</h3>
                <p className="text-gray-400 text-sm">Veritabanı taşıma işlemleri</p>
              </div>
            </Link>
            <Link href="/admin/migrate-coins">
              <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 hover:bg-zinc-800 transition-colors cursor-pointer">
                <h3 className="text-xl font-bold mb-2">Coin Taşıma</h3>
                <p className="text-gray-400 text-sm">Kullanıcı coin bakiyelerini yönet</p>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
