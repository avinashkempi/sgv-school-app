/**
 * Extracts the file ID from a Google Drive sharing link and returns a direct embed URL.
 * 
 * @param {string} url - The Google Drive sharing link.
 * @returns {string|null} - The direct embed URL or null if invalid.
 */
export const getGoogleDriveEmbedUrl = (url) => {
    if (!url) return null;

    try {
        // Pattern to match /d/FILE_ID/view
        const idMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)\/view/);

        if (idMatch && idMatch[1]) {
            const fileId = idMatch[1];
            return `https://drive.google.com/uc?export=view&id=${fileId}`;
        }

        // Fallback: check if it's already an embed link or other format containing id=
        const idParamMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (idParamMatch && idParamMatch[1]) {
            return `https://drive.google.com/uc?export=view&id=${idParamMatch[1]}`;
        }

        return url; // Return original if no ID found (might be a direct link already)
    } catch (error) {
        console.warn('Error transforming Google Drive URL:', error);
        return url;
    }
};
