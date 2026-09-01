import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as DocumentPicker from "expo-document-picker";
import { Alert, Platform } from "react-native";

// Cloudinary configuration
const CLOUD_NAME = "atnkf0cu";
const UPLOAD_PRESET = "sgv_school_uploads";
const CLOUDINARY_IMAGE_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
const CLOUDINARY_VIDEO_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`;
const CLOUDINARY_RAW_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`;


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
  ACADEMICS: "sgv_school/academics",
};

/**
 * Sanitize a string for safe use in Cloudinary folder paths and public IDs.
 * Replaces non-alphanumeric characters with hyphens, collapses repeats, and trims edges.
 * E.g., "10th Standard (A)" -> "10th-Standard-A", "Mathematics & Stats" -> "Mathematics-Stats"
 *
 * @param {string} str
 * @returns {string} Sanitized string safe for Cloudinary paths
 */
export const sanitizeCloudinarySegment = (str) => {
  if (!str || typeof str !== "string") return "";
  return str
    .trim()
    .replace(/[^\w\s-]/g, "") // remove punctuation/special chars like parentheses, colons, etc.
    .replace(/\s+/g, "-") // replace whitespace with hyphens
    .replace(/-+/g, "-") // collapse consecutive hyphens
    .replace(/^-+|-+$/g, ""); // trim leading and trailing hyphens
};

/**
 * Build a structured, hierarchical Cloudinary folder path for academic notes and materials.
 * Target path structure: sgv_school/academics/{Class}/{Subject}/{Type}
 * E.g. sgv_school/academics/Class-10-A/Mathematics/notes
 *
 * @param {Object} params
 * @param {string} [params.className] - e.g. "10th Standard", "Class 5 A"
 * @param {string} [params.subjectName] - e.g. "Mathematics", "Science"
 * @param {string} [params.contentType] - 'note' | 'homework' | 'news' | 'document'
 * @param {string} [params.branch] - optional branch name, e.g. "Ugar"
 * @returns {string} Structured Cloudinary folder path
 */
export const buildAcademicCloudinaryFolder = ({
  className = "",
  subjectName = "",
  contentType = "note",
  branch = "",
} = {}) => {
  const cleanClass = sanitizeCloudinarySegment(className) || "General-Class";
  const cleanSubject = sanitizeCloudinarySegment(subjectName) || "General";

  let typeFolder = "notes";
  const lowerType = String(contentType).toLowerCase();
  if (lowerType === "homework") {
    typeFolder = "homework";
  } else if (lowerType === "news" || lowerType === "notice") {
    typeFolder = "notices";
  } else if (lowerType === "exam" || lowerType === "test") {
    typeFolder = "exams";
  }

  const cleanBranch = branch ? sanitizeCloudinarySegment(branch) : "";
  const root = CLOUDINARY_FOLDERS.ACADEMICS || "sgv_school/academics";

  if (cleanBranch && cleanBranch.toLowerCase() !== "main") {
    return `${root}/${cleanBranch}/${cleanClass}/${cleanSubject}/${typeFolder}`;
  }

  return `${root}/${cleanClass}/${cleanSubject}/${typeFolder}`;
};

/**
 * Build a human-readable, chronological file name for academic uploads.
 * Format: {YYYYMMDD}_{CleanTitle}_{CleanOriginalName}.{ext}
 * E.g., "20260901_Quadratic-Equations_FormulaSheet.pdf"
 *
 * @param {Object} params
 * @param {string} [params.title] - Note or post title
 * @param {string} [params.originalName] - Original file name with extension
 * @param {string} [params.contentType] - 'note' | 'homework' | 'news'
 * @param {string} [params.defaultExt] - 'jpg' | 'pdf' | 'mp4' etc.
 * @returns {string} Sanitized file name with extension
 */
export const buildAcademicFileName = ({
  title = "",
  originalName = "",
  contentType = "note",
  defaultExt = "jpg",
} = {}) => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const dateStr = `${yyyy}${mm}${dd}`;

  let ext = defaultExt;
  let baseName = "";
  if (originalName && typeof originalName === "string") {
    const lastDotIndex = originalName.lastIndexOf(".");
    if (lastDotIndex !== -1 && lastDotIndex < originalName.length - 1) {
      ext = originalName.substring(lastDotIndex + 1).toLowerCase();
      baseName = sanitizeCloudinarySegment(originalName.substring(0, lastDotIndex));
    } else {
      baseName = sanitizeCloudinarySegment(originalName);
    }
  }

  const cleanTopic = sanitizeCloudinarySegment(title);
  const cleanType = sanitizeCloudinarySegment(contentType || "note");

  const parts = [dateStr];
  if (cleanTopic) {
    parts.push(cleanTopic.substring(0, 40));
  } else if (cleanType) {
    parts.push(cleanType);
  }

  if (baseName && baseName !== cleanTopic) {
    parts.push(baseName.substring(0, 30));
  }

  const combined = parts.filter(Boolean).join("_");
  return `${combined || `material_${Date.now()}`}.${ext}`;
};

/**
 * Build structured Cloudinary tags and context metadata for instant 1-click filtering.
 *
 * @param {Object} params
 * @returns {{ tags: string[], context: Record<string, string> }}
 */
export const buildAcademicTagsAndContext = ({
  className = "",
  subjectName = "",
  contentType = "note",
  title = "",
  teacherName = "",
  branch = "",
} = {}) => {
  const tags = ["academic_materials"];

  if (className) tags.push(`class_${sanitizeCloudinarySegment(className)}`);
  if (subjectName) tags.push(`subject_${sanitizeCloudinarySegment(subjectName)}`);
  if (contentType) tags.push(`type_${sanitizeCloudinarySegment(contentType)}`);
  if (branch) tags.push(`branch_${sanitizeCloudinarySegment(branch)}`);

  const context = {};
  if (title) context.caption = title.trim();
  if (className) context.class = className.trim();
  if (subjectName) context.subject = subjectName.trim();
  if (contentType) context.type = contentType.trim();
  if (teacherName) context.author = teacherName.trim();

  return { tags, context };
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
  const fileName = options?.fileName || `${prefix}_${Date.now()}.jpg`;

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
  if (options?.tags) {
    const tagsStr = Array.isArray(options.tags)
      ? options.tags.join(",")
      : String(options.tags);
    if (tagsStr.trim()) {
      formData.append("tags", tagsStr.trim());
    }
  }
  if (options?.context) {
    let contextStr = "";
    if (typeof options.context === "object") {
      contextStr = Object.entries(options.context)
        .filter(([_, v]) => v !== undefined && v !== null && String(v).trim() !== "")
        .map(([k, v]) => `${k}=${encodeURIComponent(String(v).trim())}`)
        .join("|");
    } else {
      contextStr = String(options.context);
    }
    if (contextStr.trim()) {
      formData.append("context", contextStr);
    }
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
  const customFileName = options?.fileName;

  const formData = new FormData();
  const uriStr = typeof uri === "string" ? uri : uri?.uri || "";
  const ext = uriStr.split(".").pop()?.split("?")[0]?.toLowerCase() || "mov";
  const isMov = ext === "mov" || ext === "qt";
  const mimeType = isMov
    ? "video/quicktime"
    : ext === "webm"
    ? "video/webm"
    : "video/mp4";
  const filename = customFileName || `${prefix}_${Date.now()}.${ext}`;

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
  if (options?.tags) {
    const tagsStr = Array.isArray(options.tags)
      ? options.tags.join(",")
      : String(options.tags);
    if (tagsStr.trim()) {
      formData.append("tags", tagsStr.trim());
    }
  }
  if (options?.context) {
    let contextStr = "";
    if (typeof options.context === "object") {
      contextStr = Object.entries(options.context)
        .filter(([_, v]) => v !== undefined && v !== null && String(v).trim() !== "")
        .map(([k, v]) => `${k}=${encodeURIComponent(String(v).trim())}`)
        .join("|");
    } else {
      contextStr = String(options.context);
    }
    if (contextStr.trim()) {
      formData.append("context", contextStr);
    }
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

// ─────────────────────────────────────────────────────────────
// Document & Multi-Format Utilities
// ─────────────────────────────────────────────────────────────

const MAX_DOC_SIZE_BYTES = 25 * 1024 * 1024; // 25MB

/**
 * Resolves comprehensive metadata for any attachment (file/URL/object).
 * Supports: PDF, PowerPoint (PPT, PPTX), Word (DOC, DOCX), Excel (XLS, XLSX),
 * Video, Image, and Web Links.
 */
export const getDocumentMeta = (item) => {
  if (!item) {
    return {
      url: "",
      name: "Attachment",
      label: "Attachment",
      icon: "attach-file",
      color: "#6366F1",
      bgColor: "rgba(99, 102, 241, 0.12)",
      type: "other",
      extension: "FILE",
      isViewableOnline: false,
      size: 0,
    };
  }

  let url = "";
  let name = "";
  let explicitType = "";
  let size = 0;

  if (typeof item === "string") {
    url = item;
    try {
      const parts = url.split("/");
      name = decodeURIComponent(parts[parts.length - 1]?.split("?")[0] || "Attachment");
    } catch {
      name = "Attachment";
    }
  } else if (typeof item === "object") {
    url = item.url || item.uri || "";
    name = item.name || item.fileName || "";
    explicitType = (item.fileType || item.type || "").toLowerCase();
    size = item.size || 0;
    if (!name && url) {
      try {
        const parts = url.split("/");
        name = decodeURIComponent(parts[parts.length - 1]?.split("?")[0] || "Attachment");
      } catch {
        name = "Attachment";
      }
    }
  }

  const lowerUrl = (url || "").toLowerCase();
  const lowerName = (name || "").toLowerCase();
  const checkStr = `${lowerName} ${lowerUrl}`;

  // 1. PDF
  if (explicitType === "pdf" || /\.pdf(\?.*)?$/i.test(checkStr)) {
    return {
      url,
      name: name || "Document.pdf",
      label: "PDF Document",
      type: "pdf",
      icon: "picture-as-pdf",
      color: "#EF4444",
      bgColor: "rgba(239, 68, 68, 0.12)",
      extension: "PDF",
      isViewableOnline: true,
      size,
    };
  }

  // 2. PowerPoint
  if (
    explicitType === "pptx" ||
    explicitType === "ppt" ||
    /\.(pptx|ppt)(\?.*)?$/i.test(checkStr)
  ) {
    return {
      url,
      name: name || "Presentation.pptx",
      label: "PowerPoint Presentation",
      type: "pptx",
      icon: "slideshow",
      color: "#EA580C",
      bgColor: "rgba(234, 88, 12, 0.12)",
      extension: "PPTX",
      isViewableOnline: true,
      size,
    };
  }

  // 3. Word Document
  if (
    explicitType === "docx" ||
    explicitType === "doc" ||
    /\.(docx|doc)(\?.*)?$/i.test(checkStr)
  ) {
    return {
      url,
      name: name || "Document.docx",
      label: "Word Document",
      type: "docx",
      icon: "description",
      color: "#2563EB",
      bgColor: "rgba(37, 99, 235, 0.12)",
      extension: "DOCX",
      isViewableOnline: true,
      size,
    };
  }

  // 4. Excel Spreadsheet
  if (
    explicitType === "xlsx" ||
    explicitType === "xls" ||
    explicitType === "csv" ||
    /\.(xlsx|xls|csv)(\?.*)?$/i.test(checkStr)
  ) {
    return {
      url,
      name: name || "Spreadsheet.xlsx",
      label: "Excel Spreadsheet",
      type: "xlsx",
      icon: "table-chart",
      color: "#16A34A",
      bgColor: "rgba(22, 163, 74, 0.12)",
      extension: "XLSX",
      isViewableOnline: true,
      size,
    };
  }

  // 5. Video
  if (explicitType === "video" || isVideoAsset(item) || isVideoUrl(url)) {
    return {
      url,
      name: name || "Video Clip",
      label: "Video Clip",
      type: "video",
      icon: "videocam",
      color: "#9333EA",
      bgColor: "rgba(147, 51, 234, 0.12)",
      extension: "VIDEO",
      isViewableOnline: true,
      size,
    };
  }

  // 6. Image
  if (
    explicitType === "image" ||
    /\.(jpg|jpeg|png|webp|gif|bmp|heic)(\?.*)?$/i.test(checkStr) ||
    lowerUrl.includes("/image/upload/")
  ) {
    return {
      url,
      name: name || "Photo.jpg",
      label: "Image",
      type: "image",
      icon: "image",
      color: "#06B6D4",
      bgColor: "rgba(6, 182, 212, 0.12)",
      extension: "IMAGE",
      isViewableOnline: true,
      size,
    };
  }

  // 7. Web Link
  if (explicitType === "link" || /^https?:\/\//i.test(url)) {
    return {
      url,
      name: name || url,
      label: "Web Link",
      type: "link",
      icon: "link",
      color: "#0D9488",
      bgColor: "rgba(13, 148, 136, 0.12)",
      extension: "LINK",
      isViewableOnline: true,
      size,
    };
  }

  // 8. General Document
  return {
    url,
    name: name || "Attachment",
    label: "Document",
    type: "document",
    icon: "insert-drive-file",
    color: "#6366F1",
    bgColor: "rgba(99, 102, 241, 0.12)",
    extension: "FILE",
    isViewableOnline: false,
    size,
  };
};

/**
 * Upload a document (PDF, PPTX, DOCX, XLSX, TXT, etc.) to Cloudinary.
 *
 * @param {string} fileUri - Local file URI
 * @param {string} fileName - File name with extension
 * @param {(progress: number) => void} [onProgress]
 * @param {Object} [options]
 * @returns {Promise<{url: string, publicId: string, name: string, fileType: string, size: number}>}
 */
export const uploadDocumentToCloudinary = async (
  fileUri,
  fileName = "document",
  onProgress,
  options = {}
) => {
  const fileSize = await getFileSize(fileUri);
  if (fileSize > MAX_DOC_SIZE_BYTES) {
    throw new Error(
      `File is too large (${(fileSize / 1024 / 1024).toFixed(
        1
      )}MB). Maximum size is 25MB.`
    );
  }

  const folder = options?.folder || CLOUDINARY_FOLDERS.DOCUMENTS;
  const isPdf = /\.pdf$/i.test(fileName);
  const uploadUrl = isPdf ? CLOUDINARY_IMAGE_URL : CLOUDINARY_RAW_URL;

  const formData = new FormData();
  const cleanName = fileName || `doc_${Date.now()}`;

  if (Platform.OS === "web") {
    try {
      const response = await fetch(fileUri);
      const blob = await response.blob();
      formData.append("file", blob, cleanName);
    } catch {
      formData.append("file", fileUri);
    }
  } else {
    formData.append("file", {
      uri: Platform.OS === "ios" ? fileUri.replace("file://", "") : fileUri,
      type: isPdf ? "application/pdf" : "application/octet-stream",
      name: cleanName,
    });
  }

  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("cloud_name", CLOUD_NAME);
  if (folder) {
    formData.append("folder", folder);
    formData.append("asset_folder", folder);
  }
  if (options?.tags) {
    const tagsStr = Array.isArray(options.tags)
      ? options.tags.join(",")
      : String(options.tags);
    if (tagsStr.trim()) {
      formData.append("tags", tagsStr.trim());
    }
  }
  if (options?.context) {
    let contextStr = "";
    if (typeof options.context === "object") {
      contextStr = Object.entries(options.context)
        .filter(([_, v]) => v !== undefined && v !== null && String(v).trim() !== "")
        .map(([k, v]) => `${k}=${encodeURIComponent(String(v).trim())}`)
        .join("|");
    } else {
      contextStr = String(options.context);
    }
    if (contextStr.trim()) {
      formData.append("context", contextStr);
    }
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
          const meta = getDocumentMeta({
            url: response.secure_url,
            name: cleanName,
          });
          resolve({
            url: response.secure_url,
            publicId: response.public_id,
            name: cleanName,
            fileType: meta.type,
            size: fileSize,
          });
        } catch {
          reject(new Error("Failed to parse Cloudinary response"));
        }
      } else {
        let errorMsg = "Upload failed";
        try {
          const errResponse = JSON.parse(xhr.responseText);
          errorMsg = errResponse.error?.message || errorMsg;
        } catch {
          // Use default error
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

    xhr.timeout = 120000; // 120 seconds
    xhr.open("POST", uploadUrl);
    xhr.send(formData);
  });
};

/**
 * Convenience method to pick a document via system picker and upload to Cloudinary.
 * Automatically organizes into academic folders if academicContext is supplied.
 *
 * @param {(progress: number) => void} [onProgress]
 * @param {Object} [options]
 * @param {Object} [options.academicContext] - { className, subjectName, contentType, title, branch, teacherName }
 * @returns {Promise<{url: string, publicId: string, name: string, fileType: string, size: number, folder?: string}|null>}
 */
export const pickAndUploadDocument = async (onProgress, options = {}) => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        "application/pdf",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain",
        "application/octet-stream",
        "*/*",
      ],
      copyToCacheDirectory: true,
    });

    if (
      !result ||
      result.canceled ||
      !result.assets ||
      result.assets.length === 0
    ) {
      return null;
    }

    const file = result.assets[0];
    if (onProgress) onProgress(0);

    let targetFolder = options?.folder || CLOUDINARY_FOLDERS.DOCUMENTS;
    let targetFileName = file.name || "document";
    let tags = options?.tags;
    let context = options?.context;

    if (options?.academicContext) {
      targetFolder = buildAcademicCloudinaryFolder(options.academicContext);
      targetFileName = buildAcademicFileName({
        title: options.academicContext.title,
        originalName: file.name || "document",
        contentType: options.academicContext.contentType,
      });
      const meta = buildAcademicTagsAndContext(options.academicContext);
      tags = meta.tags;
      context = meta.context;
    }

    const uploaded = await uploadDocumentToCloudinary(
      file.uri,
      targetFileName,
      onProgress,
      {
        ...options,
        folder: targetFolder,
        tags,
        context,
      }
    );

    return {
      ...uploaded,
      name: file.name || uploaded.name,
      size: file.size || uploaded.size,
      folder: targetFolder,
    };
  } catch (err) {
    console.error("pickAndUploadDocument error:", err);
    throw err;
  }
};

/**
 * Universal Academic Attachment Uploader.
 * Automatically dispatches images, videos, presentations, and documents to their
 * organized hierarchical academic folders with chronological naming, tags, and context.
 *
 * @param {string|Object} fileOrUri - Local file URI or Asset object
 * @param {Object} academicContext - { className, subjectName, contentType, title, teacherName, branch, originalName }
 * @param {(progress: number) => void} [onProgress]
 * @param {Object} [extraOptions]
 * @returns {Promise<{url: string, publicId: string, name: string, fileType: string, size: number, folder: string}>}
 */
export const uploadAcademicAttachment = async (
  fileOrUri,
  academicContext = {},
  onProgress = null,
  extraOptions = {}
) => {
  const uri =
    typeof fileOrUri === "string"
      ? fileOrUri
      : fileOrUri?.uri || fileOrUri?.url || "";
  const rawName =
    typeof fileOrUri === "object"
      ? fileOrUri.name || fileOrUri.fileName || ""
      : academicContext.originalName || "attachment";

  const folder = buildAcademicCloudinaryFolder(academicContext);
  const { tags, context } = buildAcademicTagsAndContext(academicContext);

  const isVideo = isVideoAsset(fileOrUri) || isVideoAsset({ uri });
  const isDoc =
    !isVideo &&
    (/\.(pdf|pptx|ppt|docx|doc|xlsx|xls|txt|csv)(\?.*)?$/i.test(rawName) ||
      /\.(pdf|pptx|ppt|docx|doc|xlsx|xls|txt|csv)(\?.*)?$/i.test(uri) ||
      fileOrUri?.type === "document" ||
      fileOrUri?.mimeType?.includes("pdf") ||
      fileOrUri?.mimeType?.includes("document") ||
      fileOrUri?.mimeType?.includes("presentation") ||
      fileOrUri?.mimeType?.includes("sheet"));

  if (isVideo) {
    const fileName = buildAcademicFileName({
      title: academicContext.title,
      originalName: rawName || "clip.mp4",
      contentType: academicContext.contentType || "note",
      defaultExt: "mp4",
    });
    const result = await uploadVideoToCloudinary(uri, onProgress, {
      folder,
      fileName,
      tags,
      context,
      ...extraOptions,
    });
    return {
      ...result,
      name: fileName,
      fileType: "video",
      folder,
    };
  }

  if (isDoc) {
    const fileName = buildAcademicFileName({
      title: academicContext.title,
      originalName: rawName || "document.pdf",
      contentType: academicContext.contentType || "note",
      defaultExt: "pdf",
    });
    const result = await uploadDocumentToCloudinary(uri, fileName, onProgress, {
      folder,
      tags,
      context,
      ...extraOptions,
    });
    return {
      ...result,
      name: rawName || fileName,
      folder,
    };
  }

  // Image (JPG / PNG)
  const fileName = buildAcademicFileName({
    title: academicContext.title,
    originalName: rawName || "photo.jpg",
    contentType: academicContext.contentType || "note",
    defaultExt: "jpg",
  });
  const compressedUri = await compressImage(uri);
  const result = await uploadToCloudinary(compressedUri, onProgress, {
    folder,
    fileName,
    tags,
    context,
    ...extraOptions,
  });

  return {
    url: result.url,
    publicId: result.publicId,
    name: rawName || fileName,
    fileType: "image",
    size: 0,
    folder,
  };
};


