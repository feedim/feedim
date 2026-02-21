"use client";

import { useState, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Search, ChevronRight, X, HelpCircle, Mail,
  Heart, MessageCircle, Bell, Home, Bookmark,
} from "lucide-react";

interface Article {
  question: string;
  answer: React.ReactNode;
  searchText: string;
  section: string;
}

interface PageLink {
  title: string;
  href: string;
  description: string;
}

const lnk = "text-accent-main hover:opacity-80 font-semibold";
const ico = "inline-block h-4 w-4 text-accent-main align-text-bottom mx-0.5";

const ShareIcon = () => (
  <svg className={ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);

const sections = [
  { id: "hesap", label: "Hesap ve Kayıt" },
  { id: "guvenlik", label: "Gizlilik ve Güvenlik" },
  { id: "profil", label: "Profil ve Ayarlar" },
  { id: "icerik", label: "Gönderi, Video ve İçerik" },
  { id: "etkilesim", label: "Etkileşim ve Sosyal" },
  { id: "bildirim", label: "Bildirimler" },
  { id: "jeton", label: "Jeton ve Kazanç" },
  { id: "premium", label: "Premium Üyelik" },
  { id: "kesfet", label: "Keşfet ve Arama" },
  { id: "sorun", label: "Sorun Giderme" },
];

const pageLinks: PageLink[] = [
  { title: "Yardım Merkezi", href: "/help", description: "Sık sorulan sorular ve yardım makaleleri" },
  { title: "Hakkımızda", href: "/help/about", description: "Feedim hakkında bilgi" },
  { title: "Kullanım Koşulları", href: "/help/terms", description: "Platform kullanım koşulları ve kuralları" },
  { title: "Gizlilik Politikası", href: "/help/privacy", description: "Kişisel verilerin korunması ve gizlilik" },
  { title: "KVKK", href: "/help/privacy", description: "Kişisel Verilerin Korunması Kanunu" },
  { title: "İletişim", href: "/help/contact", description: "Bize ulaşın, destek alın" },
  { title: "Sorumluluk Reddi", href: "/help/disclaimer", description: "Yasal sorumluluk reddi beyanı" },
  { title: "Premium", href: "/premium", description: "Premium üyelik planları ve fiyatları" },
  { title: "Mesafeli Satış Sözleşmesi", href: "/help/distance-sales-contract", description: "Jeton ve premium satın alma sözleşmesi" },
  { title: "Ön Bilgilendirme Formu", href: "/help/pre-information-form", description: "Mesafeli satış öncesi tüketici bilgilendirmesi" },
  { title: "Ödeme Güvenliği", href: "/help/payment-security", description: "SSL, 3D Secure ve PCI-DSS ödeme güvenliği" },
  { title: "İade Politikası", href: "/help/refund-policy", description: "Jeton ve premium üyelik iade koşulları" },
];

const articles: Article[] = [
  // ─── Hesap ve Kayıt ─────────────────────────────────────────
  {
    section: "hesap",
    question: "Nasıl hesap oluştururum?",
    searchText: "Ana sayfadaki Hesap oluştur butonuna tıklayın. Ad, soyad, kullanıcı adı, e-posta ve şifre bilgilerinizi girin. Google hesabınızla da kayıt olabilirsiniz. Kayıt sonrası e-postanıza doğrulama bağlantısı gönderilir.",
    answer: <>Ana sayfadaki <strong>&lsquo;Hesap oluştur&rsquo;</strong> butonuna tıklayın. Ad, soyad, kullanıcı adı, e-posta ve şifre bilgilerinizi girin. Google hesabınızla da hızlıca kayıt olabilirsiniz. Kayıt sonrası e-posta adresinize bir doğrulama bağlantısı gönderilir — bu bağlantıya tıklayarak hesabınızı aktifleştirin.</>,
  },
  {
    section: "hesap",
    question: "Google ile nasıl kayıt olurum veya giriş yaparım?",
    searchText: "Google ile devam et butonuna tıklayarak Google hesabınızla doğrudan giriş yapabilirsiniz. Hesabınız yoksa otomatik oluşturulur. Google profil fotoğrafınız ve adınız aktarılır.",
    answer: <><strong>&lsquo;Google ile devam et&rsquo;</strong> butonuna tıklayarak Google hesabınızla doğrudan giriş yapabilirsiniz. Daha önce bir Feedim hesabınız yoksa otomatik olarak oluşturulur. Google hesabınızdaki ad ve profil fotoğrafı otomatik aktarılır. Ayrı bir şifre belirlemenize gerek yoktur.</>,
  },
  {
    section: "hesap",
    question: "E-posta doğrulama nasıl yapılır?",
    searchText: "Kayıt olduktan sonra e-posta adresinize bir doğrulama bağlantısı gönderilir. Bu bağlantıya tıklayarak hesabınızı doğrulayın. Doğrulama yapılmazsa bazı özellikler kısıtlı olabilir.",
    answer: <>Kayıt olduktan sonra e-posta adresinize bir doğrulama bağlantısı gönderilir. Bu bağlantıya tıklayarak hesabınızı doğrulayın. Doğrulanmamış hesaplarda gönderi oluşturma ve bazı etkileşim özellikleri kısıtlı olabilir. Bağlantı gelmezse spam klasörünüzü kontrol edin. <Link href="/help/contact" className={lnk}>Destek ekibimize</Link> ulaşarak yardım alabilirsiniz.</>,
  },
  {
    section: "hesap",
    question: "E-posta adresimi değiştirebilir miyim?",
    searchText: "Ayarlar Güvenlik bölümünden e-posta adresinizi güncelleyebilirsiniz. Yeni adresinize doğrulama bağlantısı gönderilir.",
    answer: <>Evet. <strong>Ayarlar → Güvenlik</strong> bölümünden e-posta adresinizi güncelleyebilirsiniz. Değişiklik sonrası yeni e-posta adresinize bir doğrulama bağlantısı gönderilir. Doğrulamadan önce eski e-posta adresiniz aktif kalır.</>,
  },
  {
    section: "hesap",
    question: "Birden fazla cihazdan giriş yapabilir miyim?",
    searchText: "Evet, hesabınıza aynı anda birden fazla cihazdan giriş yapabilirsiniz. Güvenlik bölümünden oturumları yönetebilirsiniz.",
    answer: "Evet, hesabınıza aynı anda birden fazla cihazdan giriş yapabilirsiniz. Her cihazda ayrı bir oturum açılır. Tüm oturumları sonlandırmak isterseniz Ayarlar → Güvenlik bölümünden aktif oturumları görebilir ve kapatabilirsiniz.",
  },
  {
    section: "hesap",
    question: "Giriş yapmadan platformu kullanabilir miyim?",
    searchText: "Evet, giriş yapmadan ana sayfa ve keşfet bölümünü gezebilir, gönderileri okuyabilirsiniz. Gönderi oluşturma, beğenme, yorum yapma ve takip etme için hesap gerekir.",
    answer: <>Evet, giriş yapmadan ana sayfa ve <Link href="/dashboard/explore" className={lnk}>keşfet</Link> bölümünü gezebilir, gönderileri okuyabilirsiniz. Ancak gönderi oluşturma, beğenme, yorum yapma ve takip etme gibi etkileşimler için hesap oluşturmanız gerekir.</>,
  },
  {
    section: "hesap",
    question: "Kayıtlı hesaplar özelliği nedir?",
    searchText: "Giriş yaptığınızda hesabınız cihazınıza kaydedilir. Sonraki girişte tek tıkla seçebilirsiniz. En fazla 5 hesap kaydedilir.",
    answer: "Giriş yaptığınızda hesabınız otomatik olarak cihazınıza kaydedilir. Bir sonraki girişinizde tek tıkla hesabınızı seçerek hızlıca erişebilirsiniz. En fazla 5 hesap kaydedilir. İstediğiniz hesabı listeden kaldırabilirsiniz. Kayıtlı hesap verisi yalnızca cihazınızda saklanır.",
  },
  {
    section: "hesap",
    question: "Hesap türleri nelerdir?",
    searchText: "Feedim'de ücretsiz standart hesap ve Premium hesap olmak üzere iki tür vardır. Premium üyeler ek özelliklerden yararlanır.",
    answer: <>Feedim&apos;de iki hesap türü vardır: <strong>Standart</strong> (ücretsiz) ve <strong>Premium</strong>. Standart hesapla gönderi oluşturabilir, yorum yapabilir ve etkileşime geçebilirsiniz. Premium hesap ek özellikler sunar: reklamsız deneyim, öncelikli destek, özel rozet ve daha fazlası. Detaylar için <Link href="/premium" className={lnk}>Premium sayfasını</Link> inceleyin.</>,
  },

  // ─── Gizlilik ve Güvenlik ───────────────────────────────────
  {
    section: "guvenlik",
    question: "Şifremi unuttum, ne yapmalıyım?",
    searchText: "Giriş sayfasındaki Şifremi Unuttum bağlantısına tıklayın. E-posta adresinizi girin, şifre sıfırlama bağlantısı gönderilir.",
    answer: <>Giriş sayfasındaki <strong>&lsquo;Şifremi Unuttum&rsquo;</strong> bağlantısına tıklayın. E-posta adresinizi girin, size bir şifre sıfırlama bağlantısı gönderilir. Bağlantıya tıklayarak yeni şifrenizi belirleyin. Bağlantı gelmezse spam klasörünüzü kontrol edin.</>,
  },
  {
    section: "guvenlik",
    question: "Şifremi nasıl değiştiririm?",
    searchText: "Ayarlar Güvenlik bölümünden mevcut şifrenizi ve yeni şifrenizi girerek değiştirebilirsiniz. Şifre en az 6 karakter olmalıdır.",
    answer: <><strong>Ayarlar → Güvenlik</strong> bölümünden mevcut şifrenizi ve yeni şifrenizi girerek değiştirebilirsiniz. Şifreniz en az 6 karakter olmalıdır. Değişiklik sonrası diğer cihazlardaki oturumlarınız açık kalır. Güvenliğiniz için güçlü ve benzersiz bir şifre seçmenizi öneririz.</>,
  },
  {
    section: "guvenlik",
    question: "İki faktörlü doğrulama (MFA) nedir?",
    searchText: "İki faktörlü doğrulama hesabınıza ekstra güvenlik katmanı ekler. Her girişte şifrenin yanı sıra doğrulama kodu girmeniz gerekir.",
    answer: "İki faktörlü doğrulama (MFA), hesabınıza ekstra bir güvenlik katmanı ekler. Aktifleştirdikten sonra her girişte şifrenizin yanı sıra bir doğrulama kodu girmeniz gerekir. Bu özellik hesabınızı yetkisiz erişimlere karşı korur. Ayarlar → Güvenlik bölümünden aktifleştirebilirsiniz.",
  },
  {
    section: "guvenlik",
    question: "Gizli hesap nedir?",
    searchText: "Gizli hesap açtığınızda gönderileriniz yalnızca takipçilerinize görünür. Yeni takip istekleri onayınıza sunulur.",
    answer: <>Gizli hesap açtığınızda gönderileriniz yalnızca takipçilerinize görünür. Birisi sizi takip etmek istediğinde sizden onay bekler. Mevcut takipçileriniz etkilenmez. <strong>Ayarlar → Gizlilik</strong> bölümünden hesabınızı gizliye alabilir veya tekrar herkese açık yapabilirsiniz.</>,
  },
  {
    section: "guvenlik",
    question: "Bir kullanıcıyı nasıl engellerim?",
    searchText: "Engellemek istediğiniz kullanıcının profilindeki menüden Engelle seçeneğini kullanın. Engellenen kullanıcılar içeriklerinizi göremez.",
    answer: <>Engellemek istediğiniz kullanıcının profilindeki üç nokta menüsünden <strong>&lsquo;Engelle&rsquo;</strong> seçeneğini kullanın. Engellenen kullanıcılar içeriklerinizi göremez, size yorum yapamaz ve mesaj gönderemez. Engelleme işlemi karşı tarafa bildirilmez. Engeli istediğiniz zaman kaldırabilirsiniz.</>,
  },
  {
    section: "guvenlik",
    question: "Engeli nasıl kaldırırım?",
    searchText: "Ayarlar Gizlilik bölümündeki engellenen kullanıcılar listesinden engeli kaldırabilirsiniz.",
    answer: "Ayarlar → Gizlilik → Engellenen Kullanıcılar bölümünden engellediğiniz kişilerin listesini görebilirsiniz. Engeli kaldırmak istediğiniz kullanıcının yanındaki butona tıklayın. Engel kaldırıldığında ilgili kullanıcı tekrar içeriklerinizi görebilir ve size etkileşimde bulunabilir.",
  },
  {
    section: "guvenlik",
    question: "Bir içeriği veya kullanıcıyı nasıl şikayet ederim?",
    searchText: "İçeriğin veya profilin menüsünden Şikayet Et seçeneğini kullanın. Şikayet nedenini seçin ve gönderin. Ekibimiz tarafından incelenir.",
    answer: <>İçeriğin veya profilin üç nokta menüsünden <strong>&lsquo;Şikayet Et&rsquo;</strong> seçeneğini kullanın. Şikayet nedenini seçin (spam, nefret söylemi, taciz vb.) ve gönderin. Şikayetiniz ekibimiz tarafından en kısa sürede incelenir ve gerekli işlem yapılır. Şikayetiniz anonim tutulur.</>,
  },
  {
    section: "guvenlik",
    question: "Hesabımı nasıl dondururum?",
    searchText: "Ayarlar Güvenlik bölümünden hesabınızı dondurabilirsiniz. Dondurulan hesap aramada ve profilden görünmez olur. Tekrar giriş yaparak aktifleştirin.",
    answer: "Ayarlar → Güvenlik bölümünden hesabınızı geçici olarak dondurabilirsiniz. Dondurulan hesap arama sonuçlarında görünmez olur ve profilinize erişilemez. İçerikleriniz ve verileriniz korunur. Tekrar giriş yaparak hesabınızı istediğiniz zaman aktifleştirebilirsiniz.",
  },
  {
    section: "guvenlik",
    question: "Hesabımı kalıcı olarak nasıl silerim?",
    searchText: "Ayarlar Güvenlik bölümünden hesabınızı kalıcı olarak silebilirsiniz. Bu işlem geri alınamaz. Tüm verileriniz 30 gün içinde silinir.",
    answer: <>Ayarlar → Güvenlik bölümünden hesabınızı kalıcı olarak silebilirsiniz. <strong>Bu işlem geri alınamaz.</strong> Tüm gönderileriniz, yorumlarınız, Jeton bakiyeniz ve kişisel verileriniz 30 gün içinde kalıcı olarak silinir. Silme işlemini onaylamak için &lsquo;DELETE&rsquo; yazmanız gerekir. Daha fazla bilgi için <Link href="/help/privacy" className={lnk}>Gizlilik Politikası</Link> sayfamızı inceleyin.</>,
  },
  {
    section: "guvenlik",
    question: "Verilerim nasıl korunuyor?",
    searchText: "Şifreler güvenli hash ile saklanır. SSL/TLS şifreleme kullanılır. Veriler reklam amaçlı satılmaz. KVKK uyumlu veri işleme.",
    answer: <>Şifreleriniz güvenli şekilde hash&apos;lenerek saklanır ve hiçbir zaman düz metin olarak tutulmaz. Tüm iletişim SSL/TLS ile şifrelenir. Verileriniz reklam amaçlı üçüncü taraflara satılmaz. KVKK kapsamında kişisel verileriniz korunur. Detaylı bilgi için <Link href="/help/privacy" className={lnk}>Gizlilik Politikası</Link> ve <Link href="/help/terms" className={lnk}>Kullanım Koşulları</Link> sayfalarımızı inceleyebilirsiniz.</>,
  },

  // ─── Profil ve Ayarlar ──────────────────────────────────────
  {
    section: "profil",
    question: "Profilimi nasıl düzenlerim?",
    searchText: "Profil sayfanızdaki Profili Düzenle butonuna tıklayın. Ad, soyad, kullanıcı adı, biyografi, profil fotoğrafı, doğum tarihi ve website bilgilerinizi güncelleyebilirsiniz.",
    answer: <>Profil sayfanızdaki <strong>&lsquo;Profili Düzenle&rsquo;</strong> butonuna tıklayın. Ad, soyad, kullanıcı adı, biyografi, profil fotoğrafı, doğum tarihi, cinsiyet ve website bilgilerinizi güncelleyebilirsiniz. Değişiklikler kaydettikten sonra anında yansır.</>,
  },
  {
    section: "profil",
    question: "Kullanıcı adı nedir ve nasıl değiştirilir?",
    searchText: "Kullanıcı adı profilinizin benzersiz tanımlayıcısıdır. 3-15 karakter, harf, rakam, nokta ve alt çizgi kullanabilirsiniz. Profil düzenleme ekranından değiştirebilirsiniz.",
    answer: "Kullanıcı adı, profilinizin benzersiz tanımlayıcısıdır ve URL'nizde görünür (feedim.com/u/kullaniciadi). Profil düzenleme ekranından değiştirebilirsiniz. Kullanıcı adı 3-15 karakter arasında olmalı, yalnızca harf, rakam, nokta ve alt çizgi içerebilir. Seçtiğiniz kullanıcı adının müsait olması gerekir — anlık olarak kontrol edilir.",
  },
  {
    section: "profil",
    question: "Profil fotoğrafımı nasıl değiştiririm?",
    searchText: "Profil düzenleme ekranındaki kamera simgesine tıklayın, görsel seçin ve kırpma aracıyla ayarlayın. Maksimum 10 MB.",
    answer: "Profil düzenleme ekranındaki kamera simgesine tıklayın, bir görsel seçin ve kırpma aracıyla istediğiniz şekilde ayarlayın. Maksimum dosya boyutu 10 MB'dır. Fotoğrafınızı istediğiniz zaman kaldırabilir veya yenisiyle değiştirebilirsiniz.",
  },
  {
    section: "profil",
    question: "Biyografi nedir?",
    searchText: "Biyografi profilinizde görünen kısa bir tanıtım metnidir. En fazla 150 karakter. Kendinizi kısaca tanıtın.",
    answer: "Biyografi, profilinizde görünen kısa bir tanıtım metnidir. En fazla 150 karakter olabilir. Kendinizi kısaca tanıtın, ilgi alanlarınızdan veya uzmanlığınızdan bahsedin. İyi bir biyografi profilinizi daha çekici kılar ve diğer kullanıcıların sizi tanımasını kolaylaştırır.",
  },
  {
    section: "profil",
    question: "Tema ayarlarını nasıl değiştiririm?",
    searchText: "Sol menüdeki tema butonuna tıklayarak Açık, Koyu, Dim veya Sistem modları arasında geçiş yapabilirsiniz.",
    answer: "Sol menüdeki tema butonuna tıklayarak Açık, Koyu, Dim veya Sistem modları arasında geçiş yapabilirsiniz. Sistem modu, cihazınızın ayarlarını otomatik takip eder. Tercih ettiğiniz tema cihazınıza kaydedilir ve sonraki ziyaretlerinizde otomatik uygulanır.",
  },
  {
    section: "profil",
    question: "Doğrulanmış hesap rozeti nedir?",
    searchText: "Doğrulanmış hesap rozeti mavi tik, platformda güvenilirliği kanıtlanmış hesaplara verilir. Profil tamamlama, içerik kalitesi ve topluluk etkileşimi değerlendirilir.",
    answer: "Doğrulanmış hesap rozeti (mavi tik), platformda güvenilirliği kanıtlanmış hesaplara verilir. Rozet otomatik değerlendirme ve ekip onayı ile verilir. Profil tamamlama oranı, içerik kalitesi, topluluk etkileşimi ve hesap yaşı gibi kriterler değerlendirilir. Premium üyeler öncelikli olarak değerlendirilir.",
  },

  // ─── Gönderi ve İçerik ──────────────────────────────────────
  {
    section: "icerik",
    question: "Gönderi nedir?",
    searchText: "Gönderi, Feedim'de paylaştığınız içeriktir. Metin, görsel ve zengin metin formatlarını destekler. Gönderileriniz profilinizde ve akışta görünür.",
    answer: <>Gönderi, Feedim&apos;de oluşturup paylaştığınız içeriktir. Metin, görsel, bağlantı ve zengin metin formatlarını destekler. Gönderileriniz profilinizde listelenir, takipçilerinizin ana sayfasında ve <Link href="/dashboard/explore" className={lnk}>keşfet</Link> bölümünde görünür. Her gönderiye etiket ekleyebilir, beğeni ve yorum alabilirsiniz.</>,
  },
  {
    section: "icerik",
    question: "Nasıl gönderi oluştururum?",
    searchText: "Sol menüdeki Oluştur butonuna tıklayın. Başlık girin, içeriğinizi zengin metin editörüyle yazın, etiket ve kapak görseli ekleyin. Taslak olarak kaydedebilir veya yayınlayabilirsiniz.",
    answer: <>Sol menüdeki <strong>&lsquo;Oluştur&rsquo;</strong> butonuna tıklayın. Başlık girin (en az 3 karakter), içeriğinizi zengin metin editörüyle yazın. İsteğe bağlı olarak kapak görseli ve etiketler ekleyin. Gönderinizi taslak olarak kaydedebilir veya doğrudan yayınlayabilirsiniz. İçerik en az 50 karakter olmalıdır.</>,
  },
  {
    section: "icerik",
    question: "Etiket nedir ve nasıl eklenir?",
    searchText: "Etiketler gönderinizin konusunu belirler. En fazla 5 etiket ekleyebilirsiniz. Etiketler keşfet bölümünde kategorize edilmenizi sağlar.",
    answer: <>Etiketler, gönderinizin konusunu ve kategorisini belirler. Gönderi oluştururken en fazla 5 etiket ekleyebilirsiniz. Etiketler, gönderinizin <Link href="/dashboard/explore" className={lnk}>keşfet</Link> bölümünde doğru kategoride görünmesini ve diğer kullanıcıların içeriğinizi kolayca bulmasını sağlar. Popüler etiketler trend listesinde yer alır.</>,
  },
  {
    section: "icerik",
    question: "Gönderimi düzenleyebilir miyim?",
    searchText: "Evet, yayınladığınız gönderiyi düzenleyebilirsiniz. Gönderinin menüsünden Düzenle seçeneğiyle başlık, içerik ve etiketleri güncelleyin. Değişiklikler anında yansır.",
    answer: <>Evet, yayınladığınız gönderiyi istediğiniz zaman düzenleyebilirsiniz. Gönderinin sağ üst köşesindeki menüden <strong>&lsquo;Düzenle&rsquo;</strong> seçeneğine tıklayın. Başlık, içerik, kapak görseli ve etiketleri güncelleyebilirsiniz. Değişiklikler kaydedildikten sonra anında yansır.</>,
  },
  {
    section: "icerik",
    question: "Gönderimi nasıl silerim?",
    searchText: "Gönderinin menüsünden Sil seçeneğiyle silebilirsiniz. Silinen gönderiler geri getirilemez. Tüm beğeniler, yorumlar ve Jeton kazanımları da silinir.",
    answer: <>Gönderinin menüsünden <strong>&lsquo;Sil&rsquo;</strong> seçeneğini kullanarak silebilirsiniz. Silme işlemi onay gerektirir. Silinen gönderiler geri getirilemez. Gönderiye ait tüm <Heart className={ico} /> beğeniler, <MessageCircle className={ico} /> yorumlar ve Jeton kazanımları da kalıcı olarak silinir.</>,
  },
  {
    section: "icerik",
    question: "Taslak nedir?",
    searchText: "Taslak, henüz yayınlanmamış gönderidir. Taslak olarak kaydedip daha sonra düzenleyebilir ve yayınlayabilirsiniz. Profilinizdeki taslaklar bölümünden ulaşabilirsiniz.",
    answer: <>Taslak, henüz yayınlanmamış ve sadece size görünen bir gönderidir. Gönderi oluştururken <strong>&lsquo;Taslak olarak kaydet&rsquo;</strong> seçeneğiyle kaydedin. Taslakları daha sonra düzenleyebilir, yayınlayabilir veya silebilirsiniz. Profilinizdeki taslaklar bölümünden tüm taslaklarınıza ulaşabilirsiniz.</>,
  },
  {
    section: "icerik",
    question: "Kapak görseli eklemek zorunlu mu?",
    searchText: "Hayır, kapak görseli isteğe bağlıdır. Kapak görseli olan gönderiler keşfet ve ana sayfada daha dikkat çekici görünür.",
    answer: "Hayır, kapak görseli isteğe bağlıdır. Ancak kapak görseli olan gönderiler keşfet ve ana sayfada daha dikkat çekici görünür ve daha fazla tıklama alır. Yüksek kaliteli, konuyla ilgili bir görsel seçmenizi öneririz.",
  },
  {
    section: "icerik",
    question: "Zengin metin editörü nasıl kullanılır?",
    searchText: "Gönderi yazarken kalın, italik, başlık, liste, bağlantı, görsel ve alıntı gibi biçimlendirme seçeneklerini kullanabilirsiniz.",
    answer: "Gönderi yazarken editör araç çubuğunu kullanarak içeriğinizi zenginleştirebilirsiniz. Kalın, italik, başlık (H2, H3), sıralı ve madde işaretli listeler, bağlantı ekleme, görsel yükleme ve alıntı gibi biçimlendirme seçenekleri mevcuttur. Görseller sürükle-bırak ile de eklenebilir.",
  },
  {
    section: "icerik",
    question: "İçerik kuralları nelerdir?",
    searchText: "İçerikler özgün olmalı, telif hakkı ihlali yapılmamalı. Nefret söylemi, şiddet, taciz, spam ve yasa dışı içerikler yasaktır. Kural ihlalinde içerik kaldırılabilir.",
    answer: <>İçerikler özgün olmalı, telif hakkı ihlali yapılmamalıdır. Nefret söylemi, şiddet, taciz, spam ve yasa dışı faaliyetleri teşvik eden içerikler yasaktır. Kişisel verilerin izinsiz paylaşımı yasaktır. Kural ihlalinde içerik kaldırılabilir ve hesap askıya alınabilir. Detaylı kurallar için <Link href="/help/terms" className={lnk}>Kullanım Koşulları</Link> sayfamızı inceleyin.</>,
  },
  {
    section: "icerik",
    question: "Gönderi neden kaldırılmış olabilir?",
    searchText: "Gönderiniz topluluk kurallarına aykırı bulunmuş olabilir. Telif ihlali, spam, nefret söylemi veya şikayet sonucu kaldırılmış olabilir.",
    answer: <>Gönderiniz topluluk kurallarına aykırı bulunduğu için kaldırılmış olabilir. Yaygın nedenler: telif hakkı ihlali, spam içerik, nefret söylemi, yanıltıcı bilgi veya diğer kullanıcılardan gelen şikayetler. Kaldırma işlemi hakkında detaylı bilgi almak veya itiraz etmek için <a href="mailto:support@feedim.com" className={lnk}>support@feedim.com</a> adresine yazabilirsiniz.</>,
  },

  // ─── Etkileşim ve Sosyal ────────────────────────────────────
  {
    section: "etkilesim",
    question: "Beğeni nedir?",
    searchText: "Beğeni, bir gönderinin hoşunuza gittiğini ifade etmenin en kolay yoludur. Kalp simgesine tıklayarak beğenebilirsiniz. Gönderi sahibi bildirim alır.",
    answer: <>Beğeni, bir gönderinin hoşunuza gittiğini ifade etmenin en kolay yoludur. Gönderi altındaki <Heart className={ico} /> kalp simgesine tıklayarak beğenebilirsiniz. Beğeniyi geri almak için aynı simgeye tekrar tıklayın. Gönderi sahibi beğendiğinizde <Bell className={ico} /> bildirim alır. Beğeni sayısı gönderinin altında görünür.</>,
  },
  {
    section: "etkilesim",
    question: "Yorum nedir?",
    searchText: "Yorum, bir gönderi hakkında düşüncelerinizi paylaşmanızı sağlar. En fazla 250 karakter. Yorumlara yanıt verebilir ve @ ile bahsetme yapabilirsiniz.",
    answer: <>Yorum, bir gönderi hakkında düşüncelerinizi paylaşmanızı sağlar. Gönderinin altındaki <MessageCircle className={ico} /> yorum bölümünden yazabilirsiniz. Yorumlar en fazla 250 karakter olabilir. Başka kullanıcılara @ ile bahsedebilirsiniz. Yorumlara yanıt verilebilir ve <Heart className={ico} /> beğenilebilir. Gönderi sahibi yorum <Bell className={ico} /> bildirimini alır.</>,
  },
  {
    section: "etkilesim",
    question: "Takip nedir?",
    searchText: "Takip etmek, bir kullanıcının yeni gönderilerini ana sayfanızda görmenizi sağlar. Profildeki Takip Et butonuna tıklayın. Takip bildirim gönderir.",
    answer: <>Bir kullanıcıyı takip ettiğinizde, yeni gönderileri <Home className={ico} /> ana sayfanızda görünür. Kullanıcının profil sayfasındaki <strong>&lsquo;Takip Et&rsquo;</strong> butonuna tıklayın. Takip ettiğinizde karşı taraf <Bell className={ico} /> bildirim alır. Gizli hesapları takip etmek için onay gerekir. Takibi istediğiniz zaman bırakabilirsiniz.</>,
  },
  {
    section: "etkilesim",
    question: "Kaydetme nedir?",
    searchText: "Kaydetme, beğendiğiniz gönderileri yer imlerine eklemenizi sağlar. Kaydet simgesine tıklayın. Kaydedilenler bölümünden ulaşabilirsiniz.",
    answer: <>Kaydetme, ilginizi çeken gönderileri yer imlerine eklemenizi sağlar. Gönderi altındaki <Bookmark className={ico} /> kaydet simgesine tıklayın. Kaydettiğiniz gönderilere sol menüdeki <Bookmark className={ico} /> <Link href="/dashboard/bookmarks" className={lnk}>Kaydedilenler</Link> bölümünden ulaşabilirsiniz. Kaydetme işlemi gizlidir — gönderi sahibi göremez.</>,
  },
  {
    section: "etkilesim",
    question: "Paylaşma nasıl yapılır?",
    searchText: "Gönderi altındaki paylaş butonuyla bağlantıyı kopyalayabilir veya WhatsApp, X, Facebook, LinkedIn, Pinterest ve e-posta ile paylaşabilirsiniz.",
    answer: <>Gönderi altındaki <ShareIcon /> paylaş butonuna tıklayın. Bağlantıyı kopyalayabilir veya doğrudan WhatsApp, X (Twitter), Facebook, LinkedIn, Pinterest ve e-posta ile paylaşabilirsiniz. Mobilde cihazınızın yerel paylaşım menüsü de kullanılabilir.</>,
  },
  {
    section: "etkilesim",
    question: "Bahsetme (@mention) nedir?",
    searchText: "Yorum veya içerikte @ işaretiyle kullanıcı adını yazarak bahsetme yapabilirsiniz. Bahsedilen kişi bildirim alır. En fazla 3 bahsetme yapılabilir.",
    answer: <>Yorum veya içerikte bir kullanıcıdan bahsetmek için <strong>@kullaniciadi</strong> yazın. Yazdıkça öneriler açılır. Bahsedilen kişi bildirim alır. Bir yorumda en fazla 3 bahsetme yapılabilir. Bahsetmeler profil bağlantısına dönüşür.</>,
  },
  {
    section: "etkilesim",
    question: "Yorumu nasıl silerim?",
    searchText: "Kendi yorumunuzu silmek için yorumun üzerine gelin ve silme butonuna tıklayın. Gönderi sahipleri kendi gönderilerindeki tüm yorumları silebilir.",
    answer: "Kendi yorumunuzu silmek için yorumun üzerine gelin (veya basılı tutun) ve silme butonuna tıklayın. Gönderi sahipleri kendi gönderilerindeki tüm yorumları silebilir. Silinen yorumlar geri getirilemez. Yoruma verilen yanıtlar da birlikte silinir.",
  },
  {
    section: "etkilesim",
    question: "Gönderi sahibinin profilini nasıl ziyaret ederim?",
    searchText: "Gönderi üzerindeki kullanıcı adına veya profil fotoğrafına tıklayarak kullanıcının profiline gidebilirsiniz.",
    answer: <>Gönderi üzerindeki kullanıcı adına veya profil fotoğrafına tıklayarak kullanıcının profiline gidebilirsiniz. Ayrıca gönderinin menüsünden <strong>&lsquo;Kullanıcının profili&rsquo;</strong> seçeneğini de kullanabilirsiniz. Profil sayfasında tüm gönderileri, takipçi sayısı ve biyografiyi görebilirsiniz.</>,
  },

  // ─── Bildirimler ────────────────────────────────────────────
  {
    section: "bildirim",
    question: "Bildirimler nasıl çalışır?",
    searchText: "Beğeni, yorum, yanıt, bahsetme, takip ve Jeton kazanımı gibi etkileşimlerde bildirim alırsınız. Bildirimler bölümünden görebilirsiniz.",
    answer: <><Heart className={ico} /> Beğeni, <MessageCircle className={ico} /> yorum, yanıt, bahsetme, takip ve Jeton kazanımı gibi etkileşimlerde <Bell className={ico} /> bildirim alırsınız. Sol menüdeki <Bell className={ico} /> <Link href="/dashboard/notifications" className={lnk}>Bildirimler</Link> bölümünden tüm bildirimlerinizi görebilirsiniz. Okunmamış bildirimler mavi nokta ile işaretlenir. Tümünü okundu olarak işaretleyebilirsiniz.</>,
  },
  {
    section: "bildirim",
    question: "Hangi bildirim türleri var?",
    searchText: "Beğeni, yorum, yanıt, bahsetme, takip, takip isteği, takip kabul, başarı, Jeton kazanımı, premium sona erme ve sistem bildirimleri.",
    answer: <>Feedim&apos;de şu bildirim türleri bulunur: <Heart className={ico} /> Beğeni, <MessageCircle className={ico} /> Yorum ve Yanıt, Bahsetme, Takip ve Takip İsteği, Jeton Kazanımı, Premium Sona Erme, Başarı ve Sistem bildirimleri.</>,
  },
  {
    section: "bildirim",
    question: "Bildirim ayarlarını nasıl yönetirim?",
    searchText: "Ayarlar Bildirimler bölümünden her bildirim türünü ayrı ayrı açıp kapatabilirsiniz. 24 saat duraklatma özelliği de mevcuttur.",
    answer: <>Ayarlar → Bildirimler bölümünden her bildirim türünü ayrı ayrı açıp kapatabilirsiniz (<Heart className={ico} /> beğeni, <MessageCircle className={ico} /> yorum, takip, Jeton kazanımı vb.). Tüm bildirimleri geçici olarak kapatmak için <strong>&lsquo;24 saat duraklatma&rsquo;</strong> özelliğini kullanabilirsiniz.</>,
  },
  {
    section: "bildirim",
    question: "Bildirimlerim neden gelmiyor?",
    searchText: "Tarayıcı bildirim izinlerini kontrol edin. Ayarlardan bildirim tercihlerinizin açık olduğundan emin olun. Sayfa yenilemesi sorunu çözebilir.",
    answer: "Tarayıcı bildirim izinlerini kontrol edin. Ayarlar → Bildirimler bölümünden bildirim tercihlerinizin açık olduğundan emin olun. Bildirim duraklatma aktif olabilir — kontrol edin. Sayfa yenilemesi veya çıkış-giriş yapma sorunu çözebilir.",
  },

  // ─── Jeton ve Kazanç ───────────────────────────────────────
  {
    section: "jeton",
    question: "Jeton nedir?",
    searchText: "Jeton, Feedim'in sanal para birimidir. İçerik okuma ve satın alma yoluyla kazanılır veya harcanır. Jetonlar TL'ye çevrilebilir.",
    answer: <>Jeton, Feedim&apos;in sanal para birimidir. Kullanıcılar gönderi okuma ve satın alma yoluyla Jeton kazanır veya harcar. Biriktirdiğiniz Jetonları TL&apos;ye çevirebilirsiniz. Jeton bakiyenizi profilinizden ve <Link href="/dashboard/coins" className={lnk}>Jeton sayfasından</Link> takip edebilirsiniz.</>,
  },
  {
    section: "jeton",
    question: "Jeton nasıl kazanırım?",
    searchText: "Premium okuyucular gönderinizi okuduğunda otomatik Jeton kazanırsınız. Okuyucunun en az 30 saniye ve içeriğin %40'ını okuması gerekir. 24 saat kuralı.",
    answer: "Premium üyeliğe sahip okuyucular gönderinizi okuduğunda otomatik olarak Jeton kazanırsınız. Kazanım koşulları: okuyucunun en az 30 saniye harcaması ve içeriğin en az %40'ını okuması gerekir. Aynı okuyucu aynı gönderiyi 24 saat içinde tekrar okursa ek Jeton kazanılmaz.",
  },
  {
    section: "jeton",
    question: "1 Jeton kaç TL eder?",
    searchText: "1 Jeton = 0,10 TL değerindedir. Çekim işlemleri bu kur üzerinden hesaplanır.",
    answer: "1 Jeton = 0,10 TL değerindedir. Çekim işlemleri bu kur üzerinden hesaplanır. Örneğin 1000 Jeton = 100 TL. Kur oranı Feedim tarafından belirlenebilir ve güncellenebilir.",
  },
  {
    section: "jeton",
    question: "Jeton çekimi nasıl yapılır?",
    searchText: "Minimum 100 Jeton biriktirdiğinizde çekim talebi oluşturabilirsiniz. Ayarlar Kazanç bölümünden banka bilgilerinizi girin ve çekim talebinizi gönderin.",
    answer: "Minimum 100 Jeton biriktirdiğinizde çekim talebi oluşturabilirsiniz. Ayarlar → Kazanç bölümünden banka bilgilerinizi (IBAN) girin ve çekim talebinizi gönderin. Çekim talepleri iş günlerinde işleme alınır.",
  },
  {
    section: "jeton",
    question: "Jeton satın alma nasıl yapılır?",
    searchText: "Jeton sayfasından paket seçerek satın alabilirsiniz. Bonus Jetonlu paketler mevcuttur. Ödeme güvenli şekilde işlenir.",
    answer: <><Link href="/dashboard/coins" className={lnk}>Jeton sayfasından</Link> istediğiniz paketi seçerek satın alabilirsiniz. Farklı miktarlarda paketler mevcuttur ve bazılarında bonus Jetonlar bulunur.</>,
  },
  {
    section: "jeton",
    question: "Günlük Jeton kazanım limiti var mı?",
    searchText: "Evet, günlük maksimum 500 Jeton kazanabilirsiniz. Tek bir gönderi için maksimum 10.000 Jeton kazanılabilir.",
    answer: "Evet, günlük maksimum 500 Jeton kazanabilirsiniz. Tek bir gönderi için toplam maksimum 10.000 Jeton kazanılabilir. Bu limitler sistemin sürdürülebilirliğini ve adil dağılımını sağlar.",
  },
  {
    section: "jeton",
    question: "Jetonlarım neden düşürüldü?",
    searchText: "Sahte okuma, bot kullanımı veya sistemin kötüye kullanımı tespit edilirse kazanılan Jetonlar iptal edilebilir ve hesap askıya alınabilir.",
    answer: "Sahte okuma, bot kullanımı, kendine okuma veya Jeton sisteminin herhangi bir şekilde kötüye kullanımı tespit edilirse kazanılan Jetonlar iptal edilebilir ve hesap askıya alınabilir. Feedim, adil kullanımı sağlamak için otomatik tespit sistemleri kullanır.",
  },

  // ─── Premium Üyelik ─────────────────────────────────────────
  {
    section: "premium",
    question: "Premium üyelik nedir?",
    searchText: "Premium üyelik ek özellikler sunar: reklamsız deneyim, doğrulanmış rozet, öncelikli destek, uzun gönderi, para kazanma ve daha fazlası.",
    answer: <>Premium üyelik ile reklamsız deneyim yaşar, doğrulanmış rozet alır, öncelikli destek ve karakter limitsiz gönderi gibi ayrıcalıklardan yararlanırsınız. Ayrıca okuduğunuz gönderilerin kullanıcılarına Jeton kazandırırsınız. Detaylar için <Link href="/premium" className={lnk}>Premium sayfasını</Link> inceleyin.</>,
  },
  {
    section: "premium",
    question: "Premium planları ve fiyatları nelerdir?",
    searchText: "Basic (39,99 TL/ay), Pro (79,99 TL/ay), Max (129 TL/ay) ve Business (249 TL/ay) planları mevcuttur. Her plan farklı özellikler sunar.",
    answer: <>Feedim&apos;de dört Premium plan bulunur: <strong>Basic</strong> (39,99 TL/ay), <strong>Pro</strong> (79,99 TL/ay), <strong>Max</strong> (129 TL/ay) ve <strong>Business</strong> (249 TL/ay). Her plan farklı ayrıcalıklar sunar. Pro ve üzeri planlarda Jeton kazanma, analitik ve önde gösterim gibi ek özellikler mevcuttur. Business planı işletmeler için tasarlanmıştır. Planları karşılaştırmak için <Link href="/premium" className={lnk}>Premium sayfasını</Link> ziyaret edin.</>,
  },
  {
    section: "premium",
    question: "Premium üyeliğimi nasıl iptal ederim?",
    searchText: "Ayarlar Üyelik bölümünden iptal edebilirsiniz. Mevcut dönem sonuna kadar Premium özellikleri kullanabilirsiniz. Kısmi iade yapılmaz.",
    answer: "Ayarlar → Üyelik bölümünden iptal işlemi yapabilirsiniz. İptal, mevcut ödeme döneminin sonunda geçerli olur. Dönem sonuna kadar Premium ayrıcalıklarınız devam eder. Kısmi iade yapılmaz. İstediğiniz zaman tekrar abone olabilirsiniz.",
  },
  {
    section: "premium",
    question: "Premium süresi dolunca ne olur?",
    searchText: "Premium süreniz dolduğunda bildirim alırsınız. Üyelik yenilenmezse Premium ayrıcalıkları sona erer. Hesabınız ve içerikleriniz korunur.",
    answer: "Premium süreniz dolduğunda bildirim alırsınız. Üyelik yenilenmezse Premium ayrıcalıkları (rozet, reklamsız deneyim, öncelikli destek vb.) sona erer. Ancak hesabınız, gönderileriniz ve Jeton bakiyeniz korunur. İstediğiniz zaman tekrar Premium olabilirsiniz.",
  },
  {
    section: "premium",
    question: "Premium rozet nedir?",
    searchText: "Premium üyeler profillerinde özel bir rozet görüntüler. Bu rozet güvenilirliğinizi artırır. Plan türüne göre rozet farklılık gösterebilir.",
    answer: "Premium üyeler profillerinde özel bir rozet görüntüler. Bu rozet diğer kullanıcılara güvenilir bir hesap olduğunuzu gösterir. Premium sona erdiğinde rozet kaldırılır. Doğrulanmış hesap rozeti ile Premium rozeti farklıdır — ikisi birlikte de görünebilir.",
  },

  // ─── Keşfet ve Arama ───────────────────────────────────────
  {
    section: "kesfet",
    question: "Keşfet sayfası nedir?",
    searchText: "Keşfet, farklı kullanıcıların gönderilerini keşfetmenizi sağlar. Trend etiketler, popüler içerikler ve kategoriler bulunur.",
    answer: <><Link href="/dashboard/explore" className={lnk}>Keşfet</Link> sayfası, farklı kullanıcıların gönderilerini keşfetmenizi sağlar. Trend etiketler, popüler içerikler ve kategorilere göre gönderiler listelenir. Takip etmediğiniz kullanıcıların da kaliteli içeriklerini burada bulabilirsiniz.</>,
  },
  {
    section: "kesfet",
    question: "Trend etiketler nasıl belirlenir?",
    searchText: "Trend etiketler, belirli bir zaman diliminde en çok kullanılan ve etkileşim alan etiketlerdir. Otomatik güncellenir.",
    answer: "Trend etiketler, belirli bir zaman diliminde en çok kullanılan ve en fazla etkileşim alan etiketlerdir. Otomatik olarak güncellenir. Trend bir etikete tıklayarak o konudaki tüm gönderileri görebilirsiniz. Etiketleri takip ederek ilgi alanlarınıza göre akışınızı özelleştirebilirsiniz.",
  },
  {
    section: "kesfet",
    question: "Arama nasıl kullanılır?",
    searchText: "Keşfet sayfasındaki arama çubuğundan kullanıcı, gönderi ve etiket arayabilirsiniz. Sonuçlar anında görünür.",
    answer: "Keşfet sayfasındaki arama çubuğundan kullanıcı adı, gönderi başlığı veya etiket arayabilirsiniz. Yazdıkça sonuçlar anında görünür. Sonuçlar kullanıcılar ve etiketler olarak gruplandırılır.",
  },
  {
    section: "kesfet",
    question: "Ana sayfa akışı nasıl çalışır?",
    searchText: "Ana sayfa, takip ettiğiniz kullanıcıların yeni gönderilerini kronolojik sırayla gösterir. Takip listesi boşsa önerilen içerikler görünür.",
    answer: <><Home className={ico} /> Ana sayfanız, takip ettiğiniz kullanıcıların yeni gönderilerini kronolojik sırayla gösterir. Henüz kimseyi takip etmiyorsanız, popüler ve önerilen içerikler gösterilir. Daha fazla kullanıcı takip ettikçe akışınız zenginleşir.</>,
  },

  // ─── Sorun Giderme ─────────────────────────────────────────
  {
    section: "sorun",
    question: "Giriş yapamıyorum, ne yapmalıyım?",
    searchText: "E-posta ve şifrenizi kontrol edin. Şifremi Unuttum ile sıfırlayın. E-posta doğrulaması yapın. Sorun devam ederse support@feedim.com adresine yazın.",
    answer: <>Önce e-posta adresinizi ve şifrenizi kontrol edin. Şifrenizi hatırlamıyorsanız <strong>&lsquo;Şifremi Unuttum&rsquo;</strong> ile sıfırlayın. E-posta doğrulaması yapmadıysanız spam klasörünüzü kontrol edin. Tarayıcı çerezlerini ve önbelleğini temizlemeyi deneyin. Sorun devam ederse <a href="mailto:support@feedim.com" className={lnk}>support@feedim.com</a> adresine yazın.</>,
  },
  {
    section: "sorun",
    question: "E-posta doğrulama bağlantısı gelmiyor",
    searchText: "Spam veya gereksiz klasörünüzü kontrol edin. E-posta adresinizi doğru yazdığınızdan emin olun. Birkaç dakika bekleyin. Gmail, Outlook, Yahoo desteklenmektedir.",
    answer: "Spam veya gereksiz e-posta klasörünüzü kontrol edin. E-posta adresinizi doğru yazdığınızdan emin olun. Birkaç dakika bekleyip tekrar deneyin. Gmail, Outlook, Yahoo ve iCloud gibi yaygın e-posta sağlayıcıları desteklenmektedir. Sorun devam ederse farklı bir e-posta adresiyle kayıt olmayı deneyin.",
  },
  {
    section: "sorun",
    question: "Hesabım neden askıya alındı?",
    searchText: "Kullanım koşulları ihlali, spam içerik, Jeton kötüye kullanımı veya taciz gibi nedenlerle hesap askıya alınabilir. İtiraz için support@feedim.com.",
    answer: <>Kullanım koşullarının ihlali, spam içerik üretimi, Jeton sisteminin kötüye kullanımı veya diğer kullanıcılara taciz gibi nedenlerle hesaplar askıya alınabilir. Detaylı bilgi ve itiraz için <a href="mailto:support@feedim.com" className={lnk}>support@feedim.com</a> adresine yazabilirsiniz. <Link href="/help/terms" className={lnk}>Kullanım Koşulları</Link> sayfamızda tüm kurallar detaylı olarak açıklanmıştır.</>,
  },
  {
    section: "sorun",
    question: "Gönderi yüklenmiyor veya hata alıyorum",
    searchText: "İnternet bağlantınızı kontrol edin. Sayfayı yenileyin veya tarayıcı önbelleğini temizleyin. Farklı bir tarayıcı deneyin.",
    answer: "İnternet bağlantınızı kontrol edin. Sayfayı yenileyin veya tarayıcı önbelleğini temizleyin. Farklı bir tarayıcı deneyin. Gönderi oluştururken hata alıyorsanız içerik boyutunun limitleri aşmadığından emin olun (başlık 3-200 karakter, içerik en az 50 karakter). Sorun devam ederse çıkış yapıp tekrar giriş yapmayı deneyin.",
  },
  {
    section: "sorun",
    question: "Feedim nedir?",
    searchText: "Feedim, ilham veren içerikleri keşfedip paylaşabileceğiniz bir içerik ve video platformudur. Kullanıcılar gönderi ve video paylaşır, okuyucular keşfeder. Premium okuyucular Jeton kazandırır.",
    answer: <>Feedim, ilham veren içerikleri keşfedip paylaşabileceğiniz bir içerik ve video platformudur. Kullanıcılar gönderi ve video paylaşır, okuyucular kaliteli içerikleri keşfeder. Premium okuyucular tarafından okunan gönderiler kullanıcılara Jeton kazandırır. Jetonlar TL&apos;ye çevrilebilir. Detaylar için <Link href="/help/about" className={lnk}>Hakkımızda</Link> sayfamızı inceleyin.</>,
  },
  {
    section: "sorun",
    question: "Başka bir sorunum var, nasıl ulaşırım?",
    searchText: "support@feedim.com veya İletişim sayfasından bize ulaşabilirsiniz. İş günlerinde 24 saat içinde yanıt veriyoruz.",
    answer: <>Bu sayfada cevabını bulamadığınız sorularınız için <a href="mailto:support@feedim.com" className={lnk}>support@feedim.com</a> adresine yazabilir veya <Link href="/help/contact" className={lnk}>İletişim sayfamızı</Link> ziyaret edebilirsiniz. İş günlerinde 24 saat içinde tüm sorulara yanıt veriyoruz.</>,
  },
];

export default function HelpContent() {
  const [search, setSearch] = useState("");
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const query = search.trim().toLowerCase();
  const isSearching = query.length > 0;

  const filteredArticles = useMemo(() => {
    if (!query) return [];
    return articles.filter(
      (a) =>
        a.question.toLowerCase().includes(query) ||
        a.searchText.toLowerCase().includes(query)
    );
  }, [query]);

  const filteredPages = useMemo(() => {
    if (!query) return [];
    return pageLinks.filter(
      (p) =>
        p.title.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query)
    );
  }, [query]);

  const clearSearch = () => {
    setSearch("");
    inputRef.current?.focus();
  };

  const toggleItem = (key: string) => {
    setOpenItem(openItem === key ? null : key);
  };

  return (
    <>
      {/* Hero + Search */}
      <div className="text-center mb-12 sm:mb-16">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">Nasıl yardımcı olabiliriz?</h1>
        <p className="text-text-muted mb-8">Bir konuda arama yapın veya aşağıdan göz atın.</p>
        <div className="relative max-w-lg mx-auto">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ara..."
            className="w-full h-14 rounded-2xl border border-border-primary bg-bg-secondary text-text-primary text-[0.95rem] outline-none transition-colors focus:border-text-muted"
            style={{ paddingLeft: 52, paddingRight: 48 }}
            autoComplete="off"
          />
          {search && (
            <button onClick={clearSearch} className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-bg-tertiary transition">
              <X className="h-4 w-4 text-text-muted" />
            </button>
          )}
        </div>
      </div>

      {/* Search Results */}
      {isSearching && (
        <div className="mb-8">
          {/* Page Results */}
          {filteredPages.length > 0 && (
            <div className="mb-6">
              <p className="text-xs text-text-muted mb-3 font-medium">Sayfalar</p>
              <div className="space-y-2">
                {filteredPages.map((page, i) => (
                  <Link
                    key={`${page.href}-${i}`}
                    href={page.href}
                    className="flex items-center justify-between px-5 py-3.5 rounded-[13px] bg-bg-secondary hover:opacity-80 transition-opacity"
                  >
                    <div>
                      <span className="text-[0.95rem] font-semibold">{page.title}</span>
                      <span className="block text-[0.7rem] text-text-muted mt-0.5">{page.description}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-text-muted shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Article Results */}
          <p className="text-xs text-text-muted mb-4">
            {filteredArticles.length > 0
              ? `${filteredArticles.length} sonuç bulundu`
              : filteredPages.length === 0 ? "Sonuç bulunamadı" : "Makale bulunamadı"}
          </p>
          {filteredArticles.length > 0 ? (
            <div className="space-y-2.5">
              {filteredArticles.map((article, i) => {
                const key = `search-${i}`;
                const isOpen = openItem === key;
                return (
                  <div key={key} className="rounded-[13px] bg-bg-secondary overflow-hidden">
                    <button
                      onClick={() => toggleItem(key)}
                      className="w-full flex items-center justify-between px-5 py-4 hover:opacity-80 transition-opacity text-left"
                    >
                      <div className="flex-1 min-w-0 pr-3">
                        <span className="text-[0.95rem] font-semibold">{article.question}</span>
                        <span className="block text-[0.7rem] text-text-muted mt-0.5">
                          {sections.find((s) => s.id === article.section)?.label}
                        </span>
                      </div>
                      <ChevronRight className={`h-4 w-4 text-text-muted shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                    </button>
                    {isOpen && (
                      <div className="px-5 pt-2 pb-5 text-sm text-text-secondary leading-relaxed">
                        {article.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : filteredPages.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-text-secondary mb-1">Aradığınız konuyu bulamadık.</p>
              <p className="text-sm text-text-muted">
                Farklı bir kelime deneyin veya{" "}
                <Link href="/help/contact" className={lnk}>bize yazın</Link>
              </p>
            </div>
          ) : null}
        </div>
      )}

      {/* Sections */}
      {!isSearching && (
        <div className="space-y-2.5">
          {sections.map((section) => {
            const sectionArticles = articles.filter((a) => a.section === section.id);
            const isSectionOpen = openSection === section.id;
            return (
              <div key={section.id} className="rounded-[13px] bg-bg-secondary overflow-hidden">
                <button
                  onClick={() => {
                    setOpenSection(isSectionOpen ? null : section.id);
                    setOpenItem(null);
                  }}
                  className="w-full flex items-center justify-between px-5 py-4 hover:opacity-80 transition-opacity text-left"
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <span className="text-[0.95rem] font-bold text-text-primary">{section.label}</span>
                    <span className="block text-[0.7rem] text-text-muted mt-0.5">{sectionArticles.length} makale</span>
                  </div>
                  <ChevronRight className={`h-4 w-4 text-text-muted shrink-0 transition-transform ${isSectionOpen ? "rotate-90" : ""}`} />
                </button>
                {isSectionOpen && (
                  <div className="px-3 pb-3 space-y-2">
                    {sectionArticles.map((article, i) => {
                      const key = `${section.id}-${i}`;
                      const isOpen = openItem === key;
                      return (
                        <div key={key} className="rounded-[13px] bg-bg-secondary overflow-hidden">
                          <button
                            onClick={() => toggleItem(key)}
                            className="w-full flex items-center justify-between px-5 py-4 hover:opacity-80 transition-opacity text-left"
                          >
                            <div className="flex-1 min-w-0 pr-3">
                              <span className="text-[0.95rem] font-semibold text-text-primary">{article.question}</span>
                              <span className="block text-[0.7rem] text-text-muted mt-0.5">{section.label}</span>
                            </div>
                            <ChevronRight className={`h-4 w-4 text-text-muted shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                          </button>
                          {isOpen && (
                            <div className="px-5 pt-2 pb-5 text-sm text-text-secondary leading-relaxed">
                              {article.answer}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* CTA */}
          <div className="mt-14 rounded-2xl bg-accent-main/[0.06] p-8 sm:p-10 text-center">
            <HelpCircle className="h-10 w-10 text-accent-main mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-2">Aradığınız cevabı bulamadınız mı?</h3>
            <p className="text-sm text-text-secondary mb-6 max-w-sm mx-auto">Ekibimiz sorularınıza en kısa sürede yanıt vermekten mutluluk duyar.</p>
            <Link href="/help/contact" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent-main text-white font-semibold text-sm hover:opacity-90 transition">
              <Mail className="h-4 w-4" /> Bize Ulaşın
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
