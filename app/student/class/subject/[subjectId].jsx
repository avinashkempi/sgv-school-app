import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme, FONTS, FONT_SIZES, LINE_HEIGHTS, LETTER_SPACINGS } from "../../../../theme";
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

export default function StudentSubjectDetailScreen() {
  const { id, subjectId } = useLocalSearchParams(); // classId and subjectId
  const { styles: themeStyles, colors } = useTheme();
  const { t } = useLabel();
  const [refreshing, setRefreshing] = useState(false);

  // 1. Fetch Subject List (to retrieve subject name)
  const { data: subjectsData, refetch: refetchSubjects } = useApiQuery(
    ["classSubjects", id],
    `${apiConfig.baseUrl}/classes/${id}/subjects`,
    {
      ...CACHE_TIERS.MODERATE,
      enabled: !!id,
    }
  );

  const subjectName = useMemo(() => {
    if (Array.isArray(subjectsData)) {
      const currentSubject = subjectsData.find((s) => s._id === subjectId);
      return currentSubject?.name || "";
    }
    return "";
  }, [subjectsData, subjectId]);

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

  const content = contentData || [];

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchSubjects(), refetchContent()]);
    } finally {
      setRefreshing(false);
    }
  };

  const getContentTypeColor = (type) => {
    switch (type) {
      case "homework":
        return colors.error;
      case "news":
        return colors.primary;
      default:
        return colors.secondary;
    }
  };

  const getContentTypeIcon = (type) => {
    switch (type) {
      case "homework":
        return "assignment";
      case "news":
        return "campaign";
      default:
        return "note";
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        refreshControl={
          <AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={[themeStyles.contentPaddingBottom, { paddingHorizontal: 16, paddingTop: 16 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Header
          title={
            subjectName || t("student.subjectDetails", "Subject Details")
          }
          subtitle={t("student.classContent", "Class Content")}
          showBack
        />

        {loading ? (
          <View style={{ marginTop: 16, gap: 12 }}>
            <SkeletonLoader height={120} borderRadius={16} />
            <SkeletonLoader height={120} borderRadius={16} />
            <SkeletonLoader height={120} borderRadius={16} />
          </View>
        ) : content.length === 0 ? (
          <View style={{ marginTop: 24 }}>
            <EmptyState
              icon="article"
              title={t("student.noContentTitle", "No Content Posted")}
              message={t("student.noContentPosted", "Homework, notices, and notes posted by your teacher will appear here.")}
            />
          </View>
        ) : (
          <View style={{ marginTop: 12, gap: 12 }}>
            {content.map((item) => {
              const typeColor = getContentTypeColor(item.type);
              return (
                <View
                  key={item._id}
                  style={[
                    localStyles.contentCard,
                    {
                      backgroundColor: colors.surfaceContainer,
                      borderLeftColor: typeColor,
                      borderColor: colors.outlineVariant,
                    },
                  ]}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 8,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                        flex: 1,
                        marginRight: 8,
                      }}
                    >
                      <View
                        style={{
                          backgroundColor: typeColor + "20",
                          padding: 6,
                          borderRadius: 8,
                        }}
                      >
                        <MaterialIcons
                          name={getContentTypeIcon(item.type)}
                          size={20}
                          color={typeColor}
                        />
                      </View>
                      <Text
                        style={{
                          fontSize: FONT_SIZES.lg,
                          fontFamily: FONTS.bold,
                          color: colors.onSurface,
                          flex: 1,
                        }}
                      >
                        {item.title}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: FONT_SIZES.sm,
                        fontFamily: FONTS.medium,
                        color: colors.onSurfaceVariant,
                      }}
                    >
                      {formatDate(item.createdAt)}
                    </Text>
                  </View>

                  <Text
                    style={{
                      fontSize: FONT_SIZES.base,
                      fontFamily: FONTS.regular,
                      color: colors.onSurfaceVariant,
                      lineHeight: 20,
                      marginBottom: 12,
                    }}
                  >
                    {item.description}
                  </Text>

                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderTopWidth: StyleSheet.hairlineWidth,
                      borderTopColor: colors.outlineVariant,
                      paddingTop: 10,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <UserAvatar
                        photoUrl={
                          item.author?.profilePhoto ||
                          item.teacher?.profilePhoto
                        }
                        name={formatUserName(
                          item.author?.name || item.teacher?.name,
                          "Teacher"
                        )}
                        role="teacher"
                        size={22}
                      />
                      <Text
                        style={{
                          fontSize: FONT_SIZES.sm,
                          fontFamily: FONTS.medium,
                          color: colors.onSurfaceVariant,
                        }}
                      >
                        {t("common.by", "By")}:{" "}
                        {formatUserName(
                          item.author?.name || item.teacher?.name,
                          t("common.teacher", "Teacher")
                        )}
                      </Text>
                    </View>
                    <View
                      style={{
                        backgroundColor: colors.surfaceContainerHighest,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: FONT_SIZES.micro,
                          fontFamily: FONTS.bold,
                          color: typeColor,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                        }}
                      >
                        {t("student.contentType_" + item.type, item.type)}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const localStyles = StyleSheet.create({
  contentCard: {
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
});
