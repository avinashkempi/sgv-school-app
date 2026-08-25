import React from "react";
import { View, Text, Pressable, Alert } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import UserAvatar from "./ui/UserAvatar";

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
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.cardBackground,
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border,
        opacity: pressed ? 0.95 : 1,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 14 }}>
        {/* User Profile Avatar */}
        <UserAvatar
          photoUrl={userItem.profilePhoto}
          name={userItem.name}
          role={userItem.role}
          size={46}
          showBorder
          borderColor={getRoleColor(userItem.role) + "30"}
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
                fontSize: 16,
                fontFamily: "DMSans-Bold",
                color: colors.textPrimary,
                flex: 1,
                paddingRight: 8,
              }}
              numberOfLines={1}
            >
              {userItem.name}
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
                backgroundColor: getRoleColor(userItem.role) + "12",
                paddingHorizontal: 8,
                paddingVertical: 2.5,
                borderRadius: 6,
                borderWidth: 0.5,
                borderColor: getRoleColor(userItem.role) + "30",
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontFamily: "DMSans-Bold",
                  color: getRoleColor(userItem.role),
                  letterSpacing: 0.5,
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
                  paddingHorizontal: 8,
                  paddingVertical: 2.5,
                  borderRadius: 6,
                  borderWidth: 0.5,
                  borderColor: colors.primary + "20",
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontFamily: "DMSans-Bold",
                    color: colors.primary,
                    letterSpacing: 0.5,
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
                      fontSize: 12,
                      color: colors.textSecondary,
                      fontFamily: "DMSans-Medium",
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
                    fontSize: 11,
                    color: colors.textSecondary,
                    fontFamily: "DMSans-Medium",
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
