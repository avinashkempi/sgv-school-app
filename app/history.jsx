import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { useRouter } from "expo-router";
import { useTheme, FONTS, FONT_SIZES } from "../theme";
import { useApiQuery } from "../hooks/useApi";
import apiConfig from "../config/apiConfig";
import { useToast } from "../components/ToastProvider";
import AppHeader from "../components/Header";
import { formatDate } from "../utils/date";
import { formatClassName } from "../utils/formatClassName";
import { useLabel } from "../context/LabelsContext";

export default function HistoryScreen() {
  const router = useRouter();
  const { _styles, colors } = useTheme();
  const { _showToast } = useToast();
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
        <View
          style={{ alignItems: "center", marginTop: 60, paddingHorizontal: 20 }}
        >
          <MaterialIcons
            name="info-outline"
            size={64}
            color={colors.textSecondary}
          />
          <Text
            style={{
              color: colors.textSecondary,
              marginTop: 16,
              fontSize: FONT_SIZES.lg,
              textAlign: "center",
            }}
          >
            {t("historyScreen.examHistoryInfo")}
          </Text>
          <Pressable
            onPress={() => router.push("/admin/academic-year")}
            style={{
              marginTop: 20,
              backgroundColor: colors.primary,
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>
              {t("historyScreen.goToAcademicYear")}
            </Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View>
        {exams.length === 0 ? (
          <View style={{ alignItems: "center", marginTop: 60, opacity: 0.6 }}>
            <MaterialIcons
              name="event-note"
              size={64}
              color={colors.textSecondary}
            />
            <Text
              style={{
                color: colors.textSecondary,
                marginTop: 16,
                fontSize: FONT_SIZES.lg,
              }}
            >
              {t("historyScreen.noPastExams")}
            </Text>
          </View>
        ) : (
          exams.map((item) => (
            <View
              key={item._id}
              style={{
                backgroundColor: colors.cardBackground,
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 1,
                borderLeftWidth: 4,
                borderLeftColor: colors.secondary,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: FONT_SIZES.lg,
                    fontFamily: FONTS.bold,
                    color: colors.textPrimary,
                    flex: 1,
                  }}
                >
                  {item.name}
                </Text>
                <View
                  style={{
                    backgroundColor: colors.secondary + "15",
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 6,
                  }}
                >
                  <Text
                    style={{
                      fontSize: FONT_SIZES.sm,
                      color: colors.secondary,
                      fontFamily: FONTS.bold,
                    }}
                  >
                    {item.subject?.name}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
                <View
                  style={{
                    backgroundColor: colors.background,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: FONT_SIZES.sm,
                      color: colors.textSecondary,
                      textTransform: "capitalize",
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
                      gap: 4,
                    }}
                  >
                    <MaterialIcons
                      name="meeting-room"
                      size={14}
                      color={colors.textSecondary}
                    />
                    <Text style={{ fontSize: FONT_SIZES.sm, color: colors.textSecondary }}>
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
                  borderTopColor: colors.border,
                  paddingTop: 12,
                }}
              >
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <MaterialIcons
                    name="class"
                    size={16}
                    color={colors.textSecondary}
                  />
                  <Text style={{ fontSize: FONT_SIZES.md, color: colors.textSecondary }}>
                    {formatClassName(item.class)}
                  </Text>
                </View>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <MaterialIcons
                    name="event"
                    size={16}
                    color={colors.textSecondary}
                  />
                  <Text style={{ fontSize: FONT_SIZES.md, color: colors.textSecondary }}>
                    {formatDate(item.date)}
                  </Text>
                </View>
              </View>
            </View>
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
      <View style={{ padding: 16, paddingTop: 24 }}>
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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={{
          padding: 16,
          paddingTop: 0,
          paddingBottom: 24,
        }}
      >
        {renderExams()}
      </ScrollView>
    </View>
  );
}
