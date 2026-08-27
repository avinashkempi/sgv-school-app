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
import { useLabel } from "../../context/LabelsContext";

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
        <View style={{ padding: 16, paddingTop: 24 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <View style={{ flex: 1 }}>
              <AppHeader
                title={t("teacher.mySchedule", "My Schedule")}
                subtitle={t("teacher.teachingTimetable", "Teaching Timetable")}
                showBack
              />
            </View>
            <Pressable
              onPress={() => _router.push("/teacher/timetable")}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.primaryContainer,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 12,
                gap: 6,
                elevation: 2,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                opacity: pressed ? 0.9 : 1,
                marginLeft: 8,
              })}
            >
              <MaterialIcons
                name="grid-view"
                size={18}
                color={colors.onPrimaryContainer}
              />
              <Text
                style={{
                  color: colors.onPrimaryContainer,
                  fontFamily: FONTS.bold,
                  fontSize: FONT_SIZES.md,
                }}
              >
                {t("teacher.allClasses", "All Classes")}
              </Text>
            </Pressable>
          </View>

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
                          ? colors.primary
                          : colors.cardBackground,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor:
                        selectedDay === day
                          ? colors.primary
                          : colors.textSecondary + "20",
                    }}
                  >
                    <Text
                      style={{
                        color:
                          selectedDay === day ? "#fff" : colors.textPrimary,
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
                  fontSize: FONT_SIZES.xl,
                  fontFamily: FONTS.bold,
                  color: colors.textPrimary,
                }}
              >
                {selectedDay}
              </Text>
              {selectedDay === currentDay && (
                <View
                  style={{
                    backgroundColor: colors.success + "20",
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: FONT_SIZES.sm,
                      color: colors.success,
                      fontFamily: FONTS.bold,
                    }}
                  >
                    {t("common.today", "TODAY")}
                  </Text>
                </View>
              )}
            </View>

            {!schedule[selectedDay] || schedule[selectedDay].length === 0 ? (
              <View
                style={{ alignItems: "center", marginTop: 40, opacity: 0.6 }}
              >
                <MaterialIcons
                  name="free-breakfast"
                  size={48}
                  color={colors.textSecondary}
                />
                <Text
                  style={{
                    color: colors.textSecondary,
                    marginTop: 16,
                    fontSize: FONT_SIZES.lg,
                  }}
                >
                  {t("teacher.noClassesScheduled", "No classes scheduled")}
                </Text>
              </View>
            ) : (
              schedule[selectedDay].map((period, index) => (
                <View
                  key={index}
                  style={{
                    backgroundColor: colors.cardBackground,
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 12,
                    flexDirection: "row",
                    gap: 16,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 1,
                    borderLeftWidth: 4,
                    borderLeftColor: colors.secondary,
                  }}
                >
                  {/* Time Column */}
                  <View
                    style={{
                      alignItems: "center",
                      justifyContent: "center",
                      width: 60,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: FONT_SIZES.base,
                        fontFamily: FONTS.bold,
                        color: colors.textPrimary,
                      }}
                    >
                      {period.startTime}
                    </Text>
                    <View
                      style={{
                        width: 1,
                        height: 10,
                        backgroundColor: colors.textSecondary + "40",
                        marginVertical: 2,
                      }}
                    />
                    <Text style={{ fontSize: FONT_SIZES.sm, color: colors.textSecondary }}>
                      {period.endTime}
                    </Text>
                  </View>

                  {/* Divider */}
                  <View
                    style={{
                      width: 1,
                      backgroundColor: colors.textSecondary + "20",
                    }}
                  />

                  {/* Details Column */}
                  <View style={{ flex: 1, justifyContent: "center" }}>
                    <Text
                      style={{
                        fontSize: FONT_SIZES.lg,
                        fontFamily: FONTS.bold,
                        color: colors.textPrimary,
                        marginBottom: 4,
                      }}
                    >
                      {period.className}
                    </Text>
                    <Text
                      style={{
                        fontSize: FONT_SIZES.base,
                        color: colors.primary,
                        fontFamily: FONTS.medium,
                        marginBottom: 4,
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
                          style={{ fontSize: FONT_SIZES.md, color: colors.textSecondary }}
                        >
                          {t("common.room", "Room")} {period.roomNumber}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
