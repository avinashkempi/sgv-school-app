import React from "react";
import { Modal, View, Text, StyleSheet, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme, FONTS, FONT_SIZES, LINE_HEIGHTS } from "../../theme";
import { useLabel } from "../../context/LabelsContext";
import Button from "../Button";

export default function LogoutConfirmModal({
  visible = false,
  onConfirm,
  onCancel,
  isLoading = false,
}) {
  const { colors } = useTheme();
  const { t } = useLabel();

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={localStyles.overlay}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onCancel} />

        <View
          style={[
            localStyles.card,
            {
              backgroundColor: colors.surfaceContainerLow || colors.surface,
              borderColor: colors.outlineVariant,
            },
          ]}
        >
          {/* Warning Icon Badge */}
          <View
            style={[
              localStyles.iconBadge,
              { backgroundColor: colors.errorContainer },
            ]}
          >
            <MaterialIcons
              name="logout"
              size={28}
              color={colors.onErrorContainer}
            />
          </View>

          <Text style={[localStyles.title, { color: colors.onSurface }]}>
            {t("menu.logoutConfirmTitle", "Log Out of SGV School?")}
          </Text>

          <Text
            style={[
              localStyles.message,
              { color: colors.onSurfaceVariant },
            ]}
          >
            {t(
              "menu.logoutConfirmMessage",
              "Are you sure you want to sign out? You will need your credentials to sign back in."
            )}
          </Text>

          <View style={localStyles.buttonCol}>
            <Button
              variant="filled"
              onPress={onConfirm}
              loading={isLoading}
              style={{
                backgroundColor: colors.error,
                marginBottom: 8,
              }}
              textStyle={{ color: colors.onError }}
            >
              {t("common.logOut", "Log Out")}
            </Button>

            <Button
              variant="outlined"
              onPress={onCancel}
              disabled={isLoading}
            >
              {t("common.cancel", "Cancel")}
            </Button>
          </View>
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
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    elevation: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.bold,
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.regular,
    textAlign: "center",
    lineHeight: LINE_HEIGHTS.md,
    marginBottom: 24,
  },
  buttonCol: {
    width: "100%",
  },
});
