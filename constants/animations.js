/**
 * SGV School App — Animation Design Tokens
 *
 * Central single source of truth for all animation durations, easing curves,
 * and spring configurations across the application.
 *
 * Principles:
 *   - Animations communicate state, hierarchy, feedback, continuity
 *   - No animation exists purely for decoration
 *   - Keep durations short (<350ms for most interactions)
 *   - Use easing to convey intent (decelerate for entrances, standard for movement)
 */

import { Easing } from "react-native-reanimated";

// ── DURATIONS ────────────────────────────────────────────────────────────────
export const DURATIONS = {
  instant: 100,     // Immediate feedback (press states, toggle switches)
  fast: 150,        // Quick transitions (tab switch, icon swap, tooltip)
  normal: 250,      // Standard transitions (screen fade, card entrance, modal)
  emphasis: 350,    // Emphasized transitions (count-up, hero reveal)
  slow: 500,        // Deliberate animations (onboarding page, celebration)
};

// ── EASING CURVES ────────────────────────────────────────────────────────────
// Material Design 3 motion tokens
export const EASINGS = {
  // Standard: For elements moving between resting positions
  standard: Easing.bezier(0.2, 0, 0, 1),
  // Decelerate: For elements entering the screen (slide-in, fade-in)
  decelerate: Easing.out(Easing.cubic),
  // Accelerate: For elements leaving the screen (slide-out, fade-out)
  accelerate: Easing.in(Easing.cubic),
  // Emphasized: For important transitions needing attention
  emphasized: Easing.bezier(0.4, 0, 0.2, 1),
  // Linear: For progress indicators, loading bars
  linear: Easing.linear,
};

// ── SPRING CONFIGURATIONS ────────────────────────────────────────────────────
// Pre-tuned spring configs for Reanimated's withSpring
export const SPRINGS = {
  // Snappy: Quick, responsive feel (button press, tab indicator)
  snappy: { damping: 20, stiffness: 300, mass: 0.8 },
  // Gentle: Smooth, natural feel (card entrance, modal slide)
  gentle: { damping: 15, stiffness: 150, mass: 1 },
  // Bouncy: Playful, energetic feel (like button, celebration)
  bouncy: { damping: 10, stiffness: 200, mass: 0.6 },
  // Stiff: Minimal overshoot (pill indicator, layout shift)
  stiff: { damping: 25, stiffness: 400, mass: 1 },
};

// ── STAGGER ──────────────────────────────────────────────────────────────────
// Delay between consecutive items in staggered list animations
export const STAGGER = {
  fast: 30,         // Dense lists (notifications, settings rows)
  normal: 50,       // Standard lists (cards, feed items)
  slow: 80,         // Hero sections (onboarding, dashboard modules)
};

export default {
  DURATIONS,
  EASINGS,
  SPRINGS,
  STAGGER,
};
