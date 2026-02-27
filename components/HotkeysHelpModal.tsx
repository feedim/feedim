"use client";

import { useTranslations } from "next-intl";
import Modal from "@/components/modals/Modal";

interface HotkeysHelpModalProps {
  open: boolean;
  onClose: () => void;
}

const Kbd = ({ children }: { children: React.ReactNode }) => (
  <kbd className="px-1.5 py-0.5 rounded-md bg-bg-tertiary text-text-primary text-[0.72rem] font-mono border border-border-primary/40">
    {children}
  </kbd>
);

function Section({ title, items }: { title: string; items: [string, string][] }) {
  return (
    <div className="space-y-2">
      <h4 className="text-[0.78rem] font-semibold text-text-muted uppercase tracking-wider">{title}</h4>
      <div className="space-y-1.5">
        {items.map(([keys, label]) => (
          <div key={`${title}-${keys}`} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 shrink-0">
              {keys.split(" ").map((k, i) => (
                <Kbd key={`${keys}-${i}`}>{k}</Kbd>
              ))}
            </div>
            <span className="text-[0.84rem] text-text-primary/90 font-semibold flex-1 text-right">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HotkeysHelpModal({ open, onClose }: HotkeysHelpModalProps) {
  const t = useTranslations("hotkeys");
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("title")}
      size="md"
      centerOnDesktop
      animationType={3}
      infoText={t("infoText")}
    >
      <div className="px-5 pb-5 space-y-5">
        <p className="text-[0.86rem] text-text-muted">
          {t("disclaimer")}
        </p>

        <Section
          title={t("general")}
          items={[
            ["/", t("search")],
            ["Shift+/", t("showShortcuts")],
            ["Esc", t("closeModal")],
          ]}
        />

        <Section
          title={t("navigation")}
          items={[
            ["g h", t("home")],
            ["g e", t("explore")],
            ["g m", t("moments")],
            ["g p", t("profile")],
            ["g s", t("settings")],
            ["g n", t("notifications")],
          ]}
        />

        <Section
          title={t("interaction")}
          items={[
            ["c", t("comments")],
            ["l", t("like")],
            ["b", t("save")],
            ["s", t("share")],
            ["e", t("editProfileShortcut")],
          ]}
        />

        <Section
          title={t("videoPlayer")}
          items={[
            ["Space", t("playPause")],
            ["k", t("playPause")],
            ["j", t("back10s")],
            ["l", t("forward10s")],
            ["←", t("back5s")],
            ["→", t("forward5s")],
            ["↑", t("volumeUp")],
            ["↓", t("volumeDown")],
            ["m", t("muteToggle")],
            ["f", t("fullscreen")],
            ["t", t("cinemaMode")],
            ["p", t("pip")],
            ["<", t("speedDown")],
            [">", t("speedUp")],
            ["0", t("goToStart")],
            ["1", t("goTo10")],
            ["9", t("goTo90")],
            ["Home", t("goToStart")],
            ["End", t("goToEnd")],
          ]}
        />

        <Section
          title={t("momentsSection")}
          items={[
            ["Space", t("playPause")],
            ["k", t("playPause")],
            ["j", t("back5s")],
            ["l", t("forward5s")],
            ["↑", t("volumeUp")],
            ["↓", t("volumeDown")],
            ["m", t("muteToggle")],
            ["f", t("fullscreen")],
          ]}
        />
      </div>
    </Modal>
  );
}
