import type { SupportBugTopicId, SupportRequestKind } from "@/lib/supportRequests";

type SupportedLanguage = "tr" | "en" | "az";

export interface SupportReplyPreset {
  id: string;
  label: string;
  body: string;
}

interface PresetLink {
  label: string;
  href: string;
}

const SITE_URL = "https://www.feedim.com";

function pickLanguage(language?: string | null): SupportedLanguage {
  if (language === "en" || language === "az") return language;
  return "tr";
}

function formatGreeting(language: SupportedLanguage, username?: string | null) {
  const display = username ? `@${username}` : "";
  if (language === "en") return display ? `Hello ${display},` : "Hello,";
  if (language === "az") return display ? `Salam ${display},` : "Salam,";
  return display ? `Merhaba ${display},` : "Merhaba,";
}

function linksHeading(language: SupportedLanguage) {
  if (language === "en") return "Helpful links:";
  if (language === "az") return "Faydalı keçidlər:";
  return "İlgili bağlantılar:";
}

function closing(language: SupportedLanguage) {
  if (language === "en") return "If the issue continues, you can open a new support request.";
  if (language === "az") return "Problem davam edərsə yeni bir dəstək tələbi aça bilərsən.";
  return "Sorun devam ederse yeni bir destek talebi açabilirsin.";
}

function absolute(href: string) {
  return `${SITE_URL}${href}`;
}

function buildBody(
  language: SupportedLanguage,
  username: string | null | undefined,
  sentence: string,
  links: PresetLink[] = [],
) {
  const sections = [formatGreeting(language, username), "", sentence];
  if (links.length > 0) {
    sections.push("", linksHeading(language), ...links.map((link) => `- ${link.label}: ${link.href}`));
  }
  sections.push("", closing(language));
  return sections.join("\n");
}

function build(
  language: SupportedLanguage,
  username: string | null | undefined,
  id: string,
  label: string,
  sentence: string,
  links: PresetLink[] = [],
): SupportReplyPreset {
  return {
    id,
    label,
    body: buildBody(language, username, sentence, links),
  };
}

function commonLinks(language: SupportedLanguage) {
  if (language === "en") {
    return {
      helpCenter: "Help Center",
      contact: "Contact",
      moderation: "Moderation Guide",
      guidelines: "Community Guidelines",
      settings: "Settings",
      sessions: "Active Sessions",
      connected: "Connected Accounts",
      notifications: "Notification Settings",
      premium: "Premium Settings",
      paymentSecurity: "Payment Security",
      refundPolicy: "Refund Policy",
      contentTypes: "Content Types Guide",
      support: "Support",
      passwordReset: "Reset Password",
      coins: "Coins",
    };
  }
  if (language === "az") {
    return {
      helpCenter: "Yardım Mərkəzi",
      contact: "Əlaqə",
      moderation: "Moderasiya Bələdçisi",
      guidelines: "İcma Qaydaları",
      settings: "Ayarlar",
      sessions: "Aktiv Sessiyalar",
      connected: "Bağlı Hesablar",
      notifications: "Bildiriş Ayarları",
      premium: "Premium Ayarları",
      paymentSecurity: "Ödəniş Təhlükəsizliyi",
      refundPolicy: "Geri Ödəmə Siyasəti",
      contentTypes: "Məzmun Növləri Bələdçisi",
      support: "Dəstək",
      passwordReset: "Şifrəni Sıfırla",
      coins: "Jetonlar",
    };
  }
  return {
    helpCenter: "Yardım Merkezi",
    contact: "İletişim",
    moderation: "Moderasyon Rehberi",
    guidelines: "Topluluk Kuralları",
    settings: "Ayarlar",
    sessions: "Aktif Oturumlar",
    connected: "Bağlı Hesaplar",
    notifications: "Bildirim Ayarları",
    premium: "Premium Ayarları",
    paymentSecurity: "Ödeme Güvenliği",
    refundPolicy: "İade Politikası",
    contentTypes: "İçerik Türleri Rehberi",
    support: "Destek",
    passwordReset: "Şifre Sıfırlama",
    coins: "Jetonlar",
  };
}

function appealPresets(language: SupportedLanguage, username?: string | null): SupportReplyPreset[] {
  const l = commonLinks(language);
  const links = [
    { label: l.moderation, href: absolute("/help/moderation") },
    { label: l.guidelines, href: absolute("/help/community-guidelines") },
    { label: l.support, href: absolute("/settings/support") },
  ];

  if (language === "en") {
    return [
      build(language, username, "appeal-reviewed", "Reviewed", "Your objection was reviewed again and the current decision remains in place.", links),
      build(language, username, "appeal-updated", "Decision updated", "Your objection was reviewed and the related decision was updated.", links),
      build(language, username, "appeal-context", "Context checked", "The objection and the related context were reviewed again.", links),
    ];
  }
  if (language === "az") {
    return [
      build(language, username, "appeal-reviewed", "Yenidən baxıldı", "Etirazın yenidən nəzərdən keçirildi və mövcud qərar qüvvədə saxlanıldı.", links),
      build(language, username, "appeal-updated", "Qərar yeniləndi", "Etirazın nəzərdən keçirildi və aid qərar yeniləndi.", links),
      build(language, username, "appeal-context", "Kontekst yoxlandı", "Etirazın və aid kontekst yenidən yoxlanıldı.", links),
    ];
  }

  return [
    build(language, username, "appeal-reviewed", "İncelendi", "İtirazın yeniden incelendi ve mevcut karar korundu.", links),
    build(language, username, "appeal-updated", "Karar güncellendi", "İtirazın incelendi ve ilgili karar güncellendi.", links),
    build(language, username, "appeal-context", "Bağlam kontrol edildi", "İtirazın ve ilgili bağlam yeniden kontrol edildi.", links),
  ];
}

const topicPresetFactories: Record<
  SupportBugTopicId,
  (language: SupportedLanguage, username?: string | null) => SupportReplyPreset[]
> = {
  account: (language, username) => {
    const l = commonLinks(language);
    const links = [
      { label: l.settings, href: absolute("/settings") },
      { label: l.sessions, href: absolute("/settings/sessions") },
      { label: l.contact, href: absolute("/help/contact") },
    ];
    if (language === "en") {
      return [
        build(language, username, "account-checked", "Account checked", "The checks related to your account were completed.", links),
        build(language, username, "account-access", "Access reviewed", "The issue you reported about your account access was reviewed.", links),
      ];
    }
    if (language === "az") {
      return [
        build(language, username, "account-checked", "Hesab yoxlandı", "Hesabınla bağlı yoxlamalar tamamlandı.", links),
        build(language, username, "account-access", "Giriş incələndi", "Hesab girişilə bağlı bildirdiyin problem nəzərdən keçirildi.", links),
      ];
    }
    return [
      build(language, username, "account-checked", "Hesap kontrol edildi", "Hesabınla ilgili kontroller tamamlandı.", links),
      build(language, username, "account-access", "Erişim incelendi", "Hesabına erişimle ilgili ilettiğin sorun incelendi.", links),
    ];
  },
  login: (language, username) => {
    const l = commonLinks(language);
    const links = [
      { label: l.passwordReset, href: absolute("/forgot-password") },
      { label: l.connected, href: absolute("/settings/connected") },
      { label: l.contact, href: absolute("/help/contact") },
    ];
    if (language === "en") {
      return [
        build(language, username, "login-flow", "Login flow checked", "The login or signup flow was checked.", links),
        build(language, username, "login-access", "Access reviewed", "The access issue you reported was reviewed.", links),
      ];
    }
    if (language === "az") {
      return [
        build(language, username, "login-flow", "Giriş axını yoxlandı", "Giriş və ya qeydiyyat axını yoxlandı.", links),
        build(language, username, "login-access", "Giriş problemi baxıldı", "Bildirdiyin giriş problemi nəzərdən keçirildi.", links),
      ];
    }
    return [
      build(language, username, "login-flow", "Giriş akışı kontrol edildi", "Giriş veya kayıt akışı kontrol edildi.", links),
      build(language, username, "login-access", "Erişim sorunu incelendi", "Girişle ilgili ilettiğin sorun incelendi.", links),
    ];
  },
  password: (language, username) => {
    const l = commonLinks(language);
    const links = [
      { label: l.passwordReset, href: absolute("/forgot-password") },
      { label: l.connected, href: absolute("/settings/connected") },
      { label: l.sessions, href: absolute("/settings/sessions") },
    ];
    if (language === "en") {
      return [
        build(language, username, "password-reset", "Password flow checked", "The password or verification flow was checked.", links),
        build(language, username, "password-verify", "Verification reviewed", "The password or verification issue you reported was reviewed.", links),
      ];
    }
    if (language === "az") {
      return [
        build(language, username, "password-reset", "Şifrə axını yoxlandı", "Şifrə və ya doğrulama axını yoxlandı.", links),
        build(language, username, "password-verify", "Doğrulama incələndi", "Şifrə və ya doğrulama problemi nəzərdən keçirildi.", links),
      ];
    }
    return [
      build(language, username, "password-reset", "Şifre akışı kontrol edildi", "Şifre veya doğrulama akışı kontrol edildi.", links),
      build(language, username, "password-verify", "Doğrulama sorunu incelendi", "Şifre veya doğrulama ile ilgili sorun incelendi.", links),
    ];
  },
  profile: (language, username) => {
    const l = commonLinks(language);
    const links = [
      { label: l.settings, href: absolute("/settings") },
      { label: l.connected, href: absolute("/settings/connected") },
      { label: l.sessions, href: absolute("/settings/sessions") },
    ];
    if (language === "en") {
      return [
        build(language, username, "profile-checked", "Profile checked", "The issue related to your profile or settings was reviewed.", links),
        build(language, username, "profile-settings", "Settings reviewed", "The profile or settings issue you reported was checked.", links),
      ];
    }
    if (language === "az") {
      return [
        build(language, username, "profile-checked", "Profil yoxlandı", "Profil və ayarlarla bağlı problem nəzərdən keçirildi.", links),
        build(language, username, "profile-settings", "Ayarlar baxıldı", "Profil və ya ayarlarla bağlı bildirdiyin problem yoxlandı.", links),
      ];
    }
    return [
      build(language, username, "profile-checked", "Profil incelendi", "Profil veya ayarlar tarafındaki sorun incelendi.", links),
      build(language, username, "profile-settings", "Ayarlar kontrol edildi", "Profil veya ayarlar tarafındaki kontroller tamamlandı.", links),
    ];
  },
  post: (language, username) => {
    const l = commonLinks(language);
    const links = [
      { label: l.contentTypes, href: absolute("/help/content-types") },
      { label: l.moderation, href: absolute("/help/moderation") },
      { label: l.contact, href: absolute("/help/contact") },
    ];
    if (language === "en") {
      return [
        build(language, username, "post-flow", "Posting flow checked", "The issue around posts or notes was reviewed.", links),
        build(language, username, "post-publish", "Publishing reviewed", "The publishing issue you reported was checked.", links),
      ];
    }
    if (language === "az") {
      return [
        build(language, username, "post-flow", "Paylaşım axını yoxlandı", "Post və ya qeyd paylaşımı ilə bağlı problem nəzərdən keçirildi.", links),
        build(language, username, "post-publish", "Paylaşım problemi baxıldı", "Bildirdiyin paylaşım problemi yoxlandı.", links),
      ];
    }
    return [
      build(language, username, "post-flow", "Paylaşım akışı kontrol edildi", "Gönderi veya not paylaşımıyla ilgili sorun incelendi.", links),
      build(language, username, "post-publish", "Paylaşım sorunu gözden geçirildi", "Paylaşım sırasında yaşadığın sorun kontrol edildi.", links),
    ];
  },
  video: (language, username) => {
    const l = commonLinks(language);
    const links = [
      { label: l.contentTypes, href: absolute("/help/content-types") },
      { label: l.contact, href: absolute("/help/contact") },
      { label: l.helpCenter, href: absolute("/help") },
    ];
    if (language === "en") {
      return [
        build(language, username, "video-upload", "Upload checked", "The video or moment upload issue was reviewed.", links),
        build(language, username, "video-media", "Media flow reviewed", "The media upload flow was checked.", links),
      ];
    }
    if (language === "az") {
      return [
        build(language, username, "video-upload", "Yükləmə yoxlandı", "Video və ya moment yükləmə problemi nəzərdən keçirildi.", links),
        build(language, username, "video-media", "Media axını baxıldı", "Media yükləmə axını yoxlandı.", links),
      ];
    }
    return [
      build(language, username, "video-upload", "Yükleme sorunu incelendi", "Video veya moment yükleme sorunu incelendi.", links),
      build(language, username, "video-media", "Medya akışı kontrol edildi", "Yükleme sırasında yaşanan medya akışı kontrol edildi.", links),
    ];
  },
  interaction: (language, username) => {
    const l = commonLinks(language);
    const links = [
      { label: l.notifications, href: absolute("/settings/notifications") },
      { label: l.guidelines, href: absolute("/help/community-guidelines") },
      { label: l.helpCenter, href: absolute("/help") },
    ];
    if (language === "en") {
      return [
        build(language, username, "interaction-checked", "Interaction checked", "The issue around comments, likes or follows was reviewed.", links),
        build(language, username, "interaction-social", "Social actions reviewed", "The interaction issue you reported was checked.", links),
      ];
    }
    if (language === "az") {
      return [
        build(language, username, "interaction-checked", "İnteraksiya yoxlandı", "Şərh, bəyənmə və ya izləmə problemi nəzərdən keçirildi.", links),
        build(language, username, "interaction-social", "Sosial əməliyyatlar baxıldı", "Bildirdiyin interaksiya problemi yoxlandı.", links),
      ];
    }
    return [
      build(language, username, "interaction-checked", "Etkileşim sorunu incelendi", "Yorum, beğeni veya takip ile ilgili sorun incelendi.", links),
      build(language, username, "interaction-social", "Sosyal işlem kontrol edildi", "Etkileşim tarafındaki kontroller tamamlandı.", links),
    ];
  },
  payment: (language, username) => {
    const l = commonLinks(language);
    const links = [
      { label: l.coins, href: absolute("/coins") },
      { label: l.premium, href: absolute("/settings/premium") },
      { label: l.paymentSecurity, href: absolute("/help/payment-security") },
      { label: l.refundPolicy, href: absolute("/help/refund-policy") },
    ];
    if (language === "en") {
      return [
        build(language, username, "payment-checked", "Payment checked", "The issue related to payment, coins or premium was reviewed.", links),
        build(language, username, "payment-billing", "Billing reviewed", "The billing issue you reported was checked.", links),
      ];
    }
    if (language === "az") {
      return [
        build(language, username, "payment-checked", "Ödəniş yoxlandı", "Ödəniş, jeton və ya premium problemi nəzərdən keçirildi.", links),
        build(language, username, "payment-billing", "Ödəniş axını baxıldı", "Bildirdiyin ödəniş problemi yoxlandı.", links),
      ];
    }
    return [
      build(language, username, "payment-checked", "Ödeme sorunu incelendi", "Ödeme, jeton veya premium tarafındaki sorun incelendi.", links),
      build(language, username, "payment-billing", "Ödeme akışı kontrol edildi", "Ödeme tarafındaki kontroller tamamlandı.", links),
    ];
  },
  moderation: (language, username) => {
    const l = commonLinks(language);
    const links = [
      { label: l.moderation, href: absolute("/help/moderation") },
      { label: l.guidelines, href: absolute("/help/community-guidelines") },
      { label: l.support, href: absolute("/settings/support") },
    ];
    if (language === "en") {
      return [
        build(language, username, "moderation-checked", "Moderation reviewed", "The moderation or visibility issue you reported was reviewed.", links),
        build(language, username, "moderation-visibility", "Visibility checked", "The related visibility controls were checked.", links),
      ];
    }
    if (language === "az") {
      return [
        build(language, username, "moderation-checked", "Moderasiya baxıldı", "Moderasiya və görünürlüklə bağlı problem nəzərdən keçirildi.", links),
        build(language, username, "moderation-visibility", "Görünürlük yoxlandı", "Aid görünürlük nəzarətləri yoxlandı.", links),
      ];
    }
    return [
      build(language, username, "moderation-checked", "Moderasyon incelendi", "Moderasyon veya görünürlük ile ilgili sorun incelendi.", links),
      build(language, username, "moderation-visibility", "Görünürlük kontrol edildi", "İlgili görünürlük kontrolleri gözden geçirildi.", links),
    ];
  },
  notifications: (language, username) => {
    const l = commonLinks(language);
    const links = [
      { label: l.notifications, href: absolute("/settings/notifications") },
      { label: l.helpCenter, href: absolute("/help") },
      { label: l.contact, href: absolute("/help/contact") },
    ];
    if (language === "en") {
      return [
        build(language, username, "notifications-checked", "Notifications checked", "The notifications, search or explore issue was reviewed.", links),
        build(language, username, "notifications-discovery", "Discovery checked", "The issue you reported around notifications or discovery was checked.", links),
      ];
    }
    if (language === "az") {
      return [
        build(language, username, "notifications-checked", "Bildirişlər yoxlandı", "Bildiriş, axtarış və ya kəşf problemi nəzərdən keçirildi.", links),
        build(language, username, "notifications-discovery", "Kəşf axını baxıldı", "Bildirdiyin bildiriş və ya kəşf problemi yoxlandı.", links),
      ];
    }
    return [
      build(language, username, "notifications-checked", "Bildirim sorunu incelendi", "Bildirim, arama veya keşfet ile ilgili sorun incelendi.", links),
      build(language, username, "notifications-discovery", "Keşif akışı kontrol edildi", "Bildirim ve keşfet tarafındaki kontroller tamamlandı.", links),
    ];
  },
};

function defaultBugPresets(language: SupportedLanguage, username?: string | null): SupportReplyPreset[] {
  const l = commonLinks(language);
  const links = [
    { label: l.helpCenter, href: absolute("/help") },
    { label: l.contact, href: absolute("/help/contact") },
  ];
  if (language === "en") {
    return [
      build(language, username, "general-reviewed", "Reviewed", "The issue you reported was reviewed.", links),
      build(language, username, "general-checked", "Checks completed", "The necessary checks were completed.", links),
    ];
  }
  if (language === "az") {
    return [
      build(language, username, "general-reviewed", "Baxıldı", "Bildirdiyin problem nəzərdən keçirildi.", links),
      build(language, username, "general-checked", "Yoxlamalar tamamlandı", "Lazımi yoxlamalar tamamlandı.", links),
    ];
  }
  return [
    build(language, username, "general-reviewed", "İncelendi", "İlettiğin sorun incelendi.", links),
    build(language, username, "general-checked", "Kontroller tamamlandı", "Gerekli kontroller tamamlandı.", links),
  ];
}

export function getSupportReplyPresets(
  kind: SupportRequestKind,
  params: {
    language?: string | null;
    username?: string | null;
    topicId?: SupportBugTopicId | null;
  },
): SupportReplyPreset[] {
  const language = pickLanguage(params.language);

  if (kind === "moderation_appeal") {
    return appealPresets(language, params.username);
  }

  if (params.topicId && topicPresetFactories[params.topicId]) {
    return topicPresetFactories[params.topicId](language, params.username);
  }

  return defaultBugPresets(language, params.username);
}
