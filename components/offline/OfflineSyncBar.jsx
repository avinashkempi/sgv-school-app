import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme, FONTS, FONT_SIZES, SPACING, RADIUS } from "../../theme";
import { useOfflineQueue } from "../../utils/offlineQueue";
import { useNetworkStatus } from "../NetworkStatusProvider";
import OfflineQueueModal from "./OfflineQueueModal";

export default function OfflineSyncBar() {
  const { mode } = useTheme();
  const queryClient = useQueryClient();
  const { pendingCount, failedCount, totalCount, isSyncing, syncNow } =
    useOfflineQueue(queryClient);
  const { isConnected } = useNetworkStatus();
  const [modalVisible, setModalVisible] = useState(false);

  // If queue is completely empty, render nothing
  if (totalCount === 0) {
    return null;
  }

  const isDark = mode === "dark";

  const handleBarPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setModalVisible(true);
  };

  const handleSyncButtonPress = async (e) => {
    e.stopPropagation?.();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await syncNow();
  };

  // Determine state & styling
  let bannerBg = isDark ? "#1E293B" : "#F8FAFC";
  let borderColor = isDark ? "#334155" : "#E2E8F0";
  let textColor = isDark ? "#F8FAFC" : "#0F172A";
  let iconName = "cloud-queue";
  let iconColor = "#6366F1";
  let statusText = `${pendingCount} action${pendingCount === 1 ? "" : "s"} saved offline`;

  if (isSyncing) {
    bannerBg = isDark ? "#1E3A8A" : "#EFF6FF";
    borderColor = isDark ? "#2563EB" : "#BFDBFE";
    textColor = isDark ? "#DBEAFE" : "#1E40AF";
    iconName = "sync";
    iconColor = isDark ? "#93C5FD" : "#2563EB";
    statusText = `Syncing ${pendingCount} offline action${pendingCount === 1 ? "" : "s"}...`;
  } else if (failedCount > 0) {
    bannerBg = isDark ? "#3B1111" : "#FEF2F2";
    borderColor = isDark ? "#991B1B" : "#FECACA";
    textColor = isDark ? "#FCA5A5" : "#991B1B";
    iconName = "error-outline";
    iconColor = "#EF4444";
    statusText = `${failedCount} action${failedCount === 1 ? "" : "s"} failed to sync`;
  } else if (!isConnected) {
    bannerBg = isDark ? "#2D2006" : "#FFFBEB";
    borderColor = isDark ? "#78350F" : "#FDE68A";
    textColor = isDark ? "#FCD34D" : "#92400E";
    iconName = "offline-bolt";
    iconColor = "#F59E0B";
    statusText = `${pendingCount} action${pendingCount === 1 ? "" : "s"} saved offline • Auto-syncs online`;
  } else {
    // Online and ready to sync
    bannerBg = isDark ? "#14251C" : "#F0FDF4";
    borderColor = isDark ? "#166534" : "#BBF7D0";
    textColor = isDark ? "#86EFAC" : "#166534";
    iconName = "cloud-upload";
    iconColor = "#22C55E";
    statusText = `${pendingCount} action${pendingCount === 1 ? "" : "s"} ready to sync`;
  }

  return (
    <>
      <Pressable
        onPress={handleBarPress}
        style={[
          styles.container,
          {
            backgroundColor: bannerBg,
            borderColor,
          },
        ]}
      >
        <View style={styles.leftRow}>
          {isSyncing ? (
            <ActivityIndicator
              size="small"
              color={iconColor}
              style={styles.spinner}
            />
          ) : (
            <MaterialIcons
              name={iconName}
              size={18}
              color={iconColor}
              style={styles.icon}
            />
          )}
          <Text
            style={[styles.statusText, { color: textColor }]}
            numberOfLines={1}
          >
            {statusText}
          </Text>
        </View>

        <View style={styles.rightRow}>
          {isConnected && !isSyncing && pendingCount > 0 && (
            <Pressable
              onPress={handleSyncButtonPress}
              hitSlop={6}
              style={[
                styles.miniSyncButton,
                { backgroundColor: iconColor },
              ]}
            >
              <Text style={styles.miniSyncButtonText}>Sync</Text>
            </Pressable>
          )}

          <MaterialIcons
            name="chevron-right"
            size={18}
            color={textColor}
            style={{ opacity: 0.6 }}
          />
        </View>
      </Pressable>

      <OfflineQueueModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 9,
    paddingHorizontal: SPACING.md,
    marginHorizontal: SPACING.md,
    marginTop: 6,
    marginBottom: 4,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  leftRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: SPACING.xs,
  },
  icon: {
    marginRight: 8,
  },
  spinner: {
    marginRight: 8,
    transform: [{ scale: 0.8 }],
  },
  statusText: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.xs,
    flex: 1,
  },
  rightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  miniSyncButton: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    marginRight: 2,
  },
  miniSyncButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: "#FFFFFF",
  },
});
