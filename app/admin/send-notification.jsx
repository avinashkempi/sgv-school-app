import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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
  const { colors } = useTheme();
  const { showToast } = useToast();

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("General");
  const [target, setTarget] = useState("all"); // 'all', 'class', 'teacher', 'staff'
  const [selectedClass, setSelectedClass] = useState(null);
  const [sendToPublic, setSendToPublic] = useState(false); // Toggle for public/non-logged-in users

  // Fetch Classes
  const { data: classes = [] } = useApiQuery(
    ["adminClasses"],
    `${apiConfig.baseUrl}/classes`,
    { enabled: target === "class" }
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
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
