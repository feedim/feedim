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
// MODERATION SYSTEM PROMPT — Token-optimized (~600 tokens)
// ============================================================

const MODERATION_SYSTEM = `Feedim AI moderator. Turkish-first social platform (TikTok/Instagram/Twitter). Detect harmful content in posts, comments, profiles, metadata. Handle TR/EN/DE/FR/AR/RU + leet-speak, lookalikes, zero-width, creative bypasses.

ALLOWED: daily life, humor, memes, hobbies, sports, food, education, tech, music, art, positive social, small biz (no aggressive spam).

CATEGORIES:
[profanity] Hedefsiz argo (amk, siktir) → ALLOW. Küfür + sen/seni/senin/sana/@mention 15 char içinde → FLAG harassment_threats.
[sexual] Açık cinsel, pornografi, CSAM (en yüksek öncelik), cinsel servis teklifi → flag.
[hate_speech] Irk/din/cinsiyet/yönelim/engellilik temelli aşağılama, dehumanizasyon → flag.
[harassment_threats] Kişiye hakaret, tehdit, doxxing, zorbalık → flag.
[violence_gore] Şiddete teşvik, grafik şiddet, katliam yüceltme → flag.
[terrorism_extremism] Terör propagandası, cihat, neo-Nazi, aşırılık → flag.
[politics] Siyasi propaganda, slogan, oy çağrısı → flag. Tarafsız haber → allow.
[religion_sensitive] Dini figüre hakaret → flag. Akademik tartışma → allow.
[national_symbols] Atatürk/bayrak/milli değerlere hakaret → flag.
[drugs_illegal] Uyuşturucu/silah satışı, yasadışı hizmet → flag.
[self_harm_suicide] İntihar/kendine zarar teşviki → flag. Destek arayışı → allow.
[spam_scam] Bahis/kumar reklam, garanti kazanç, MLM, sahte çekiliş, phishing → flag.
[gambling] Kumar/bahis sitesi (1xbet, bwin, betboo, superbahis vb.) → flag.
[money_scam] Bedava/kolay para, pump-dump, Ponzi → flag.
[personal_data] TC/kart/IBAN/şifre paylaşımı → flag.
[misinformation] Zararlı tıbbi/finansal yanlış bilgi → flag.
[platform_redirect] Bio link/profil link çağrısı, Telegram/Discord daveti → flag. WhatsApp/Instagram/YouTube → allow.
[impersonation] Ünlü/marka/kurum taklidi → flag.
[copyright_piracy] Korsan link/yazılım → flag.

RULES:
- @mention (etiketleme) normal sosyal davranış. Sadece @mention içermek veya ardışık @mention kullanmak spam DEĞİL. Küfür+@mention hariç, @mention'ları ignore et.
- Bypass detection: s*x, s3x, ѕеx, zero-width vb. tüm obfuscation tespit et.
- Tüm dillere aynı standart. Humor/ironi savunması geçersiz.
- Yeni hesap (ad<7 gün, rc>3) → spam eşiğini düşür.
- NSFW skorları: Porn≥0.70, Hentai≥0.70, Sexy≥0.88 → flag. Altı güvenli.

OUTPUT (JSON only, no markdown):
Flag: {"action":"flag","category":"<slug>","severity":"<low|medium|high|critical>","reason":"<Kısa Türkçe, max 80 char>","confidence":<0.0-1.0>}
Allow: {"action":"allow"}

reason: Sadece ihlali basitçe belirt, dilbilgisi analizi yapma.
Severity: critical=CSAM/terör/ölüm tehdidi, high=nefret/şiddet/hedefli küfür, medium=propaganda/taciz/spam, low=sınırda/belirsiz.

CONTEXT (before content): ct:post|video|moment|comment|profile|metadata lc:<N> if:<hint> ps:<0-100> ss:<0-100> ad:<N> rc:<N>`;

// ============================================================
// TYPES
// ============================================================

// ============================================================
// REPORT EVALUATION TYPES
// ============================================================

export type ReportData = {
  reason: string;
  description: string | null;
  weight: number;
};

export type ReportEvaluationResult = {
  shouldModerate: boolean;
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical' | null;
  confidence: number;
};

export type ModerationMeta = {
  contentType?: 'post' | 'video' | 'moment' | 'comment' | 'profile' | 'metadata';
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

const SAFE_RESULT: ModerationResult = { safe: true, severity: null, category: null, reason: null, confidence: null };

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
// LOCAL FALLBACK (when Claude API fails)
// ============================================================

function localFallback(text: string): ModerationResult {
  const pol = localPoliticsHeuristic(text);
  if (pol.hit) return { safe: false, severity: 'medium', category: 'politics', reason: 'Siyasi içerik', confidence: 0.7 };

  const prof = localProfanityHeuristic(text);
  if (prof.hit) return { safe: false, severity: 'high', category: 'profanity', reason: prof.reason, confidence: 0.8 };

  const spam = localSpamHeuristic(text);
  if (spam?.hit) return { safe: false, severity: 'medium', category: 'spam_scam', reason: spam.reason, confidence: 0.75 };

  return SAFE_RESULT;
}

// ============================================================
// SPLIT INTO CHUNKS (for long content)
// ============================================================

function splitIntoChunks(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }

    // Find best split point: paragraph > sentence > line > space
    const minSplit = Math.floor(maxLen * 0.4);
    let splitAt = -1;

    // Prefer paragraph boundary
    const paraIdx = remaining.lastIndexOf('\n\n', maxLen);
    if (paraIdx >= minSplit) {
      splitAt = paraIdx + 2;
    }

    // Fallback: sentence boundary
    if (splitAt === -1) {
      const sentIdx = remaining.lastIndexOf('. ', maxLen);
      if (sentIdx >= minSplit) {
        splitAt = sentIdx + 2;
      }
    }

    // Fallback: line boundary
    if (splitAt === -1) {
      const lineIdx = remaining.lastIndexOf('\n', maxLen);
      if (lineIdx >= minSplit) {
        splitAt = lineIdx + 1;
      }
    }

    // Fallback: space
    if (splitAt === -1) {
      const spaceIdx = remaining.lastIndexOf(' ', maxLen);
      if (spaceIdx >= minSplit) {
        splitAt = spaceIdx + 1;
      }
    }

    // Hard cut as last resort
    if (splitAt === -1) {
      splitAt = maxLen;
    }

    chunks.push(remaining.substring(0, splitAt));
    remaining = remaining.substring(splitAt);
  }

  return chunks;
}

// ============================================================
// CALL CLAUDE — single API call with JSON parsing
// ============================================================

async function callClaude(text: string, meta?: ModerationMeta): Promise<ModerationResult> {
  // Build context prefix
  const ctxLines: string[] = [
    `ct:${meta?.contentType || 'post'}`,
    `lc:${meta?.linkCount ?? (text.match(/https?:\/\//g) || []).length}`,
  ];
  if (meta?.imageHint) ctxLines.push(`if:${meta.imageHint}`);
  if (meta?.profileScore !== undefined) ctxLines.push(`ps:${meta.profileScore}`);
  if (meta?.spamScore !== undefined) ctxLines.push(`ss:${meta.spamScore}`);
  if (meta?.accountAgeDays !== undefined) ctxLines.push(`ad:${meta.accountAgeDays}`);
  if (meta?.reportCount !== undefined) ctxLines.push(`rc:${meta.reportCount}`);
  const ctx = ctxLines.join('\n') + '\n\n';

  const userMessage = ctx + text;

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 180,
    temperature: 0,
    system: MODERATION_SYSTEM,
    messages: [{ role: 'user', content: userMessage }],
  });

  const rawText = response.content[0]?.type === 'text' ? response.content[0].text.trim() : '{}';

  let json: Record<string, unknown>;
  try {
    let jsonStr = rawText;
    const fenceMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim();
    } else {
      const objMatch = rawText.match(/\{[^}]*\}/);
      if (objMatch) jsonStr = objMatch[0].trim();
    }
    json = JSON.parse(jsonStr);
  } catch {
    return SAFE_RESULT;
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

  return SAFE_RESULT;
}

// ============================================================
// TEXT MODERATION — Claude (with chunking for long content)
// ============================================================

export async function checkTextContent(
  title: string,
  htmlContent: string,
  meta?: ModerationMeta
): Promise<ModerationResult> {
  const plainTitle = stripHtml(title);
  const plainBody = stripHtml(htmlContent);
  const combined = `${plainTitle}\n${plainBody}`.trim();

  if (combined.length < 3) {
    return SAFE_RESULT;
  }

  // ── LOCAL FAST PATH ──────────────────────────────────────
  // Critical/extreme → flag immediately, no API call needed
  const extreme = localExtremeHeuristic(combined);
  if (extreme) {
    return {
      safe: false,
      severity: extreme.severity,
      category: extreme.severity === 'critical' ? 'terrorism_extremism' : 'violence_gore',
      reason: extreme.reason,
      confidence: 0.98,
    };
  }

  // ── SHORT CONTENT (<=2000 char) → single call ────────────
  if (combined.length <= 2000) {
    try {
      return await callClaude(combined, meta);
    } catch {
      return localFallback(combined);
    }
  }

  // ── LONG CONTENT (>2000 char) → chunked scanning ────────
  const chunks = splitIntoChunks(combined, 1500);

  try {
    for (const chunk of chunks) {
      const result = await callClaude(chunk, meta);
      if (!result.safe) return result; // Stop at first flag
    }
    return SAFE_RESULT;
  } catch {
    return localFallback(combined);
  }
}

// ============================================================
// METADATA MODERATION (tags, meta_title, meta_description, sound_title)
// ============================================================

export async function checkMetadataContent(fields: {
  tags?: string[];
  metaTitle?: string;
  metaDescription?: string;
  soundTitle?: string;
}, meta?: ModerationMeta): Promise<ModerationResult> {
  const parts: string[] = [];
  if (fields.tags && fields.tags.length > 0) parts.push(`tags: ${fields.tags.join(', ')}`);
  if (fields.metaTitle) parts.push(`meta_title: ${fields.metaTitle}`);
  if (fields.metaDescription) parts.push(`meta_description: ${fields.metaDescription}`);
  if (fields.soundTitle) parts.push(`sound_title: ${fields.soundTitle}`);

  const combined = parts.join('\n').trim();
  if (combined.length < 3) {
    return SAFE_RESULT;
  }

  // Local heuristic first
  const extreme = localExtremeHeuristic(combined);
  if (extreme) {
    return {
      safe: false,
      severity: extreme.severity,
      category: extreme.severity === 'critical' ? 'terrorism_extremism' : 'violence_gore',
      reason: extreme.reason,
      confidence: 0.98,
    };
  }

  const metaForCall: ModerationMeta = { ...meta, contentType: 'metadata' };

  try {
    return await callClaude(combined, metaForCall);
  } catch {
    return localFallback(combined);
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
    return SAFE_RESULT;
  }

  return checkTextContent('', combined, { ...meta, contentType: 'profile' });
}

// ============================================================
// REPORT EVALUATION SYSTEM PROMPT
// ============================================================

const REPORT_EVALUATION_SYSTEM = `Feedim AI moderasyon asistanı. Kullanıcı şikayetlerini gerçek içerikle karşılaştırarak değerlendir.

Görev:
1. Şikayet nedenlerini ve açıklamalarını analiz et
2. Gerçek içeriği incele — şikayetler haklı mı?
3. İçerikte ihlal var mı yok mu, dürüstçe belirt
4. Moderatör ekibine Türkçe kısa özet sun

OUTPUT (JSON only, no markdown):
Moderate: {"action":"moderate","reason":"<N şikayet: Özet açıklama, max 200 char>","severity":"<low|medium|high|critical>","confidence":<0.0-1.0>}
Dismiss: {"action":"dismiss","reason":"<N şikayet incelendi: Neden ihlal bulunamadığı, max 200 char>","confidence":<0.0-1.0>}

reason örnekleri:
- "12 şikayet: Nefret söylemi ve hedefli hakaret içeriyor"
- "5 şikayet: Spam bildirimi, içerikte spam unsuru bulunamadı — insan moderasyonu önerilir"
- "8 şikayet: Cinsel içerik bildirimi, içerikte uygunsuz ifadeler doğrulandı"
- "3 şikayet: Şiddet/tehdit bildirimi ancak içerik mizah bağlamında, sınırda — insan kararı gerekli"`;

// ============================================================
// EVALUATE USER REPORTS — AI-based report assessment
// ============================================================

export async function evaluateUserReports(
  contentText: string,
  contentType: 'post' | 'video' | 'moment' | 'comment' | 'profile',
  reports: ReportData[],
  totalReportCount: number,
): Promise<ReportEvaluationResult> {
  try {
    // Build report summary grouped by reason
    const reasonCounts: Record<string, number> = {};
    for (const r of reports) {
      reasonCounts[r.reason] = (reasonCounts[r.reason] || 0) + 1;
    }
    const reasonSummary = Object.entries(reasonCounts)
      .map(([reason, count]) => `${reason}: ${count}`)
      .join(', ');

    // Collect first 5 descriptions (max 100 chars each)
    const descriptions = reports
      .filter(r => r.description)
      .slice(0, 5)
      .map(r => r.description!.slice(0, 100));

    const trustedCount = reports.filter(r => r.weight >= 0.4).length;

    const reportSection = [
      `Şikayet özeti (${totalReportCount} toplam): ${reasonSummary}`,
      descriptions.length > 0 ? `Açıklamalar:\n${descriptions.map((d, i) => `${i + 1}. ${d}`).join('\n')}` : '',
    ].filter(Boolean).join('\n');

    const contextPrefix = `ct:${contentType} reports:${totalReportCount} trusted_reports:${trustedCount}`;
    const userMessage = `${contextPrefix}\n\nŞİKAYETLER:\n${reportSection}\n\nİÇERİK:\n${contentText.slice(0, 3000)}`;

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 250,
      temperature: 0,
      system: REPORT_EVALUATION_SYSTEM,
      messages: [{ role: 'user', content: userMessage }],
    });

    const rawText = response.content[0]?.type === 'text' ? response.content[0].text.trim() : '{}';

    let json: Record<string, unknown>;
    let jsonStr = rawText;
    const fenceMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim();
    } else {
      const objMatch = rawText.match(/\{[^}]*\}/);
      if (objMatch) jsonStr = objMatch[0].trim();
    }
    json = JSON.parse(jsonStr);

    if (json.action === 'moderate') {
      return {
        shouldModerate: true,
        reason: (json.reason as string) || `${totalReportCount} şikayet: AI moderasyona aldı`,
        severity: (json.severity as ReportEvaluationResult['severity']) || 'medium',
        confidence: typeof json.confidence === 'number' ? json.confidence : 0.5,
      };
    }

    // dismiss
    return {
      shouldModerate: false,
      reason: (json.reason as string) || `${totalReportCount} şikayet incelendi: İhlal bulunamadı`,
      severity: null,
      confidence: typeof json.confidence === 'number' ? json.confidence : 0.5,
    };
  } catch {
    // Fail-safe: send to moderation on error
    return {
      shouldModerate: true,
      reason: 'AI değerlendirme hatası, insan moderasyonu gerekli',
      severity: 'low',
      confidence: 0,
    };
  }
}
