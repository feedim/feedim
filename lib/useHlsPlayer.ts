"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface QualityLevel {
  height: number;
  width: number;
  bitrate: number;
  name: string;
}

interface UseHlsPlayerOptions {
  hlsUrl?: string;
  fallbackSrc: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  startPosition?: number;
}

interface UseHlsPlayerReturn {
  isHls: boolean;
  qualities: QualityLevel[];
  currentQuality: number; // -1 = auto
  setQuality: (index: number) => void;
}

interface HlsLevelData {
  height: number;
  width: number;
  bitrate: number;
}

interface HlsManifestData {
  levels: HlsLevelData[];
}

interface HlsErrorData {
  fatal: boolean;
  type: string;
}

interface HlsInstance {
  currentLevel: number;
  loadSource: (url: string) => void;
  attachMedia: (media: HTMLMediaElement) => void;
  on: (event: string, listener: (event: string, data: unknown) => void) => void;
  startLoad: () => void;
  recoverMediaError: () => void;
  destroy: () => void;
}

interface HlsConstructor {
  new (config: {
    startPosition: number;
    capLevelToPlayerSize: boolean;
    maxBufferLength: number;
    maxMaxBufferLength: number;
  }): HlsInstance;
  isSupported: () => boolean;
  Events: {
    MANIFEST_PARSED: string;
    ERROR: string;
  };
  ErrorTypes: {
    NETWORK_ERROR: string;
    MEDIA_ERROR: string;
  };
}

export function useHlsPlayer({
  hlsUrl,
  fallbackSrc,
  videoRef,
  startPosition = 0,
}: UseHlsPlayerOptions): UseHlsPlayerReturn {
  const hlsRef = useRef<HlsInstance | null>(null);
  const [qualities, setQualities] = useState<QualityLevel[]>([]);
  const [currentQuality, setCurrentQuality] = useState(-1);
  const [isHls, setIsHls] = useState(false);

  const setQuality = useCallback((index: number) => {
    const hls = hlsRef.current;
    if (!hls) return;
    hls.currentLevel = index; // -1 for auto
    setCurrentQuality(index);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hlsUrl) {
      setIsHls(false);
      return;
    }

    // Safari: native HLS support — no hls.js needed
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = hlsUrl;
      if (startPosition > 0) {
        const onLoaded = () => {
          if (typeof video.fastSeek === "function") {
            video.fastSeek(startPosition);
          } else {
            video.currentTime = startPosition;
          }
        };
        video.addEventListener("loadedmetadata", onLoaded, { once: true });
      }
      setIsHls(true);
      return;
    }

    // Non-Safari: dynamic import hls.js
    let mounted = true;
    import("hls.js").then(({ default: ImportedHls }) => {
      const Hls = ImportedHls as HlsConstructor;
      if (!mounted || !video) return;

      if (!Hls.isSupported()) {
        // MSE not supported — fallback to raw MP4
        video.src = fallbackSrc;
        setIsHls(false);
        return;
      }

      const hls = new Hls({
        startPosition: startPosition > 0 ? startPosition : -1,
        capLevelToPlayerSize: true,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      });

      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
      hlsRef.current = hls;
      setIsHls(true);

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        if (!mounted) return;
        const manifest = data as HlsManifestData;
        const levels: QualityLevel[] = manifest.levels.map((level) => ({
          height: level.height,
          width: level.width,
          bitrate: level.bitrate,
          name: `${level.height}p`,
        }));
        setQualities(levels);
        setCurrentQuality(-1);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        const errorData = data as HlsErrorData;
        if (errorData.fatal) {
          switch (errorData.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              // Unrecoverable — fall back to raw MP4
              hls.destroy();
              hlsRef.current = null;
              video.src = fallbackSrc;
              setIsHls(false);
              break;
          }
        }
      });
    });

    return () => {
      mounted = false;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      setQualities([]);
      setCurrentQuality(-1);
      setIsHls(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hlsUrl]);

  return { isHls, qualities, currentQuality, setQuality };
}
