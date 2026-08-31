import React from "react";
import { View, Text, ScrollView, Pressable, Modal } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useTheme, FONTS, FONT_SIZES, LETTER_SPACINGS } from "../theme";
import UserAvatar from "./ui/UserAvatar";
import {
  formatUserName,
  formatUserDesignationOrRole,
  toTitleCase,
} from "../utils/userFormatters";
import { useApiQuery } from "../hooks/useApi";
import apiConfig from "../config/apiConfig";
import { CACHE_TIERS } from "../utils/cacheConfig";
import { resolveMediaThumbnail, isVideoUrl } from "../utils/cloudinaryUpload";

export default function UserDetailModal({ visible, onClose, user }) {
  const { colors } = useTheme();

  if (!user) return null;

  const getRoleColor = (role) => {
    switch (role) {
      case "admin":
      case "super admin":
        return colors.error;
      case "teacher":
        return colors.primary;
      case "staff":
        return colors.success;
      case "support_staff":
        return "#795548";
      default:
        return colors.primary;
    }
  };

  const getRoleDisplay = (u) => {
    return formatUserDesignationOrRole(u);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: colors.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            height: "90%",
            paddingBottom: 40,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              padding: 24,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Text
              style={{
                fontSize: FONT_SIZES.lg,
                fontFamily: FONTS.bold,
                color: colors.textPrimary,
              }}
            >
              User Details
            </Text>
            <Pressable onPress={onClose}>
              <MaterialIcons
                name="close"
                size={24}
                color={colors.textSecondary}
              />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 24 }}>
            {/* Header Profile Section */}
            <View style={{ alignItems: "center", marginBottom: 24 }}>
              <UserAvatar
                photoUrl={user.profilePhoto}
                name={formatUserName(user.name)}
                role={user.role}
                size={80}
                showBorder
                style={{ marginBottom: 12 }}
              />
              <Text
                style={{
                  fontSize: FONT_SIZES.lg,
                  fontFamily: FONTS.bold,
                  color: colors.textPrimary,
                }}
              >
                {formatUserName(user.name)}
              </Text>
              <View
                style={{
                  backgroundColor: getRoleColor(user.role) + "20",
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                  borderRadius: 100,
                  marginTop: 4,
                }}
              >
                <Text
                  style={{
                    fontSize: FONT_SIZES.micro,
                    fontFamily: FONTS.bold,
                    color: getRoleColor(user.role),
                  }}
                >
                  {getRoleDisplay(user)}
                </Text>
              </View>
            </View>

            {/* Contact Information */}
            <DetailSection title="CONTACT INFORMATION">
              <DetailRow
                icon="phone"
                label="Primary Phone"
                value={user.phone}
              />
              {user.phone2 && (
                <DetailRow
                  icon="phone-android"
                  label="Secondary Phone"
                  value={user.phone2}
                />
              )}
              {user.email && (
                <DetailRow
                  icon="email"
                  label="Email Address"
                  value={user.email}
                />
              )}
              {user.address && (
                <DetailRow
                  icon="location-on"
                  label="Address"
                  value={user.address}
                />
              )}
            </DetailSection>

            {/* Account Activity */}
            {user.lastActiveAt && (
              <DetailSection title="ACCOUNT ACTIVITY">
                <DetailRow
                  icon="access-time"
                  label="Last Active"
                  value={new Date(user.lastActiveAt).toLocaleString("en-GB", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                />
              </DetailSection>
            )}

            {/* Role Specific Details - Student */}
            {(user.role === "student" || (!user.role && !user.designation && !user.joiningDate)) && (
              <>
                <DetailSection title="ACADEMIC & IDENTITY">
                  <View style={{ flexDirection: "row", gap: 16 }}>
                    <DetailRow
                      label="REG NO"
                      value={user.regNo || "N/A"}
                      style={{ flex: 1 }}
                    />
                    <DetailRow
                      label="SATS NO"
                      value={user.satsNumber || "N/A"}
                      style={{ flex: 1 }}
                    />
                  </View>
                  <View style={{ flexDirection: "row", gap: 16 }}>
                    <DetailRow
                      label="PEN NO"
                      value={user.penNumber || "N/A"}
                      style={{ flex: 1 }}
                    />
                    <DetailRow
                      label="APAAR ID"
                      value={user.apaarId || "N/A"}
                      style={{ flex: 1 }}
                    />
                  </View>
                  <DetailRow
                    label="Class"
                    value={user.currentClass?.name || "N/A"}
                  />
                  <DetailRow
                    label="Academic Year"
                    value={user.academicYear?.name || "N/A"}
                  />
                </DetailSection>

                <DetailSection title="PERSONAL DETAILS">
                  <View style={{ flexDirection: "row", gap: 16 }}>
                    <DetailRow
                      label="Gender"
                      value={user.gender || "N/A"}
                      style={{ flex: 1 }}
                    />
                    <DetailRow
                      label="Blood Group"
                      value={user.bloodGroup || "N/A"}
                      style={{ flex: 1 }}
                    />
                  </View>
                  <DetailRow
                    label="Date of Birth"
                    value={
                      user.dateOfBirth
                        ? new Date(user.dateOfBirth).toLocaleDateString()
                        : "N/A"
                    }
                  />
                  <DetailRow
                    label="Guardian Name"
                    value={user.guardianName ? toTitleCase(user.guardianName) : "N/A"}
                  />
                  <DetailRow
                    label="Guardian Phone"
                    value={user.guardianPhone || "N/A"}
                  />
                  <DetailRow
                    label="Status"
                    value={user.isActive !== false ? "Active" : "Inactive"}
                  />
                </DetailSection>
              </>
            )}

            {/* Role Specific Details - Teacher/Staff */}
            {(user.role === "teacher" ||
              user.role === "staff" ||
              user.role === "support_staff" ||
              (Boolean(user.designation) && user.role !== "student")) && (
              <DetailSection title="EMPLOYMENT DETAILS">
                <DetailRow
                  label="Designation"
                  value={user.designation ? toTitleCase(user.designation) : "N/A"}
                />
                <DetailRow
                  label="Joining Date"
                  value={
                    user.joiningDate
                      ? new Date(user.joiningDate).toLocaleDateString()
                      : "N/A"
                  }
                />
              </DetailSection>
            )}

            {user.remarks && (
              <DetailSection title="REMARKS">
                <Text
                  style={{
                    fontFamily: FONTS.regular,
                    fontSize: FONT_SIZES.sm,
                    color: colors.textPrimary,
                  }}
                >
                  {user.remarks}
                </Text>
              </DetailSection>
            )}

            {/* User's Vibes Portfolio */}
            <UserVibesSection userId={user._id || user.id} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const DetailSection = ({ title, children }) => {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: 24 }}>
      <Text
        style={{
          fontSize: FONT_SIZES.sm,
          fontFamily: FONTS.bold,
          color: colors.textSecondary,
          marginBottom: 12,
          letterSpacing: LETTER_SPACINGS.micro,
        }}
      >
        {title}
      </Text>
      <View
        style={{
          backgroundColor: colors.cardBackground,
          padding: 16,
          borderRadius: 16,
          gap: 12,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        {children}
      </View>
    </View>
  );
};

const DetailRow = ({ icon, label, value, style }) => {
  const { colors } = useTheme();
  return (
    <View style={[{ marginBottom: 4 }, style]}>
      <Text
        style={{
          fontSize: FONT_SIZES.xs,
          color: colors.textSecondary,
          fontFamily: FONTS.medium,
          marginBottom: 2,
        }}
      >
        {label}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {icon && (
          <MaterialIcons
            name={icon}
            size={16}
            color={colors.primary}
            style={{ marginRight: 8, flexShrink: 0 }}
          />
        )}
        <Text
          style={{
            fontSize: FONT_SIZES.md,
            fontFamily: FONTS.medium,
            color: colors.textPrimary,
            flex: 1,
            flexShrink: 1,
          }}
        >
          {value || "N/A"}
        </Text>
      </View>
    </View>
  );
};

const UserVibesSection = ({ userId }) => {
  const { colors } = useTheme();
  const isValidUserId = Boolean(userId && userId !== "undefined");
  const { data: vibesData } = useApiQuery(
    ["userVibes", userId],
    isValidUserId && apiConfig.endpoints.vibes?.userVibes
      ? `${apiConfig.baseUrl}${apiConfig.endpoints.vibes.userVibes(userId)}`
      : null,
    {
      ...CACHE_TIERS.MODERATE,
      enabled: isValidUserId,
      select: (data) => data?.data || [],
    }
  );

  const vibes = vibesData || [];
  if (vibes.length === 0) return null;

  return (
    <DetailSection title={`CAMPUS VIBES (${vibes.length})`}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {vibes.slice(0, 6).map((vibe, idx) => {
          const firstMedia = vibe.images?.[0];
          const rawUrl =
            typeof firstMedia === "object"
              ? firstMedia?.url || ""
              : firstMedia || "";
          const optimizedUrl = resolveMediaThumbnail(firstMedia, "grid");
          const isVideo =
            (typeof firstMedia === "object" && firstMedia?.type === "video") ||
            isVideoUrl(rawUrl);

          return (
            <View
              key={vibe._id || idx}
              style={{
                width: "31%",
                aspectRatio: 1,
                borderRadius: 10,
                overflow: "hidden",
                backgroundColor: colors.surfaceContainerHighest || "#eee",
                position: "relative",
              }}
            >
              {optimizedUrl ? (
                <Image
                  source={{ uri: optimizedUrl }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <MaterialIcons
                    name="image"
                    size={20}
                    color={colors.textSecondary}
                  />
                </View>
              )}
              {isVideo && (
                <View
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    backgroundColor: "rgba(0,0,0,0.6)",
                    borderRadius: 10,
                    padding: 2,
                  }}
                >
                  <MaterialIcons name="play-arrow" size={12} color="#fff" />
                </View>
              )}
            </View>
          );
        })}
      </View>
    </DetailSection>
  );
};
