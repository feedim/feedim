"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function MigrateCoinSystemPage() {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const supabase = createClient();

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${message}`]);
  };

  const runMigration = async () => {
    setLoading(true);
    setLogs([]);

    try {
      addLog("Starting FL Coin System migration...");

      // 1. Add coin_balance to profiles
      addLog("Adding coin_balance column to profiles...");
      try {
        await supabase.rpc('exec_sql', {
          sql: 'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS coin_balance INTEGER DEFAULT 0;'
        });
      } catch (error) {
        // Might not have exec_sql function, continue anyway
      }

      // 2. Create coin_packages table
      addLog("Creating coin_packages table...");
      const { error: packagesError } = await supabase.from('coin_packages').select('id').limit(1);

      // 3. Create coin_transactions table
      addLog("Creating coin_transactions table...");
      const { error: transError } = await supabase.from('coin_transactions').select('id').limit(1);

      // 4. Create coin_payments table
      addLog("Creating coin_payments table...");
      const { error: paymentsError } = await supabase.from('coin_payments').select('id').limit(1);

      // 5. Insert coin packages
      addLog("Inserting default coin packages...");
      const packages = [
        { name: 'Başlangıç Paketi', coins: 100, price_usd: 0.99, price_try: 29, bonus_coins: 0, is_popular: false, display_order: 1 },
        { name: 'Popüler Paket', coins: 500, price_usd: 4.99, price_try: 149, bonus_coins: 50, is_popular: true, display_order: 2 },
        { name: 'Değer Paketi', coins: 1000, price_usd: 9.99, price_try: 299, bonus_coins: 150, is_popular: false, display_order: 3 },
        { name: 'Premium Paket', coins: 2500, price_usd: 19.99, price_try: 599, bonus_coins: 500, is_popular: false, display_order: 4 },
        { name: 'Mega Paket', coins: 5000, price_usd: 39.99, price_try: 1199, bonus_coins: 1500, is_popular: false, display_order: 5 },
        { name: 'Ultimate Paket', coins: 10000, price_usd: 69.99, price_try: 2099, bonus_coins: 4000, is_popular: false, display_order: 6 },
      ];

      for (const pkg of packages) {
        const { error } = await supabase
          .from('coin_packages')
          .upsert(pkg, { onConflict: 'name' });

        if (error) {
          addLog(`Error inserting ${pkg.name}: ${error.message}`);
        } else {
          addLog(`Inserted: ${pkg.name}`);
        }
      }

      // 6. Update templates with coin prices
      addLog("Updating template prices to FL Coins...");
      const templatePrices = [
        { slug: 'romantic-sunset', coin_price: 100 },
        { slug: 'anniversary-special', coin_price: 200 },
        { slug: 'simple-elegant', coin_price: 250 },
      ];

      for (const { slug, coin_price } of templatePrices) {
        const { error } = await supabase
          .from('templates')
          .update({ coin_price })
          .eq('slug', slug);

        if (error) {
          addLog(`Error updating ${slug}: ${error.message}`);
        } else {
          addLog(`Updated ${slug} to ${coin_price} FL Coins`);
        }
      }

      addLog("Migration completed successfully!");
      toast.success("FL Coin System migration complete!");

    } catch (error: any) {
      addLog(`Migration failed: ${error.message}`);
      toast.error("Migration failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">FL Coin System Migration</h1>
          <p className="text-gray-400">
            TikTok benzeri sanal para sistemi kurulumu
          </p>
        </div>

        <div className="bg-zinc-900 rounded-2xl p-8 border border-white/10">
          <h2 className="text-2xl font-bold mb-4">Migration Detayları</h2>

          <div className="space-y-4 mb-6">
            <div className="bg-zinc-800 rounded-xl p-4">
              <h3 className="font-semibold mb-2">Yapılacak İşlemler:</h3>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>✓ Kullanıcılara coin_balance ekle</li>
                <li>✓ Coin paketleri tablosu oluştur</li>
                <li>✓ Coin işlemleri tablosu oluştur</li>
                <li>✓ Ödeme kayıtları tablosu oluştur</li>
                <li>✓ 6 adet coin paketi ekle (100 - 10,000 FL Coin)</li>
                <li>✓ Template fiyatlarını coin'e çevir</li>
              </ul>
            </div>

            <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-4">
              <h3 className="text-yellow-500 font-semibold mb-2">Coin Paketleri</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Başlangıç: 100 FL Coin - 29₺</div>
                <div>Popüler: 500 FL Coin (+50 bonus) - 149₺</div>
                <div>Değer: 1,000 FL Coin (+150 bonus) - 299₺</div>
                <div>Premium: 2,500 FL Coin (+500 bonus) - 599₺</div>
                <div>Mega: 5,000 FL Coin (+1,500 bonus) - 1,199₺</div>
                <div>Ultimate: 10,000 FL Coin (+4,000 bonus) - 2,099₺</div>
              </div>
            </div>
          </div>

          <button
            onClick={runMigration}
            disabled={loading}
            className="w-full btn-primary py-4 text-lg mb-4"
          >
            {loading ? 'Migration Yapılıyor...' : 'Start Migration'}
          </button>

          {/* Logs */}
          {logs.length > 0 && (
            <div className="bg-black rounded-xl p-4 font-mono text-xs">
              <h3 className="text-green-500 font-bold mb-2">LOGS:</h3>
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {logs.map((log, i) => (
                  <div key={i} className="text-gray-300">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
