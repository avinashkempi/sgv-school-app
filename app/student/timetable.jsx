import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import AppRefreshControl from "../../components/ui/AppRefreshControl";
import { useRouter } from "expo-router";
import { useTheme, FONTS, FONT_SIZES } from "../../theme";
import { useApiQuery } from "../../hooks/useApi";
import { CACHE_TIERS } from "../../utils/cacheConfig";
import AppHeader from "../../components/Header";
import { useLabel } from "../../context/LabelsContext";
import Card from "../../components/Card";
import UserAvatar from "../../components/ui/UserAvatar";
import { formatUserName } from "../../utils/userFormatters";
import apiConfig from "../../config/apiConfig";
import { useToast } from "../../components/ToastProvider";
import { useAuth } from "../../context/AuthContext";
import { EmptyState, LoadingState } from "../../components/StateComponents";
import Badge from "../../components/ui/Badge";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function StudentTimetableScreen() {
  const _router = useRouter();
  const { colors } = useTheme();
  const { t } = useLabel();
  const { _showToast } = useToast();
  const { userId } = useAuth();

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
      setSelectedDay("Monday"); // Default to Monday if Sunday
    }
  }, []);

  // Fetch Timetable
  const {
    data: timetableData,
    isLoading: loading,
    error,
    refetch,
  } = useApiQuery(
    ["studentTimetable", userId],
    `${apiConfig.baseUrl}/timetable/my-timetable`,
    { ...CACHE_TIERS.STABLE, enabled: !!userId }
  );

  // Helper to parse time string to minutes for sorting
  // eslint-disable-next-line no-unused-vars
  const parseTime = (timeStr) => {
    if (!timeStr) return 0;
    const [time, modifier] = timeStr.split(" ");
    let [hours, minutes] = time.split(":");

    hours = parseInt(hours, 10);
    minutes = parseInt(minutes, 10);

    if (modifier === "PM" && hours < 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;

    return hours * 60 + minutes;
  };

  // Process timetable data
  const schedule = {};
  DAYS.forEach((day) => (schedule[day] = []));

  if (timetableData?.schedule) {
    timetableData.schedule.forEach((daySchedule) => {
      schedule[daySchedule.day] = daySchedule.periods.sort((a, b) => {
        return (a.periodNumber || 0) - (b.periodNumber || 0);
      });
    });
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingHorizontal: 16, paddingTop: 12 }}>
        <AppHeader
          title={t("student.myTimetable", "My Timetable")}
          subtitle={t("student.classSchedule", "Class Schedule")}
          showBack
        />
        <View style={{ flex: 1, justifyContent: "center" }}>
          <LoadingState
            message={t("student.loadingTimetable", "Loading timetable...")}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        refreshControl={
          <AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        scrollsToTop={true}
      >
        <View>
          <AppHeader title="My Timetable" subtitle="Class Schedule" showBack />

          {/* Day Tabs */}
          <View style={{ marginTop: 16 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {DAYS.map((day) => {
                  const isSelected = selectedDay === day;
                  return (
                    <Pressable
                      key={day}
                      onPress={() => setSelectedDay(day)}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        backgroundColor: isSelected
                          ? colors.primaryContainer || "#E0ECFF"
                          : colors.surfaceContainerLow || colors.surface,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: isSelected
                          ? (colors.primary || "#2F6CD4") + "40"
                          : colors.outlineVariant
                          ? colors.outlineVariant + "40"
                          : "rgba(0,0,0,0.06)",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: FONT_SIZES.sm,
                          color: isSelected ? colors.primary || "#2F6CD4" : colors.onSurfaceVariant,
                          fontFamily: isSelected ? FONTS.bold : FONTS.medium,
                        }}
                      >
                        {t("common.dayShort" + day, day.slice(0, 3))}
                      </Text>
                      {day === currentDay && (
                        <View
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: 3,
                            backgroundColor: colors.primary || "#2F6CD4",
                            alignSelf: "center",
                            marginTop: 4,
                          }}
                        />
                      )}
                    </Pressable>
                  );
                })}
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
                  color: colors.onSurface,
                }}
              >
                {t("common.day" + selectedDay, selectedDay)}
              </Text>
              {selectedDay === currentDay && (
                <Badge
                  label={t("common.todayUppercase", "TODAY")}
                  variant="success"
                  size="sm"
                  dot
                />
              )}
            </View>

            {!schedule[selectedDay] || schedule[selectedDay].length === 0 ? (
              <EmptyState
                icon="event-busy"
                title={t("student.noClasses", "No Classes")}
                message={
                  error?.message ||
                  t(
                    "student.noClassesScheduledDay",
                    "No classes scheduled for this day."
                  )
                }
              />
            ) : (
              schedule[selectedDay].map((period, index) => (
                <Card
                  key={index}
                  variant="elevated"
                  style={{ marginBottom: 12, borderRadius: 16 }}
                  contentStyle={{
                    flexDirection: "row",
                    gap: 14,
                    padding: 14,
                    alignItems: "center",
                  }}
                >
                  {/* Time Badge Tile */}
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
                        color: colors.onSurface,
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
                        color: colors.onSurfaceVariant,
                        fontFamily: FONTS.medium,
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
                      backgroundColor: colors.primary,
                      borderRadius: 2,
                    }}
                  />

                  {/* Details Column */}
                  <View style={{ flex: 1, minWidth: 0, justifyContent: "center" }}>
                    <Text
                      style={{
                        fontSize: FONT_SIZES.md,
                        fontFamily: FONTS.bold,
                        color: colors.onSurface,
                        marginBottom: 4,
                      }}
                      numberOfLines={1}
                    >
                      {period.subject?.name || t("common.subject", "Subject")}
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          minWidth: 0,
                        }}
                      >
                        <UserAvatar
                          photoUrl={period.teacher?.profilePhoto}
                          name={formatUserName(period.teacher?.name, "Teacher")}
                          role="teacher"
                          size={18}
                        />
                        <Text
                          style={{
                            fontSize: FONT_SIZES.xs,
                            fontFamily: FONTS.medium,
                            color: colors.onSurfaceVariant,
                          }}
                          numberOfLines={1}
                        >
                          {formatUserName(period.teacher?.name, t("common.teacher", "Teacher"))}
                        </Text>
                      </View>
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
                            color={colors.onSurfaceVariant}
                          />
                          <Text
                            style={{
                              fontSize: FONT_SIZES.xs,
                              fontFamily: FONTS.regular,
                              color: colors.onSurfaceVariant,
                            }}
                          >
                            {t("common.room", "Room")} {period.roomNumber}
                          </Text>
                        </View>
                      )}
                    </View>
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
