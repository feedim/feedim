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

export function sanitizePastedHTML(html: string): string {
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

  // 8. <img> temizliği — sadece http/https src kalsın
  body.querySelectorAll("img").forEach(img => {
    const src = img.getAttribute("src") || "";
    if (!src || /^data:/i.test(src) || !/^https?:\/\//i.test(src)) {
      img.remove();
    }
  });

  // 8b. <figure> → editör image-wrapper formatına dönüştür
  convertFiguresToImageWrappers(body);

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

function wrapOrphanTextNodes(root: Element): void {
  Array.from(root.childNodes).forEach(node => {
    if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
      const p = document.createElement("p");
      node.replaceWith(p);
      p.appendChild(node);
    }
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

function convertFiguresToImageWrappers(root: Element): void {
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
    caption.setAttribute("data-placeholder", "Açıklama ekleyin...");
    if (captionText) caption.textContent = captionText;
    wrapper.appendChild(caption);

    // Sonrasına boş paragraf ekle
    const p = document.createElement("p");
    p.innerHTML = "<br>";
    figure.replaceWith(wrapper);
    wrapper.after(p);
  });
}
