import React from 'react';
import { View, Text, Pressable, Alert } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../theme";

const UserCard = ({ userItem, getRoleColor, getRoleDisplay, colors, onEdit, onDelete, onPress }) => {
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
            {/* Row 1: Name */}
            <View>
                <Text
                    style={{
                        fontSize: 16,
                        fontFamily: "DMSans-Bold",
                        color: colors.textPrimary
                    }}
                >
                    {userItem.name}
                </Text>
            </View>

            {/* Row 2: Role, Class & Actions */}
            <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    {/* Role Badge */}
                    <View style={{
                        backgroundColor: getRoleColor(userItem.role) + "12",
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                        borderWidth: 0.5,
                        borderColor: getRoleColor(userItem.role) + "30"
                    }}>
                        <Text style={{
                            fontSize: 10,
                            fontFamily: "DMSans-Bold",
                            color: getRoleColor(userItem.role),
                            letterSpacing: 0.5
                        }}>
                            {getRoleDisplay(userItem).toUpperCase()}
                        </Text>
                    </View>

                    {/* Class Badge (Students Only) */}
                    {userItem.role === 'student' && userItem.currentClass?.name && (
                        <View style={{
                            backgroundColor: colors.primary + "10",
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 6,
                            borderWidth: 0.5,
                            borderColor: colors.primary + "20"
                        }}>
                            <Text style={{
                                fontSize: 10,
                                fontFamily: "DMSans-Bold",
                                color: colors.primary,
                                letterSpacing: 0.5
                            }}>
                                {userItem.currentClass.name.toUpperCase()}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Actions */}
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    <Pressable
                        onPress={(e) => {
                            e.stopPropagation();
                            onEdit();
                        }}
                        style={({ pressed }) => ({
                            padding: 6,
                            opacity: pressed ? 0.7 : 1
                        })}
                    >
                        <MaterialIcons name="edit" size={22} color={colors.primary} />
                    </Pressable>

                    <Pressable
                        onPress={(e) => {
                            e.stopPropagation();
                            Alert.alert(
                                "Delete User",
                                `Are you sure you want to delete ${userItem.name}?`,
                                [
                                    { text: "Cancel", style: "cancel" },
                                    { text: "Delete", onPress: () => onDelete(), style: "destructive" }
                                ]
                            );
                        }}
                        style={({ pressed }) => ({
                            padding: 6,
                            opacity: pressed ? 0.7 : 1
                        })}
                    >
                        <MaterialIcons name="delete-outline" size={22} color={colors.error} />
                    </Pressable>
                </View>
            </View>

            {/* Row 3: Phone */}
            {userItem.phone && (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <MaterialIcons name="phone" size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 13, color: colors.textSecondary, fontFamily: "DMSans-Medium" }}>
                        {userItem.phone}
                    </Text>
                </View>
            )}
        </Pressable>
    );
};

export default React.memo(UserCard, (prevProps, nextProps) => {
    return (
        prevProps.userItem._id === nextProps.userItem._id &&
        prevProps.userItem.role === nextProps.userItem.role &&
        prevProps.userItem.name === nextProps.userItem.name &&
        prevProps.userItem.phone === nextProps.userItem.phone
    );
});
