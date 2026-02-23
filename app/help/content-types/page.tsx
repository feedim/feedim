import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "İçerik Türleri - Feedim",
  description: "Feedim'de paylaşabileceğiniz içerik türleri: gönderi, video ve moment. Her içerik türünün özellikleri, limitleri ve oluşturma adımları.",
  keywords: ["feedim içerik türleri", "gönderi yazma", "video yükleme", "moment paylaşma", "içerik oluşturma", "feedim post", "feedim video"],
};

export default function ContentTypesPage() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">İçerik Türleri</h1>
      <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
        <p>
          Feedim&apos;de üç farklı içerik türü ile kendinizi ifade edebilirsiniz: <strong>Gönderi (Post)</strong>,{" "}
          <strong>Video</strong> ve <strong>Moment</strong>. Her içerik türü farklı amaçlara hizmet eder ve kendine özgü
          özelliklere sahiptir.
        </p>

        {/* ── Gönderi (Post) ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Gönderi (Post)</h2>
        <p>
          Gönderi, Feedim&apos;in temel metin tabanlı içerik formatıdır. Zengin metin editörü sayesinde içeriğinizi
          biçimlendirip görsellerle destekleyebilirsiniz.
        </p>
        <div className="bg-bg-secondary rounded-xl p-4 space-y-3">
          <p className="font-semibold text-text-primary text-xs uppercase tracking-wide">Gönderi Özellikleri</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Zengin metin editörü ile içerik yazma (kalın, italik, başlık, liste vb.)</li>
            <li>Gönderi içine görsel ekleme desteği</li>
            <li>Kapak görseli yükleme</li>
            <li>Etiket ekleme (max 5 adet)</li>
            <li>SEO meta alanları (meta başlık ve meta açıklama)</li>
          </ul>
        </div>

        {/* ── Video ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Video</h2>
        <p>
          Video içerikler ile daha uzun ve detaylı görsel anlatımlar oluşturabilirsiniz.
          Feedim, popüler video formatlarını destekler ve otomatik küçük resim oluşturma imkanı sunar.
        </p>
        <div className="bg-bg-secondary rounded-xl p-4 space-y-3">
          <p className="font-semibold text-text-primary text-xs uppercase tracking-wide">Video Özellikleri</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Desteklenen formatlar: <strong>MP4, WebM, MOV</strong> ve daha fazlası</li>
            <li>Maksimum dosya boyutu: <strong>500 MB</strong></li>
            <li>Maksimum video süresi: <strong>30 dakika</strong></li>
            <li>Otomatik thumbnail (küçük resim) oluşturma</li>
            <li>Manuel küçük resim yükleme seçeneği</li>
            <li>Video açıklaması (maksimum <strong>2.000 karakter</strong>)</li>
          </ul>
        </div>

        {/* ── Moment ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Moment</h2>
        <p>
          Moment, kısa ve etkili video paylaşımları için tasarlanmış bir formattır. Dikey videolara odaklanan
          bu format, hızlı tüketim ve hızlı paylaşım için idealdir.
        </p>
        <div className="bg-bg-secondary rounded-xl p-4 space-y-3">
          <p className="font-semibold text-text-primary text-xs uppercase tracking-wide">Moment Özellikleri</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Maksimum süre: <strong>60 saniye</strong></li>
            <li>Dikey video odaklı format (9:16 oran önerilir)</li>
            <li>Hızlı paylaşım &mdash; basit ve hızlı oluşturma akışı</li>
            <li>Carousel (kaydırmalı) görünümde gösterilir</li>
          </ul>
        </div>

        {/* ── Ortak Ayarlar ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Tüm İçerik Türlerinde Ortak Ayarlar</h2>
        <p>
          Hangi içerik türünü seçerseniz seçin, aşağıdaki ayarlar tüm içerikler için geçerlidir:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Başlık:</strong> 3 ile 200 karakter arasında olmalıdır</li>
          <li><strong>Etiketler:</strong> İçeriğinize en fazla 5 etiket ekleyebilirsiniz</li>
          <li><strong>Yorumlara izin verme:</strong> İçeriğinize yorum yapılıp yapılamayacağını belirleyebilirsiniz</li>
          <li><strong>Çocuklara özel işareti:</strong> İçeriğinizin çocuklara uygun olduğunu belirtebilirsiniz</li>
          <li><strong>Telif hakkı koruması:</strong> İçeriğinizi kopya içeriğe karşı koruma altına alabilirsiniz</li>
        </ul>

        {/* ── İçerik Oluşturma Adımları ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">İçerik Oluşturma Adımları</h2>
        <p>
          Feedim&apos;de içerik oluşturma süreci 2 basit adımdan oluşur:
        </p>
        <div className="bg-bg-secondary rounded-xl p-4 space-y-4">
          <div className="flex items-start gap-3">
            <span className="bg-accent-main text-white font-bold text-xs w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5">1</span>
            <div>
              <p className="font-semibold text-text-primary">İçerik Yazma</p>
              <p className="text-text-muted text-xs mt-0.5">
                İçerik türüne göre metninizi yazın, videonuzu veya moment&apos;inizi yükleyin. Zengin metin editörünü
                kullanarak içeriğinizi biçimlendirebilirsiniz.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="bg-accent-main text-white font-bold text-xs w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5">2</span>
            <div>
              <p className="font-semibold text-text-primary">Detaylar</p>
              <p className="text-text-muted text-xs mt-0.5">
                Başlık, etiketler, kapak görseli, SEO ayarları ve diğer tercihleri belirleyin. Ardından
                içeriğinizi yayınlayın.
              </p>
            </div>
          </div>
        </div>

        {/* ── Taslak ve Otomatik Kaydetme ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Taslak Kaydetme ve Otomatik Kaydetme</h2>
        <p>
          Feedim, içerik oluştururken çalışmanızı kaybetmemeniz için otomatik kaydetme özelliği sunar.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>İçeriğiniz her <strong>30 saniyede</strong> bir otomatik olarak taslak halinde kaydedilir</li>
          <li>Tarayıcınızı kapatsanız bile taslağınıza daha sonra geri dönebilirsiniz</li>
          <li>Yayınlamadan önce dilediğiniz kadar düzenleme yapabilirsiniz</li>
        </ul>

        {/* ── İçerik Düzenleme ve Silme ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">İçerik Düzenleme ve Silme</h2>
        <p>
          Yayınladığınız içerikleri daha sonra düzenleyebilir veya tamamen silebilirsiniz.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>İçerik menüsünden <strong>&ldquo;Düzenle&rdquo;</strong> seçeneğini kullanarak başlık, metin, etiketler ve diğer ayarları güncelleyebilirsiniz</li>
          <li>İçerik menüsünden <strong>&ldquo;Sil&rdquo;</strong> seçeneği ile içeriğinizi kalıcı olarak kaldırabilirsiniz</li>
          <li>Silinen içerikler geri getirilemez &mdash; bu işlem kalıcıdır</li>
        </ul>

        {/* ── İçerik Kuralları ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">İçerik Kuralları</h2>
        <p>
          Tüm içerikler topluluk kurallarına ve yasalara uygun olmalıdır. Detaylı kurallar için{" "}
          <Link href="/help/community-guidelines" className="text-accent-main hover:opacity-80 font-semibold">Topluluk Kuralları</Link> ve{" "}
          <Link href="/help/copyright" className="text-accent-main hover:opacity-80 font-semibold">Telif Hakkı Koruması</Link> sayfalarını
          inceleyebilirsiniz.
        </p>

        <div className="bg-bg-secondary rounded-xl p-5 mt-8">
          <p className="text-xs text-text-muted">
            İçerik oluşturma ile ilgili sorularınız için{" "}
            <Link href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">İletişim</Link> sayfamızdan
            veya <a href="mailto:support@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">support@feedim.com</a> adresinden
            bize ulaşabilirsiniz.
          </p>
        </div>
      </div>
    </>
  );
}
