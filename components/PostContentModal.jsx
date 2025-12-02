import React, { useState } from "react";
import {
    View,
    Text,
    Modal,
    TextInput,
    Pressable } from "react-native";
import {} from "@expo/vector-icons";
import { useTheme } from "../theme";

export default function PostContentModal({ visible, onClose, onSubmit }) {
    const { _styles, colors } = useTheme();
    const [form, setForm] = useState({
        title: "",
        description: "",
        type: "note", // note, homework, news
    });

    const handleSubmit = () => {
        if (!form.title || !form.description) {
            // Basic validation, parent can do more
            return;
        }
        onSubmit(form);
        // Reset form after submit (optional, depending on UX preference)
        setForm({ title: "", description: "", type: "note" });
    };

    const getContentTypeColor = (type) => {
        switch (type) {
            case "homework": return colors.error;
            case "news": return colors.primary;
            default: return colors.secondary;
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={{ flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)", padding: 20 }}>
                <View style={{ backgroundColor: colors.cardBackground, borderRadius: 16, padding: 24 }}>
                    <Text style={{ fontSize: 20, fontWeight: "700", color: colors.textPrimary, marginBottom: 16 }}>
                        Post Class Content
                    </Text>

                    <TextInput
                        placeholder="Title (e.g. Math Homework)"
                        placeholderTextColor={colors.textSecondary}
                        style={{
                            backgroundColor: colors.background,
                            padding: 12,
                            borderRadius: 8,
                            color: colors.textPrimary,
                            marginBottom: 12
                        }}
                        value={form.title}
                        onChangeText={(t) => setForm({ ...form, title: t })}
                    />

                    <TextInput
                        placeholder="Description"
                        placeholderTextColor={colors.textSecondary}
                        multiline
                        numberOfLines={4}
                        style={{
                            backgroundColor: colors.background,
                            padding: 12,
                            borderRadius: 8,
                            color: colors.textPrimary,
                            marginBottom: 12,
                            height: 100,
                            textAlignVertical: "top"
                        }}
                        value={form.description}
                        onChangeText={(t) => setForm({ ...form, description: t })}
                    />

                    {/* Type Selection */}
                    <View style={{ marginBottom: 24 }}>
                        <Text style={{ color: colors.textSecondary, marginBottom: 8, fontSize: 12 }}>CONTENT TYPE</Text>
                        <View style={{ flexDirection: "row", gap: 8 }}>
                            {["note", "homework", "news"].map(type => (
                                <Pressable
                                    key={type}
                                    onPress={() => setForm({ ...form, type })}
                                    style={{
                                        paddingHorizontal: 12,
                                        paddingVertical: 8,
                                        backgroundColor: form.type === type ? getContentTypeColor(type) : colors.background,
                                        borderRadius: 8,
                                        borderWidth: 1,
                                        borderColor: form.type === type ? getContentTypeColor(type) : colors.border
                                    }}
                                >
                                    <Text style={{ color: form.type === type ? '#fff' : colors.textPrimary, textTransform: "capitalize", fontWeight: "600" }}>
                                        {type}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>

                    <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12 }}>
                        <Pressable onPress={onClose} style={{ padding: 12 }}>
                            <Text style={{ color: colors.textSecondary, fontWeight: "600" }}>Cancel</Text>
                        </Pressable>
                        <Pressable
                            onPress={handleSubmit}
                            style={{ backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 }}
                        >
                            <Text style={{ color: "#fff", fontWeight: "600" }}>Post</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
