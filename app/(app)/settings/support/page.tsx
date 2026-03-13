import { getLocale, getMessages } from "next-intl/server";
import SupportPageClient, { type SupportPageLabels } from "./SupportPageClient";

function getNestedString(
  source: Record<string, unknown>,
  path: string,
  fallback: string,
) {
  const value = path.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[segment];
  }, source);

  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

export default async function SupportPage() {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);
  const support = ((messages as Record<string, unknown>).support as Record<string, unknown> | undefined) || {};
  const common = ((messages as Record<string, unknown>).common as Record<string, unknown> | undefined) || {};

  const labels: SupportPageLabels = {
    title: getNestedString(support, "title", "Destek Al"),
    description: getNestedString(
      support,
      "description",
      "Destek talebi oluşturun veya moderasyon kararına itiraz edin.",
    ),
    typeLabel: getNestedString(support, "typeLabel", "Destek Türü"),
    bugTopicLabel: getNestedString(support, "bugTopicLabel", "Konu"),
    decisionCode: getNestedString(support, "decisionCode", "Karar No"),
    decisionCodePlaceholder: getNestedString(support, "decisionCodePlaceholder", "Karar seçin"),
    noAppealableDecisions: getNestedString(
      support,
      "noAppealableDecisions",
      "İtiraz edilebilir karar bulunamadı",
    ),
    appealHint: getNestedString(
      support,
      "appealHint",
      "Sadece hesabınıza ait ve daha önce itiraz edilmemiş karar numaraları kabul edilir.",
    ),
    appealSearchLabel: getNestedString(support, "appealSearchLabel", "Karar ara"),
    appealSearchPlaceholder: getNestedString(support, "appealSearchPlaceholder", "İlk 3 rakamı girin"),
    appealSearchHint: getNestedString(
      support,
      "appealSearchHint",
      "Çok sayıda karar varsa en az 3 rakam girerek filtreleyin.",
    ),
    noMatchingDecision: getNestedString(support, "noMatchingDecision", "Eşleşen karar bulunamadı"),
    relatedUrl: getNestedString(support, "relatedUrl", "İlgili URL"),
    relatedUrlHint: getNestedString(
      support,
      "relatedUrlHint",
      "Varsa ilgili sayfanın bağlantısını ekleyebilirsiniz.",
    ),
    appealTextLabel: getNestedString(support, "appealTextLabel", "İtiraz Metni"),
    messageLabel: getNestedString(support, "messageLabel", "Mesaj"),
    appealPlaceholder: getNestedString(
      support,
      "appealPlaceholder",
      "Kararın neden yeniden incelenmesi gerektiğini yazın.",
    ),
    messagePlaceholder: getNestedString(
      support,
      "messagePlaceholder",
      "Sorunu veya talebinizi ayrıntılı şekilde yazın.",
    ),
    minLength: getNestedString(support, "minLength", "En az 10 karakter"),
    submitting: getNestedString(support, "submitting", "Gönderiliyor..."),
    submit: getNestedString(support, "submit", "Gönder"),
    submitted: getNestedString(support, "submitted", "Destek talebi gönderildi"),
    activeRequestNotice: getNestedString(
      support,
      "activeRequestNotice",
      "İşlemde olan destek talebiniz var. Yanıtlanana kadar yeni talep oluşturamazsınız.",
    ),
    viewActiveRequest: getNestedString(
      support,
      "viewActiveRequest",
      "Destek talebini görüntüle",
    ),
    tryAgainLater: getNestedString(common, "tryAgainLater", "Lütfen daha sonra tekrar deneyin"),
    types: {
      moderation_appeal: {
        label: getNestedString(support, "types.moderation_appeal.label", "Moderatör kararı itirazı"),
        desc: getNestedString(
          support,
          "types.moderation_appeal.desc",
          "Size verilen bir karar için yeniden inceleme talebi oluşturun.",
        ),
      },
      bug_report: {
        label: getNestedString(support, "types.bug_report.label", "Bir sorun yaşıyorum"),
        desc: getNestedString(
          support,
          "types.bug_report.desc",
          "Yaşadığınız sorunu seçin ve ayrıntılı şekilde bizimle paylaşın.",
        ),
      },
      other: {
        label: "Diğer",
        desc: "",
      },
    },
    bugTopics: [
      { value: "account", label: getNestedString(support, "bugTopics.account", "Hesabımla ilgili sorun yaşıyorum") },
      { value: "login", label: getNestedString(support, "bugTopics.login", "Giriş veya kayıt sorunu yaşıyorum") },
      { value: "password", label: getNestedString(support, "bugTopics.password", "Şifre veya doğrulama sorunu yaşıyorum") },
      { value: "profile", label: getNestedString(support, "bugTopics.profile", "Profilim veya ayarlarım ile ilgili sorun yaşıyorum") },
      { value: "post", label: getNestedString(support, "bugTopics.post", "Gönderi veya not paylaşımında sorun yaşıyorum") },
      { value: "video", label: getNestedString(support, "bugTopics.video", "Video veya moment yüklerken sorun yaşıyorum") },
      { value: "interaction", label: getNestedString(support, "bugTopics.interaction", "Yorum, beğeni veya takip ile ilgili sorun yaşıyorum") },
      { value: "payment", label: getNestedString(support, "bugTopics.payment", "Ödeme, jeton veya premium ile ilgili sorun yaşıyorum") },
      { value: "moderation", label: getNestedString(support, "bugTopics.moderation", "Moderasyon veya görünürlük ile ilgili sorun yaşıyorum") },
      { value: "notifications", label: getNestedString(support, "bugTopics.notifications", "Bildirim, arama veya keşfet ile ilgili sorun yaşıyorum") },
    ],
  };

  return <SupportPageClient labels={labels} locale={locale} />;
}
