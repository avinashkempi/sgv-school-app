import React from "react";
import {
  Modal,
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme, FONTS, FONT_SIZES, LINE_HEIGHTS, LETTER_SPACINGS } from "../../theme";
import { useLabel } from "../../context/LabelsContext";
import Button from "../Button";

export default function PrivacyPolicyModal({ visible = false, onClose }) {
  const { colors } = useTheme();
  const { t } = useLabel();

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={localStyles.overlay}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />

        <View
          style={[
            localStyles.modalCard,
            {
              backgroundColor: colors.surfaceContainerLow || colors.surface,
              borderColor: colors.outlineVariant,
            },
          ]}
        >
          {/* Header */}
          <View style={localStyles.headerRow}>
            <View style={localStyles.titleWrap}>
              <View
                style={[
                  localStyles.iconBadge,
                  { backgroundColor: colors.primaryContainer },
                ]}
              >
                <MaterialIcons
                  name="privacy-tip"
                  size={22}
                  color={colors.onPrimaryContainer}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[localStyles.modalTitle, { color: colors.onSurface }]}
                  numberOfLines={1}
                >
                  {t("menu.privacyPolicy", "Privacy Policy")}
                </Text>
                <Text
                  style={[
                    localStyles.modalSubtitle,
                    { color: colors.onSurfaceVariant },
                  ]}
                  numberOfLines={1}
                >
                  Last updated: April 2025
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                localStyles.closeBtn,
                {
                  backgroundColor: colors.surfaceContainerHighest,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <MaterialIcons
                name="close"
                size={20}
                color={colors.onSurfaceVariant}
              />
            </Pressable>
          </View>

          {/* Policy Text */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={localStyles.scrollContent}
          >
            <Text
              style={[
                localStyles.introText,
                { color: colors.onSurfaceVariant },
              ]}
            >
              We at Shri Guru Vidya English Medium School ("we", "our", or "us")
              are committed to protecting your privacy and ensuring safe digital
              experiences for students, parents, and teachers.
            </Text>

            <View style={localStyles.sectionBlock}>
              <Text
                style={[
                  localStyles.sectionTitle,
                  { color: colors.onSurface },
                ]}
              >
                1. Information We Collect
              </Text>
              <Text
                style={[
                  localStyles.bodyText,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                • <Text style={{ fontFamily: FONTS.bold }}>Personal Information:</Text> Name, contact number, email, student details (grade, fees, attendance).{"\n"}
                • <Text style={{ fontFamily: FONTS.bold }}>Device Information:</Text> Device ID, operating system, and performance diagnostics.{"\n"}
                • <Text style={{ fontFamily: FONTS.bold }}>Academic Data:</Text> Exam marks, reports, timetable schedules, and leave requests.
              </Text>
            </View>

            <View style={localStyles.sectionBlock}>
              <Text
                style={[
                  localStyles.sectionTitle,
                  { color: colors.onSurface },
                ]}
              >
                2. How We Use Your Information
              </Text>
              <Text
                style={[
                  localStyles.bodyText,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                • Provide and maintain SGV School mobile portal features.{"\n"}
                • Communicate academic updates and notices with parents.{"\n"}
                • Send essential school push notifications and alert broadcasts.{"\n"}
                • Track student attendance and progress records securely.
              </Text>
            </View>

            <View style={localStyles.sectionBlock}>
              <Text
                style={[
                  localStyles.sectionTitle,
                  { color: colors.onSurface },
                ]}
              >
                3. Data Security & Storage
              </Text>
              <Text
                style={[
                  localStyles.bodyText,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                Our infrastructure is secured with role-based authentication, encrypted database storage, and restricted staff access layers to safeguard all student records.
              </Text>
            </View>

            <View style={localStyles.sectionBlock}>
              <Text
                style={[
                  localStyles.sectionTitle,
                  { color: colors.onSurface },
                ]}
              >
                4. Your Rights & Inquiries
              </Text>
              <Text
                style={[
                  localStyles.bodyText,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                You can review your student profile details or request corrections at any time by contacting the school administration at{" "}
                <Text style={{ fontFamily: FONTS.bold, color: colors.primary }}>
                  sgvrss@gmail.com
                </Text>{" "}
                or calling{" "}
                <Text style={{ fontFamily: FONTS.bold, color: colors.primary }}>
                  +91 77603 25292
                </Text>.
              </Text>
            </View>
          </ScrollView>

          <Button
            variant="filled"
            onPress={onClose}
            style={{ marginTop: 12 }}
          >
            {t("common.done", "I Understand")}
          </Button>
        </View>
      </View>
    </Modal>
  );
}

const localStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "85%",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    elevation: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  titleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.bold,
  },
  modalSubtitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingBottom: 8,
  },
  introText: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.regular,
    lineHeight: LINE_HEIGHTS.md,
    marginBottom: 14,
  },
  sectionBlock: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
    marginBottom: 6,
  },
  bodyText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    lineHeight: LINE_HEIGHTS.sm,
  },
});
