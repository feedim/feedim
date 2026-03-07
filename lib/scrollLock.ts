/**
 * Global scroll lock — WordPress feedim modal.js kuralları birebir.
 *
 * - Referans sayacı: ilk modal açılınca kilitler, son modal kapanınca açar
 * - wheel + touchmove event'leri passive:false ile engellenir
 * - Modal içindeki scrollable alan (.modal-scroll-content) hariç tutulur
 * - Güvenlik: 1sn'de bir kontrol, sayaç sıfırsa lock temizlenir
 */

let lockCount = 0;

function getComposedParent(node: Node | null): HTMLElement | null {
  if (!node) return null;

  if (node instanceof HTMLElement && node.parentElement) {
    return node.parentElement;
  }

  const parentNode = node.parentNode;
  if (parentNode instanceof HTMLElement) {
    return parentNode;
  }

  if (parentNode instanceof ShadowRoot) {
    return parentNode.host instanceof HTMLElement ? parentNode.host : null;
  }

  const root = node.getRootNode?.();
  if (root instanceof ShadowRoot) {
    return root.host instanceof HTMLElement ? root.host : null;
  }

  return null;
}

function isScrollableElement(el: HTMLElement) {
  const style = window.getComputedStyle(el);
  const overflowY = style.overflowY || style.overflow;
  return (overflowY === "auto" || overflowY === "scroll") && el.scrollHeight > el.clientHeight + 1;
}

function hasPassThroughScroll(target: EventTarget | null) {
  let current = target instanceof Node ? (target instanceof HTMLElement ? target : getComposedParent(target)) : null;

  while (current && current !== document.body) {
    if (current.hasAttribute("data-scroll-lock-allow")) {
      return true;
    }
    current = getComposedParent(current);
  }

  return false;
}

function findModalScrollContainer(target: EventTarget | null): HTMLElement | null {
  let current = target instanceof Node ? (target instanceof HTMLElement ? target : getComposedParent(target)) : null;
  let firstScrollable: HTMLElement | null = null;

  while (current && current !== document.body) {
    if (!firstScrollable && isScrollableElement(current)) {
      firstScrollable = current;
    }

    if (current.hasAttribute("data-modal")) {
      return firstScrollable;
    }

    current = getComposedParent(current);
  }

  return null;
}

function preventScroll(e: Event) {
  if (hasPassThroughScroll(e.target)) {
    return;
  }

  // Modal içindeki scrollable content'e izin ver
  const el = findModalScrollContainer(e.target);
  if (el) {
    const atTop = el.scrollTop <= 0;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;

    if (e.type === "touchmove") {
      // Touch yönünü tespit et
      const touch = (e as TouchEvent).touches[0];
      const startY = (el as HTMLElement & { _touchStartY?: number })._touchStartY ?? touch.clientY;
      const deltaY = touch.clientY - startY;
      const goingUp = deltaY < 0;
      const goingDown = deltaY > 0;

      // Sınırdaysa ve o yöne kaydırıyorsa engelle (body'ye geçmesini önle)
      if ((atTop && goingDown) || (atBottom && goingUp)) {
        e.preventDefault();
      }
      // Aksi halde içeriğin scroll'una izin ver
      return;
    }

    if (e.type === "wheel") {
      const deltaY = (e as WheelEvent).deltaY;
      if ((atTop && deltaY < 0) || (atBottom && deltaY > 0)) {
        e.preventDefault();
      }
      return;
    }

    return;
  }

  // Modal content dışında: her türlü scroll engelle
  e.preventDefault();
}

function saveTouchStart(e: TouchEvent) {
  if (hasPassThroughScroll(e.target)) {
    return;
  }

  // Scrollable content'in başlangıç touch pozisyonunu kaydet
  const el = findModalScrollContainer(e.target);
  if (el) {
    (el as HTMLElement & { _touchStartY?: number })._touchStartY = e.touches[0].clientY;
  }
}

let cleanupInterval: ReturnType<typeof setInterval> | null = null;
let popstateAttached = false;

function onPopState() {
  // Sayfa geri/ileri gidildiğinde kalan kilidi temizle
  if (lockCount > 0) forceUnlock();
}

export function lockScroll() {
  lockCount++;
  if (lockCount === 1) {
    document.body.style.overflow = "hidden";
    document.body.classList.add("modal-open");
    document.addEventListener("wheel", preventScroll, { passive: false });
    document.addEventListener("touchmove", preventScroll, { passive: false });
    document.addEventListener("touchstart", saveTouchStart, { passive: true });

    // Route değişiminde kilidi temizle
    if (!popstateAttached) {
      window.addEventListener("popstate", onPopState);
      popstateAttached = true;
    }

    // Güvenlik: periyodik kontrol — DOM'da modal yoksa kilidi kaldır
    cleanupInterval = setInterval(() => {
      if (lockCount <= 0) {
        forceUnlock();
        return;
      }
      // DOM kontrolü: body'de modal-open var ama gerçek modal yok
      if (document.body.classList.contains("modal-open")) {
        const hasModal = document.querySelector("[data-modal]") || document.querySelector(".x32flP4rs.show");
        if (!hasModal) {
          forceUnlock();
        }
      }
    }, 800);
  }
}

export function unlockScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    forceUnlock();
  }
}

function forceUnlock() {
  lockCount = 0;
  document.body.style.overflow = "";
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  document.body.classList.remove("modal-open");
  document.removeEventListener("wheel", preventScroll);
  document.removeEventListener("touchmove", preventScroll);
  document.removeEventListener("touchstart", saveTouchStart);
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}
