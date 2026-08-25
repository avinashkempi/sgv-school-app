import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Alert, Platform } from "react-native";

// Cloudinary configuration
const CLOUD_NAME = "atnkf0cu";
const UPLOAD_PRESET = "sgv_school_uploads";
const CLOUDINARY_IMAGE_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
const CLOUDINARY_VIDEO_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`;

/**
 * Cloudinary Organized Folder Paths
 */
export const CLOUDINARY_FOLDERS = {
  AVATARS: "sgv_school/avatars",
  POSTS: "sgv_school/posts",
  VIBES_IMAGES: "sgv_school/vibes/images",
  VIBES_VIDEOS: "sgv_school/vibes/videos",
  BRANDING: "sgv_school/branding",
  DOCUMENTS: "sgv_school/documents",
};

// Limits
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_IMAGE_WIDTH = 1200; // Resize to 1200px wide before upload
const COMPRESSION_QUALITY = 0.8; // 80% JPEG quality
const MAX_VIDEO_SIZE_BYTES = 30 * 1024 * 1024; // 30MB
const MAX_VIDEO_DURATION_SEC = 30; // Max 30 seconds per video

/**
 * Check if a file/URI/asset is a video format (e.g. .mov, .mp4, .webm, .m4v, .avi, etc.)
 * @param {Object|string} asset
 * @returns {boolean}
 */
export const isVideoAsset = (asset) => {
  if (!asset) return false;
  if (typeof asset === "object" && asset.type === "video") return true;
  if (
    typeof asset === "object" &&
    asset.mimeType &&
    asset.mimeType.startsWith("video/")
  )
    return true;
  const uri =
    typeof asset === "string"
      ? asset
      : asset.uri || asset.url || asset.fileName || asset.name || "";
  return /\.(mov|mp4|m4v|webm|avi|3gp|mkv|flv|wmv|qt)(\?.*)?$/i.test(uri);
};

/**
 * Request camera/gallery permissions.
 * Returns true if granted, false otherwise.
 */
const requestPermissions = async (source) => {
  if (Platform.OS === "web") return true;

  if (source === "camera") {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Camera permission is needed to take photos. Please enable it in Settings."
        );
        return false;
      }
      return true;
    } catch {
      return true;
    }
  }

  // For gallery, Expo Go and modern Android/iOS use system photo picker which handles access natively
  return true;
};

/**
 * Pick an image from the gallery or camera (General 16:9 / Landscape).
 * @param {'gallery'|'camera'} source
 * @returns {Promise<{uri: string, width: number, height: number}|null>}
 */
export const pickImage = async (source = "gallery") => {
  const hasPermission = await requestPermissions(source);
  if (!hasPermission) return null;

  const options = {
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [16, 9],
    quality: 0.85,
  };

  let result;
  try {
    if (source === "camera" && Platform.OS !== "web") {
      result = await ImagePicker.launchCameraAsync(options);
    } else {
      result = await ImagePicker.launchImageLibraryAsync(options);
    }
  } catch (err) {
    try {
      if (source === "camera" && Platform.OS !== "web") {
        result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({ quality: 0.85 });
      }
    } catch {
      return null;
    }
  }

  if (
    !result ||
    result.canceled ||
    !result.assets ||
    result.assets.length === 0
  ) {
    return null;
  }

  return result.assets[0];
};

/**
 * Pick a profile avatar photo from gallery or camera.
 * Uses the exact same proven mechanism as Vibes.
 *
 * @param {'gallery'|'camera'} source
 * @returns {Promise<{uri: string, width: number, height: number}|null>}
 */
export const pickProfilePhoto = async (source = "gallery") => {
  const picked = await pickVibeMedia(source, "images", 1);
  if (!picked || picked.length === 0) return null;
  return picked[0];
};

/**
 * Pick image(s) or 1 video for Vibes.
 * Rule: Either 1 video (max 30s) OR up to 5 photos.
 * Correctly identifies .mov (iOS / Mac QuickTime) and .mp4 videos.
 *
 * @param {'gallery'|'camera'} source
 * @param {'all'|'images'|'videos'} [mediaType='all']
 * @param {number} [remainingSlots=5]
 * @returns {Promise<Array<{type: 'image'|'video', uri: string, width: number, height: number, aspectRatio: number, duration?: number}>>}
 */
export const pickVibeMedia = async (
  source = "gallery",
  mediaType = "all",
  remainingSlots = 5
) => {
  const hasPermission = await requestPermissions(source);
  if (!hasPermission) return [];

  let expoMediaTypes = ["images", "videos"];
  if (mediaType === "images") expoMediaTypes = ["images"];
  if (mediaType === "videos") expoMediaTypes = ["videos"];

  const options = {
    mediaTypes: expoMediaTypes,
    allowsEditing: false,
    allowsMultipleSelection: mediaType !== "videos" && remainingSlots > 1,
    quality: 0.85,
    videoMaxDuration: MAX_VIDEO_DURATION_SEC,
    selectionLimit: mediaType === "videos" ? 1 : Math.min(remainingSlots, 5),
  };

  let result;
  if (source === "camera" && Platform.OS !== "web") {
    result = await ImagePicker.launchCameraAsync({
      mediaTypes: expoMediaTypes,
      allowsEditing: false,
      quality: 0.85,
      videoMaxDuration: MAX_VIDEO_DURATION_SEC,
    });
  } else {
    result = await ImagePicker.launchImageLibraryAsync(options);
  }

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return [];
  }

  const assets = result.assets;
  const isVideoSelected = assets.some((a) => isVideoAsset(a));

  if (isVideoSelected) {
    // Only 1 video is permitted per vibe
    const videoAsset = assets.find((a) => isVideoAsset(a)) || assets[0];
    const durationSec = videoAsset.duration
      ? videoAsset.duration > 500
        ? videoAsset.duration / 1000
        : videoAsset.duration
      : 0;

    if (durationSec > MAX_VIDEO_DURATION_SEC + 1) {
      Alert.alert(
        "Video Too Long",
        `Videos on Vibes are limited to ${MAX_VIDEO_DURATION_SEC} seconds. Please choose a shorter clip.`
      );
      return [];
    }

    const width = videoAsset.width || 720;
    const height = videoAsset.height || 1280;
    const aspectRatio =
      width && height ? Number((width / height).toFixed(3)) : 0.562;

    return [
      {
        type: "video",
        uri: videoAsset.uri,
        width,
        height,
        aspectRatio,
        duration: Math.round(durationSec),
      },
    ];
  }

  // Up to 5 photos
  const selectedPhotos = assets.slice(0, remainingSlots);
  return selectedPhotos.map((asset) => ({
    type: isVideoAsset(asset) ? "video" : "image",
    uri: asset.uri,
    width: asset.width || 1080,
    height: asset.height || 1080,
    aspectRatio:
      asset.width && asset.height
        ? Number((asset.width / asset.height).toFixed(3))
        : 1,
  }));
};

// Backward-compatible alias
export const pickVibeImages = (
  source = "gallery",
  allowsMultipleSelection = false
) => {
  return pickVibeMedia(
    source,
    allowsMultipleSelection ? "images" : "all",
    allowsMultipleSelection ? 5 : 1
  );
};

/**
 * Compress and resize an image before upload.
 * If file is a video (.mov / .mp4), bypasses image compression safely.
 * @param {string} uri - Local image URI
 * @returns {Promise<string>} - Compressed image URI
 */
export const compressImage = async (uri) => {
  if (isVideoAsset({ uri })) {
    return uri;
  }
  try {
    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: MAX_IMAGE_WIDTH } }],
      {
        compress: COMPRESSION_QUALITY,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );
    return manipulated.uri;
  } catch (error) {
    console.warn("Image compression failed, using original:", error);
    return uri; // Fall back to original if compression fails
  }
};

/**
 * Compress and format an avatar image into a 500x500 square JPEG.
 * @param {string} uri - Local image URI
 * @returns {Promise<string>} - Compressed avatar URI
 */
export const compressAvatar = async (uri) => {
  try {
    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 500, height: 500 } }],
      {
        compress: 0.85,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );
    return manipulated.uri;
  } catch (error) {
    console.warn("Avatar compression failed, using original:", error);
    return uri;
  }
};

/**
 * Get file size from a local URI (approximate for RN).
 * @param {string} uri
 * @returns {Promise<number>} size in bytes
 */
const getFileSize = async (uri) => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return blob.size;
  } catch {
    return 0;
  }
};

/**
 * Upload an image to Cloudinary using unsigned preset.
 * Includes client-side file size validation (10MB max).
 * Supports both Web (Blobs) and Native (React Native Multipart).
 *
 * @param {string} uri - Local image URI (already compressed)
 * @param {(progress: number) => void} [onProgress] - Progress callback (0-100)
 * @param {Object} [options] - Additional options
 * @param {string} [options.folder] - Target Cloudinary folder (from CLOUDINARY_FOLDERS)
 * @param {string} [options.fileNamePrefix] - Prefix for file naming
 * @returns {Promise<{url: string, publicId: string}>}
 */
export const uploadToCloudinary = async (uri, onProgress, options = {}) => {
  // If video is passed into image uploader, delegate to video uploader automatically
  if (isVideoAsset({ uri })) {
    return uploadVideoToCloudinary(uri, onProgress, options);
  }

  // Validate file size before upload
  const fileSize = await getFileSize(uri);
  if (fileSize > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `Image is too large (${(fileSize / 1024 / 1024).toFixed(
        1
      )}MB). Maximum size is 10MB.`
    );
  }

  const folder = options?.folder || CLOUDINARY_FOLDERS.POSTS;
  const prefix = options?.fileNamePrefix || "upload";
  const fileName = `${prefix}_${Date.now()}.jpg`;

  const formData = new FormData();

  if (Platform.OS === "web") {
    // In web browsers, fetch the local blob from the blob:/data: URI and append as a real Blob
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      formData.append("file", blob, fileName);
    } catch {
      // If fetching the blob fails, append URI string directly
      formData.append("file", uri);
    }
  } else {
    // React Native mobile format
    formData.append("file", {
      uri: Platform.OS === "ios" ? uri.replace("file://", "") : uri,
      type: "image/jpeg",
      name: fileName,
    });
  }

  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("cloud_name", CLOUD_NAME);
  if (folder) {
    formData.append("folder", folder);
    formData.append("asset_folder", folder);
  }

  // Use XMLHttpRequest for progress tracking
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve({
            url: response.secure_url,
            publicId: response.public_id,
          });
        } catch (e) {
          reject(new Error("Failed to parse Cloudinary response"));
        }
      } else {
        let errorMsg = "Upload failed";
        try {
          const errResponse = JSON.parse(xhr.responseText);
          errorMsg = errResponse.error?.message || errorMsg;
        } catch {
          // Use default error message
        }
        reject(new Error(errorMsg));
      }
    });

    xhr.addEventListener("error", () => {
      reject(
        new Error(
          "Network error during upload. Please check your internet connection."
        )
      );
    });

    xhr.addEventListener("timeout", () => {
      reject(new Error("Upload timed out. Please try again."));
    });

    xhr.timeout = 60000; // 60 second timeout
    xhr.open("POST", CLOUDINARY_IMAGE_URL);
    xhr.send(formData);
  });
};

/**
 * Full pipeline: Pick → Compress → Upload
 * Convenience function that chains all steps.
 *
 * @param {'gallery'|'camera'} source
 * @param {(progress: number) => void} [onProgress]
 * @param {Object} [options]
 * @returns {Promise<{url: string, publicId: string, localUri: string}|null>} null if user cancelled
 */
export const pickAndUploadImage = async (
  source = "gallery",
  onProgress,
  options = {}
) => {
  const picked = await pickImage(source);
  if (!picked) return null;

  if (onProgress) onProgress(0);

  const compressedUri = await compressImage(picked.uri);

  const result = await uploadToCloudinary(compressedUri, onProgress, options);

  return {
    url: result.url,
    publicId: result.publicId,
    localUri: compressedUri,
  };
};

/**
 * Upload a profile avatar photo to the sgv_school/avatars folder.
 *
 * @param {string} uri - Local compressed avatar URI
 * @param {(progress: number) => void} [onProgress]
 * @returns {Promise<{url: string, publicId: string}>}
 */
export const uploadProfilePhoto = async (uri, onProgress) => {
  return uploadToCloudinary(uri, onProgress, {
    folder: CLOUDINARY_FOLDERS.AVATARS,
    fileNamePrefix: "avatar",
  });
};

/**
 * Complete Profile Photo Pipeline: Pick (1:1 square) → Compress (500x500) → Upload to avatars folder.
 *
 * @param {'gallery'|'camera'} source
 * @param {(progress: number) => void} [onProgress]
 * @returns {Promise<{url: string, publicId: string, localUri: string}|null>}
 */
export const pickAndUploadProfilePhoto = async (
  source = "gallery",
  onProgress
) => {
  const picked = await pickProfilePhoto(source);
  if (!picked) return null;

  if (onProgress) onProgress(0);

  const compressedUri = await compressAvatar(picked.uri);
  const result = await uploadProfilePhoto(compressedUri, onProgress);

  return {
    url: result.url,
    publicId: result.publicId,
    localUri: compressedUri,
  };
};

/**
 * Upload a video to Cloudinary using unsigned preset.
 * Accepts .mov (QuickTime iOS/Mac), .mp4, .webm, etc., and auto-transcodes.
 * Limits file size to 30MB.
 *
 * @param {string} uri - Local video file URI
 * @param {(progress: number) => void} [onProgress] - Progress callback (0-100)
 * @param {Object} [options] - Additional options
 * @param {string} [options.folder] - Target Cloudinary folder
 * @param {string} [options.fileNamePrefix] - Prefix for file naming
 * @returns {Promise<{url: string, publicId: string, thumbnailUrl: string, duration: number, width: number, height: number}>}
 */
export const uploadVideoToCloudinary = async (
  uri,
  onProgress,
  options = {}
) => {
  const fileSize = await getFileSize(uri);
  if (fileSize > MAX_VIDEO_SIZE_BYTES) {
    throw new Error(
      `Video is too large (${(fileSize / 1024 / 1024).toFixed(
        1
      )}MB). Maximum size is 30MB.`
    );
  }

  const folder = options?.folder || CLOUDINARY_FOLDERS.VIBES_VIDEOS;
  const prefix = options?.fileNamePrefix || "vibe_video";

  const formData = new FormData();
  const uriStr = typeof uri === "string" ? uri : uri?.uri || "";
  const ext = uriStr.split(".").pop()?.split("?")[0]?.toLowerCase() || "mov";
  const isMov = ext === "mov" || ext === "qt";
  const mimeType = isMov
    ? "video/quicktime"
    : ext === "webm"
    ? "video/webm"
    : "video/mp4";
  const filename = `${prefix}_${Date.now()}.${ext}`;

  if (Platform.OS === "web") {
    try {
      const response = await fetch(uriStr);
      const blob = await response.blob();
      formData.append("file", blob, filename);
    } catch {
      formData.append("file", uriStr);
    }
  } else {
    formData.append("file", {
      uri: Platform.OS === "ios" ? uriStr.replace("file://", "") : uriStr,
      type: mimeType,
      name: filename,
    });
  }

  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("cloud_name", CLOUD_NAME);
  if (folder) {
    formData.append("folder", folder);
    formData.append("asset_folder", folder);
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          const publicId = response.public_id;
          // Auto-generate high-quality poster thumbnail from video
          const thumbnailUrl = `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/so_0,w_720,q_auto,f_auto/${publicId}.jpg`;

          resolve({
            url: response.secure_url,
            publicId: response.public_id,
            thumbnailUrl,
            duration: Math.round(response.duration || 0),
            width: response.width || 720,
            height: response.height || 1280,
          });
        } catch {
          reject(new Error("Failed to parse Cloudinary video response"));
        }
      } else {
        let errorMsg = "Video upload failed";
        try {
          const errResponse = JSON.parse(xhr.responseText);
          errorMsg = errResponse.error?.message || errorMsg;
        } catch {
          // Use default
        }
        reject(new Error(errorMsg));
      }
    });

    xhr.addEventListener("error", () => {
      reject(
        new Error(
          "Network error during video upload. Please check your internet connection."
        )
      );
    });

    xhr.addEventListener("timeout", () => {
      reject(new Error("Video upload timed out. Please try again."));
    });

    xhr.timeout = 120000; // 120 second timeout for video
    xhr.open("POST", CLOUDINARY_VIDEO_URL);
    xhr.send(formData);
  });
};

/**
 * Get dynamic Cloudinary video stream URL optimized for mobile playback.
 * Automatically transcodes and caps at 720p HD (or 480p on slow connections) with auto-codec.
 *
 * @param {string} url - Original Cloudinary video URL
 * @param {Object} [options]
 * @param {boolean} [options.isSlow=false] - Whether user is on slow connection
 * @returns {string} Optimized streaming URL
 */
export const getOptimizedVideoUrl = (url, { isSlow = false } = {}) => {
  if (!url || !url.includes("cloudinary.com")) return url;
  if (url.includes("/upload/w_") || url.includes("/upload/q_")) return url;

  const targetWidth = isSlow ? 480 : 720;
  const targetQuality = isSlow ? "eco" : "auto";

  return url.replace(
    "/upload/",
    `/upload/w_${targetWidth},q_${targetQuality},f_auto,vc_auto,c_limit/`
  );
};

/**
 * Get a tiny ultra-fast blurred placeholder for instant rendering before full image loads.
 * Typical payload is < 1KB, completely eliminating blank/grey boxes on slow internet.
 *
 * @param {string} url - Original Cloudinary image URL
 * @returns {string} Tiny blurred image URL
 */
export const getBlurPlaceholderUrl = (url) => {
  if (!url || typeof url !== "string") return "";
  if (!url.includes("cloudinary.com")) return url;

  return url.replace(
    "/upload/",
    "/upload/w_32,e_blur:600,q_10,f_auto,c_limit/"
  );
};

/**
 * Check if a URL represents a video asset
 */
export const isVideoUrl = (url) => {
  if (!url || typeof url !== "string") return false;
  return (
    url.includes("/video/upload/") ||
    /\.(mp4|mov|webm|m4v|avi|3gp|mkv|flv|wmv|qt)(\?.*)?$/i.test(url)
  );
};

/**
 * Generate a high-quality JPEG poster frame from a Cloudinary video URL.
 * Cloudinary allows generating JPEG posters from video files at start offset (so_0).
 *
 * @param {string} videoUrl - Cloudinary video URL
 * @param {string|object} [optionsOrThumbnail] - Precomputed thumbnail URL OR options object
 * @returns {string} Poster JPEG image URL
 */
export const getVideoPosterUrl = (
  videoUrl,
  optionsOrThumbnail = {}
) => {
  if (typeof optionsOrThumbnail === "string" && optionsOrThumbnail.trim()) {
    return optionsOrThumbnail;
  }

  const options =
    typeof optionsOrThumbnail === "object" && optionsOrThumbnail !== null
      ? optionsOrThumbnail
      : {};
  const { width = 1080, height = 600, mode = "fill", timeOffset = "so_0" } = options;

  if (!videoUrl || typeof videoUrl !== "string") return "";
  if (!videoUrl.includes("cloudinary.com")) return videoUrl;

  // Replace video file extension with .jpg
  let posterUrl = videoUrl.replace(
    /\.(mp4|mov|webm|m4v|avi|3gp|mkv|flv|wmv|qt)(\?.*)?$/i,
    ".jpg"
  );

  const crop = mode === "fill" ? "c_fill,g_auto" : "c_limit";
  const transform = `${timeOffset},w_${width}${height ? `,h_${height}` : ""},${crop},q_auto,f_auto`;

  if (hasCloudinaryTransform(posterUrl)) {
    return posterUrl;
  }

  return posterUrl.replace("/upload/", `/upload/${transform}/`);
};

/**
 * Helper to check if a Cloudinary URL already contains transformation segments.
 */
export const hasCloudinaryTransform = (url) => {
  if (!url || typeof url !== "string") return false;
  return (
    /\/upload\/([a-z0-9_]+:[a-z0-9_]+|[a-z0-9_]+_[a-z0-9_]+|\w+\/)/i.test(
      url
    ) ||
    url.includes("/upload/w_") ||
    url.includes("/upload/c_") ||
    url.includes("/upload/q_") ||
    url.includes("/upload/e_blur") ||
    url.includes("/upload/so_")
  );
};

/**
 * Get a Cloudinary optimized URL for display.
 * Appends transformation parameters for responsive loading.
 *
 * @param {string} url - Original Cloudinary URL
 * @param {Object} [options]
 * @param {number} [options.width=800] - Desired width
 * @param {string} [options.quality='auto'] - Quality setting ('auto', 'eco', 'low', or number)
 * @param {boolean} [options.isSlow=false] - Whether network is slow
 * @returns {string} Transformed URL
 */
export const getOptimizedCloudinaryUrl = (
  url,
  { width = 800, quality = "auto", isSlow = false } = {}
) => {
  if (!url || typeof url !== "string") return url || "";
  if (!url.includes("cloudinary.com")) return url;

  // If already transformed, don't duplicate
  if (hasCloudinaryTransform(url)) {
    return url;
  }

  const effectiveWidth = isSlow ? Math.min(width, 720) : width;
  const effectiveQuality = isSlow ? "eco" : quality;

  return url.replace(
    "/upload/",
    `/upload/w_${effectiveWidth},q_${effectiveQuality},f_auto,c_limit/`
  );
};

/**
 * Optimized circular avatar image (face-detection smart crop)
 *
 * @param {string} url - Cloudinary image URL
 * @param {number} [size=200] - Desired width and height
 * @returns {string} Transformed avatar URL
 */
export const getAvatarUrl = (url, size = 200) => {
  if (!url || typeof url !== "string") return url || "";
  if (!url.includes("cloudinary.com")) return url;
  if (hasCloudinaryTransform(url)) return url;

  return url.replace(
    "/upload/",
    `/upload/w_${size},h_${size},c_fill,g_face,q_auto,f_auto/`
  );
};

/**
 * Optimized circular story preview thumbnail (200x200 smart face/auto crop)
 */
export const getStoryThumbnailUrl = (url) => {
  if (!url || typeof url !== "string") return url || "";
  if (isVideoUrl(url)) {
    return getVideoPosterUrl(url, { width: 200, height: 200, mode: "fill" });
  }
  if (!url.includes("cloudinary.com")) return url;
  if (hasCloudinaryTransform(url)) return url;

  return url.replace(
    "/upload/",
    "/upload/w_200,h_200,c_fill,g_auto,q_auto,f_auto/"
  );
};

/**
 * Optimized 1080x600 Hero Spotlight banner (supports images & video posters)
 */
export const getHeroBannerUrl = (url) => {
  if (!url || typeof url !== "string") return url || "";
  if (isVideoUrl(url)) {
    return getVideoPosterUrl(url, { width: 1080, height: 600, mode: "fill" });
  }
  if (!url.includes("cloudinary.com")) return url;
  if (hasCloudinaryTransform(url)) return url;

  return url.replace(
    "/upload/",
    "/upload/w_1080,h_600,c_fill,g_auto,q_auto,f_auto/"
  );
};

/**
 * Optimized 360x360 Square Grid thumbnail (for Profile / Gallery)
 */
export const getGridThumbnailUrl = (url) => {
  if (!url || typeof url !== "string") return url || "";
  if (isVideoUrl(url)) {
    return getVideoPosterUrl(url, { width: 360, height: 360, mode: "fill" });
  }
  if (!url.includes("cloudinary.com")) return url;
  if (hasCloudinaryTransform(url)) return url;

  return url.replace(
    "/upload/",
    "/upload/w_360,h_360,c_fill,g_auto,q_auto,f_auto/"
  );
};

/**
 * Optimized Feed Image URL (max 1080px wide with auto quality and format)
 */
export const getFeedImageUrl = (url, { isSlow = false } = {}) => {
  if (!url || typeof url !== "string") return url || "";
  if (isVideoUrl(url)) {
    return getVideoPosterUrl(url, {
      width: isSlow ? 720 : 1080,
      mode: "limit",
    });
  }
  if (!url.includes("cloudinary.com")) return url;
  if (hasCloudinaryTransform(url)) return url;

  const targetWidth = isSlow ? 720 : 1080;
  const targetQuality = isSlow ? "eco" : "auto";

  return url.replace(
    "/upload/",
    `/upload/w_${targetWidth},q_${targetQuality},f_auto,c_limit/`
  );
};

/**
 * Universal Media Thumbnail Resolver for Vibes cards, stories, and spotlights.
 * Correctly prioritizes thumbnailUrl and converts videos to posters.
 */
export const resolveMediaThumbnail = (mediaItem, targetType = "hero", options = {}) => {
  if (!mediaItem) return "";

  const isObj = typeof mediaItem === "object";
  const directThumbnail = isObj ? mediaItem.thumbnailUrl : null;
  const rawUrl = isObj ? mediaItem.url : mediaItem;
  const isVideo = isObj ? mediaItem.type === "video" || isVideoUrl(rawUrl) : isVideoUrl(rawUrl);

  // If a pre-generated thumbnail URL is present and not a video stream, optimize that
  if (directThumbnail && !isVideoUrl(directThumbnail)) {
    if (targetType === "story") return getStoryThumbnailUrl(directThumbnail);
    if (targetType === "grid") return getGridThumbnailUrl(directThumbnail);
    return getHeroBannerUrl(directThumbnail);
  }

  // If it's a video, generate video poster
  if (isVideo) {
    if (targetType === "story") {
      return getVideoPosterUrl(rawUrl, { width: 200, height: 200, mode: "fill", ...options });
    }
    if (targetType === "grid") {
      return getVideoPosterUrl(rawUrl, { width: 360, height: 360, mode: "fill", ...options });
    }
    return getVideoPosterUrl(rawUrl, { width: 1080, height: 600, mode: "fill", ...options });
  }

  // Normal image URL
  if (targetType === "story") return getStoryThumbnailUrl(rawUrl);
  if (targetType === "grid") return getGridThumbnailUrl(rawUrl);
  if (targetType === "feed") return getFeedImageUrl(rawUrl, options);
  return getHeroBannerUrl(rawUrl);
};

