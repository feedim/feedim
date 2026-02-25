import Link from "next/link";

export default function ContentTr() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Veri Paylaşımı ve Üçüncü Taraf Erişimi</h1>
      <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
        <p>
          Feedim, kullanıcılarının gizliliğine ve veri güvenliğine büyük önem vermektedir.
          Bu sayfada, hangi verilerin toplandığı, nasıl kullanıldığı ve kimlerle paylaşıldığını
          şeffaf bir şekilde açıklıyoruz.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Feedim Hangi Verileri Toplar?</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Profil bilgileri:</strong> Kullanıcı adı, e-posta adresi, doğum tarihi, profil fotoğrafı ve biyografi</li>
          <li><strong>İçerik verileri:</strong> Gönderiler, yorumlar, momentler ve paylaşılan medya dosyaları</li>
          <li><strong>Etkileşim verileri:</strong> Beğeniler, yorumlar, takip ilişkileri ve okuma geçmişi</li>
          <li><strong>Cihaz ve IP bilgileri:</strong> Tarayıcı türü, işletim sistemi, IP adresi ve erişim zamanları</li>
          <li><strong>Ödeme bilgileri:</strong> Abonelik ve satın alma işlemleriyle ilgili fatura bilgileri</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Üçüncü Taraf Paylaşımı</h2>
        <p>
          Feedim, kullanıcı verilerini reklam amacıyla <strong>satmaz</strong> ve üçüncü taraf reklam ağlarıyla
          paylaşmaz. Veriler yalnızca platformun işleyişi için gerekli olan hizmet sağlayıcılarıyla minimum
          düzeyde paylaşılır:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Hosting sağlayıcısı:</strong> Platformun barındırıldığı sunucu hizmetleri</li>
          <li><strong>Ödeme işlemcisi:</strong> Ödeme işlemlerinin gerçekleştirilmesi için</li>
          <li><strong>E-posta servisi:</strong> Bildirim ve doğrulama e-postalarının gönderimi için</li>
        </ul>
        <p>
          Bu hizmet sağlayıcılarla yalnızca hizmetin yerine getirilmesi için gerekli olan minimum düzey
          veri paylaşılır ve tüm sağlayıcılar veri koruma sözleşmelerine tabidir.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Ödeme Verileri</h2>
        <p>
          Feedim üzerindeki tüm ödeme işlemleri <strong>PayTR</strong> ödeme altyapısı aracılığıyla gerçekleştirilir.
          Kredi kartı ve banka kartı bilgileriniz Feedim sunucularında <strong>saklanmaz</strong>. Ödeme bilgileri
          doğrudan PayTR tarafından güvenli bir şekilde işlenir ve saklanır. Feedim yalnızca işlem sonucu
          (başarılı/başarısız) ve fatura bilgilerini tutar.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Devlet Yetkilileriyle Paylaşım</h2>
        <p>
          Feedim, yasal zorunluluk halinde kullanıcı verilerini yetkili makamlarla paylaşmak durumunda kalabilir.
          Bu paylaşım yalnızca aşağıdaki durumlarda ve minimum düzeyde gerçekleştirilir:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Mahkeme kararı ile talep edilen veriler</li>
          <li>Savcılık soruşturması kapsamındaki talepler</li>
          <li>Yasal mevzuatın zorunlu kıldığı diğer durumlar</li>
        </ul>
        <p>
          Tüm veri paylaşımları <strong>6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK)</strong> kapsamında
          ve ilgili mevzuata uygun olarak gerçekleştirilir.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Çerezler ve İzleme</h2>
        <p>
          Feedim, platformun düzgün çalışması için oturum ve tercih çerezleri kullanır.
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4">
          <p>
            Feedim, <strong className="text-text-primary">3. taraf takip çerezleri kullanmaz</strong>. Kullanıcı davranışları
            üçüncü taraf reklam ağları veya analitik servisleri tarafından izlenmez.
          </p>
        </div>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Haklarınız ve Veri Güvenliği</h2>
        <p>
          KVKK kapsamındaki haklarınız, veri saklama süreleri ve veri güvenliği önlemlerimiz hakkında
          detaylı bilgi için{" "}
          <Link href="/help/privacy" className="text-accent-main hover:opacity-80 font-semibold">Gizlilik Politikası</Link> sayfamızı
          inceleyebilirsiniz.
        </p>

        <div className="bg-bg-secondary rounded-[15px] p-5 mt-8">
          <p className="text-xs text-text-muted">
            Veri paylaşımı hakkında sorularınız için{" "}
            <Link href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">İletişim</Link> sayfamızdan
            veya <a href="mailto:support@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">support@feedim.com</a> adresinden
            bize ulaşabilirsiniz.
          </p>
        </div>
      </div>
    </>
  );
}
