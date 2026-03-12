interface VideoUploadMessages {
  uploadInitFailed: string;
  uploadFailed: (status: number) => string;
  videoUploadFailed: string;
  uploadCancelled: string;
}

interface UploadVideoWithPresignOptions {
  file: File;
  signal: AbortSignal;
  messages: VideoUploadMessages;
  onInitComplete?: () => void;
  onUploadProgress?: (fraction: number) => void;
}

interface PrepareThumbnailMessages {
  invalidFile: string;
  fileTooLarge: (size: number) => string;
  fileReadError: string;
}

interface VideoThumbnailMessages {
  thumbnailCreateFailed: string;
  videoFileReadError: string;
}

interface VideoMetadataOptions {
  timeoutMs?: number;
  rejectOnError?: boolean;
  readErrorMessage?: string;
}

interface MediaHashEntry {
  frameIndex?: number;
  chunkIndex?: number;
  hash: string;
}

interface ClearSelectedVideoOptions {
  uploadAbortRef: { current: AbortController | null };
  currentPreviewUrl: string;
  setVideoFile: (file: File | null) => void;
  setVideoUrl: (url: string) => void;
  setVideoPreviewUrl: (url: string) => void;
  setVideoDuration: (duration: number) => void;
  setUploadProgress: (progress: number) => void;
  setUploading: (uploading: boolean) => void;
  setThumbnail: (thumbnail: string) => void;
}

interface ApplyTrimmedVideoOptions {
  trimmedFile: File;
  newDuration: number;
  currentPreviewUrl: string;
  generateThumbnail: (file: File) => Promise<string>;
  setVideoFile: (file: File | null) => void;
  setVideoDuration: (duration: number) => void;
  setVideoPreviewUrl: (url: string) => void;
  setPreviewPaused: (paused: boolean) => void;
  setThumbnail: (thumbnail: string) => void;
  setVideoUrl: (url: string) => void;
}

interface HandleThumbnailFileSelectionOptions {
  file: File;
  targetRatio: number;
  messages: PrepareThumbnailMessages;
  onNeedCrop: (dataUrl: string) => void;
  onReady: (dataUrl: string) => void;
}

interface InitializeSelectedVideoOptions {
  file: File;
  duration: number;
  currentPreviewUrl?: string;
  generateThumbnail: (file: File) => Promise<string>;
  setVideoFile: (file: File | null) => void;
  setVideoDuration: (duration: number) => void;
  setVideoPreviewUrl: (url: string) => void;
  setUploading: (uploading: boolean) => void;
  setUploadProgress: (progress: number) => void;
  setThumbnail: (thumbnail: string) => void;
}

interface StartVideoDiagnosticsOptions {
  file: File;
  setFrameHashes: (hashes: { frameIndex: number; hash: string }[]) => void;
  setAudioHashes: (hashes: { chunkIndex: number; hash: string }[]) => void;
  setNsfwFrameUrls: (urls: string[]) => void;
}

interface RunManagedVideoUploadOptions {
  file: File;
  uploadAbortRef: { current: AbortController | null };
  messages: VideoUploadMessages;
  setUploading: (uploading: boolean) => void;
  setUploadProgress: (progress: number) => void;
  onSuccess: (publicUrl: string) => void;
  onError: (error: Error) => void;
  mapProgress?: (fraction: number) => number;
  initProgress?: number;
}

export async function uploadFrameSampleImages(blobs: Blob[]): Promise<string[]> {
  const urls: string[] = [];

  for (const blob of blobs) {
    try {
      const fd = new FormData();
      fd.append("file", new File([blob], `nsfw-sample-${Date.now()}.jpg`, { type: "image/jpeg" }));
      fd.append("fileName", `nsfw-sample-${Date.now()}.jpg`);
      const res = await fetch("/api/upload/image", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok && data.url) urls.push(data.url);
    } catch {
      // Skip broken sample uploads; content creation should continue.
    }
  }

  return urls;
}

export async function uploadVideoWithPresign({
  file,
  signal,
  messages,
  onInitComplete,
  onUploadProgress,
}: UploadVideoWithPresignOptions): Promise<string> {
  const initRes = await fetch("/api/upload/video", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || "video/mp4",
      fileSize: file.size,
    }),
    signal,
  });

  const initData = await initRes.json();
  if (!initRes.ok) {
    throw new Error(initData.error || messages.uploadInitFailed);
  }

  const { uploadUrl, publicUrl } = initData;
  onInitComplete?.();

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type || "video/mp4");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onUploadProgress?.(event.loaded / event.total);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(messages.uploadFailed(xhr.status)));
      }
    };

    xhr.onerror = () => reject(new Error(messages.videoUploadFailed));
    xhr.onabort = () => reject(new DOMException(messages.uploadCancelled, "AbortError"));

    signal.addEventListener("abort", () => xhr.abort());
    xhr.send(file);
  });

  return publicUrl;
}

export async function prepareThumbnailDataUrl(
  file: File,
  targetRatio: number,
  messages: PrepareThumbnailMessages
): Promise<{ dataUrl: string; needsCrop: boolean }> {
  if (!file.type.startsWith("image/")) {
    throw new Error(messages.invalidFile);
  }

  const {
    compressImage,
    fileToDataUrl,
    getImageDimensions,
    isAspectClose,
    isSourceImageTooLarge,
    MAX_SOURCE_IMAGE_SIZE_MB,
  } = await import("@/lib/imageCompression");

  if (isSourceImageTooLarge(file)) {
    throw new Error(messages.fileTooLarge(MAX_SOURCE_IMAGE_SIZE_MB));
  }

  const compressed = await compressImage(file, { maxSizeMB: 1, maxWidthOrHeight: 1920 });
  const dataUrl = await fileToDataUrl(compressed).catch(() => {
    throw new Error(messages.fileReadError);
  });
  const actualRatio = await getImageDimensions(dataUrl)
    .then((dims) => dims.ratio)
    .catch(() => targetRatio);

  return {
    dataUrl,
    needsCrop: !isAspectClose(actualRatio, targetRatio),
  };
}

export function clearSelectedVideo({
  uploadAbortRef,
  currentPreviewUrl,
  setVideoFile,
  setVideoUrl,
  setVideoPreviewUrl,
  setVideoDuration,
  setUploadProgress,
  setUploading,
  setThumbnail,
}: ClearSelectedVideoOptions) {
  if (uploadAbortRef.current) uploadAbortRef.current.abort();
  if (currentPreviewUrl.startsWith("blob:")) URL.revokeObjectURL(currentPreviewUrl);
  setVideoFile(null);
  setVideoUrl("");
  setVideoPreviewUrl("");
  setVideoDuration(0);
  setUploadProgress(0);
  setUploading(false);
  setThumbnail("");
}

export async function applyTrimmedVideo({
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
}: ApplyTrimmedVideoOptions) {
  setVideoFile(trimmedFile);
  setVideoDuration(newDuration);
  const newUrl = URL.createObjectURL(trimmedFile);
  if (currentPreviewUrl.startsWith("blob:")) URL.revokeObjectURL(currentPreviewUrl);
  setVideoPreviewUrl(newUrl);
  setPreviewPaused(false);

  try {
    const thumb = await generateThumbnail(trimmedFile);
    setThumbnail(thumb);
  } catch {
    // Keep the existing thumbnail when regeneration fails.
  }

  setVideoUrl("");
}

export async function handleThumbnailFileSelection({
  file,
  targetRatio,
  messages,
  onNeedCrop,
  onReady,
}: HandleThumbnailFileSelectionOptions) {
  const { dataUrl, needsCrop } = await prepareThumbnailDataUrl(file, targetRatio, messages);
  if (needsCrop) {
    onNeedCrop(dataUrl);
    return;
  }
  onReady(dataUrl);
}

export async function initializeSelectedVideo({
  file,
  duration,
  currentPreviewUrl,
  generateThumbnail,
  setVideoFile,
  setVideoDuration,
  setVideoPreviewUrl,
  setUploading,
  setUploadProgress,
  setThumbnail,
}: InitializeSelectedVideoOptions) {
  if (currentPreviewUrl?.startsWith("blob:")) {
    URL.revokeObjectURL(currentPreviewUrl);
  }

  setVideoFile(file);
  setVideoDuration(duration);
  setVideoPreviewUrl(URL.createObjectURL(file));
  setUploading(true);
  setUploadProgress(0);

  try {
    const thumb = await generateThumbnail(file);
    setThumbnail(thumb);
  } catch {
    // The user can still upload/select a thumbnail manually.
  }
}

export function startVideoDiagnostics({
  file,
  setFrameHashes,
  setAudioHashes,
  setNsfwFrameUrls,
}: StartVideoDiagnosticsOptions) {
  import("@/lib/videoFrameHash")
    .then(({ extractVideoFrameHashes }) => extractVideoFrameHashes(file))
    .then((hashes) => setFrameHashes(hashes.map((fh: MediaHashEntry) => ({ frameIndex: fh.frameIndex || 0, hash: fh.hash }))))
    .catch(() => {
      // Keep creation non-blocking if frame hash extraction fails.
    });

  import("@/lib/videoFrameHash")
    .then(({ extractVideoFrameSamples }) => extractVideoFrameSamples(file))
    .then((blobs) => uploadFrameSampleImages(blobs))
    .then((urls) => setNsfwFrameUrls(urls))
    .catch(() => {
      // Keep creation non-blocking if NSFW sampling fails.
    });

  import("@/lib/audioFingerprint")
    .then(({ extractAudioFingerprint }) => extractAudioFingerprint(file))
    .then((hashes) => setAudioHashes(hashes.map((ah: MediaHashEntry) => ({ chunkIndex: ah.chunkIndex || 0, hash: ah.hash }))))
    .catch(() => {
      // Keep creation non-blocking if audio fingerprinting fails.
    });
}

export async function optimizeVideoForUpload(file: File): Promise<File> {
  try {
    const { optimizeVideo } = await import("@/lib/videoOptimize");
    return await optimizeVideo(file);
  } catch {
    return file;
  }
}

export async function runManagedVideoUpload({
  file,
  uploadAbortRef,
  messages,
  setUploading,
  setUploadProgress,
  onSuccess,
  onError,
  mapProgress,
  initProgress,
}: RunManagedVideoUploadOptions) {
  const abort = new AbortController();
  uploadAbortRef.current = abort;
  setUploading(true);
  setUploadProgress(0);

  try {
    if (typeof initProgress === "number") {
      setUploadProgress(initProgress);
    }

    const publicUrl = await uploadVideoWithPresign({
      file,
      signal: abort.signal,
      messages,
      onInitComplete:
        typeof initProgress === "number"
          ? () => {
              setUploadProgress(initProgress);
            }
          : undefined,
      onUploadProgress: (fraction) => {
        setUploadProgress(mapProgress ? mapProgress(fraction) : Math.round(fraction * 100));
      },
    });

    onSuccess(publicUrl);
    setUploadProgress(100);
  } catch (err) {
    if ((err as Error).name === "AbortError") return;
    onError(err as Error);
  } finally {
    uploadAbortRef.current = null;
    setUploading(false);
  }
}

export function loadVideoMetadata(
  file: File,
  options: VideoMetadataOptions = {}
): Promise<{ duration: number; width: number; height: number }> {
  const {
    timeoutMs = 20_000,
    rejectOnError = false,
    readErrorMessage = "Video file read failed",
  } = options;

  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);
    let settled = false;

    const cleanup = () => URL.revokeObjectURL(url);

    const finish = (duration: number, width: number, height: number) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({
        duration: duration && isFinite(duration) ? Math.round(duration) : 0,
        width: width || 0,
        height: height || 0,
      });
    };

    const fail = () => {
      if (settled) return;
      settled = true;
      cleanup();
      if (rejectOnError) {
        reject(new Error(readErrorMessage));
      } else {
        resolve({ duration: 0, width: 0, height: 0 });
      }
    };

    video.onloadedmetadata = () => finish(video.duration, video.videoWidth, video.videoHeight);
    video.onloadeddata = () => {
      if (!settled) finish(video.duration, video.videoWidth, video.videoHeight);
    };
    video.oncanplay = () => {
      if (!settled) finish(video.duration, video.videoWidth, video.videoHeight);
    };
    video.onerror = fail;
    setTimeout(() => {
      if (!settled) finish(0, 0, 0);
    }, timeoutMs);

    video.src = url;
    video.load();
  });
}

export function generateVideoThumbnail(
  file: File,
  messages: VideoThumbnailMessages
): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    const url = URL.createObjectURL(file);
    let settled = false;

    const cleanup = () => {
      URL.revokeObjectURL(url);
    };

    const tryCapture = () => {
      if (settled) return;
      settled = true;
      try {
        const width = video.videoWidth || 640;
        const height = video.videoHeight || 360;
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          cleanup();
          reject(new Error("Canvas failed"));
          return;
        }
        ctx.drawImage(video, 0, 0, width, height);
        const pixel = ctx.getImageData(0, 0, 1, 1).data;
        if (pixel[0] === 0 && pixel[1] === 0 && pixel[2] === 0 && pixel[3] === 0) {
          cleanup();
          reject(new Error("Blank frame"));
          return;
        }
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        cleanup();
        resolve(dataUrl);
      } catch {
        cleanup();
        reject(new Error(messages.thumbnailCreateFailed));
      }
    };

    const onFrameReady = () => {
      if (video.duration > 1 && video.currentTime < 0.5) {
        video.currentTime = 1;
      } else {
        tryCapture();
      }
    };

    video.onloadeddata = onFrameReady;
    video.oncanplay = () => {
      if (!settled) onFrameReady();
    };
    video.onseeked = tryCapture;
    video.onerror = () => {
      if (!settled) {
        settled = true;
        cleanup();
        reject(new Error(messages.videoFileReadError));
      }
    };

    setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        reject(new Error("Timeout"));
      }
    }, 20_000);

    video.src = url;
    video.load();
  });
}
