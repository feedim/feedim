import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Topluluk Kuralları - Feedim",
  description: "Feedim topluluk kuralları. Saygılı iletişim, özgün içerik, spam yasağı, ihlal yaptırımları ve şikayet süreci hakkında bilgi.",
  keywords: ["feedim topluluk kuralları", "kullanım kuralları", "içerik politikası", "şikayet etme", "ihlal yaptırımları", "nefret söylemi"],
};

export default function CommunityGuidelinesPage() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Topluluk Kuralları</h1>
      <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
        <p>
          Feedim, herkesin kendini güvenli ve rahat hissettiği, yapıcı ve saygılı bir topluluk oluşturmayı
          amaçlamaktadır. Aşağıdaki kurallar, platformumuzun sağlıklı bir şekilde işlemesini ve tüm kullanıcıların
          olumlu bir deneyim yaşamasını sağlamak için belirlenmiştir. Tüm kullanıcılar bu kurallara uymakla
          yükümlüdür.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Saygılı İletişim</h2>
        <p>
          Feedim&apos;de herkes fikirlerini özgürce ifade edebilir, ancak bu ifade özgürlüğü başkalarının haklarına
          zarar vermemelidir. Aşağıdaki davranışlar kesinlikle yasaktır:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Nefret söylemi:</strong> Irk, din, dil, cinsiyet, cinsel yönelim, etnik köken veya engellilik durumuna dayalı nefret ifadeleri</li>
          <li><strong>Taciz ve zorbalık:</strong> Bireylere veya gruplara yönelik sistematik taciz, tehdit ve yıldırma</li>
          <li><strong>Ayrımcılık:</strong> Herhangi bir gruba veya bireye yönelik ayrımcı ifadeler ve davranışlar</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Özgün İçerik</h2>
        <p>
          Feedim, özgün ve yaratıcı içeriklerin paylaşılmasını teşvik eder. İçerik paylaşırken aşağıdaki
          kurallara uyulmalıdır:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Telif hakkıyla korunan içerikleri izinsiz paylaşmak yasaktır</li>
          <li>Başkalarının içeriklerinden alıntı yaparken kaynak belirtilmelidir</li>
          <li>Başkalarının içeriklerini kendi içeriğinizmiş gibi sunmak (intihal) yasaktır</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Spam ve Manipülasyon</h2>
        <p>
          Platform bütünlüğünü korumak için aşağıdaki davranışlar yasaktır:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Aynı veya benzer içeriği tekrar tekrar paylaşmak</li>
          <li>Sahte beğeni, yorum veya takipçi oluşturmak</li>
          <li>Bot veya otomatik araçlar kullanarak etkileşim manipülasyonu yapmak</li>
          <li>Yanıltıcı başlık veya etiketler kullanmak (clickbait)</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Cinsel ve Şiddet İçeren İçerik</h2>
        <p>
          Feedim platformunda aşağıdaki içerik türleri kesinlikle yasaktır:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Çıplaklık ve cinsel içerik barındıran görseller veya metinler</li>
          <li>Pornografik veya müstehcen içerikler</li>
          <li>Aşırı şiddet, kan ve vahşet içeren içerikler</li>
          <li>İntihar veya kendine zarar vermeyi teşvik eden içerikler</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Yanıltıcı Bilgi</h2>
        <p>
          Kasıtlı olarak yanlış veya yanıltıcı bilgi paylaşmak yasaktır. Bu kapsamda:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Dezenformasyon ve propaganda niteliği taşıyan içerikler</li>
          <li>Sahte haber veya manipüle edilmiş bilgiler</li>
          <li>Sağlık, güvenlik veya kamu yararı konularında yanıltıcı bilgiler</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Kişisel Bilgi Paylaşımı (Doxxing)</h2>
        <p>
          Başkalarının kişisel bilgilerini izinsiz olarak paylaşmak kesinlikle yasaktır. Bu kapsamda:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Gerçek isim, adres, telefon numarası gibi kişisel bilgilerin izinsiz paylaşımı</li>
          <li>Özel mesajların veya yazışmaların izinsiz yayınlanması</li>
          <li>Kişinin rızası olmadan özel fotoğrafların paylaşımı</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Yasadışı Faaliyetler</h2>
        <p>
          Platformda yasa dışı içerik paylaşımı ve yasa dışı faaliyetlerin teşviki yasaktır:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Yasadışı madde veya silah ticaretini teşvik etmek</li>
          <li>Dolandırıcılık ve sahtekarlık içeren içerikler</li>
          <li>Terör örgütlerinin propagandasını yapmak</li>
          <li>Herhangi bir suç eylemini teşvik veya yönlendirmek</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Hesap Güvenliği</h2>
        <p>
          Başkalarının hesaplarına izinsiz erişim sağlamak veya erişim sağlamaya teşebbüs etmek
          kesinlikle yasaktır. Bu kapsamda:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Başkalarının hesap bilgilerini ele geçirmeye çalışmak</li>
          <li>Kimlik avına yönelik (phishing) içerik veya bağlantı paylaşmak</li>
          <li>Sahte veya taklitçi hesap oluşturmak</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">İhlal Durumunda Yaptırımlar</h2>
        <p>
          Topluluk kurallarını ihlal eden kullanıcılara kademeli yaptırımlar uygulanır:
        </p>
        <div className="bg-bg-secondary rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-warning font-bold text-xs mt-0.5 shrink-0">1. Aşama</span>
            <div>
              <p className="font-semibold text-text-primary">Uyarı</p>
              <p className="text-text-muted text-xs mt-0.5">İlk ihlalde kullanıcıya uyarı bildirimi gönderilir ve topluluk kuralları hatırlatılır.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-warning font-bold text-xs mt-0.5 shrink-0">2. Aşama</span>
            <div>
              <p className="font-semibold text-text-primary">İçerik Kaldırma</p>
              <p className="text-text-muted text-xs mt-0.5">Tekrarlayan ihlallerde kural dışı içerik kalıcı olarak kaldırılır.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-error font-bold text-xs mt-0.5 shrink-0">3. Aşama</span>
            <div>
              <p className="font-semibold text-text-primary">Geçici Askıya Alma</p>
              <p className="text-text-muted text-xs mt-0.5">Ciddi veya devam eden ihlallerde hesap geçici olarak askıya alınır.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-error font-bold text-xs mt-0.5 shrink-0">4. Aşama</span>
            <div>
              <p className="font-semibold text-text-primary">Kalıcı Hesap Kapatma</p>
              <p className="text-text-muted text-xs mt-0.5">Ağır ihlaller veya ısrarlı kural ihlali durumunda hesap kalıcı olarak kapatılır.</p>
            </div>
          </div>
        </div>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Şikayet Etme</h2>
        <p>
          Topluluk kurallarını ihlal eden bir içerik veya kullanıcı ile karşılaştığınızda şikayet mekanizmasını
          kullanabilirsiniz:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>İçeriğin menüsündeki <strong>&ldquo;Şikayet Et&rdquo;</strong> seçeneğine tıklayın</li>
          <li>Şikayet nedenini seçin (nefret söylemi, spam, cinsel içerik vb.)</li>
          <li>İsteğe bağlı olarak ek açıklama ekleyin</li>
          <li>Şikayetiniz moderasyon ekibi tarafından en kısa sürede değerlendirilecektir</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">İtiraz Hakkı</h2>
        <p>
          İçerikleriniz hakkında alınan moderasyon kararlarına itiraz etme hakkınız vardır.
          İtiraz süreci ve detaylar için{" "}
          <Link href="/help/moderation" className="text-accent-main hover:opacity-80 font-semibold">Moderasyon Sistemi</Link> sayfasını
          inceleyebilirsiniz.
        </p>

        <div className="bg-bg-secondary rounded-xl p-5 mt-8">
          <p className="text-xs text-text-muted">
            Topluluk kuralları hakkında sorularınız için{" "}
            <Link href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">İletişim</Link> sayfamızdan
            veya <a href="mailto:support@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">support@feedim.com</a> adresinden
            bize ulaşabilirsiniz.
          </p>
        </div>
      </div>
    </>
  );
}
