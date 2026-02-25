"use client";

import { useTranslations } from "next-intl";
import UserListModal from "./UserListModal";

interface FollowersModalProps {
  open: boolean;
  onClose: () => void;
  username: string;
}

export default function FollowersModal({ open, onClose, username }: FollowersModalProps) {
  const t = useTranslations("modals");
  return (
    <UserListModal
      open={open}
      onClose={onClose}
      title={t("followers")}
      infoText={t("followersInfoText")}
      fetchUrl={`/api/users/${username}/followers`}
      emptyText={t("noFollowers")}
      filterTabs={[
        { key: "verified", label: t("filterVerified") },
        { key: "all", label: t("filterAll") },
        { key: "following", label: t("filterFollowing") },
      ]}
    />
  );
}
