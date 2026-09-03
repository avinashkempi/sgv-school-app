import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme, FONTS, FONT_SIZES, SPACING, RADIUS } from "../../theme";
import { useOfflineQueue } from "../../utils/offlineQueue";
import { useNetworkStatus } from "../NetworkStatusProvider";

function formatQueueTime(isoString) {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export default function OfflineQueueModal({ visible, onClose }) {
  const { colors, mode } = useTheme();
  const queryClient = useQueryClient();
  const { queue, isSyncing, syncNow, removeItem, clearFailed, failedCount } =
    useOfflineQueue(queryClient);
  const { isConnected } = useNetworkStatus();

  const isDark = mode === "dark";

  const handleSyncPress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await syncNow({ retryFailed: true });
  };

  const handleRemovePress = (id) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    removeItem(id);
  };

  const handleClearFailed = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    clearFailed();
  };

  const renderItem = ({ item }) => {
    const isPending = item.status === "pending";
    const isItemSyncing = item.status === "syncing";
    const isFailed = item.status === "failed";

    let statusBg = isDark ? "#334155" : "#F1F5F9";
    let statusTextColor = isDark ? "#94A3B8" : "#64748B";
    let statusLabel = "Pending";
    let iconName = "schedule";

    if (isItemSyncing) {
      statusBg = isDark ? "#1E3A8A" : "#DBEAFE";
      statusTextColor = isDark ? "#93C5FD" : "#1D4ED8";
      statusLabel = "Syncing";
      iconName = "sync";
    } else if (isFailed) {
      statusBg = isDark ? "#450A0A" : "#FEE2E2";
      statusTextColor = isDark ? "#F87171" : "#DC2626";
      statusLabel = "Failed";
      iconName = "error-outline";
    }

    return (
      <View
        style={[
          styles.queueItemCard,
          {
            backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
            borderColor: isDark ? "#334155" : "#E2E8F0",
          },
        ]}
      >
        <View style={styles.itemHeaderRow}>
          <View style={styles.itemTitleContainer}>
            <Text
              style={[
                styles.itemDescription,
                { color: isDark ? "#F8FAFC" : "#0F172A" },
              ]}
              numberOfLines={2}
            >
              {item.description}
            </Text>
            <Text
              style={[
                styles.itemMetaText,
                { color: isDark ? "#94A3B8" : "#64748B" },
              ]}
            >
              {item.type} • {formatQueueTime(item.createdAt)}
            </Text>
          </View>

          <Pressable
            onPress={() => handleRemovePress(item.id)}
            hitSlop={8}
            style={styles.deleteButton}
          >
            <MaterialIcons
              name="close"
              size={18}
              color={isDark ? "#94A3B8" : "#64748B"}
            />
          </Pressable>
        </View>

        {isFailed && item.lastError ? (
          <View
            style={[
              styles.errorBox,
              { backgroundColor: isDark ? "#2D1212" : "#FFF1F2" },
            ]}
          >
            <MaterialIcons name="error" size={14} color="#EF4444" />
            <Text style={styles.errorText} numberOfLines={2}>
              {item.lastError}
            </Text>
          </View>
        ) : null}

        <View style={styles.itemFooterRow}>
          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
            {isItemSyncing ? (
              <ActivityIndicator
                size="small"
                color={statusTextColor}
                style={{ transform: [{ scale: 0.7 }], marginRight: 4 }}
              />
            ) : (
              <MaterialIcons
                name={iconName}
                size={14}
                color={statusTextColor}
                style={{ marginRight: 4 }}
              />
            )}
            <Text style={[styles.statusBadgeText, { color: statusTextColor }]}>
              {statusLabel}
            </Text>
          </View>

          {item.retryCount > 0 && isPending ? (
            <Text
              style={[
                styles.retryText,
                { color: isDark ? "#94A3B8" : "#94A3B8" },
              ]}
            >
              Retried {item.retryCount}x
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            { backgroundColor: isDark ? "#0F172A" : "#F8FAFC" },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.iconCircle}>
                <MaterialIcons
                  name="cloud-queue"
                  size={22}
                  color={colors.primary}
                />
              </View>
              <View>
                <Text
                  style={[
                    styles.headerTitle,
                    { color: isDark ? "#FFFFFF" : "#0F172A" },
                  ]}
                >
                  Offline Outbox
                </Text>
                <Text
                  style={[
                    styles.headerSubtitle,
                    { color: isDark ? "#94A3B8" : "#64748B" },
                  ]}
                >
                  {queue.length === 0
                    ? "All actions are in sync"
                    : `${queue.length} action${queue.length === 1 ? "" : "s"} waiting to sync`}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={styles.closeHeaderButton}
            >
              <MaterialIcons
                name="close"
                size={22}
                color={isDark ? "#94A3B8" : "#64748B"}
              />
            </Pressable>
          </View>

          {/* Connection Banner inside modal */}
          {!isConnected && (
            <View style={styles.offlineNotice}>
              <MaterialIcons name="wifi-off" size={16} color="#B45309" />
              <Text style={styles.offlineNoticeText}>
                Device is offline. Changes will auto-sync when reconnected.
              </Text>
            </View>
          )}

          {/* List */}
          {queue.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons
                name="cloud-done"
                size={48}
                color={isDark ? "#334155" : "#CBD5E1"}
              />
              <Text
                style={[
                  styles.emptyTitle,
                  { color: isDark ? "#94A3B8" : "#64748B" },
                ]}
              >
                No pending offline actions
              </Text>
              <Text
                style={[
                  styles.emptySubtitle,
                  { color: isDark ? "#64748B" : "#94A3B8" },
                ]}
              >
                Actions performed without internet will automatically appear
                here until synced.
              </Text>
            </View>
          ) : (
            <FlatList
              data={queue}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}

          {/* Actions */}
          <View
            style={[
              styles.actionsFooter,
              {
                borderTopColor: isDark ? "#1E293B" : "#E2E8F0",
                backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
              },
            ]}
          >
            {failedCount > 0 && (
              <Pressable
                onPress={handleClearFailed}
                style={[styles.secondaryButton, { borderColor: "#EF4444" }]}
              >
                <Text style={styles.clearFailedText}>Clear Failed</Text>
              </Pressable>
            )}

            <Pressable
              onPress={handleSyncPress}
              disabled={isSyncing || !isConnected || queue.length === 0}
              style={[
                styles.primaryButton,
                {
                  backgroundColor:
                    !isConnected || queue.length === 0
                      ? isDark
                        ? "#334155"
                        : "#CBD5E1"
                      : colors.primary,
                },
              ]}
            >
              {isSyncing ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Syncing...</Text>
                </>
              ) : (
                <>
                  <MaterialIcons name="sync" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Sync Now</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: "80%",
    minHeight: "45%",
    paddingBottom: Platform.OS === "ios" ? 34 : SPACING.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(79, 55, 139, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.lg,
  },
  headerSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
  },
  closeHeaderButton: {
    padding: 4,
  },
  offlineNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    marginHorizontal: SPACING.lg,
    borderRadius: RADIUS.sm,
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  offlineNoticeText: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.xs,
    color: "#92400E",
    flex: 1,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  queueItemCard: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
  },
  itemHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  itemTitleContainer: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  itemDescription: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.sm,
  },
  itemMetaText: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.xs,
    marginTop: 3,
  },
  deleteButton: {
    padding: 2,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: SPACING.xs,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.xs,
  },
  errorText: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.xs,
    color: "#EF4444",
    flex: 1,
  },
  itemFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: SPACING.sm,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  statusBadgeText: {
    fontFamily: FONTS.medium,
    fontSize: 11,
  },
  retryText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.md,
    marginTop: SPACING.sm,
  },
  emptySubtitle: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.xs,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
  actionsFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    gap: SPACING.sm,
  },
  secondaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  clearFailedText: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.sm,
    color: "#EF4444",
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: RADIUS.md,
  },
  primaryButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.sm,
    color: "#FFFFFF",
  },
});
