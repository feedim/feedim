"use client";

import { useTranslations } from "next-intl";
import UserListModal from "./UserListModal";

interface MutualFollowersModalProps {
  open: boolean;
  onClose: () => void;
  username: string;
}

export default function MutualFollowersModal({ open, onClose, username }: MutualFollowersModalProps) {
  const t = useTranslations("modals");
  return (
    <UserListModal
      open={open}
      onClose={onClose}
      title={t("mutualFollowers")}
      infoText={t("mutualFollowersInfoText")}
      fetchUrl={`/api/users/${username}/mutual-followers`}
      emptyText={t("noMutualFollowers")}
      filterTabs={[
        { key: "verified", label: t("filterVerified") },
        { key: "all", label: t("filterAll") },
      ]}
    />
  );
}
