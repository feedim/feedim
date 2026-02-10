"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Heart } from "lucide-react";

export default function FixTemplatesPage() {
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
      addLog("Starting template fix...");

      const templates = [
        {
          name: 'Romantic Sunset',
          slug: 'romantic-sunset',
          description: 'Beautiful sunset theme for your love story',
          preview_image: 'https://images.unsplash.com/photo-1518568814500-bf0f8d125f46?w=800',
          price: 59,
          coin_price: 100,
          is_active: true,
          is_featured: true,
          creator_only: false,
          structure: {
            blocks: [
              { id: 'block_1', type: 'heading', data: { text: 'Our Love Story', level: 1, alignment: 'center', color: '#FF6B9D' } },
              { id: 'block_2', type: 'text', data: { text: 'Every moment with you is a treasure. Here\'s to many more beautiful memories together.', alignment: 'center', fontSize: 'lg', color: '#666666' } },
              { id: 'block_3', type: 'spacer', data: { height: 40 } },
              { id: 'block_4', type: 'image', data: { url: 'https://images.unsplash.com/photo-1518568814500-bf0f8d125f46?w=800', alt: 'Sunset', width: 80, alignment: 'center', borderRadius: 24 } },
              { id: 'block_5', type: 'divider', data: { width: 50, height: 2, color: '#FF6B9D', style: 'solid' } },
            ],
            styles: { primaryColor: '#FF6B9D', backgroundColor: '#FFF5F7' }
          }
        },
        {
          name: 'Anniversary Special',
          slug: 'anniversary-special',
          description: 'Celebrate your special day with countdown and gallery',
          preview_image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800',
          price: 99,
          coin_price: 200,
          is_active: true,
          is_featured: true,
          creator_only: false,
          structure: {
            blocks: [
              { id: 'block_1', type: 'heading', data: { text: 'Happy Anniversary', level: 1, alignment: 'center', color: '#FF6B9D' } },
              { id: 'block_2', type: 'countdown', data: { title: 'Days Together', targetDate: '2025-12-31', color: '#FF6B9D' } },
              { id: 'block_3', type: 'spacer', data: { height: 60 } },
              { id: 'block_4', type: 'heading', data: { text: 'Our Memories', level: 2, alignment: 'center', color: '#333333' } },
              { id: 'block_5', type: 'image-gallery', data: { title: 'Beautiful Moments', images: [], columns: 3 } },
              { id: 'block_6', type: 'button', data: { text: 'View More', url: '#', alignment: 'center', backgroundColor: '#FF6B9D', textColor: '#FFFFFF', size: 'lg' } },
            ],
            styles: { primaryColor: '#FF6B9D', backgroundColor: '#FFFFFF' }
          }
        },
        {
          name: 'Simple & Elegant',
          slug: 'simple-elegant',
          description: 'Clean and minimal design for modern couples',
          preview_image: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=800',
          price: 129,
          coin_price: 250,
          is_active: true,
          is_featured: false,
          creator_only: false,
          structure: {
            blocks: [
              { id: 'block_1', type: 'heading', data: { text: 'Together Forever', level: 1, alignment: 'center', color: '#2D3748' } },
              { id: 'block_2', type: 'text', data: { text: 'Two souls, one heart. Our journey begins here.', alignment: 'center', fontSize: 'xl', color: '#718096' } },
              { id: 'block_3', type: 'spacer', data: { height: 80 } },
              { id: 'block_4', type: 'image', data: { url: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=800', alt: 'Couple', width: 60, alignment: 'center', borderRadius: 32 } },
              { id: 'block_5', type: 'spacer', data: { height: 60 } },
              { id: 'block_6', type: 'divider', data: { width: 30, height: 3, color: '#2D3748', style: 'solid' } },
              { id: 'block_7', type: 'spacer', data: { height: 40 } },
              { id: 'block_8', type: 'countdown', data: { title: 'Our Special Day', targetDate: '2025-06-15', color: '#2D3748' } },
              { id: 'block_9', type: 'spacer', data: { height: 80 } },
              { id: 'block_10', type: 'image-gallery', data: { title: 'Our Story in Pictures', images: [], columns: 2 } },
            ],
            styles: { primaryColor: '#2D3748', backgroundColor: '#F7FAFC' }
          }
        }
      ];

      for (const template of templates) {
        addLog(`Upserting template: ${template.name}...`);

        const { error } = await supabase
          .from('templates')
          .upsert(template, { onConflict: 'slug' });

        if (error) {
          addLog(`Error: ${error.message}`);
          throw error;
        }

        addLog(`${template.name} updated successfully`);
      }

      addLog("All templates fixed!");
      toast.success("Templates fixed successfully!");

    } catch (error: any) {
      addLog(`Error: ${error.message}`);
      toast.error("Migration failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <Heart className="h-12 w-12 mx-auto mb-4 text-pink-500 fill-pink-500" />
          <h1 className="text-4xl font-bold mb-4">Fix Templates</h1>
          <p className="text-gray-400">Update templates with new block system</p>
        </div>

        <div className="bg-zinc-900 rounded-2xl p-8 border border-white/10">
          <button
            onClick={runMigration}
            disabled={loading}
            className="w-full btn-primary py-4 text-lg mb-4"
          >
            {loading ? 'Fixing Templates...' : 'Fix Templates'}
          </button>

          {logs.length > 0 && (
            <div className="bg-black rounded-xl p-4 font-mono text-xs">
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {logs.map((log, i) => (
                  <div key={i} className="text-gray-300">{log}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
