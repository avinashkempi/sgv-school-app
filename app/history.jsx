import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  useTheme,
  FONTS,
  FONT_SIZES,
  SPACING,
  RADIUS,
  ICON_SIZES,
} from "../theme";
import { useApiQuery } from "../hooks/useApi";
import apiConfig from "../config/apiConfig";
import AppHeader from "../components/Header";
import Card from "../components/Card";
import Button from "../components/Button";
import { formatDate } from "../utils/date";
import { formatClassName } from "../utils/formatClassName";
import { useLabel } from "../context/LabelsContext";
import AppRefreshControl from "../components/ui/AppRefreshControl";

export default function HistoryScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLabel();

  const [refreshing, setRefreshing] = useState(false);

  // Fetch User Role
  const { data: userData } = useApiQuery(
    ["currentUser"],
    `${apiConfig.baseUrl}/auth/me`,
    { select: (data) => data.user }
  );
  const userRole = userData?.role;

  // Fetch Exams (Only for students)
  const {
    data: examsData,
    isLoading: loading,
    refetch,
  } = useApiQuery(
    ["studentExamHistory"],
    `${apiConfig.baseUrl}/exams/schedule/student`,
    { enabled: userRole === "student" }
  );

  const exams = (examsData || []).filter(
    (exam) => new Date(exam.date) < new Date()
  );

  const onRefresh = async () => {
    setRefreshing(true);
    if (userRole === "student") {
      await refetch();
    }
    setRefreshing(false);
  };

  const renderExams = () => {
    if (userRole !== "student") {
      return (
        <Card
          variant="filled"
          style={{ marginTop: SPACING.xxxl || 32, alignItems: "center" }}
          contentStyle={{ padding: SPACING.xxl || 24, alignItems: "center" }}
        >
          <MaterialIcons
            name="info-outline"
            size={ICON_SIZES.hero || 48}
            color={colors.onSurfaceVariant}
          />
          <Text
            style={{
              color: colors.onSurfaceVariant,
              marginTop: SPACING.md || 12,
              fontSize: FONT_SIZES.md,
              textAlign: "center",
              fontFamily: FONTS.medium,
            }}
          >
            {t("historyScreen.examHistoryInfo")}
          </Text>
          <View style={{ marginTop: SPACING.lg || 16, width: "100%", maxWidth: 240 }}>
            <Button
              variant="filled"
              onPress={() => router.push("/admin/academic-year")}
              fullWidth
            >
              {t("historyScreen.goToAcademicYear")}
            </Button>
          </View>
        </Card>
      );
    }

    return (
      <View>
        {exams.length === 0 ? (
          <View
            style={{
              alignItems: "center",
              marginTop: SPACING.xxxl || 48,
              opacity: 0.7,
            }}
          >
            <MaterialIcons
              name="event-note"
              size={ICON_SIZES.hero || 48}
              color={colors.onSurfaceVariant}
            />
            <Text
              style={{
                color: colors.onSurfaceVariant,
                marginTop: SPACING.md || 12,
                fontSize: FONT_SIZES.md,
                fontFamily: FONTS.medium,
              }}
            >
              {t("historyScreen.noPastExams")}
            </Text>
          </View>
        ) : (
          exams.map((item) => (
            <Card
              key={item._id}
              variant="elevated"
              style={{ marginBottom: SPACING.md || 12 }}
              contentStyle={{ padding: SPACING.lg || 16 }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: SPACING.sm || 8,
                }}
              >
                <Text
                  style={{
                    fontSize: FONT_SIZES.md,
                    fontFamily: FONTS.bold,
                    color: colors.onSurface,
                    flex: 1,
                    marginRight: SPACING.sm || 8,
                  }}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <View
                  style={{
                    backgroundColor: colors.secondaryContainer,
                    paddingHorizontal: SPACING.sm || 8,
                    paddingVertical: SPACING.xxs || 3,
                    borderRadius: RADIUS.xs || 6,
                  }}
                >
                  <Text
                    style={{
                      fontSize: FONT_SIZES.micro,
                      color: colors.onSecondaryContainer,
                      fontFamily: FONTS.bold,
                    }}
                  >
                    {item.subject?.name}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  gap: SPACING.md || 12,
                  marginBottom: SPACING.md || 12,
                }}
              >
                <View
                  style={{
                    backgroundColor: colors.surfaceContainerHighest,
                    paddingHorizontal: SPACING.sm || 8,
                    paddingVertical: SPACING.xxs || 3,
                    borderRadius: RADIUS.xs || 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: FONT_SIZES.xs,
                      color: colors.onSurfaceVariant,
                      textTransform: "capitalize",
                      fontFamily: FONTS.medium,
                    }}
                  >
                    {item.type}
                  </Text>
                </View>
                {item.room && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: SPACING.xs || 4,
                    }}
                  >
                    <MaterialIcons
                      name="meeting-room"
                      size={ICON_SIZES.xs || 14}
                      color={colors.onSurfaceVariant}
                    />
                    <Text
                      style={{
                        fontSize: FONT_SIZES.xs,
                        color: colors.onSurfaceVariant,
                        fontFamily: FONTS.regular,
                      }}
                    >
                      {t("common.room")}: {item.room}
                    </Text>
                  </View>
                )}
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderTopWidth: 1,
                  borderTopColor: colors.outlineVariant,
                  paddingTop: SPACING.md || 12,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: SPACING.xs || 6,
                  }}
                >
                  <MaterialIcons
                    name="class"
                    size={ICON_SIZES.sm || 16}
                    color={colors.onSurfaceVariant}
                  />
                  <Text
                    style={{
                      fontSize: FONT_SIZES.xs,
                      color: colors.onSurfaceVariant,
                      fontFamily: FONTS.regular,
                    }}
                  >
                    {formatClassName(item.class)}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: SPACING.xs || 6,
                  }}
                >
                  <MaterialIcons
                    name="event"
                    size={ICON_SIZES.sm || 16}
                    color={colors.onSurfaceVariant}
                  />
                  <Text
                    style={{
                      fontSize: FONT_SIZES.xs,
                      color: colors.onSurfaceVariant,
                      fontFamily: FONTS.regular,
                    }}
                  >
                    {formatDate(item.date)}
                  </Text>
                </View>
              </View>
            </Card>
          ))
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          paddingHorizontal: SPACING.lg || 16,
          paddingTop: SPACING.md || 12,
          paddingBottom: SPACING.xs || 4,
        }}
      >
        <AppHeader
          title={t("historyScreen.title")}
          subtitle={
            userRole === "student"
              ? t("historyScreen.pastExams")
              : t("historyScreen.reports")
          }
          showBack
        />
      </View>

      <ScrollView
        refreshControl={
          <AppRefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        contentContainerStyle={{
          paddingHorizontal: SPACING.lg || 16,
          paddingTop: SPACING.sm || 8,
          paddingBottom: SPACING.xxxl || 32,
        }}
        showsVerticalScrollIndicator={false}
        scrollsToTop={true}
      >
        {renderExams()}
      </ScrollView>
    </View>
  );
}
