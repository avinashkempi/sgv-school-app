import React, { useCallback } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useTheme, FONTS, FONT_SIZES } from "../../theme";

/**
 * VibeActionSheetModal — Material 3 Bottom Sheet for Vibe Card Options.
 * Replaces native Alert.alert which on Android only supports a maximum of 3 buttons,
 * ensuring all features (Edit, Delete, Pin, Spotlight, Viewers, Save, Share)
 * are reliably accessible across Android, iOS, and Web.
 */
export default function VibeActionSheetModal({
  visible,
  onClose,
  vibe,
  isAdmin = false,
  canModerate = false,
  isBookmarked = false,
  onShare,
  onToggleBookmark,
  onToggleSpotlight,
  onTogglePin,
  onOpenViewers,
  onEdit,
  onDelete,
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const handleAction = useCallback(
    (actionFn) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      onClose();
      if (typeof actionFn === "function") {
        // Small delay so modal closes smoothly before action runs
        setTimeout(() => actionFn(), 120);
      }
    },
    [onClose]
  );

  const handleDeletePrompt = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    onClose();
    setTimeout(() => {
      Alert.alert(
        "Delete Vibe",
        "Are you sure you want to delete this vibe? This action cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => onDelete?.(vibe),
          },
        ]
      );
    }, 150);
  }, [onClose, onDelete, vibe]);

  if (!visible || !vibe) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Backdrop tap to dismiss */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Dismiss menu"
        />

        {/* Bottom Sheet Container */}
        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: colors.surfaceContainerHigh || colors.surface,
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}
        >
          {/* Top Drag Handle Bar */}
          <View style={styles.handleBarWrapper}>
            <View
              style={[
                styles.handleBar,
                { backgroundColor: colors.outlineVariant || "rgba(0,0,0,0.2)" },
              ]}
            />
          </View>

          {/* Title Header */}
          <View style={styles.sheetHeader}>
            <Text
              style={[
                styles.sheetTitle,
                { color: colors.onSurface },
              ]}
            >
              Vibe Options
            </Text>
          </View>

          {/* Action List */}
          <View style={styles.optionsList}>
            {/* 1. Share */}
            <Pressable
              onPress={() => handleAction(onShare)}
              style={({ pressed }) => [
                styles.optionItem,
                pressed && { backgroundColor: colors.surfaceContainerHighest },
              ]}
              accessibilityRole="button"
            >
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: colors.surfaceContainerHighest },
                ]}
              >
                <MaterialIcons name="share" size={20} color={colors.primary} />
              </View>
              <View style={styles.optionContent}>
                <Text style={[styles.optionLabel, { color: colors.onSurface }]}>
                  Share Vibe
                </Text>
                <Text style={[styles.optionSub, { color: colors.onSurfaceVariant }]}>
                  Send link, caption, or save media
                </Text>
              </View>
            </Pressable>

            {/* 2. Bookmark / Save */}
            <Pressable
              onPress={() => handleAction(onToggleBookmark)}
              style={({ pressed }) => [
                styles.optionItem,
                pressed && { backgroundColor: colors.surfaceContainerHighest },
              ]}
              accessibilityRole="button"
            >
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: colors.surfaceContainerHighest },
                ]}
              >
                <MaterialIcons
                  name={isBookmarked ? "bookmark-remove" : "bookmark-border"}
                  size={20}
                  color={isBookmarked ? "#D97706" : colors.onSurface}
                />
              </View>
              <View style={styles.optionContent}>
                <Text style={[styles.optionLabel, { color: colors.onSurface }]}>
                  {isBookmarked ? "Remove from Saved" : "Save Vibe"}
                </Text>
                <Text style={[styles.optionSub, { color: colors.onSurfaceVariant }]}>
                  {isBookmarked
                    ? "Remove from your saved collection"
                    : "Bookmark to view anytime later"}
                </Text>
              </View>
            </Pressable>

            {/* 3. Spotlight (Admin) */}
            {isAdmin && (
              <Pressable
                onPress={() => handleAction(onToggleSpotlight)}
                style={({ pressed }) => [
                  styles.optionItem,
                  pressed && { backgroundColor: colors.surfaceContainerHighest },
                ]}
                accessibilityRole="button"
              >
                <View
                  style={[
                    styles.iconWrap,
                    {
                      backgroundColor: vibe.isSpotlight
                        ? "#FEF3C7"
                        : colors.surfaceContainerHighest,
                    },
                  ]}
                >
                  <MaterialIcons
                    name="auto-awesome"
                    size={20}
                    color={vibe.isSpotlight ? "#D97706" : colors.onSurface}
                  />
                </View>
                <View style={styles.optionContent}>
                  <Text style={[styles.optionLabel, { color: colors.onSurface }]}>
                    {vibe.isSpotlight
                      ? "Remove from Home Spotlight"
                      : "Feature on Home Spotlight"}
                  </Text>
                  <Text style={[styles.optionSub, { color: colors.onSurfaceVariant }]}>
                    Prominently highlight this vibe on the campus home screen
                  </Text>
                </View>
              </Pressable>
            )}

            {/* 4. Pin to Top (Admin) */}
            {isAdmin && (
              <Pressable
                onPress={() => handleAction(onTogglePin)}
                style={({ pressed }) => [
                  styles.optionItem,
                  pressed && { backgroundColor: colors.surfaceContainerHighest },
                ]}
                accessibilityRole="button"
              >
                <View
                  style={[
                    styles.iconWrap,
                    {
                      backgroundColor: vibe.isPinned
                        ? colors.primaryContainer
                        : colors.surfaceContainerHighest,
                    },
                  ]}
                >
                  <MaterialIcons
                    name="push-pin"
                    size={20}
                    color={vibe.isPinned ? colors.primary : colors.onSurface}
                  />
                </View>
                <View style={styles.optionContent}>
                  <Text style={[styles.optionLabel, { color: colors.onSurface }]}>
                    {vibe.isPinned ? "Unpin from Top" : "Pin to Top"}
                  </Text>
                  <Text style={[styles.optionSub, { color: colors.onSurfaceVariant }]}>
                    Keep this post at the very top of the Vibes feed
                  </Text>
                </View>
              </Pressable>
            )}

            {/* 5. View Audience / Viewers (Author / Admin) */}
            {canModerate && (
              <Pressable
                onPress={() => handleAction(onOpenViewers)}
                style={({ pressed }) => [
                  styles.optionItem,
                  pressed && { backgroundColor: colors.surfaceContainerHighest },
                ]}
                accessibilityRole="button"
              >
                <View
                  style={[
                    styles.iconWrap,
                    { backgroundColor: colors.surfaceContainerHighest },
                  ]}
                >
                  <MaterialIcons
                    name="visibility"
                    size={20}
                    color={colors.tertiary || "#0284C7"}
                  />
                </View>
                <View style={styles.optionContent}>
                  <Text style={[styles.optionLabel, { color: colors.onSurface }]}>
                    Viewers & Audience
                  </Text>
                  <Text style={[styles.optionSub, { color: colors.onSurfaceVariant }]}>
                    See campus members who viewed this vibe
                  </Text>
                </View>
              </Pressable>
            )}

            {/* 6. Edit Vibe (Author / Admin) */}
            {canModerate && (
              <Pressable
                onPress={() => handleAction(onEdit)}
                style={({ pressed }) => [
                  styles.optionItem,
                  pressed && { backgroundColor: colors.surfaceContainerHighest },
                ]}
                accessibilityRole="button"
              >
                <View
                  style={[
                    styles.iconWrap,
                    { backgroundColor: colors.primaryContainer },
                  ]}
                >
                  <MaterialIcons name="edit" size={20} color={colors.primary} />
                </View>
                <View style={styles.optionContent}>
                  <Text style={[styles.optionLabel, { color: colors.onSurface }]}>
                    Edit Vibe
                  </Text>
                  <Text style={[styles.optionSub, { color: colors.onSurfaceVariant }]}>
                    Update caption, category, media, or settings
                  </Text>
                </View>
              </Pressable>
            )}

            {/* 7. Delete Vibe (Author / Admin) */}
            {canModerate && (
              <Pressable
                onPress={handleDeletePrompt}
                style={({ pressed }) => [
                  styles.optionItem,
                  pressed && { backgroundColor: "rgba(239, 68, 68, 0.08)" },
                ]}
                accessibilityRole="button"
              >
                <View
                  style={[
                    styles.iconWrap,
                    { backgroundColor: "rgba(239, 68, 68, 0.12)" },
                  ]}
                >
                  <MaterialIcons
                    name="delete-outline"
                    size={20}
                    color={colors.error || "#EF4444"}
                  />
                </View>
                <View style={styles.optionContent}>
                  <Text
                    style={[
                      styles.optionLabel,
                      { color: colors.error || "#EF4444" },
                    ]}
                  >
                    Delete Vibe
                  </Text>
                  <Text
                    style={[
                      styles.optionSub,
                      { color: colors.error || "#EF4444", opacity: 0.8 },
                    ]}
                  >
                    Permanently remove this post from school feed
                  </Text>
                </View>
              </Pressable>
            )}
          </View>

          {/* Cancel Button */}
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.cancelButton,
              {
                backgroundColor: colors.surfaceContainerHighest,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.cancelText,
                { color: colors.onSurfaceVariant },
              ]}
            >
              Cancel
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: "85%",
  },
  handleBarWrapper: {
    alignItems: "center",
    paddingVertical: 6,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  sheetHeader: {
    paddingVertical: 10,
    marginBottom: 6,
  },
  sheetTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
  },
  optionsList: {
    gap: 4,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 14,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  optionSub: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    marginTop: 1,
  },
  cancelButton: {
    marginTop: 14,
    paddingVertical: 13,
    borderRadius: 20,
    alignItems: "center",
  },
  cancelText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
});
