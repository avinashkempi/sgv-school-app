import React, { useState, useEffect, useRef, useMemo } from "react";
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
import Card from "../../components/Card";
import { useLabel } from "../../context/LabelsContext";
import ExamTimeline from "../../components/ExamTimeline";
import AppRefreshControl from "../../components/ui/AppRefreshControl";

/**
 * Student Exam Schedule Screen
 * Shows upcoming & past exams with hero countdown, interactive tabs, and timeline
 */
export default function StudentExamScheduleScreen() {
  const router = useRouter();
  const { colors, mode } = useTheme();
  const isDark = mode === "dark";
  const { t } = useLabel();
  const { user, userId: authUserId } = useAuth();
  const userId = user?.id || user?._id || authUserId;
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("upcoming"); // 'upcoming' | 'past' | 'all'

  // Entrance animations
  const heroAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(100, [
      Animated.spring(heroAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 8,
      }),
      Animated.spring(contentAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
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

  const exams = useMemo(() => examsData || [], [examsData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Split into upcoming and past
  const { upcomingExams, pastExams, nextExam } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sorted = [...exams].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    const upcoming = sorted.filter((e) => new Date(e.date) >= today);
    // Past exams sorted descending (most recent first)
    const past = [...sorted]
      .filter((e) => new Date(e.date) < today)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    return {
      upcomingExams: upcoming,
      pastExams: past,
      nextExam: upcoming[0] || null,
    };
  }, [exams]);

  // Adjust default tab if no upcoming exams exist but past exams do
  useEffect(() => {
    if (!isLoading && exams.length > 0) {
      if (upcomingExams.length === 0 && pastExams.length > 0) {
        setActiveTab("past");
      }
    }
  }, [isLoading, exams.length, upcomingExams.length, pastExams.length]);

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
      return {
        text: t("common.tomorrow", "Tomorrow"),
        unit: "",
        urgent: true,
      };
    return {
      text: `${days}`,
      unit: t("common.daysLeft", "days left"),
      urgent: days <= 3,
    };
  };

  const handleExamPress = (exam) => {
    if (exam.marksPublished) {
      router.push("/student/report-card");
    }
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
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 40,
        }}
        showsVerticalScrollIndicator={false}
        scrollsToTop={true}
      >
        <View>
          <Header
            title={t("student.examSchedule", "Exam Schedule")}
            subtitle={t("student.stayOnTopExams", "Stay on top of your exams")}
            showBack
          />

          {/* ══════════════ HERO SECTION ══════════════ */}
          {nextExam ? (
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
                marginTop: 14,
                marginBottom: 14,
              }}
            >
              <Card
                variant="elevated"
                style={{
                  borderRadius: 16,
                  overflow: "hidden",
                  marginBottom: 0,
                }}
                contentStyle={{ padding: 0 }}
              >
                <LinearGradient
                  colors={[colors.primary, colors.onPrimaryContainer]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ padding: 18 }}
                >
                  {/* Top Tag Row */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 10,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: "rgba(255, 255, 255, 0.18)",
                        paddingHorizontal: 9,
                        paddingVertical: 3,
                        borderRadius: 12,
                        gap: 6,
                      }}
                    >
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: "#4ADE80",
                        }}
                      />
                      <Text
                        style={{
                          fontSize: FONT_SIZES.micro,
                          fontFamily: FONTS.bold,
                          color: colors.onPrimary,
                          letterSpacing: 0.8,
                          textTransform: "uppercase",
                        }}
                      >
                        {t("student.nextExam", "Next Exam")}
                      </Text>
                    </View>

                    {nextExam.standardizedType && (
                      <View
                        style={{
                          backgroundColor: "rgba(255, 255, 255, 0.22)",
                          paddingHorizontal: 8,
                          paddingVertical: 2.5,
                          borderRadius: 6,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: FONT_SIZES.micro,
                            fontFamily: FONTS.bold,
                            color: colors.onPrimary,
                            letterSpacing: 0.5,
                          }}
                        >
                          {nextExam.standardizedType}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Subject & Countdown */}
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: FONT_SIZES.md,
                          fontFamily: FONTS.bold,
                          color: colors.onPrimary,
                          marginBottom: 3,
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
                          opacity: 0.9,
                        }}
                      >
                        {new Date(nextExam.date).toLocaleDateString("en-IN", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                      </Text>
                    </View>

                    {/* Countdown Box */}
                    <View
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.2)",
                        borderRadius: 12,
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: 70,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: FONT_SIZES.xl,
                          fontFamily: FONTS.bold,
                          color: colors.onPrimary,
                          lineHeight: 24,
                        }}
                      >
                        {getCountdown(nextExam.date).text}
                      </Text>
                      {getCountdown(nextExam.date).unit ? (
                        <Text
                          style={{
                            fontSize: FONT_SIZES.micro,
                            fontFamily: FONTS.medium,
                            color: colors.onPrimary,
                            opacity: 0.9,
                            marginTop: 1,
                          }}
                        >
                          {getCountdown(nextExam.date).unit}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  {/* Footer Meta Row */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 14,
                      marginTop: 14,
                      paddingTop: 10,
                      borderTopWidth: 1,
                      borderTopColor: "rgba(255, 255, 255, 0.16)",
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <MaterialIcons
                        name="grade"
                        size={13}
                        color={colors.onPrimary}
                        style={{ opacity: 0.9 }}
                      />
                      <Text
                        style={{
                          fontSize: FONT_SIZES.xs,
                          fontFamily: FONTS.medium,
                          color: colors.onPrimary,
                          opacity: 0.95,
                        }}
                      >
                        {nextExam.totalMarks} {t("student.marks", "marks")}
                      </Text>
                    </View>

                    {nextExam.duration ? (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <MaterialIcons
                          name="schedule"
                          size={13}
                          color={colors.onPrimary}
                          style={{ opacity: 0.9 }}
                        />
                        <Text
                          style={{
                            fontSize: FONT_SIZES.xs,
                            fontFamily: FONTS.medium,
                            color: colors.onPrimary,
                            opacity: 0.95,
                          }}
                        >
                          {nextExam.duration} {t("student.min", "min")}
                        </Text>
                      </View>
                    ) : null}

                    {nextExam.room ? (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <MaterialIcons
                          name="meeting-room"
                          size={13}
                          color={colors.onPrimary}
                          style={{ opacity: 0.9 }}
                        />
                        <Text
                          style={{
                            fontSize: FONT_SIZES.xs,
                            fontFamily: FONTS.medium,
                            color: colors.onPrimary,
                            opacity: 0.95,
                          }}
                        >
                          {nextExam.room}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </LinearGradient>
              </Card>
            </Animated.View>
          ) : pastExams.length > 0 ? (
            /* Celebratory Banner when all scheduled exams are completed */
            <Animated.View
              style={{
                opacity: heroAnim,
                marginTop: 14,
                marginBottom: 14,
              }}
            >
              <Card
                variant="elevated"
                style={{
                  borderRadius: 16,
                  overflow: "hidden",
                  marginBottom: 0,
                }}
                contentStyle={{ padding: 0 }}
              >
                <LinearGradient
                  colors={["#0F766E", "#115E59"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ padding: 16 }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text
                        style={{
                          fontSize: FONT_SIZES.md,
                          fontFamily: FONTS.bold,
                          color: "#FFFFFF",
                          marginBottom: 3,
                        }}
                      >
                        All Exams Completed 🎉
                      </Text>
                      <Text
                        style={{
                          fontSize: FONT_SIZES.xs,
                          fontFamily: FONTS.regular,
                          color: "#CCFBF1",
                          lineHeight: 17,
                        }}
                      >
                        Review your scores & analysis in the report card.
                      </Text>
                    </View>

                    <Pressable
                      onPress={() => router.push("/student/report-card")}
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.2)",
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderRadius: 10,
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: FONT_SIZES.xs,
                          fontFamily: FONTS.bold,
                          color: "#FFFFFF",
                        }}
                      >
                        Report Card
                      </Text>
                    </Pressable>
                  </View>
                </LinearGradient>
              </Card>
            </Animated.View>
          ) : null}

          {/* ══════════════ STATS ROW (CLICKABLE QUICK SELECT) ══════════════ */}
          <Animated.View
            style={{
              opacity: contentAnim,
              flexDirection: "row",
              gap: 8,
              marginBottom: 14,
            }}
          >
            {[
              {
                tabKey: "upcoming",
                label: t("student.upcoming", "Upcoming"),
                value: upcomingExams.length,
                color: "#2563EB",
                bg: isDark ? "#2563EB20" : "#2563EB10",
              },
              {
                tabKey: "past",
                label: t("common.done", "Completed"),
                value: pastExams.length,
                color: colors.success,
                bg: isDark ? colors.success + "20" : colors.success + "12",
              },
              {
                tabKey: "all",
                label: t("common.total", "Total"),
                value: exams.length,
                color: colors.primary,
                bg: colors.primaryContainer,
              },
            ].map((stat) => {
              const isSelected = activeTab === stat.tabKey;
              return (
                <Pressable
                  key={stat.tabKey}
                  onPress={() => setActiveTab(stat.tabKey)}
                  style={{ flex: 1 }}
                >
                  <Card
                    variant={isSelected ? "elevated" : "filled"}
                    style={{
                      marginBottom: 0,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: isSelected
                        ? stat.color
                        : colors.outlineVariant + "25",
                      backgroundColor: isSelected
                        ? stat.bg
                        : colors.surfaceContainerLow || colors.surfaceContainer,
                    }}
                    contentStyle={{
                      padding: 10,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: FONT_SIZES.lg,
                        fontFamily: FONTS.bold,
                        color: stat.color,
                        lineHeight: 22,
                      }}
                    >
                      {stat.value}
                    </Text>
                    <Text
                      style={{
                        fontSize: FONT_SIZES.micro,
                        fontFamily: isSelected ? FONTS.bold : FONTS.medium,
                        color: isSelected
                          ? colors.onSurface
                          : colors.onSurfaceVariant,
                        marginTop: 2,
                      }}
                      numberOfLines={1}
                    >
                      {stat.label}
                    </Text>
                  </Card>
                </Pressable>
              );
            })}
          </Animated.View>



          {/* ══════════════ TAB CONTENT ══════════════ */}

          {/* 1. UPCOMING TAB */}
          {activeTab === "upcoming" && (
            <View>
              {upcomingExams.length > 0 ? (
                <ExamTimeline
                  exams={upcomingExams}
                  onExamPress={handleExamPress}
                />
              ) : (
                <Card
                  variant="filled"
                  style={{
                    alignItems: "center",
                    paddingVertical: 36,
                    paddingHorizontal: 20,
                    borderRadius: 16,
                  }}
                >
                  <View
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 26,
                      backgroundColor: colors.primaryContainer,
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 8,
                    }}
                  >
                    <MaterialIcons
                      name="celebration"
                      size={26}
                      color={colors.primary}
                    />
                  </View>
                  <Text
                    style={{
                      fontSize: FONT_SIZES.sm,
                      fontFamily: FONTS.bold,
                      color: colors.onSurface,
                    }}
                  >
                    {t("student.noUpcomingExams", "No Upcoming Exams")}
                  </Text>
                  <Text
                    style={{
                      fontSize: FONT_SIZES.xs,
                      fontFamily: FONTS.regular,
                      color: colors.onSurfaceVariant,
                      textAlign: "center",
                      marginTop: 4,
                      lineHeight: 18,
                    }}
                  >
                    {t(
                      "student.noUpcomingTip",
                      "You have no upcoming tests or exams scheduled right now. Great time to catch up on revision!"
                    )}
                  </Text>
                </Card>
              )}
            </View>
          )}

          {/* 2. PAST EXAMS TAB */}
          {activeTab === "past" && (
            <View>
              {pastExams.length > 0 ? (
                <ExamTimeline
                  exams={pastExams}
                  onExamPress={handleExamPress}
                />
              ) : (
                <Card
                  variant="filled"
                  style={{
                    alignItems: "center",
                    paddingVertical: 36,
                    paddingHorizontal: 20,
                    borderRadius: 16,
                  }}
                >
                  <View
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 26,
                      backgroundColor: colors.surfaceContainerHigh,
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 8,
                    }}
                  >
                    <MaterialIcons
                      name="history"
                      size={26}
                      color={colors.onSurfaceVariant}
                    />
                  </View>
                  <Text
                    style={{
                      fontSize: FONT_SIZES.sm,
                      fontFamily: FONTS.bold,
                      color: colors.onSurface,
                    }}
                  >
                    {t("student.noPastExams", "No Past Exams")}
                  </Text>
                  <Text
                    style={{
                      fontSize: FONT_SIZES.xs,
                      fontFamily: FONTS.regular,
                      color: colors.onSurfaceVariant,
                      textAlign: "center",
                      marginTop: 4,
                      lineHeight: 18,
                    }}
                  >
                    {t(
                      "student.noPastTip",
                      "Completed exams will appear here once conducted."
                    )}
                  </Text>
                </Card>
              )}
            </View>
          )}

          {/* 3. ALL EXAMS TAB */}
          {activeTab === "all" && (
            <View>
              {/* Upcoming Sub-section */}
              {upcomingExams.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 10,
                    }}
                  >
                    <MaterialIcons
                      name="schedule"
                      size={16}
                      color={colors.primary}
                    />
                    <Text
                      style={{
                        fontSize: FONT_SIZES.sm,
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
                    onExamPress={handleExamPress}
                  />
                </View>
              )}

              {/* Past Sub-section */}
              {pastExams.length > 0 && (
                <View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 10,
                    }}
                  >
                    <MaterialIcons
                      name="history"
                      size={16}
                      color={colors.onSurfaceVariant}
                    />
                    <Text
                      style={{
                        fontSize: FONT_SIZES.sm,
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
                    onExamPress={handleExamPress}
                  />
                </View>
              )}
            </View>
          )}

          {/* Global Empty State (No exams at all) */}
          {exams.length === 0 && (
            <Card
              variant="filled"
              style={{
                alignItems: "center",
                paddingVertical: 48,
                paddingHorizontal: 24,
                borderRadius: 16,
                marginTop: 16,
              }}
            >
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: colors.primaryContainer,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <MaterialIcons
                  name="event-available"
                  size={32}
                  color={colors.primary}
                />
              </View>
              <Text
                style={{
                  fontSize: FONT_SIZES.md,
                  fontFamily: FONTS.bold,
                  color: colors.onSurface,
                }}
              >
                {t("student.noExamsYet", "No Exams Scheduled Yet")}
              </Text>
              <Text
                style={{
                  fontSize: FONT_SIZES.xs,
                  fontFamily: FONTS.regular,
                  color: colors.onSurfaceVariant,
                  textAlign: "center",
                  lineHeight: 18,
                  maxWidth: 280,
                  marginTop: 4,
                }}
              >
                {t(
                  "student.examScheduleSetupTip",
                  "Your exam schedule and timetable will appear here once published by your school."
                )}
              </Text>
            </Card>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
