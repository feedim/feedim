"use client";

import UserListModal from "./UserListModal";

interface FollowersModalProps {
  open: boolean;
  onClose: () => void;
  username: string;
}

export default function FollowersModal({ open, onClose, username }: FollowersModalProps) {
  return (
    <UserListModal
      open={open}
      onClose={onClose}
      title="Takipçiler"
      infoText="Bu kullanıcıyı takip eden kişiler burada listelenir."
      fetchUrl={`/api/users/${username}/followers`}
      emptyText="Henüz takipçi yok"
      filterTabs={[
        { key: "verified", label: "Doğrulanmış" },
        { key: "all", label: "Tümü" },
        { key: "following", label: "Takip Edilenler" },
      ]}
    />
  );
}
