/**
 * Global scroll lock — WordPress feedim modal.js kuralları birebir.
 *
 * - Referans sayacı: ilk modal açılınca kilitler, son modal kapanınca açar
 * - wheel + touchmove event'leri passive:false ile engellenir
 * - Modal içindeki scrollable alan (.modal-scroll-content) hariç tutulur
 * - Güvenlik: 1sn'de bir kontrol, sayaç sıfırsa lock temizlenir
 */

let lockCount = 0;

function preventScroll(e: Event) {
  // Modal içindeki scrollable content'e izin ver
  let target = e.target as HTMLElement | null;
  while (target && target !== document.body) {
    if (target.classList.contains("modal-scroll-content")) {
      // İçerik kaydırılabilir — sadece sınırlarda engelle
      const el = target;
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
    target = target.parentElement;
  }

  // Modal content dışında: her türlü scroll engelle
  e.preventDefault();
}

function saveTouchStart(e: TouchEvent) {
  // Scrollable content'in başlangıç touch pozisyonunu kaydet
  let target = e.target as HTMLElement | null;
  while (target && target !== document.body) {
    if (target.classList.contains("modal-scroll-content")) {
      (target as HTMLElement & { _touchStartY?: number })._touchStartY = e.touches[0].clientY;
      return;
    }
    target = target.parentElement;
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
