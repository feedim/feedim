"use client";

import UserListModal from "./UserListModal";

interface MutualFollowersModalProps {
  open: boolean;
  onClose: () => void;
  username: string;
}

export default function MutualFollowersModal({ open, onClose, username }: MutualFollowersModalProps) {
  return (
    <UserListModal
      open={open}
      onClose={onClose}
      title="Ortak Takipçiler"
      infoText="Her ikinizin de takip ettiği kişiler burada listelenir."
      fetchUrl={`/api/users/${username}/mutual-followers`}
      emptyText="Ortak takipçi yok"
      filterTabs={[
        { key: "verified", label: "Doğrulanmış" },
        { key: "all", label: "Tümü" },
      ]}
    />
  );
}
