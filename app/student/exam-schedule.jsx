import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Animated,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme, FONTS, FONT_SIZES } from "../../theme";
import { useAuth } from "../../context/AuthContext";
import { useApiQuery } from "../../hooks/useApi";
import { CACHE_TIERS } from "../../utils/cacheConfig";
import apiConfig from "../../config/apiConfig";
import Header from "../../components/Header";
import { useLabel } from "../../context/LabelsContext";
import ExamTimeline from "../../components/ExamTimeline";
import AppRefreshControl from "../../components/ui/AppRefreshControl";

/**
 * Student Exam Schedule Screen — Enhanced
 * Shows upcoming exams with hero countdown + timeline
 */
export default function StudentExamScheduleScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLabel();
  const { user, userId: authUserId } = useAuth();
  const userId = user?.id || user?._id || authUserId;
  const [refreshing, setRefreshing] = useState(false);
  const [filterSubject, setFilterSubject] = useState(null);

  // Entrance animations
  const heroAnim = useRef(new Animated.Value(0)).current;
  const filterAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(150, [
      Animated.spring(heroAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 60,
        friction: 8,
      }),
      Animated.spring(filterAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 60,
        friction: 8,
      }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch exam schedule
  const {
    data: examsData,
    isLoading,
    refetch,
  } = useApiQuery(
    ["studentExamSchedule", userId],
    `${apiConfig.baseUrl}/exams/schedule/student`,
    { ...CACHE_TIERS.MODERATE, refetchOnMount: true }
  );

  const exams = examsData || [];

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Group exams by subject
  const examsBySubject = exams.reduce((acc, exam) => {
    const subjectId = exam.subject?._id;
    if (!subjectId) return acc;
    if (!acc[subjectId]) {
      acc[subjectId] = { subject: exam.subject, exams: [] };
    }
    acc[subjectId].exams.push(exam);
    return acc;
  }, {});

  const subjects = Object.values(examsBySubject).map((group) => group.subject);

  // Filter exams
  const filteredExams = filterSubject
    ? exams.filter((e) => e.subject?._id === filterSubject)
    : exams;

  // Sort by date
  const sortedExams = [...filteredExams].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  // Split into upcoming and past
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingExams = sortedExams.filter((e) => new Date(e.date) >= today);
  const pastExams = sortedExams.filter((e) => new Date(e.date) < today);

  // Next exam for hero card
  const nextExam = upcomingExams[0] || null;
  const getCountdown = (date) => {
    const now = new Date();
    const examDate = new Date(date);
    const diffMs = examDate - now;
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );

    if (days === 0 && hours <= 0)
      return {
        text: t("common.todayUrgent", "Today!"),
        unit: "",
        urgent: true,
      };
    if (days === 0)
      return {
        text: `${hours}`,
        unit: t("common.hoursLeft", "h left"),
        urgent: true,
      };
    if (days === 1)
      return { text: t("common.tomorrow", "Tomorrow"), unit: "", urgent: true };
    return {
      text: `${days}`,
      unit: t("common.days", "days"),
      urgent: days <= 3,
    };
  };

  if (isLoading) {
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
          <AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        scrollsToTop={true}
      >
        <View>
          <Header
            title={t("student.examSchedule", "Exam Schedule")}
            subtitle={t("student.stayOnTopExams", "Stay on top of your exams")}
            showBack
          />

          {/* Hero Countdown Card */}
          {nextExam && (
            <Animated.View
              style={{
                opacity: heroAnim,
                transform: [
                  {
                    translateY: heroAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [16, 0],
                    }),
                  },
                ],
                marginTop: 16,
                borderRadius: 16,
                overflow: "hidden",
              }}
            >
              <LinearGradient
                colors={[colors.primary, colors.onPrimaryContainer]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ padding: 18 }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text
                      style={{
                        fontSize: FONT_SIZES.micro,
                        fontFamily: FONTS.bold,
                        color: colors.onPrimary,
                        opacity: 0.75,
                        textTransform: "uppercase",
                        letterSpacing: 1.2,
                        marginBottom: 4,
                      }}
                    >
                      {t("student.nextExam", "Next Exam")}
                    </Text>
                    <Text
                      style={{
                        fontSize: FONT_SIZES.md,
                        fontFamily: FONTS.bold,
                        color: colors.onPrimary,
                        marginBottom: 2,
                      }}
                      numberOfLines={1}
                    >
                      {nextExam.subject?.name || nextExam.name}
                    </Text>
                    <Text
                      style={{
                        fontSize: FONT_SIZES.xs,
                        fontFamily: FONTS.medium,
                        color: colors.onPrimary,
                        opacity: 0.85,
                      }}
                    >
                      {new Date(nextExam.date).toLocaleDateString("en-IN", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: "rgba(255,255,255,0.22)",
                      borderRadius: 12,
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      alignItems: "center",
                      minWidth: 68,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: FONT_SIZES.xl,
                        fontFamily: FONTS.bold,
                        color: colors.onPrimary,
                        lineHeight: 26,
                      }}
                    >
                      {getCountdown(nextExam.date).text}
                    </Text>
                    <Text
                      style={{
                        fontSize: FONT_SIZES.micro,
                        fontFamily: FONTS.medium,
                        color: colors.onPrimary,
                        opacity: 0.85,
                        marginTop: 1,
                      }}
                    >
                      {getCountdown(nextExam.date).unit ||
                        t("student.exam", "Exam")}
                    </Text>
                  </View>
                </View>

                {/* Meta items */}
                <View
                  style={{
                    flexDirection: "row",
                    gap: 14,
                    marginTop: 14,
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: "rgba(255,255,255,0.18)",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <MaterialIcons
                      name="assignment"
                      size={14}
                      color={colors.onPrimary}
                      style={{ opacity: 0.85 }}
                    />
                    <Text
                      style={{
                        fontSize: FONT_SIZES.xs,
                        fontFamily: FONTS.medium,
                        color: colors.onPrimary,
                        opacity: 0.9,
                      }}
                    >
                      {nextExam.totalMarks} {t("student.marks", "marks")}
                    </Text>
                  </View>
                  {nextExam.duration && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <MaterialIcons
                        name="schedule"
                        size={14}
                        color={colors.onPrimary}
                        style={{ opacity: 0.85 }}
                      />
                      <Text
                        style={{
                          fontSize: FONT_SIZES.xs,
                          fontFamily: FONTS.medium,
                          color: colors.onPrimary,
                          opacity: 0.9,
                        }}
                      >
                        {nextExam.duration} {t("student.min", "min")}
                      </Text>
                    </View>
                  )}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <MaterialIcons
                      name="label"
                      size={14}
                      color={colors.onPrimary}
                      style={{ opacity: 0.85 }}
                    />
                    <Text
                      style={{
                        fontSize: FONT_SIZES.xs,
                        fontFamily: FONTS.medium,
                        color: colors.onPrimary,
                        opacity: 0.9,
                      }}
                    >
                      {nextExam.standardizedType}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </Animated.View>
          )}

          {/* Stats Row */}
          <View
            style={{
              flexDirection: "row",
              gap: 8,
              marginTop: 16,
              marginBottom: 16,
            }}
          >
            {[
              {
                label: t("common.total", "Total"),
                value: exams.length,
                color: colors.primary,
                bg: colors.primaryContainer,
              },
              {
                label: t("student.upcoming", "Upcoming"),
                value: upcomingExams.length,
                color: "#FF9800",
                bg: "#FF980012",
              },
              {
                label: t("common.done", "Done"),
                value: pastExams.length,
                color: colors.success,
                bg: colors.success + "12",
              },
            ].map((stat, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  backgroundColor: stat.bg,
                  borderRadius: 12,
                  paddingVertical: 10,
                  paddingHorizontal: 8,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: FONT_SIZES.lg,
                    fontFamily: FONTS.bold,
                    color: stat.color,
                    lineHeight: 24,
                  }}
                >
                  {stat.value}
                </Text>
                <Text
                  style={{
                    fontSize: FONT_SIZES.xs,
                    fontFamily: FONTS.medium,
                    color: colors.onSurfaceVariant,
                    marginTop: 2,
                  }}
                >
                  {stat.label}
                </Text>
              </View>
            ))}
          </View>

          {/* Subject Filter */}
          {subjects.length > 1 && (
            <Animated.View
              style={{
                marginBottom: 16,
                opacity: filterAnim,
                transform: [
                  {
                    translateY: filterAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [8, 0],
                    }),
                  },
                ],
              }}
            >
              <Text
                style={{
                  fontSize: FONT_SIZES.xs,
                  fontFamily: FONTS.medium,
                  color: colors.onSurfaceVariant,
                  marginBottom: 8,
                }}
              >
                {t("student.filterBySubject", "Filter by Subject")}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  <Pressable
                    onPress={() => setFilterSubject(null)}
                    style={({ pressed }) => ({
                      backgroundColor: !filterSubject
                        ? colors.primary
                        : pressed
                        ? colors.surfaceContainerHigh
                        : colors.surfaceContainerHighest,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 16,
                    })}
                  >
                    <Text
                      style={{
                        fontSize: FONT_SIZES.xs,
                        fontFamily: FONTS.bold,
                        color: !filterSubject ? "#FFFFFF" : colors.onSurface,
                      }}
                    >
                      {t("common.all", "All")}
                    </Text>
                  </Pressable>

                  {subjects.map((subject) => (
                    <Pressable
                      key={subject._id}
                      onPress={() => setFilterSubject(subject._id)}
                      style={({ pressed }) => ({
                        backgroundColor:
                          filterSubject === subject._id
                            ? colors.primary
                            : pressed
                            ? colors.surfaceContainerHigh
                            : colors.surfaceContainerHighest,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 16,
                      })}
                    >
                      <Text
                        style={{
                          fontSize: FONT_SIZES.xs,
                          fontFamily: FONTS.bold,
                          color:
                            filterSubject === subject._id
                              ? "#FFFFFF"
                              : colors.onSurface,
                        }}
                      >
                        {subject.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </Animated.View>
          )}

          {/* Upcoming Exams */}
          {upcomingExams.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 12,
                }}
              >
                <MaterialIcons
                  name="upcoming"
                  size={18}
                  color={colors.onSurface}
                />
                <Text
                  style={{
                    fontSize: FONT_SIZES.md,
                    fontFamily: FONTS.bold,
                    color: colors.onSurface,
                  }}
                >
                  {t("student.upcomingExams", "Upcoming Exams")}
                </Text>
                <View
                  style={{
                    backgroundColor: colors.primaryContainer,
                    paddingHorizontal: 6,
                    paddingVertical: 1,
                    borderRadius: 8,
                    marginLeft: 2,
                  }}
                >
                  <Text
                    style={{
                      fontSize: FONT_SIZES.micro,
                      fontFamily: FONTS.bold,
                      color: colors.primary,
                    }}
                  >
                    {upcomingExams.length}
                  </Text>
                </View>
              </View>

              <ExamTimeline
                exams={upcomingExams}
                onExamPress={(exam) => {
                  if (exam.marksPublished) {
                    router.push("/student/report-card");
                  }
                }}
              />
            </View>
          )}

          {/* Past Exams */}
          {pastExams.length > 0 && (
            <View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 12,
                }}
              >
                <MaterialIcons
                  name="history"
                  size={18}
                  color={colors.onSurfaceVariant}
                />
                <Text
                  style={{
                    fontSize: FONT_SIZES.md,
                    fontFamily: FONTS.bold,
                    color: colors.onSurface,
                  }}
                >
                  {t("student.pastExams", "Past Exams")}
                </Text>
                <View
                  style={{
                    backgroundColor: colors.surfaceContainerHigh,
                    paddingHorizontal: 6,
                    paddingVertical: 1,
                    borderRadius: 8,
                    marginLeft: 2,
                  }}
                >
                  <Text
                    style={{
                      fontSize: FONT_SIZES.micro,
                      fontFamily: FONTS.bold,
                      color: colors.onSurfaceVariant,
                    }}
                  >
                    {pastExams.length}
                  </Text>
                </View>
              </View>

              <ExamTimeline
                exams={pastExams}
                onExamPress={(exam) => {
                  if (exam.marksPublished) {
                    router.push("/student/report-card");
                  }
                }}
              />
            </View>
          )}

          {/* Empty State */}
          {exams.length === 0 && (
            <View
              style={{
                alignItems: "center",
                paddingVertical: 60,
                backgroundColor: colors.surfaceContainerHighest,
                borderRadius: 20,
                marginTop: 20,
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: colors.primaryContainer,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons
                  name="event-available"
                  size={40}
                  color={colors.primary}
                />
              </View>
              <Text
                style={{
                  fontSize: FONT_SIZES.lg,
                  fontFamily: FONTS.bold,
                  color: colors.onSurface,
                }}
              >
                {t("student.noExamsYet", "No exams yet")}
              </Text>
              <Text
                style={{
                  fontSize: FONT_SIZES.sm,
                  fontFamily: FONTS.regular,
                  color: colors.onSurfaceVariant,
                  textAlign: "center",
                  paddingHorizontal: 40,
                }}
              >
                {t(
                  "student.examScheduleSetupTip",
                  "Your exam schedule will appear here once your school sets up exams"
                )}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
