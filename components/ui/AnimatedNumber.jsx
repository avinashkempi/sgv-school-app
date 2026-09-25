import React, { useState, useEffect, useRef, memo } from "react";
import { Text } from "react-native";
import { useTheme, FONTS, FONT_SIZES } from "../../theme";

/**
 * Standard cubic ease-out for natural count-up feel
 */
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

/**
 * AnimatedNumber - Smooth numerical count-up animation
 * 
 * Perfect for stat cards, attendance percentages, fees balance, and exam marks.
 * 
 * @param {number|string} value - The target numerical value
 * @param {number} [duration=900] - Animation duration in ms
 * @param {number} [delay=0] - Delay before starting in ms
 * @param {number} [decimals=0] - Number of decimal digits
 * @param {string} [prefix=''] - Prefix string (e.g. '₹', '+')
 * @param {string} [suffix=''] - Suffix string (e.g. '%', ' pts')
 * @param {Function} [formatter] - Optional custom number formatter (e.g. formatNumber)
 * @param {Object} [style] - Text style overrides
 */
const AnimatedNumber = memo(({
  value = 0,
  duration = 900,
  delay = 0,
  decimals = 0,
  prefix = "",
  suffix = "",
  formatter,
  style,
  ...props
}) => {
  const { colors } = useTheme();

  const targetNum = typeof value === "number" ? value : parseFloat(value) || 0;
  const [displayValue, setDisplayValue] = useState(targetNum === 0 ? 0 : 0);
  const startNumRef = useRef(0);
  const startTimeRef = useRef(null);
  const animFrameRef = useRef(null);

  useEffect(() => {
    startNumRef.current = displayValue;
    const startVal = startNumRef.current;
    const delta = targetNum - startVal;

    let timeoutId;

    const startAnimation = () => {
      startTimeRef.current = null;

      const step = (timestamp) => {
        if (!startTimeRef.current) startTimeRef.current = timestamp;
        const elapsed = timestamp - startTimeRef.current;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeOutCubic(progress);

        const current = startVal + delta * eased;
        setDisplayValue(current);

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(step);
        } else {
          setDisplayValue(targetNum);
        }
      };

      animFrameRef.current = requestAnimationFrame(step);
    };

    if (delay > 0) {
      timeoutId = setTimeout(startAnimation, delay);
    } else {
      startAnimation();
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetNum, duration, delay]);

  // Format the output
  const formattedNumber = (() => {
    const fixed = displayValue.toFixed(decimals);
    if (formatter) {
      return formatter(displayValue);
    }
    // Standard thousands separator formatting
    const parts = fixed.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  })();

  const fullText = `${prefix}${formattedNumber}${suffix}`;

  return (
    <Text
      style={[
        {
          fontFamily: FONTS.bold,
          fontSize: FONT_SIZES.xl || 24,
          color: colors.textPrimary || colors.onSurface,
          includeFontPadding: false,
        },
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={`${prefix}${targetNum.toFixed(decimals)}${suffix}`}
      {...props}
    >
      {fullText}
    </Text>
  );
});

AnimatedNumber.displayName = "AnimatedNumber";

export default AnimatedNumber;
