"use client";

import { useTranslations } from "next-intl";
import UserListModal from "./UserListModal";

interface LikesModalProps {
  open: boolean;
  onClose: () => void;
  postId: number;
}

export default function LikesModal({ open, onClose, postId }: LikesModalProps) {
  const t = useTranslations("modals");
  return (
    <UserListModal
      open={open}
      onClose={onClose}
      title={t("likes")}
      infoText={t("likesInfoText")}
      fetchUrl={`/api/posts/${postId}/likes`}
      emptyText={t("noLikes")}
      filterTabs={[
        { key: "verified", label: t("filterVerified") },
        { key: "all", label: t("filterAll") },
        { key: "following", label: t("filterFollowing") },
      ]}
    />
  );
}
