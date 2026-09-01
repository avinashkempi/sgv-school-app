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
                {DAYS.map((day) => (
                  <Pressable
                    key={day}
                    onPress={() => setSelectedDay(day)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      backgroundColor:
                        selectedDay === day
                          ? colors.secondaryContainer
                          : colors.surfaceContainer,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor:
                        selectedDay === day
                          ? colors.onSecondaryContainer + "30"
                          : colors.outlineVariant,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: FONT_SIZES.sm,
                        color:
                          selectedDay === day
                            ? colors.onSecondaryContainer
                            : colors.onSurfaceVariant,
                        fontFamily:
                          selectedDay === day ? FONTS.bold : FONTS.medium,
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
                          backgroundColor:
                            selectedDay === day
                              ? colors.onSecondaryContainer
                              : colors.primary,
                          alignSelf: "center",
                          marginTop: 4,
                        }}
                      />
                    )}
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
                  color: colors.onSurface,
                }}
              >
                {t("common.day" + selectedDay, selectedDay)}
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
                    {t("common.todayUppercase", "TODAY")}
                  </Text>
                </View>
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
                  style={{ marginBottom: 12 }}
                  contentStyle={{
                    flexDirection: "row",
                    gap: 16,
                    padding: 16,
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
                        fontSize: FONT_SIZES.sm,
                        fontFamily: FONTS.bold,
                        color: colors.onSurface,
                      }}
                    >
                      {period.startTime}
                    </Text>
                    <View
                      style={{
                        width: 1,
                        height: 10,
                        backgroundColor: colors.outlineVariant,
                        marginVertical: 2,
                      }}
                    />
                    <Text
                      style={{ fontSize: FONT_SIZES.sm, color: colors.onSurfaceVariant }}
                    >
                      {period.endTime}
                    </Text>
                  </View>

                  {/* Divider */}
                  <View
                    style={{
                      width: 4,
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
