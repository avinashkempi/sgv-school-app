import React, { useState, } from "react";
import {
    View,
    Text,
    ScrollView,
    TextInput,
    Pressable,
    ActivityIndicator
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { useRouter } from "expo-router";
import { useTheme } from "../../theme";
import { useApiQuery, useApiMutation, createApiMutationFn } from "../../hooks/useApi";
import apiConfig from "../../config/apiConfig";
import Header from "../../components/Header";
import { useToast } from "../../components/ToastProvider";

export default function SendNotificationScreen() {
    const router = useRouter();
    const { _styles, colors } = useTheme();
    const { showToast } = useToast();

    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [type, setType] = useState("General");
    const [target, setTarget] = useState("all"); // 'all', 'class', 'user'
    const [selectedClass, setSelectedClass] = useState(null);

    // Fetch Classes
    const { data: classes = [] } = useApiQuery(
        ['adminClasses'],
        `${apiConfig.baseUrl}/classes`,
        { enabled: target === 'class' }
    );

    // Send Notification Mutation
    const sendNotificationMutation = useApiMutation({
        mutationFn: createApiMutationFn(`${apiConfig.baseUrl}/notifications/send`, 'POST'),
        onSuccess: () => {
            showToast("Notification sent successfully", "success");
            router.back();
        },
        onError: (error) => showToast(error.message || "Failed to send notification", "error")
    });

    const handleSend = () => {
        if (!title.trim() || !message.trim()) {
            showToast("Please enter title and message", "error");
            return;
        }

        if (target === 'class' && !selectedClass) {
            showToast("Please select a class", "error");
            return;
        }

        sendNotificationMutation.mutate({
            title,
            message,
            type,
            target,
            targetId: target === 'class' ? selectedClass : null
        });
    };

    const notificationTypes = ['General', 'Homework', 'Exam', 'Fee', 'Emergency', 'Event'];

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{ padding: 16, paddingTop: 24 }}>
                <Header title="Broadcast Announcement" subtitle="Send alerts to users" showBack />
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>

                {/* Title */}
                <View style={{ marginBottom: 20 }}>
                    <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Title</Text>
                    <TextInput
                        value={title}
                        onChangeText={setTitle}
                        placeholder="e.g. School Closed Tomorrow"
                        placeholderTextColor={colors.textSecondary + "80"}
                        style={{
                            borderWidth: 1,
                            borderColor: colors.textSecondary + "40",
                            borderRadius: 12,
                            padding: 16,
                            color: colors.textPrimary,
                            fontSize: 16,
                            backgroundColor: colors.cardBackground
                        }}
                    />
                </View>

                {/* Message */}
                <View style={{ marginBottom: 20 }}>
                    <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Message</Text>
                    <TextInput
                        value={message}
                        onChangeText={setMessage}
                        placeholder="Type your message here..."
                        placeholderTextColor={colors.textSecondary + "80"}
                        multiline
                        style={{
                            borderWidth: 1,
                            borderColor: colors.textSecondary + "40",
                            borderRadius: 12,
                            padding: 16,
                            color: colors.textPrimary,
                            fontSize: 16,
                            backgroundColor: colors.cardBackground,
                            minHeight: 100,
                            textAlignVertical: "top"
                        }}
                    />
                </View>

                {/* Type Selection */}
                <View style={{ marginBottom: 24 }}>
                    <Text style={{ color: colors.textSecondary, marginBottom: 12 }}>Type</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={{ flexDirection: "row", gap: 8 }}>
                            {notificationTypes.map(t => (
                                <Pressable
                                    key={t}
                                    onPress={() => setType(t)}
                                    style={{
                                        paddingHorizontal: 16,
                                        paddingVertical: 10,
                                        backgroundColor: type === t ? colors.primary : colors.cardBackground,
                                        borderRadius: 20,
                                        borderWidth: 1,
                                        borderColor: type === t ? colors.primary : colors.textSecondary + "20"
                                    }}
                                >
                                    <Text style={{ color: type === t ? "#fff" : colors.textPrimary, fontWeight: "600" }}>
                                        {t}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </ScrollView>
                </View>

                {/* Target Selection */}
                <View style={{ marginBottom: 24 }}>
                    <Text style={{ color: colors.textSecondary, marginBottom: 12 }}>Target Audience</Text>
                    <View style={{ flexDirection: "row", gap: 12 }}>
                        <Pressable
                            onPress={() => setTarget('all')}
                            style={{
                                flex: 1,
                                padding: 16,
                                backgroundColor: target === 'all' ? colors.primary + "15" : colors.cardBackground,
                                borderWidth: 1,
                                borderColor: target === 'all' ? colors.primary : colors.textSecondary + "20",
                                borderRadius: 12,
                                alignItems: "center"
                            }}
                        >
                            <MaterialIcons name="public" size={24} color={target === 'all' ? colors.primary : colors.textSecondary} />
                            <Text style={{ marginTop: 8, color: target === 'all' ? colors.primary : colors.textPrimary, fontWeight: "600" }}>
                                Everyone
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={() => setTarget('class')}
                            style={{
                                flex: 1,
                                padding: 16,
                                backgroundColor: target === 'class' ? colors.primary + "15" : colors.cardBackground,
                                borderWidth: 1,
                                borderColor: target === 'class' ? colors.primary : colors.textSecondary + "20",
                                borderRadius: 12,
                                alignItems: "center"
                            }}
                        >
                            <MaterialIcons name="class" size={24} color={target === 'class' ? colors.primary : colors.textSecondary} />
                            <Text style={{ marginTop: 8, color: target === 'class' ? colors.primary : colors.textPrimary, fontWeight: "600" }}>
                                Specific Class
                            </Text>
                        </Pressable>
                        <Pressable
                            onPress={() => setTarget('teacher')}
                            style={{
                                flex: 1,
                                padding: 16,
                                backgroundColor: target === 'teacher' ? colors.primary + "15" : colors.cardBackground,
                                borderWidth: 1,
                                borderColor: target === 'teacher' ? colors.primary : colors.textSecondary + "20",
                                borderRadius: 12,
                                alignItems: "center"
                            }}
                        >
                            <MaterialIcons name="school" size={24} color={target === 'teacher' ? colors.primary : colors.textSecondary} />
                            <Text style={{ marginTop: 8, color: target === 'teacher' ? colors.primary : colors.textPrimary, fontWeight: "600" }}>
                                Teachers
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={() => setTarget('staff')}
                            style={{
                                flex: 1,
                                padding: 16,
                                backgroundColor: target === 'staff' ? colors.primary + "15" : colors.cardBackground,
                                borderWidth: 1,
                                borderColor: target === 'staff' ? colors.primary : colors.textSecondary + "20",
                                borderRadius: 12,
                                alignItems: "center"
                            }}
                        >
                            <MaterialIcons name="badge" size={24} color={target === 'staff' ? colors.primary : colors.textSecondary} />
                            <Text style={{ marginTop: 8, color: target === 'staff' ? colors.primary : colors.textPrimary, fontWeight: "600" }}>
                                Staff
                            </Text>
                        </Pressable>
                    </View>
                </View>

                {/* Class Dropdown (if target is class) */}
                {target === 'class' && (
                    <View style={{ marginBottom: 24 }}>
                        <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Select Class</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={{ flexDirection: "row", gap: 8 }}>
                                {classes.map(cls => (
                                    <Pressable
                                        key={cls._id}
                                        onPress={() => setSelectedClass(cls._id)}
                                        style={{
                                            paddingHorizontal: 16,
                                            paddingVertical: 10,
                                            backgroundColor: selectedClass === cls._id ? colors.primary : colors.cardBackground,
                                            borderRadius: 12,
                                            borderWidth: 1,
                                            borderColor: selectedClass === cls._id ? colors.primary : colors.textSecondary + "20"
                                        }}
                                    >
                                        <Text style={{ color: selectedClass === cls._id ? "#fff" : colors.textPrimary }}>
                                            {cls.name}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </ScrollView>
                    </View>
                )}

                {/* Send Button */}
                <Pressable
                    onPress={handleSend}
                    disabled={sendNotificationMutation.isPending}
                    style={{
                        backgroundColor: colors.primary,
                        padding: 18,
                        borderRadius: 16,
                        alignItems: "center",
                        marginTop: 12,
                        opacity: sendNotificationMutation.isPending ? 0.7 : 1,
                        shadowColor: colors.primary,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.2,
                        shadowRadius: 8,
                        elevation: 4
                    }}
                >
                    {sendNotificationMutation.isPending ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <MaterialIcons name="send" size={20} color="#fff" />
                            <Text style={{ color: "#fff", fontSize: 18, fontFamily: "DMSans-Bold" }}>
                                Send Broadcast
                            </Text>
                        </View>
                    )}
                </Pressable>

            </ScrollView>
        </View>
    );
}
