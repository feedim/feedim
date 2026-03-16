"use client";

import { useCallback, useRef, type ChangeEvent, type DragEvent } from "react";
import {
  applyTrimmedVideo,
  clearSelectedVideo,
  handleThumbnailFileSelection,
  initializeSelectedVideo,
  optimizeVideoForUpload,
  runManagedVideoUpload,
  startVideoDiagnostics,
} from "@/components/create/videoMedia";

interface UploadMessages {
  uploadInitFailed: string;
  uploadFailed: (status: number) => string;
  videoUploadFailed: string;
  uploadCancelled: string;
}

interface ValidationResultBase {
  duration: number;
}

interface UseManagedVideoMediaArgs<TValidation extends ValidationResultBase> {
  maxSizeMb: number;
  targetRatio: number;
  currentPreviewUrl: string;
  unsupportedFormatMessage: string;
  fileTooLargeMessage: string;
  invalidFileMessage: string;
  fileReadErrorMessage: string;
  imageUploadFailedMessage: string;
  uploadErrorFallback: string;
  uploadMessages: UploadMessages;
  reportError: (message: string) => void;
  validateSelection: (file: File) => Promise<TValidation>;
  getDuration: (result: TValidation) => number;
  getValidationError?: (result: TValidation) => string | null;
  generateThumbnail: (file: File) => Promise<string>;
  setVideoFile: (file: File | null) => void;
  setVideoUrl: (url: string) => void;
  setVideoDuration: (duration: number) => void;
  setVideoPreviewUrl: (url: string) => void;
  setUploading: (uploading: boolean) => void;
  setUploadProgress: (progress: number) => void;
  setThumbnail: (thumbnail: string) => void;
  setPreviewPaused: (paused: boolean) => void;
  setCropSrc: (src: string | null) => void;
  setFrameHashes: (hashes: { frameIndex: number; hash: string }[]) => void;
  setAudioHashes: (hashes: { chunkIndex: number; hash: string }[]) => void;
  setNsfwFrameUrls: (urls: string[]) => void;
  setVideoFeedimId?: (id: string) => void;
  progressMap?: (fraction: number) => number;
  initProgress?: number;
  /** Pass "video" or "moment" to enable server-side H.264/AAC optimization */
  optimizeContentType?: "video" | "moment";
}

export default function useManagedVideoMedia<TValidation extends ValidationResultBase>({
  maxSizeMb,
  targetRatio,
  currentPreviewUrl,
  unsupportedFormatMessage,
  fileTooLargeMessage,
  invalidFileMessage,
  fileReadErrorMessage,
  imageUploadFailedMessage,
  uploadErrorFallback,
  uploadMessages,
  reportError,
  validateSelection,
  getDuration,
  getValidationError,
  generateThumbnail,
  setVideoFile,
  setVideoUrl,
  setVideoDuration,
  setVideoPreviewUrl,
  setUploading,
  setUploadProgress,
  setThumbnail,
  setPreviewPaused,
  setCropSrc,
  setFrameHashes,
  setAudioHashes,
  setNsfwFrameUrls,
  setVideoFeedimId,
  progressMap,
  initProgress,
  optimizeContentType,
}: UseManagedVideoMediaArgs<TValidation>) {
  const uploadAbortRef = useRef<AbortController | null>(null);

  const uploadVideo = useCallback(
    (file: File) => {
      void runManagedVideoUpload({
        file,
        uploadAbortRef,
        messages: uploadMessages,
        setUploading,
        setUploadProgress,
        initProgress,
        mapProgress: progressMap,
        optimizeContentType,
        onSuccess: (publicUrl, feedimId) => {
          setVideoUrl(publicUrl);
          if (feedimId) setVideoFeedimId?.(feedimId);
        },
        onError: (error) => {
          reportError(error.message || uploadErrorFallback);
          setVideoFile(null);
          setVideoPreviewUrl("");
          setVideoDuration(0);
        },
      });
    },
    [
      initProgress,
      optimizeContentType,
      progressMap,
      reportError,
      setUploadProgress,
      setUploading,
      setVideoDuration,
      setVideoFile,
      setVideoPreviewUrl,
      setVideoUrl,
      uploadErrorFallback,
      uploadMessages,
    ]
  );

  const handleVideoSelect = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("video/")) {
        reportError(unsupportedFormatMessage);
        return;
      }
      if (file.size > maxSizeMb * 1024 * 1024) {
        reportError(fileTooLargeMessage);
        return;
      }

      let result: TValidation;
      try {
        result = await validateSelection(file);
      } catch (err) {
        reportError((err as Error).message);
        return;
      }

      const validationError = getValidationError?.(result);
      if (validationError) {
        reportError(validationError);
        return;
      }

      await initializeSelectedVideo({
        file,
        duration: getDuration(result),
        currentPreviewUrl,
        generateThumbnail,
        setVideoFile,
        setVideoDuration,
        setVideoPreviewUrl,
        setUploading,
        setUploadProgress,
        setThumbnail,
      });

      startVideoDiagnostics({
        file,
        setFrameHashes,
        setAudioHashes,
        setNsfwFrameUrls,
      });

      const uploadFile = await optimizeVideoForUpload(file);
      uploadVideo(uploadFile);
    },
    [
      currentPreviewUrl,
      fileTooLargeMessage,
      generateThumbnail,
      getDuration,
      getValidationError,
      imageUploadFailedMessage,
      maxSizeMb,
      reportError,
      setAudioHashes,
      setFrameHashes,
      setNsfwFrameUrls,
      setThumbnail,
      setUploadProgress,
      setUploading,
      setVideoDuration,
      setVideoFile,
      setVideoPreviewUrl,
      unsupportedFormatMessage,
      uploadVideo,
      validateSelection,
    ]
  );

  const handleVideoInput = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void handleVideoSelect(file);
      e.target.value = "";
    },
    [handleVideoSelect]
  );

  const handleVideoDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      const file = Array.from(e.dataTransfer.files).find((candidate) => candidate.type.startsWith("video/"));
      if (file) void handleVideoSelect(file);
    },
    [handleVideoSelect]
  );

  const removeVideo = useCallback(() => {
    clearSelectedVideo({
      uploadAbortRef,
      currentPreviewUrl,
      setVideoFile,
      setVideoUrl,
      setVideoPreviewUrl,
      setVideoDuration,
      setUploadProgress,
      setUploading,
      setThumbnail,
    });
  }, [
    currentPreviewUrl,
    setThumbnail,
    setUploadProgress,
    setUploading,
    setVideoDuration,
    setVideoFile,
    setVideoPreviewUrl,
    setVideoUrl,
  ]);

  const handleTrim = useCallback(
    async (trimmedFile: File, newDuration: number) => {
      await applyTrimmedVideo({
        trimmedFile,
        newDuration,
        currentPreviewUrl,
        generateThumbnail,
        setVideoFile,
        setVideoDuration,
        setVideoPreviewUrl,
        setPreviewPaused,
        setThumbnail,
        setVideoUrl,
      });
    },
    [
      currentPreviewUrl,
      generateThumbnail,
      setPreviewPaused,
      setThumbnail,
      setVideoDuration,
      setVideoFile,
      setVideoPreviewUrl,
      setVideoUrl,
    ]
  );

  const handleThumbUpload = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        await handleThumbnailFileSelection({
          file,
          targetRatio,
          messages: {
            invalidFile: invalidFileMessage,
            fileTooLarge: () => fileTooLargeMessage,
            fileReadError: fileReadErrorMessage,
          },
          onNeedCrop: setCropSrc,
          onReady: setThumbnail,
        });
      } catch {
        reportError(imageUploadFailedMessage);
      }
      e.target.value = "";
    },
    [
      fileTooLargeMessage,
      fileReadErrorMessage,
      imageUploadFailedMessage,
      invalidFileMessage,
      reportError,
      setCropSrc,
      setThumbnail,
      targetRatio,
    ]
  );

  return {
    uploadAbortRef,
    handleVideoSelect,
    handleVideoInput,
    handleVideoDrop,
    removeVideo,
    handleTrim,
    handleThumbUpload,
    uploadVideo,
  };
}
