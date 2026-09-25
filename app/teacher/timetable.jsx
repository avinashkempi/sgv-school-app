import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import AppRefreshControl from "../../components/ui/AppRefreshControl";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme, FONTS, FONT_SIZES } from "../../theme";
import { useApiQuery } from "../../hooks/useApi";
import { CACHE_TIERS } from "../../utils/cacheConfig";
import AppHeader from "../../components/Header";
import Card from "../../components/Card";
import UserAvatar from "../../components/ui/UserAvatar";
import { formatUserName } from "../../utils/userFormatters";
import apiConfig from "../../config/apiConfig";
import formatClassName from "../../utils/formatClassName";
import { useLabel } from "../../context/LabelsContext";
import Badge from "../../components/ui/Badge";
import { EmptyState } from "../../components/StateComponents";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function SchoolTimetableScreen() {
  const { colors } = useTheme();
  const { t } = useLabel();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedDay, setSelectedDay] = useState("Monday");
  const [currentDay, setCurrentDay] = useState("");

  useEffect(() => {
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

  // Fetch all timetables
  const {
    data: timetables,
    isLoading: loading,
    isFetching,
    refetch,
  } = useApiQuery(
    ["schoolTimetable"],
    `${apiConfig.baseUrl}/timetable/all`,
    CACHE_TIERS.STABLE
  );

  // Auto-select first class
  useEffect(() => {
    if (!selectedClassId && timetables && timetables.length > 0) {
      const firstValid = timetables.find((t) => t.class);
      if (firstValid) {
        setSelectedClassId(firstValid.class?._id || firstValid.class);
      }
    }
  }, [timetables, selectedClassId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

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

  // Build schedule for selected class & day
  const getSchedule = () => {
    if (!timetables || !selectedClassId) return [];
    const classTimetable = timetables.find((t) => {
      const cid = t.class?._id || t.class;
      return String(cid) === String(selectedClassId);
    });
    if (!classTimetable) return [];
    const daySchedule = classTimetable.schedule?.find(
      (s) => s.day === selectedDay
    );
    if (!daySchedule) return [];
    return [...daySchedule.periods].sort(
      (a, b) => (a.periodNumber || 0) - (b.periodNumber || 0)
    );
  };

  const dayPeriods = getSchedule();
  const classes = (timetables || []).map((t) => t.class).filter(Boolean);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        refreshControl={
          <AppRefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        scrollsToTop={true}
      >
        <View>
          <AppHeader
            title={t("teacher.timetableTitle", "School Timetable")}
            subtitle={t("teacher.timetableSubtitle", "All classes schedule")}
            showBack
          />

          {/* Class Selector */}
          <View style={{ marginTop: 20 }}>
            <Text
              style={{
                fontSize: FONT_SIZES.sm,
                color: colors.textSecondary,
                marginBottom: 8,
                fontFamily: FONTS.medium,
              }}
            >
              {t("teacher.selectClass", "Select Class")}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {classes.map((cls) => {
                  const cid = cls._id || cls;
                  const isSelected = String(cid) === String(selectedClassId);
                  return (
                    <Pressable
                      key={String(cid)}
                      onPress={() => setSelectedClassId(cid)}
                      style={{
                        paddingHorizontal: 18,
                        paddingVertical: 9,
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
                          color: isSelected ? colors.primary || "#2F6CD4" : colors.textPrimary,
                          fontFamily: isSelected ? FONTS.bold : FONTS.medium,
                          fontSize: FONT_SIZES.sm,
                        }}
                      >
                        {formatClassName(cls.name, cls.section)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          {/* Day Tabs */}
          <View style={{ marginTop: 20 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {DAYS.map((day) => (
                  <Pressable
                    key={day}
                    onPress={() => setSelectedDay(day)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 9,
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
                        fontSize: FONT_SIZES.sm,
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

            {loading && !timetables ? (
              <View
                style={{
                  paddingVertical: 48,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ActivityIndicator size="large" color={colors.primary} />
                <Text
                  style={{
                    color: colors.textSecondary,
                    marginTop: 12,
                    fontSize: FONT_SIZES.sm,
                    fontFamily: FONTS.medium,
                  }}
                >
                  {t("teacher.loadingTimetable", "Loading timetable...")}
                </Text>
              </View>
            ) : (
              <View style={{ opacity: isFetching && !loading ? 0.85 : 1 }}>
                {dayPeriods.length === 0 ? (
                  <EmptyState
                    icon="event-busy"
                    title={t("teacher.noClassesTitle", "No Classes")}
                    message={t(
                      "teacher.noClassesScheduled",
                      "No classes scheduled"
                    )}
                  />
                ) : (
                  dayPeriods.map((period, index) => (
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
                          backgroundColor: colors.primary,
                          borderRadius: 2,
                        }}
                      />

                      {/* Details */}
                      <View style={{ flex: 1, justifyContent: "center" }}>
                        <Text
                          style={{
                            fontSize: FONT_SIZES.md,
                            fontFamily: FONTS.bold,
                            color: colors.textPrimary,
                            marginBottom: 4,
                          }}
                        >
                          {period.subject?.name ||
                            t("common.subject", "Subject")}
                        </Text>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
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
                              fontSize: FONT_SIZES.sm,
                              fontFamily: FONTS.medium,
                              color: colors.textSecondary,
                            }}
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
                              marginTop: 2,
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
                                fontFamily: FONTS.regular,
                                color: colors.textSecondary,
                              }}
                            >
                              {t("common.room", "Room")} {period.roomNumber}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Period badge */}
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 10,
                          backgroundColor: colors.primary + "15",
                          alignItems: "center",
                          justifyContent: "center",
                          alignSelf: "center",
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: FONTS.bold,
                            color: colors.primary,
                            fontSize: FONT_SIZES.sm,
                          }}
                        >
                          {period.periodNumber}
                        </Text>
                      </View>
                    </Card>
                  ))
                )}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
