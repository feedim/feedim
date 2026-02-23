"use client";

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
            <span className="text-[0.84rem] text-text-primary/90 flex-1 text-right">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HotkeysHelpModal({ open, onClose }: HotkeysHelpModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Klavye Kısayolları"
      size="md"
      centerOnDesktop
      animationType={3}
      infoText="Uygulamayı daha hızlı kullanmak için klavye kısayollarını kullanabilirsin."
    >
      <div className="px-4 pb-4 space-y-5">
        <p className="text-[0.86rem] text-text-muted">
          Yazı alanlarında çalışmaz. Video oynatıcı açıksa kısayollar önceliklidir.
        </p>

        <Section
          title="Genel"
          items={[
            ["/", "Arama"],
            ["Shift+/", "Kısayolları göster"],
            ["Esc", "Modal/menü kapat"],
          ]}
        />

        <Section
          title="Gezinme"
          items={[
            ["g h", "Ana sayfa"],
            ["g e", "Keşfet"],
            ["g m", "Moments"],
            ["g p", "Profil"],
            ["g s", "Ayarlar"],
            ["g n", "Bildirimler"],
          ]}
        />

        <Section
          title="Etkileşim"
          items={[
            ["c", "Yorumlar"],
            ["l", "Beğen"],
            ["b", "Kaydet"],
            ["s", "Paylaş"],
            ["e", "Profili düzenle (profil sayfası)"],
          ]}
        />

        <Section
          title="Video Oynatıcı"
          items={[
            ["Space", "Oynat / Duraklat"],
            ["k", "Oynat / Duraklat"],
            ["j", "10 sn geri"],
            ["l", "10 sn ileri"],
            ["←", "5 sn geri"],
            ["→", "5 sn ileri"],
            ["↑", "Sesi artır"],
            ["↓", "Sesi azalt"],
            ["m", "Sesi aç/kapat"],
            ["f", "Tam ekran"],
            ["t", "Sinema modu"],
            ["p", "Pencerede oynat"],
            ["0", "Başa git"],
            ["1", "%10'a git"],
            ["9", "%90'a git"],
            ["Home", "Başa git"],
            ["End", "Sona git"],
          ]}
        />

        <Section
          title="Moments"
          items={[
            ["Space", "Oynat / Duraklat"],
            ["k", "Oynat / Duraklat"],
            ["j", "5 sn geri"],
            ["l", "5 sn ileri"],
            ["↑", "Sesi artır"],
            ["↓", "Sesi azalt"],
            ["m", "Sesi aç/kapat"],
            ["f", "Tam ekran"],
          ]}
        />
      </div>
    </Modal>
  );
}
