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
import { Image } from "expo-image";
import { useTheme, FONTS, FONT_SIZES, LINE_HEIGHTS, LETTER_SPACINGS } from "../../theme";
import { SCHOOL } from "../../constants/basic-info";
import { useLabel } from "../../context/LabelsContext";
import Button from "../Button";

export default function SchoolInfoModal({ visible = false, onClose }) {
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
                  localStyles.logoBadge,
                  {
                    backgroundColor: colors.surfaceContainerLowest || "#ffffff",
                    borderColor: colors.outlineVariant,
                  },
                ]}
              >
                <Image
                  source={require("../../assets/images/icon.png")}
                  style={localStyles.logoImage}
                  contentFit="contain"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[localStyles.modalTitle, { color: colors.onSurface }]}
                  numberOfLines={1}
                >
                  About SGV School
                </Text>
                <Text
                  style={[
                    localStyles.modalSubtitle,
                    { color: colors.onSurfaceVariant },
                  ]}
                  numberOfLines={1}
                >
                  Shri Guru Vidya English Medium
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

          {/* Scrollable Content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={localStyles.scrollContent}
          >
            {/* Mission Card */}
            <View
              style={[
                localStyles.highlightCard,
                {
                  backgroundColor: colors.primaryContainer + "60",
                  borderColor: colors.primary + "30",
                },
              ]}
            >
              <View style={localStyles.badgeRow}>
                <MaterialIcons
                  name="auto-awesome"
                  size={18}
                  color={colors.primary}
                />
                <Text
                  style={[
                    localStyles.highlightBadgeTitle,
                    { color: colors.primary },
                  ]}
                >
                  OUR MISSION
                </Text>
              </View>
              <Text
                style={[
                  localStyles.highlightText,
                  { color: colors.onSurface },
                ]}
              >
                {SCHOOL.mission}
              </Text>
            </View>

            {/* About Narrative */}
            <View style={localStyles.sectionBlock}>
              <Text
                style={[
                  localStyles.sectionHeading,
                  { color: colors.onSurface },
                ]}
              >
                Overview & Heritage
              </Text>
              <Text
                style={[
                  localStyles.bodyParagraph,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                {SCHOOL.about}
              </Text>
            </View>

            {/* Branches */}
            <View style={localStyles.sectionBlock}>
              <Text
                style={[
                  localStyles.sectionHeading,
                  { color: colors.onSurface },
                ]}
              >
                Campus Branches
              </Text>

              {/* Main Campus: Mangasuli */}
              <View
                style={[
                  localStyles.branchTile,
                  {
                    backgroundColor: colors.surfaceContainer,
                    borderColor: colors.outlineVariant,
                  },
                ]}
              >
                <View
                  style={[
                    localStyles.branchIconWrap,
                    { backgroundColor: colors.primary + "18" },
                  ]}
                >
                  <MaterialIcons name="school" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      localStyles.branchName,
                      { color: colors.onSurface },
                    ]}
                  >
                    Mangasuli Campus (Main)
                  </Text>
                  <Text
                    style={[
                      localStyles.branchDesc,
                      { color: colors.onSurfaceVariant },
                    ]}
                  >
                    Renuka Nagar, Mangasuli • Kindergarten to 10th Standard
                  </Text>
                </View>
              </View>

              {/* Branch Campus: Ugar Khurd */}
              <View
                style={[
                  localStyles.branchTile,
                  {
                    backgroundColor: colors.surfaceContainer,
                    borderColor: colors.outlineVariant,
                    marginTop: 8,
                  },
                ]}
              >
                <View
                  style={[
                    localStyles.branchIconWrap,
                    { backgroundColor: colors.tertiary + "18" },
                  ]}
                >
                  <MaterialIcons
                    name="child-care"
                    size={20}
                    color={colors.tertiary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      localStyles.branchName,
                      { color: colors.onSurface },
                    ]}
                  >
                    Ugar Khurd Campus
                  </Text>
                  <Text
                    style={[
                      localStyles.branchDesc,
                      { color: colors.onSurfaceVariant },
                    ]}
                  >
                    Meenatai Nagar, Ugar Khurd • Kindergarten Wing
                  </Text>
                </View>
              </View>
            </View>

            {/* Contact Details */}
            <View style={localStyles.sectionBlock}>
              <Text
                style={[
                  localStyles.sectionHeading,
                  { color: colors.onSurface },
                ]}
              >
                Administration & Contact
              </Text>
              <View
                style={[
                  localStyles.infoRow,
                  { borderColor: colors.outlineVariant },
                ]}
              >
                <MaterialIcons
                  name="place"
                  size={18}
                  color={colors.primary}
                  style={{ marginRight: 10 }}
                />
                <Text
                  style={[
                    localStyles.infoText,
                    { color: colors.onSurfaceVariant },
                  ]}
                >
                  {SCHOOL.address}
                </Text>
              </View>
              <View
                style={[
                  localStyles.infoRow,
                  { borderColor: colors.outlineVariant },
                ]}
              >
                <MaterialIcons
                  name="phone"
                  size={18}
                  color={colors.primary}
                  style={{ marginRight: 10 }}
                />
                <Text
                  style={[
                    localStyles.infoText,
                    { color: colors.onSurfaceVariant },
                  ]}
                >
                  {SCHOOL.phone}
                </Text>
              </View>
              <View
                style={[
                  localStyles.infoRow,
                  { borderColor: colors.outlineVariant },
                ]}
              >
                <MaterialIcons
                  name="email"
                  size={18}
                  color={colors.primary}
                  style={{ marginRight: 10 }}
                />
                <Text
                  style={[
                    localStyles.infoText,
                    { color: colors.onSurfaceVariant },
                  ]}
                >
                  {SCHOOL.email}
                </Text>
              </View>
            </View>
          </ScrollView>

          <Button
            variant="filled"
            onPress={onClose}
            style={{ marginTop: 12 }}
          >
            {t("common.close", "Close")}
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
    marginBottom: 16,
  },
  titleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
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
  highlightCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  highlightBadgeTitle: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
    letterSpacing: LETTER_SPACINGS.xs,
  },
  highlightText: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.medium,
    lineHeight: LINE_HEIGHTS.md,
  },
  sectionBlock: {
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: LETTER_SPACINGS.md,
  },
  bodyParagraph: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.regular,
    lineHeight: LINE_HEIGHTS.md,
  },
  branchTile: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  branchIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  branchName: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
  },
  branchDesc: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    marginTop: 2,
    lineHeight: LINE_HEIGHTS.xs,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    flex: 1,
    lineHeight: LINE_HEIGHTS.sm,
  },
});
