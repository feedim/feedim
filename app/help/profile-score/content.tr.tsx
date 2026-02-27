import Link from "next/link";

export default function ContentTr() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Profil Puanı Sistemi</h1>
      <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
        <p>
          Feedim, saygılı ve güvenli bir topluluk oluşturmayı hedefler. Profil puanı sistemi bu hedefin temel yapı taşlarından biridir.
          Bu sayfa, profil puanının ne olduğunu, neden var olduğunu ve nasıl etkilendiğini açıklar.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Profil Puanı Nedir?</h2>
        <p>
          Profil puanı, <strong>0 ile 100 arasında</strong> bir güven puanıdır. Hesabınızın sağlığını ve güvenilirliğini gösteren bir göstergedir.
          Puanınız ne kadar yüksekse, platformdaki güvenilirliğiniz o kadar fazladır.
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-success" />
            <span className="text-xs"><strong className="text-text-primary">70-100:</strong> Sağlıklı hesap</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-accent-main" />
            <span className="text-xs"><strong className="text-text-primary">40-69:</strong> Orta düzey</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-error" />
            <span className="text-xs"><strong className="text-text-primary">0-39:</strong> Risk altında</span>
          </div>
        </div>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Neden Var?</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Güvenli ve saygılı bir topluluk ortamı sağlamak</li>
          <li>Spam, bot ve kötü niyetli hesapları engellemek</li>
          <li>Kaliteli içerik üretimini teşvik etmek</li>
          <li>Keşfet ve öneriler sisteminde adil bir sıralama sunmak</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Kimler İçin?</h2>
        <p>
          Profil puanı <strong>tüm kullanıcılar</strong> için otomatik olarak hesaplanır. Ayrıca bir başvuru veya aktivasyon gerekmez.
          Hesabınızı oluşturduğunuz andan itibaren puanınız belirlenir ve davranışlarınıza göre güncellenir.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Puanınızı Neler Etkiler?</h2>
        <p>Profil puanı birçok faktöre göre belirlenir. Algoritma detayları paylaşılmasa da genel olarak şu alanlara dikkat edilir:</p>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-accent-main font-bold text-xs mt-0.5 shrink-0">1</span>
            <div>
              <p className="font-semibold text-text-primary">Profil Bilgilerinin Eksiksizliği</p>
              <p className="text-text-muted text-xs mt-0.5">Ad, soyad, biyografi, profil fotoğrafı ve diğer bilgilerin tamamlanmış olması.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-accent-main font-bold text-xs mt-0.5 shrink-0">2</span>
            <div>
              <p className="font-semibold text-text-primary">İçerik Kalitesi</p>
              <p className="text-text-muted text-xs mt-0.5">Paylaştığınız içeriklerin kalitesi, özgünlüğü ve topluluk kurallarına uygunluğu.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-accent-main font-bold text-xs mt-0.5 shrink-0">3</span>
            <div>
              <p className="font-semibold text-text-primary">Topluluk Etkileşimi</p>
              <p className="text-text-muted text-xs mt-0.5">Diğer kullanıcılarla olan etkileşiminiz, aldığınız ve verdiğiniz geri bildirimler.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-accent-main font-bold text-xs mt-0.5 shrink-0">4</span>
            <div>
              <p className="font-semibold text-text-primary">Kurallara Uyum</p>
              <p className="text-text-muted text-xs mt-0.5">Topluluk kurallarına ve platform politikalarına uyum dereceniz.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-accent-main font-bold text-xs mt-0.5 shrink-0">5</span>
            <div>
              <p className="font-semibold text-text-primary">İhlal Geçmişi</p>
              <p className="text-text-muted text-xs mt-0.5">Geçmişte aldığınız ihlal ve uyarı sayısı.</p>
            </div>
          </div>
        </div>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Puanınızı Nasıl Yükseltirsiniz?</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Profil bilgilerinizi eksiksiz doldurun</li>
          <li>Kaliteli ve özgün içerik üretin</li>
          <li>Topluluk kurallarına uyun</li>
          <li>Platformda düzenli ve aktif olun</li>
          <li>Diğer kullanıcılara saygılı davranın</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Puanınızı Ne Düşürür?</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Topluluk kurallarını ihlal etmek</li>
          <li>Spam veya tekrarlayan içerik paylaşmak</li>
          <li>Diğer kullanıcılardan şikayet almak</li>
          <li>Uygunsuz, telif hakkı ihlali veya kopya içerik paylaşmak</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Moderasyon ve Ceza Süreci</h2>
        <div className="bg-bg-secondary rounded-[15px] p-5">
          <p>
            Feedim&apos;de tüm cezalar <strong>insan moderatör ekibi</strong> tarafından verilir. Yapay zeka (AI) yalnızca şüpheli içerikleri tespit eder
            ve moderasyon kuyruğuna gönderir. Hiçbir ceza AI tarafından otomatik olarak uygulanmaz.
            Moderatör ekibi inceleme yaptıktan sonra gerekli görürse ihlal hakkı (strike) ekler.
          </p>
        </div>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">İtiraz</h2>
        <p>
          Profil puanınızın haksız yere düşük olduğunu düşünüyorsanız veya bir moderasyon kararına itiraz etmek istiyorsanız,{" "}
          <Link href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">İletişim</Link> sayfasından başvurabilirsiniz.
          İtirazlar moderasyon ekibi tarafından değerlendirilir.
        </p>

        <div className="bg-bg-secondary rounded-[15px] p-5 mt-8">
          <p className="text-xs text-text-muted">
            Profil puanı sistemi hakkında sorularınız için{" "}
            <Link href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">İletişim</Link> sayfamızdan
            veya <a href="mailto:support@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">support@feedim.com</a> adresinden
            bize ulaşabilirsiniz.
          </p>
        </div>
      </div>
    </>
  );
}
