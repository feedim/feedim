/**
 * Clipboard'dan gelen ham HTML'i Feedim editörüne uygun temiz HTML'e dönüştürür.
 * 3 katmanlı savunmanın 1. katmanı: yapıştırma anında temizlik.
 */

const ALLOWED_TAGS = new Set([
  "h2", "h3", "p", "br", "strong", "em", "u", "a", "img",
  "ul", "ol", "li", "blockquote", "hr",
  "table", "thead", "tbody", "tr", "th", "td",
  "figure", "figcaption",
]);

const REMOVE_WITH_CONTENT = new Set([
  "script", "style", "noscript", "iframe", "object", "embed",
  "form", "input", "button", "svg", "math", "canvas", "video", "audio",
]);

const BLOCK_TAGS = new Set([
  "p", "h2", "h3", "blockquote", "li", "td", "th", "figcaption",
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href"]),
  img: new Set(["src", "alt"]),
};

const JUNK_LINK_HREF_PATTERNS = [
  /facebook\.com\/sharer/i,
  /twitter\.com\/intent\/tweet/i,
  /api\.whatsapp\.com\/send/i,
  /linkedin\.com\/share/i,
  /telegram\.(me|org)\/share/i,
  /reddit\.com\/submit/i,
  /pinterest\./i,
  /#comments?$/i,
  /\/author\//i,
  /\/authors?\//i,
];

const JUNK_LINK_TEXT_PATTERNS = [
  /share on/i,
  /facebook/i,
  /twitter/i,
  /whatsapp/i,
  /google haberler/i,
  /abone ol/i,
  /subscribe/i,
  /yorumlar?/i,
  /comments?/i,
  /paylaş/i,
  /follow/i,
  /takip et/i,
];

const JUNK_IMAGE_PATTERNS = [
  /avatar/i,
  /profile/i,
  /profil/i,
  /logo/i,
  /icon/i,
  /share/i,
  /facebook/i,
  /twitter/i,
  /whatsapp/i,
  /google haberler/i,
  /abone/i,
  /subscribe/i,
  /comment/i,
  /yorum/i,
  /author/i,
  /yazar/i,
];

const SECTION_CUTOFF_PATTERNS = [
  /ilgili\s+içerikler/i,
  /bir\s+yanıt\s+yazın/i,
  /yorum\s+yapabilmek/i,
  /sosyal\s+medya/i,
  /you\s+may\s+also\s+like/i,
  /related\s+posts?/i,
  /related\s+content/i,
  /leave\s+a\s+reply/i,
  /follow\s+us/i,
];

export function sanitizePastedHTML(html: string, captionPlaceholder?: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const body = doc.body;

  // 1. Script/style/noscript/iframe/object/embed/form/input/button/svg kaldır (içerikle birlikte)
  REMOVE_WITH_CONTENT.forEach(tag => {
    body.querySelectorAll(tag).forEach(el => el.remove());
  });

  // 2. Yorum düğümlerini kaldır
  removeComments(body);

  // 5. <b> → <strong>, <i> → <em> dönüşümü (unwrap'tan önce yapılmalı)
  replaceTag(body, "b", "strong");
  replaceTag(body, "i", "em");

  // 6. Heading normalizasyonu: h1 → h2, h4/h5/h6 → h3
  replaceTag(body, "h1", "h2");
  replaceTag(body, "h4", "h3");
  replaceTag(body, "h5", "h3");
  replaceTag(body, "h6", "h3");

  // 3. İzin verilmeyen etiketleri unwrap et (içeriği koru)
  unwrapDisallowedTags(body);

  // 3b. Site chrome'u, sosyal paylaşım linkleri ve küçük avatar/ikon görselleri temizle
  pruneLikelyPastedChrome(body);

  // 3c. Makale dışı bölümleri kes
  trimAfterJunkSectionMarkers(body);

  // 4. Tüm class, style, id, data-* niteliklerini kaldır; sadece izin verilen nitelikler kalsın
  cleanAttributes(body);

  // 4b. Blok-seviye kuralları uygula (editör toolbar kısıtlamalarıyla uyumlu)
  enforceBlockRules(body);

  // 7. <a> temizliği — görseli saran linkleri kaldır
  body.querySelectorAll("a").forEach(a => {
    // Görsel içeren <a> etiketlerini unwrap et — görsellerde link olamaz
    if (a.querySelector("img")) {
      unwrapElement(a);
      return;
    }
    const href = a.getAttribute("href") || "";
    if (!href || /^(javascript|data):/i.test(href)) {
      unwrapElement(a);
      return;
    }
    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "noopener");
  });

  // 8. <img> temizliği — sadece http/https src kalsın, SVG ve küçük görseller kaldır
  body.querySelectorAll("img").forEach(img => {
    const src = img.getAttribute("src") || "";
    if (!src || /^data:/i.test(src) || !/^https?:\/\//i.test(src)) {
      img.remove();
      return;
    }
    // SVG kaynaklı görselleri kaldır (ikon/kategori görselleri)
    if (/\.svg(\?|$)/i.test(src)) {
      img.remove();
      return;
    }
    // Açıkça küçük boyutlu görselleri kaldır (avatar, ikon vb.)
    const w = parseInt(img.getAttribute("width") || "0", 10);
    const h = parseInt(img.getAttribute("height") || "0", 10);
    if ((w > 0 && w < 64) || (h > 0 && h < 64)) {
      img.remove();
      return;
    }
  });

  // 8b. <figure> → editör image-wrapper formatına dönüştür
  convertFiguresToImageWrappers(body, captionPlaceholder);

  // 8c. Tek başına gelen düz <img> bloklarını editör görsel bloğuna çevir
  convertStandaloneImagesToImageWrappers(body, captionPlaceholder);

  // 9. Boş blok elementleri kaldır (yalnızca <br> içerenler hariç)
  body.querySelectorAll("p, h2, h3, li, blockquote, figcaption").forEach(el => {
    if (!el.textContent?.trim() && !el.querySelector("br, img")) {
      el.remove();
    }
  });

  // 10. Ardışık <br> → paragraf ayırma
  collapseConsecutiveBrs(body);

  // 11. Doğrudan text node'ları <p> ile sar
  wrapOrphanTextNodes(body);

  // 11b. Geçersiz blok iç içeliklerini düzelt (ör: p > h2, p > div)
  normalizeInvalidBlockNesting(body);

  // 12. Ardışık boş paragrafları birleştir (2+ → tek)
  collapseEmptyParagraphs(body);

  // 13. Tablo temizliği + limit (max 6 sütun, max 20 satır)
  body.querySelectorAll("table").forEach(table => {
    table.querySelectorAll("colgroup, col, caption").forEach(el => el.remove());
    // Sütun limiti: max 6
    table.querySelectorAll("tr").forEach(tr => {
      const cells = Array.from(tr.children);
      if (cells.length > 6) cells.slice(6).forEach(c => c.remove());
    });
    // Satır limiti: max 20
    const allRows = Array.from(table.querySelectorAll("tr"));
    if (allRows.length > 20) allRows.slice(20).forEach(tr => tr.remove());
    // Boş hücrelere <br>
    table.querySelectorAll("td, th").forEach(cell => {
      if (!cell.textContent?.trim() && !cell.querySelector("br, img")) {
        cell.innerHTML = "<br>";
      }
    });
  });

  // 14. Son <p><br></p> kaldır
  const lastChild = body.lastElementChild;
  if (lastChild && lastChild.tagName === "P" && !lastChild.textContent?.trim()) {
    const onlyBr = lastChild.children.length === 1 && lastChild.children[0].tagName === "BR";
    const empty = lastChild.children.length === 0;
    if (onlyBr || empty) {
      lastChild.remove();
    }
  }

  return body.innerHTML.trim();
}

// --- Yardımcı fonksiyonlar ---

function removeComments(node: Node): void {
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_COMMENT);
  const comments: Comment[] = [];
  while (walker.nextNode()) comments.push(walker.currentNode as Comment);
  comments.forEach(c => c.remove());
}

function replaceTag(root: Element, oldTag: string, newTag: string): void {
  root.querySelectorAll(oldTag).forEach(el => {
    const replacement = document.createElement(newTag);
    while (el.firstChild) replacement.appendChild(el.firstChild);
    el.replaceWith(replacement);
  });
}

function unwrapElement(el: Element): void {
  while (el.firstChild) el.parentNode?.insertBefore(el.firstChild, el);
  el.remove();
}

function enforceBlockRules(root: Element): void {
  // 1. h2/h3: inline formatlama + link yasak → unwrap
  root.querySelectorAll("h2, h3").forEach(heading => {
    heading.querySelectorAll("strong, em, u, b, i, a").forEach(el => unwrapElement(el));
    heading.querySelectorAll("p, div, span").forEach(el => unwrapElement(el));
  });

  // 2. blockquote: inline formatlama + link yasak → unwrap
  root.querySelectorAll("blockquote").forEach(bq => {
    bq.querySelectorAll("strong, em, u, b, i, a").forEach(el => unwrapElement(el));
    bq.querySelectorAll("h2, h3").forEach(h => {
      const p = document.createElement("p");
      p.innerHTML = h.innerHTML;
      h.replaceWith(p);
    });
  });

  // 3. figcaption: sadece düz metin
  root.querySelectorAll("figcaption").forEach(fc => {
    fc.textContent = fc.textContent || "";
  });

  // 4. td/th: heading, liste, blockquote yasak
  root.querySelectorAll("td, th").forEach(cell => {
    cell.querySelectorAll("h2, h3").forEach(h => {
      while (h.firstChild) h.parentNode?.insertBefore(h.firstChild, h);
      h.remove();
    });
    cell.querySelectorAll("blockquote, ul, ol, li").forEach(el => unwrapElement(el));
  });

  // 5. li: heading + blockquote yasak
  root.querySelectorAll("li").forEach(li => {
    li.querySelectorAll("h2, h3").forEach(h => unwrapElement(h));
    li.querySelectorAll("blockquote").forEach(el => unwrapElement(el));
  });
}

function pruneLikelyPastedChrome(root: Element): void {
  root.querySelectorAll("img").forEach(img => {
    if (isLikelyJunkImage(img)) img.remove();
  });

  root.querySelectorAll("a").forEach(a => {
    if (isLikelyJunkLink(a)) a.remove();
  });

  root.querySelectorAll("p, div, li").forEach(el => {
    if (isLikelyChromeBlock(el)) el.remove();
  });

  removeThinLinkClusters(root);
}

function isLikelyJunkLink(a: Element): boolean {
  const href = (a.getAttribute("href") || "").trim();
  const text = (a.textContent || "").replace(/\s+/g, " ").trim();
  return JUNK_LINK_HREF_PATTERNS.some(pattern => pattern.test(href))
    || JUNK_LINK_TEXT_PATTERNS.some(pattern => pattern.test(text));
}

function isLikelyJunkImage(img: Element): boolean {
  const src = img.getAttribute("src") || "";
  const alt = img.getAttribute("alt") || "";
  const title = img.getAttribute("title") || "";
  const signature = `${src} ${alt} ${title}`;
  if (JUNK_IMAGE_PATTERNS.some(pattern => pattern.test(signature))) return true;
  return isExplicitlyTinyImage(img);
}

function isExplicitlyTinyImage(img: Element): boolean {
  const width = parseInt(img.getAttribute("width") || "0", 10);
  const height = parseInt(img.getAttribute("height") || "0", 10);
  const style = img.getAttribute("style") || "";
  const styleWidth = extractStylePx(style, "width");
  const styleHeight = extractStylePx(style, "height");
  const candidates = [width, height, styleWidth, styleHeight].filter(v => Number.isFinite(v) && v > 0);
  return candidates.some(v => v > 0 && v < 96);
}

function extractStylePx(style: string, prop: string): number {
  const match = style.match(new RegExp(`${prop}\\s*:\\s*(\\d+)px`, "i"));
  return match ? parseInt(match[1], 10) : 0;
}

function isLikelyChromeBlock(el: Element): boolean {
  if (el.querySelector("table, ul, ol, blockquote, h2, h3, figure")) return false;
  const links = el.querySelectorAll("a").length;
  const images = el.querySelectorAll("img").length;
  if (!links && !images) return false;

  const inlineOnly = Array.from(el.childNodes).every(node => {
    if (node.nodeType === Node.TEXT_NODE) return !node.textContent?.trim();
    if (node.nodeType !== Node.ELEMENT_NODE) return true;
    return ["A", "IMG", "BR", "EM", "STRONG", "SPAN"].includes((node as Element).tagName);
  });

  const text = (el.textContent || "").replace(/\s+/g, " ").trim();
  const hasSentenceLikeText = text.length >= 120 || /[.!?…:;]/.test(text);

  return inlineOnly && !hasSentenceLikeText && (links + images >= 2);
}

function trimAfterJunkSectionMarkers(root: Element): void {
  const children = Array.from(root.children);
  for (const child of children) {
    const text = (child.textContent || "").replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
    if (!text) continue;
    if (!SECTION_CUTOFF_PATTERNS.some(pattern => pattern.test(text))) continue;

    let current: Element | null = child;
    while (current) {
      const nextSibling: Element | null = current.nextElementSibling;
      current.remove();
      current = nextSibling;
    }
    break;
  }
}

function removeThinLinkClusters(root: Element): void {
  const children = Array.from(root.children);
  let substantiveSeen = false;

  for (const child of children) {
    if (isSubstantiveContentBlock(child)) {
      substantiveSeen = true;
      continue;
    }

    if (isThinLinkCluster(child, substantiveSeen)) {
      child.remove();
    }
  }
}

function isThinLinkCluster(el: Element, substantiveSeen: boolean): boolean {
  if (!["P", "DIV", "UL", "OL"].includes(el.tagName)) return false;
  const text = (el.textContent || "").replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
  const links = el.querySelectorAll("a").length;
  const images = el.querySelectorAll("img").length;

  if (!links && !images) return false;
  if (/kaynak:/i.test(text)) return false;
  if (SECTION_CUTOFF_PATTERNS.some(pattern => pattern.test(text))) return true;

  const onlyInlineish = Array.from(el.children).every(child =>
    ["A", "IMG", "EM", "STRONG", "SPAN", "BR", "LI"].includes(child.tagName)
  );

  if (!onlyInlineish) return false;

  // Baştaki kategori/meta linkleri veya sondaki footer navigasyonunu temizle.
  if (!substantiveSeen && text.length <= 48) return true;
  if (substantiveSeen && text.length <= 64 && (links >= 2 || images >= 1)) return true;
  return false;
}

function isSubstantiveContentBlock(el: Element): boolean {
  if (["FIGURE", "TABLE", "BLOCKQUOTE", "PRE"].includes(el.tagName)) return true;
  const text = (el.textContent || "").replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
  return text.length >= 120;
}

function unwrapDisallowedTags(root: Element): void {
  // Bottom-up: en derin elemanlardan başla
  const all = Array.from(root.querySelectorAll("*"));
  for (let i = all.length - 1; i >= 0; i--) {
    const el = all[i];
    const tag = el.tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      unwrapElement(el);
    }
  }
}

function cleanAttributes(root: Element): void {
  root.querySelectorAll("*").forEach(el => {
    const tag = el.tagName.toLowerCase();
    const allowed = ALLOWED_ATTRS[tag];
    const attrs = Array.from(el.attributes);
    for (const attr of attrs) {
      if (!allowed || !allowed.has(attr.name)) {
        el.removeAttribute(attr.name);
      }
    }
  });
}

function collapseConsecutiveBrs(root: Element): void {
  // Bir <p> veya blok içinde 2+ ardışık <br> varsa, paragraf böl
  const brs = Array.from(root.querySelectorAll("br"));
  for (const br of brs) {
    // Ardışık br'leri say
    let count = 1;
    let next = br.nextSibling;
    const extras: Node[] = [];
    while (next) {
      if (next.nodeType === Node.ELEMENT_NODE && (next as Element).tagName === "BR") {
        count++;
        extras.push(next);
        next = next.nextSibling;
      } else if (next.nodeType === Node.TEXT_NODE && !next.textContent?.trim()) {
        extras.push(next);
        next = next.nextSibling;
      } else {
        break;
      }
    }
    if (count >= 2) {
      // Fazla br'leri kaldır, sadece birini bırak
      extras.forEach(n => n.parentNode?.removeChild(n));
    }
  }
}

const INLINE_TAGS = new Set(["a", "strong", "em", "u", "br", "img"]);

function wrapOrphanTextNodes(root: Element): void {
  // Ardışık inline node'ları (text + a/strong/em/u/br) gruplayıp tek <p> ile sar
  const children = Array.from(root.childNodes);
  let group: Node[] = [];

  const flushGroup = () => {
    if (group.length === 0) return;
    // Sadece boşluktan oluşan grupları yoksay
    const hasContent = group.some(n =>
      n.nodeType === Node.ELEMENT_NODE || (n.textContent?.trim())
    );
    if (!hasContent) { group = []; return; }
    const p = document.createElement("p");
    const firstNode = group[0];
    firstNode.parentNode?.insertBefore(p, firstNode);
    for (const n of group) p.appendChild(n);
    group = [];
  };

  for (const node of children) {
    if (node.nodeType === Node.TEXT_NODE) {
      group.push(node);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = (node as Element).tagName.toLowerCase();
      if (INLINE_TAGS.has(tag)) {
        group.push(node);
      } else {
        flushGroup();
      }
    } else {
      group.push(node);
    }
  }
  flushGroup();
}

function normalizeInvalidBlockNesting(root: Element): void {
  const paragraphs = Array.from(root.querySelectorAll("p"));
  const blockTags = new Set(["H2", "H3", "H4", "DIV", "FIGURE", "TABLE", "BLOCKQUOTE", "UL", "OL", "PRE", "HR"]);

  paragraphs.forEach(paragraph => {
    const hasInvalidBlockChild = Array.from(paragraph.children).some(child => blockTags.has(child.tagName));
    if (!hasInvalidBlockChild) return;

    const fragment = document.createDocumentFragment();
    let buffer = document.createElement("p");

    const flushBuffer = () => {
      const text = (buffer.textContent || "").replace(/\u00A0/g, " ").trim();
      if (text || buffer.querySelector("img, br, a, strong, em, u, code, mark, sub, sup")) {
        fragment.appendChild(buffer);
      }
      buffer = document.createElement("p");
    };

    Array.from(paragraph.childNodes).forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE && blockTags.has((node as Element).tagName)) {
        flushBuffer();
        fragment.appendChild(node);
        return;
      }
      buffer.appendChild(node);
    });

    flushBuffer();
    paragraph.replaceWith(fragment);
  });
}

function collapseEmptyParagraphs(root: Element): void {
  const children = Array.from(root.children);
  let emptyCount = 0;
  for (const child of children) {
    if (child.tagName === "P" && !child.textContent?.trim() && !child.querySelector("img")) {
      emptyCount++;
      if (emptyCount > 1) child.remove();
    } else {
      emptyCount = 0;
    }
  }
}

function convertFiguresToImageWrappers(root: Element, captionPlaceholder?: string): void {
  root.querySelectorAll("figure").forEach(figure => {
    const img = figure.querySelector("img");
    if (!img) {
      // Görseli olmayan figure'ı unwrap et
      unwrapElement(figure);
      return;
    }

    // Tüm figcaption'lardan metin topla (birleştir)
    const figcaptions = Array.from(figure.querySelectorAll("figcaption"));
    let captionText = "";
    figcaptions.forEach(fc => {
      const text = (fc.textContent || "").replace(/\u00A0/g, " ").trim();
      if (text) captionText += (captionText ? " " : "") + text;
    });

    // image-wrapper oluştur
    const wrapper = document.createElement("div");
    wrapper.className = "image-wrapper";
    wrapper.setAttribute("contenteditable", "false");
    wrapper.appendChild(img.cloneNode(true));

    const caption = document.createElement("div");
    caption.className = "image-caption";
    caption.setAttribute("contenteditable", "true");
    caption.setAttribute("data-placeholder", captionPlaceholder || "Add a caption...");
    if (captionText) caption.textContent = captionText;
    wrapper.appendChild(caption);

    // Sonrasına boş paragraf ekle
    const p = document.createElement("p");
    p.innerHTML = "<br>";
    figure.replaceWith(wrapper);
    wrapper.after(p);
  });
}

function convertStandaloneImagesToImageWrappers(root: Element, captionPlaceholder?: string): void {
  const images = Array.from(root.querySelectorAll("img"));

  images.forEach(img => {
    if (img.closest("figure, .image-wrapper, figcaption, a")) return;

    const parent = img.parentElement;
    if (!parent) return;

    const shouldWrapWholeParagraph = parent.tagName === "P" && isImageOnlyParagraph(parent, img);
    const shouldWrapDirectChild = parent === root;
    if (!shouldWrapWholeParagraph && !shouldWrapDirectChild) return;

    const wrapper = document.createElement("div");
    wrapper.className = "image-wrapper";
    wrapper.setAttribute("contenteditable", "false");
    wrapper.appendChild(img.cloneNode(true));

    const caption = document.createElement("div");
    caption.className = "image-caption";
    caption.setAttribute("contenteditable", "true");
    caption.setAttribute("data-placeholder", captionPlaceholder || "Add a caption...");
    wrapper.appendChild(caption);

    const spacer = document.createElement("p");
    spacer.innerHTML = "<br>";

    if (shouldWrapWholeParagraph) {
      parent.replaceWith(wrapper);
      wrapper.after(spacer);
    } else {
      img.replaceWith(wrapper);
      wrapper.after(spacer);
    }
  });
}

function isImageOnlyParagraph(paragraph: Element, img: Element): boolean {
  const clone = paragraph.cloneNode(true) as Element;
  clone.querySelectorAll("br").forEach(br => br.remove());
  const cloneImages = clone.querySelectorAll("img");
  if (cloneImages.length !== 1) return false;
  cloneImages[0].remove();
  clone.querySelectorAll("a").forEach(link => {
    if (!link.textContent?.trim()) link.remove();
  });
  return !(clone.textContent || "").replace(/\u00A0/g, " ").trim();
}
