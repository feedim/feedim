"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function CreateSavedTemplatesPage() {
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
      addLog("Starting saved_templates table creation...");

      // Check if table exists
      addLog("Checking if table already exists...");
      const { data: existingData, error: checkError } = await supabase
        .from('saved_templates')
        .select('id')
        .limit(1);

      if (!checkError) {
        addLog("Table already exists!");
        toast.success("saved_templates table already exists");
        return;
      }

      addLog("Table doesn't exist, creating via SQL...");

      // Read SQL file content
      const sqlContent = `
-- Create saved_templates table
CREATE TABLE IF NOT EXISTS saved_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  template_id UUID REFERENCES templates(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, template_id)
);

-- Enable RLS
ALTER TABLE saved_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own saved templates"
  ON saved_templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save templates"
  ON saved_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave templates"
  ON saved_templates FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_saved_templates_user_id ON saved_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_templates_template_id ON saved_templates(template_id);
CREATE INDEX IF NOT EXISTS idx_saved_templates_created_at ON saved_templates(created_at DESC);
`;

      addLog("SQL execution requires Supabase Dashboard access");
      addLog("Copy the SQL below and run it in Supabase SQL Editor:");
      addLog("---");
      addLog(sqlContent);
      addLog("---");

      toast.info("Please run the SQL manually in Supabase Dashboard", { duration: 10000 });

      // Verify table was created
      addLog("Verifying table creation...");
      const { error: verifyError } = await supabase
        .from('saved_templates')
        .select('id')
        .limit(1);

      if (verifyError) {
        addLog(`Table not found. Please create it manually using the SQL above.`);
        toast.error("Table not created yet. Use the SQL above in Supabase Dashboard.");
      } else {
        addLog("Table verified successfully!");
        toast.success("saved_templates table is ready!");
      }

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
          <h1 className="text-4xl font-bold mb-4">Create saved_templates Table</h1>
          <p className="text-gray-400">
            Kullanıcıların template'leri favorilere eklemesi için gerekli tablo
          </p>
        </div>

        <div className="bg-zinc-900 rounded-2xl p-8 border border-white/10">
          <h2 className="text-2xl font-bold mb-4">Table Detayları</h2>

          <div className="space-y-4 mb-6">
            <div className="bg-zinc-800 rounded-xl p-4">
              <h3 className="font-semibold mb-2">Kullanıldığı Sayfalar:</h3>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>✓ Dashboard - Template favorileme</li>
                <li>✓ /dashboard/saved - Kaydedilen template'ler</li>
                <li>✓ /dashboard/purchased - Satın alınan template'ler</li>
                <li>✓ lib/templates/loaders.ts - Template yükleme</li>
              </ul>
            </div>

            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-4">
              <h3 className="text-blue-500 font-semibold mb-2">Schema</h3>
              <div className="text-sm font-mono space-y-1">
                <div>- id: UUID (PK)</div>
                <div>- user_id: UUID (FK → profiles)</div>
                <div>- template_id: UUID (FK → templates)</div>
                <div>- created_at: TIMESTAMP</div>
                <div className="text-yellow-500 mt-2">UNIQUE(user_id, template_id)</div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-4">
              <h3 className="text-green-500 font-semibold mb-2">RLS Policies</h3>
              <div className="text-sm space-y-1">
                <div>✓ Users can view own saved templates</div>
                <div>✓ Users can save templates</div>
                <div>✓ Users can unsave templates</div>
              </div>
            </div>
          </div>

          <button
            onClick={runMigration}
            disabled={loading}
            className="w-full btn-primary py-4 text-lg mb-4"
          >
            {loading ? 'Checking...' : 'Check / Create Table'}
          </button>

          {/* Logs */}
          {logs.length > 0 && (
            <div className="bg-black rounded-xl p-4 font-mono text-xs">
              <h3 className="text-green-500 font-bold mb-2">LOGS:</h3>
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {logs.map((log, i) => (
                  <div key={i} className="text-gray-300 whitespace-pre-wrap">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
            <h3 className="text-yellow-500 font-semibold mb-2">Manuel SQL Gerekli</h3>
            <p className="text-sm text-gray-400">
              Supabase client'tan CREATE TABLE çalıştırılamaz. SQL'i kopyalayıp
              Supabase Dashboard → SQL Editor'da çalıştırman gerekiyor.
            </p>
            <a
              href="https://supabase.com/dashboard/project/cegqzgprlkxmjubyvabj/sql/new"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-3 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-semibold transition"
            >
              Supabase SQL Editor'ı Aç
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
