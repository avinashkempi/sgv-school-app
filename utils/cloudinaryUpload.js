import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Alert, Platform } from 'react-native';

// Cloudinary configuration
const CLOUD_NAME = 'atnkf0cu';
const UPLOAD_PRESET = 'sgv_school_uploads';
const CLOUDINARY_IMAGE_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
const CLOUDINARY_VIDEO_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`;

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
  if (typeof asset === 'object' && asset.type === 'video') return true;
  if (typeof asset === 'object' && asset.mimeType && asset.mimeType.startsWith('video/')) return true;
  const uri = typeof asset === 'string' ? asset : (asset.uri || asset.url || asset.fileName || asset.name || '');
  return /\.(mov|mp4|m4v|webm|avi|3gp|mkv|flv|wmv|qt)(\?.*)?$/i.test(uri);
};

/**
 * Request camera/gallery permissions.
 * Returns true if granted, false otherwise.
 */
const requestPermissions = async (source) => {
  if (Platform.OS === 'web') return true;

  if (source === 'camera') {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is needed to take photos.');
      return false;
    }
  } else {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library permission is needed to select images.');
      return false;
    }
  }
  return true;
};

/**
 * Pick an image from the gallery or camera.
 * @param {'gallery'|'camera'} source
 * @returns {Promise<{uri: string, width: number, height: number}|null>}
 */
export const pickImage = async (source = 'gallery') => {
  const hasPermission = await requestPermissions(source);
  if (!hasPermission) return null;

  const options = {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [16, 9],
    quality: 0.9,
  };

  let result;
  if (source === 'camera' && Platform.OS !== 'web') {
    result = await ImagePicker.launchCameraAsync(options);
  } else {
    result = await ImagePicker.launchImageLibraryAsync(options);
  }

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  return result.assets[0];
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
export const pickVibeMedia = async (source = 'gallery', mediaType = 'all', remainingSlots = 5) => {
  const hasPermission = await requestPermissions(source);
  if (!hasPermission) return [];

  let expoMediaTypes = ['images', 'videos'];
  if (mediaType === 'images') expoMediaTypes = ['images'];
  if (mediaType === 'videos') expoMediaTypes = ['videos'];

  const options = {
    mediaTypes: expoMediaTypes,
    allowsEditing: false,
    allowsMultipleSelection: mediaType !== 'videos' && remainingSlots > 1,
    quality: 0.85,
    videoMaxDuration: MAX_VIDEO_DURATION_SEC,
    selectionLimit: mediaType === 'videos' ? 1 : Math.min(remainingSlots, 5),
  };

  let result;
  if (source === 'camera' && Platform.OS !== 'web') {
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
  const isVideoSelected = assets.some(a => isVideoAsset(a));

  if (isVideoSelected) {
    // Only 1 video is permitted per vibe
    const videoAsset = assets.find(a => isVideoAsset(a)) || assets[0];
    const durationSec = videoAsset.duration
      ? (videoAsset.duration > 500 ? videoAsset.duration / 1000 : videoAsset.duration)
      : 0;

    if (durationSec > MAX_VIDEO_DURATION_SEC + 1) {
      Alert.alert(
        'Video Too Long',
        `Videos on Vibes are limited to ${MAX_VIDEO_DURATION_SEC} seconds. Please choose a shorter clip.`
      );
      return [];
    }

    const width = videoAsset.width || 720;
    const height = videoAsset.height || 1280;
    const aspectRatio = width && height ? Number((width / height).toFixed(3)) : 0.562;

    return [{
      type: 'video',
      uri: videoAsset.uri,
      width,
      height,
      aspectRatio,
      duration: Math.round(durationSec),
    }];
  }

  // Up to 5 photos
  const selectedPhotos = assets.slice(0, remainingSlots);
  return selectedPhotos.map(asset => ({
    type: isVideoAsset(asset) ? 'video' : 'image',
    uri: asset.uri,
    width: asset.width || 1080,
    height: asset.height || 1080,
    aspectRatio: asset.width && asset.height ? Number((asset.width / asset.height).toFixed(3)) : 1,
  }));
};

// Backward-compatible alias
export const pickVibeImages = (source = 'gallery', allowsMultipleSelection = false) => {
  return pickVibeMedia(source, allowsMultipleSelection ? 'images' : 'all', allowsMultipleSelection ? 5 : 1);
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
    console.warn('Image compression failed, using original:', error);
    return uri; // Fall back to original if compression fails
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
 * @returns {Promise<{url: string, publicId: string}>}
 */
export const uploadToCloudinary = async (uri, onProgress) => {
  // If video is passed into image uploader, delegate to video uploader automatically
  if (isVideoAsset({ uri })) {
    return uploadVideoToCloudinary(uri, onProgress);
  }

  // Validate file size before upload
  const fileSize = await getFileSize(uri);
  if (fileSize > MAX_FILE_SIZE_BYTES) {
    throw new Error(`Image is too large (${(fileSize / 1024 / 1024).toFixed(1)}MB). Maximum size is 10MB.`);
  }

  const formData = new FormData();

  if (Platform.OS === 'web') {
    // In web browsers, fetch the local blob from the blob:/data: URI and append as a real Blob
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      formData.append('file', blob, `vibe_${Date.now()}.jpg`);
    } catch {
      // If fetching the blob fails, append URI string directly
      formData.append('file', uri);
    }
  } else {
    // React Native mobile format
    formData.append('file', {
      uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
      type: 'image/jpeg',
      name: `vibe_${Date.now()}.jpg`,
    });
  }

  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('cloud_name', CLOUD_NAME);

  // Use XMLHttpRequest for progress tracking
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve({
            url: response.secure_url,
            publicId: response.public_id,
          });
        } catch (e) {
          reject(new Error('Failed to parse Cloudinary response'));
        }
      } else {
        let errorMsg = 'Upload failed';
        try {
          const errResponse = JSON.parse(xhr.responseText);
          errorMsg = errResponse.error?.message || errorMsg;
        } catch {
          // Use default error message
        }
        reject(new Error(errorMsg));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload. Please check your internet connection.'));
    });

    xhr.addEventListener('timeout', () => {
      reject(new Error('Upload timed out. Please try again.'));
    });

    xhr.timeout = 60000; // 60 second timeout
    xhr.open('POST', CLOUDINARY_IMAGE_URL);
    xhr.send(formData);
  });
};

/**
 * Full pipeline: Pick → Compress → Upload
 * Convenience function that chains all steps.
 *
 * @param {'gallery'|'camera'} source
 * @param {(progress: number) => void} [onProgress]
 * @returns {Promise<{url: string, localUri: string}|null>} null if user cancelled
 */
export const pickAndUploadImage = async (source = 'gallery', onProgress) => {
  const picked = await pickImage(source);
  if (!picked) return null;

  if (onProgress) onProgress(0);

  const compressedUri = await compressImage(picked.uri);

  const result = await uploadToCloudinary(compressedUri, onProgress);

  return {
    url: result.url,
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
 * @returns {Promise<{url: string, publicId: string, thumbnailUrl: string, duration: number, width: number, height: number}>}
 */
export const uploadVideoToCloudinary = async (uri, onProgress) => {
  const fileSize = await getFileSize(uri);
  if (fileSize > MAX_VIDEO_SIZE_BYTES) {
    throw new Error(`Video is too large (${(fileSize / 1024 / 1024).toFixed(1)}MB). Maximum size is 30MB.`);
  }

  const formData = new FormData();
  const uriStr = typeof uri === 'string' ? uri : (uri?.uri || '');
  const ext = uriStr.split('.').pop()?.split('?')[0]?.toLowerCase() || 'mov';
  const isMov = ext === 'mov' || ext === 'qt';
  const mimeType = isMov ? 'video/quicktime' : (ext === 'webm' ? 'video/webm' : 'video/mp4');
  const filename = `vibe_video_${Date.now()}.${ext}`;

  if (Platform.OS === 'web') {
    try {
      const response = await fetch(uriStr);
      const blob = await response.blob();
      formData.append('file', blob, filename);
    } catch {
      formData.append('file', uriStr);
    }
  } else {
    formData.append('file', {
      uri: Platform.OS === 'ios' ? uriStr.replace('file://', '') : uriStr,
      type: mimeType,
      name: filename,
    });
  }

  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('cloud_name', CLOUD_NAME);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
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
          reject(new Error('Failed to parse Cloudinary video response'));
        }
      } else {
        let errorMsg = 'Video upload failed';
        try {
          const errResponse = JSON.parse(xhr.responseText);
          errorMsg = errResponse.error?.message || errorMsg;
        } catch {
          // Use default
        }
        reject(new Error(errorMsg));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during video upload. Please check your internet connection.'));
    });

    xhr.addEventListener('timeout', () => {
      reject(new Error('Video upload timed out. Please try again.'));
    });

    xhr.timeout = 120000; // 120 second timeout for video
    xhr.open('POST', CLOUDINARY_VIDEO_URL);
    xhr.send(formData);
  });
};

/**
 * Get dynamic Cloudinary video stream URL optimized for mobile playback.
 * Automatically transcodes and caps at 720p HD with auto-codec.
 *
 * @param {string} url - Original Cloudinary video URL
 * @returns {string} Optimized streaming URL
 */
export const getOptimizedVideoUrl = (url) => {
  if (!url || !url.includes('cloudinary.com')) return url;
  if (url.includes('/upload/w_') || url.includes('/upload/q_')) return url;

  return url.replace(
    '/upload/',
    '/upload/w_720,q_auto,f_auto,vc_auto,c_limit/'
  );
};

/**
 * Get dynamic video poster thumbnail from a video URL or public ID.
 *
 * @param {string} videoUrl - Cloudinary video URL
 * @param {string} [thumbnailUrl] - Precomputed thumbnail URL if available
 * @returns {string} Poster JPEG image URL
 */
export const getVideoPosterUrl = (videoUrl, thumbnailUrl) => {
  if (thumbnailUrl && thumbnailUrl.trim()) return thumbnailUrl;
  if (!videoUrl || !videoUrl.includes('cloudinary.com')) return videoUrl;

  // Derive poster by inserting so_0 (first frame) and replacing extension with .jpg
  return videoUrl
    .replace('/upload/', '/upload/so_0,w_720,q_auto,f_auto,c_limit/')
    .replace(/\.(mp4|mov|avi|webm|mkv)$/i, '.jpg');
};

/**
 * Get a Cloudinary optimized URL for display.
 * Appends transformation parameters for responsive loading.
 *
 * @param {string} url - Original Cloudinary URL
 * @param {Object} [options]
 * @param {number} [options.width=800] - Desired width
 * @param {string} [options.quality='auto'] - Quality setting
 * @returns {string} Transformed URL
 */
export const getOptimizedCloudinaryUrl = (url, { width = 800, quality = 'auto' } = {}) => {
  if (!url || !url.includes('cloudinary.com')) return url;

  // Insert transformation before /upload/ path
  return url.replace(
    '/upload/',
    `/upload/w_${width},q_${quality},f_auto,c_limit/`
  );
};
