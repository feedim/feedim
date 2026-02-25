// Evrensel SEO Anahtar Kelime Algoritması v4 — Toplamalı Puanlama
// Yapısal kaynaklar (title, slug, tag, bold, heading, caption) → n-gram adaylar → toplamalı puan → zone çarpanı → filtre → sırala
// v4: Suffix stripping kaldırıldı, tek yönlü prefix-aware eşleşme, kademesiz zone çarpanı.

// ─── Dil Tipleri ───

type Lang = "tr" | "en" | "de" | "fr" | "es" | "pt" | "it" | "nl" | "ru" | "ar" | "other";

// ─── Dil Tespiti (Probe Words) ───

const PROBE_WORDS: Record<Exclude<Lang, "other">, string[]> = {
  tr: ["ve", "bir", "bu", "için", "ile", "olan", "gibi", "daha", "çok", "olarak"],
  en: ["the", "and", "is", "of", "to", "in", "that", "it", "for", "was"],
  de: ["und", "der", "die", "das", "ist", "ein", "nicht", "mit", "auf", "auch"],
  fr: ["le", "la", "les", "de", "et", "un", "une", "est", "des", "en"],
  es: ["el", "la", "de", "en", "que", "los", "las", "del", "una", "por"],
  pt: ["de", "que", "em", "um", "uma", "os", "do", "da", "no", "na"],
  it: ["il", "la", "di", "che", "un", "una", "del", "della", "per", "con"],
  nl: ["de", "het", "een", "van", "en", "in", "is", "dat", "op", "met"],
  ru: ["и", "в", "не", "на", "что", "он", "как", "это", "она", "по"],
  ar: ["في", "من", "على", "إلى", "هذا", "أن", "هو", "التي", "التي", "ما"],
};

function detectLanguage(text: string): Lang {
  if (/[\u0400-\u04FF]/.test(text)) return "ru";
  if (/[\u0600-\u06FF]/.test(text)) return "ar";

  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .split(/\s+/)
    .slice(0, 200);

  if (words.length === 0) return "other";

  const wordSet = new Set(words);
  let bestLang: Lang = "other";
  let bestCount = 0;

  for (const [lang, probes] of Object.entries(PROBE_WORDS) as [Exclude<Lang, "other">, string[]][]) {
    let count = 0;
    for (const p of probes) {
      if (wordSet.has(p)) count++;
    }
    if (count > bestCount) {
      bestCount = count;
      bestLang = lang;
    }
  }

  return bestCount >= 2 ? bestLang : "other";
}

// ─── Çoklu Dil Stop Words ───

const STOP_WORDS_RAW: Record<Exclude<Lang, "other">, string> = {
  tr: "ve,veya,ile,ama,fakat,ancak,lakin,hem,ya,ne,ki,de,da,ben,sen,biz,siz,onlar,bu,şu,bunlar,şunlar,kendi,hep,herkes,için,gibi,kadar,göre,karşı,doğru,üzere,rağmen,sonra,önce,arasında,boyunca,dolayı,beri,dek,üzerinde,altında,içinde,dışında,bir,daha,çok,en,bile,sadece,yalnız,hala,henüz,artık,zaten,belki,hemen,oldukça,hiç,pek,gayet,biraz,aslında,var,yok,olan,olmak,olarak,olup,olduğu,olduğunu,ise,iken,olsa,olabilir,olur,olmaz,olmuş,olacak,etmek,etmekte,edilmek,yapmak,yapılmak,eder,etti,edilen,mi,mu,mı,mü,neden,nasıl,nerede,hangi,kim,kime,tüm,bütün,her,bazı,birçok,birkaç,hiçbir,diğer,aynı,böyle,şöyle,öyle,burada,orada,şimdi,gelen,giden,yapan,eden,alan,veren,yani,çünkü,oysa,halbuki,az,tam,gerçekten,kesinlikle,o,onu,ona,bunu,buna,bunun,den,dan,nin,nın,mış,miş",
  en: "the,and,is,of,to,in,that,it,for,was,on,are,with,this,from,or,not,but,have,an,they,be,which,their,will,about,each,she,do,some,what,there,can,all,has,had,one,our,out,you,been,its,who,how,than,when,would,make,more,very,after,also,did,many,into,other,then,could,these,two,may,my,over,such,new,most,only,just,any,much,where,being,those,get,well,back,your,through,us,his,her,him,no,we,me,up,so,if,at,by,as",
  de: "und,der,die,das,ist,ein,nicht,mit,auf,auch,sich,es,von,den,dem,zu,für,in,ich,wir,sie,er,aber,wie,an,aus,bei,nach,über,noch,dann,nur,wenn,oder,bis,doch,schon,sehr,hier,kann,hat,war,werden,sind,mehr,als,kein,diese,so,dass,einem,einer,einen,eines,zum,zur,vom,im,am,um,was,wird",
  fr: "le,la,les,de,et,un,une,est,des,en,du,que,qui,dans,ce,il,pas,ne,sur,se,au,par,plus,sont,son,avec,mais,pour,tout,elle,nous,vous,ont,ses,ces,aux,sa,cette,ou,leur,tous,comme,bien,aussi,entre,donc,fait,même,après,autre,encore,sous,alors,quand,être,avoir,très,peu",
  es: "el,la,de,en,que,los,las,del,una,por,con,no,es,un,se,al,lo,su,más,pero,sus,le,ya,fue,este,ha,muy,para,como,sin,sobre,también,todo,ser,son,entre,cuando,esta,uno,dos,hay,otro,era,puede,todos,así,nos,ni,parte,tiene,desde,donde",
  pt: "de,que,em,um,uma,os,do,da,no,na,se,por,com,para,ao,mais,mas,como,dos,das,foi,são,seu,sua,tem,este,ser,quando,muito,nos,já,também,só,pelo,pela,até,isso,ele,ela,entre,depois,sem,mesmo,aos,seus,quem,nas,bem,pode,todos,essa,num,nem,suas,dois",
  it: "il,la,di,che,un,una,del,della,per,con,non,sono,in,lo,si,da,come,questo,anche,più,al,ma,su,le,dei,delle,gli,se,alla,nella,sul,dopo,tutto,ancora,solo,molto,ha,essere,ci,tra,fra,suo,loro,quando,dove,ogni,altri,poco,cui,così,già,quella,questi",
  nl: "de,het,een,van,en,in,is,dat,op,met,voor,zijn,er,niet,aan,ook,maar,naar,als,nog,wordt,door,bij,dit,was,te,uit,om,meer,kan,worden,zo,over,al,heeft,hun,wel,geen,moet,tot,dan,zou,alle,deze,veel,toch,omdat,hem,haar,waren,tussen",
  ru: "и,в,не,на,что,он,как,это,она,по,но,из,за,его,все,то,так,же,от,бы,мне,уже,для,вы,ты,мы,да,нет,был,они,быть,их,или,до,когда,вот,этот,тот,если,чем,где,при,еще,без,между,них,свой,ему,ней,тогда,ее,себя,какой,которые",
  ar: "في,من,على,إلى,هذا,أن,هو,التي,الذي,ما,لا,هي,هذه,كان,قد,عن,مع,كل,بين,ذلك,أو,بعد,عند,لم,إن,هل,حتى,لها,له,كما,منذ,أي,ثم,غير,فقط,لكن,نحن,أنت,تلك,فيها,عليه,أنه,بها,أكثر,كانت,قبل,وقد,سوف,يكون",
};

const STOP_WORDS_CACHE = new Map<string, Set<string>>();

function getStopWords(lang: Lang): Set<string> {
  if (lang === "other") return new Set();
  const cached = STOP_WORDS_CACHE.get(lang);
  if (cached) return cached;
  const set = new Set(STOP_WORDS_RAW[lang].split(","));
  STOP_WORDS_CACHE.set(lang, set);
  return set;
}

// ─── Yıl Filtreleme ───

function stripYears(text: string): string {
  return text.replace(/\b(19|20)\d{2}\b/g, "").replace(/\s+/g, " ").trim();
}

// ─── HTML Entity Decode ───

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ");
}

// ─── 9-Zone HTML Parsing ───

interface ParsedZones {
  headings: string[];
  boldTexts: string[];
  italicTexts: string[];
  anchorTexts: string[];
  imageAlts: string[];
  listItems: string[];
  captions: string[];
  firstParagraph: string;
  plainText: string;
}

function parseZones(html: string): ParsedZones {
  const headings: string[] = [];
  const boldTexts: string[] = [];
  const italicTexts: string[] = [];
  const anchorTexts: string[] = [];
  const imageAlts: string[] = [];
  const listItems: string[] = [];
  let firstParagraph = "";

  let match;

  const headingRegex = /<h[23][^>]*>(.*?)<\/h[23]>/gi;
  while ((match = headingRegex.exec(html)) !== null) {
    const text = match[1].replace(/<[^>]+>/g, "").trim();
    if (text) headings.push(decodeHtmlEntities(text));
  }

  const boldRegex = /<(strong|b)(?:\s[^>]*)?>(.+?)<\/\1>/gi;
  while ((match = boldRegex.exec(html)) !== null) {
    const text = match[2].replace(/<[^>]+>/g, "").trim();
    if (text && text.length >= 2) boldTexts.push(decodeHtmlEntities(text));
  }

  const italicRegex = /<(em|i)(?:\s[^>]*)?>(.+?)<\/\1>/gi;
  while ((match = italicRegex.exec(html)) !== null) {
    const text = match[2].replace(/<[^>]+>/g, "").trim();
    if (text && text.length >= 2) italicTexts.push(decodeHtmlEntities(text));
  }

  const anchorRegex = /<a\s[^>]*>(.*?)<\/a>/gi;
  while ((match = anchorRegex.exec(html)) !== null) {
    const text = match[1].replace(/<[^>]+>/g, "").trim();
    if (text && text.length >= 2) anchorTexts.push(decodeHtmlEntities(text));
  }

  const imgRegex = /<img\s[^>]*alt=["']([^"']+)["'][^>]*>/gi;
  while ((match = imgRegex.exec(html)) !== null) {
    const text = match[1].trim();
    if (text && text.length >= 2) imageAlts.push(decodeHtmlEntities(text));
  }

  const liRegex = /<li[^>]*>(.*?)<\/li>/gi;
  while ((match = liRegex.exec(html)) !== null) {
    const text = match[1].replace(/<[^>]+>/g, "").trim();
    if (text && text.length >= 2) listItems.push(decodeHtmlEntities(text));
  }

  const pRegex = /<p[^>]*>(.*?)<\/p>/gi;
  while ((match = pRegex.exec(html)) !== null) {
    const text = match[1].replace(/<[^>]+>/g, "").trim();
    if (text.length >= 20) {
      firstParagraph = decodeHtmlEntities(text);
      break;
    }
  }

  const plainText = decodeHtmlEntities(
    html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  );

  // Figcaption
  const captionRegex = /<figcaption[^>]*>(.*?)<\/figcaption>/gi;
  const captions: string[] = [];
  while ((match = captionRegex.exec(html)) !== null) {
    const text = match[1].replace(/<[^>]+>/g, "").trim();
    if (text && text.length >= 2) captions.push(decodeHtmlEntities(text));
  }

  return { headings, boldTexts, italicTexts, anchorTexts, imageAlts, listItems, captions, firstParagraph, plainText };
}

// ─── Unicode-aware Tokenization ───

function tokenize(text: string, lang: Lang): string[] {
  const lower = lang === "tr" ? text.toLocaleLowerCase("tr-TR") : text.toLowerCase();
  return lower
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .split(/\s+/)
    .filter(w => w.length >= 2);
}

// ─── Meta Title ───

export function generateMetaTitle(title: string, _html: string): string {
  const trimmed = title.trim();
  if (trimmed.length <= 60) return trimmed;
  const cut = trimmed.slice(0, 57);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 30 ? cut.slice(0, lastSpace) : cut) + "...";
}

// ─── Meta Description ───

const DESCRIPTION_SUFFIX: Partial<Record<Lang, string>> = {
  tr: " hakkında gönderi",
  en: " - article",
  de: " - Artikel",
  fr: " - article",
  es: " - artículo",
  pt: " - artigo",
  it: " - articolo",
  nl: " - artikel",
  ru: " - статья",
  ar: " - مقال",
};

export function generateMetaDescription(title: string, html: string): string {
  const { firstParagraph, plainText } = parseZones(html);

  if (firstParagraph) {
    if (firstParagraph.length >= 120 && firstParagraph.length <= 155) {
      return firstParagraph;
    }
    if (firstParagraph.length > 155) {
      const cut = firstParagraph.slice(0, 152);
      const lastSpace = cut.lastIndexOf(" ");
      return (lastSpace > 100 ? cut.slice(0, lastSpace) : cut) + "...";
    }
    let extended = firstParagraph;
    const pRegex = /<p[^>]*>(.*?)<\/p>/gi;
    let match;
    let foundFirst = false;
    while ((match = pRegex.exec(html)) !== null) {
      const text = match[1].replace(/<[^>]+>/g, "").trim();
      if (text.length >= 20) {
        if (!foundFirst) { foundFirst = true; continue; }
        const addition = decodeHtmlEntities(text);
        const combined = extended + " " + addition;
        if (combined.length <= 155) {
          extended = combined;
        } else {
          const cut = combined.slice(0, 152);
          const lastSpace = cut.lastIndexOf(" ");
          extended = (lastSpace > extended.length ? cut.slice(0, lastSpace) : cut) + "...";
        }
        break;
      }
    }
    return extended;
  }

  if (plainText.length > 20) {
    if (plainText.length <= 155) return plainText;
    const cut = plainText.slice(0, 152);
    const lastSpace = cut.lastIndexOf(" ");
    return (lastSpace > 100 ? cut.slice(0, lastSpace) : cut) + "...";
  }

  const lang = detectLanguage(title);
  const suffix = DESCRIPTION_SUFFIX[lang] || "";
  const fallback = `${title}${suffix}`;
  return fallback.length <= 155 ? fallback : fallback.slice(0, 152) + "...";
}

// ─── Meta Keywords v4 (Toplamalı Puanlama) ───

interface KeywordOptions {
  slug?: string;
  tags?: string[];
}

// ─── Metin Temizleme ───

function cleanText(text: string, lang: Lang): string {
  let s = decodeHtmlEntities(text);
  s = lang === "tr" ? s.replace(/İ/g, "i").replace(/I/g, "ı").toLocaleLowerCase("tr-TR") : s.toLowerCase();
  s = s.replace(/[''ʼ`]/g, " ");
  s = stripYears(s);
  s = s.replace(/["'…–—.,!?():;/\\""„‟]/g, "");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

// ─── Kelime Frekansı Hesaplama ───

function countSubstring(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let pos = 0;
  while ((pos = haystack.indexOf(needle, pos)) !== -1) {
    count++;
    pos += 1;
  }
  return count;
}

function wordCount(s: string): number {
  return s.split(/\s+/).filter(w => w.length > 0).length;
}

// ─── TR Sentence Case (Final Output) ───

function toSentenceCaseTR(phrase: string, lang: Lang): string {
  if (!phrase) return phrase;
  if (lang !== "tr") {
    return phrase.charAt(0).toUpperCase() + phrase.slice(1).toLowerCase();
  }
  const lower = phrase.toLocaleLowerCase("tr-TR");
  const first = lower.charAt(0)
    .replace("i", "İ")
    .replace("ı", "I");
  const rest = lower.slice(1);
  return first.toLocaleUpperCase("tr-TR") + rest;
}

// ─── Prefix-Aware Tek Yönlü Eşleşme ───
// Sol sınır: kelime başı kontrolü (non-word char veya string başı)
// Sağ sınır: açık — Türkçe ek takısı doğal eşleşir

function phraseMatchesInText(text: string, phrase: string): boolean {
  if (!phrase || !text) return false;
  let pos = 0;
  while ((pos = text.indexOf(phrase, pos)) !== -1) {
    const leftOk = pos === 0 || !/[\p{L}\p{N}]/u.test(text[pos - 1]);
    if (leftOk) return true;
    pos += 1;
  }
  return false;
}

// Prefix-aware frekans sayacı
function countPhraseInText(text: string, phrase: string): number {
  if (!phrase || !text) return 0;
  let count = 0;
  let pos = 0;
  while ((pos = text.indexOf(phrase, pos)) !== -1) {
    const leftOk = pos === 0 || !/[\p{L}\p{N}]/u.test(text[pos - 1]);
    if (leftOk) count++;
    pos += 1;
  }
  return count;
}

// ─── N-gram Üretici ───

function generateNgrams(text: string, minN: number, maxN: number, stopWords: Set<string>): string[] {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  if (words.length < minN) return [];
  const effectiveMax = Math.min(maxN, words.length);
  const grams: string[] = [];
  for (let n = minN; n <= effectiveMax; n++) {
    for (let i = 0; i <= words.length - n; i++) {
      const slice = words.slice(i, i + n);
      if (slice.every(w => stopWords.has(w))) continue;
      if (slice.some(w => w.length < 2)) continue;
      // Kenar stop word filtresi: ilk/son kelime bağlaç/stop word ise aday olamaz
      if (stopWords.has(slice[0]) || stopWords.has(slice[slice.length - 1])) continue;
      const phrase = slice.join(" ");
      if (phrase.length < 4) continue;
      grams.push(phrase);
    }
  }
  return grams;
}

// ─── Body Yüksek Frekanslı İfadeler (2-3 kelime, 3+ tekrar) ───

function bodyHighFreqPhrases(bodyC: string, stopWords: Set<string>): string[] {
  const words = bodyC.split(/\s+/).filter(w => w.length > 0);
  const freqMap = new Map<string, number>();

  for (let n = 2; n <= 3; n++) {
    for (let i = 0; i <= words.length - n; i++) {
      const slice = words.slice(i, i + n);
      if (slice.every(w => stopWords.has(w))) continue;
      if (slice.some(w => w.length < 2)) continue;
      // Kenar stop word filtresi
      if (stopWords.has(slice[0]) || stopWords.has(slice[slice.length - 1])) continue;
      const phrase = slice.join(" ");
      if (phrase.length < 4) continue;
      freqMap.set(phrase, (freqMap.get(phrase) || 0) + 1);
    }
  }

  return Array.from(freqMap.entries())
    .filter(([, freq]) => freq >= 3)
    .map(([phrase]) => phrase);
}

// ─── Dinamik Metadata Label Tespiti ───
// plainText'teki tekrar eden "X:" pattern'lerini tespit eder
// Listicle metadata'sını (Yayın Tarihi, Tür, IMDb vb.) dinamik olarak filtreler
// Sabit blocklist YOK — tamamen içerikten algoritmik tespit

function detectRepeatedLabels(plainText: string, lang: Lang): Set<string> {
  const counts = new Map<string, number>();
  // "Word:" pattern'i — harfle başlayan kelime, ardından ":"
  const regex = /([\p{L}][\p{L}\p{N}]*)\s*:/gu;
  let match;
  while ((match = regex.exec(plainText)) !== null) {
    const raw = match[1];
    if (raw.length < 2 || raw.length > 25) continue;
    const normalized = lang === "tr"
      ? raw.replace(/İ/g, "i").replace(/I/g, "ı").toLocaleLowerCase("tr-TR")
      : raw.toLowerCase();
    counts.set(normalized, (counts.get(normalized) || 0) + 1);
  }

  const labels = new Set<string>();
  for (const [label, count] of counts) {
    if (count >= 3) labels.add(label);
  }
  return labels;
}

// Label kontaminasyon kontrolü: adayın herhangi bir kelimesi tekrar eden label mi?
function isContaminatedByLabel(cand: string, labels: Set<string>): boolean {
  if (labels.size === 0) return false;
  const candWords = cand.split(/\s+/);
  for (const label of labels) {
    if (candWords.includes(label)) return true;
  }
  return false;
}

// ─── Orijinal Form Kurtarma ───
// Position-mapping yaklaşımı: her karakteri tek tek lower ederek
// lowered→original indeks haritası kurar. İ→i̇ gibi karakter genişlemelerinde
// bile doğru orijinal dilimi döndürür.

function recoverOriginalForm(phrase: string, original: string, lang: Lang): string {
  const src = original.normalize("NFC");
  const lowerChars: string[] = [];
  const mapToOrig: number[] = []; // lowerChars[i] → src içindeki UTF-16 pozisyon

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    let low: string;
    if (lang === "tr") {
      if (ch === "\u0130") low = "i";       // İ → i (genişleme yok)
      else if (ch === "I") low = "\u0131";   // I → ı
      else low = ch.toLocaleLowerCase("tr-TR");
    } else {
      low = ch.toLowerCase();
    }
    for (let j = 0; j < low.length; j++) {
      lowerChars.push(low[j]);
      mapToOrig.push(i);
    }
  }

  const lowerStr = lowerChars.join("");
  const idx = lowerStr.indexOf(phrase);
  if (idx === -1) return phrase;

  const origStart = mapToOrig[idx];
  const afterEnd = idx + phrase.length;
  const origEnd = afterEnd < lowerStr.length
    ? mapToOrig[afterEnd]
    : src.length;

  return src.slice(origStart, origEnd);
}

// ─── ASCII Normalizasyon (Slug Eşleşme) ───
// Türkçe slug'lar ASCII olur (ı→i, ö→o vb.) — adayları da normalize edip eşleştiriyoruz

function toAsciiLower(text: string): string {
  return text
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// ─── Keyword Candidate Interface ───

interface KeywordCandidate {
  phrase: string;
  score: number;
  zones: Set<string>;
  bodyFreq: number;
}

// ─── Ana Anahtar Kelime Üretici ───

export function generateMetaKeywords(title: string, html: string, options?: KeywordOptions): string {
  const zones = parseZones(html);
  const fullText = title + " " + zones.plainText;
  const lang = detectLanguage(fullText);
  const stopWords = getStopWords(lang);

  // ─── Dinamik Metadata Label Tespiti ───
  const metadataLabels = detectRepeatedLabels(zones.plainText, lang);

  // ─── Temizlenmiş Veriler ───
  const titleC = cleanText(title, lang);
  const bodyC = cleanText(zones.plainText, lang);
  const leadC = cleanText(zones.plainText.slice(0, 1500), lang);
  const firstParaC = zones.firstParagraph ? cleanText(zones.firstParagraph, lang) : "";

  // Title ":" sınırına göre segment'lere ayır — çapraz n-gram üretimini önler
  const titleSegmentsC = title
    .split(/\s*[:—–|]\s*/)
    .map(s => cleanText(s, lang))
    .filter(s => s.trim().length > 0);

  // Title kelime seti (stop words hariç) — partial anchor ve overlap bonusu için
  const titleWordSet = new Set(
    titleC.split(/\s+/).filter(w => w.length >= 2 && !stopWords.has(w))
  );

  const slugRaw = options?.slug || "";
  const slugC = slugRaw
    ? cleanText(slugRaw.replace(/-[a-z0-9]{4,8}$/, "").replace(/-/g, " "), lang)
    : "";
  const tagsC = (options?.tags || []).map(t => cleanText(t, lang)).filter(t => t.length > 0);

  const boldCleaned = zones.boldTexts.map(b => cleanText(b, lang));
  const headingCleaned = zones.headings.map(h => cleanText(h, lang));
  const captionCleaned = zones.captions.map(c => cleanText(c, lang));

  // ─── Aday Üretimi ───
  const candidateSet = new Set<string>();

  // Title n-gramları (2-5 kelime) — segment bazlı, ":" sınırını aşmaz
  for (const segC of titleSegmentsC) {
    for (const ng of generateNgrams(segC, 2, 5, stopWords)) candidateSet.add(ng);
  }

  // Slug n-gramları (2-5 kelime)
  if (slugC) {
    for (const ng of generateNgrams(slugC, 2, 5, stopWords)) candidateSet.add(ng);
  }

  // Tag'ler (çok kelimeli ise)
  for (const tag of tagsC) {
    if (wordCount(tag) >= 2) candidateSet.add(tag);
  }

  // Tag çapraz çarpımı — "netflix" + "zombi dizileri" → "netflix zombi dizileri"
  const tagComboCandidates = new Set<string>();
  for (let i = 0; i < tagsC.length; i++) {
    for (let j = i + 1; j < tagsC.length; j++) {
      // Kısa tag önce (qualifier + topic doğal sıra)
      const [first, second] = wordCount(tagsC[i]) <= wordCount(tagsC[j])
        ? [tagsC[i], tagsC[j]]
        : [tagsC[j], tagsC[i]];
      const combined = first + " " + second;
      const wc = wordCount(combined);
      if (wc < 2 || wc > 4) continue;
      const words = combined.split(/\s+/);
      if (stopWords.has(words[0]) || stopWords.has(words[words.length - 1])) continue;
      if (wc >= 3 && words.slice(1, -1).some(w => stopWords.has(w))) continue;
      tagComboCandidates.add(combined);
      candidateSet.add(combined);
    }
  }

  // Heading n-gramları (2-5 kelime)
  for (const heading of headingCleaned) {
    for (const ng of generateNgrams(heading, 2, 5, stopWords)) candidateSet.add(ng);
  }

  // Bold ifade n-gramları (2-4 kelime)
  for (const bold of boldCleaned) {
    for (const ng of generateNgrams(bold, 2, 4, stopWords)) candidateSet.add(ng);
  }

  // Caption n-gramları (2-4 kelime)
  for (const caption of captionCleaned) {
    for (const ng of generateNgrams(caption, 2, 4, stopWords)) candidateSet.add(ng);
  }

  // İlk paragraf n-gramları (2-4 kelime) — doğal konu ifadelerini yakalar
  if (firstParaC) {
    for (const ng of generateNgrams(firstParaC, 2, 4, stopWords)) candidateSet.add(ng);
  }

  // Body yüksek frekanslı ifadeler (2-3 kelime, 3+ tekrar)
  for (const phrase of bodyHighFreqPhrases(bodyC, stopWords)) candidateSet.add(phrase);

  // ─── Puanlama ───
  const scored: KeywordCandidate[] = [];

  for (const cand of candidateSet) {
    // Kenar stop word filtresi (catch-all — tag'ler dahil tüm kaynaklara uygulanır)
    const candWords = cand.split(/\s+/);
    if (stopWords.has(candWords[0]) || stopWords.has(candWords[candWords.length - 1])) continue;

    // İç stop word/bağlaç filtresi (3+ kelimeli adaylar)
    // "taht oyunları ve saray" veya "kraliyet temalı en iyi anime" gibi
    // iç kısımda stop word/bağlaç bulunan ifadeler aday olamaz
    if (candWords.length >= 3) {
      const interior = candWords.slice(1, -1);
      if (interior.some(w => stopWords.has(w))) continue;
    }

    let score = 0;
    const zoneSet = new Set<string>();

    // Title'da geçiyor (+100) — segment bazlı, ":" sınırını aşan eşleşme yok
    const inTitle = titleSegmentsC.some(seg => phraseMatchesInText(seg, cand));
    if (inTitle) {
      score += 100;
      zoneSet.add("title");
    }

    // Slug'da geçiyor (+80) — ASCII normalizasyon ile Türkçe slug uyumu
    if (slugC && phraseMatchesInText(toAsciiLower(slugC), toAsciiLower(cand))) {
      score += 80;
      zoneSet.add("slug");
    }

    // Tag ile eşleşiyor (+60)
    for (const tag of tagsC) {
      if (phraseMatchesInText(tag, cand)) {
        score += 60;
        zoneSet.add("tag");
        break;
      }
    }

    // Tag combo ters eşleşme: cand içinde tag var mı?
    if (!zoneSet.has("tag") && tagComboCandidates.has(cand)) {
      for (const tag of tagsC) {
        if (phraseMatchesInText(cand, tag)) {
          score += 60;
          zoneSet.add("tag");
          break;
        }
      }
    }

    // Heading'de geçiyor (+35)
    for (const heading of headingCleaned) {
      if (phraseMatchesInText(heading, cand)) {
        score += 35;
        zoneSet.add("heading");
        break;
      }
    }

    // Bold'da geçiyor (+25)
    for (const bold of boldCleaned) {
      if (phraseMatchesInText(bold, cand)) {
        score += 25;
        zoneSet.add("bold");
        break;
      }
    }

    // Caption'da geçiyor (+20)
    for (const caption of captionCleaned) {
      if (phraseMatchesInText(caption, cand)) {
        score += 20;
        zoneSet.add("caption");
        break;
      }
    }

    // Body frekansı (+log2(freq+1) × 30, max 150)
    const bodyFreq = countPhraseInText(bodyC, cand);
    if (bodyFreq > 0) {
      score += Math.min(150, Math.log2(bodyFreq + 1) * 30);
    }

    // Lead'de (ilk 1500 char) (+25)
    if (phraseMatchesInText(leadC, cand)) {
      score += 25;
      zoneSet.add("lead");
    }

    // İlk paragrafta (+15)
    if (firstParaC && phraseMatchesInText(firstParaC, cand)) {
      score += 15;
      zoneSet.add("first_para");
    }

    // ─── Title Kelime Örtüşmesi ───
    // Adayın kelimelerinin title kelimeleriyle prefix-aware eşleşme oranı
    const contentWords = candWords.filter(w => !stopWords.has(w));
    let titleOverlapCount = 0;
    for (const cw of contentWords) {
      for (const tw of titleWordSet) {
        if (cw === tw || cw.startsWith(tw) || tw.startsWith(cw)) {
          titleOverlapCount++;
          break;
        }
      }
    }

    // Title word overlap bonusu (title zone yoksa — çifte sayım önlenir)
    // Oran bazlı: kısa odaklı ifadeler (100% overlap) daha çok bonus alır
    if (!zoneSet.has("title") && titleOverlapCount > 0) {
      const overlapRatio = contentWords.length > 0 ? titleOverlapCount / contentWords.length : 0;
      score += Math.round(overlapRatio * 80);
    }

    // ─── Minimum Eşik ───
    // Anchor zone = title, slug veya tag tam ifade eşleşmesi
    const hasAnchor = zoneSet.has("title") || zoneSet.has("slug") || zoneSet.has("tag");
    // Partial anchor = title kelimelerinin >50%'si adayda var (prefix-aware)
    const hasPartialAnchor = !hasAnchor && contentWords.length > 0
      && titleOverlapCount / contentWords.length > 0.5;

    if (hasAnchor) {
      // Tag combo: kullanıcı her iki tag'i de koymuş → her zaman geçerli
      if (!tagComboCandidates.has(cand) && zoneSet.size < 2 && bodyFreq < 3) continue;
    } else if (hasPartialAnchor) {
      // Partial anchor: title kelimesi çoğunlukta, daha düşük eşik
      if (isContaminatedByLabel(cand, metadataLabels)) continue;
      if (zoneSet.size < 2 && bodyFreq < 3) continue;
    } else {
      // Anchor yoksa: metadata label kontaminasyonu → her zaman filtrele
      if (isContaminatedByLabel(cand, metadataLabels)) continue;
      // Gerçek içerik tekrarı gerekli (listicle item isimlerini filtreler)
      if (bodyFreq < 5) continue;
    }

    // ─── Zone Çarpanı (Tek Kere, Kademesiz) ───
    const zoneCount = zoneSet.size;
    let multiplier: number;
    if (zoneCount >= 5) multiplier = 1.5;
    else if (zoneCount === 4) multiplier = 1.3;
    else if (zoneCount === 3) multiplier = 1.1;
    else if (zoneCount === 2) multiplier = 1.0;
    else if (tagComboCandidates.has(cand)) multiplier = 1.0;
    else multiplier = 0.5; // 0 veya 1 zone (body-only path)

    score *= multiplier;

    scored.push({ phrase: cand, score, zones: zoneSet, bodyFreq });
  }

  // ─── Fallback ───
  if (scored.length === 0) {
    return toSentenceCaseTR(titleC, lang) || title;
  }

  // Puana göre sırala (eşitlikte kısa ve odaklı ifade kazanır)
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return wordCount(a.phrase) - wordCount(b.phrase);
  });

  // İlk 12 aday al
  const top = scored.slice(0, 12);

  // Substring dedup: puanı yüksek olan kazanır, düşük puanlı çakışanlar atlanır
  // top zaten puana göre sıralı → önce seçilen her zaman daha yüksek puanlı

  // Tag-kaynaklı keyword: toplam 1 — combo tercih edilir (en kapsamlı)
  // Tag-kaynaklı = exact tag, tag combo, veya puanlamasında tag zone almış keyword

  // Tag combo varsa onu seç (daha kapsamlı), yoksa en iyi exact tag'i seç
  let chosenTagKeyword: string | null = null;
  for (const entry of top) {
    if (tagComboCandidates.has(entry.phrase)) {
      chosenTagKeyword = entry.phrase;
      break; // combo bulundu, en kapsamlı bu
    }
    if (tagsC.includes(entry.phrase) && !chosenTagKeyword) {
      chosenTagKeyword = entry.phrase; // fallback: ilk exact tag
    }
  }

  const selected: string[] = [];
  for (const entry of top) {
    // Zaten seçilmiş bir ifadenin alt-string'i mi?
    if (selected.some(sel => sel.includes(entry.phrase))) continue;
    // Zaten seçilmiş bir ifadenin üst-string'i mi? (seçilen tag keyword hariç)
    if (selected.some(sel => entry.phrase.includes(sel)) && entry.phrase !== chosenTagKeyword) continue;

    // Tag-kaynaklı mı? (exact tag, combo, veya tag zone'dan puan almış)
    const isTagDerived = tagsC.includes(entry.phrase)
      || tagComboCandidates.has(entry.phrase)
      || entry.zones.has("tag");

    // Tag-kaynaklı → sadece seçilen 1 keyword geçer
    if (isTagDerived && entry.phrase !== chosenTagKeyword) continue;
    selected.push(entry.phrase);
  }

  // Orijinal form kurtarma + TR sentence case
  const result = selected.slice(0, 8).map(p => {
    const recovered = recoverOriginalForm(p, zones.plainText, lang);
    return toSentenceCaseTR(recovered, lang);
  });

  return result.join(", ");
}

// ─── AI-Powered Keyword Selection (Claude Haiku) ───
// Algoritmik adaylar üretilir → Haiku en iyi tek anahtar kelimeyi seçer.

export async function generateMetaKeywordsAI(
  title: string,
  html: string,
  options?: KeywordOptions
): Promise<string> {
  const candidates = generateMetaKeywords(title, html, options);
  if (!candidates) return title;

  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 30,
      system: 'You are an SEO specialist. Given a post title and keyword candidates, pick the single best keyword phrase for SEO. Respond with ONLY the chosen keyword, nothing else.',
      messages: [{
        role: 'user',
        content: `Title: ${title}\nCandidates: ${candidates}`,
      }],
    });

    const chosen = response.content[0]?.type === 'text' ? response.content[0].text.trim() : '';
    if (chosen && chosen.length > 0 && chosen.length < 100) {
      return chosen;
    }
  } catch (err) {
    console.error('[SEO] Haiku keyword selection failed:', err);
  }

  return candidates.split(', ')[0] || title;
}

// ─── Zone Analysis Builder (AI Prompt Context) ───

function buildZoneAnalysis(
  title: string,
  html: string,
  lang: Lang,
  options?: KeywordOptions
): string {
  const zones = parseZones(html);
  const stopWords = getStopWords(lang);
  const lines: string[] = [];

  // Title keywords (non-stop)
  const titleTokens = tokenize(title, lang).filter(w => !stopWords.has(w));
  if (titleTokens.length > 0) {
    lines.push(`Title keywords: ${titleTokens.join(', ')}`);
  }

  // Tags
  if (options?.tags && options.tags.length > 0) {
    lines.push(`Tags: ${options.tags.join(', ')}`);
  }

  // First paragraph
  if (zones.firstParagraph) {
    const fp = zones.firstParagraph.length > 300
      ? zones.firstParagraph.slice(0, 300) + '...'
      : zones.firstParagraph;
    lines.push(`First paragraph: ${fp}`);
  }

  // Headings
  if (zones.headings.length > 0) {
    lines.push(`Headings: ${zones.headings.slice(0, 8).join(' | ')}`);
  }

  // Bold/emphasized
  if (zones.boldTexts.length > 0) {
    lines.push(`Bold/emphasized: ${zones.boldTexts.slice(0, 10).join(', ')}`);
  }

  // Italic
  if (zones.italicTexts.length > 0) {
    lines.push(`Italic: ${zones.italicTexts.slice(0, 5).join(', ')}`);
  }

  // Word frequency (top 12)
  const bodyC = cleanText(zones.plainText, lang);
  const wordFreq = new Map<string, number>();
  for (const w of bodyC.split(/\s+/)) {
    if (w.length >= 3 && !stopWords.has(w)) {
      wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
    }
  }
  const topWords = [...wordFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([w, c]) => `${w} (${c}x)`);
  if (topWords.length > 0) {
    lines.push(`Most frequent words: ${topWords.join(', ')}`);
  }

  return lines.join('\n');
}

// ─── Language Display Names ───

const LANG_DISPLAY: Record<Lang, string> = {
  tr: 'Turkish', en: 'English', de: 'German', fr: 'French',
  es: 'Spanish', pt: 'Portuguese', it: 'Italian', nl: 'Dutch',
  ru: 'Russian', ar: 'Arabic', other: 'the content language',
};

// ─── Combined AI SEO Fields (Single Haiku Call → keyword + description) ───

export interface SeoFields {
  keyword: string;
  description: string;
}

export async function generateSeoFieldsAI(
  title: string,
  html: string,
  options?: KeywordOptions
): Promise<SeoFields> {
  const fullText = title + ' ' + parseZones(html).plainText;
  const lang = detectLanguage(fullText);
  const langName = LANG_DISPLAY[lang];

  const candidates = generateMetaKeywords(title, html, options);
  const analysis = buildZoneAnalysis(title, html, lang, options);

  const fallbackKeyword = candidates ? candidates.split(', ')[0] : title;
  const fallbackDescription = generateMetaDescription(title, html);

  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 250,
      system: 'You are a professional SEO specialist. Generate SEO metadata for a social media post. Respond with ONLY valid JSON, no markdown, no explanation.',
      messages: [{
        role: 'user',
        content: `Title: ${title}\nLanguage: ${langName}\n\nContent Analysis:\n${analysis}\n\nKeyword Candidates:\n${candidates}\n\nGenerate:\n1. "keyword": Single best focus keyphrase (1-4 words). Pick from candidates or create from analysis.\n2. "description": Meta description in ${langName}. Max 155 characters. Simple clear language. Must include keyword naturally. Describe the post content. No site name.\n\n{"keyword":"...","description":"..."}`,
      }],
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text.trim() : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const keyword = typeof parsed.keyword === 'string' && parsed.keyword.trim().length > 0 && parsed.keyword.length < 100
        ? parsed.keyword.trim()
        : fallbackKeyword;
      let description = typeof parsed.description === 'string' && parsed.description.trim().length > 0
        ? parsed.description.trim()
        : fallbackDescription;

      // Enforce 155 char limit
      if (description.length > 155) {
        const cut = description.slice(0, 152);
        const lastSpace = cut.lastIndexOf(' ');
        description = (lastSpace > 100 ? cut.slice(0, lastSpace) : cut) + '...';
      }

      return { keyword, description };
    }
  } catch (err) {
    console.error('[SEO] AI SEO generation failed:', err);
  }

  return { keyword: fallbackKeyword, description: fallbackDescription };
}

// ─── Locale-Aware URL Utilities (SEO hreflang) ───

import { locales, defaultLocale } from "@/i18n/config";

const SEO_BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://feedim.com";

/** Build a full URL with locale prefix (no prefix for default locale) */
export function getLocalizedUrl(path: string, locale: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (locale === defaultLocale) return `${SEO_BASE_URL}${clean}`;
  return `${SEO_BASE_URL}/${locale}${clean}`;
}

/** Generate alternates.languages object for Next.js Metadata (includes x-default) */
export function getAlternateLanguages(path: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const locale of locales) {
    result[locale] = getLocalizedUrl(path, locale);
  }
  result["x-default"] = getLocalizedUrl(path, defaultLocale);
  return result;
}

/** Canonical URL for the given locale */
export function getCanonicalUrl(path: string, locale: string): string {
  return getLocalizedUrl(path, locale);
}

/** Add locale prefix to a path (for internal links in client components) */
export function localizedPath(path: string, locale: string): string {
  if (locale === defaultLocale) return path;
  return `/${locale}${path}`;
}
