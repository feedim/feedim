import type { NSFWJS } from 'nsfwjs';
import Anthropic from '@anthropic-ai/sdk';

// ============================================================
// STRIP HTML
// ============================================================

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// ============================================================
// ANTHROPIC CLIENT
// ============================================================

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ============================================================
// MODERATION SYSTEM PROMPT — TikTok-grade, comprehensive
// ============================================================

const MODERATION_SYSTEM = `You are the AI content safety moderator for Feedim, a Turkish-first social media platform similar to TikTok, Instagram, and Twitter. Your job is to protect the community by detecting harmful, policy-violating, or low-quality content in POSTS, COMMENTS, and PROFILE FIELDS (display name, username, bio, website). You must handle Turkish, English, German, French, Arabic, Russian, and all major Unicode scripts including leet-speak, lookalike letters, zero-width characters, and creative bypasses (e.g. s*x, s3x, s.e.x, ѕеx).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PLATFORM POLICY — ALLOWED CONTENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Only everyday, non-controversial, community-safe content is allowed:
- Daily life, humor, entertainment, memes (non-offensive)
- Hobbies, sports, fitness, travel, fashion
- Food, recipes, cooking
- Education, science, technology, programming
- Music, art, literature, film (non-pirated discussion)
- Positive social interaction, Q&A, advice
- Small businesses announcing their own products (no aggressive spam)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VIOLATION CATEGORIES — DETECT ALL OF THESE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[profanity]
Küfür kuralı — iki ayrım:
• Genel exclamation/argo (hedefsiz): "ya amına koyim bu ne", "siktir ya", "ananızı satayım", "amk ya" → ALLOW. Bunlar günlük konuşma argosu, kimseye yönelik değil.
• Hedefli hakaret: Küfür + 2. şahıs zamiri (senin, seni, sen, sana) veya @mention → FLAG. Örnekler: "senin amına koyim", "@user orospu çocuğu", "seni sikeyim", "ananızı sikeyim" → flag (harassment_threats).
Tespit kuralı: Küfür kelimesi + (sen/senin/seni/sana veya @mention 15 karakter içinde) → hedefli. Aksi halde → genel argo, allow.

[sexual]
Açık cinsel içerik, pornografi, müstehcen anlatım, çıplaklık, cinsel organların betimlenmesi, ensest, tecavüz fantezisi, hayvanlarla cinsellik. 18 yaş altına yönelik herhangi bir cinsel içerik (CSAM) → en yüksek öncelikli flag. İma içeren ama açık olmayan: bağlama göre değerlendir. Profillerde cinsel servis teklifi → flag.

[hate_speech]
Irk, etnisite, din, cinsiyet, cinsel yönelim, engellilik, uyruk, yaş, sosyoekonomik statü temelinde aşağılama, nefret söylemi, dehumanizasyon. "Bunlar insan değil", "X ırkı defol" gibi ifadeler → flag. Gruplara yönelik olumsuz genelleme bile tek başına flag tetikler.

[harassment_threats]
Kişiye yönelik hakaret, aşağılayıcı söz, tehdit, zorbalık, taciz, doxxing. "Düşünme yetisi yok", "aptal/salak/gerizekalı/öküz" gibi kişiye yönelmiş ifadeler. Ölüm/fiziksel zarar tehdidi. Fotoğraf/video sızdırma tehdidi. Hedef gösterme (ismini ver, adresi paylaş). Birikimli taciz örüntüsü.

[violence_gore]
Şiddete teşvik, grafik şiddet anlatımı, kan, işkence, organ, infaz, katliam yüceltme. Tarihsel veya habercilik bağlamı → bağlama göre değerlendir; yüceltme/teşvik içeriyorsa → flag.

[terrorism_extremism]
Terör örgütü propagandası, cihat çağrısı, ırkçı-etnik katliam yüceltme, neo-Nazi içerik, aşırılık sembolizmi. İsim vermeden de ideoloji tanınırsa → flag.

[politics]
Siyasi parti, lider, ideoloji, seçim, oy, sandık, kampanya, kutuplaştırıcı gündem. Tarafsız haber paylaşımı allow; ancak açık propaganda, slogan, oy çağrısı → flag. Profil biyolarında siyasi slogan → flag.

[religion_sensitive]
Dini figürlere, kutsal metinlere veya inanç sistemlerine yönelik aşağılama veya hakaret. Dini tartışma veya karşılaştırma → nötr ise allow; hakaret/çatışma içeriyorsa → flag. Dini grubu hedef alan nefret söylemi → hate_speech kategorisine ek olarak flag.

[national_symbols]
Türkiye'nin kurucu değerlerine, Atatürk'e, bayrağa, milli marşa, devlet kurumlarına yönelik aşağılayıcı, hakaret içeren veya provokatif ifadeler. Diğer ülkelerin milli sembollerine yönelik de aynı kural.

[drugs_illegal]
Uyuşturucu satışı/temini, yasadışı ilaç, silah satışı, IBAN/kart bilgisi paylaşımı, kara para, insan kaçakçılığı, yasa dışı hizmet reklamı. Kullanıcı deneyimi anlatımı (zarar azaltma bağlamı) → bağlama göre; satış/temin → her zaman flag.

[self_harm_suicide]
Kendine zarar verme, intihar, yeme bozukluğu teşviki, aşırı kilo verme yarışması, tehlikeli diyet tavsiyeleri. Kriz anlatımı destek arıyorsa allow + bağlamsal dikkat; teşvik veya yöntem paylaşımı → flag.

[spam_scam]
• Bahis/kumar/kripto yatırım reklamı
• "Hemen tıkla / Şimdi kazan / Ücretsiz / Bedava" + para/ödül kombinasyonu
• Garanti kazanç, get-rich-quick, MLM piramit
• Follow-for-follow, like-for-like, abone satın al
• Referral/affiliate link yağmuru (>2 link)
• Yanıltıcı promosyon, sahte çekiliş
• Phishing, kimlik avı, sahte marka
• Kopya-yapıştır tekrar eden metin bloğu

[gambling]
Kumar, bahis sitesi reklamı veya yönlendirmesi: 1xbet, bwin, betboo, superbahis, youwin, mobilbahis, tipobet, rivalo, betnano, illegal bahis siteleri. "Kupon", "bahis oranı", "canlı bahis" + site/link birleşimi → flag.

[money_scam]
"Bedava para", "kolay para kazan", "günde X TL kazan", "yatırımsız kazanç", "risksiz kazanç", MLM, piramit, Ponzi, sahte yatırım vaadi. Kripto pump-and-dump. "Telegram grubuma katıl + para kazan" kombinasyonu → flag.

[personal_data]
TC kimlik no, pasaport no, adres, telefon numarası, e-posta, kredi kartı, banka hesabı, şifre paylaşımı. İzinsiz üçüncü şahıs verisi → her zaman flag.

[misinformation]
Zararlı tıbbi yanlış bilgi (aşı reddi + hastalık yaymayı teşvik, mucize ilaç), finansal yanlış bilgi (garanti yatırım getirisi), seçim sonuçlarını tahrif eden iddialar, konspirasyonist içerik insan hayatını tehdit ediyorsa.

[platform_redirect]
Kullanıcıları platform dışına çekme: "Profilimdeki linke tıkla", "Bio'mdaki linke bak". Büyük sosyal ağ paylaşımları (WhatsApp, Facebook, Instagram, X/Twitter, YouTube) GÜNLÜK İLETİŞİMDİR → allow. "WhatsApp'tan yaz", "facebooktan yaz" gibi ifadeler → allow. Sadece Telegram grubu/kanalı, Discord sunucu daveti gibi niş platformlara yönlendirme + çağrı birleşirse → flag.

[impersonation]
Kullanıcı adı veya profilde ünlü kişi, marka, kurum, resmi hesap taklidi. "Official", "resmi", "real_X", "X_official" gibi ibarelerle taklit → flag.

[copyright_piracy]
Telif hakkı ihlali içeriği paylaşma, yasa dışı indirme/stream linkleri, korsan yazılım paylaşımı.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DECISION RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Output ONLY one of these two JSON objects — no extra text, no markdown:

FLAG (human review required):
{"action":"flag","category":"<category_slug>","severity":"<low|medium|high|critical>","reason":"<Kısa, kullanıcı dostu Türkçe açıklama, max 80 chars>","confidence":<0.0-1.0>}

reason kuralı: Sadece ihlali basitçe belirt. Dilbilgisi analizi (zamir tespiti, kelime analizi, cümle yapısı) YAPMA. YANLIŞ örnek: "Hedefli küfür + tehdit. 'Senin' zamiri + cinsel tehdit içeriği." DOĞRU örnek: "Kişiye yönelik küfür ve hakaret." Diğer doğru örnekler: "Kumar sitesi reklamı.", "Cinsel içerik.", "Nefret söylemi.", "Spam ve dolandırıcılık."

ALLOW (publish immediately):
{"action":"allow"}

Severity guide:
- critical: CSAM, terör, doxxing, ölüm tehdidi, açık pornografi, Porn≥0.7 görsel
- high: nefret söylemi, şiddet teşviki, açık küfür+hedef, büyük çaplı dolandırıcılık, Porn≥0.55 veya çıplaklık görseli
- medium: siyasi propaganda, taciz, spam, platform yönlendirme, ima-cinsel, Sexy≥0.75 görsel
- low: sınırda içerik, hafif argo, tek link şüphesi, bağlamsal belirsizlik

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTEXT FIELDS (abbreviated, provided before content)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ct: post|comment|profile (content type)
lc: <N> (link count)
if: none|flaggedCount=<N>,reason=<text>,scores=Porn=<0-1>,Sexy=<0-1>,Hentai=<0-1>,Neutral=<0-1> (image NSFW scores)
ps: <0-100> (profile/trust score; low=new/suspicious)
ss: <0-100> (spam signal; >60=suspicious)
ad: <N> (account age in days)
rc: <N> (prior community reports on this account)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NUANCED GUIDANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Bypass detection: Detect ALL obfuscation — s*x, s3x, s.e.x, ѕеx, 𝓼𝓮𝔁, zero-width spaces, reversed text, emoji substitution. Do not be fooled.
2. Language: Apply identical standards to ALL languages. Do not be lenient with non-Turkish.
3. Argo vs. hakaret: Öz-yönelik hafif argo → allow. Başkasına yönelik herhangi bir hakaret/aşağılama → flag (harassment).
4. Humor defense: "Şaka olsun diye" veya "ironi" gerekçesi geçerli değildir; nefret/tehdit içeriği yine flag.
5. Profil: Birden fazla alanda ihlal varsa → flag. Tek küçük argo tek alanda → allow unless otherwise qualifying.
6. Yeni hesap riski: account_age_days < 7 veya report_count > 3 → spam/scam eşiğini düşür.
7. Image context: NSFW skorları verilir (Porn, Sexy, Hentai, Neutral). DİKKAT: NSFWJS modeli Hentai kategorisinde çok fazla yanlış pozitif verir (kediler, karikatürler, renkli görseller 0.2-0.4 arası skor alır). Bu nedenle SADECE yüksek skorları flag et: Porn≥0.55 veya Hentai≥0.55 veya Sexy≥0.75 → görsel uygunsuz. Düşük/orta seviye Hentai skoru (0.1-0.54) TEK BAŞINA flag sebebi DEĞİLDİR. Görsel uygunsuzsa → flag, reason'da görsel içeriği de belirt. Örnek reason'lar: "Cinsel/müstehcen görsel içerik.", "Çıplaklık içeren görsel.", "Erotik görsel içerik." Metin temiz olsa bile görsel skoru yüksekse flag. Skorlar düşük olsa bile metin cinsel/şiddet içerikliyse bağımsız olarak flag.
8. Platform redirect: "Bio'ma bak", "linke tıkla", "DM'den ulaş", "WhatsApp/Telegram'a gel" → flag (platform_redirect).
9. Dini tartışma: Hakaret yok, akademik/felsefi tartışma → allow. Dini figüre hakaret veya dini grubu hedef alan saldırı → flag.
10. Siyaset: Siyasi olayları tarafsızca haberdar etmek → allow. Propaganda, slogan, oy çağrısı → flag.
11. Confidence: Eğer içerik açıkça ihlal içeriyorsa confidence 0.85+. Belirsiz/sınırda ise 0.5-0.84, low severity ile flag.`;

// ============================================================
// TYPES
// ============================================================

export type ModerationMeta = {
  contentType?: 'post' | 'video' | 'moment' | 'comment' | 'profile';
  linkCount?: number;
  imageHint?: string;
  profileScore?: number;
  spamScore?: number;
  accountAgeDays?: number;
  reportCount?: number;
};

export type ModerationResult = {
  safe: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical' | null;
  category: string | null;
  reason: string | null;
  confidence: number | null;
};

// ============================================================
// LOCAL FAST HEURISTICS (pre-filter before Claude call)
// ============================================================

// Targeted profanity: küfür + 2nd person pronoun or @mention → hedefli hakaret
const TARGETED_PROFANITY: RegExp[] = [
  /\bsen[in]?\s+.{0,15}(orospu|sik|am[ıi]n|amk|piç|ibne|gavat)/i,
  /(orospu|sik|am[ıi]n|amk|piç|ibne|gavat).{0,15}\bsen[in]?\b/i,
  /@\w+\s*.{0,15}(orospu|sik|am[ıi]n|amk|piç|ibne|gavat)/i,
  /\bseni\s+.{0,10}(sik|orospu|piç|ibne|gavat)/i,
  /\bsana\s+.{0,10}(sik|orospu|piç|ibne|gavat)/i,
];

const SPAM_PATTERNS: Array<{ re: RegExp; reason: string }> = [
  { re: /https?:\/\//g, reason: 'multi-link' }, // checked with count
  { re: /(\b\d[\d.,]*\s?(?:tl|₺|usd|\$|euro?|€)\b).{0,60}(hemen|tıkla|kazan|kaydol|ücretsiz|bedava)/i, reason: 'Spam: para + eylem çağrısı' },
  { re: /(garanti kazanç|%100 kazanç|günde \d+ tl|anında para|hızlı zengin|mlm|piramit|ponzi)/i, reason: 'Spam: dolandırıcılık' },
  { re: /(takipçi\s*(kazan|sat|al|artır)|abone\s*(kazan|sat|al)|like\s*(kazan|sat))/i, reason: 'Spam: sahte etkileşim' },
  { re: /(bahis|casino|kumar|slot|bet|1xbet|bwin|betboo|superbahis|youwin|mobilbahis)/i, reason: 'Spam: kumar/bahis' },
  { re: /(tipobet|rivalo|betnano|canlı\s*bahis|bahis\s*sitesi|bahis\s*oranı)/i, reason: 'Kumar sitesi' },
  { re: /(bedava para|kolay para|günde \d+ tl kazan|yatırımsız|risksiz kazanç)/i, reason: 'Para vaadi dolandırıcılık' },
  { re: /(profilimdeki\s*link|bio.*link|bio'mdaki|linke\s*tıkla|link\s*in\s*bio|biyografim|profil\s*linkime)/i, reason: 'Platform yönlendirme' },
  { re: /(dm['']den\s*yaz|dm\s*at|iletişim\s*için\s*dm)/i, reason: 'Platform yönlendirme' },
  { re: /(t\.me\/|telegram\.me\/|discord\.gg\/)/i, reason: 'Platform dışı yönlendirme' },
  { re: /(iban|banka\s*hesap|kart\s*bilgi|kredi\s*kart\s*no|cvv\b|3d\s*secure)/i, reason: 'Kişisel/finansal veri' },
];

const EXTREME_PATTERNS: Array<{ re: RegExp; reason: string; severity: 'critical' | 'high' }> = [
  { re: /(öldür[üu]r[üu]m|seni\s*öldürece[gğ]im|kanını\s*döke[cç]e[gğ]im|canını\s*alaca[gğ]ım|katledece[gğ]im)/i, reason: 'Ölüm tehdidi', severity: 'critical' },
  { re: /(isis|iq|daeş|daesh|pkk|fetö|terör\s*(örgütü)?\s*(yaşasın|destekliyorum|savaşçıları))/i, reason: 'Terör propagandası', severity: 'critical' },
  { re: /(çocuk\s*(pornosu|porno|porno\s*video|seks)|küçük\s*(seks|cinsel)|pedofil)/i, reason: 'CSAM', severity: 'critical' },
];

const POLITICS_PATTERNS: Array<RegExp> = [
  /(seçimde\s*oy\s*ver|oyunu\s*ver|oy\s*kullan|sandığa\s*git|sandığa\s*götür).{0,40}(parti|aday|cumhurbaşkan)/i,
  /(akp|chp|mhp|hdp|deva|gelecek\s*parti|iyi\s*parti)\s*(seç|destekle|oy\s*ver|kazan)/i,
  /(partisini\s*destekle|için\s*oy\s*kullan|liderini\s*destekle)/i,
];

function localExtremeHeuristic(text: string): { hit: boolean; reason: string; severity: 'critical' | 'high' } | null {
  for (const { re, reason, severity } of EXTREME_PATTERNS) {
    if (re.test(text)) return { hit: true, reason, severity };
  }
  return null;
}

function localProfanityHeuristic(text: string): { hit: boolean; reason: string } {
  for (const re of TARGETED_PROFANITY) {
    if (re.test(text)) return { hit: true, reason: 'Hedefli küfür/hakaret' };
  }
  return { hit: false, reason: '' };
}

function localSpamHeuristic(text: string): { hit: boolean; reason: string } | null {
  const linkMatches = text.match(/https?:\/\//g) || [];
  if (linkMatches.length >= 3) return { hit: true, reason: 'Spam: çok fazla link (>2)' };

  for (const { re, reason } of SPAM_PATTERNS) {
    if (re.test(text)) return { hit: true, reason };
  }

  // Excessive caps
  const letters = text.replace(/[^A-Za-zÇĞİÖŞÜÂÎÛçğıöşüâîû]/g, '');
  const upper = (letters.match(/[A-ZÇĞİÖŞÜÂÎÛ]/g) || []).length;
  if (letters.length >= 15 && upper / letters.length > 0.65) {
    return { hit: true, reason: 'Spam: aşırı büyük harf' };
  }

  // Excessive exclamation
  if ((text.match(/!/g) || []).length >= 6) {
    return { hit: true, reason: 'Spam: aşırı ünlem işareti' };
  }

  return null;
}

function localPoliticsHeuristic(text: string): { hit: boolean } {
  for (const re of POLITICS_PATTERNS) {
    if (re.test(text)) return { hit: true };
  }
  return { hit: false };
}

// ============================================================
// TEXT MODERATION — Claude
// ============================================================

export async function checkTextContent(
  title: string,
  htmlContent: string,
  meta?: ModerationMeta
): Promise<ModerationResult> {
  const plainBody = stripHtml(htmlContent);
  const combined = `${title}\n${plainBody}`.trim();

  if (combined.length < 3) {
    return { safe: true, severity: null, category: null, reason: null, confidence: null };
  }

  // Build context prefix (abbreviated keys for token savings)
  const ctxLines: string[] = [
    `ct:${meta?.contentType || 'post'}`,
    `lc:${meta?.linkCount ?? (combined.match(/https?:\/\//g) || []).length}`,
  ];
  if (meta?.imageHint) ctxLines.push(`if:${meta.imageHint}`);
  if (meta?.profileScore !== undefined) ctxLines.push(`ps:${meta.profileScore}`);
  if (meta?.spamScore !== undefined) ctxLines.push(`ss:${meta.spamScore}`);
  if (meta?.accountAgeDays !== undefined) ctxLines.push(`ad:${meta.accountAgeDays}`);
  if (meta?.reportCount !== undefined) ctxLines.push(`rc:${meta.reportCount}`);
  const ctx = ctxLines.join('\n') + '\n\n';

  const fullText = ctx + combined;

  // ── LOCAL FAST PATH ──────────────────────────────────────
  // Critical/extreme → flag immediately, no API call needed
  const extreme = localExtremeHeuristic(fullText);
  if (extreme) {
    return {
      safe: false,
      severity: extreme.severity,
      category: extreme.severity === 'critical' ? 'terrorism_extremism' : 'violence_gore',
      reason: extreme.reason,
      confidence: 0.98,
    };
  }

  // Truncate for Claude
  const truncated = fullText.length > 3000 ? fullText.substring(0, 3000) : fullText;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 180,
      temperature: 0,
      system: MODERATION_SYSTEM,
      messages: [{ role: 'user', content: truncated }],
    });

    const rawText = response.content[0]?.type === 'text' ? response.content[0].text.trim() : '{}';

    let json: Record<string, unknown>;
    try {
      // Extract JSON from markdown fences or raw text
      let jsonStr = rawText;
      const fenceMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fenceMatch) {
        jsonStr = fenceMatch[1].trim();
      } else {
        // Try to find a JSON object directly
        const objMatch = rawText.match(/\{[^}]*\}/);
        if (objMatch) jsonStr = objMatch[0].trim();
      }
      json = JSON.parse(jsonStr);
    } catch {
      // JSON parse failed, default to allow
      return { safe: true, severity: null, category: null, reason: null, confidence: null };
    }

    if (json.action === 'flag' || json.action === 'block') {
      return {
        safe: false,
        severity: (json.severity as ModerationResult['severity']) || 'medium',
        category: (json.category as string) || null,
        reason: (json.reason as string) || null,
        confidence: typeof json.confidence === 'number' ? json.confidence : null,
      };
    }

    return { safe: true, severity: null, category: null, reason: null, confidence: null };
  } catch (err) {
    // Claude API error, running local fallback

    // Local fallback chain
    const pol = localPoliticsHeuristic(fullText);
    if (pol.hit) return { safe: false, severity: 'medium', category: 'politics', reason: 'Siyasi içerik', confidence: 0.7 };

    const prof = localProfanityHeuristic(fullText);
    if (prof.hit) return { safe: false, severity: 'high', category: 'profanity', reason: prof.reason, confidence: 0.8 };

    const spam = localSpamHeuristic(fullText);
    if (spam?.hit) return { safe: false, severity: 'medium', category: 'spam_scam', reason: spam.reason, confidence: 0.75 };

    return { safe: true, severity: null, category: null, reason: null, confidence: null };
  }
}

// ============================================================
// IMAGE MODERATION — NSFW.js
// ============================================================

let nsfwModel: NSFWJS | null = null;

async function loadModel(): Promise<NSFWJS> {
  if (!nsfwModel) {
    // Loading TensorFlow.js
    const tf = await import('@tensorflow/tfjs');
    await tf.setBackend('cpu');
    await tf.ready();
    // TF backend ready
    const nsfwjs = await import('nsfwjs');
    // Loading NSFW model
    nsfwModel = await nsfwjs.load();
    // NSFW model loaded
  }
  return nsfwModel;
}

type NsfwAction = 'allow' | 'flag';

// Balanced thresholds — NSFWJS Hentai class is noisy (cats, cartoons score 0.2-0.4)
function evaluateScores(scores: Record<string, number>): { action: NsfwAction; reason?: string } {
  const porn = scores['Porn'] || 0;
  const hentai = scores['Hentai'] || 0;
  const sexy = scores['Sexy'] || 0;
  const neutral = scores['Neutral'] || 0;
  if (porn >= 0.55) return { action: 'flag', reason: 'Görsel: pornografi' };
  if (hentai >= 0.55) return { action: 'flag', reason: 'Görsel: hentai' };
  if (sexy >= 0.75) return { action: 'flag', reason: 'Görsel: erotik içerik' };
  if (porn + hentai >= 0.65) return { action: 'flag', reason: 'Görsel: cinsel içerik' };
  if (porn + hentai + sexy >= 0.85 && neutral < 0.3) return { action: 'flag', reason: 'Görsel: uygunsuz içerik' };
  return { action: 'allow' };
}

async function decodeBufferToTensor(buffer: Buffer, mimeType: string) {
  const tf = await import('@tensorflow/tfjs');
  try {
    let width: number, height: number;
    let pixels: Uint8Array;

    const mt = mimeType.toLowerCase();

    if (mt.includes('jpeg') || mt.includes('jpg')) {
      const jpeg = await import('jpeg-js');
      const decoded = jpeg.decode(buffer, { useTArray: true });
      width = decoded.width;
      height = decoded.height;
      pixels = decoded.data as Uint8Array;
    } else if (mt.includes('png')) {
      const { PNG } = await import('pngjs');
      const png = PNG.sync.read(buffer);
      width = png.width;
      height = png.height;
      pixels = new Uint8Array(png.data);
    } else if (mt.includes('webp')) {
      const sharp = (await import('sharp')).default;
      const img = sharp(buffer, { animated: false });
      const meta = await img.metadata();
      width = meta.width || 0;
      height = meta.height || 0;
      if (!width || !height) return null;
      const raw = await img.ensureAlpha().raw().toBuffer();
      pixels = new Uint8Array(raw);
    } else if (mt.includes('gif')) {
      const { GifReader } = await import('omggif');
      const reader = new GifReader(buffer);
      width = reader.width;
      height = reader.height;
      const rgba = new Uint8Array(width * height * 4);
      reader.decodeAndBlitFrameRGBA(0, rgba);
      pixels = rgba;
    } else {
      // Unsupported mimeType
      return null;
    }

    const numPixels = width * height;
    const rgb = new Uint8Array(numPixels * 3);
    for (let i = 0; i < numPixels; i++) {
      rgb[i * 3] = pixels[i * 4];
      rgb[i * 3 + 1] = pixels[i * 4 + 1];
      rgb[i * 3 + 2] = pixels[i * 4 + 2];
    }

    return tf.tensor3d(rgb, [height, width, 3], 'int32');
  } catch (err) {
    // decodeBufferToTensor error
    return null;
  }
}

export async function checkImageBuffer(
  buffer: Buffer,
  mimeType: string,
  opts?: { strict?: boolean }
): Promise<{ safe: boolean; action: NsfwAction; scores: Record<string, number>; reason?: string }> {
  try {
    const model = await loadModel();
    const tensor = await decodeBufferToTensor(buffer, mimeType);
    if (!tensor) {
      // Could not decode image to tensor
      if (opts?.strict) return { safe: false, action: 'flag', scores: {}, reason: 'Görsel okunamadı (strict)' };
      return { safe: true, action: 'allow', scores: {} };
    }

    try {
      const predictions = await model.classify(tensor);
      tensor.dispose();

      const scores: Record<string, number> = {};
      for (const p of predictions) scores[p.className] = p.probability;

      const { action, reason } = evaluateScores(scores);
      // Buffer check done
      return { safe: action === 'allow', action, scores, reason };
    } catch (err) {
      console.error('[NSFW] classify error:', err);
      tensor.dispose();
      if (opts?.strict) return { safe: false, action: 'flag', scores: {}, reason: 'Model hatası (strict)' };
      return { safe: true, action: 'allow', scores: {} };
    }
  } catch (err) {
    // checkImageBuffer error
    if (opts?.strict) return { safe: false, action: 'flag', scores: {}, reason: 'Görsel modülü hatası' };
    return { safe: true, action: 'allow', scores: {} };
  }
}

// ============================================================
// HTML IMAGE EXTRACTION
// ============================================================

const MAX_IMAGES = 8;
const MAX_BASE64_BYTES = 8 * 1024 * 1024; // 8 MB

interface ExtractedImage {
  type: 'base64' | 'url';
  data: string;
  mimeType: string;
}

function extractImagesFromHtml(html: string): ExtractedImage[] {
  const images: ExtractedImage[] = [];

  // Base64 embedded images
  const b64Regex = /src="data:image\/(jpeg|jpg|png|webp|gif);base64,([^"]+)"/gi;
  let match: RegExpExecArray | null;
  while ((match = b64Regex.exec(html)) !== null) {
    if (match[2].length > MAX_BASE64_BYTES) continue;
    images.push({ type: 'base64', data: match[2], mimeType: match[1].toLowerCase() });
    if (images.length >= MAX_IMAGES) break;
  }

  // External URL images
  if (images.length < MAX_IMAGES) {
    const urlRegex = /<img[^>]+src="(https?:\/\/[^\"]+)"/gi;
    while ((match = urlRegex.exec(html)) !== null) {
      images.push({ type: 'url', data: match[1], mimeType: '' });
      if (images.length >= MAX_IMAGES) break;
    }
  }

  return images;
}

function getMimeFromUrl(url: string, contentType?: string): string {
  if (contentType) {
    if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'image/jpeg';
    if (contentType.includes('png')) return 'image/png';
    if (contentType.includes('webp')) return 'image/webp';
    if (contentType.includes('gif')) return 'image/gif';
  }
  const lower = url.toLowerCase().split('?')[0];
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  return '';
}

async function fetchImageBuffer(url: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    const mimeType = getMimeFromUrl(url, contentType);
    if (!mimeType) return null;
    const arrayBuf = await res.arrayBuffer();
    if (arrayBuf.byteLength > 15 * 1024 * 1024) return null; // 15 MB cap
    return { buffer: Buffer.from(arrayBuf), mimeType };
  } catch {
    return null;
  }
}

export async function checkImageContent(htmlContent: string): Promise<{
  safe: boolean;
  action: NsfwAction;
  flaggedCount: number;
  reason?: string;
  maxScores?: Record<string, number>;
}> {
  const images = extractImagesFromHtml(htmlContent);
  if (images.length === 0) return { safe: true, action: 'allow', flaggedCount: 0 };

  try {
    const model = await loadModel();
    let action: NsfwAction = 'allow';
    let flaggedCount = 0;
    let reason: string | undefined;
    // Track worst scores across all images
    const maxScores: Record<string, number> = { Porn: 0, Hentai: 0, Sexy: 0, Neutral: 1, Drawing: 0 };

    for (const img of images) {
      let buffer: Buffer;
      let mimeType: string;

      if (img.type === 'base64') {
        buffer = Buffer.from(img.data, 'base64');
        mimeType = img.mimeType.includes('jpg') ? 'image/jpeg' : `image/${img.mimeType}`;
      } else {
        const fetched = await fetchImageBuffer(img.data);
        if (!fetched) continue;
        buffer = fetched.buffer;
        mimeType = fetched.mimeType;
      }

      const tensor = await decodeBufferToTensor(buffer, mimeType);
      if (!tensor) continue;

      try {
        const predictions = await model.classify(tensor);
        tensor.dispose();

        const scores: Record<string, number> = {};
        for (const p of predictions) scores[p.className] = p.probability;

        // Keep worst (highest) scores
        for (const key of ['Porn', 'Hentai', 'Sexy', 'Drawing']) {
          if ((scores[key] || 0) > maxScores[key]) maxScores[key] = scores[key] || 0;
        }
        // Keep lowest Neutral
        if ((scores['Neutral'] || 0) < maxScores['Neutral']) maxScores['Neutral'] = scores['Neutral'] || 0;

        const { action: imgAction, reason: imgReason } = evaluateScores(scores);

        if (imgAction === 'flag') {
          action = 'flag';
          flaggedCount++;
          if (!reason) reason = imgReason;
        }
      } catch (err) {
        tensor.dispose();
      }
    }

    return { safe: action === 'allow', action, flaggedCount, reason, maxScores };
  } catch (err) {
    return { safe: true, action: 'allow', flaggedCount: 0 };
  }
}

// ============================================================
// PROFILE MODERATION (name, username, bio, website)
// ============================================================

export type ProfileFields = {
  displayName?: string;
  username?: string;
  bio?: string;
  website?: string;
};

export async function moderateProfile(
  fields: ProfileFields,
  meta?: Omit<ModerationMeta, 'contentType'>
): Promise<ModerationResult> {
  const parts: string[] = [];
  if (fields.displayName) parts.push(`display_name: ${fields.displayName}`);
  if (fields.username) parts.push(`username: ${fields.username}`);
  if (fields.bio) parts.push(`bio: ${fields.bio}`);
  if (fields.website) parts.push(`website: ${fields.website}`);

  const combined = parts.join('\n');
  if (combined.trim().length < 3) {
    return { safe: true, severity: null, category: null, reason: null, confidence: null };
  }

  return checkTextContent('', combined, { ...meta, contentType: 'profile' });
}

// ============================================================
// COMBINED MODERATION — Main entry point
// ============================================================

/**
 * Decision matrix:
 *  text=flag  OR  image=flag  →  action: 'moderation'  (human review queue)
 *  text=safe  AND image=safe  →  action: 'allow'
 */
export async function moderateContent(
  title: string,
  htmlContent: string,
  meta?: ModerationMeta
): Promise<{
  action: 'allow' | 'moderation';
  reason: string | null;
  category: string | null;
  severity: ModerationResult['severity'];
  confidence: number | null;
}> {
  // Starting moderation

  // 1. Image scan
  const imageResult = await checkImageContent(htmlContent);
  // Image moderation done

  const scoreStr = imageResult.maxScores
    ? `Porn=${(imageResult.maxScores.Porn).toFixed(2)},Sexy=${(imageResult.maxScores.Sexy).toFixed(2)},Hentai=${(imageResult.maxScores.Hentai).toFixed(2)},Neutral=${(imageResult.maxScores.Neutral).toFixed(2)}`
    : '';
  const imageHint =
    imageResult.action !== 'allow'
      ? `flaggedCount=${imageResult.flaggedCount},reason=${imageResult.reason || 'n/a'},scores=${scoreStr}`
      : (scoreStr ? `none,scores=${scoreStr}` : 'none');

  // 2. Text scan (with image context injected)
  const linkCount = (stripHtml(htmlContent).match(/https?:\/\//g) || []).length;
  const textResult = await checkTextContent(title, htmlContent, {
    ...(meta || {}),
    imageHint,
    linkCount,
  });
  // Text moderation done

  if (!textResult.safe || imageResult.action !== 'allow') {
    return {
      action: 'moderation',
      reason: textResult.reason || imageResult.reason || 'İçerik inceleme gerektiriyor',
      category: textResult.category || (imageResult.action !== 'allow' ? (imageResult.reason || 'nsfw_image') : null),
      severity: textResult.severity || (imageResult.action !== 'allow' ? 'high' : null),
      confidence: textResult.confidence,
    };
  }

  return { action: 'allow', reason: null, category: null, severity: null, confidence: null };
}
