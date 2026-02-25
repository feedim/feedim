"use client";

import { useTranslations } from "next-intl";
import UserListModal from "./UserListModal";

interface FollowingModalProps {
  open: boolean;
  onClose: () => void;
  username: string;
}

export default function FollowingModal({ open, onClose, username }: FollowingModalProps) {
  const t = useTranslations("modals");
  return (
    <UserListModal
      open={open}
      onClose={onClose}
      title={t("followings")}
      infoText={t("followingsInfoText")}
      fetchUrl={`/api/users/${username}/following`}
      emptyText={t("noFollowing")}
      filterTabs={[
        { key: "verified", label: t("filterVerified") },
        { key: "all", label: t("filterAll") },
        { key: "following", label: t("filterFollowing") },
      ]}
    />
  );
}
