import React, { forwardRef, useCallback, useMemo } from "react";
import { StyleSheet } from "react-native";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../theme";

/**
 * AppBottomSheet - High performance native bottom sheet primitive
 * Runs 100% on the UI thread via Reanimated & RNGH
 *
 * @param {Array<string|number>} snapPoints - e.g. ['25%', '50%', '90%']
 * @param {boolean} enablePanDownToClose - allow swipe down to dismiss (default: true)
 * @param {boolean} scrollable - use BottomSheetScrollView instead of BottomSheetView
 * @param {Function} onChange - callback on snap index change
 * @param {Function} onClose - callback when closed
 */
const AppBottomSheet = forwardRef((props, ref) => {
  const {
    children,
    snapPoints: customSnapPoints,
    index = -1,
    enablePanDownToClose = true,
    scrollable = false,
    onChange,
    onClose,
    style,
    contentContainerStyle,
    ...rest
  } = props;

  const { colors, mode } = useTheme();

  const snapPoints = useMemo(
    () => customSnapPoints || ["35%", "60%", "90%"],
    [customSnapPoints]
  );

  const renderBackdrop = useCallback(
    (backdropProps) => (
      <BottomSheetBackdrop
        {...backdropProps}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={mode === "dark" ? 0.65 : 0.45}
        pressBehavior="close"
      />
    ),
    [mode]
  );

  const handleSheetChanges = useCallback(
    (nextIndex) => {
      if (nextIndex >= 0) {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch {
          // Haptics fallback on web/unsupported
        }
      }
      if (nextIndex === -1 && onClose) {
        onClose();
      }
      if (onChange) {
        onChange(nextIndex);
      }
    },
    [onChange, onClose]
  );

  const ContainerComponent = scrollable
    ? BottomSheetScrollView
    : BottomSheetView;

  return (
    <BottomSheet
      ref={ref}
      index={index}
      snapPoints={snapPoints}
      enablePanDownToClose={enablePanDownToClose}
      backdropComponent={renderBackdrop}
      onChange={handleSheetChanges}
      backgroundStyle={{
        backgroundColor: colors.surfaceContainerLow || colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
      }}
      handleIndicatorStyle={{
        backgroundColor: colors.outlineVariant,
        width: 40,
        height: 4,
        borderRadius: 2,
      }}
      style={[styles.sheetShadow, style]}
      {...rest}
    >
      <ContainerComponent style={[styles.content, contentContainerStyle]}>
        {children}
      </ContainerComponent>
    </BottomSheet>
  );
});

AppBottomSheet.displayName = "AppBottomSheet";

const styles = StyleSheet.create({
  sheetShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 16,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
});

export default React.memo(AppBottomSheet);
