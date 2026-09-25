import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";

import {
  useTheme,
  FONTS,
  FONT_SIZES,
  SPACING,
  RADIUS,
} from "../../theme";
import {
  useApiQuery,
  useApiMutation,
  createApiMutationFn,
} from "../../hooks/useApi";
import apiConfig from "../../config/apiConfig";
import Header from "../../components/Header";
import Card from "../../components/Card";
import Button from "../../components/Button";
import { useToast } from "../../components/ToastProvider";
import AppRefreshControl from "../../components/ui/AppRefreshControl";

export default function DailyRemindersScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors, mode } = useTheme();
  const isDark = mode === "dark";
  const { showToast } = useToast();

  const [forceRun, setForceRun] = useState(false);
  const [activeJobTriggering, setActiveJobTriggering] = useState(null); // 'all-daily' | 'birthday' | 'event' | etc.
  const [lastExecutionResult, setLastExecutionResult] = useState(null);
  const [logFilter, setLogFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  // Fetch Cron Logs
  const {
    data: cronLogsData,
    isLoading: isLogsLoading,
    refetch: refetchLogs,
  } = useApiQuery(
    ["cronLogs", logFilter],
    `${apiConfig.baseUrl}/notifications/cron-logs?limit=30${
      logFilter !== "all" ? `&jobName=${logFilter}` : ""
    }`
  );

  // Trigger Cron Mutation
  const triggerCronMutation = useApiMutation({
    mutationFn: createApiMutationFn(
      `${apiConfig.baseUrl}/notifications/trigger-cron`,
      "POST"
    ),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["cronLogs"] });
      setActiveJobTriggering(null);

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // Fallback on web/simulator
      }

      const res = data?.result;
      setLastExecutionResult({
        job: variables.job,
        timestamp: new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        data: res,
      });

      showToast("Trigger executed successfully!", "success");
    },
    onError: (error) => {
      setActiveJobTriggering(null);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {
        // Fallback
      }
      showToast(error.message || "Failed to trigger reminder", "error");
    },
  });

  const handleTrigger = (jobKey) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Fallback
    }
    setActiveJobTriggering(jobKey);
    triggerCronMutation.mutate({
      job: jobKey,
      force: forceRun,
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetchLogs();
    setRefreshing(false);
  };

  // Predefined reminder definitions
  const REMINDER_CONFIGS = useMemo(
    () => [
      {
        id: "birthday",
        title: "Birthday Greetings",
        icon: "cake",
        accent: "#D97706", // Amber
        containerBg: isDark ? "rgba(217, 119, 6, 0.15)" : "#FEF3C7",
        schedule: "Daily at 08:00 AM IST",
        audience: "Students celebrating birthdays today & their parents",
        description:
          "Sends celebratory in-app notifications and push alerts wishing students a happy birthday.",
      },
      {
        id: "exam",
        title: "Exam-Day Reminders",
        icon: "edit-calendar",
        accent: "#DC2626", // Red / Coral
        containerBg: isDark ? "rgba(220, 38, 38, 0.15)" : "#FEE2E2",
        schedule: "Daily at 07:00 AM IST",
        audience: "Students & parents of classes with exams today",
        description:
          "Alerts students and parents about upcoming exams, subject names, timings, and schedules.",
      },
      {
        id: "event",
        title: "Event-Day Alerts",
        icon: "event-available",
        accent: "#2563EB", // Blue
        containerBg: isDark ? "rgba(37, 99, 235, 0.15)" : "#DBEAFE",
        schedule: "Daily at 08:00 AM IST",
        audience: "Targeted classes, teachers, and school community",
        description:
          "Notifies attendees about school events, ceremonies, and workshops scheduled for today.",
      },
      {
        id: "event-eve",
        logKey: "event_eve",
        title: "Event Eve Reminders",
        icon: "nightlight-round",
        accent: "#7C3AED", // Purple / Indigo
        containerBg: isDark ? "rgba(124, 58, 237, 0.15)" : "#EDE9FE",
        schedule: "Daily at 08:00 PM IST",
        audience: "Participants & parents for tomorrow's events",
        description:
          "Advance heads-up sent the evening before an event to ensure students are prepared.",
      },
      {
        id: "monthly-fee",
        logKey: "monthly_fee",
        title: "Monthly Fee Reminders",
        icon: "payments",
        accent: "#16A34A", // Green
        containerBg: isDark ? "rgba(22, 163, 74, 0.15)" : "#DCFCE7",
        schedule: "1st of every month at 09:00 AM IST",
        audience: "Students with pending fee balances (≥ ₹100)",
        description:
          "Evaluates pending balances and sends payment reminders with exact pending amounts.",
      },
    ],
    [isDark]
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header
        title="Daily Reminders Hub"
        showBack
        onBack={() => router.back()}
        rightComponent={
          <Pressable
            onPress={handleRefresh}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Refresh reminders status"
            style={({ pressed }) => [
              styles.iconBtn,
              {
                backgroundColor: colors.surfaceContainerHighest || colors.surfaceVariant,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <MaterialIcons
              name="refresh"
              size={20}
              color={colors.onSurface}
            />
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={{
          padding: SPACING.md || 16,
          paddingBottom: 48,
        }}
        refreshControl={
          <AppRefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Status Pill & Engine Info */}
        <View
          style={[
            styles.systemStatusBanner,
            {
              backgroundColor: colors.surfaceContainerLow,
              borderColor: colors.outlineVariant || "rgba(0,0,0,0.08)",
            },
          ]}
        >
          <View style={styles.statusRow}>
            <View style={styles.statusIndicator}>
              <View style={[styles.statusDot, { backgroundColor: "#10B981" }]} />
              <Text
                style={[
                  styles.statusText,
                  { color: colors.onSurface },
                ]}
              >
                Automated Cron Engine Active
              </Text>
            </View>
            <View
              style={[
                styles.istBadge,
                { backgroundColor: colors.primaryContainer },
              ]}
            >
              <MaterialIcons
                name="schedule"
                size={13}
                color={colors.onPrimaryContainer}
              />
              <Text
                style={[
                  styles.istBadgeText,
                  { color: colors.onPrimaryContainer },
                ]}
              >
                IST (UTC+5:30)
              </Text>
            </View>
          </View>
          <Text
            style={[
              styles.systemStatusSubtext,
              { color: colors.onSurfaceVariant },
            ]}
          >
            All reminders run automatically at scheduled IST times. Admins and Super Admins can manually trigger all or specific suites at any moment.
          </Text>
        </View>

        {/* Master Trigger Hero Card */}
        <Card
          variant="filled"
          style={[
            styles.masterCard,
            {
              backgroundColor: colors.surfaceContainerHigh || colors.surfaceContainer,
              borderColor: colors.primary,
            },
          ]}
        >
          <View style={styles.masterCardHeader}>
            <View
              style={[
                styles.masterIconBox,
                { backgroundColor: colors.primary },
              ]}
            >
              <MaterialIcons name="bolt" size={24} color={colors.onPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.masterTitle,
                  { color: colors.onSurface },
                ]}
              >
                Master Daily Dispatcher
              </Text>
              <Text
                style={[
                  styles.masterSubtitle,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                Instantly run scheduled checks for today (Birthdays, Exams, Events).
              </Text>
            </View>
          </View>

          {/* Force Run Mode Switch */}
          <View
            style={[
              styles.switchRow,
              {
                borderTopColor: colors.outlineVariant || "rgba(0,0,0,0.08)",
              },
            ]}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text
                style={[
                  styles.switchTitle,
                  { color: colors.onSurface },
                ]}
              >
                Force Run Mode
              </Text>
              <Text
                style={[
                  styles.switchDesc,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                Bypass duplicate prevention checks (useful for re-sending or testing)
              </Text>
            </View>
            <Switch
              value={forceRun}
              onValueChange={setForceRun}
              trackColor={{
                false: colors.surfaceContainerHighest,
                true: colors.primaryContainer,
              }}
              thumbColor={forceRun ? colors.primary : colors.outline}
            />
          </View>

          {/* Master Trigger Button */}
          <Button
            variant="filled"
            size="lg"
            fullWidth
            icon="play-arrow"
            loading={activeJobTriggering === "all-daily"}
            disabled={activeJobTriggering !== null}
            onPress={() => handleTrigger("all-daily")}
            style={{ marginTop: SPACING.md || 16 }}
          >
            {activeJobTriggering === "all-daily"
              ? "Running All Reminders..."
              : "Trigger All Daily Reminders Now"}
          </Button>
        </Card>

        {/* Live Execution Results Banner */}
        {lastExecutionResult && (
          <View
            style={[
              styles.resultContainer,
              {
                backgroundColor: colors.surfaceContainerLowest || colors.surface,
                borderColor: colors.outlineVariant || "rgba(0,0,0,0.1)",
              },
            ]}
          >
            <View style={styles.resultHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <MaterialIcons name="check-circle" size={18} color="#10B981" />
                <Text
                  style={[
                    styles.resultTitle,
                    { color: colors.onSurface },
                  ]}
                >
                  Latest Execution Results ({lastExecutionResult.timestamp})
                </Text>
              </View>
              <Pressable
                onPress={() => setLastExecutionResult(null)}
                hitSlop={8}
              >
                <MaterialIcons
                  name="close"
                  size={18}
                  color={colors.onSurfaceVariant}
                />
              </Pressable>
            </View>

            <View style={styles.resultBody}>
              {lastExecutionResult.job === "all-daily" ? (
                <View style={{ gap: 6 }}>
                  <Text style={[styles.resultItemText, { color: colors.onSurface }]}>
                    🎂 <Text style={{ fontFamily: FONTS.semiBold }}>Birthdays:</Text>{" "}
                    {lastExecutionResult.data?.birthdays?.sent
                      ? `Sent for ${lastExecutionResult.data.birthdays.userCount} student(s)`
                      : lastExecutionResult.data?.birthdays?.reason || "No birthdays today"}
                  </Text>
                  <Text style={[styles.resultItemText, { color: colors.onSurface }]}>
                    📝 <Text style={{ fontFamily: FONTS.semiBold }}>Exams:</Text>{" "}
                    {lastExecutionResult.data?.examReminders?.sent
                      ? `Notified ${lastExecutionResult.data.examReminders.sentCount} exam(s)`
                      : lastExecutionResult.data?.examReminders?.reason || "No exams today"}
                  </Text>
                  <Text style={[styles.resultItemText, { color: colors.onSurface }]}>
                    📅 <Text style={{ fontFamily: FONTS.semiBold }}>Events Today:</Text>{" "}
                    {lastExecutionResult.data?.events?.sent
                      ? `Notified ${lastExecutionResult.data.events.sentCount} event(s)`
                      : lastExecutionResult.data?.events?.reason || "No events today"}
                  </Text>
                  {lastExecutionResult.data?.monthlyFees && (
                    <Text style={[styles.resultItemText, { color: colors.onSurface }]}>
                      💰 <Text style={{ fontFamily: FONTS.semiBold }}>Monthly Fees:</Text>{" "}
                      {lastExecutionResult.data.monthlyFees.sent
                        ? `Sent to ${lastExecutionResult.data.monthlyFees.sentCount} student(s)`
                        : lastExecutionResult.data.monthlyFees.reason || "Processed fee checks"}
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={[styles.resultItemText, { color: colors.onSurface }]}>
                  {lastExecutionResult.data?.sent
                    ? `Successfully sent ${lastExecutionResult.data.sentCount || 1} reminder(s)`
                    : lastExecutionResult.data?.reason || "Completed execution check"}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Section Header: Individual Reminders */}
        <View style={styles.sectionHeaderRow}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.onSurface },
            ]}
          >
            Individual Reminder Suites
          </Text>
          <Text
            style={[
              styles.sectionSub,
              { color: colors.onSurfaceVariant },
            ]}
          >
            Trigger specific reminders independently on demand
          </Text>
        </View>

        {/* Individual Reminder Cards */}
        <View style={{ gap: SPACING.md || 12 }}>
          {REMINDER_CONFIGS.map((item) => {
            const isRunning = activeJobTriggering === item.id;
            const isAnyRunning = activeJobTriggering !== null;

            return (
              <Card
                key={item.id}
                variant="outlined"
                style={[
                  styles.reminderCard,
                  {
                    backgroundColor: colors.surfaceContainerLow,
                    borderColor: colors.outlineVariant || "rgba(0,0,0,0.08)",
                  },
                ]}
              >
                <View style={styles.cardTopRow}>
                  <View
                    style={[
                      styles.categoryIconBox,
                      { backgroundColor: item.containerBg },
                    ]}
                  >
                    <MaterialIcons
                      name={item.icon}
                      size={22}
                      color={item.accent}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.titleWithSchedule}>
                      <Text
                        style={[
                          styles.cardTitle,
                          { color: colors.onSurface },
                        ]}
                      >
                        {item.title}
                      </Text>
                    </View>
                    <View style={styles.scheduleBadgeRow}>
                      <MaterialIcons
                        name="schedule"
                        size={12}
                        color={colors.onSurfaceVariant}
                      />
                      <Text
                        style={[
                          styles.scheduleText,
                          { color: colors.onSurfaceVariant },
                        ]}
                      >
                        {item.schedule}
                      </Text>
                    </View>
                  </View>

                  {/* Instant Trigger Action Button */}
                  <Button
                    variant="tonal"
                    size="sm"
                    loading={isRunning}
                    disabled={isAnyRunning}
                    onPress={() => handleTrigger(item.id)}
                    icon="send"
                    style={{ alignSelf: "center" }}
                  >
                    Trigger
                  </Button>
                </View>

                <Text
                  style={[
                    styles.cardDesc,
                    { color: colors.onSurfaceVariant },
                  ]}
                >
                  {item.description}
                </Text>

                <View
                  style={[
                    styles.audienceRow,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.03)"
                        : "rgba(0,0,0,0.02)",
                    },
                  ]}
                >
                  <MaterialIcons
                    name="people-outline"
                    size={14}
                    color={colors.primary}
                  />
                  <Text
                    style={[
                      styles.audienceText,
                      { color: colors.onSurfaceVariant },
                    ]}
                    numberOfLines={1}
                  >
                    {item.audience}
                  </Text>
                </View>
              </Card>
            );
          })}
        </View>

        {/* Execution Audit Trail Section */}
        <View style={[styles.sectionHeaderRow, { marginTop: SPACING.xl || 28 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <MaterialIcons
              name="receipt-long"
              size={20}
              color={colors.primary}
            />
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.onSurface },
              ]}
            >
              Execution Audit Trail
            </Text>
          </View>
          <Text
            style={[
              styles.sectionSub,
              { color: colors.onSurfaceVariant },
            ]}
          >
            History of automated schedules and manual triggers
          </Text>
        </View>

        {/* Audit Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingVertical: 4, marginBottom: 12 }}
        >
          {[
            { id: "all", label: "All Logs" },
            { id: "birthday", label: "🎂 Birthdays" },
            { id: "exam", label: "📝 Exams" },
            { id: "event", label: "📅 Events" },
            { id: "event_eve", label: "🌙 Event Eve" },
            { id: "monthly_fee", label: "💰 Fees" },
            { id: "all_daily", label: "⚡ Master Dispatch" },
          ].map((chip) => {
            const isSelected = logFilter === chip.id;
            return (
              <Pressable
                key={chip.id}
                onPress={() => setLogFilter(chip.id)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected
                      ? colors.primaryContainer
                      : colors.surfaceContainerHighest || colors.surfaceVariant,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: isSelected
                        ? colors.onPrimaryContainer
                        : colors.onSurfaceVariant,
                      fontFamily: isSelected ? FONTS.semiBold : FONTS.medium,
                    },
                  ]}
                >
                  {chip.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Audit Log Cards */}
        {isLogsLoading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
              Loading audit logs...
            </Text>
          </View>
        ) : !cronLogsData?.logs || cronLogsData.logs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons
              name="history"
              size={32}
              color={colors.onSurfaceVariant}
            />
            <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
              No execution records found for this filter
            </Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {cronLogsData.logs.map((log) => {
              const isSuccess = log.status === "success";
              const isSkipped = log.status === "skipped";

              const statusColor = isSuccess
                ? "#10B981"
                : isSkipped
                ? "#F59E0B"
                : "#EF4444";

              const statusBg = isSuccess
                ? isDark
                  ? "rgba(16, 185, 129, 0.15)"
                  : "#D1FAE5"
                : isSkipped
                ? isDark
                  ? "rgba(245, 158, 11, 0.15)"
                  : "#FEF3C7"
                : isDark
                ? "rgba(239, 68, 68, 0.15)"
                : "#FEE2E2";

              const formattedTime = new Date(log.createdAt).toLocaleString(
                "en-IN",
                {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                }
              );

              return (
                <View
                  key={log._id}
                  style={[
                    styles.logItem,
                    {
                      backgroundColor: colors.surfaceContainerLow,
                      borderColor: colors.outlineVariant || "rgba(0,0,0,0.06)",
                    },
                  ]}
                >
                  <View style={styles.logItemHeader}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={[styles.logJobName, { color: colors.onSurface }]}>
                        {log.jobName.replace(/_/g, " ").toUpperCase()}
                      </Text>
                      <View
                        style={[
                          styles.triggerBadge,
                          {
                            backgroundColor:
                              log.trigger === "manual"
                                ? colors.tertiaryContainer
                                : colors.surfaceContainerHigh,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.triggerBadgeText,
                            {
                              color:
                                log.trigger === "manual"
                                  ? colors.onTertiaryContainer
                                  : colors.onSurfaceVariant,
                            },
                          ]}
                        >
                          {log.trigger}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.statusPill,
                        { backgroundColor: statusBg },
                      ]}
                    >
                      <Text style={[styles.statusPillText, { color: statusColor }]}>
                        {log.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={[styles.logMessage, { color: colors.onSurfaceVariant }]}
                  >
                    {log.message}
                  </Text>

                  <View style={styles.logFooter}>
                    <Text
                      style={[
                        styles.logFooterText,
                        { color: colors.onSurfaceVariant },
                      ]}
                    >
                      {formattedTime}
                    </Text>
                    {log.durationMs !== undefined && (
                      <Text
                        style={[
                          styles.logFooterText,
                          { color: colors.onSurfaceVariant },
                        ]}
                      >
                        Duration: {log.durationMs}ms
                      </Text>
                    )}
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

const styles = StyleSheet.create({
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full || 18,
    alignItems: "center",
    justifyContent: "center",
  },
  systemStatusBanner: {
    padding: SPACING.md || 14,
    borderRadius: RADIUS.lg || 16,
    borderWidth: 1,
    marginBottom: SPACING.md || 16,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.sm,
  },
  istBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full || 12,
  },
  istBadgeText: {
    fontFamily: FONTS.medium,
    fontSize: 11,
  },
  systemStatusSubtext: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.xs,
    lineHeight: 16,
  },
  masterCard: {
    padding: SPACING.lg || 18,
    borderRadius: RADIUS.xl || 20,
    borderWidth: 1.5,
    marginBottom: SPACING.md || 16,
  },
  masterCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  masterIconBox: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full || 22,
    alignItems: "center",
    justifyContent: "center",
  },
  masterTitle: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES.md,
  },
  masterSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
    lineHeight: 16,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
    marginTop: 14,
    borderTopWidth: 1,
  },
  switchTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.sm,
  },
  switchDesc: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    marginTop: 1,
  },
  resultContainer: {
    padding: SPACING.md || 14,
    borderRadius: RADIUS.lg || 16,
    borderWidth: 1,
    marginBottom: SPACING.md || 16,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
    paddingBottom: 6,
  },
  resultTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.xs,
  },
  resultBody: {
    paddingTop: 2,
  },
  resultItemText: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.xs,
    lineHeight: 18,
  },
  sectionHeaderRow: {
    marginBottom: 10,
    marginTop: 6,
  },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES.md,
  },
  sectionSub: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
  },
  reminderCard: {
    padding: SPACING.md || 16,
    borderRadius: RADIUS.lg || 16,
    borderWidth: 1,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  categoryIconBox: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.lg || 14,
    alignItems: "center",
    justifyContent: "center",
  },
  titleWithSchedule: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardTitle: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES.sm,
  },
  scheduleBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  scheduleText: {
    fontFamily: FONTS.medium,
    fontSize: 11,
  },
  cardDesc: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.xs,
    lineHeight: 18,
    marginTop: 10,
  },
  audienceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: RADIUS.sm || 8,
  },
  audienceText: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    flex: 1,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full || 16,
  },
  filterChipText: {
    fontSize: FONT_SIZES.xs,
  },
  logItem: {
    padding: 12,
    borderRadius: RADIUS.md || 12,
    borderWidth: 1,
  },
  logItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  logJobName: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  triggerBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  triggerBadgeText: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    textTransform: "capitalize",
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusPillText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
  },
  logMessage: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.xs,
    lineHeight: 16,
    marginTop: 2,
  },
  logFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  logFooterText: {
    fontFamily: FONTS.regular,
    fontSize: 10,
  },
  emptyContainer: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.xs,
  },
});
