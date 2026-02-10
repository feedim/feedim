"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function MigratePage() {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const TEMPLATE_STRUCTURES = {
    'romantic-sunset': {
      blocks: [
        {
          id: 'block_1',
          type: 'countdown',
          data: {
            title: 'Birlikte Olduğumuz Günler',
            targetDate: '2025-12-31',
            color: '#FF6B9D',
          },
        },
      ],
      styles: {
        primaryColor: '#FF6B9D',
        backgroundColor: '#FFF5F7',
      },
    },
    'anniversary-special': {
      blocks: [
        {
          id: 'block_1',
          type: 'countdown',
          data: {
            title: 'Yıldönümümüze Geri Sayım',
            targetDate: '2025-12-31',
            color: '#FF6B9D',
          },
        },
        {
          id: 'block_2',
          type: 'image-gallery',
          data: {
            title: 'Anılarımız',
            images: [],
            columns: 3,
          },
        },
      ],
      styles: {
        primaryColor: '#FF6B9D',
        backgroundColor: '#FFFFFF',
      },
    },
    'simple-elegant': {
      blocks: [
        {
          id: 'block_1',
          type: 'countdown',
          data: {
            title: 'Seninle Geçen Her Gün',
            targetDate: '2025-12-31',
            color: '#FF6B9D',
          },
        },
        {
          id: 'block_2',
          type: 'image-gallery',
          data: {
            title: 'Bizim Hikayemiz',
            images: [],
            columns: 2,
          },
        },
      ],
      styles: {
        primaryColor: '#FF6B9D',
        backgroundColor: '#F8F8F8',
      },
    },
  };

  const migrateTemplates = async () => {
    setLoading(true);
    try {
      // Get all templates
      const { data: templates, error } = await supabase
        .from('templates')
        .select('*');

      if (error) throw error;

      if (process.env.NODE_ENV === 'development') {
        console.log(`Found ${templates?.length || 0} templates`);
      }

      let migrated = 0;
      let skipped = 0;

      // Update each template
      for (const template of templates || []) {
        const structure = TEMPLATE_STRUCTURES[template.slug as keyof typeof TEMPLATE_STRUCTURES];

        if (!structure) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`No migration structure for: ${template.slug}`);
          }
          skipped++;
          continue;
        }

        const { error: updateError } = await supabase
          .from('templates')
          .update({ structure })
          .eq('id', template.id);

        if (updateError) {
          if (process.env.NODE_ENV === 'development') {
            console.error(`Error updating ${template.slug}:`, updateError);
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log(`Migrated: ${template.name}`);
          }
          migrated++;
        }
      }

      toast.success(`Migration complete! Migrated: ${migrated}, Skipped: ${skipped}`);
    } catch (error: any) {
      console.error(error);
      toast.error('Migration failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6 py-12">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Template Migration</h1>
          <p className="text-gray-400 mb-8">
            Bu sayfa mevcut template'leri yeni block sistemine güncelleyecek.
          </p>
        </div>

        <div className="bg-zinc-900 rounded-2xl p-8 border border-white/10">
          <h2 className="text-2xl font-bold mb-4">Migration İşlemleri</h2>

          <div className="space-y-4">
            <div className="bg-zinc-800 rounded-xl p-4">
              <h3 className="font-semibold mb-2">Güncellenecek Template'ler:</h3>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Romantik Gün Batımı (romantic-sunset)</li>
                <li>• Yıldönümü Özel (anniversary-special)</li>
                <li>• Sade ve Şık (simple-elegant)</li>
              </ul>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
              <p className="text-yellow-500 text-sm">
                Bu işlem geri alınamaz. Mevcut template yapıları block sistemine dönüştürülecek.
              </p>
            </div>

            <button
              onClick={migrateTemplates}
              disabled={loading}
              className="w-full btn-primary py-4 text-lg"
            >
              {loading ? 'Migration Yapılıyor...' : 'Migration Başlat'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
