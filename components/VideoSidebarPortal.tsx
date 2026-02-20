"use client";

import { createPortal } from "react-dom";
import { useState, useEffect } from "react";
import VideoSidebar, { type VideoItem } from "@/components/VideoSidebar";

interface VideoSidebarPortalProps {
  videos: VideoItem[];
}

export default function VideoSidebarPortal({ videos }: VideoSidebarPortalProps) {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const el = document.getElementById("right-sidebar-top");
    if (el) setContainer(el);

    // Hide SuggestionWidget on video pages — only show video recommendations
    const suggestions = document.getElementById("right-sidebar-suggestions");
    if (suggestions && videos.length > 0) {
      suggestions.style.display = "none";
    }

    return () => {
      // Restore SuggestionWidget on unmount
      if (suggestions) suggestions.style.display = "";
    };
  }, [videos.length]);

  if (!container || videos.length === 0) return null;

  return createPortal(
    <VideoSidebar videos={videos} title="Sonraki videolar" />,
    container
  );
}
