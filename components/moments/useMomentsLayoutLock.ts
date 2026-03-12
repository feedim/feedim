"use client";

import { useCallback, useEffect } from "react";

interface UseMomentsLayoutLockOptions {
  setMobileNavVisible: (visible: boolean) => void;
  hasOpenModal: boolean;
}

export function useMomentsLayoutLock({
  setMobileNavVisible,
  hasOpenModal,
}: UseMomentsLayoutLockOptions) {
  const reassertLayout = useCallback(() => {
    const main = document.querySelector("main");
    const wrapper = main?.firstElementChild as HTMLElement | null;

    if (main) {
      main.style.paddingBottom = "0";
      main.style.paddingTop = "0";
      main.style.overflow = "hidden";
      main.style.height = "100dvh";
      main.style.minHeight = "0";
      main.style.maxHeight = "100dvh";
    }

    if (wrapper) {
      wrapper.style.height = "100%";
      wrapper.style.maxHeight = "100%";
      wrapper.style.overflow = "hidden";
    }
  }, []);

  useEffect(() => {
    setMobileNavVisible(false);
    document.body.style.overflow = "hidden";
    reassertLayout();

    return () => {
      setMobileNavVisible(true);
      document.body.style.overflow = "";
      const main = document.querySelector("main");
      const wrapper = main?.firstElementChild as HTMLElement | null;

      if (main) {
        main.style.paddingBottom = "";
        main.style.paddingTop = "";
        main.style.overflow = "";
        main.style.height = "";
        main.style.minHeight = "";
        main.style.maxHeight = "";
      }

      if (wrapper) {
        wrapper.style.height = "";
        wrapper.style.maxHeight = "";
        wrapper.style.overflow = "";
      }
    };
  }, [reassertLayout, setMobileNavVisible]);

  useEffect(() => {
    if (!hasOpenModal) {
      reassertLayout();
    }
  }, [hasOpenModal, reassertLayout]);

  useEffect(() => {
    document.documentElement.setAttribute("data-moments-active", "1");
    return () => document.documentElement.removeAttribute("data-moments-active");
  }, []);

  return { reassertLayout };
}
