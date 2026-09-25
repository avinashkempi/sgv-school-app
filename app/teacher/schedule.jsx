import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { useRouter } from "expo-router";
import { useTheme, FONTS, FONT_SIZES } from "../../theme";
import apiConfig from "../../config/apiConfig";
import { useApiQuery } from "../../hooks/useApi";
import { useToast } from "../../components/ToastProvider";
import AppHeader from "../../components/Header";
import Card from "../../components/Card";
import Badge from "../../components/ui/Badge";
import { EmptyState } from "../../components/StateComponents";
import { useLabel } from "../../context/LabelsContext";
import { formatClassName } from "../../utils/formatClassName";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function TeacherScheduleScreen() {
  const _router = useRouter();
  const { _styles, colors } = useTheme();
  const { _showToast } = useToast();
  const { t } = useLabel();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState("Monday");
  const [currentDay, setCurrentDay] = useState("");

  useEffect(() => {
    // Set current day
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const today = days[new Date().getDay()];
    if (DAYS.includes(today)) {
      setSelectedDay(today);
      setCurrentDay(today);
    } else {
      setSelectedDay("Monday");
    }
  }, []);

  const {
    data: scheduleData,
    isLoading: loading,
    refetch,
  } = useApiQuery(
    ["teacherSchedule"],
    `${apiConfig.baseUrl}/timetable/my-schedule`
  );

  // Process schedule data
  const schedule = React.useMemo(() => {
    if (!scheduleData) return {};

    const scheduleMap = {};
    DAYS.forEach((day) => {
      scheduleMap[day] = (scheduleData[day] || []).sort((a, b) => {
        const timeA = a.startTime || "";
        const timeB = b.startTime || "";
        return timeA.localeCompare(timeB);
      });
    });
    return scheduleMap;
  }, [scheduleData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
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
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <AppHeader
            title={t("teacher.mySchedule", "My Schedule")}
            subtitle={t("teacher.teachingTimetable", "Teaching Timetable")}
            showBack
            rightAction={
              <Pressable
                onPress={() => _router.push("/teacher/timetable")}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: colors.primaryContainer,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 12,
                  gap: 4,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <MaterialIcons
                  name="grid-view"
                  size={16}
                  color={colors.onPrimaryContainer}
                />
                <Text
                  style={{
                    color: colors.onPrimaryContainer,
                    fontFamily: FONTS.bold,
                    fontSize: FONT_SIZES.xs,
                  }}
                >
                  {t("teacher.allClasses", "All Classes")}
                </Text>
              </Pressable>
            }
          />

          {/* Day Tabs */}
          <View style={{ marginTop: 24 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {DAYS.map((day) => (
                  <Pressable
                    key={day}
                    onPress={() => setSelectedDay(day)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      backgroundColor:
                        selectedDay === day
                          ? colors.primaryContainer || "#E0ECFF"
                          : colors.surfaceContainerLow || colors.surface,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor:
                        selectedDay === day
                          ? (colors.primary || "#2F6CD4") + "40"
                          : colors.outlineVariant
                          ? colors.outlineVariant + "40"
                          : "rgba(0,0,0,0.06)",
                    }}
                  >
                    <Text
                      style={{
                        color:
                          selectedDay === day ? colors.primary || "#2F6CD4" : colors.textPrimary,
                        fontFamily:
                          selectedDay === day ? FONTS.bold : FONTS.medium,
                      }}
                    >
                      {day.slice(0, 3)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Schedule List */}
          <View style={{ marginTop: 24 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  fontSize: FONT_SIZES.lg,
                  fontFamily: FONTS.bold,
                  color: colors.textPrimary,
                }}
              >
                {selectedDay}
              </Text>
              {selectedDay === currentDay && (
                <Badge
                  label={t("common.today", "TODAY")}
                  variant="success"
                  size="sm"
                  dot
                />
              )}
            </View>

            {!schedule[selectedDay] || schedule[selectedDay].length === 0 ? (
              <EmptyState
                icon="free-breakfast"
                title={t("teacher.noClassesTitle", "No Classes")}
                message={t("teacher.noClassesScheduled", "No classes scheduled")}
              />
            ) : (
              schedule[selectedDay].map((period, index) => (
                <Card
                  key={index}
                  variant="elevated"
                  style={{
                    marginBottom: 12,
                    borderRadius: 16,
                  }}
                  contentStyle={{
                    flexDirection: "row",
                    gap: 14,
                    padding: 14,
                    alignItems: "center",
                  }}
                >
                  {/* Time Column Tile */}
                  <View
                    style={{
                      alignItems: "center",
                      justifyContent: "center",
                      width: 68,
                      backgroundColor:
                        colors.surfaceContainerLow || colors.surface,
                      borderRadius: 12,
                      paddingVertical: 8,
                      borderWidth: 1,
                      borderColor: colors.outlineVariant
                        ? colors.outlineVariant + "30"
                        : "rgba(0,0,0,0.06)",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: FONT_SIZES.xs,
                        fontFamily: FONTS.bold,
                        color: colors.textPrimary,
                      }}
                    >
                      {period.startTime}
                    </Text>
                    <MaterialIcons
                      name="arrow-downward"
                      size={10}
                      color={colors.outline}
                      style={{ marginVertical: 2 }}
                    />
                    <Text
                      style={{
                        fontSize: 11,
                        fontFamily: FONTS.medium,
                        color: colors.textSecondary,
                      }}
                    >
                      {period.endTime}
                    </Text>
                  </View>

                  {/* Accent Divider */}
                  <View
                    style={{
                      width: 4,
                      height: 38,
                      backgroundColor: colors.secondary || colors.primary,
                      borderRadius: 2,
                    }}
                  />

                  {/* Details Column */}
                  <View style={{ flex: 1, justifyContent: "center" }}>
                    <Text
                      style={{
                        fontSize: FONT_SIZES.md,
                        fontFamily: FONTS.bold,
                        color: colors.textPrimary,
                        marginBottom: 4,
                      }}
                    >
                      {formatClassName(period.className)}
                    </Text>
                    <Text
                      style={{
                        fontSize: FONT_SIZES.sm,
                        color: colors.primary,
                        fontFamily: FONTS.medium,
                        marginBottom: period.roomNumber ? 4 : 0,
                      }}
                    >
                      {period.subject?.name || t("common.subject", "Subject")}
                    </Text>

                    {period.roomNumber && (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <MaterialIcons
                          name="room"
                          size={14}
                          color={colors.textSecondary}
                        />
                        <Text
                          style={{
                            fontSize: FONT_SIZES.sm,
                            color: colors.textSecondary,
                          }}
                        >
                          {t("common.room", "Room")} {period.roomNumber}
                        </Text>
                      </View>
                    )}
                  </View>
                </Card>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
