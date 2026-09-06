import React, { useCallback } from "react";
import {
  View,
  Text,
  Modal,
  FlatList,
  Pressable,
  StyleSheet,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme, FONTS, FONT_SIZES } from "../../theme";
import { useApiQuery } from "../../hooks/useApi";
import apiConfig from "../../config/apiConfig";
import { CACHE_TIERS } from "../../utils/cacheConfig";
import SkeletonLoader from "../SkeletonLoader";
import UserAvatar from "../ui/UserAvatar";
import {
  formatUserName,
  formatUserDesignationOrRole,
} from "../../utils/userFormatters";
import formatTimeAgo from "../../utils/formatTimeAgo";

export default function VibeViewersModal({ visible, onClose, vibeId }) {
  const { colors } = useTheme();

  const { data, isLoading } = useApiQuery(
    ["vibeViewers", vibeId],
    vibeId
      ? `${apiConfig.baseUrl}${apiConfig.endpoints.vibes.getViewers(vibeId)}`
      : null,
    {
      ...CACHE_TIERS.VIBES_REALTIME,
      enabled: !!vibeId && visible,
    }
  );

  const viewers = data?.data || [];
  const totalCount = data?.pagination?.total ?? viewers.length;

  const renderUserItem = useCallback(
    ({ item }) => {
      const displayName = formatUserName(item.name || "User");
      const roleText = formatUserDesignationOrRole(item);

      return (
        <View style={styles.userRow}>
          <UserAvatar
            photoUrl={item.profilePhoto}
            name={displayName}
            role={item.role}
            size={40}
          />
          <View style={styles.userDetails}>
            <Text
              style={[styles.userName, { color: colors.onSurface }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {displayName}
            </Text>
            <Text
              style={[styles.userRole, { color: colors.onSurfaceVariant }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {roleText}
            </Text>
          </View>
          <View style={styles.timeContainer}>
            <MaterialIcons
              name="schedule"
              size={12}
              color={colors.onSurfaceVariant}
              style={{ opacity: 0.8 }}
            />
            <Text
              style={[styles.timeText, { color: colors.onSurfaceVariant }]}
              numberOfLines={1}
            >
              {item.viewedAt ? formatTimeAgo(item.viewedAt) : "Viewed"}
            </Text>
          </View>
        </View>
      );
    },
    [colors]
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View
            style={[
              styles.header,
              {
                borderBottomColor:
                  colors.outlineVariant || "rgba(0,0,0,0.06)",
              },
            ]}
          >
            <View style={styles.handleBar} />
            <View style={styles.headerContentRow}>
              <View style={styles.headerTitleGroup}>
                <View
                  style={[
                    styles.eyeBadge,
                    { backgroundColor: colors.primaryContainer || "rgba(79, 70, 229, 0.12)" },
                  ]}
                >
                  <MaterialIcons
                    name="visibility"
                    size={15}
                    color={colors.primary}
                  />
                </View>
                <Text style={[styles.headerTitle, { color: colors.onSurface }]}>
                  Viewers {totalCount > 0 ? `(${totalCount})` : ""}
                </Text>
              </View>
              <Pressable
                onPress={onClose}
                hitSlop={12}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close viewers list"
              >
                <MaterialIcons
                  name="close"
                  size={20}
                  color={colors.onSurface}
                />
              </Pressable>
            </View>
          </View>

          {/* List Content */}
          {isLoading && viewers.length === 0 ? (
            <View style={styles.skeletonContainer}>
              {[1, 2, 3, 4, 5].map((i) => (
                <View key={i} style={styles.skeletonRow}>
                  <SkeletonLoader width={40} height={40} borderRadius={20} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <SkeletonLoader width={140} height={14} borderRadius={7} />
                    <SkeletonLoader width={90} height={11} borderRadius={5} />
                  </View>
                  <SkeletonLoader width={50} height={10} borderRadius={5} />
                </View>
              ))}
            </View>
          ) : viewers.length === 0 ? (
            <View style={styles.centerContainer}>
              <MaterialIcons
                name="visibility-off"
                size={40}
                color={colors.onSurfaceVariant}
                style={{ opacity: 0.6, marginBottom: 8 }}
              />
              <Text
                style={[styles.emptyText, { color: colors.onSurface }]}
              >
                No viewers yet
              </Text>
              <Text
                style={[styles.emptySubText, { color: colors.onSurfaceVariant }]}
              >
                People who view this story will appear here.
              </Text>
            </View>
          ) : (
            <FlatList
              data={viewers}
              renderItem={renderUserItem}
              keyExtractor={(item, index) => item._id || String(index)}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  container: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "75%",
    minHeight: "42%",
  },
  header: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(128,128,128,0.3)",
    marginBottom: 12,
  },
  headerContentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  headerTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  eyeBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  skeletonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
  },
  skeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 44,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
    marginBottom: 4,
  },
  emptySubText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    textAlign: "center",
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  userDetails: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  userRole: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    marginTop: 2,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
  },
});
