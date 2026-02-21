"use client";

import UserListModal from "./UserListModal";

interface LikesModalProps {
  open: boolean;
  onClose: () => void;
  postId: number;
}

export default function LikesModal({ open, onClose, postId }: LikesModalProps) {
  return (
    <UserListModal
      open={open}
      onClose={onClose}
      title="Beğeniler"
      infoText="Gönderiyi beğenen kişiler burada listelenir."
      fetchUrl={`/api/posts/${postId}/likes`}
      emptyText="Henüz beğeni yok"
      filterTabs={[
        { key: "verified", label: "Doğrulanmış" },
        { key: "all", label: "Tümü" },
        { key: "following", label: "Takip Edilenler" },
      ]}
    />
  );
}
