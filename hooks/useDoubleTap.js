import { useRef, useCallback } from "react";

/**
 * Hook to distinguish between single tap and double tap gestures.
 *
 * @param {Function} onDoubleTap - Callback when double tap is detected
 * @param {Function} [onSingleTap] - Optional callback when single tap occurs
 * @param {number} [delay=300] - Max interval in ms to count as double tap
 * @returns {Function} Press handler to attach to Pressable onPress
 */
export function useDoubleTap(onDoubleTap, onSingleTap, delay = 300) {
  const lastTapRef = useRef(0);
  const timerRef = useRef(null);

  return useCallback(
    (...args) => {
      const now = Date.now();
      if (now - lastTapRef.current < delay) {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        lastTapRef.current = 0;
        onDoubleTap?.(...args);
      } else {
        lastTapRef.current = now;
        if (onSingleTap) {
          timerRef.current = setTimeout(() => {
            onSingleTap(...args);
            timerRef.current = null;
          }, delay);
        }
      }
    },
    [onDoubleTap, onSingleTap, delay]
  );
}

export default useDoubleTap;
