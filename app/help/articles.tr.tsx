"use client";

import NewTabLink from "@/components/NewTabLink";
import { Heart, MessageCircle, Bell, Home, Bookmark } from "lucide-react";
import type { HelpArticle, HelpPageLink, HelpSection } from "./articles.types";

const lnk = "text-accent-main hover:opacity-80 font-semibold";
const ico = "inline-block h-4 w-4 text-accent-main align-text-bottom mx-0.5";

const ShareIcon = () => (
  <svg className={ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);

export const sections: HelpSection[] = [
  { id: "hesap", label: "Hesap ve Kayıt" },
  { id: "guvenlik", label: "Gizlilik ve Güvenlik" },
  { id: "profil", label: "Profil ve Ayarlar" },
  { id: "icerik", label: "Gönderi, Not, Video ve İçerik" },
  { id: "moderasyon", label: "Moderasyon ve İçerik Güvenliği" },
  { id: "destek", label: "Destek Talebi Sistemi" },
  { id: "telif", label: "Telif Hakkı ve Kopya İçerik" },
  { id: "etkilesim", label: "Etkileşim ve Sosyal" },
  { id: "bildirim", label: "Bildirimler" },
  { id: "jeton", label: "Jeton ve Kazanç" },
  { id: "premium", label: "Premium Üyelik" },
  { id: "kesfet", label: "Keşfet ve Arama" },
  { id: "sorun", label: "Sorun Giderme" },
];

export const pageLinks: HelpPageLink[] = [
  { title: "Yardım Merkezi", href: "/help", description: "Sık sorulan sorular ve yardım makaleleri" },
  { title: "Hakkımızda", href: "/help/about", description: "Feedim hakkında bilgi" },
  { title: "Kullanım Koşulları", href: "/help/terms", description: "Platform kullanım koşulları ve kuralları" },
  { title: "Gizlilik Politikası", href: "/help/privacy", description: "Kişisel verilerin korunması ve gizlilik" },
  { title: "KVKK", href: "/help/privacy", description: "Kişisel Verilerin Korunması Kanunu" },
  { title: "Topluluk Kuralları", href: "/help/community-guidelines", description: "İçerik standartları, davranış kuralları ve yaptırımlar" },
  { title: "İletişim", href: "/help/contact", description: "Bize ulaşın, e-posta ve destek talebi seçeneklerini görün" },
  { title: "Telif Hakkı Koruması", href: "/help/copyright", description: "Telif hakkı koruma sistemi, kopya içerik politikası ve ihlal sistemi" },
  { title: "Moderasyon Sistemi", href: "/help/moderation", description: "İçerik moderasyonu, AI inceleme, itiraz ve destek talebi süreçleri" },
  { title: "Feedim AI", href: "/help/ai", description: "Yapay zeka destekli içerik moderasyonu ve öneriler" },
  { title: "İçerik Türleri", href: "/help/content-types", description: "Gönderi, video, moment ve içerik formatları" },
  { title: "Jeton Sistemi", href: "/help/coins", description: "Jeton kazanma, satın alma ve bakiye yönetimi" },
  { title: "Para Kazanma", href: "/help/earning", description: "İçerik üreticileri için kazanç modeli ve çekim" },
  { title: "Analitik", href: "/help/analytics", description: "Gönderi istatistikleri, profil analitiği ve performans" },
  { title: "Veri Paylaşımı", href: "/help/data-sharing", description: "Üçüncü taraf ve devlet yetkilileriyle veri paylaşım politikası" },
  { title: "Erişim Kısıtlamaları", href: "/help/access-restrictions", description: "Yaş kısıtlamaları, bölge ve hesap sınırlamaları" },
  { title: "Erişilebilirlik", href: "/help/accessibility", description: "Erişilebilirlik özellikleri ve uyumluluk" },
  { title: "Profil Puanı Sistemi", href: "/help/profile-score", description: "Profil güven puanı nedir, nasıl hesaplanır ve neden önemlidir" },
  { title: "Premium", href: "/premium", description: "Premium üyelik planları ve fiyatları" },
  { title: "Sorumluluk Reddi", href: "/help/disclaimer", description: "Yasal sorumluluk reddi beyanı" },
  { title: "Mesafeli Satış Sözleşmesi", href: "/help/distance-sales-contract", description: "Jeton ve premium satın alma sözleşmesi" },
  { title: "Ön Bilgilendirme Formu", href: "/help/pre-information-form", description: "Mesafeli satış öncesi tüketici bilgilendirmesi" },
  { title: "Ödeme Güvenliği", href: "/help/payment-security", description: "SSL, 3D Secure ve PCI-DSS ödeme güvenliği" },
  { title: "İade Politikası", href: "/help/refund-policy", description: "Jeton ve premium üyelik iade koşulları" },
];

export const articles: HelpArticle[] = [
  // ─── Hesap ve Kayıt ─────────────────────────────────────────
  {
    section: "hesap",
    question: "Nasıl hesap oluştururum?",
    searchText: "Ana sayfadaki Hesap oluştur butonuna tıklayın. Ad, soyad, kullanıcı adı, e-posta ve şifre bilgilerinizi girin. Google hesabınızla da kayıt olabilirsiniz. Kayıt sonrası e-postanıza doğrulama kodu gönderilir.",
    answer: <>Ana sayfadaki <strong>&lsquo;Hesap oluştur&rsquo;</strong> butonuna tıklayın. Ad, soyad, kullanıcı adı, e-posta ve şifre bilgilerinizi girin. Google hesabınızla da hızlıca kayıt olabilirsiniz. Kayıt sonrası e-posta adresinize bir doğrulama kodu gönderilir — bu kodu girerek hesabınızı aktifleştirin.</>,
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
    searchText: "Kayıt olduktan sonra e-posta adresinize bir doğrulama kodu gönderilir. Bu kodu girerek hesabınızı doğrulayın. Doğrulama yapılmazsa bazı özellikler kısıtlı olabilir.",
    answer: <>Kayıt olduktan sonra e-posta adresinize bir doğrulama kodu gönderilir. Bu kodu girerek hesabınızı doğrulayın. Doğrulanmamış hesaplarda gönderi oluşturma ve bazı etkileşim özellikleri kısıtlı olabilir. Kod gelmezse spam klasörünüzü kontrol edin. <NewTabLink href="/help/contact" className={lnk}>Destek ekibimize</NewTabLink> ulaşarak yardım alabilirsiniz.</>,
  },
  {
    section: "hesap",
    question: "E-posta adresimi değiştirebilir miyim?",
    searchText: "Ayarlar Güvenlik bölümünden e-posta adresinizi güncelleyebilirsiniz. Yeni adresinize doğrulama kodu gönderilir.",
    answer: <>Evet. <strong>Ayarlar &rarr; Güvenlik</strong> bölümünden e-posta adresinizi güncelleyebilirsiniz. Değişiklik sonrası yeni e-posta adresinize bir doğrulama kodu gönderilir. Doğrulamadan önce eski e-posta adresiniz aktif kalır.</>,
  },
  {
    section: "hesap",
    question: "Birden fazla cihazdan giriş yapabilir miyim?",
    searchText: "Evet, hesabınıza aynı anda birden fazla cihazdan giriş yapabilirsiniz. Güvenlik bölümünden oturumları yönetebilirsiniz.",
    answer: <>Evet, hesabınıza aynı anda birden fazla cihazdan giriş yapabilirsiniz. Her cihazda ayrı bir oturum açılır. Tüm oturumları sonlandırmak isterseniz <strong>Ayarlar &rarr; Güvenlik</strong> bölümünden aktif oturumları görebilir ve kapatabilirsiniz.</>,
  },
  {
    section: "hesap",
    question: "Giriş yapmadan platformu kullanabilir miyim?",
    searchText: "Evet, giriş yapmadan ana sayfa ve keşfet bölümünü gezebilir, gönderileri okuyabilirsiniz. Gönderi oluşturma, beğenme, yorum yapma ve takip etme için hesap gerekir.",
    answer: <>Evet, giriş yapmadan ana sayfa ve <NewTabLink href="/explore" className={lnk}>keşfet</NewTabLink> bölümünü gezebilir, gönderileri okuyabilirsiniz. Ancak gönderi oluşturma, beğenme, yorum yapma ve takip etme gibi etkileşimler için hesap oluşturmanız gerekir.</>,
  },
  {
    section: "hesap",
    question: "Kayıtlı hesaplar özelliği nedir?",
    searchText: "Giriş yaptığınızda hesabınız cihazınıza kaydedilir. Sonraki girişte tek tıkla seçebilirsiniz. En son kullanılan 1 hesap kaydedilir.",
    answer: "Giriş yaptığınızda hesabınız otomatik olarak cihazınıza kaydedilir. Bir sonraki girişinizde tek tıkla hesabınızı seçerek hızlıca erişebilirsiniz. En son kullanılan 1 hesap kaydedilir. İstediğiniz hesabı listeden kaldırabilirsiniz. Kayıtlı hesap verisi yalnızca cihazınızda saklanır.",
  },
  {
    section: "hesap",
    question: "Hesap türleri nelerdir?",
    searchText: "Feedim'de ücretsiz standart hesap ve Premium hesap olmak üzere iki tür vardır. Premium üyeler ek özelliklerden yararlanır.",
    answer: <>Feedim&apos;de iki hesap türü vardır: <strong>Standart</strong> (ücretsiz) ve <strong>Premium</strong>. Standart hesapla gönderi oluşturabilir, yorum yapabilir ve etkileşime geçebilirsiniz. Premium hesap ek özellikler sunar: reklamsız deneyim, öncelikli destek, özel rozet ve daha fazlası. Detaylar için <NewTabLink href="/premium" className={lnk}>Premium sayfasını</NewTabLink> inceleyin.</>,
  },

  // ─── Gizlilik ve Güvenlik ───────────────────────────────────
  {
    section: "guvenlik",
    question: "Şifremi unuttum, ne yapmalıyım?",
    searchText: "Giriş sayfasındaki Şifremi Unuttum bağlantısına tıklayın. E-posta adresinizi girin, 6 haneli doğrulama kodu gönderilir.",
    answer: <>Giriş sayfasındaki <strong>&lsquo;Şifremi Unuttum&rsquo;</strong> bağlantısına tıklayın. E-posta adresinizi girin, size 6 haneli bir doğrulama kodu gönderilir. Kodu girerek yeni şifrenizi belirleyin. Kod gelmezse spam klasörünüzü kontrol edin.</>,
  },
  {
    section: "guvenlik",
    question: "Şifremi nasıl değiştiririm?",
    searchText: "Ayarlar Güvenlik bölümünden mevcut şifrenizi ve yeni şifrenizi girerek değiştirebilirsiniz. Şifre en az 6 karakter olmalıdır.",
    answer: <><strong>Ayarlar &rarr; Güvenlik</strong> bölümünden mevcut şifrenizi ve yeni şifrenizi girerek değiştirebilirsiniz. Şifreniz en az 6 karakter olmalıdır. Değişiklik sonrası diğer cihazlardaki oturumlarınız açık kalır. Güvenliğiniz için güçlü ve benzersiz bir şifre seçmenizi öneririz.</>,
  },
  {
    section: "guvenlik",
    question: "İki faktörlü doğrulama (MFA) nedir?",
    searchText: "İki faktörlü doğrulama hesabınıza ekstra güvenlik katmanı ekler. Her girişte şifrenin yanı sıra doğrulama kodu girmeniz gerekir.",
    answer: <>İki faktörlü doğrulama (MFA), hesabınıza ekstra bir güvenlik katmanı ekler. Aktifleştirdikten sonra her girişte şifrenizin yanı sıra bir doğrulama kodu girmeniz gerekir. Bu özellik hesabınızı yetkisiz erişimlere karşı korur. <strong>Ayarlar &rarr; Güvenlik</strong> bölümünden aktifleştirebilirsiniz.</>,
  },
  {
    section: "guvenlik",
    question: "Gizli hesap nedir?",
    searchText: "Gizli hesap açtığınızda gönderileriniz yalnızca takipçilerinize görünür. Yeni takip istekleri onayınıza sunulur.",
    answer: <>Gizli hesap açtığınızda gönderileriniz yalnızca takipçilerinize görünür. Birisi sizi takip etmek istediğinde sizden onay bekler. Mevcut takipçileriniz etkilenmez. <strong>Ayarlar &rarr; Gizlilik</strong> bölümünden hesabınızı gizliye alabilir veya tekrar herkese açık yapabilirsiniz.</>,
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
    answer: <><strong>Ayarlar &rarr; Gizlilik &rarr; Engellenen Kullanıcılar</strong> bölümünden engellediğiniz kişilerin listesini görebilirsiniz. Engeli kaldırmak istediğiniz kullanıcının yanındaki butona tıklayın. Engel kaldırıldığında ilgili kullanıcı tekrar içeriklerinizi görebilir ve size etkileşimde bulunabilir.</>,
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
    answer: <><strong>Ayarlar &rarr; Güvenlik</strong> bölümünden hesabınızı geçici olarak dondurabilirsiniz. Dondurulan hesap arama sonuçlarında görünmez olur ve profilinize erişilemez. İçerikleriniz ve verileriniz korunur. Tekrar giriş yaparak hesabınızı istediğiniz zaman aktifleştirebilirsiniz.</>,
  },
  {
    section: "guvenlik",
    question: "Hesabımı kalıcı olarak nasıl silerim?",
    searchText: "Ayarlar Güvenlik bölümünden hesabınızı kalıcı olarak silebilirsiniz. Bu işlem geri alınamaz. Tüm verileriniz 14 gün içinde silinir.",
    answer: <><strong>Ayarlar &rarr; Güvenlik</strong> bölümünden hesabınızı kalıcı olarak silebilirsiniz. <strong>Bu işlem geri alınamaz.</strong> Tüm gönderileriniz, yorumlarınız, Jeton bakiyeniz ve kişisel verileriniz 14 gün içinde kalıcı olarak silinir. Silme işlemini onaylamak için <strong>&lsquo;DELETE&rsquo;</strong> yazmanız gerekir. Daha fazla bilgi için <NewTabLink href="/help/privacy" className={lnk}>Gizlilik Politikası</NewTabLink> sayfamızı inceleyin.</>,
  },
  {
    section: "guvenlik",
    question: "Verilerim nasıl korunuyor?",
    searchText: "Şifreler güvenli hash ile saklanır. SSL/TLS şifreleme kullanılır. Veriler reklam amaçlı satılmaz. KVKK uyumlu veri işleme.",
    answer: <>Şifreleriniz güvenli şekilde hash&apos;lenerek saklanır ve hiçbir zaman düz metin olarak tutulmaz. Tüm iletişim SSL/TLS ile şifrelenir. Verileriniz reklam amaçlı üçüncü taraflara satılmaz. KVKK kapsamında kişisel verileriniz korunur. Detaylı bilgi için <NewTabLink href="/help/privacy" className={lnk}>Gizlilik Politikası</NewTabLink> ve <NewTabLink href="/help/terms" className={lnk}>Kullanım Koşulları</NewTabLink> sayfalarımızı inceleyebilirsiniz.</>,
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
    answer: "Kullanıcı adı, profilinizin benzersiz tanımlayıcısıdır ve URL'nizde görünür (feedim.com/u/kullaniciadi). Profil düzenleme ekranından değiştirebilirsiniz. Kullanıcı adı 3-15 karakter arasında olmalı, yalnızca harf, rakam, nokta ve alt çizgi içerebilir. Seçtiğiniz kullanıcı adının müsait olması gerekir \u2014 anlık olarak kontrol edilir.",
  },
  {
    section: "profil",
    question: "Profil fotoğrafımı nasıl değiştiririm?",
    searchText: "Profil düzenleme ekranındaki kamera simgesine tıklayın, görsel seçin ve kırpma aracıyla ayarlayın. Maksimum 5 MB.",
    answer: "Profil düzenleme ekranındaki kamera simgesine tıklayın, bir görsel seçin ve kırpma aracıyla istediğiniz şekilde ayarlayın. Maksimum dosya boyutu 5 MB'd\u0131r. Fotoğrafınızı istediğiniz zaman kaldırabilir veya yenisiyle değiştirebilirsiniz.",
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
    searchText: "Doğrulanmış hesap rozeti, platformda güvenilirliği kanıtlanmış hesaplara verilir. Profil tamamlama, içerik kalitesi ve topluluk etkileşimi değerlendirilir. Premium hesaplar da rozetten yararlanır.",
    answer: "Doğrulanmış hesap rozeti, platformda güvenilirliği kanıtlanmış hesaplara verilir. Rozet otomatik değerlendirme ve ekip onayı ile verilir. Profil tamamlama oranı, içerik kalitesi, topluluk etkileşimi ve hesap yaşı gibi kriterler değerlendirilir. Premium üyeler öncelikli olarak değerlendirilir ve aktif Premium hesaplar da bu rozetten yararlanır.",
  },

  // ─── Gönderi ve İçerik ──────────────────────────────────────
  {
    section: "icerik",
    question: "Gönderi nedir?",
    searchText: "Gönderi, Feedim'de paylaştığınız içeriktir. Metin, görsel ve zengin metin formatlarını destekler. Gönderileriniz profilinizde ve akışta görünür.",
    answer: <>Gönderi, Feedim&apos;de oluşturup paylaştığınız içeriktir. Metin, görsel, bağlantı ve zengin metin formatlarını destekler. Gönderileriniz profilinizde listelenir, takipçilerinizin ana sayfasında ve <NewTabLink href="/explore" className={lnk}>keşfet</NewTabLink> bölümünde görünür. Her gönderiye etiket ekleyebilir, beğeni ve yorum alabilirsiniz.</>,
  },
  {
    section: "icerik",
    question: "Nasıl gönderi oluştururum?",
    searchText: "Sol menüdeki Oluştur butonuna tıklayın. Başlık girin, içeriğinizi zengin metin editörüyle yazın, etiket ve kapak görseli ekleyin. Taslak olarak kaydedebilir veya yayınlayabilirsiniz.",
    answer: <>Sol menüdeki <strong>&lsquo;Oluştur&rsquo;</strong> butonuna tıklayın. Başlık girin (en az 3 karakter), içeriğinizi zengin metin editörüyle yazın. İsteğe bağlı olarak kapak görseli ve etiketler ekleyin. Gönderinizi taslak olarak kaydedebilir veya doğrudan yayınlayabilirsiniz. İçerik en az 50 karakter olmalıdır.</>,
  },
  {
    section: "icerik",
    question: "Not nedir ve nasıl paylaşılır?",
    searchText: "Not, kısa ve hızlı paylaşımlar için kullanılan içerik türüdür. Oluştur menüsünden Not seçip metninizi yazarak paylaşabilirsiniz. Notlar en fazla 280 karakterdir.",
    answer: <>Not, hızlı düşünce ve kısa güncellemeler için kullanılan içerik türüdür. Sol menüdeki <strong>&lsquo;Oluştur&rsquo;</strong> menüsünden <strong>&lsquo;Not&rsquo;</strong> seçeneğini açın, metninizi yazın ve paylaşın. Notlar en fazla 280 karakter olabilir. İsterseniz etiket ekleyebilir, taslak olarak kaydedebilir veya doğrudan yayınlayabilirsiniz.</>,
  },
  {
    section: "icerik",
    question: "Video nasıl oluştururum?",
    searchText: "‘Oluştur’ menüsünden ‘Video’ seçin, video dosyanızı yükleyin, başlık ve açıklama ekleyin. Taslak kaydedebilir veya yayınlayabilirsiniz. Videolar en fazla 10 dakika ve 200 MB olabilir.",
    answer: <>Sol menüdeki <strong>&lsquo;Oluştur&rsquo;</strong> menüsünden <strong>&lsquo;Video&rsquo;</strong> seçin. Önce video dosyanızı yükleyin, ardından başlık, açıklama, etiket ve kapak görseli gibi alanları doldurun. <strong>&lsquo;Video&rsquo;</strong> içeriğini taslak kaydedebilir veya doğrudan yayınlayabilirsiniz. Video süresi en fazla 10 dakika, dosya boyutu en fazla 200 MB olmalıdır.</>,
  },
  {
    section: "icerik",
    question: "Moment nasıl paylaşılır?",
    searchText: "‘Moment’, kısa video formatıdır. ‘Oluştur’ menüsünden ‘Moment’ seçin, videonuzu yükleyin, başlık ve etiket ekleyin. Moment videoları en fazla 60 saniye ve 100 MB olabilir.",
    answer: <>Moment paylaşmak için <strong>&lsquo;Oluştur&rsquo;</strong> menüsünden <strong>&lsquo;Moment&rsquo;</strong> seçin, videonuzu yükleyin ve gerekli alanları doldurun. <strong>&lsquo;Moment&rsquo;</strong> içeriklerinde başlık, etiket, görünürlük ve yorum ayarlarını yapabilirsiniz. Moment videoları en fazla 60 saniye ve 100 MB olabilir.</>,
  },
  {
    section: "icerik",
    question: "Moment'e ses ekleyebilir miyim?",
    searchText: "Evet, ‘Moment’ oluştururken ses seçici üzerinden ses ekleyebilirsiniz. İsterseniz orijinal videodaki sesi de kullanabilirsiniz.",
    answer: <>Evet. <strong>&lsquo;Moment&rsquo;</strong> oluştururken ses seçici üzerinden platformdaki seslerden birini ekleyebilir veya videonun orijinal sesini kullanabilirsiniz. Ses seçimi yayından önce değiştirilebilir.</>,
  },
  {
    section: "icerik",
    question: "Etiket nedir ve nasıl eklenir?",
    searchText: "Etiketler gönderinizin konusunu belirler. En fazla 5 etiket ekleyebilirsiniz. Etiketler keşfet bölümünde kategorize edilmenizi sağlar.",
    answer: <>Etiketler, gönderinizin konusunu ve kategorisini belirler. Gönderi oluştururken en fazla 5 etiket ekleyebilirsiniz. Etiketler, gönderinizin <NewTabLink href="/explore" className={lnk}>keşfet</NewTabLink> bölümünde doğru kategoride görünmesini ve diğer kullanıcıların içeriğinizi kolayca bulmasını sağlar. Popüler etiketler trend listesinde yer alır.</>,
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
    answer: <>İçerikler özgün olmalı, telif hakkı ihlali yapılmamalıdır. Nefret söylemi, şiddet, taciz, spam ve yasa dışı faaliyetleri teşvik eden içerikler yasaktır. Kişisel verilerin izinsiz paylaşımı yasaktır. Kural ihlalinde içerik kaldırılabilir ve hesap askıya alınabilir. Detaylı kurallar için <NewTabLink href="/help/terms" className={lnk}>Kullanım Koşulları</NewTabLink> sayfamızı inceleyin.</>,
  },
  {
    section: "icerik",
    question: "Gönderi neden kaldırılmış olabilir?",
    searchText: "Gönderiniz topluluk kurallarına aykırı bulunmuş olabilir. Telif ihlali, spam, nefret söylemi veya şikayet sonucu kaldırılmış olabilir.",
    answer: <>Gönderiniz topluluk kurallarına aykırı bulunduğu için kaldırılmış olabilir. Yaygın nedenler: telif hakkı ihlali, spam içerik, nefret söylemi, yanıltıcı bilgi veya diğer kullanıcılardan gelen şikayetler. Kaldırma işlemi hakkında detaylı bilgi almak veya itiraz etmek için hesabınıza giriş yaptıktan sonra <NewTabLink href="/settings/support" className={lnk}>Destek Talebi Oluştur</NewTabLink> sayfasını kullanabilirsiniz. Hesabınıza erişemiyorsanız <NewTabLink href="/help/contact" className={lnk}>İletişim</NewTabLink> sayfasındaki e-posta kanallarını kullanın.</>,
  },

  // ─── Moderasyon ve İçerik Güvenliği ────────────────────────
  {
    section: "moderasyon",
    question: "Moderasyon sistemi nasıl çalışır?",
    searchText: "Feedim moderasyon sistemi AI destekli otomatik inceleme ve insan moderatör kontrolü ile çalışır. İçerikler yayınlanmadan önce AI tarafından taranır.",
    answer: <>Feedim, AI destekli otomatik moderasyon ve insan moderatör incelemesi olmak üzere iki katmanlı bir sistem kullanır. Yeni içerikler yayınlandığında AI tarafından taranır. Sorunlu içerikler moderasyona alınır ve sadece yazara görünür. Detaylar için <NewTabLink href="/help/moderation" className={lnk}>Moderasyon Sistemi</NewTabLink> sayfasını inceleyin.</>,
  },
  {
    section: "moderasyon",
    question: "İçeriğim neden moderasyona alındı?",
    searchText: "İçerik topluluk kurallarına aykırı bulunursa moderasyona alınır. NSFW, nefret söylemi, telif ihlali, spam gibi nedenlerle gizlenebilir.",
    answer: <>İçeriğiniz topluluk kurallarına aykırı bulunduğu için moderasyona alınmış olabilir. Yaygın nedenler: NSFW/cinsel içerik, nefret söylemi, telif hakkı ihlali, kopya içerik veya spam. Moderasyona alınan içerik sadece size görünür. Moderasyon durumunuzu gönderi üzerindeki <strong>&ldquo;İncelemede&rdquo;</strong> rozetine tıklayarak görebilirsiniz.</>,
  },
  {
    section: "moderasyon",
    question: "Feedim AI ne yapar?",
    searchText: "Feedim AI içerikleri otomatik olarak tarar. NSFW tespiti, nefret söylemi kontrolü, spam algılama ve telif hakkı karşılaştırması yapar.",
    answer: <>Feedim AI, içerikleri yayınlandığı anda otomatik olarak inceler. NSFW/cinsel içerik tespiti, nefret söylemi ve hakaret kontrolü, spam algılama ve telif hakkı karşılaştırması yapar. Sorunlu bulunan içerikler moderasyona alınır. Detaylar için <NewTabLink href="/help/ai" className={lnk}>Feedim AI</NewTabLink> sayfasını inceleyin.</>,
  },
  {
    section: "moderasyon",
    question: "NSFW içerik nedir ve nasıl korunurum?",
    searchText: "NSFW cinsel veya uygunsuz içeriktir. Feedim AI otomatik olarak tespit eder ve moderasyona alır. Kullanıcılar bu tür içeriklerden otomatik olarak korunur.",
    answer: <>NSFW (Not Safe For Work) cinsel, şiddet veya uygunsuz içerikleri ifade eder. Feedim AI bu tür içerikleri otomatik tespit eder ve moderasyona alır. Platform genelinde güvenli bir ortam sağlanır. Detaylar için <NewTabLink href="/help/moderation" className={lnk}>Moderasyon Sistemi</NewTabLink> sayfasını inceleyin.</>,
  },
  {
    section: "moderasyon",
    question: "Moderasyon kararına itiraz edebilir miyim?",
    searchText: "Moderasyon kararlarına giriş yaptıktan sonra destek talebi sistemi üzerinden itiraz edebilirsiniz. Hesaba erişemiyorsanız İletişim sayfasındaki e-posta kanallarını kullanabilirsiniz.",
    answer: <>Evet. Moderasyon kararının haksız olduğunu düşünüyorsanız hesabınıza giriş yaptıktan sonra <NewTabLink href="/settings/support" className={lnk}>Destek Talebi Oluştur</NewTabLink> sayfası üzerinden itiraz talebi açabilirsiniz. İtirazınız insan moderatörler tarafından yeniden değerlendirilir ve yanıt verildiğinde bildirim alırsınız. Hesabınıza erişemiyorsanız <NewTabLink href="/help/contact" className={lnk}>İletişim</NewTabLink> sayfasındaki e-posta kanallarını kullanabilirsiniz. Detaylar için <NewTabLink href="/help/moderation" className={lnk}>Moderasyon Sistemi</NewTabLink> sayfasını inceleyin.</>,
  },

  // ─── Destek Talebi Sistemi ────────────────────────────────
  {
    section: "destek",
    question: "Destek talebi nasıl oluştururum?",
    searchText: "Hesabınıza giriş yaptıktan sonra Destek Talebi Oluştur sayfasından moderasyon itirazı veya teknik destek talebi açabilirsiniz.",
    answer: <>Hesabınıza giriş yaptıktan sonra <NewTabLink href="/settings/support" className={lnk}>Destek Talebi Oluştur</NewTabLink> sayfasını kullanabilirsiniz. Buradan moderasyon kararlarına itiraz edebilir veya teknik bir sorun için destek talebi oluşturabilirsiniz.</>,
  },
  {
    section: "destek",
    question: "Hangi konular için destek talebi açabilirim?",
    searchText: "Moderasyon itirazları ve teknik sorunlar için destek talebi açılabilir. Hesap, giriş, şifre, profil, gönderi, video, etkileşim, ödeme ve bildirim sorunları destek kapsamındadır.",
    answer: "Destek talebi sistemi moderasyon kararlarına itiraz etmek ve teknik sorunları iletmek için kullanılır. Hesap, giriş, şifre, profil, gönderi, video, moment, etkileşim, ödeme, görünürlük ve bildirim sorunları için uygun başlığı seçerek talep oluşturabilirsiniz.",
  },
  {
    section: "destek",
    question: "Moderasyon kararına nasıl itiraz ederim?",
    searchText: "Destek Talebi Oluştur sayfasında moderasyon kararı itirazı seçilir. Yalnızca hesabınıza ait ve daha önce itiraz edilmemiş karar numaraları seçilebilir.",
    answer: <>Destek ekranında <strong>&ldquo;Moderatör kararı itirazı&rdquo;</strong> seçeneğini seçin. Sistem yalnızca hesabınıza ait ve daha önce itiraz edilmemiş karar numaralarını gösterir. İtiraz metninizi yazıp gönderdiğinizde talebiniz insan moderatörler tarafından yeniden incelenir.</>,
  },
  {
    section: "destek",
    question: "Destek talebimin durumunu nasıl takip ederim?",
    searchText: "Destek talepleri hesap üzerinden takip edilir. Yanıt geldiğinde bildirim gönderilir ve support detay sayfasından görüşme görülebilir.",
    answer: <>Destek talepleriniz hesabınız üzerinden takip edilir. Yanıt verildiğinde <NewTabLink href="/notifications" className={lnk}>bildirimler</NewTabLink> bölümünde bildirim alırsınız. Ayrıca ilgili destek kaydını açarak talep detayını ve yazışma akışını görebilirsiniz.</>,
  },
  {
    section: "destek",
    question: "Destek talebime yanıt geldiğinde nasıl haberdar olurum?",
    searchText: "Yanıt verildiğinde sistem bildirimi gelir. Bildirimden doğrudan destek kaydına gidilebilir.",
    answer: <>Destek talebinize yanıt verildiğinde sistem bildirimi alırsınız. Bildirim içinden doğrudan ilgili destek kaydına gidebilir, yanıtı okuyabilir ve gerekiyorsa sizden istenen ek bilgiyi aynı kayıt üzerinden iletebilirsiniz.</>,
  },
  {
    section: "destek",
    question: "Aynı anda birden fazla destek talebi açabilir miyim?",
    searchText: "İşlemde olan destek talebi varken yeni talep açılamaz. Mevcut talep sonuçlanana kadar beklenir.",
    answer: "Hayır. İşlemde olan bir destek talebiniz varken yeni bir talep oluşturamazsınız. Mevcut talebiniz sonuçlandığında veya kapandığında yeni bir destek talebi açabilirsiniz.",
  },
  {
    section: "destek",
    question: "Hesabıma erişemiyorsam ne yapmalıyım?",
    searchText: "Hesaba erişim yoksa destek talebi sistemi yerine İletişim sayfasındaki e-posta kanalları kullanılmalıdır.",
    answer: <>Hesabınıza erişemiyorsanız destek talebi sistemi yerine <NewTabLink href="/help/contact" className={lnk}>İletişim</NewTabLink> sayfasındaki e-posta kanallarını kullanın. Özellikle giriş, kayıt veya hesap erişimi sorunlarında e-posta daha doğru kanaldır.</>,
  },

  // ─── Telif Hakkı ve Kopya İçerik ─────────────────────────
  {
    section: "telif",
    question: "Telif hakkı koruması nedir?",
    searchText: "Telif hakkı koruması içeriğinizin kopyalanmasını engelleyen bir sistemdir. Metin, görsel ve video bazlı karşılaştırma yapılır.",
    answer: <>Telif hakkı koruması, içeriğinizin izinsiz kopyalanmasını engellemek için tasarlanmış bir sistemdir. Korumayı açtığınızda metin, görsel ve video bazlı tam kapsamlı tarama yapılır. Benzerlik tespit edildiğinde içerik moderasyona alınır veya telif rozeti eklenir. Detaylar için <NewTabLink href="/help/copyright" className={lnk}>Telif Hakkı Koruması</NewTabLink> sayfasını inceleyin.</>,
  },
  {
    section: "telif",
    question: "Telif hakkı korumasını nasıl açarım?",
    searchText: "Gönderi video veya moment oluştururken ayarlardaki telif hakkı koruması toggle'ını açarak içeriğinizi koruyabilirsiniz.",
    answer: <>Gönderi, video veya moment oluştururken ayarlar bölümündeki <strong>&ldquo;Telif hakkı koruması&rdquo;</strong> özelliğini aktifleştirerek içeriğinizi koruma altına alabilirsiniz. Koruma aktifleştirildiğinde içeriğiniz metin, görsel ve video bazında taranır.</>,
  },
  {
    section: "telif",
    question: "Kopya içerik nedir?",
    searchText: "Kopya içerik başka bir kullanıcının içeriğiyle yüksek oranda metin benzerliği olan içeriktir. Her zaman aktif olarak taranır ve moderasyona alınır.",
    answer: <>Kopya içerik, platformdaki mevcut bir içerikle yüksek oranda metin benzerliği tespit edilen içeriktir. Bu tarama <strong>her zaman aktif</strong>tir ve kapatılamaz &mdash; telif koruması açılmamış olsa bile çalışır. Tespit edilen kopya içerik moderasyona alınır.</>,
  },
  {
    section: "telif",
    question: "Telif hakkı ihlal sistemi nasıl çalışır?",
    searchText: "Her telif veya kopya ihlalinde hesaba ihlal kaydı eklenir. İhlal sayısı arttıkça profil puanı cezaları başlar. Tekrarlayan ihlallerde hesap askıya alınabilir.",
    answer: <>Her telif hakkı veya kopya içerik ihlalinde hesabınıza bir ihlal kaydı eklenir. İhlal sayınız arttıkça profil puanınız düşer ve hesabınıza kademeli yaptırımlar uygulanır. Tekrarlayan ihlallerde hesabınız kalıcı olarak askıya alınabilir. Detaylar için <NewTabLink href="/help/copyright" className={lnk}>Telif Hakkı Koruması</NewTabLink> sayfasını inceleyin.</>,
  },
  {
    section: "telif",
    question: "Telif hakkı şikayeti nasıl açılır?",
    searchText: "İçeriğinizin kopyalandığını düşünüyorsanız Şikayet Et menüsünden telif hakkı şikayeti açabilirsiniz. Orijinal ve kopya URL gereklidir.",
    answer: <>İçeriğinizin izinsiz kopyalandığını düşünüyorsanız, ilgili içeriğin menüsünden <strong>&ldquo;Şikayet Et&rdquo;</strong> seçeneğiyle telif hakkı şikayeti açabilirsiniz. Orijinal içerik URL&apos;si ve kopya içerik URL&apos;si zorunludur. Asıl içerik sahibi olduğunuzu kanıtlamanız gerekebilir. Haksız şikayetler güvenilirlik puanınızı olumsuz etkiler.</>,
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
    searchText: "Yorum, bir gönderi hakkında düşüncelerinizi paylaşmanızı sağlar. Yorumlara yanıt verebilir ve @ ile bahsetme yapabilirsiniz.",
    answer: <>Yorum, bir gönderi hakkında düşüncelerinizi paylaşmanızı sağlar. Gönderinin altındaki <MessageCircle className={ico} /> yorum bölümünden yazabilirsiniz. Başka kullanıcılara @ ile bahsedebilirsiniz. Yorumlara yanıt verilebilir ve <Heart className={ico} /> beğenilebilir. Gönderi sahibi yorum <Bell className={ico} /> bildirimini alır.</>,
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
    answer: <>Kaydetme, ilginizi çeken gönderileri yer imlerine eklemenizi sağlar. Gönderi altındaki <Bookmark className={ico} /> kaydet simgesine tıklayın. Kaydettiğiniz gönderilere sol menüdeki <Bookmark className={ico} /> <NewTabLink href="/bookmarks" className={lnk}>Kaydedilenler</NewTabLink> bölümünden ulaşabilirsiniz. Kaydetme işlemi gizlidir &mdash; gönderi sahibi göremez.</>,
  },
  {
    section: "etkilesim",
    question: "Paylaşma nasıl yapılır?",
    searchText: "Gönderi altındaki paylaş butonuyla bağlantıyı kopyalayabilir veya WhatsApp, X, Facebook, Pinterest ve e-posta ile paylaşabilirsiniz.",
    answer: <>Gönderi altındaki <ShareIcon /> paylaş butonuna tıklayın. Bağlantıyı kopyalayabilir veya doğrudan WhatsApp, X (Twitter), Facebook, Pinterest ve e-posta ile paylaşabilirsiniz. Mobilde cihazınızın yerel paylaşım menüsü de kullanılabilir.</>,
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
    searchText: "Kendi yorumunuzu silmek için yorumun yanındaki üç nokta menüsüne basıp Sil seçeneğini seçin. Gönderi sahipleri kendi gönderilerindeki tüm yorumları silebilir.",
    answer: "Kendi yorumunuzu silmek için yorumun yanındaki üç nokta menüsüne basın ve Sil seçeneğini seçin. Gönderi sahipleri kendi gönderilerindeki tüm yorumları da üç nokta menüsünden silebilir. Silinen yorumlar geri getirilemez. Yoruma verilen yanıtlar da birlikte silinir.",
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
    answer: <><Heart className={ico} /> Beğeni, <MessageCircle className={ico} /> yorum, yanıt, bahsetme, takip ve Jeton kazanımı gibi etkileşimlerde <Bell className={ico} /> bildirim alırsınız. Sol menüdeki <Bell className={ico} /> <NewTabLink href="/notifications" className={lnk}>Bildirimler</NewTabLink> bölümünden tüm bildirimlerinizi görebilirsiniz. Okunmamış bildirimler mavi nokta ile işaretlenir. Tümünü okundu olarak işaretleyebilirsiniz.</>,
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
    answer: <><strong>Ayarlar &rarr; Bildirimler</strong> bölümünden her bildirim türünü ayrı ayrı açıp kapatabilirsiniz (<Heart className={ico} /> beğeni, <MessageCircle className={ico} /> yorum, takip, Jeton kazanımı vb.). Tüm bildirimleri geçici olarak kapatmak için <strong>&lsquo;24 saat duraklatma&rsquo;</strong> özelliğini kullanabilirsiniz.</>,
  },
  {
    section: "bildirim",
    question: "Bildirimlerim neden gelmiyor?",
    searchText: "Tarayıcı bildirim izinlerini kontrol edin. Ayarlardan bildirim tercihlerinizin açık olduğundan emin olun. Sayfa yenilemesi sorunu çözebilir.",
    answer: <>Tarayıcı bildirim izinlerini kontrol edin. <strong>Ayarlar &rarr; Bildirimler</strong> bölümünden bildirim tercihlerinizin açık olduğundan emin olun. Bildirim duraklatma aktif olabilir &mdash; kontrol edin. Sayfa yenilemesi veya çıkış-giriş yapma sorunu çözebilir.</>,
  },

  // ─── Jeton ve Kazanç ───────────────────────────────────────
  {
    section: "jeton",
    question: "Jeton nedir?",
    searchText: "Jeton, Feedim'in sanal para birimidir. Premium okuyucular içerikleri okudukça kazanılır, ayrıca reklam gelir paylaşımı ve hediye sistemi de mevcuttur. Jetonlar nakde çevrilebilir.",
    answer: <>Jeton, Feedim&apos;in sanal para birimidir. Premium okuyucular içerikleri okuyup izledikçe üreticiler Jeton kazanır. Ayrıca reklam gelir paylaşımı ile ek kazanç elde edilir ve diğer kullanıcılardan hediye alınabilir. Biriktirdiğiniz Jetonları nakde çevirebilirsiniz. Jeton bakiyenizi profilinizden ve <NewTabLink href="/coins" className={lnk}>Jeton sayfasından</NewTabLink> takip edebilirsiniz.</>,
  },
  {
    section: "jeton",
    question: "Jeton nasıl kazanırım?",
    searchText: "Premium okuyucular gönderinizi okuduğunda otomatik Jeton kazanırsınız. Ayrıca reklam gelir paylaşımı ve hediye sistemi ile de kazanç elde edersiniz.",
    answer: "Premium üyeliğe sahip okuyucular gönderinizi gerçek anlamda okuduğunda otomatik olarak Jeton kazanırsınız. Bunun yanı sıra reklam gelir paylaşımı ile ek kazanç elde edebilir ve diğer kullanıcılardan hediye alabilirsiniz. Sistem, premium okumaları otomatik olarak takip eder ve kazancınızı hesabınıza yansıtır.",
  },
  {
    section: "jeton",
    question: "Jeton çekimi nasıl yapılır?",
    searchText: "Belirli bir miktarda Jeton biriktirdiğinizde çekim talebi oluşturabilirsiniz. Ayarlar Kazanç bölümünden banka bilgilerinizi girin ve çekim talebinizi gönderin.",
    answer: <>Belirli bir miktarda Jeton biriktirdiğinizde çekim talebi oluşturabilirsiniz. <strong>Ayarlar &rarr; Kazanç</strong> bölümünden banka bilgilerinizi (IBAN) girin ve çekim talebinizi gönderin. Çekim talepleri iş günlerinde işleme alınır.</>,
  },
  {
    section: "jeton",
    question: "Jeton satın alma nasıl yapılır?",
    searchText: "Jeton sayfasından paket seçerek satın alabilirsiniz. Bonus Jetonlu paketler mevcuttur. Ödeme güvenli şekilde işlenir.",
    answer: <><NewTabLink href="/coins" className={lnk}>Jeton sayfasından</NewTabLink> istediğiniz paketi seçerek satın alabilirsiniz. Farklı miktarlarda paketler mevcuttur ve bazılarında bonus Jetonlar bulunur.</>,
  },
  {
    section: "jeton",
    question: "Jeton kazanım limiti var mı?",
    searchText: "Adil kullanım için günlük ve gönderi bazlı kazanım limitleri uygulanmaktadır.",
    answer: "Evet, adil kullanımı sağlamak amacıyla günlük ve gönderi bazlı kazanım limitleri uygulanmaktadır. Detaylar için Jeton sayfasını inceleyebilirsiniz.",
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
    answer: <>Premium üyelik ile reklamsız deneyim yaşar, doğrulanmış rozet alır, öncelikli destek ve karakter limitsiz gönderi gibi ayrıcalıklardan yararlanırsınız. Ayrıca okuduğunuz gönderilerin kullanıcılarına Jeton kazandırırsınız. Detaylar için <NewTabLink href="/premium" className={lnk}>Premium sayfasını</NewTabLink> inceleyin.</>,
  },
  {
    section: "premium",
    question: "Premium planları ve fiyatları nelerdir?",
    searchText: "Super, Pro, Max ve Business planları mevcuttur. Her plan farklı özellikler sunar.",
    answer: <>Feedim&apos;de dört Premium plan bulunur: <strong>Super</strong>, <strong>Pro</strong>, <strong>Max</strong> ve <strong>Business</strong>. Her plan farklı ayrıcalıklar sunar. Pro ve üzeri planlarda Jeton kazanma, analitik ve önde gösterim gibi ek özellikler mevcuttur. Business planı işletmeler için tasarlanmıştır. Güncel fiyatlar ve planları karşılaştırmak için <NewTabLink href="/premium" className={lnk}>Premium sayfasını</NewTabLink> ziyaret edin.</>,
  },
  {
    section: "premium",
    question: "Premium üyeliğimi nasıl iptal ederim?",
    searchText: "Ayarlar Üyelik bölümünden iptal edebilirsiniz. Mevcut dönem sonuna kadar Premium özellikleri kullanabilirsiniz. Kısmi iade yapılmaz.",
    answer: <><strong>Ayarlar &rarr; Üyelik</strong> bölümünden iptal işlemi yapabilirsiniz. İptal, mevcut ödeme döneminin sonunda geçerli olur. Dönem sonuna kadar Premium ayrıcalıklarınız devam eder. Kısmi iade yapılmaz. İstediğiniz zaman tekrar abone olabilirsiniz.</>,
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
    answer: "Premium üyeler profillerinde özel bir rozet görüntüler. Bu rozet diğer kullanıcılara güvenilir bir hesap olduğunuzu gösterir. Premium sona erdiğinde rozet kaldırılır. Doğrulanmış hesap rozeti ile Premium rozeti farklıdır \u2014 ikisi birlikte de görünebilir.",
  },

  // ─── Keşfet ve Arama ───────────────────────────────────────
  {
    section: "kesfet",
    question: "Keşfet sayfası nedir?",
    searchText: "Keşfet, farklı kullanıcıların gönderilerini keşfetmenizi sağlar. Trend etiketler, popüler içerikler ve kategoriler bulunur.",
    answer: <><NewTabLink href="/explore" className={lnk}>Keşfet</NewTabLink> sayfası, farklı kullanıcıların gönderilerini keşfetmenizi sağlar. Trend etiketler, popüler içerikler ve kategorilere göre gönderiler listelenir. Takip etmediğiniz kullanıcıların da kaliteli içeriklerini burada bulabilirsiniz.</>,
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
    searchText: "Ana sayfa akışı ilgi alanlarınıza, etkileşimlerinize ve takip ettiğiniz hesaplara göre kişiselleştirilir.",
    answer: <><Home className={ico} /> Ana sayfa akışınız ilgi alanlarınıza, etkileşimlerinize ve takip ettiğiniz hesaplara göre kişiselleştirilir. Sistemde beğeni, izlenme, okuma ve takip davranışlarınıza göre size en ilgili içerikler öne çıkarılır. Etkileşimleriniz değiştikçe akış da dinamik olarak güncellenir.</>,
  },

  // ─── Sorun Giderme ─────────────────────────────────────────
  {
    section: "sorun",
    question: "Giriş yapamıyorum, ne yapmalıyım?",
    searchText: "E-posta ve şifrenizi kontrol edin. Şifremi Unuttum ile sıfırlayın. E-posta doğrulaması yapın. Sorun devam ederse help@feedim.com adresine yazın.",
    answer: <>Önce e-posta adresinizi ve şifrenizi kontrol edin. Şifrenizi hatırlamıyorsanız <strong>&lsquo;Şifremi Unuttum&rsquo;</strong> ile sıfırlayın. E-posta doğrulaması yapmadıysanız spam klasörünüzü kontrol edin. Tarayıcı çerezlerini ve önbelleğini temizlemeyi deneyin. Sorun devam ederse <NewTabLink href="/help/contact" className={lnk}>İletişim</NewTabLink> sayfasındaki e-posta kanallarını kullanın.</>,
  },
  {
    section: "sorun",
    question: "E-posta doğrulama kodu gelmiyor",
    searchText: "Spam veya gereksiz klasörünüzü kontrol edin. E-posta adresinizi doğru yazdığınızdan emin olun. Birkaç dakika bekleyin. Gmail, Outlook, Yahoo desteklenmektedir.",
    answer: "Spam veya gereksiz e-posta klasörünüzü kontrol edin. E-posta adresinizi doğru yazdığınızdan emin olun. Birkaç dakika bekleyip tekrar deneyin. Gmail, Outlook, Yahoo ve iCloud gibi yaygın e-posta sağlayıcıları desteklenmektedir. Sorun devam ederse farklı bir e-posta adresiyle kayıt olmayı deneyin.",
  },
  {
    section: "sorun",
    question: "Hesabım neden askıya alındı?",
    searchText: "Kullanım koşulları ihlali, spam içerik, Jeton kötüye kullanımı veya taciz gibi nedenlerle hesap askıya alınabilir. Giriş yapabiliyorsanız destek talebi üzerinden itiraz edebilirsiniz.",
    answer: <>Kullanım koşullarının ihlali, spam içerik üretimi, Jeton sisteminin kötüye kullanımı veya diğer kullanıcılara taciz gibi nedenlerle hesaplar askıya alınabilir. Hesabınıza giriş yapabiliyorsanız <NewTabLink href="/settings/support" className={lnk}>Destek Talebi Oluştur</NewTabLink> sayfasından moderasyon itirazı açabilirsiniz. Hesabınıza erişemiyorsanız <NewTabLink href="/help/contact" className={lnk}>İletişim</NewTabLink> sayfasındaki e-posta kanallarını kullanabilirsiniz. <NewTabLink href="/help/terms" className={lnk}>Kullanım Koşulları</NewTabLink> sayfamızda tüm kurallar detaylı olarak açıklanmıştır.</>,
  },
  {
    section: "sorun",
    question: "Gönderi yüklenmiyor veya hata alıyorum",
    searchText: "İnternet bağlantınızı kontrol edin. Sayfayı yenileyin veya tarayıcı önbelleğini temizleyin. Farklı bir tarayıcı deneyin.",
    answer: <>İnternet bağlantınızı kontrol edin. Sayfayı yenileyin veya tarayıcı önbelleğini temizleyin. Farklı bir tarayıcı deneyin. Gönderi oluştururken hata alıyorsanız içerik boyutunun limitleri aşmadığından emin olun (başlık 3-200 karakter, içerik en az 50 karakter). Sorun devam ederse çıkış yapıp tekrar giriş yapmayı deneyin. Hâlâ aynı problemi yaşıyorsanız hesabınıza giriş yaptıktan sonra <NewTabLink href="/settings/support" className={lnk}>Destek Talebi Oluştur</NewTabLink> sayfasından teknik destek talebi açabilirsiniz.</>,
  },
  {
    section: "sorun",
    question: "Destek talebi nasıl oluştururum?",
    searchText: "Destek talebi oluşturmak için hesabınıza giriş yaptıktan sonra Destek Talebi Oluştur sayfasını kullanın. Moderasyon itirazları ve teknik sorunlar buradan takip edilir.",
    answer: <>Hesabınıza giriş yaptıktan sonra <NewTabLink href="/settings/support" className={lnk}>Destek Talebi Oluştur</NewTabLink> sayfasını kullanabilirsiniz. Moderasyon kararlarına itiraz etmek veya teknik bir sorun için destek almak bu sistem üzerinden yapılır. Destek talebiniz hesabınız üzerinden takip edilir ve yanıt verildiğinde bildirim alırsınız.</>,
  },
  {
    section: "sorun",
    question: "Feedim nedir?",
    searchText: "Feedim, kullanıcıların gönderi ve video paylaşabildiği bir sosyal içerik platformudur. Premium okuyucular içerik okudukça üreticiler Jeton kazanır. Reklam gelir paylaşımı ve hediye sistemi de mevcuttur.",
    answer: <>Feedim, kullanıcıların gönderi ve video paylaşabildiği bir sosyal içerik platformudur. Premium okuyucular içerikleri okuyup izledikçe üreticiler Jeton kazanır. Ayrıca reklam gelir paylaşımı ile ek kazanç elde edilir ve diğer kullanıcılardan hediye alınabilir. Kazanılan Jetonlar nakde çevrilebilir. Detaylar için <NewTabLink href="/help/about" className={lnk}>Hakkımızda</NewTabLink> sayfamızı inceleyin.</>,
  },
  {
    section: "sorun",
    question: "Başka bir sorunum var, nasıl ulaşırım?",
    searchText: "Giriş yaptıysanız destek talebi oluşturabilirsiniz. Hesaba erişemiyorsanız help@feedim.com veya İletişim sayfasını kullanabilirsiniz.",
    answer: <>Bu sayfada cevabını bulamadığınız sorularınız için hesabınıza giriş yaptıktan sonra <NewTabLink href="/settings/support" className={lnk}>Destek Talebi Oluştur</NewTabLink> sayfasını kullanabilirsiniz. Hesabınıza erişemiyorsanız <NewTabLink href="/help/contact" className={lnk}>İletişim sayfamızdaki</NewTabLink> e-posta kanallarını kullanın. İş günlerinde taleplere mümkün olan en kısa sürede dönüş sağlıyoruz.</>,
  },
];
