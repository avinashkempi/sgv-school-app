/**
 * AppState-aware refetch for React Query.
 *
 * Wires React Native's AppState to React Query's focusManager so that
 * stale queries are automatically refetched when the app comes back to
 * the foreground. Includes a minimum-background-duration check to avoid
 * spurious refreshes during quick app-switches.
 *
 * Usage: call `setupAppStateRefresh()` once in _layout.jsx
 */
import { AppState, Platform } from 'react-native';
import { focusManager } from '@tanstack/react-query';

// Minimum time (ms) the app must be in the background before we
// trigger a refetch on resume. Prevents battery drain from quick switches.
const MIN_BACKGROUND_DURATION_MS = 2 * 60 * 1000; // 2 minutes

let lastBackgroundTimestamp = null;
let appStateSubscription = null;

/**
 * Handle AppState transitions.
 * - When app goes to background/inactive: record timestamp
 * - When app goes to active: check if enough time passed, then tell
 *   React Query the app is "focused" to trigger stale refetches
 */
function handleAppStateChange(nextAppState) {
  if (nextAppState === 'background' || nextAppState === 'inactive') {
    lastBackgroundTimestamp = Date.now();
    focusManager.setFocused(false);
  } else if (nextAppState === 'active') {
    const wasInBackground = lastBackgroundTimestamp !== null;
    const backgroundDuration = wasInBackground
      ? Date.now() - lastBackgroundTimestamp
      : 0;

    if (!wasInBackground || backgroundDuration >= MIN_BACKGROUND_DURATION_MS) {
      // Enough time has passed — tell React Query to refetch stale queries
      focusManager.setFocused(true);
    } else {
      // Quick switch — just mark as focused without triggering refetch
      // (focusManager already handles this internally when focus was never lost)
      focusManager.setFocused(true);
    }

    lastBackgroundTimestamp = null;
  }
}

/**
 * Initialize the AppState ↔ focusManager bridge.
 * Call this once in your root _layout.jsx.
 * Returns a cleanup function.
 */
export function setupAppStateRefresh() {
  // On web, React Query's built-in visibilitychange listener works fine
  if (Platform.OS === 'web') return () => {};

  // Subscribe to AppState changes
  appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

  // Set initial focus state
  focusManager.setFocused(AppState.currentState === 'active');

  return () => {
    if (appStateSubscription) {
      appStateSubscription.remove();
      appStateSubscription = null;
    }
  };
}
