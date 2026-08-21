/**
 * Extracts the file ID from a Google Drive sharing link and returns an optimized edge thumbnail URL.
 * 
 * Google Drive raw download links (`uc?export=view&id=...`) serve full-resolution, multi-megabyte images,
 * causing high memory usage and un-downscaled bitmap decoding on Android.
 * Using Google Drive's edge thumbnail API (`thumbnail?id=...&sz=w...`) automatically downsamples,
 * compresses, and serves optimized WebP/JPEG images directly from Google's CDN.
 * 
 * @param {string} url - The Google Drive sharing link or file ID.
 * @param {Object} [options] - Options for image optimization.
 * @param {number} [options.width=1000] - Desired image width in pixels for server-side downsampling.
 * @returns {string|null} - The optimized thumbnail URL or original URL if not Google Drive.
 */
export const getGoogleDriveEmbedUrl = (url, { width = 1000 } = {}) => {
    if (!url) return null;

    try {
        const trimmed = String(url).trim();
        if (!trimmed) return null;

        // If it's already just a raw Drive file ID
        if (/^[a-zA-Z0-9_-]{25,50}$/.test(trimmed)) {
            return `https://drive.google.com/thumbnail?id=${trimmed}&sz=w${width}`;
        }

        // Pattern 1: /file/d/{FILE_ID} or /d/{FILE_ID}
        const pathMatch = trimmed.match(/\/(?:file\/)?d\/([a-zA-Z0-9_-]+)/);
        if (pathMatch && pathMatch[1]) {
            return `https://drive.google.com/thumbnail?id=${pathMatch[1]}&sz=w${width}`;
        }

        // Pattern 2: id={FILE_ID} in query parameters (e.g. uc?export=view&id=..., open?id=..., thumbnail?id=...)
        const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (idParamMatch && idParamMatch[1]) {
            return `https://drive.google.com/thumbnail?id=${idParamMatch[1]}&sz=w${width}`;
        }

        // Pattern 3: lh3.googleusercontent.com/d/{FILE_ID}
        const lh3Match = trimmed.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
        if (lh3Match && lh3Match[1]) {
            return `https://drive.google.com/thumbnail?id=${lh3Match[1]}&sz=w${width}`;
        }

        return trimmed; // Return original if not recognized as Google Drive
    } catch (error) {
        console.warn('Error transforming Google Drive URL:', error);
        return url;
    }
};

