import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "../context/AuthContext";
import { useTheme, FONTS, FONT_SIZES, SPACING, RADIUS } from "../theme";

const ROLES = [
  { id: "student", label: "Student", desc: "Harshika Patil • Class 3A", icon: "school" },
  { id: "teacher", label: "Teacher", desc: "Mrs. Savita Patil • Kannada & Math", icon: "person" },
  { id: "admin", label: "School Admin", desc: "Mr. Rajesh Biradar • Vice Principal", icon: "admin-panel-settings" },
];

export default function DemoBanner() {
  const router = useRouter();
  const { user, logout, switchDemoPersona } = useAuth();
  const { colors, mode } = useTheme();
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const isDark = mode === "dark";

  const handleExit = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    logout(router, "Exited Demo Mode");
  };

  const handleSelectRole = async (roleId) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setShowSwitchModal(false);
    if (switchDemoPersona) {
      await switchDemoPersona(roleId);
      router.replace("/");
    }
  };

  const userRole = (user?.role || "student").toLowerCase();
  const roleLabel = userRole === "admin" ? "ADMIN" : userRole.toUpperCase();

  const getRoleIcon = () => {
    if (userRole === "admin") return "admin-panel-settings";
    if (userRole === "teacher" || userRole === "staff") return "person";
    return "school";
  };

  return (
    <>
      <View
        style={[
          styles.container,
          {
            backgroundColor: isDark ? colors.surfaceContainer : colors.primaryContainer,
            borderBottomColor: colors.outlineVariant,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.contentRow}
          onPress={() => setShowSwitchModal(true)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Demo Mode active as ${roleLabel}. Tap to switch persona.`}
        >
          <View
            style={[
              styles.badge,
              {
                backgroundColor: isDark ? colors.surfaceContainerHigh : colors.primary,
              },
            ]}
          >
            <MaterialIcons
              name={getRoleIcon()}
              size={13}
              color={isDark ? colors.primary : colors.onPrimary}
            />
            <Text
              style={[
                styles.badgeText,
                { color: isDark ? colors.primary : colors.onPrimary },
              ]}
            >
              {roleLabel} DEMO
            </Text>
          </View>
          <Text
            style={[
              styles.text,
              { color: isDark ? colors.textPrimary : colors.onPrimaryContainer },
            ]}
            numberOfLines={1}
          >
            {user?.name || "Demo User"}
          </Text>
          <MaterialIcons
            name="swap-horiz"
            size={16}
            color={isDark ? colors.textSecondary : colors.onPrimaryContainer}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.exitButton,
            {
              backgroundColor: isDark ? colors.surfaceContainerHigh : "rgba(79, 70, 229, 0.12)",
            },
          ]}
          onPress={handleExit}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Exit Demo Mode"
        >
          <Text
            style={[
              styles.exitText,
              { color: isDark ? colors.textPrimary : colors.primary },
            ]}
          >
            Exit
          </Text>
          <MaterialIcons
            name="logout"
            size={13}
            color={isDark ? colors.textPrimary : colors.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Persona Switch Modal */}
      <Modal
        visible={showSwitchModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSwitchModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowSwitchModal(false)}
        >
          <Pressable
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.outlineVariant,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  Switch Demo Persona
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  Experience the app as any user role
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowSwitchModal(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Close persona switcher"
              >
                <MaterialIcons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.roleList}>
              {ROLES.map((item) => {
                const isSelected =
                  userRole === item.id ||
                  (item.id === "super admin" && userRole.includes("super"));

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.roleItem,
                      {
                        backgroundColor: isSelected
                          ? isDark
                            ? colors.surfaceContainerHigh
                            : colors.primaryContainer
                          : isDark
                          ? colors.surfaceContainer
                          : colors.surfaceContainerLowest || "#FAFAFA",
                        borderColor: isSelected ? colors.primary : colors.outlineVariant,
                      },
                    ]}
                    onPress={() => handleSelectRole(item.id)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.roleIconBox,
                        {
                          backgroundColor: isSelected
                            ? colors.primary
                            : isDark
                            ? colors.surfaceContainerHigh
                            : colors.surfaceVariant,
                        },
                      ]}
                    >
                      <MaterialIcons
                        name={item.icon}
                        size={20}
                        color={isSelected ? colors.onPrimary : colors.textSecondary}
                      />
                    </View>
                    <View style={styles.roleInfo}>
                      <Text
                        style={[
                          styles.roleLabel,
                          {
                            color: isSelected ? colors.primary : colors.textPrimary,
                            fontFamily: isSelected ? FONTS.bold : FONTS.semiBold,
                          },
                        ]}
                      >
                        {item.label}
                      </Text>
                      <Text
                        style={[styles.roleDesc, { color: colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {item.desc}
                      </Text>
                    </View>
                    {isSelected && (
                      <MaterialIcons
                        name="check-circle"
                        size={20}
                        color={colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    zIndex: 999,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
    gap: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: RADIUS.full || 9999,
    gap: 4,
  },
  badgeText: {
    fontSize: FONT_SIZES.micro || 11,
    fontFamily: FONTS.bold,
    letterSpacing: 0.3,
  },
  text: {
    fontSize: FONT_SIZES.xs || 12,
    fontFamily: FONTS.medium,
    flexShrink: 1,
  },
  exitButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm || 8,
    gap: 4,
  },
  exitText: {
    fontSize: FONT_SIZES.xs || 12,
    fontFamily: FONTS.semiBold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg || 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 400,
    borderRadius: RADIUS.lg || 16,
    borderWidth: 1,
    padding: SPACING.xl || 20,
    gap: SPACING.lg || 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg || 18,
    fontFamily: FONTS.bold,
  },
  modalSubtitle: {
    fontSize: FONT_SIZES.sm || 13,
    fontFamily: FONTS.regular,
    marginTop: 2,
  },
  roleList: {
    gap: SPACING.sm || 8,
  },
  roleItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: RADIUS.md || 12,
    borderWidth: 1.5,
    gap: 12,
  },
  roleIconBox: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm || 8,
    alignItems: "center",
    justifyContent: "center",
  },
  roleInfo: {
    flex: 1,
  },
  roleLabel: {
    fontSize: FONT_SIZES.sm || 14,
  },
  roleDesc: {
    fontSize: FONT_SIZES.xs || 12,
    marginTop: 1,
  },
});


