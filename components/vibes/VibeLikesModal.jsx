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

export default function VibeLikesModal({ visible, onClose, vibeId }) {
  const { colors } = useTheme();

  const { data, isLoading } = useApiQuery(
    ["vibeLikes", vibeId],
    vibeId
      ? `${apiConfig.baseUrl}${apiConfig.endpoints.vibes.getLikes(vibeId)}`
      : null,
    {
      ...CACHE_TIERS.VIBES_REALTIME,
      enabled: !!vibeId && visible,
    }
  );

  const users = data?.data || [];

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
            size={38}
          />
          <View style={styles.userDetails}>
            <Text style={[styles.userName, { color: colors.onSurface }]}>
              {displayName}
            </Text>
            <Text style={[styles.userRole, { color: colors.onSurfaceVariant }]}>
              {roleText}
            </Text>
          </View>
          <MaterialIcons name="favorite" size={16} color="#FF2D55" />
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
              { borderBottomColor: colors.outlineVariant || "rgba(0,0,0,0.06)" },
            ]}
          >
            <View style={styles.handleBar} />
            <View style={styles.headerContentRow}>
              <View style={styles.headerTitleGroup}>
                <View style={styles.heartBadge}>
                  <MaterialIcons name="favorite" size={13} color="#FF2D55" />
                </View>
                <Text style={[styles.headerTitle, { color: colors.onSurface }]}>
                  Likes {users.length > 0 ? `(${users.length})` : ""}
                </Text>
              </View>
              <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
                <MaterialIcons name="close" size={20} color={colors.onSurface} />
              </Pressable>
            </View>
          </View>

          {/* List */}
          {isLoading && users.length === 0 ? (
            <View style={styles.skeletonContainer}>
              {[1, 2, 3, 4, 5].map((i) => (
                <View key={i} style={styles.skeletonRow}>
                  <SkeletonLoader width={38} height={38} borderRadius={19} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <SkeletonLoader width={130} height={14} borderRadius={7} />
                    <SkeletonLoader width={80} height={11} borderRadius={5} />
                  </View>
                </View>
              ))}
            </View>
          ) : users.length === 0 ? (
            <View style={styles.centerContainer}>
              <MaterialIcons
                name="favorite-border"
                size={40}
                color={colors.onSurfaceVariant}
                style={{ opacity: 0.6, marginBottom: 8 }}
              />
              <Text
                style={[styles.emptyText, { color: colors.onSurfaceVariant }]}
              >
                No likes yet
              </Text>
            </View>
          ) : (
            <FlatList
              data={users}
              renderItem={renderUserItem}
              keyExtractor={(item) => item._id}
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
    maxHeight: "72%",
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
  heartBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255, 45, 85, 0.12)",
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
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 12,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  userRole: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
  },
});
