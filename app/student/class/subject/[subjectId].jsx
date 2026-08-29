import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme, FONTS, FONT_SIZES } from "../../../../theme";
import apiConfig from "../../../../config/apiConfig";
import { useApiQuery } from "../../../../hooks/useApi";
import { CACHE_TIERS } from "../../../../utils/cacheConfig";
import Header from "../../../../components/Header";
import UserAvatar from "../../../../components/ui/UserAvatar";
import { formatUserName } from "../../../../utils/userFormatters";
import { useLabel } from "../../../../context/LabelsContext";
import { formatDate } from "../../../../utils/date";
import SkeletonLoader from "../../../../components/SkeletonLoader";
import { EmptyState } from "../../../../components/StateComponents";
import AppRefreshControl from "../../../../components/ui/AppRefreshControl";
import ClassMediaAttachmentViewer from "../../../../components/class/ClassMediaAttachmentViewer";
import UserDetailModal from "../../../../components/UserDetailModal";

const getSubjectStyling = (subjectName = "") => {
  const name = subjectName.toLowerCase();
  if (name.includes("math"))
    return { icon: "functions", color: "#3B82F6", bg: "rgba(59, 130, 246, 0.12)" };
  if (
    name.includes("sci") ||
    name.includes("phys") ||
    name.includes("chem") ||
    name.includes("bio")
  )
    return { icon: "biotech", color: "#10B981", bg: "rgba(16, 185, 129, 0.12)" };
  if (name.includes("eng") || name.includes("lit") || name.includes("gram"))
    return { icon: "auto-stories", color: "#8B5CF6", bg: "rgba(139, 92, 246, 0.12)" };
  if (name.includes("soc") || name.includes("hist") || name.includes("geo") || name.includes("civ"))
    return { icon: "public", color: "#F59E0B", bg: "rgba(245, 158, 11, 0.12)" };
  if (name.includes("comp") || name.includes("it") || name.includes("tech") || name.includes("code"))
    return { icon: "laptop-mac", color: "#06B6D4", bg: "rgba(6, 182, 212, 0.12)" };
  if (name.includes("art") || name.includes("draw") || name.includes("craft"))
    return { icon: "palette", color: "#EC4899", bg: "rgba(236, 72, 153, 0.12)" };
  if (name.includes("lang") || name.includes("kannada") || name.includes("hindi") || name.includes("french") || name.includes("span"))
    return { icon: "translate", color: "#F97316", bg: "rgba(249, 115, 22, 0.12)" };
  if (name.includes("pe") || name.includes("phys ed") || name.includes("sport"))
    return { icon: "sports-soccer", color: "#14B8A6", bg: "rgba(20, 184, 166, 0.12)" };
  return { icon: "menu-book", color: "#6366F1", bg: "rgba(99, 102, 241, 0.12)" };
};

export default function StudentSubjectDetailScreen() {
  const { id, subjectId } = useLocalSearchParams(); // classId and subjectId
  const { styles: themeStyles, colors, mode } = useTheme();
  const isDark = mode === "dark";
  const { t } = useLabel();

  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);

  // 1. Fetch Subject List (to retrieve subject info)
  const { data: subjectsData, refetch: refetchSubjects } = useApiQuery(
    ["classSubjects", id],
    `${apiConfig.baseUrl}/classes/${id}/subjects`,
    {
      ...CACHE_TIERS.MODERATE,
      enabled: !!id,
    }
  );

  const subject = useMemo(() => {
    if (Array.isArray(subjectsData)) {
      return subjectsData.find((s) => s._id === subjectId) || null;
    }
    return null;
  }, [subjectsData, subjectId]);

  const subjectName = subject?.name || "";
  const styling = getSubjectStyling(subjectName);

  // 2. Fetch Content for this subject
  const {
    data: contentData,
    isLoading: loading,
    refetch: refetchContent,
  } = useApiQuery(
    ["subjectContent", id, subjectId],
    `${apiConfig.baseUrl}/classes/${id}/subjects/${subjectId}/content`,
    {
      ...CACHE_TIERS.MODERATE,
      enabled: !!(id && subjectId),
    }
  );

  const filteredContent = useMemo(() => {
    const list = contentData || [];
    if (filterType === "all") return list;
    return list.filter((item) => item.type === filterType);
  }, [contentData, filterType]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchSubjects(), refetchContent()]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleOpenUser = (author) => {
    if (!author) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSelectedUser(author);
    setShowUserModal(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        refreshControl={
          <AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={[
          themeStyles.contentPaddingBottom,
          { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Header
          title={subjectName || t("student.subjectDetails", "Subject Details")}
          subtitle={t("student.classContent", "Class Materials & Notes")}
          showBack
        />

        {/* Subject Header Banner */}
        {subject && (
          <View
            style={[
              localStyles.subjectBanner,
              {
                backgroundColor: isDark ? colors.surfaceContainer : "#FFFFFF",
                borderColor: colors.outlineVariant,
              },
            ]}
          >
            <View
              style={[
                localStyles.subjectIconBox,
                { backgroundColor: styling.bg },
              ]}
            >
              <MaterialIcons
                name={styling.icon}
                size={30}
                color={styling.color}
              />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text
                  style={[localStyles.subjectTitle, { color: colors.onSurface }]}
                  numberOfLines={1}
                >
                  {subject.name}
                </Text>
                {subject.code && (
                  <View
                    style={[
                      localStyles.codeBadge,
                      { backgroundColor: styling.color + "18" },
                    ]}
                  >
                    <Text style={[localStyles.codeText, { color: styling.color }]}>
                      {subject.code}
                    </Text>
                  </View>
                )}
              </View>

              {subject.teachers && subject.teachers.length > 0 && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <UserAvatar
                    photoUrl={subject.teachers[0].profilePhoto}
                    name={subject.teachers[0].name}
                    role="teacher"
                    size={20}
                  />
                  <Text
                    style={[
                      localStyles.teacherLabel,
                      { color: colors.onSurfaceVariant },
                    ]}
                    numberOfLines={1}
                  >
                    {subject.teachers.map((t) => t.name).join(", ")}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Type Filter Chips */}
        <View style={{ marginTop: 14 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
          >
            {[
              { key: "all", label: "All Posts", icon: "dashboard" },
              { key: "homework", label: "Homework", icon: "assignment", color: "#EF4444" },
              { key: "note", label: "Notes & PPTs", icon: "menu-book", color: "#3B82F6" },
              { key: "news", label: "Notices", icon: "campaign", color: "#F59E0B" },
            ].map((chip) => {
              const isSelected = filterType === chip.key;
              const chipColor = chip.color || colors.primary;
              return (
                <Pressable
                  key={chip.key}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    setFilterType(chip.key);
                  }}
                  style={[
                    localStyles.filterChip,
                    {
                      backgroundColor: isSelected
                        ? chipColor + "18"
                        : isDark
                        ? colors.surfaceContainer
                        : "#FFFFFF",
                      borderColor: isSelected ? chipColor : colors.outlineVariant,
                    },
                  ]}
                >
                  <MaterialIcons
                    name={chip.icon}
                    size={14}
                    color={isSelected ? chipColor : colors.onSurfaceVariant}
                  />
                  <Text
                    style={[
                      localStyles.filterChipText,
                      {
                        color: isSelected ? chipColor : colors.onSurfaceVariant,
                        fontFamily: isSelected ? FONTS.bold : FONTS.medium,
                      },
                    ]}
                  >
                    {chip.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Content Stream */}
        {loading ? (
          <View style={{ marginTop: 16, gap: 12 }}>
            <SkeletonLoader height={120} borderRadius={16} />
            <SkeletonLoader height={120} borderRadius={16} />
            <SkeletonLoader height={120} borderRadius={16} />
          </View>
        ) : filteredContent.length === 0 ? (
          <View style={{ marginTop: 24 }}>
            <EmptyState
              icon="article"
              title={t("student.noContentTitle", "No Content Posted")}
              message={t(
                "student.noContentPosted",
                "Homework, notes, presentations, and documents posted by your teachers will appear here."
              )}
            />
          </View>
        ) : (
          <View style={{ marginTop: 14, gap: 12 }}>
            {filteredContent.map((item) => {
              const typeConfig =
                item.type === "homework"
                  ? { label: "HOMEWORK", color: "#EF4444", icon: "assignment" }
                  : item.type === "news"
                  ? { label: "ANNOUNCEMENT", color: "#F59E0B", icon: "campaign" }
                  : { label: "STUDY NOTE", color: "#3B82F6", icon: "menu-book" };

              return (
                <View
                  key={item._id}
                  style={[
                    localStyles.contentCard,
                    {
                      backgroundColor: isDark
                        ? colors.surfaceContainer
                        : "#FFFFFF",
                      borderColor: isDark
                        ? colors.outlineVariant
                        : "rgba(0,0,0,0.06)",
                    },
                  ]}
                >
                  {/* Card Header */}
                  <View style={localStyles.cardHeader}>
                    <View
                      style={[
                        localStyles.typeBadge,
                        { backgroundColor: typeConfig.color + "18" },
                      ]}
                    >
                      <MaterialIcons
                        name={typeConfig.icon}
                        size={12}
                        color={typeConfig.color}
                      />
                      <Text
                        style={[
                          localStyles.typeBadgeText,
                          { color: typeConfig.color },
                        ]}
                      >
                        {typeConfig.label}
                      </Text>
                    </View>

                    <Text
                      style={[
                        localStyles.dateText,
                        { color: colors.onSurfaceVariant },
                      ]}
                    >
                      {formatDate(item.createdAt)}
                    </Text>
                  </View>

                  {/* Title */}
                  <Text
                    style={[
                      localStyles.itemTitle,
                      { color: colors.onSurface },
                    ]}
                  >
                    {item.title}
                  </Text>

                  {/* Description */}
                  {item.description ? (
                    <Text
                      style={[
                        localStyles.itemDesc,
                        { color: colors.onSurfaceVariant },
                      ]}
                    >
                      {item.description}
                    </Text>
                  ) : null}

                  {/* Multi-Format Attachments Viewer */}
                  {item.attachments && item.attachments.length > 0 && (
                    <ClassMediaAttachmentViewer
                      attachments={item.attachments}
                    />
                  )}

                  {/* Author Attribution */}
                  {item.author && (
                    <Pressable
                      onPress={() => handleOpenUser(item.author)}
                      style={localStyles.authorRow}
                    >
                      <UserAvatar
                        photoUrl={item.author.profilePhoto}
                        name={item.author.name}
                        role={item.author.role || "teacher"}
                        size={20}
                      />
                      <Text
                        style={[
                          localStyles.authorText,
                          { color: colors.onSurfaceVariant },
                        ]}
                      >
                        {t("common.by", "By")}:{" "}
                        <Text style={{ fontFamily: FONTS.bold, color: colors.onSurface }}>
                          {formatUserName(item.author.name, "Teacher")}
                        </Text>
                      </Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Author User Modal */}
      {selectedUser && (
        <UserDetailModal
          visible={showUserModal}
          onClose={() => {
            setShowUserModal(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
        />
      )}
    </View>
  );
}

const localStyles = StyleSheet.create({
  subjectBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
    marginTop: 8,
  },
  subjectIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  subjectTitle: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.bold,
  },
  codeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  codeText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
  teacherLabel: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.medium,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  filterChipText: {
    fontSize: FONT_SIZES.sm,
  },
  contentCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  typeBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
    letterSpacing: 0.4,
  },
  dateText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
  },
  itemTitle: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.bold,
    lineHeight: 24,
  },
  itemDesc: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.regular,
    lineHeight: 22,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  authorText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
  },
});
