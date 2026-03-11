"use client";

import { useRef, useCallback, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { useTranslations } from "next-intl";
import MentionDropdown from "@/components/MentionDropdown";
import type { MentionUser as MentionDropdownUser } from "@/components/MentionDropdown";
import { feedimAlert } from "@/components/FeedimAlert";
import { countMentions, extractMentions } from "@/lib/mentionRenderer";
import { openFilePicker } from "@/lib/openFilePicker";

interface MentionUser {
  user_id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  is_verified?: boolean;
}

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  onImageUpload?: (file: File) => Promise<string>;
  onBackspaceAtStart?: () => void;
  onEmojiClick?: () => void;
  onGifClick?: () => void;
  onMentionSearch?: (query: string) => Promise<MentionUser[]>;
  onCropImage?: (src: string) => Promise<string>;
  onSave?: () => void;
  onPublish?: () => void;
  placeholder?: string;
}

export interface RichTextEditorHandle {
  focus: () => void;
  getTextContent: () => string;
  getWordCount: () => number;
  getCharCount: () => number;
  cleanContentForSave: () => string;
  insertEmoji: (emoji: string) => void;
  insertGif: (gifUrl: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  getSelectedImageSrc: () => string | null;
  replaceSelectedImage: (newSrc: string) => void;
}

function escapeAttr(s: string) {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Safari-safe text/HTML insertion helpers.
 *
 * `document.execCommand("insertText")` and `insertHTML` push entries onto
 * Safari's native undo manager. When the app later programmatically changes
 * the content, Safari shows an "Undo Typing" (Geri Al: Yazma) confirmation
 * alert that cannot be suppressed.
 *
 * These helpers bypass the browser undo stack by manipulating the Selection /
 * Range API directly.  They work in all modern browsers (Chrome, Firefox,
 * Safari 15.4+).
 */
function safariInsertText(text: string) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  sel.deleteFromDocument();
  const range = sel.getRangeAt(0);
  const textNode = document.createTextNode(text);
  range.insertNode(textNode);
  // Collapse cursor after the inserted text
  range.setStartAfter(textNode);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

function safariInsertHTML(html: string) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  sel.deleteFromDocument();
  const range = sel.getRangeAt(0);
  const temp = document.createElement("div");
  temp.innerHTML = html;
  const fragment = document.createDocumentFragment();
  let lastInserted: Node | null = null;
  while (temp.firstChild) {
    lastInserted = temp.firstChild;
    fragment.appendChild(lastInserted);
  }
  range.insertNode(fragment);
  // Collapse cursor after the inserted content
  if (lastInserted) {
    range.setStartAfter(lastInserted);
    range.collapse(true);
  }
  sel.removeAllRanges();
  sel.addRange(range);
}

function safariInsertLineBreak() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  sel.deleteFromDocument();
  const range = sel.getRangeAt(0);
  const br = document.createElement("br");
  range.insertNode(br);
  // Place cursor after the <br>
  range.setStartAfter(br);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

function safariInsertParagraph() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  sel.deleteFromDocument();
  const range = sel.getRangeAt(0);
  const p = document.createElement("p");
  p.innerHTML = "<br>";
  range.insertNode(p);
  // Place cursor inside the new paragraph
  const innerRange = document.createRange();
  innerRange.setStart(p, 0);
  innerRange.collapse(true);
  sel.removeAllRanges();
  sel.addRange(innerRange);
}

async function shouldKeepPastedExternalImage(img: HTMLImageElement): Promise<boolean> {
  const signature = `${img.getAttribute("src") || ""} ${img.alt || ""}`.toLowerCase();
  if (/(avatar|profile|profil|logo|icon|share|facebook|twitter|whatsapp|google haberler|abone|subscribe|yorum|comment)/i.test(signature)) {
    return false;
  }

  const hasTinyStyle = (() => {
    const style = img.getAttribute("style") || "";
    const widthMatch = style.match(/width\s*:\s*(\d+)px/i);
    const heightMatch = style.match(/height\s*:\s*(\d+)px/i);
    const width = widthMatch ? parseInt(widthMatch[1], 10) : 0;
    const height = heightMatch ? parseInt(heightMatch[1], 10) : 0;
    return (width > 0 && width < 96) || (height > 0 && height < 96);
  })();
  if (hasTinyStyle) return false;

  if (!img.complete || img.naturalWidth === 0) {
    await new Promise<void>(resolve => {
      const done = () => resolve();
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
      window.setTimeout(done, 700);
    });
  }

  const rect = img.getBoundingClientRect();
  if ((img.naturalWidth > 0 && img.naturalWidth < 96) || (img.naturalHeight > 0 && img.naturalHeight < 96)) return false;
  if ((rect.width > 0 && rect.width < 48) || (rect.height > 0 && rect.height < 48)) return false;
  return true;
}

const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(function RichTextEditor({ value, onChange, onImageUpload, onBackspaceAtStart, onEmojiClick, onGifClick, onMentionSearch, onCropImage, onSave, onPublish, placeholder }, ref) {
  const t = useTranslations("editor");
  const tc = useTranslations("common");
  const resolvedPlaceholder = placeholder || t("defaultPlaceholder");
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const [dragging, setDragging] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(false);
  const [captionFocused, setCaptionFocused] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const [editorEmpty, setEditorEmpty] = useState(!value);
  const isInternalUpdate = useRef(false);

  // Mention system for contentEditable
  const [mentionUsers, setMentionUsers] = useState<MentionDropdownUser[]>([]);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionDropdownPos, setMentionDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const mentionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mentionRangeRef = useRef<Range | null>(null);

  // Track last cursor position for emoji/GIF insertion after focus loss
  const lastRangeRef = useRef<Range | null>(null);

  // Undo/Redo history
  const historyRef = useRef<{ content: string }[]>([]);
  const historyIndexRef = useRef(-1);
  const historyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUndoRedoRef = useRef(false);

  useImperativeHandle(ref, () => ({
    focus: () => editorRef.current?.focus(),
    getTextContent: () => {
      if (!editorRef.current) return "";
      return editorRef.current.textContent || "";
    },
    getWordCount: () => {
      if (!editorRef.current) return 0;
      const text = (editorRef.current.textContent || "").replace(/\s+/g, " ").trim();
      if (!text) return 0;
      return text.split(" ").length;
    },
    getCharCount: () => {
      if (!editorRef.current) return 0;
      return (editorRef.current.textContent || "").replace(/\s+/g, "").length;
    },
    cleanContentForSave: () => {
      if (!editorRef.current) return "";
      return cleanContentForSave(editorRef.current.innerHTML);
    },
    insertEmoji: (emoji: string) => {
      if (!editorRef.current) return;
      editorRef.current.focus();
      const sel = window.getSelection();

      // Try restoring saved cursor position
      if (lastRangeRef.current && editorRef.current.contains(lastRangeRef.current.startContainer)) {
        sel?.removeAllRanges();
        sel?.addRange(lastRangeRef.current);
        safariInsertText(emoji);
      } else {
        // Fallback: insert at end
        let lastEl = editorRef.current.lastElementChild;
        if (!lastEl || lastEl.classList.contains("image-wrapper") || lastEl.classList.contains("embed-wrapper") || lastEl.tagName === "HR") {
          const p = document.createElement("p");
          p.innerHTML = "<br>";
          editorRef.current.appendChild(p);
          lastEl = p;
        }
        const br = lastEl.querySelector(":scope > br:only-child");
        if (br && !lastEl.textContent?.trim()) br.remove();
        lastEl.appendChild(document.createTextNode(emoji));
        const range = document.createRange();
        range.selectNodeContents(lastEl);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      isInternalUpdate.current = true;
      onChange(editorRef.current.innerHTML);
      scheduleHistory();
    },
    insertGif: (gifUrl: string) => {
      if (!editorRef.current) return;
      const gifHtml = `<div class="image-wrapper" contenteditable="false"><img src="${escapeAttr(gifUrl)}" alt="GIF" /><div class="image-caption" contenteditable="true" data-placeholder="${t("captionPlaceholder")}"></div></div><p><br></p>`;
      insertBlockAtCursor(gifHtml);
    },
    undo,
    redo,
    canUndo: () => historyIndexRef.current > 0,
    canRedo: () => historyIndexRef.current < historyRef.current.length - 1,
    getSelectedImageSrc: () => {
      if (!editorRef.current) return null;
      const sel = editorRef.current.querySelector(".image-wrapper.selected img") as HTMLImageElement | null;
      return sel?.src || null;
    },
    replaceSelectedImage: (newSrc: string) => {
      if (!editorRef.current) return;
      const sel = editorRef.current.querySelector(".image-wrapper.selected img") as HTMLImageElement | null;
      if (sel) {
        sel.src = newSrc;
        isInternalUpdate.current = true;
        onChange(editorRef.current.innerHTML);
        addToHistory();
      }
    },
  }));

  // Track caption focus — hide toolbar when editing captions
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest?.(".image-caption")) {
        setCaptionFocused(true);
      } else {
        setCaptionFocused(false);
      }
    };
    editor.addEventListener("focusin", handleFocusIn);
    return () => editor.removeEventListener("focusin", handleFocusIn);
  }, []);


  // Detect macOS for keyboard shortcut labels (client-only to avoid hydration mismatch)
  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));
  }, []);

  // Mobilde klavye açıldığında toolbar'ı klavyenin üstüne taşı
  const initialVvHeight = useRef(0);
  const rafIdRef = useRef(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    if (!initialVvHeight.current) initialVvHeight.current = vv.height;

    const isEditorFocused = () => {
      const editor = editorRef.current;
      const active = document.activeElement as HTMLElement | null;
      if (!editor || !active) return false;
      return active === editor || editor.contains(active);
    };

    const applyOffset = () => {
      const toolbar = toolbarRef.current;
      if (!toolbar) return;

      const baseHeight = Math.max(window.innerHeight, initialVvHeight.current);
      const offset = Math.max(0, Math.round(baseHeight - vv.height - vv.offsetTop));
      toolbar.style.bottom = offset > 24 ? `${offset}px` : "";
    };

    const scheduleOffset = () => {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(applyOffset);
    };

    // rAF polling — focus alındığında her frame kontrol et (klavye animasyonu sırasında bile)
    let polling = false;
    let pollStart = 0;
    const poll = () => {
      applyOffset();
      if (polling && Date.now() - pollStart < 900) {
        rafIdRef.current = requestAnimationFrame(poll);
      } else {
        polling = false;
      }
    };
    const startPolling = () => {
      pollStart = Date.now();
      if (polling) return;
      polling = true;
      rafIdRef.current = requestAnimationFrame(poll);
    };
    const stopPolling = () => {
      polling = false;
      cancelAnimationFrame(rafIdRef.current);
    };

    // Focus/blur — klavye açılış/kapanış anını yakala
    const onFocusIn = () => startPolling();
    const onFocusOut = () => {
      const toolbar = toolbarRef.current;
      if (toolbar) {
        requestAnimationFrame(() => {
          if (!isEditorFocused()) {
            toolbar.style.bottom = "";
          }
        });
      }
      startPolling(); /* kapanış animasyonunu da yakala */
    };

    const editor = editorRef.current;
    if (editor) {
      editor.addEventListener("focusin", onFocusIn);
      editor.addEventListener("focusout", onFocusOut);
    }

    // selectionchange — toolbar butonları onMouseDown+preventDefault kullandığı için
    // focus event tetiklenmiyor; selectionchange her format değişikliğinde polling başlatır
    const onSelectionChange = () => startPolling();
    document.addEventListener("selectionchange", onSelectionChange);

    // Fallback: visualViewport event'leri (polling bitince de çalışsın)
    vv.addEventListener("resize", scheduleOffset);
    vv.addEventListener("scroll", scheduleOffset);
    scheduleOffset();

    return () => {
      stopPolling();
      if (toolbarRef.current) {
        toolbarRef.current.style.bottom = "";
      }
      if (editor) {
        editor.removeEventListener("focusin", onFocusIn);
        editor.removeEventListener("focusout", onFocusOut);
      }
      document.removeEventListener("selectionchange", onSelectionChange);
      vv.removeEventListener("resize", scheduleOffset);
      vv.removeEventListener("scroll", scheduleOffset);
    };
  }, []);

  // Track active formatting on selection change
  useEffect(() => {
    const checkFormats = () => {
      if (!editorRef.current?.contains(document.activeElement) && document.activeElement !== editorRef.current) return;
      const formats = new Set<string>();
      try {
        if (document.queryCommandState("bold")) formats.add("bold");
        if (document.queryCommandState("italic")) formats.add("italic");
        if (document.queryCommandState("underline")) formats.add("underline");
        if (document.queryCommandState("insertUnorderedList")) formats.add("ul");
        if (document.queryCommandState("insertOrderedList")) formats.add("ol");
        if (document.queryCommandState("justifyCenter")) formats.add("alignCenter");
        if (document.queryCommandState("justifyRight")) formats.add("alignRight");
        const block = document.queryCommandValue("formatBlock");
        if (block === "h2") formats.add("h2");
        if (block === "h3") formats.add("h3");
        if (block === "blockquote") formats.add("blockquote");

        // DOM-tabanlı tespit — selection'ın her iki ucunu da kontrol et
        // (queryCommandValue sadece anchor'a bakar, selection genişlediğinde yetersiz kalır)
        const sel = window.getSelection();
        const anchorNode = sel?.anchorNode;
        const focusNode = sel?.focusNode;
        const getEl = (n: Node | null | undefined) =>
          n ? (n.nodeType === Node.ELEMENT_NODE ? n as HTMLElement : n.parentElement) : null;
        const anchorEl = getEl(anchorNode);
        const focusEl = getEl(focusNode);

        // Heading — her iki uçta da kontrol
        if (anchorEl?.closest("h2") || focusEl?.closest("h2")) formats.add("h2");
        if (anchorEl?.closest("h3") || focusEl?.closest("h3")) formats.add("h3");
        if (anchorEl?.closest("blockquote") || focusEl?.closest("blockquote")) formats.add("blockquote");

        // Seçim aralığı kısıtlı elementle kesişiyorsa da ekle
        if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          const ancestor = range.commonAncestorContainer;
          const container = getEl(ancestor);
          if (container) {
            for (const h of Array.from(container.querySelectorAll("h2, h3, blockquote"))) {
              if (range.intersectsNode(h)) {
                const tag = h.tagName.toLowerCase();
                formats.add(tag === "blockquote" ? "blockquote" : tag);
              }
            }
          }
        }

        // Link detection
        const linkEl = anchorEl?.closest("a");
        if (linkEl) formats.add("link");
        // Table detection
        const tableEl = anchorEl?.closest("table") || focusEl?.closest("table");
        if (tableEl) formats.add("table");
      } catch {}
      setActiveFormats(formats);
    };
    document.addEventListener("selectionchange", checkFormats);

    // Save cursor position on selectionchange for emoji/GIF insertion after focus loss
    const saveCursorPosition = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      if (editorRef.current?.contains(range.startContainer)) {
        lastRangeRef.current = range.cloneRange();
      }
    };
    document.addEventListener("selectionchange", saveCursorPosition);

    return () => {
      document.removeEventListener("selectionchange", checkFormats);
      document.removeEventListener("selectionchange", saveCursorPosition);
    };
  }, []);

  // Add to undo history
  const addToHistory = useCallback(() => {
    if (isUndoRedoRef.current || !editorRef.current) return;
    const content = editorRef.current.innerHTML;
    const lastEntry = historyRef.current[historyIndexRef.current];
    if (lastEntry && lastEntry.content === content) return;

    // Truncate forward history
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    }
    historyRef.current.push({ content });
    historyIndexRef.current = historyRef.current.length - 1;

    // Limit history to 100 entries
    if (historyRef.current.length > 100) {
      historyRef.current.shift();
      historyIndexRef.current--;
    }
  }, []);

  const scheduleHistory = useCallback(() => {
    if (historyTimeoutRef.current) clearTimeout(historyTimeoutRef.current);
    historyTimeoutRef.current = setTimeout(() => addToHistory(), 500);
  }, [addToHistory]);

  const placeCaretWithoutScroll = useCallback((target: Element | null) => {
    if (!editorRef.current || !target) return;
    editorRef.current.focus({ preventScroll: true });
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(target);
    range.collapse(true);
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, []);

  const getInsertedCaretTarget = useCallback((nodes: Node[]) => {
    const elements = nodes.filter((node): node is Element => node.nodeType === Node.ELEMENT_NODE);
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (el.tagName === "P") return el;
    }
    return elements[elements.length - 1] || null;
  }, []);

  const stripBlobImagesFromEditor = useCallback(() => {
    if (!editorRef.current) return false;
    let removed = false;
    editorRef.current.querySelectorAll('img[src^="blob:"]').forEach((img) => {
      const wrapper = img.closest(".image-wrapper");
      if (wrapper) {
        const next = wrapper.nextElementSibling;
        wrapper.remove();
        if (next?.tagName === "P" && !next.textContent?.trim()) next.remove();
      } else {
        img.remove();
      }
      removed = true;
    });
    return removed;
  }, []);

  // Blok-seviye içerik (GIF/image) her zaman editörün en altına DOM ile eklenir
  const appendBlockAtEnd = useCallback((html: string) => {
    if (!editorRef.current) return;
    addToHistory();
    // Son boş paragrafı bul (varsa onun yerine ekle)
    const lastChild = editorRef.current.lastElementChild;
    const isLastEmpty = lastChild?.tagName === "P" && !lastChild.textContent?.trim() && !lastChild.querySelector("img");
    const insertPoint = isLastEmpty ? lastChild : null;
    // HTML'i parse et ve DOM'a ekle
    const temp = document.createElement("div");
    temp.innerHTML = html;
    const insertedNodes = Array.from(temp.childNodes);
    const fragment = document.createDocumentFragment();
    while (temp.firstChild) fragment.appendChild(temp.firstChild);
    if (insertPoint) {
      insertPoint.replaceWith(fragment);
    } else {
      editorRef.current.appendChild(fragment);
    }
    placeCaretWithoutScroll(getInsertedCaretTarget(insertedNodes));
    setEditorEmpty(false);
    isInternalUpdate.current = true;
    onChange(editorRef.current.innerHTML);
    scheduleHistory();
  }, [addToHistory, getInsertedCaretTarget, onChange, placeCaretWithoutScroll, scheduleHistory]);

  // Insert block-level content at saved cursor position, or fall back to end
  const insertBlockAtCursor = useCallback((html: string) => {
    if (!editorRef.current) return;
    addToHistory();

    const temp = document.createElement("div");
    temp.innerHTML = html;
    const insertedNodes = Array.from(temp.childNodes);
    const fragment = document.createDocumentFragment();
    while (temp.firstChild) fragment.appendChild(temp.firstChild);

    let inserted = false;
    if (lastRangeRef.current && editorRef.current.contains(lastRangeRef.current.startContainer)) {
      // Find the block-level parent of the cursor
      const startNode = lastRangeRef.current.startContainer;
      const blockParent = startNode.nodeType === Node.ELEMENT_NODE
        ? (startNode as HTMLElement).closest("p, h2, h3, blockquote, li, div") || startNode
        : startNode.parentElement?.closest("p, h2, h3, blockquote, li, div") || startNode.parentElement;
      if (blockParent && editorRef.current.contains(blockParent) && blockParent !== editorRef.current) {
        blockParent.parentNode?.insertBefore(fragment, blockParent.nextSibling);
        inserted = true;
      }
    }

    if (!inserted) {
      // Fallback: append at end
      const lastChild = editorRef.current.lastElementChild;
      const isLastEmpty = lastChild?.tagName === "P" && !lastChild.textContent?.trim() && !lastChild.querySelector("img");
      if (isLastEmpty) lastChild.replaceWith(fragment);
      else editorRef.current.appendChild(fragment);
    }

    placeCaretWithoutScroll(getInsertedCaretTarget(insertedNodes));
    setEditorEmpty(false);
    isInternalUpdate.current = true;
    onChange(editorRef.current.innerHTML);
    scheduleHistory();
  }, [addToHistory, getInsertedCaretTarget, onChange, placeCaretWithoutScroll, scheduleHistory]);

  // Cleanup history timeout on unmount
  useEffect(() => {
    return () => { if (historyTimeoutRef.current) clearTimeout(historyTimeoutRef.current); };
  }, []);

  // Undo
  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0 || !editorRef.current) return;
    // Bekleyen history timeout'u iptal et
    if (historyTimeoutRef.current) { clearTimeout(historyTimeoutRef.current); historyTimeoutRef.current = null; }
    // Undo'dan önce mevcut durumu kaydet (henüz kaydedilmediyse)
    addToHistory();
    if (historyIndexRef.current <= 0) return;
    isUndoRedoRef.current = true;
    historyIndexRef.current--;
    const state = historyRef.current[historyIndexRef.current];
    editorRef.current.innerHTML = state.content;
    isInternalUpdate.current = true;
    onChange(state.content);
    // Cursor'u içeriğin sonuna taşı
    const sel = window.getSelection();
    if (sel && editorRef.current.lastChild) {
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    setTimeout(() => { isUndoRedoRef.current = false; }, 50);
  }, [onChange, addToHistory]);

  // Redo
  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1 || !editorRef.current) return;
    // Bekleyen history timeout'u iptal et
    if (historyTimeoutRef.current) { clearTimeout(historyTimeoutRef.current); historyTimeoutRef.current = null; }
    isUndoRedoRef.current = true;
    historyIndexRef.current++;
    const state = historyRef.current[historyIndexRef.current];
    editorRef.current.innerHTML = state.content;
    isInternalUpdate.current = true;
    onChange(state.content);
    // Cursor'u içeriğin sonuna taşı
    const sel = window.getSelection();
    if (sel && editorRef.current.lastChild) {
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    setTimeout(() => { isUndoRedoRef.current = false; }, 50);
  }, [onChange]);

  const exec = useCallback((command: string, val?: string) => {
    // Route text/HTML insertion commands through Safari-safe helpers
    // to avoid triggering Safari's "Undo Typing" popup
    if (command === "insertText") {
      safariInsertText(val || "");
    } else if (command === "insertHTML") {
      safariInsertHTML(val || "");
    } else if (command === "insertLineBreak") {
      safariInsertLineBreak();
    } else if (command === "insertParagraph") {
      safariInsertParagraph();
    } else {
      // Formatting commands (bold, italic, formatBlock, etc.) are fine
      // to keep on execCommand — users expect to undo these
      document.execCommand(command, false, val);
    }
    editorRef.current?.focus();
    if (editorRef.current) {
      // Post-exec: kısıtlı bloklardan inline formatlama temizle
      editorRef.current.querySelectorAll("h2, h3, blockquote").forEach(block => {
        block.querySelectorAll("strong, em, u, b, i, a").forEach(tag => {
          while (tag.firstChild) tag.parentNode?.insertBefore(tag.firstChild, tag);
          tag.remove();
        });
      });
      const html = editorRef.current.innerHTML;
      isInternalUpdate.current = true;
      onChange(html);
      scheduleHistory();
    }
  }, [onChange, scheduleHistory]);

  // Editörün kırık/boş durumunu düzelt — tek merkezî fonksiyon
  const ensureEditorIntegrity = useCallback(() => {
    if (!editorRef.current) return;
    const el = editorRef.current;

    // Editörde geçici blob URL'ler kalmasın; prod ortamında net::ERR_FILE_NOT_FOUND
    // gürültüsü ve bozuk görsel davranışı yaratabiliyorlar.
    el.querySelectorAll('img[src^="blob:"]').forEach((img) => {
      const wrapper = img.closest(".image-wrapper");
      if (wrapper) {
        const next = wrapper.nextElementSibling;
        wrapper.remove();
        if (next?.tagName === "P" && !next.textContent?.trim()) next.remove();
      } else {
        img.remove();
      }
    });

    const text = el.textContent || "";
    const hasImg = !!el.querySelector("img");

    // Tamamen boş veya sadece boş tag/br kaldıysa
    if (!text.trim() && !hasImg) {
      el.innerHTML = "<p><br></p>";
      const p = el.querySelector("p");
      if (p) {
        const sel = window.getSelection();
        const range = document.createRange();
        range.setStart(p, 0);
        range.collapse(true);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      setEditorEmpty(true);
      return;
    }

    // Editörde doğrudan text node varsa <p> ile sar
    Array.from(el.childNodes).forEach(node => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
        const p = document.createElement("p");
        node.replaceWith(p);
        p.appendChild(node);
      }
    });

    // Kısıtlı bloklardan inline formatlama temizle (güvenlik ağı)
    el.querySelectorAll("h2, h3").forEach(heading => {
      heading.querySelectorAll("strong, em, u, b, i, a").forEach(tag => {
        while (tag.firstChild) tag.parentNode?.insertBefore(tag.firstChild, tag);
        tag.remove();
      });
    });
    el.querySelectorAll("blockquote").forEach(bq => {
      bq.querySelectorAll("strong, em, u, b, i, a").forEach(tag => {
        while (tag.firstChild) tag.parentNode?.insertBefore(tag.firstChild, tag);
        tag.remove();
      });
    });

    // Legacy boş caption bloklarını temizle (placeholder'lı aktif caption alanını koru)
    el.querySelectorAll(".image-caption").forEach(caption => {
      const captionEl = caption as HTMLElement;
      const captionText = (captionEl.textContent || "").replace(/\u00A0/g, " ").trim();
      const hasPlaceholder = captionEl.hasAttribute("data-placeholder");
      if (!captionText && !hasPlaceholder) {
        captionEl.remove();
      }
    });

    setEditorEmpty(false);
  }, []);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      ensureEditorIntegrity();
      isInternalUpdate.current = true;
      onChange(editorRef.current.innerHTML);
      scheduleHistory();
    }
  }, [onChange, scheduleHistory, ensureEditorIntegrity]);

  // --- Mention detection for contentEditable ---
  const clearMentionState = useCallback(() => {
    if (mentionTimerRef.current) {
      clearTimeout(mentionTimerRef.current);
      mentionTimerRef.current = null;
    }
    setMentionUsers([]);
    setMentionIndex(0);
    setMentionDropdownPos(null);
    mentionRangeRef.current = null;
  }, []);

  const detectMention = useCallback(() => {
    if (!onMentionSearch || !editorRef.current) return;
    const sel = window.getSelection();
    if (!sel || !sel.isCollapsed || !sel.anchorNode) { clearMentionState(); return; }

    // Get text before cursor in the current text node
    const node = sel.anchorNode;
    if (node.nodeType !== Node.TEXT_NODE) { clearMentionState(); return; }
    const textBefore = (node.textContent || "").substring(0, sel.anchorOffset);
    const match = textBefore.match(/(^|[^A-Za-z0-9._-])@(\w*)$/);

    if (!match) { clearMentionState(); return; }

    // Check 3-mention limit (subtract 1: currently-being-typed @query is included in count)
    const fullText = editorRef.current.textContent || "";
    const completedMentions = Math.max(0, countMentions(fullText) - 1);
    if (completedMentions >= 3) {
      feedimAlert("error", tc("mentionLimit"));
      clearMentionState();
      return;
    }

    const query = match[2];

    // Save the range for later insertion
    const range = document.createRange();
    range.setStart(node, sel.anchorOffset - query.length - 1); // include @
    range.setEnd(node, sel.anchorOffset);
    mentionRangeRef.current = range;

    // Get dropdown position relative to editor
    const rect = range.getBoundingClientRect();
    const editorRect = editorRef.current.getBoundingClientRect();
    setMentionDropdownPos({
      top: rect.bottom - editorRect.top + 4,
      left: rect.left - editorRect.left,
    });

    // Get already-mentioned usernames to exclude from suggestions
    const alreadyMentioned = new Set(extractMentions(fullText, 999).map(u => u.toLowerCase()));

    if (mentionTimerRef.current) clearTimeout(mentionTimerRef.current);
    mentionTimerRef.current = setTimeout(async () => {
      try {
        const users = await onMentionSearch(query);
        const filtered = users.filter(u => !alreadyMentioned.has(u.username.toLowerCase()));
        setMentionUsers(filtered.map(u => ({
          user_id: u.user_id,
          username: u.username,
          avatar_url: u.avatar_url,
          is_verified: u.is_verified,
        })));
        setMentionIndex(0);
      } catch {
        setMentionUsers([]);
      }
    }, 200);
  }, [onMentionSearch, clearMentionState, tc]);

  const insertMentionUser = useCallback((username: string) => {
    if (!editorRef.current || !mentionRangeRef.current) return;
    const sel = window.getSelection();
    if (!sel) return;

    sel.removeAllRanges();
    sel.addRange(mentionRangeRef.current);
    safariInsertText(`@${username} `);

    clearMentionState();
    isInternalUpdate.current = true;
    onChange(editorRef.current.innerHTML);
    scheduleHistory();
  }, [clearMentionState, onChange, scheduleHistory]);

  // Trigger mention detection after each input
  const handleInputWithMention = useCallback(() => {
    handleInput();
    detectMention();
  }, [handleInput, detectMention]);

  // --- Media selection system (WordPress birebir) ---

  const deselectAllMedia = useCallback(() => {
    if (!editorRef.current) return;
    editorRef.current.querySelectorAll(".image-wrapper.selected, .embed-wrapper.selected").forEach(w => {
      w.classList.remove("selected");
    });
    setSelectedMedia(false);
  }, []);

  const isEmptySpacerParagraph = useCallback((node: Element | null): node is HTMLParagraphElement => {
    if (!node || node.tagName !== "P") return false;
    const text = (node.textContent || "").replace(/\u00A0/g, " ").trim();
    return !text && !node.querySelector("img, table, blockquote, ul, ol, pre, hr");
  }, []);

  const shouldCarryTrailingSpacer = useCallback((block: Element) => {
    return (
      block.classList.contains("image-wrapper")
      || block.classList.contains("embed-wrapper")
      || ["TABLE", "BLOCKQUOTE", "UL", "OL", "PRE", "HR"].includes(block.tagName)
    );
  }, []);

  const getBlockGroups = useCallback(() => {
    if (!editorRef.current) return [] as { primary: HTMLElement; nodes: HTMLElement[] }[];
    const children = Array.from(editorRef.current.children) as HTMLElement[];
    const groups: { primary: HTMLElement; nodes: HTMLElement[] }[] = [];

    for (let i = 0; i < children.length; i++) {
      const current = children[i];
      if (groups.some(group => group.nodes.includes(current))) continue;

      const nodes = [current];
      const next = children[i + 1];
      if (shouldCarryTrailingSpacer(current) && isEmptySpacerParagraph(next)) {
        nodes.push(next as HTMLElement);
      }
      groups.push({ primary: current, nodes });
    }

    return groups;
  }, [isEmptySpacerParagraph, shouldCarryTrailingSpacer]);

  // --- Evrensel blok işlemleri (tüm elementler için) ---
  // Editor'ün doğrudan çocuğu olan bloğu bul (seçili medya VEYA cursor pozisyonu)
  const getCurrentBlock = useCallback((): HTMLElement | null => {
    if (!editorRef.current) return null;
    // Önce seçili medya var mı bak
    const selectedWrapper = editorRef.current.querySelector(".image-wrapper.selected, .embed-wrapper.selected");
    if (selectedWrapper) {
      let node: Node | null = selectedWrapper;
      while (node && node.parentElement !== editorRef.current) node = node.parentElement;
      return node as HTMLElement | null;
    }
    // Cursor pozisyonuna göre bul
    const sel = window.getSelection();
    if (!sel?.anchorNode) return null;
    let node: Node | null = sel.anchorNode;
    // Editor'ün doğrudan çocuğuna kadar yukarı çık
    while (node && node !== editorRef.current) {
      if (node.parentNode === editorRef.current && node.nodeType === Node.ELEMENT_NODE) return node as HTMLElement;
      node = node.parentNode;
    }
    return null;
  }, []);

  const handleBlockDelete = useCallback(() => {
    const block = getCurrentBlock();
    if (!block || !editorRef.current) return;
    addToHistory();
    const p = document.createElement("p");
    p.innerHTML = "<br>";
    block.replaceWith(p);
    // İmleci yeni paragrafa taşı
    const sel = window.getSelection();
    const range = document.createRange();
    range.setStart(p, 0);
    range.collapse(true);
    sel?.removeAllRanges();
    sel?.addRange(range);
    // Editör boş kaldıysa varsayılan paragraf ekle
    if (!editorRef.current.innerHTML.trim() || editorRef.current.innerHTML === "<br>") {
      editorRef.current.innerHTML = "<p><br></p>";
    }
    setSelectedMedia(false);
    isInternalUpdate.current = true;
    onChange(editorRef.current.innerHTML);
    scheduleHistory();
  }, [getCurrentBlock, addToHistory, onChange, scheduleHistory]);

  // Blok taşıma sonrası cursor'u bloğun içine geri koy
  const refocusBlock = useCallback((block: HTMLElement) => {
    if (block.classList.contains("image-wrapper") || block.classList.contains("embed-wrapper")) {
      block.classList.add("selected");
      setSelectedMedia(true);
      window.getSelection()?.removeAllRanges();
      return;
    }

    const table = block.tagName === "TABLE" ? block : block.querySelector("table");
    if (table) {
      const firstEditable = table.querySelector("tbody td, tbody th, thead th, td, th");
      if (firstEditable) {
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(firstEditable);
        range.collapse(true);
        sel?.removeAllRanges();
        sel?.addRange(range);
        setSelectedMedia(false);
        return;
      }
    }

    const sel = window.getSelection();
    if (!sel) return;
    const range = document.createRange();
    range.selectNodeContents(block);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
    setSelectedMedia(false);
  }, []);

  const moveBlockGroup = useCallback((direction: "up" | "down") => {
    if (!editorRef.current) return;
    const block = getCurrentBlock();
    if (!block) return;

    const groups = getBlockGroups();
    const currentIndex = groups.findIndex(group => group.primary === block || group.nodes.includes(block));
    if (currentIndex === -1) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= groups.length) return;

    const currentGroup = groups[currentIndex];
    const targetGroup = groups[targetIndex];
    addToHistory();

    const fragment = document.createDocumentFragment();
    currentGroup.nodes.forEach(node => fragment.appendChild(node));

    if (direction === "up") {
      targetGroup.primary.parentElement?.insertBefore(fragment, targetGroup.primary);
    } else {
      const afterTarget = targetGroup.nodes[targetGroup.nodes.length - 1].nextSibling;
      targetGroup.primary.parentElement?.insertBefore(fragment, afterTarget);
    }

    refocusBlock(currentGroup.primary);
    isInternalUpdate.current = true;
    onChange(editorRef.current.innerHTML);
    scheduleHistory();
  }, [getCurrentBlock, getBlockGroups, addToHistory, refocusBlock, onChange, scheduleHistory]);

  const handleBlockMoveUp = useCallback(() => {
    moveBlockGroup("up");
  }, [moveBlockGroup]);

  const handleBlockMoveDown = useCallback(() => {
    moveBlockGroup("down");
  }, [moveBlockGroup]);

  // Editor click handler — WordPress birebir image/embed selection
  const handleEditorClick = useCallback((e: React.MouseEvent) => {
    if (!editorRef.current) return;

    // Don't select wrapper if clicking on caption
    const target = e.target as HTMLElement;
    const caption = target.closest(".image-caption");
    if (caption) {
      deselectAllMedia();
      return;
    }

    const wrapper = target.closest(".image-wrapper, .embed-wrapper");

    // Deselect all first
    editorRef.current.querySelectorAll(".image-wrapper.selected, .embed-wrapper.selected").forEach(w => {
      w.classList.remove("selected");
    });

    if (wrapper) {
      wrapper.classList.add("selected");
      setSelectedMedia(true);
      // Dismiss mobile keyboard when selecting media
      window.getSelection()?.removeAllRanges();
      (document.activeElement as HTMLElement)?.blur();
    } else {
      setSelectedMedia(false);
    }
  }, [deselectAllMedia]);

  const handleBold = () => exec("bold");
  const handleItalic = () => exec("italic");
  const handleUnderline = () => exec("underline");
  const handleHR = () => exec("insertHorizontalRule");

  // Tablo ekleme
  const handleTable = useCallback(() => {
    if (!editorRef.current) return;
    addToHistory();
    const tableHtml = `<table><thead><tr><th>${t("tableHeader")}</th><th>${t("tableHeader")}</th></tr></thead><tbody><tr><td><br></td><td><br></td></tr><tr><td><br></td><td><br></td></tr></tbody></table><p><br></p>`;
    safariInsertHTML(tableHtml);
    isInternalUpdate.current = true;
    onChange(editorRef.current.innerHTML);
    scheduleHistory();
    // Focus first body cell after table insertion
    setTimeout(() => {
      const firstCell = editorRef.current?.querySelector("table tbody td:first-child");
      if (firstCell) {
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(firstCell);
        range.collapse(true);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }, 0);
  }, [addToHistory, onChange, scheduleHistory]);

  // Tablo: cursor'ın bulunduğu hücreyi bul
  const getTableContext = useCallback(() => {
    const sel = window.getSelection();
    if (!sel?.anchorNode) return null;
    const cell = sel.anchorNode.nodeType === Node.ELEMENT_NODE
      ? (sel.anchorNode as HTMLElement).closest("td, th")
      : sel.anchorNode.parentElement?.closest("td, th");
    if (!cell) return null;
    const row = cell.closest("tr");
    const table = cell.closest("table");
    if (!row || !table) return null;
    const cellIndex = Array.from(row.children).indexOf(cell);
    if (!row.parentElement) return null;
    const rowIndex = Array.from(row.parentElement.children).indexOf(row);
    return { cell, row, table, cellIndex, rowIndex };
  }, []);

  const handleTableAddRow = useCallback(() => {
    const ctx = getTableContext();
    if (!ctx || !editorRef.current) return;
    // Max 20 satır (thead + tbody)
    const totalRows = ctx.table.querySelectorAll("tr").length;
    if (totalRows >= 20) {
      import("@/components/FeedimAlert").then(({ feedimAlert }) => feedimAlert("error", t("maxRows")));
      return;
    }
    addToHistory();
    const colCount = ctx.row.children.length;
    const newRow = document.createElement("tr");
    for (let i = 0; i < colCount; i++) {
      const td = document.createElement("td");
      td.innerHTML = "<br>";
      newRow.appendChild(td);
    }
    // tbody'ye ekle
    const tbody = ctx.table.querySelector("tbody") || ctx.table;
    tbody.appendChild(newRow);
    isInternalUpdate.current = true;
    onChange(editorRef.current.innerHTML);
    scheduleHistory();
  }, [getTableContext, addToHistory, onChange, scheduleHistory]);

  const handleTableAddCol = useCallback(() => {
    const ctx = getTableContext();
    if (!ctx || !editorRef.current) return;
    // Max 6 sütun
    const colCount = ctx.row.children.length;
    if (colCount >= 6) {
      import("@/components/FeedimAlert").then(({ feedimAlert }) => feedimAlert("error", t("maxColumns")));
      return;
    }
    addToHistory();
    ctx.table.querySelectorAll("tr").forEach(tr => {
      const isHead = tr.closest("thead");
      const cell = document.createElement(isHead ? "th" : "td");
      cell.innerHTML = isHead ? t("tableHeader") : "<br>";
      tr.appendChild(cell);
    });
    isInternalUpdate.current = true;
    onChange(editorRef.current.innerHTML);
    scheduleHistory();
  }, [getTableContext, addToHistory, onChange, scheduleHistory]);

  const handleTableRemoveRow = useCallback(() => {
    const ctx = getTableContext();
    if (!ctx || !editorRef.current) return;
    // thead satırını silme
    if (ctx.row.closest("thead")) return;
    const tbody = ctx.table.querySelector("tbody");
    if (!tbody || tbody.querySelectorAll("tr").length <= 1) return;
    addToHistory();
    ctx.row.remove();
    isInternalUpdate.current = true;
    onChange(editorRef.current.innerHTML);
    scheduleHistory();
  }, [getTableContext, addToHistory, onChange, scheduleHistory]);

  const handleTableRemoveCol = useCallback(() => {
    const ctx = getTableContext();
    if (!ctx || !editorRef.current) return;
    // En az 2 sütun kalmalı
    if (ctx.row.children.length <= 2) return;
    addToHistory();
    ctx.table.querySelectorAll("tr").forEach(tr => {
      const cells = tr.children;
      if (cells[ctx.cellIndex]) cells[ctx.cellIndex].remove();
    });
    isInternalUpdate.current = true;
    onChange(editorRef.current.innerHTML);
    scheduleHistory();
  }, [getTableContext, addToHistory, onChange, scheduleHistory]);

  // Başlığa geçerken inline formatlamayı temizle (DOM manipulation — daha güvenilir)
  const stripInlineFormatting = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || !editorRef.current) return;
    const node = sel.anchorNode;
    const heading = node?.nodeType === Node.ELEMENT_NODE
      ? (node as HTMLElement).closest("h2, h3")
      : node?.parentElement?.closest("h2, h3");
    if (heading) {
      // Doğrudan DOM'dan inline formatlama elementlerini unwrap et
      heading.querySelectorAll("strong, em, u, b, i, a").forEach(el => {
        while (el.firstChild) el.parentNode?.insertBefore(el.firstChild, el);
        el.remove();
      });
      // Cursor'u heading sonuna taşı
      const range = document.createRange();
      range.selectNodeContents(heading);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }, []);

  // Heading toggle — WordPress birebir: click again to revert to paragraph
  const handleH2 = () => {
    const block = document.queryCommandValue("formatBlock");
    if (block === "h2") {
      exec("formatBlock", "p");
    } else {
      exec("formatBlock", "h2");
      setTimeout(stripInlineFormatting, 0);
    }
  };
  const handleH3 = () => {
    const block = document.queryCommandValue("formatBlock");
    if (block === "h3") {
      exec("formatBlock", "p");
    } else {
      exec("formatBlock", "h3");
      setTimeout(stripInlineFormatting, 0);
    }
  };

  // Liste ve blockquote karşılıklı dışlama — aynı anda olamazlar
  const handleUL = () => {
    // Blockquote içindeyse önce kaldır
    if (document.queryCommandValue("formatBlock") === "blockquote") {
      document.execCommand("formatBlock", false, "p");
    }
    exec("insertUnorderedList");
  };
  const handleOL = () => {
    // Blockquote içindeyse önce kaldır
    if (document.queryCommandValue("formatBlock") === "blockquote") {
      document.execCommand("formatBlock", false, "p");
    }
    exec("insertOrderedList");
  };

  // Blockquote toggle
  const handleQuote = () => {
    const block = document.queryCommandValue("formatBlock");
    if (block === "blockquote") {
      exec("formatBlock", "p");
    } else {
      // Liste içindeyse önce kaldır
      if (document.queryCommandState("insertUnorderedList")) {
        document.execCommand("insertUnorderedList", false);
      }
      if (document.queryCommandState("insertOrderedList")) {
        document.execCommand("insertOrderedList", false);
      }
      exec("formatBlock", "blockquote");
    }
  };

  const handleAlignLeft = () => {
    if (selectedMedia) {
      const wrapper = editorRef.current?.querySelector(".image-wrapper.selected, .embed-wrapper.selected");
      if (wrapper instanceof HTMLElement) {
        wrapper.style.textAlign = "left";
        isInternalUpdate.current = true;
        if (editorRef.current) onChange(editorRef.current.innerHTML);
      }
    } else {
      exec("justifyLeft");
    }
  };
  const handleAlignCenter = () => {
    if (selectedMedia) {
      const wrapper = editorRef.current?.querySelector(".image-wrapper.selected, .embed-wrapper.selected");
      if (wrapper instanceof HTMLElement) {
        wrapper.style.textAlign = "center";
        isInternalUpdate.current = true;
        if (editorRef.current) onChange(editorRef.current.innerHTML);
      }
    } else {
      exec("justifyCenter");
    }
  };
  const handleAlignRight = () => {
    if (selectedMedia) {
      const wrapper = editorRef.current?.querySelector(".image-wrapper.selected, .embed-wrapper.selected");
      if (wrapper instanceof HTMLElement) {
        wrapper.style.textAlign = "right";
        isInternalUpdate.current = true;
        if (editorRef.current) onChange(editorRef.current.innerHTML);
      }
    } else {
      exec("justifyRight");
    }
  };

  // Link insertion — feedimPrompt for URL input
  const handleLink = useCallback(async () => {
    // Caption içinde link yasak (heading/blockquote'ta exec temizler)
    const sel0 = window.getSelection();
    if (sel0?.anchorNode) {
      const el = sel0.anchorNode.nodeType === Node.ELEMENT_NODE ? sel0.anchorNode as HTMLElement : sel0.anchorNode.parentElement;
      if (el?.closest(".image-caption")) return;
    }
    // Cursor link içindeyse → unlink
    const sel = window.getSelection();
    const anchor = sel?.anchorNode?.parentElement?.closest("a");
    if (anchor) {
      exec("unlink");
      return;
    }

    const selectedText = sel?.toString().trim() || "";
    // Save selection range before prompt (async)
    const range = sel?.rangeCount ? sel.getRangeAt(0).cloneRange() : null;

    const { feedimPrompt } = await import("@/components/FeedimAlert");
    const url = await feedimPrompt(t("linkUrl"), "https://", "https://example.com");
    if (!url) return;
    const normalizedUrl = normalizeUrl(url);
    if (!normalizedUrl) return;

    // Restore selection
    if (editorRef.current) editorRef.current.focus();
    try {
      if (range) {
        const s = window.getSelection();
        s?.removeAllRanges();
        s?.addRange(range);
      }
    } catch {
      // Range geçersiz — editör sonuna cursor koy
      const r = document.createRange();
      r.selectNodeContents(editorRef.current!);
      r.collapse(false);
      const s = window.getSelection();
      s?.removeAllRanges();
      s?.addRange(r);
    }

    if (selectedText) {
      exec("createLink", normalizedUrl);
    } else {
      exec("insertHTML", `<a href="${escapeAttr(normalizedUrl)}" target="_blank" rel="noopener">${escapeHtml(normalizedUrl)}</a>&nbsp;`);
    }
  }, [exec]);

  const handleImageClick = () => openFilePicker(fileInputRef.current);

  // Insert image from file — with image-wrapper and caption (WordPress birebir)
  const insertImage = useCallback(async (file: File) => {
    if (!onImageUpload) return;
    if (file.size > 5 * 1024 * 1024) return;
    if (!file.type.startsWith("image/")) return;
    // Insert skeleton placeholder at cursor position
    const placeholderId = `img-placeholder-${Date.now()}`;
    const skeletonHtml = `<div id="${placeholderId}" class="image-wrapper" contenteditable="false" style="pointer-events:none"><div style="width:100%;aspect-ratio:16/9;border-radius:12px;background:var(--bg-secondary)"></div></div><p><br></p>`;
    insertBlockAtCursor(skeletonHtml);
    try {
      // Compress image before upload (strip metadata, convert to JPEG, max 2MB)
      const { compressImage } = await import("@/lib/imageCompression");
      const compressed = await compressImage(file, { maxSizeMB: 2, maxWidthOrHeight: 2048 });
      const url = await onImageUpload(compressed);
      // Replace skeleton with actual image — keep skeleton visible until image loads
      const placeholder = editorRef.current?.querySelector(`#${placeholderId}`);
      if (placeholder) {
        const imageHtml = `<div class="image-wrapper" contenteditable="false"><img src="${escapeAttr(url)}" alt="" style="opacity:0;position:absolute" /><div style="width:100%;aspect-ratio:16/9;border-radius:12px;background:var(--bg-secondary)"></div><div class="image-caption" contenteditable="true" data-placeholder="${t("captionPlaceholder")}"></div></div>`;
        const temp = document.createElement("div");
        temp.innerHTML = imageHtml;
        const wrapper = temp.firstElementChild!;
        placeholder.replaceWith(wrapper);
        // Wait for image to load, then remove skeleton
        const img = wrapper.querySelector("img") as HTMLImageElement;
        const skeleton = wrapper.querySelector("div[style*='aspect-ratio']") as HTMLElement;
        if (img && skeleton) {
          const reveal = () => {
            img.style.opacity = "1";
            img.style.position = "";
            skeleton.remove();
            isInternalUpdate.current = true;
            if (editorRef.current) onChange(editorRef.current.innerHTML);
          };
          if (img.complete && img.naturalWidth > 0) reveal();
          else img.addEventListener("load", reveal, { once: true });
        }
        isInternalUpdate.current = true;
        onChange(editorRef.current!.innerHTML);
      } else {
        const imageHtml = `<div class="image-wrapper" contenteditable="false"><img src="${escapeAttr(url)}" alt="" /><div class="image-caption" contenteditable="true" data-placeholder="${t("captionPlaceholder")}"></div></div><p><br></p>`;
        appendBlockAtEnd(imageHtml);
      }
    } catch (err) {
      // Remove skeleton placeholder on error
      const placeholder = editorRef.current?.querySelector(`#${placeholderId}`);
      if (placeholder) {
        const nextSibling = placeholder.nextElementSibling;
        placeholder.remove();
        if (nextSibling?.tagName === "P" && !nextSibling.textContent?.trim()) nextSibling.remove();
        isInternalUpdate.current = true;
        if (editorRef.current) onChange(editorRef.current.innerHTML);
      }
      if (err instanceof Error && err.message === "cancelled") return;
      const { feedimAlert } = await import("@/components/FeedimAlert");
      feedimAlert("error", t("imageUploadFailed"));
    }
  }, [onImageUpload, insertBlockAtCursor, appendBlockAtEnd, onChange]);

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await insertImage(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Drag & drop images
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragging(false), []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    for (const file of files) {
      await insertImage(file);
    }
  }, [insertImage]);

  // Paste — images → upload, HTML → akıllı temizle, fallback → düz metin
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    // 1. Görsel yapıştırma (aynen kalır)
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find(item => item.type.startsWith("image/") && item.kind === "file");

    if (imageItem && onImageUpload) {
      e.preventDefault();
      const file = imageItem.getAsFile();
      if (file) {
        await insertImage(file);
      }
      return;
    }

    e.preventDefault();

    // Başlık/caption/tablo hücresi içindeyse → sadece düz metin
    const sel = window.getSelection();
    const node = sel?.anchorNode;
    const isRestricted = node instanceof Node && (
      (node.nodeType === Node.ELEMENT_NODE
        ? (node as HTMLElement).closest("h2, h3, .image-caption, th, td, blockquote")
        : node.parentElement?.closest("h2, h3, .image-caption, th, td, blockquote"))
    );
    if (isRestricted) {
      let plainText = e.clipboardData.getData("text/plain");
      // Enforce caption character limit
      const captionEl = node instanceof Node && (
        node.nodeType === Node.ELEMENT_NODE
          ? (node as HTMLElement).closest(".image-caption")
          : node.parentElement?.closest(".image-caption")
      ) as HTMLElement | null;
      if (captionEl) {
        const current = (captionEl.textContent || "").length;
        const remaining = Math.max(0, 60 - current);
        plainText = plainText.slice(0, remaining);
        if (!plainText) return;
      }
      safariInsertText(plainText);
      return;
    }

    // 2. HTML varsa akıllı temizle
    const html = e.clipboardData.getData("text/html");
    if (html && html.trim()) {
      try {
        const { sanitizePastedHTML } = await import("@/lib/sanitizePastedHTML");
        const clean = sanitizePastedHTML(html, t("captionPlaceholder"));
        if (clean) {
          addToHistory();
          safariInsertHTML(clean);
          ensureEditorIntegrity();
          if (stripBlobImagesFromEditor()) {
            ensureEditorIntegrity();
          }
          isInternalUpdate.current = true;
          onChange(editorRef.current!.innerHTML);
          scheduleHistory();

          // Yapıştırılan dış kaynak görselleri server-side proxy ile CDN'e yükle (sıralı kuyruk + 429 retry)
          if (editorRef.current) {
            const editor = editorRef.current;
            const OWN_HOSTS = ["cdn.feedim.com", "imgspcdn.feedim.com"];
            const externalImgs = Array.from(editor.querySelectorAll("img[src]")).filter(img => {
              const src = img.getAttribute("src") || "";
              if (!src.startsWith("http")) return false;
              // SVG görselleri atla
              if (/\.svg(\?|$)/i.test(src)) { img.remove(); return false; }
              try {
                const host = new URL(src).host;
                return !OWN_HOSTS.some(h => host.includes(h)) && !host.includes("supabase.co");
              } catch { return true; }
            });

            // Küçük görselleri filtrele (avatar/ikon) — DOM'da render edildikten sonra kontrol
            const filteredImgs = externalImgs.filter(img => {
              const el = img as HTMLImageElement;
              // CSS ile açıkça küçük boyut verilmişse kaldır
              const style = el.style;
              const sw = parseInt(style.width, 10);
              const sh = parseInt(style.height, 10);
              if ((sw > 0 && sw < 64) || (sh > 0 && sh < 64)) { img.remove(); return false; }
              return true;
            });

            // Sıralı kuyruk: 3 eşzamanlı upload, 429'da geri çekilme ile yeniden deneme
            (async () => {
              const CONCURRENCY = 3;
              const MAX_RETRIES = 3;
              let active = 0;

              const uploadOne = async (img: Element) => {
                const src = img.getAttribute("src") || "";
                const keep = await shouldKeepPastedExternalImage(img as HTMLImageElement);
                if (!keep) {
                  if (img.isConnected) img.remove();
                  return;
                }
                (img as HTMLElement).style.opacity = "0.5";
                let retries = 0;
                while (retries <= MAX_RETRIES) {
                  try {
                    const res = await fetch("/api/upload/image", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ url: src }),
                    });
                    if (res.status === 429 && retries < MAX_RETRIES) {
                      retries++;
                      await new Promise(r => setTimeout(r, 2000 * retries));
                      continue;
                    }
                    const data = await res.json();
                    if (data.url && img.isConnected) {
                      img.setAttribute("src", data.url);
                      (img as HTMLElement).style.opacity = "";
                      isInternalUpdate.current = true;
                      onChange(editor.innerHTML);
                    } else {
                      // Başarısız upload — görseli kaldır
                      if (img.isConnected) img.remove();
                    }
                    break;
                  } catch {
                    if (retries < MAX_RETRIES) {
                      retries++;
                      await new Promise(r => setTimeout(r, 1500 * retries));
                    } else {
                      if (img.isConnected) img.remove();
                      break;
                    }
                  }
                }
              };

              const queue: Promise<void>[] = [];
              for (const img of filteredImgs) {
                if (active >= CONCURRENCY) {
                  await Promise.race(queue);
                }
                active++;
                const p = uploadOne(img).finally(() => {
                  active--;
                  const i = queue.indexOf(p);
                  if (i !== -1) queue.splice(i, 1);
                });
                queue.push(p);
              }
              await Promise.all(queue);
              // Son sync
              if (editor.isConnected) {
                isInternalUpdate.current = true;
                onChange(editor.innerHTML);
              }
            })();
          }

          return;
        }
      } catch {
        // Fallback: düz metin olarak yapıştır
        safariInsertText(e.clipboardData.getData("text/plain"));
        return;
      }
    }

    // 3. Fallback: düz metin
    const text = e.clipboardData.getData("text/plain");
    safariInsertText(text);
  }, [onImageUpload, insertImage, addToHistory, onChange, scheduleHistory, ensureEditorIntegrity, stripBlobImagesFromEditor]);

  // Seçim yokken cursor'daki kelimeyi seç (zengin editör standardı)
  const selectWordUnderCursor = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || !sel.isCollapsed || !sel.anchorNode) return;
    if (sel.anchorNode.nodeType !== Node.TEXT_NODE) return;
    const text = sel.anchorNode.textContent || "";
    const offset = sel.anchorOffset;
    let start = offset;
    let end = offset;
    while (start > 0 && /\S/.test(text[start - 1])) start--;
    while (end < text.length && /\S/.test(text[end])) end++;
    if (start === end) return;
    const range = document.createRange();
    range.setStart(sel.anchorNode, start);
    range.setEnd(sel.anchorNode, end);
    sel.removeAllRanges();
    sel.addRange(range);
  }, []);

  // Keyboard shortcuts — WordPress birebir
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Mention keyboard navigation
    if (mentionUsers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex(i => (i < mentionUsers.length - 1 ? i + 1 : 0));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex(i => (i > 0 ? i - 1 : mentionUsers.length - 1));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (mentionUsers[mentionIndex]) {
          insertMentionUser(mentionUsers[mentionIndex].username);
        }
        return;
      }
      if (e.key === "Escape") {
        clearMentionState();
        return;
      }
    }

    const isMod = e.metaKey || e.ctrlKey;

    // Delete selected media with Backspace/Delete
    if (selectedMedia && (e.key === "Backspace" || e.key === "Delete")) {
      e.preventDefault();
      handleBlockDelete();
      return;
    }

    // Escape deselects media
    if (selectedMedia && e.key === "Escape") {
      e.preventDefault();
      deselectAllMedia();
      return;
    }

    // Backspace at start → focus title (WordPress birebir)
    if (e.key === "Backspace" && onBackspaceAtStart && !selectedMedia) {
      const sel = window.getSelection();
      if (sel && sel.isCollapsed && sel.anchorOffset === 0) {
        const text = editorRef.current?.textContent || "";
        if (!text.trim()) {
          e.preventDefault();
          onBackspaceAtStart();
          return;
        }
      }
    }

    // Tab — table cell navigation or 4 spaces
    if (e.key === "Tab") {
      e.preventDefault();
      const ctx = getTableContext();
      if (ctx) {
        const allCells = Array.from(ctx.table.querySelectorAll("td, th"));
        const idx = allCells.indexOf(ctx.cell as HTMLTableCellElement);
        const next = e.shiftKey ? allCells[idx - 1] : allCells[idx + 1];
        if (next) {
          const range = document.createRange();
          const sel = window.getSelection();
          range.selectNodeContents(next);
          range.collapse(true);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      } else {
        safariInsertHTML("&nbsp;&nbsp;&nbsp;&nbsp;");
      }
      return;
    }

    // --- DOM-tabanlı bağlam tespiti (selection'ın her iki ucunu kontrol et) ---
    const sel = window.getSelection();
    const getClosest = (n: Node | null | undefined, selector: string): boolean => {
      if (!n) return false;
      const el = n.nodeType === Node.ELEMENT_NODE ? n as HTMLElement : n.parentElement;
      return !!el?.closest(selector);
    };
    const anchorNode = sel?.anchorNode;
    const focusNode = sel?.focusNode;
    const isInCaption = getClosest(anchorNode, ".image-caption") || getClosest(focusNode, ".image-caption");
    const isInTableCell = getClosest(anchorNode, "td, th") || getClosest(focusNode, "td, th");
    const isInHeading = getClosest(anchorNode, "h2, h3") || getClosest(focusNode, "h2, h3");
    const isInBlockquote = getClosest(anchorNode, "blockquote") || getClosest(focusNode, "blockquote");

    // Seçim aralığı kısıtlı elementle kesişiyorsa da kontrol et
    let selIntersectsHeading = false;
    let selIntersectsBlockquote = false;
    if (sel && !sel.isCollapsed && sel.rangeCount > 0 && editorRef.current) {
      const range = sel.getRangeAt(0);
      const ancestor = range.commonAncestorContainer;
      const container = ancestor.nodeType === Node.ELEMENT_NODE ? ancestor as HTMLElement : ancestor.parentElement;
      if (container) {
        for (const el of Array.from(container.querySelectorAll("h2, h3"))) {
          if (range.intersectsNode(el)) { selIntersectsHeading = true; break; }
        }
        for (const el of Array.from(container.querySelectorAll("blockquote"))) {
          if (range.intersectsNode(el)) { selIntersectsBlockquote = true; break; }
        }
      }
    }
    const headingRestricted = isInHeading || selIntersectsHeading;
    const blockquoteRestricted = isInBlockquote || selIntersectsBlockquote;

    // --- Caption guard: sadece düz metin, formatlama yok, 150 karakter sınırı ---
    if (isInCaption) {
      if (isMod) {
        const k = e.key.toLowerCase();
        if (["b", "i", "u", "k"].includes(k)) { e.preventDefault(); return; }
        if (e.shiftKey && ["7", "8", "9"].includes(e.key)) { e.preventDefault(); return; }
      }
      // Character limit for captions
      const captionEl = (anchorNode?.nodeType === Node.ELEMENT_NODE
        ? (anchorNode as HTMLElement).closest(".image-caption")
        : anchorNode?.parentElement?.closest(".image-caption")) as HTMLElement | null;
      if (captionEl && !e.metaKey && !e.ctrlKey && e.key.length === 1 && !sel?.toString()) {
        const text = captionEl.textContent || "";
        if (text.length >= 60) { e.preventDefault(); return; }
      }
    }

    // --- Tablo guard: tablo içinde başlık/liste/blockquote yok ---
    if (isInTableCell && isMod && e.shiftKey && ["7", "8", "9"].includes(e.key)) {
      e.preventDefault(); return;
    }

    // --- Heading guard: başlıklarda inline formatlama ve link yok ---
    if (headingRestricted && isMod) {
      const k = e.key.toLowerCase();
      if (["b", "i", "u", "k"].includes(k)) { e.preventDefault(); return; }
      if (e.shiftKey && ["7", "8", "9"].includes(e.key)) { e.preventDefault(); return; }
    }

    // --- Blockquote guard: tüm inline formatlama ve link engelli, hizalama serbest ---
    if (blockquoteRestricted && isMod) {
      const k = e.key.toLowerCase();
      if (["b", "i", "u", "k"].includes(k)) { e.preventDefault(); return; }
      if (e.shiftKey && ["7", "8"].includes(e.key)) { e.preventDefault(); return; }
    }

    // --- Liste guard: B/I/U/Link + hizalama serbest ---
    const isInList = document.queryCommandState("insertUnorderedList") || document.queryCommandState("insertOrderedList");
    if (isInList && isMod) {
      // Blockquote kısa yolu → engelle (liste toggle serbest)
      if (e.shiftKey && e.key === "9") { e.preventDefault(); return; }
    }

    // Ctrl+Z = Undo, Ctrl+Shift+Z = Redo
    if (isMod && e.key === "z") {
      e.preventDefault();
      if (e.shiftKey) {
        redo();
      } else {
        undo();
      }
      return;
    }

    // Ctrl+Y = Redo
    if (isMod && e.key === "y") {
      e.preventDefault();
      redo();
      return;
    }

    // Ctrl+B = Bold (kelime seçimi ile)
    if (isMod && e.key === "b") {
      e.preventDefault();
      selectWordUnderCursor();
      exec("bold");
      return;
    }

    // Ctrl+I = Italic (kelime seçimi ile)
    if (isMod && e.key === "i") {
      e.preventDefault();
      selectWordUnderCursor();
      exec("italic");
      return;
    }

    // Ctrl+U = Underline (kelime seçimi ile)
    if (isMod && e.key === "u") {
      e.preventDefault();
      selectWordUnderCursor();
      exec("underline");
      return;
    }

    // Ctrl+D → engelle (strikethrough devre dışı)
    if (isMod && e.key === "d") {
      e.preventDefault();
      return;
    }

    // Ctrl+K = Link
    if (isMod && e.key === "k") {
      e.preventDefault();
      handleLink();
      return;
    }

    // Ctrl+Shift+K = Unlink
    if (isMod && e.shiftKey && e.key === "K") {
      e.preventDefault();
      exec("unlink");
      return;
    }

    // Ctrl+S = Save draft
    if (isMod && e.key === "s" && !e.shiftKey) {
      e.preventDefault();
      onSave?.();
      return;
    }

    // Ctrl+Shift+S = Publish
    if (isMod && e.shiftKey && e.key === "S") {
      e.preventDefault();
      onPublish?.();
      return;
    }

    // Ctrl+Enter = Publish (alternative)
    if (isMod && e.key === "Enter") {
      e.preventDefault();
      onPublish?.();
      return;
    }

    // Ctrl+Shift+7 = Ordered list
    if (isMod && e.shiftKey && e.key === "7") {
      e.preventDefault();
      exec("insertOrderedList");
      return;
    }

    // Ctrl+Shift+8 = Unordered list
    if (isMod && e.shiftKey && e.key === "8") {
      e.preventDefault();
      exec("insertUnorderedList");
      return;
    }

    // Ctrl+Shift+9 = Blockquote
    if (isMod && e.shiftKey && e.key === "9") {
      e.preventDefault();
      const block = document.queryCommandValue("formatBlock");
      if (block === "blockquote") {
        exec("formatBlock", "p");
      } else {
        exec("formatBlock", "blockquote");
      }
      return;
    }

    // Table cell Enter → insert line break instead of new paragraph
    if (e.key === "Enter" && !isMod && isInTableCell) {
      e.preventDefault();
      safariInsertLineBreak();
      return;
    }

    // Caption içinde Enter → caption'dan çık, sonraki paragrafa geç
    if (e.key === "Enter" && !isMod) {
      const sel = window.getSelection();
      const captionEl = sel?.anchorNode instanceof Node
        ? (sel.anchorNode.nodeType === Node.ELEMENT_NODE
            ? (sel.anchorNode as HTMLElement).closest(".image-caption")
            : sel.anchorNode.parentElement?.closest(".image-caption"))
        : null;
      if (captionEl) {
        e.preventDefault();
        const wrapper = captionEl.closest(".image-wrapper, .embed-wrapper");
        if (wrapper && editorRef.current) {
          // Wrapper'dan sonraki kardeş element'e veya yeni paragraf oluştur
          let next = wrapper.nextElementSibling;
          if (!next || (next.tagName !== "P" && !next.textContent?.trim())) {
            const p = document.createElement("p");
            p.innerHTML = "<br>";
            wrapper.after(p);
            next = p;
          }
          const range = document.createRange();
          range.setStart(next, 0);
          range.collapse(true);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
        return;
      }
    }

    // Enter → her zaman <p> oluştur (Shift+Enter → <br>)
    if (e.key === "Enter" && !e.shiftKey && !isMod) {
      const block = document.queryCommandValue("formatBlock");
      // Liste veya blockquote içindeyken tarayıcı default davranışına izin ver
      if (block === "li" || block === "blockquote") return;
      // Heading sonrasında paragrafa dön
      if (block === "h2" || block === "h3") {
        e.preventDefault();
        exec("formatBlock", "p");
        safariInsertParagraph();
        exec("formatBlock", "p");
        return;
      }
      // Normal paragraf — Chrome varsayılanı <div> oluşturabilir, bunu düzelt
      setTimeout(() => {
        if (!editorRef.current) return;
        editorRef.current.querySelectorAll(":scope > div:not(.image-wrapper):not(.embed-wrapper)").forEach(div => {
          const p = document.createElement("p");
          p.innerHTML = div.innerHTML;
          div.replaceWith(p);
        });
      }, 0);
    }
  }, [undo, redo, selectedMedia, handleBlockDelete, deselectAllMedia, exec, onSave, onPublish, onBackspaceAtStart, handleLink, selectWordUnderCursor, getTableContext, mentionUsers, mentionIndex, insertMentionUser, clearMentionState]);

  // Sync value from parent (only when not internal)
  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value;
    }
    ensureEditorIntegrity();
  }, [value, ensureEditorIntegrity]);

  // Initialize history with initial value
  useEffect(() => {
    if (historyRef.current.length === 0 && editorRef.current) {
      historyRef.current.push({ content: editorRef.current.innerHTML });
      historyIndexRef.current = 0;
    }
  }, []);

  // --- Toolbar button config ---
  const mod = isMac ? "⌘" : "Ctrl";

  // Evrensel blok yönetim butonları (tüm toolbar'larda ortak)
  const blockManagementButtons: (ToolbarBtn | null)[] = [
    { icon: DeleteBlockSvg, onClick: handleBlockDelete, title: t("deleteBlock") },
    { icon: MoveUpSvg, onClick: handleBlockMoveUp, title: t("moveUp") },
    { icon: MoveDownSvg, onClick: handleBlockMoveDown, title: t("moveDown") },
  ];

  // Normal formatting buttons
  const formattingButtons: (ToolbarBtn | null)[] = [
    ...blockManagementButtons,
    null,
    ...(onGifClick ? [{ icon: GifSvg, onClick: onGifClick, title: "GIF" }] : []),
    ...(onEmojiClick ? [{ icon: EmojiSvg, onClick: onEmojiClick, title: t("emoji") }] : []),
    { icon: ImageSvg, onClick: handleImageClick, title: t("image") },
    null,
    { icon: BoldSvg, onClick: handleBold, title: `${t("bold")} (${mod}+B)`, key: "bold" },
    { icon: ItalicSvg, onClick: handleItalic, title: `${t("italic")} (${mod}+I)`, key: "italic" },
    { icon: UnderlineSvg, onClick: handleUnderline, title: `${t("underline")} (${mod}+U)`, key: "underline" },
    null,
    { icon: LinkSvg, onClick: handleLink, title: `${t("link")} (${mod}+K)`, key: "link" },
    null,
    { icon: H2Svg, onClick: handleH2, title: t("heading2"), key: "h2" },
    { icon: H3Svg, onClick: handleH3, title: t("heading3"), key: "h3" },
    null,
    { icon: ULSvg, onClick: handleUL, title: `${t("bulletList")} (${mod}+Shift+8)`, key: "ul" },
    { icon: OLSvg, onClick: handleOL, title: `${t("numberedList")} (${mod}+Shift+7)`, key: "ol" },
    { icon: QuoteSvg, onClick: handleQuote, title: `${t("quote")} (${mod}+Shift+9)`, key: "blockquote" },
    null,
    { icon: AlignLeftSvg, onClick: handleAlignLeft, title: t("alignLeft"), key: "alignLeft" },
    { icon: AlignCenterSvg, onClick: handleAlignCenter, title: t("alignCenter"), key: "alignCenter" },
    { icon: AlignRightSvg, onClick: handleAlignRight, title: t("alignRight"), key: "alignRight" },
    null,
    { icon: HRSvg, onClick: handleHR, title: t("horizontalRule") },
    { icon: TableSvg, onClick: handleTable, title: t("table") },
  ];

  // Heading toolbar — başlık değiştirme, hizalama, emoji + blok yönetimi
  const headingButtons: (ToolbarBtn | null)[] = [
    ...blockManagementButtons,
    null,
    ...(onEmojiClick ? [{ icon: EmojiSvg, onClick: onEmojiClick, title: t("emoji") }] : []),
    null,
    { icon: H2Svg, onClick: handleH2, title: t("heading2"), key: "h2" },
    { icon: H3Svg, onClick: handleH3, title: t("heading3"), key: "h3" },
    null,
    { icon: AlignLeftSvg, onClick: handleAlignLeft, title: t("alignLeft"), key: "alignLeft" },
    { icon: AlignCenterSvg, onClick: handleAlignCenter, title: t("alignCenter"), key: "alignCenter" },
    { icon: AlignRightSvg, onClick: handleAlignRight, title: t("alignRight"), key: "alignRight" },
  ];

  // Blockquote toolbar — alıntı toggle, hizalama, emoji + blok yönetimi
  const blockquoteButtons: (ToolbarBtn | null)[] = [
    ...blockManagementButtons,
    null,
    ...(onEmojiClick ? [{ icon: EmojiSvg, onClick: onEmojiClick, title: t("emoji") }] : []),
    null,
    { icon: QuoteSvg, onClick: handleQuote, title: `${t("quote")} (${mod}+Shift+9)`, key: "blockquote" },
    null,
    { icon: AlignLeftSvg, onClick: handleAlignLeft, title: t("alignLeft"), key: "alignLeft" },
    { icon: AlignCenterSvg, onClick: handleAlignCenter, title: t("alignCenter"), key: "alignCenter" },
    { icon: AlignRightSvg, onClick: handleAlignRight, title: t("alignRight"), key: "alignRight" },
  ];

  // Liste toolbar — B/I/U, liste toggle, hizalama, bağlantı, emoji + blok yönetimi
  const listButtons: (ToolbarBtn | null)[] = [
    ...blockManagementButtons,
    null,
    ...(onEmojiClick ? [{ icon: EmojiSvg, onClick: onEmojiClick, title: t("emoji") }] : []),
    null,
    { icon: BoldSvg, onClick: handleBold, title: `${t("bold")} (${mod}+B)`, key: "bold" },
    { icon: ItalicSvg, onClick: handleItalic, title: `${t("italic")} (${mod}+I)`, key: "italic" },
    { icon: UnderlineSvg, onClick: handleUnderline, title: `${t("underline")} (${mod}+U)`, key: "underline" },
    null,
    { icon: LinkSvg, onClick: handleLink, title: `${t("link")} (${mod}+K)`, key: "link" },
    null,
    { icon: ULSvg, onClick: handleUL, title: `${t("bulletList")} (${mod}+Shift+8)`, key: "ul" },
    { icon: OLSvg, onClick: handleOL, title: `${t("numberedList")} (${mod}+Shift+7)`, key: "ol" },
    null,
    { icon: AlignLeftSvg, onClick: handleAlignLeft, title: t("alignLeft"), key: "alignLeft" },
    { icon: AlignCenterSvg, onClick: handleAlignCenter, title: t("alignCenter"), key: "alignCenter" },
    { icon: AlignRightSvg, onClick: handleAlignRight, title: t("alignRight"), key: "alignRight" },
  ];

  // Handle crop for selected image
  const handleCropSelectedImage = useCallback(async () => {
    if (!onCropImage || !editorRef.current) return;
    const img = editorRef.current.querySelector(".image-wrapper.selected img") as HTMLImageElement | null;
    if (!img?.src) return;
    try {
      const newSrc = await onCropImage(img.src);
      if (newSrc) {
        img.src = newSrc;
        isInternalUpdate.current = true;
        onChange(editorRef.current.innerHTML);
        addToHistory();
      }
    } catch {}
  }, [onCropImage, onChange, addToHistory]);

  // Media management buttons — blok yönetimi + kırp + seçim kaldır
  const mediaButtons: (ToolbarBtn | null)[] = [
    ...blockManagementButtons,
    null,
    ...(onCropImage && (() => { const s = editorRef.current?.querySelector(".image-wrapper.selected img")?.getAttribute("src") || ""; return !/\.gif(\?|$)/i.test(s) && !s.includes("giphy."); })() ? [{ icon: CropSvg, onClick: handleCropSelectedImage, title: t("crop") }] : []),
    { icon: DeselectSvg, onClick: deselectAllMedia, title: t("deselect") },
  ];

  // Tablo toolbar — satır/sütun ekleme/silme, bold/italic/underline + blok yönetimi
  const tableButtons: (ToolbarBtn | null)[] = [
    ...blockManagementButtons,
    null,
    { icon: BoldSvg, onClick: handleBold, title: `${t("bold")} (${mod}+B)`, key: "bold" },
    { icon: ItalicSvg, onClick: handleItalic, title: `${t("italic")} (${mod}+I)`, key: "italic" },
    { icon: UnderlineSvg, onClick: handleUnderline, title: `${t("underline")} (${mod}+U)`, key: "underline" },
    null,
    { icon: TableAddRowSvg, onClick: handleTableAddRow, title: t("addRow") },
    { icon: TableAddColSvg, onClick: handleTableAddCol, title: t("addColumn") },
    null,
    { icon: TableRemoveRowSvg, onClick: handleTableRemoveRow, title: t("removeRow") },
    { icon: TableRemoveColSvg, onClick: handleTableRemoveCol, title: t("removeColumn") },
  ];

  const isInHeading = activeFormats.has("h2") || activeFormats.has("h3");
  const isInBlockquote = activeFormats.has("blockquote");
  const isInList = activeFormats.has("ul") || activeFormats.has("ol");
  const isInTable = activeFormats.has("table");
  const toolbarMode = selectedMedia ? "media" : isInTable ? "table" : isInHeading ? "heading" : isInBlockquote ? "blockquote" : isInList ? "list" : "format";
  const toolbarButtons = { media: mediaButtons, table: tableButtons, heading: headingButtons, blockquote: blockquoteButtons, list: listButtons, format: formattingButtons }[toolbarMode];

  return (
    <div className="flex flex-col min-h-screen" style={{ position: "relative" }}>
      {/* Placeholder overlay */}
      {editorEmpty && (
        <div className="absolute top-4 left-4 text-text-muted/40 pointer-events-none text-[1.05rem] leading-[1.6] z-[1]">
          {resolvedPlaceholder}
        </div>
      )}
      {/* Editor area (WordPress birebir) */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInputWithMention}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        onClick={handleEditorClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`feedim-editor-content flex-1 min-h-screen px-4 py-2 pb-[15%] text-text-primary text-[1.05rem] leading-[1.6] focus:outline-none
          ${dragging ? "ring-2 ring-accent-main/30 ring-inset rounded-xl" : ""}`}
      />

      {/* Mention dropdown */}
      {mentionDropdownPos && (
        <MentionDropdown
          users={mentionUsers}
          activeIndex={mentionIndex}
          onSelect={insertMentionUser}
          onHover={setMentionIndex}
          style={{ top: mentionDropdownPos.top }}
        />
      )}

      {/* Floating Toolbar — WordPress birebir pill design — hidden when editing captions */}
      <div ref={toolbarRef} className={`feedim-toolbar ${captionFocused ? "!hidden" : ""}`}>
        {toolbarButtons.map((btn, i) =>
          btn === null ? (
            <div key={`sep-${i}`} className="toolbar-separator" />
          ) : (
            <button
              key={`${toolbarMode}-${btn.title}`}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); btn.onClick(); }}
              title={btn.title}
              aria-label={btn.title}
              className={`i-btn !min-w-[45px] shrink-0 ${
                btn.key && activeFormats.has(btn.key)
                  ? "!bg-bg-tertiary text-text-primary"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              {btn.icon}
            </button>
          )
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleImageFile}
        className="hidden"
      />
    </div>
  );
});

export default RichTextEditor;

// --- Content cleaning for save (WordPress birebir) ---

function cleanContentForSave(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;

  // Strikethrough kaldır — <s> ve <strike> etiketlerini düz metne dönüştür
  div.querySelectorAll("s, strike").forEach(el => {
    while (el.firstChild) el.parentNode?.insertBefore(el.firstChild, el);
    el.remove();
  });

  // Remove image delete buttons
  div.querySelectorAll(".image-remove-btn").forEach(btn => btn.remove());

  // Remove selected class from wrappers
  div.querySelectorAll(".image-wrapper.selected, .embed-wrapper.selected").forEach(w => {
    w.classList.remove("selected");
  });

  // Convert image-wrapper to clean figure
  div.querySelectorAll(".image-wrapper").forEach(wrapper => {
    const img = wrapper.querySelector("img");
    const caption = wrapper.querySelector(".image-caption");
    if (!img) { wrapper.remove(); return; }

    const figure = document.createElement("figure");
    figure.appendChild(img.cloneNode(true));
    if (caption && caption.textContent?.trim()) {
      const figcaption = document.createElement("figcaption");
      figcaption.textContent = caption.textContent.trim().slice(0, 60);
      figure.appendChild(figcaption);
    }
    wrapper.replaceWith(figure);
  });

  // Boş/legacy image-caption bloklarını içerikten kaldır
  div.querySelectorAll(".image-caption").forEach(caption => {
    const captionText = (caption.textContent || "").replace(/\u00A0/g, " ").trim();
    if (!captionText) caption.remove();
  });

  // Remove embed-wrappers (no iframe support)
  div.querySelectorAll(".embed-wrapper").forEach(wrapper => {
    wrapper.remove();
  });

  // Convert editor-figure to clean figure
  div.querySelectorAll(".editor-figure").forEach(fig => {
    fig.classList.remove("editor-figure");
  });

  // Clean up figcaptions — remove placeholder attr, remove empty ones, enforce max length
  div.querySelectorAll("figcaption").forEach(fc => {
    fc.removeAttribute("contenteditable");
    fc.removeAttribute("data-placeholder");
    const text = fc.textContent?.trim();
    if (!text) {
      fc.remove();
    } else if (text.length > 60) {
      fc.textContent = text.slice(0, 60);
    }
  });

  // Heading temizliği: inline formatlama + link kaldır, <p> unwrap
  div.querySelectorAll("h2, h3").forEach(heading => {
    heading.querySelectorAll("strong, em, u, b, i, a").forEach(el => {
      while (el.firstChild) el.parentNode?.insertBefore(el.firstChild, el);
      el.remove();
    });
    heading.querySelectorAll("p").forEach(p => {
      while (p.firstChild) heading.insertBefore(p.firstChild, p);
      p.remove();
    });
    if (!heading.textContent?.trim()) heading.remove();
  });

  // Blockquote temizliği: inline formatlama + link kaldır
  div.querySelectorAll("blockquote").forEach(bq => {
    bq.querySelectorAll("strong, em, u, b, i, a").forEach(el => {
      while (el.firstChild) el.parentNode?.insertBefore(el.firstChild, el);
      el.remove();
    });
  });

  // Unwrap <p> from inside <li>
  div.querySelectorAll("li").forEach(li => {
    li.querySelectorAll("p").forEach(p => {
      while (p.firstChild) li.insertBefore(p.firstChild, p);
      p.remove();
    });
  });

  // Tablo temizliği — limitleri uygula, bozuk yapıları düzelt, boşları sil
  div.querySelectorAll("table").forEach(table => {
    // thead yoksa oluştur (bozuk yapıştırma)
    if (!table.querySelector("thead")) {
      const firstRow = table.querySelector("tr");
      if (firstRow) {
        const thead = document.createElement("thead");
        thead.appendChild(firstRow);
        table.insertBefore(thead, table.firstChild);
        // td'leri th'ye dönüştür
        thead.querySelectorAll("td").forEach(td => {
          const th = document.createElement("th");
          th.innerHTML = td.innerHTML;
          td.replaceWith(th);
        });
      }
    }
    // tbody yoksa oluştur
    if (!table.querySelector("tbody")) {
      const tbody = document.createElement("tbody");
      // thead dışındaki tr'leri tbody'ye taşı
      Array.from(table.querySelectorAll(":scope > tr")).forEach(tr => tbody.appendChild(tr));
      table.appendChild(tbody);
    }

    // Sütun limiti: max 6 — fazlasını kırp
    table.querySelectorAll("tr").forEach(tr => {
      const cells = Array.from(tr.children);
      if (cells.length > 6) {
        cells.slice(6).forEach(c => c.remove());
      }
    });

    // Satır limiti: max 20 (thead dahil) — fazlasını kırp
    const allRows = Array.from(table.querySelectorAll("tr"));
    if (allRows.length > 20) {
      allRows.slice(20).forEach(tr => tr.remove());
    }

    // Boş tbody satırlarını kaldır
    table.querySelectorAll("tr").forEach(tr => {
      const cells = Array.from(tr.querySelectorAll("td, th"));
      const allEmpty = cells.every(cell => !cell.textContent?.trim());
      if (allEmpty && tr.closest("tbody")) tr.remove();
    });

    // Tbody tamamen boşsa tabloyu sil
    const tbody = table.querySelector("tbody");
    if (tbody && !tbody.querySelector("tr")) table.remove();
  });

  // Yapıştırmadan gelebilecek gereksiz nitelikleri temizle
  div.querySelectorAll("*").forEach(el => {
    // style kaldır
    el.removeAttribute("style");
    // id kaldır
    el.removeAttribute("id");
    // data-* kaldır (editörün kendi data-placeholder hariç)
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.startsWith("data-") && attr.name !== "data-placeholder") el.removeAttribute(attr.name);
    });
    // class temizle (editör class'ları hariç)
    const cls = el.getAttribute("class");
    if (cls) {
      const allowed = ["image-wrapper", "embed-wrapper", "image-caption"];
      const kept = cls.split(" ").filter(c => allowed.includes(c));
      if (kept.length) el.setAttribute("class", kept.join(" "));
      else el.removeAttribute("class");
    }
  });

  // Görseli saran <a> kaldır — görsellerde link olamaz
  div.querySelectorAll("a").forEach(a => {
    if (a.querySelector("img") || !a.getAttribute("href")) {
      while (a.firstChild) a.parentNode?.insertBefore(a.firstChild, a);
      a.remove();
    }
  });

  // Kalan div'leri p'ye dönüştür (image-wrapper/embed-wrapper hariç)
  div.querySelectorAll("div:not(.image-wrapper):not(.embed-wrapper):not(.image-caption)").forEach(d => {
    const p = document.createElement("p");
    p.innerHTML = d.innerHTML;
    d.replaceWith(p);
  });

  // Boş li'leri temizle
  div.querySelectorAll("li").forEach(li => {
    if (!li.textContent?.trim() && !li.querySelector("img")) li.remove();
  });

  // Boş ul/ol temizle (tüm li'ler silindiyse)
  div.querySelectorAll("ul, ol").forEach(list => {
    if (!list.querySelector("li")) list.remove();
  });

  normalizeTopLevelSpacing(div);

  // Sonuç gerçekten boşsa (metin yok, görsel yok) → boş string döndür
  const finalText = (div.textContent || "").trim();
  const finalHasImg = !!div.querySelector("img");
  if (!finalText && !finalHasImg) return "";

  return div.innerHTML;
}

function normalizeTopLevelSpacing(root: HTMLDivElement): void {
  const children = Array.from(root.children);
  const emptyRuns: HTMLElement[][] = [];
  let currentRun: HTMLElement[] = [];

  for (const child of children) {
    if (isEmptyParagraph(child)) {
      currentRun.push(child as HTMLElement);
      continue;
    }

    if (currentRun.length) {
      emptyRuns.push(currentRun);
      currentRun = [];
    }
  }

  if (currentRun.length) {
    emptyRuns.push(currentRun);
  }

  for (const run of emptyRuns) {
    const prev = getPrevNonEmptySibling(run[0]);
    const next = getNextNonEmptySibling(run[run.length - 1]);

    // Baştaki/sondaki sahte boşlukları tamamen sil.
    if (!prev || !next) {
      run.forEach(node => node.remove());
      continue;
    }

    // Görsel, tablo, quote, heading, liste gibi blokların etrafında
    // ekstra boş paragraf bırakmayalım; CSS boşluğu zaten veriyor.
    if (isStructuredBlock(prev) || isStructuredBlock(next)) {
      run.forEach(node => node.remove());
      continue;
    }

    // Gerçek metin blokları arasında da en fazla 3 boş paragraf bırak.
    run.slice(3).forEach(node => node.remove());
  }
}

function isEmptyParagraph(node: Element | null): boolean {
  if (!node || node.tagName !== "P") return false;
  if (node.querySelector("img, figure, table, blockquote, ul, ol, hr, pre")) return false;
  const text = (node.textContent || "").replace(/\u00A0/g, " ").trim();
  return !text;
}

function isStructuredBlock(node: Element | null): boolean {
  if (!node) return false;
  return ["FIGURE", "TABLE", "BLOCKQUOTE", "HR", "UL", "OL", "PRE", "H2", "H3", "H4"].includes(node.tagName);
}

function getPrevNonEmptySibling(node: Element): Element | null {
  let current = node.previousElementSibling;
  while (current) {
    if (!isEmptyParagraph(current)) return current;
    current = current.previousElementSibling;
  }
  return null;
}

function getNextNonEmptySibling(node: Element): Element | null {
  let current = node.nextElementSibling;
  while (current) {
    if (!isEmptyParagraph(current)) return current;
    current = current.nextElementSibling;
  }
  return null;
}

// --- Content validation (WordPress birebir) ---

export function validatePostContent(html: string, maxWords = 5000, translations?: { contentRequired: string; minChars: string; maxWords: string; maxListItems: string; repetitiveContent: string; onlyNumbers: string }): { ok: boolean; error?: string } {
  const div = document.createElement("div");
  div.innerHTML = html;
  const text = (div.textContent || "").replace(/\s+/g, "").trim();
  const hasImage = div.querySelector("img") !== null;
  const tr = translations || { contentRequired: "Post content is required", minChars: "Post must be at least 50 characters", maxWords: `Post cannot exceed ${maxWords.toLocaleString()} words`, maxListItems: "Post cannot contain more than 300 list items", repetitiveContent: "Repetitive content detected", onlyNumbers: "Post cannot consist of only numbers" };

  // Must have content (text or image)
  if (!text && !hasImage) {
    return { ok: false, error: tr.contentRequired };
  }

  // Min 50 chars if no media
  if (!hasImage && text.length < 50) {
    return { ok: false, error: tr.minChars };
  }

  // Max word limit (plan-based)
  const wordText = (div.textContent || "").replace(/\s+/g, " ").trim();
  const wordCount = wordText ? wordText.split(" ").length : 0;
  if (wordCount > maxWords) {
    return { ok: false, error: tr.maxWords };
  }

  // Max 300 list items
  const listItems = div.querySelectorAll("li");
  if (listItems.length > 300) {
    return { ok: false, error: tr.maxListItems };
  }

  // Spam: repetition detection
  if (hasRepetition(div.textContent || "")) {
    return { ok: false, error: tr.repetitiveContent };
  }

  // Spam: only numbers
  if (text.length > 0 && /^\d+$/.test(text)) {
    return { ok: false, error: tr.onlyNumbers };
  }

  return { ok: true };
}

function hasRepetition(text: string): boolean {
  if (!text || text.length < 20) return false;
  // Check for excessive character repetition (aaaa, !!!!)
  if (/(.)\1{9,}/.test(text)) return true;
  // Check for word repetition
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  if (words.length < 5) return false;
  const freq: Record<string, number> = {};
  for (const w of words) {
    freq[w] = (freq[w] || 0) + 1;
  }
  const maxFreq = Math.max(...Object.values(freq));
  if (maxFreq > words.length * 0.6 && maxFreq > 5) return true;
  return false;
}

// --- URL normalization (WordPress birebir) ---

function normalizeUrl(url: string): string {
  let val = url.trim();
  if (!val) return "";
  if (/^(javascript:|data:)/i.test(val)) return "";
  if (/^(mailto:|tel:)/i.test(val)) return val;
  if (val.startsWith("//")) val = "https:" + val;
  else if (val.startsWith("www.")) val = "https://" + val;
  else if (!/^https?:/i.test(val)) val = "https://" + val;
  return val;
}

// --- localStorage draft helpers ---

const DRAFT_STORAGE_KEY = "feedim_post_draft";

export interface DraftData {
  title: string;
  content: string;
  tags: { id: number; name: string; slug: string }[];
  featuredImage: string;
  allowComments: boolean;
  timestamp: number;
}

export function saveDraftToStorage(draft: Omit<DraftData, "timestamp">) {
  try {
    const data: DraftData = { ...draft, timestamp: Date.now() };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export function loadDraftFromStorage(): DraftData | null {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const draft: DraftData = JSON.parse(raw);

    // Expire after 24 hours
    if (Date.now() - draft.timestamp > 24 * 60 * 60 * 1000) {
      clearDraftFromStorage();
      return null;
    }

    // Must have some content
    if (!draft.title?.trim() && !draft.content?.trim()) {
      clearDraftFromStorage();
      return null;
    }

    return draft;
  } catch {
    clearDraftFromStorage();
    return null;
  }
}

export function clearDraftFromStorage() {
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {}
}

// Types
interface ToolbarBtn {
  icon: React.ReactNode;
  onClick: () => void;
  title: string;
  key?: string;
}

// SVG Icons — WordPress Feedim birebir
const s = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const BoldSvg = <svg {...s} strokeWidth={2.5}><path d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z"/><path d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z"/></svg>;
const ItalicSvg = <svg {...s}><path d="M19 4h-9M14 20H5M15 4L9 20"/></svg>;
const UnderlineSvg = <svg {...s}><path d="M4 21H20M18 4V11C18 14.3137 15.3137 17 12 17C8.68629 17 6 14.3137 6 11V4M4 3H8M16 3H20"/></svg>;
const H2Svg = <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M4 6v12M4 12h8M12 6v12"/><path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1"/></svg>;
const H3Svg = <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M4 6v12M4 12h8M12 6v12"/><path d="M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 01-2 2c1.3.5 2 1.5 2 2.5 0 1.5-1.8 2.5-3.5 1.5"/></svg>;
const ULSvg = <svg {...s}><path d="M8 6L21 6M8 12L21 12M8 18L21 18"/><circle cx="3.5" cy="6" r=".5" fill="currentColor" stroke="none"/><circle cx="3.5" cy="12" r=".5" fill="currentColor" stroke="none"/><circle cx="3.5" cy="18" r=".5" fill="currentColor" stroke="none"/></svg>;
const OLSvg = <svg {...s}><path d="M10 6L21 6M10 12L21 12M10 18L21 18M3 5L5 4V10M5 10H3M5 10H7M7 20H3L6.4 17C6.8 16.7 7 16.2 7 15.7C7 14.8 6.2 14 5.3 14H5C4.1 14 3.3 14.6 3.1 15.5"/></svg>;
const QuoteSvg = <svg {...s}><path d="M3 21c3-3 4-6 4-9 0-3-2-4-4-3M17 21c3-3 4-6 4-9 0-3-2-4-4-3"/></svg>;
const AlignLeftSvg = <svg {...s}><path d="M3 6h21M3 12h15M3 18h18"/></svg>;
const AlignCenterSvg = <svg {...s}><path d="M3 6h21M6 12h15M4 18h19"/></svg>;
const AlignRightSvg = <svg {...s}><path d="M3 6h21M9 12h15M6 18h18"/></svg>;
const HRSvg = <svg {...s}><path d="M3 12h18"/></svg>;
const LinkSvg = <svg {...s}><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>;
const ImageSvg = <svg {...s}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>;

// Media management SVG icons
const CropSvg = <svg {...s}><path d="M6 2v4H2M18 22v-4h4M22 18H6a2 2 0 01-2-2V2"/><path d="M2 6h16a2 2 0 012 2v16"/></svg>;
const DeselectSvg = <svg {...s}><path d="M18 6L6 18M6 6l12 12"/></svg>;
const DeleteBlockSvg = <svg {...s}><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>;
const MoveUpSvg = <svg {...s}><path d="M12 19V5M5 12l7-7 7 7"/></svg>;
const MoveDownSvg = <svg {...s}><path d="M12 5v14M19 12l-7 7-7-7"/></svg>;
const EmojiSvg = <svg {...s}><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>;
const GifSvg = <svg width={20} height={20} viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="20" height="16" rx="3" stroke="currentColor" strokeWidth={1.8}/><text x="12" y="15" textAnchor="middle" fill="currentColor" fontSize="9" fontWeight="700" fontFamily="system-ui">GIF</text></svg>;
const TableSvg = <svg {...s}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>;
const TableAddRowSvg = <svg {...s}><path d="M3 3h18v6H3zM3 15h18v6H3z"/><path d="M12 9v6M9 12h6"/></svg>;
const TableAddColSvg = <svg {...s}><path d="M3 3h6v18H3zM15 3h6v18h-6z"/><path d="M9 12h6M12 9v6"/></svg>;
const TableRemoveRowSvg = <svg {...s}><path d="M3 3h18v6H3zM3 15h18v6H3z"/><path d="M9 12h6"/></svg>;
const TableRemoveColSvg = <svg {...s}><path d="M3 3h6v18H3zM15 3h6v18h-6z"/><path d="M9 12h6"/></svg>;
