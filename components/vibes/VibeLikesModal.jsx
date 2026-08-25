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
import { useTheme } from "../../theme";
import { useApiQuery } from "../../hooks/useApi";
import apiConfig from "../../config/apiConfig";
import { CACHE_TIERS } from "../../utils/cacheConfig";
import SkeletonLoader from "../SkeletonLoader";
import UserAvatar from "../ui/UserAvatar";

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
      const roleText =
        item.role === "student"
          ? item.currentClass?.name
            ? `Student • ${item.currentClass.name}`
            : "Student"
          : item.role === "teacher"
          ? item.designation
            ? `Teacher • ${item.designation}`
            : "Teacher"
          : item.role === "admin" || item.role === "super admin"
          ? "Administrator"
          : item.role;

      return (
        <View style={styles.userRow}>
          <UserAvatar
            photoUrl={item.profilePhoto}
            name={item.name || "User"}
            role={item.role}
            size={38}
          />
          <View style={styles.userDetails}>
            <Text style={[styles.userName, { color: colors.onSurface }]}>
              {item.name}
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
            <View style={styles.headerTitleGroup}>
              <View style={styles.heartBadge}>
                <MaterialIcons name="favorite" size={14} color="#FF2D55" />
              </View>
              <Text style={[styles.headerTitle, { color: colors.onSurface }]}>
                Likes {users.length > 0 ? `(${users.length})` : ""}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <MaterialIcons name="close" size={20} color={colors.onSurface} />
            </Pressable>
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
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "70%",
    minHeight: "40%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
    fontSize: 16,
    fontFamily: "DMSans-Bold",
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
    fontSize: 14,
    fontFamily: "DMSans-Regular",
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
    fontSize: 14,
    fontFamily: "DMSans-Bold",
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontFamily: "DMSans-Bold",
  },
  userRole: {
    fontSize: 12,
    fontFamily: "DMSans-Regular",
  },
});
