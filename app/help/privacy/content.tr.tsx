export default function PrivacyContentTr() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-3">Gizlilik Politikası</h1>
      <p className="text-xs text-text-muted mb-10">Son güncelleme: 16 Şubat 2026</p>

      <div className="space-y-8 text-sm text-text-secondary leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">1. Giriş</h2>
          <p>
            Feedim olarak kişisel verilerinizin korunmasına büyük önem veriyoruz. Bu gizlilik
            politikası, hangi verileri topladığımızı, nasıl kullandığımızı ve haklarınızı
            açıklamaktadır.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">2. Veri Sorumlusu</h2>
          <p>
            6698 sayılı KVKK kapsamında veri sorumlusu Feedim&apos;dir. İletişim:{" "}
            <a href="mailto:contact@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">
              contact@feedim.com
            </a>
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">3. Toplanan Veriler</h2>
          <h3 className="text-base font-semibold text-text-primary mt-4 mb-2">Hesap Bilgileri</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-text-secondary">
            <li>Ad, soyad ve e-posta adresi</li>
            <li>Profil fotoğrafı ve biyografi (isteğe bağlı)</li>
          </ul>
          <h3 className="text-base font-semibold text-text-primary mt-4 mb-2">Kullanım Verileri</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-text-secondary">
            <li>Okuma geçmişi ve tercihleri</li>
            <li>Paylaşılan gönderiler, beğeni ve yorum işlemleri</li>
            <li>Jeton işlemleri ve bakiye bilgisi</li>
          </ul>
          <h3 className="text-base font-semibold text-text-primary mt-4 mb-2">Teknik Veriler</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-text-secondary">
            <li>IP adresi, tarayıcı ve cihaz bilgileri</li>
            <li>Çerezler ve oturum verileri</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">4. Verilerin Kullanım Amacı</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm text-text-secondary">
            <li>Hesap oluşturma ve yönetimi</li>
            <li>İçerik önerisi ve kişiselleştirme</li>
            <li>Jeton kazanım hesaplaması ve ödeme işlemleri</li>
            <li>Platform güvenliği ve kötüye kullanım önleme</li>
            <li>Yasal yükümlülüklerin yerine getirilmesi</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">5. Veri Paylaşımı</h2>
          <p>Kişisel verileriniz aşağıdaki durumlar dışında üçüncü taraflarla paylaşılmaz:</p>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li>Yasal zorunluluk halinde yetkili makamlarla</li>
            <li>Ödeme işlemleri için ödeme sağlayıcılarıyla</li>
            <li>Altyapı hizmeti sağlayıcılarıyla (barındırma, e-posta)</li>
          </ul>
          <p className="mt-3">Verileriniz reklam amaçlı üçüncü taraflara satılmaz.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">6. Veri Güvenliği</h2>
          <p>
            Verileriniz endüstri standardı güvenlik önlemleriyle korunmaktadır. Şifreler
            hash&apos;lenerek saklanır ve iletişim SSL/TLS ile şifrelenir.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">7. KVKK Haklarınız</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm text-text-secondary">
            <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
            <li>İşlenme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenme</li>
            <li>Verilerin aktarıldığı üçüncü kişileri bilme</li>
            <li>Eksik veya yanlış işlenmiş verilerin düzeltilmesini isteme</li>
            <li>Verilerin silinmesini veya yok edilmesini isteme</li>
            <li>Otomatik analiz sonucu aleyhinize bir sonucun çıkmasına itiraz etme</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">8. Veri Saklama</h2>
          <p>
            Verileriniz hesabınız aktif olduğu sürece saklanır. Hesap silindiğinde
            yasal sürelere tabi olanlar hariç 30 gün içinde kalıcı olarak silinir.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">9. İletişim</h2>
          <p>
            Sorularınız için{" "}
            <a href="mailto:contact@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">
              contact@feedim.com
            </a>{" "}
            adresinden bize ulaşabilirsiniz.
          </p>
        </section>
      </div>
    </>
  );
}
