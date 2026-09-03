import React from "react";
import { View, Text, Pressable, Alert } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { FONTS, FONT_SIZES, LETTER_SPACINGS } from "../theme";
import UserAvatar from "./ui/UserAvatar";
import { formatUserName } from "../utils/userFormatters";

const getTimeAgo = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffInMins = Math.floor((now - date) / 60000);
  if (diffInMins < 1) return "Just now";
  if (diffInMins < 60) return `${diffInMins}m ago`;
  const diffInHours = Math.floor(diffInMins / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
};

const UserCard = ({
  userItem,
  getRoleColor,
  getRoleDisplay,
  colors,
  onEdit,
  onDelete,
  onPress,
}) => {
  const displayName = formatUserName(userItem.name);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.surface || colors.cardBackground,
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
        borderWidth: 0.5,
        borderColor: colors.outlineVariant || colors.border,
        opacity: pressed ? 0.9 : 1,
        elevation: 0,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        {/* User Profile Avatar */}
        <UserAvatar
          photoUrl={userItem.profilePhoto}
          name={displayName}
          role={userItem.role}
          size={44}
          showBorder
          borderColor={getRoleColor(userItem.role) + "25"}
        />

        {/* User Details */}
        <View style={{ flex: 1 }}>
          {/* Row 1: Name and Action buttons */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: FONT_SIZES.md,
                fontFamily: FONTS.semiBold,
                color: colors.textPrimary,
                flex: 1,
                paddingRight: 8,
              }}
              numberOfLines={1}
            >
              {displayName}
            </Text>

            {/* Actions */}
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                hitSlop={8}
                style={({ pressed }) => ({
                  padding: 4,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <MaterialIcons name="edit" size={20} color={colors.primary} />
              </Pressable>

              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  Alert.alert(
                    "Delete User",
                    `Are you sure you want to delete ${userItem.name}?`,
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete",
                        onPress: () => onDelete(),
                        style: "destructive",
                      },
                    ]
                  );
                }}
                hitSlop={8}
                style={({ pressed }) => ({
                  padding: 4,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <MaterialIcons
                  name="delete-outline"
                  size={20}
                  color={colors.error}
                />
              </Pressable>
            </View>
          </View>

          {/* Row 2: Role Badge & Class Badge */}
          <View
            style={{
              flexDirection: "row",
              gap: 6,
              alignItems: "center",
              marginTop: 6,
              flexWrap: "wrap",
            }}
          >
            {/* Role Badge */}
            <View
              style={{
                backgroundColor: getRoleColor(userItem.role) + "10",
                paddingHorizontal: 7,
                paddingVertical: 2,
                borderRadius: 6,
                borderWidth: 0,
              }}
            >
              <Text
                style={{
                  fontSize: FONT_SIZES.micro,
                  fontFamily: FONTS.semiBold,
                  color: getRoleColor(userItem.role),
                  letterSpacing: LETTER_SPACINGS.xs,
                }}
              >
                {getRoleDisplay(userItem).toUpperCase()}
              </Text>
            </View>

            {/* Class Badge (Students Only) */}
            {userItem.role === "student" && userItem.currentClass?.name && (
              <View
                style={{
                  backgroundColor: colors.primary + "10",
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                  borderRadius: 6,
                  borderWidth: 0,
                }}
              >
                <Text
                  style={{
                    fontSize: FONT_SIZES.micro,
                    fontFamily: FONTS.semiBold,
                    color: colors.primary,
                    letterSpacing: LETTER_SPACINGS.xs,
                  }}
                >
                  {userItem.currentClass.name.toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          {/* Row 3: Phone & Last Active */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 8,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
              {userItem.phone && (
                <>
                  <MaterialIcons
                    name="phone"
                    size={13}
                    color={colors.textSecondary}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={{
                      fontSize: FONT_SIZES.sm,
                      color: colors.textSecondary,
                      fontFamily: FONTS.medium,
                    }}
                  >
                    {userItem.phone}
                  </Text>
                </>
              )}
            </View>
            {userItem.lastActiveAt && (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: colors.success,
                    marginRight: 6,
                  }}
                />
                <Text
                  style={{
                    fontSize: FONT_SIZES.xs,
                    color: colors.textSecondary,
                    fontFamily: FONTS.medium,
                  }}
                >
                  Active {getTimeAgo(userItem.lastActiveAt)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
};

export default React.memo(UserCard, (prevProps, nextProps) => {
  return (
    prevProps.userItem._id === nextProps.userItem._id &&
    prevProps.userItem.role === nextProps.userItem.role &&
    prevProps.userItem.name === nextProps.userItem.name &&
    prevProps.userItem.phone === nextProps.userItem.phone &&
    prevProps.userItem.profilePhoto === nextProps.userItem.profilePhoto &&
    prevProps.userItem.lastActiveAt === nextProps.userItem.lastActiveAt
  );
});
