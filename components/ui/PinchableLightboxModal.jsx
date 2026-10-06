import React from "react";
import VibeMediaViewerModal from "../vibes/VibeMediaViewerModal";

/**
 * PinchableLightboxModal — Universal Fullscreen Lightbox Modal
 * Supports:
 * - Single image via `imageUrl`
 * - Array of images/videos via `media` or `images`
 * - Pinch-to-zoom, double-tap zoom, video playback, swipe-to-dismiss
 */
export default function PinchableLightboxModal({
  visible,
  imageUrl,
  images,
  media,
  initialIndex = 0,
  onClose,
  authorName = "",
  onDoubleTapLike,
}) {
  const mediaList = media || images || (imageUrl ? [imageUrl] : []);

  return (
    <VibeMediaViewerModal
      visible={visible}
      media={mediaList}
      initialIndex={initialIndex}
      onClose={onClose}
      authorName={authorName}
      onDoubleTapLike={onDoubleTapLike}
    />
  );
}
