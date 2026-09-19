import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  useTheme,
  FONTS,
  FONT_SIZES,
  SPACING,
  RADIUS,
  ICON_SIZES,
} from "../../theme";
import {
  useApiQuery,
  useApiMutation,
  createApiMutationFn,
} from "../../hooks/useApi";
import apiConfig from "../../config/apiConfig";
import Header from "../../components/Header";
import Button from "../../components/Button";
import TextInput from "../../components/TextInput";
import Card from "../../components/Card";
import { useToast } from "../../components/ToastProvider";
import formatClassName from "../../utils/formatClassName";

export default function SendNotificationScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const { showToast } = useToast();

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("General");
  const [target, setTarget] = useState("all"); // 'all', 'class', 'teacher', 'staff'
  const [selectedClass, setSelectedClass] = useState(null);
  const [sendToPublic, setSendToPublic] = useState(false); // Toggle for public/non-logged-in users

  // Cron state & modal
  const [forceRunCron, setForceRunCron] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [logFilter, setLogFilter] = useState("all");

  // Fetch Classes
  const { data: classes = [] } = useApiQuery(
    ["adminClasses"],
    `${apiConfig.baseUrl}/classes`,
    { enabled: target === "class" }
  );

  // Fetch Cron Logs
  const {
    data: cronLogsData,
    isLoading: isLogsLoading,
    refetch: refetchLogs,
  } = useApiQuery(
    ["cronLogs", logFilter],
    `${apiConfig.baseUrl}/notifications/cron/logs${
      logFilter !== "all" ? `?jobName=${logFilter}` : ""
    }`,
    { enabled: showLogsModal }
  );

  // Send Notification Mutation
  const sendNotificationMutation = useApiMutation({
    mutationFn: createApiMutationFn(
      `${apiConfig.baseUrl}/notifications/send`,
      "POST"
    ),
    onSuccess: () => {
      showToast("Notification sent successfully", "success");
      router.back();
    },
    onError: (error) =>
      showToast(error.message || "Failed to send notification", "error"),
  });

  // Manual Trigger Cron Mutation
  const triggerCronMutation = useApiMutation({
    mutationFn: createApiMutationFn(
      `${apiConfig.baseUrl}/notifications/trigger-cron`,
      "POST"
    ),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["cronLogs"] });

      const b = data?.result?.birthdays;
      const ev = data?.result?.events;
      const ex = data?.result?.examReminders;

      let bText = "No birthdays today";
      if (b?.sent) {
        bText = `Sent for ${b.userCount} student(s) (${b.names?.join(", ") || ""})`;
      } else if (b?.skipped) {
        bText = `Skipped: ${b.reason || "Already sent today"}`;
      } else if (b?.reason) {
        bText = b.reason;
      }

      let evText = "No events today";
      if (ev?.sent) {
        evText = `Notified for ${ev.sentCount} event(s)`;
      } else if (ev?.reason) {
        evText = ev.reason;
      }

      let exText = "No exams today";
      if (ex?.sent) {
        exText = `Notified for ${ex.sentCount} exam(s)`;
      } else if (ex?.reason) {
        exText = ex.reason;
      }

      Alert.alert(
        "Daily Cron Execution Results",
        `🎂 Birthdays:\n${bText}\n\n📅 Events:\n${evText}\n\n📝 Exams:\n${exText}`,
        [
          { text: "Done" },
          {
            text: "View Audit Logs",
            onPress: () => setShowLogsModal(true),
          },
        ]
      );
    },
    onError: (error) =>
      showToast(error.message || "Failed to trigger daily reminders", "error"),
  });

  const handleSend = () => {
    if (!title.trim() || !message.trim()) {
      showToast("Please enter title and message", "error");
      return;
    }

    if (target === "class" && !selectedClass) {
      showToast("Please select a class", "error");
      return;
    }

    sendNotificationMutation.mutate({
      title,
      message,
      type,
      target,
      targetId: target === "class" ? selectedClass : null,
      sendToPublic,
    });
  };

  const notificationTypes = [
    "General",
    "Homework",
    "Exam",
    "Fee",
    "Emergency",
    "Event",
  ];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={{ flex: 1 }}>
        <View
          style={{
            paddingHorizontal: SPACING.lg || 16,
            paddingTop: SPACING.md || 12,
          }}
        >
          <Header
            title="Broadcast Announcement"
            subtitle="Send alerts to users"
            variant="modal"
          />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: SPACING.lg || 16,
            paddingBottom: SPACING.xxxl || 80,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <View style={{ marginBottom: SPACING.lg || 16 }}>
            <TextInput
              label="Title"
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. School Closed Tomorrow"
              variant="outlined"
            />
          </View>

          {/* Message */}
          <View style={{ marginBottom: SPACING.xl || 20 }}>
            <TextInput
              label="Message"
              value={message}
              onChangeText={setMessage}
              placeholder="Type your message here..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              inputStyle={{ height: 90, paddingTop: 10 }}
              style={{ height: 100, alignItems: "flex-start" }}
              variant="outlined"
            />
          </View>

          {/* Type Selection */}
          <View style={{ marginBottom: SPACING.xl || 20 }}>
            <Text
              style={{
                color: colors.onSurfaceVariant,
                marginBottom: SPACING.xs || 8,
                fontFamily: FONTS.medium,
                fontSize: FONT_SIZES.sm,
              }}
            >
              Category
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              <View style={{ flexDirection: "row", gap: SPACING.sm || 8 }}>
                {notificationTypes.map((t) => {
                  const isSelected = type === t;
                  return (
                    <Pressable
                      key={t}
                      onPress={() => setType(t)}
                      style={{
                        paddingHorizontal: SPACING.lg || 16,
                        paddingVertical: SPACING.xs || 8,
                        backgroundColor: isSelected
                          ? colors.primary
                          : colors.surfaceContainerHighest,
                        borderRadius: RADIUS.full || 20,
                      }}
                    >
                      <Text
                        style={{
                          color: isSelected ? colors.onPrimary : colors.onSurfaceVariant,
                          fontFamily: isSelected ? FONTS.bold : FONTS.medium,
                          fontSize: FONT_SIZES.xs,
                        }}
                      >
                        {t}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          {/* Send to Public Users Toggle */}
          <Card
            variant="filled"
            noMargin
            style={{ marginBottom: SPACING.xl || 20 }}
            contentStyle={{
              padding: SPACING.lg || 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flex: 1, marginRight: SPACING.md || 12 }}>
              <Text
                style={{
                  color: colors.onSurface,
                  fontFamily: FONTS.semiBold,
                  fontSize: FONT_SIZES.md,
                  marginBottom: 2,
                }}
              >
                Send to Public Users
              </Text>
              <Text
                style={{
                  color: colors.onSurfaceVariant,
                  fontSize: FONT_SIZES.xs,
                  fontFamily: FONTS.regular,
                }}
              >
                {sendToPublic
                  ? "Will reach both logged-in and non-logged-in users"
                  : "Only logged-in users will receive this notification"}
              </Text>
            </View>
            <Switch
              value={sendToPublic}
              onValueChange={setSendToPublic}
              trackColor={{
                false: colors.outlineVariant,
                true: colors.primaryContainer,
              }}
              thumbColor={sendToPublic ? colors.primary : "#f4f3f4"}
            />
          </Card>

          {/* Target Selection */}
          <View style={{ marginBottom: SPACING.xl || 20 }}>
            <Text
              style={{
                color: colors.onSurfaceVariant,
                marginBottom: SPACING.xs || 8,
                fontFamily: FONTS.medium,
                fontSize: FONT_SIZES.sm,
              }}
            >
              Target Audience
            </Text>
            <View style={{ flexDirection: "row", gap: SPACING.sm || 8, flexWrap: "wrap" }}>
              {[
                { key: "all", label: "Everyone", icon: "public" },
                { key: "class", label: "Specific Class", icon: "class" },
                { key: "teacher", label: "Teachers", icon: "school" },
                { key: "staff", label: "Staff", icon: "badge" },
              ].map((item) => {
                const isSelected = target === item.key;
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => setTarget(item.key)}
                    style={{
                      flex: 1,
                      minWidth: "45%",
                      padding: SPACING.md || 12,
                      backgroundColor: isSelected
                        ? colors.primaryContainer
                        : colors.surfaceContainer,
                      borderWidth: 1.5,
                      borderColor: isSelected
                        ? colors.primary
                        : "transparent",
                      borderRadius: RADIUS.md || 12,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <MaterialIcons
                      name={item.icon}
                      size={ICON_SIZES.md || 22}
                      color={
                        isSelected ? colors.onPrimaryContainer : colors.onSurfaceVariant
                      }
                    />
                    <Text
                      style={{
                        marginTop: SPACING.xs || 6,
                        color:
                          isSelected ? colors.onPrimaryContainer : colors.onSurface,
                        fontFamily: isSelected ? FONTS.bold : FONTS.medium,
                        fontSize: FONT_SIZES.xs,
                      }}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Class Selector (if target is class) */}
          {target === "class" && (
            <View style={{ marginBottom: SPACING.xl || 20 }}>
              <Text
                style={{
                  color: colors.onSurfaceVariant,
                  marginBottom: SPACING.xs || 8,
                  fontFamily: FONTS.medium,
                  fontSize: FONT_SIZES.sm,
                }}
              >
                Select Class
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                nestedScrollEnabled={true}
              >
                <View style={{ flexDirection: "row", gap: SPACING.sm || 8 }}>
                  {classes.map((cls) => {
                    const isSelected = selectedClass === cls._id;
                    return (
                      <Pressable
                        key={cls._id}
                        onPress={() => setSelectedClass(cls._id)}
                        style={{
                          paddingHorizontal: SPACING.lg || 16,
                          paddingVertical: SPACING.sm || 10,
                          backgroundColor: isSelected
                            ? colors.primary
                            : colors.surfaceContainerHighest,
                          borderRadius: RADIUS.md || 12,
                        }}
                      >
                        <Text
                          style={{
                            color: isSelected ? colors.onPrimary : colors.onSurface,
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
          )}

          {/* Send Button */}
          <Button
            variant="filled"
            size="lg"
            fullWidth
            icon="send"
            onPress={handleSend}
            loading={sendNotificationMutation.isPending}
          >
            Send Broadcast
          </Button>

          {/* M3 Scheduled Reminders & Cron Action Card */}
          <Card
            variant="outlined"
            style={{
              marginTop: SPACING.xl || 24,
              marginBottom: SPACING.xxl || 32,
              padding: SPACING.lg || 16,
              borderRadius: RADIUS.xl || 20,
              backgroundColor: colors.surfaceContainerLow,
              borderColor: colors.outlineVariant || colors.border,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: SPACING.md || 12,
                marginBottom: SPACING.sm || 8,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: RADIUS.full || 18,
                  backgroundColor: colors.primaryContainer,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons
                  name="cake"
                  size={20}
                  color={colors.onPrimaryContainer}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: FONTS.semiBold,
                    fontSize: FONT_SIZES.md,
                    color: colors.onSurface,
                  }}
                >
                  Automated Daily Reminders
                </Text>
                <Text
                  style={{
                    fontFamily: FONTS.regular,
                    fontSize: FONT_SIZES.xs,
                    color: colors.onSurfaceVariant,
                    marginTop: 2,
                  }}
                >
                  Trigger scheduled birthday greetings, event alerts, and exam reminders on demand.
                </Text>
              </View>
            </View>

            {/* Force Run Toggle */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: SPACING.xs || 4,
                marginBottom: SPACING.xs || 4,
                borderTopWidth: 1,
                borderTopColor: colors.outlineVariant || "rgba(0,0,0,0.05)",
                paddingTop: 8,
              }}
            >
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text
                  style={{
                    fontFamily: FONTS.medium,
                    fontSize: FONT_SIZES.xs,
                    color: colors.onSurface,
                  }}
                >
                  Force Run Mode
                </Text>
                <Text
                  style={{
                    fontFamily: FONTS.regular,
                    fontSize: 11,
                    color: colors.onSurfaceVariant,
                  }}
                >
                  Bypass duplicate checks (for testing)
                </Text>
              </View>
              <Switch
                value={forceRunCron}
                onValueChange={setForceRunCron}
                trackColor={{
                  false: colors.surfaceContainerHighest,
                  true: colors.primaryContainer,
                }}
                thumbColor={forceRunCron ? colors.primary : colors.outline}
              />
            </View>

            <View style={{ gap: 8, marginTop: SPACING.xs || 4 }}>
              <Button
                variant="tonal"
                size="md"
                fullWidth
                icon="sync"
                onPress={() =>
                  triggerCronMutation.mutate({
                    job: "all-daily",
                    force: forceRunCron,
                  })
                }
                loading={triggerCronMutation.isPending}
              >
                Run Daily Birthdays & Reminders Now
              </Button>

              <Button
                variant="outlined"
                size="md"
                fullWidth
                icon="receipt-long"
                onPress={() => setShowLogsModal(true)}
              >
                View Cron Execution Logs
              </Button>
            </View>
          </Card>
        </ScrollView>
      </View>

      {/* M3 Cron Logs Audit Modal */}
      <Modal
        visible={showLogsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogsModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.55)",
            justifyContent: "center",
            alignItems: "center",
            padding: SPACING.md,
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 520,
              maxHeight: "85%",
              backgroundColor: colors.surfaceContainer || colors.surface,
              borderRadius: RADIUS.xl,
              padding: SPACING.lg,
              borderWidth: 1,
              borderColor: colors.outlineVariant || "transparent",
              ...Platform.select({
                ios: {
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.18,
                  shadowRadius: 16,
                },
                android: { elevation: 12 },
              }),
            }}
          >
            {/* Modal Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: SPACING.sm,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: SPACING.sm,
                }}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: RADIUS.full,
                    backgroundColor: colors.primaryContainer,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MaterialIcons
                    name="receipt-long"
                    size={22}
                    color={colors.onPrimaryContainer}
                  />
                </View>
                <View>
                  <Text
                    style={{
                      fontFamily: FONTS.semiBold,
                      fontSize: FONT_SIZES.lg,
                      color: colors.onSurface,
                    }}
                  >
                    Cron Audit Logs
                  </Text>
                  <Text
                    style={{
                      fontFamily: FONTS.regular,
                      fontSize: FONT_SIZES.xs,
                      color: colors.onSurfaceVariant,
                    }}
                  >
                    Live audit trail of scheduled jobs
                  </Text>
                </View>
              </View>

              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <Pressable
                  onPress={() => refetchLogs()}
                  style={{
                    padding: 8,
                    borderRadius: RADIUS.full,
                    backgroundColor:
                      colors.surfaceContainerHighest || colors.surfaceVariant,
                  }}
                >
                  <MaterialIcons
                    name="refresh"
                    size={20}
                    color={colors.onSurface}
                  />
                </Pressable>
                <Pressable
                  onPress={() => setShowLogsModal(false)}
                  style={{
                    padding: 8,
                    borderRadius: RADIUS.full,
                    backgroundColor:
                      colors.surfaceContainerHighest || colors.surfaceVariant,
                  }}
                >
                  <MaterialIcons
                    name="close"
                    size={20}
                    color={colors.onSurface}
                  />
                </Pressable>
              </View>
            </View>

            {/* Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                gap: 8,
                paddingVertical: SPACING.sm,
              }}
            >
              {[
                { id: "all", label: "All Jobs" },
                { id: "birthday", label: "🎂 Birthdays" },
                { id: "event", label: "📅 Events" },
                { id: "exam", label: "📝 Exams" },
                { id: "all_daily", label: "⚡ All Daily" },
              ].map((chip) => {
                const isActive = logFilter === chip.id;
                return (
                  <Pressable
                    key={chip.id}
                    onPress={() => setLogFilter(chip.id)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: RADIUS.full,
                      backgroundColor: isActive
                        ? colors.primaryContainer
                        : colors.surfaceVariant ||
                          colors.surfaceContainerHigh,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: isActive ? FONTS.semiBold : FONTS.medium,
                        fontSize: FONT_SIZES.xs,
                        color: isActive
                          ? colors.onPrimaryContainer
                          : colors.onSurfaceVariant,
                      }}
                    >
                      {chip.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Logs List */}
            {isLogsLoading ? (
              <View
                style={{
                  padding: SPACING.xl,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ActivityIndicator size="large" color={colors.primary} />
                <Text
                  style={{
                    fontFamily: FONTS.regular,
                    fontSize: FONT_SIZES.sm,
                    color: colors.onSurfaceVariant,
                    marginTop: SPACING.sm,
                  }}
                >
                  Loading audit logs...
                </Text>
              </View>
            ) : !cronLogsData?.logs || cronLogsData.logs.length === 0 ? (
              <View
                style={{
                  padding: SPACING.xl,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons
                  name="info-outline"
                  size={36}
                  color={colors.onSurfaceVariant}
                />
                <Text
                  style={{
                    fontFamily: FONTS.medium,
                    fontSize: FONT_SIZES.sm,
                    color: colors.onSurfaceVariant,
                    marginTop: SPACING.sm,
                  }}
                >
                  No logs recorded yet
                </Text>
                <Text
                  style={{
                    fontFamily: FONTS.regular,
                    fontSize: FONT_SIZES.xs,
                    color: colors.onSurfaceVariant,
                    marginTop: 4,
                    textAlign: "center",
                  }}
                >
                  Trigger a cron job above to see execution records here.
                </Text>
              </View>
            ) : (
              <ScrollView
                style={{ marginTop: SPACING.xs, flexGrow: 0 }}
                contentContainerStyle={{ gap: 10, paddingBottom: SPACING.sm }}
                showsVerticalScrollIndicator={true}
              >
                {cronLogsData.logs.map((item) => {
                  const isSuccess = item.status === "success";
                  const isSkipped = item.status === "skipped";
                  const statusBg = isSuccess
                    ? colors.primaryContainer
                    : isSkipped
                    ? colors.surfaceContainerHighest || colors.surfaceVariant
                    : colors.errorContainer;
                  const statusColor = isSuccess
                    ? colors.onPrimaryContainer
                    : isSkipped
                    ? colors.onSurfaceVariant
                    : colors.onErrorContainer;

                  const jobIcon =
                    item.jobName === "birthday"
                      ? "🎂"
                      : item.jobName === "event" || item.jobName === "event_eve"
                      ? "📅"
                      : item.jobName === "exam"
                      ? "📝"
                      : item.jobName === "monthly_fee"
                      ? "💰"
                      : "⚡";

                  const formattedDate = item.createdAt
                    ? new Date(item.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                        timeZone: "Asia/Kolkata",
                      })
                    : "";

                  return (
                    <View
                      key={item._id}
                      style={{
                        backgroundColor:
                          colors.surfaceContainerLow || colors.surface,
                        borderRadius: RADIUS.md,
                        padding: 12,
                        borderWidth: 1,
                        borderColor: colors.outlineVariant || "transparent",
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 6,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <Text style={{ fontSize: 16 }}>{jobIcon}</Text>
                          <Text
                            style={{
                              fontFamily: FONTS.semiBold,
                              fontSize: FONT_SIZES.sm,
                              color: colors.onSurface,
                              textTransform: "capitalize",
                            }}
                          >
                            {item.jobName.replace(/_/g, " ")}
                          </Text>
                        </View>

                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <View
                            style={{
                              backgroundColor: colors.surfaceContainerHighest,
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: RADIUS.full,
                            }}
                          >
                            <Text
                              style={{
                                fontFamily: FONTS.medium,
                                fontSize: 10,
                                color: colors.onSurfaceVariant,
                                textTransform: "capitalize",
                              }}
                            >
                              {item.trigger}
                            </Text>
                          </View>

                          <View
                            style={{
                              backgroundColor: statusBg,
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: RADIUS.full,
                            }}
                          >
                            <Text
                              style={{
                                fontFamily: FONTS.semiBold,
                                fontSize: 10,
                                color: statusColor,
                                textTransform: "uppercase",
                              }}
                            >
                              {item.status}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <Text
                        style={{
                          fontFamily: FONTS.regular,
                          fontSize: FONT_SIZES.xs,
                          color: colors.onSurface,
                          lineHeight: 18,
                        }}
                      >
                        {item.message}
                      </Text>

                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginTop: 8,
                          borderTopWidth: 1,
                          borderTopColor:
                            colors.outlineVariant || "rgba(0,0,0,0.05)",
                          paddingTop: 6,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: FONTS.regular,
                            fontSize: 10,
                            color: colors.onSurfaceVariant,
                          }}
                        >
                          🕒 {formattedDate}
                        </Text>
                        {item.durationMs > 0 && (
                          <Text
                            style={{
                              fontFamily: FONTS.medium,
                              fontSize: 10,
                              color: colors.onSurfaceVariant,
                            }}
                          >
                            ⚡ {item.durationMs}ms
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

