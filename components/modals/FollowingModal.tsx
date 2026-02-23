"use client";

import UserListModal from "./UserListModal";

interface FollowingModalProps {
  open: boolean;
  onClose: () => void;
  username: string;
}

export default function FollowingModal({ open, onClose, username }: FollowingModalProps) {
  return (
    <UserListModal
      open={open}
      onClose={onClose}
      title="Takip Edilenler"
      infoText="Bu kullanıcının takip ettiği kişiler burada listelenir."
      fetchUrl={`/api/users/${username}/following`}
      emptyText="Henüz takip edilen yok"
      filterTabs={[
        { key: "verified", label: "Doğrulanmış" },
        { key: "all", label: "Tümü" },
        { key: "following", label: "Takip Edilenler" },
      ]}
    />
  );
}
