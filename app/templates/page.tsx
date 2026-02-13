"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import CTASection from "@/components/CTASection";
import TemplateCard from "@/components/TemplateCard";

const TEMPLATE_LIMIT = 6; // Show only 6 templates

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      // Load top 6 templates by purchase count (most popular)
      const { data: templatesData } = await supabase
        .from("templates")
        .select("*")
        .eq("is_active", true)
        .eq("is_public", true)
        .order("purchase_count", { ascending: false, nullsFirst: false })
        .limit(TEMPLATE_LIMIT);

      setTemplates(templatesData || []);
    } catch (error) {
      console.error("Error loading templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateClick = (templateId: string) => {
    // Redirect to register if not authenticated
    window.location.href = '/register';
  };

  return (
    <>
      {/* SEO Metadata in head */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": "Forilove Şablonları",
            "description": "Sevdikleriniz için özel olarak tasarlanmış romantik web sayfası şablonları. Yıldönümü, doğum günü ve özel günler için hazır tasarımlar.",
            "numberOfItems": templates.length,
            "itemListElement": templates.map((template, index) => ({
              "@type": "ListItem",
              "position": index + 1,
              "item": {
                "@type": "Product",
                "name": template.name,
                "description": template.description,
                "offers": {
                  "@type": "Offer",
                  "price": (template.coin_price || 0) / 10, // Convert coins to approximate TRY
                  "priceCurrency": "TRY"
                }
              }
            }))
          })
        }}
      />

      <div className="min-h-screen bg-black text-white">
        <PublicHeader variant="home" />

        {/* Hero Section */}
        <section className="pt-20 pb-12 border-b border-white/10">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl">
              <h1 className="text-4xl sm:text-5xl font-bold mb-6" style={{ lineHeight: 1.2 }}>
                Sevgi Dolu Şablonlar
              </h1>
              <p className="text-lg text-gray-400">
                Sevdikleriniz için özel olarak tasarlanmış profesyonel şablonlar. Yıldönümü, doğum günü ve özel günleriniz için hazır tasarımlar.
              </p>
            </div>
          </div>
        </section>

        {/* Templates Grid */}
        <main className="container mx-auto px-6 py-16">
          {loading ? (
            <div className="flex justify-center py-20" aria-label="Yükleniyor">
              <Heart className="h-12 w-12 text-pink-500 fill-pink-500 animate-pulse" aria-hidden="true" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-20">
              <Heart className="h-20 w-20 text-pink-500/30 mx-auto mb-6" aria-hidden="true" />
              <p className="text-xl text-gray-400">Henüz şablon eklenmedi.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <div key={template.id}>
                  <TemplateCard
                    template={template}
                    isPurchased={false}
                    isSaved={false}
                    showSaveButton={false}
                    showPrice={true}
                    onClick={() => handleTemplateClick(template.id)}
                  />
                </div>
              ))}
            </div>
          )}

        </main>

        <CTASection />

        <PublicFooter />
      </div>
    </>
  );
}
