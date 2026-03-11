"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import VideoSidebar, { type VideoItem } from "@/components/VideoSidebar";
import { useHydrated } from "@/lib/useHydrated";

interface VideoSidebarPortalProps {
  videos: VideoItem[];
}

export default function VideoSidebarPortal({ videos }: VideoSidebarPortalProps) {
  const t = useTranslations("video");
  const hydrated = useHydrated();
  const container = useMemo(
    () => (hydrated ? document.getElementById("right-sidebar-top") : null),
    [hydrated],
  );

  useEffect(() => {
    // Remove skeleton placeholder
    const skeleton = document.getElementById("right-sidebar-video-skeleton");
    if (skeleton) skeleton.remove();
  }, []);

  if (!container) return null;

  return createPortal(
    <VideoSidebar videos={videos} title={t("nextVideos")} />,
    container
  );
}
