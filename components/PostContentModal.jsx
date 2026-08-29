import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  Platform,
  StyleSheet,
  Alert,
} from "react-native";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme, FONTS, FONT_SIZES } from "../theme";
import {
  pickVibeMedia,
  uploadToCloudinary,
  uploadVideoToCloudinary,
  pickAndUploadDocument,
  getDocumentMeta,
  CLOUDINARY_FOLDERS,
} from "../utils/cloudinaryUpload";

export default function PostContentModal({
  visible,
  onClose,
  onSubmit,
  subjects = [],
  defaultSubjectId = "",
  isLoading = false,
}) {
  const { colors, mode } = useTheme();
  const isDark = mode === "dark";

  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "note", // note, homework, news
    subject: defaultSubjectId || "",
  });

  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkInput, setLinkInput] = useState("");

  useEffect(() => {
    if (visible) {
      setForm({
        title: "",
        description: "",
        type: "note",
        subject: defaultSubjectId || "",
      });
      setAttachments([]);
      setUploading(false);
      setUploadProgress(0);
      setLinkInput("");
    }
  }, [visible, defaultSubjectId]);

  const handlePickImages = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      const remaining =
        5 - attachments.filter((a) => a.fileType === "image").length;
      if (remaining <= 0) {
        Alert.alert("Limit Reached", "You can attach up to 5 images per post.");
        return;
      }
      const pickedList = await pickVibeMedia("gallery", "images", remaining);
      if (!pickedList || pickedList.length === 0) return;

      setUploading(true);
      setUploadProgress(10);

      for (let i = 0; i < pickedList.length; i++) {
        const item = pickedList[i];
        const res = await uploadToCloudinary(
          item.uri,
          (pct) =>
            setUploadProgress(
              Math.round(((i + pct / 100) / pickedList.length) * 100)
            ),
          { folder: CLOUDINARY_FOLDERS.POSTS }
        );
        const meta = getDocumentMeta({
          url: res.url,
          name: `Photo_${Date.now()}`,
        });
        setAttachments((prev) => [
          ...prev,
          {
            url: res.url,
            name: meta.name,
            fileType: "image",
            size: 0,
          },
        ]);
      }
    } catch (err) {
      console.warn("Failed to upload image:", err);
      Alert.alert("Upload Failed", err.message || "Failed to upload image.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handlePickVideo = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      const existingVideos = attachments.filter((a) => a.fileType === "video");
      if (existingVideos.length >= 1) {
        Alert.alert("Limit Reached", "You can attach 1 video clip per post.");
        return;
      }

      const pickedList = await pickVibeMedia("gallery", "videos", 1);
      if (!pickedList || pickedList.length === 0) return;

      setUploading(true);
      setUploadProgress(10);

      const res = await uploadVideoToCloudinary(
        pickedList[0].uri,
        (pct) => setUploadProgress(pct),
        { folder: CLOUDINARY_FOLDERS.VIBES_VIDEOS }
      );

      const meta = getDocumentMeta({
        url: res.url,
        name: `Video_${Date.now()}`,
      });
      setAttachments((prev) => [
        ...prev,
        {
          url: res.url,
          name: meta.name,
          fileType: "video",
          size: 0,
        },
      ]);
    } catch (err) {
      console.warn("Failed to upload video:", err);
      Alert.alert("Upload Failed", err.message || "Failed to upload video.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handlePickDocument = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      setUploading(true);
      setUploadProgress(10);

      const uploaded = await pickAndUploadDocument((pct) =>
        setUploadProgress(pct)
      );
      if (!uploaded) return;

      const meta = getDocumentMeta(uploaded);
      setAttachments((prev) => [
        ...prev,
        {
          url: uploaded.url,
          name: uploaded.name || meta.name,
          fileType: meta.type,
          size: uploaded.size || 0,
        },
      ]);
    } catch (err) {
      console.warn("Document upload error:", err);
      Alert.alert("Upload Failed", err.message || "Failed to upload document.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleAddLink = () => {
    if (!linkInput || !linkInput.trim()) return;
    let formatted = linkInput.trim();
    if (!formatted.startsWith("http://") && !formatted.startsWith("https://")) {
      formatted = `https://${formatted}`;
    }
    setAttachments((prev) => [
      ...prev,
      {
        url: formatted,
        name: formatted,
        fileType: "link",
        size: 0,
      },
    ]);
    setLinkInput("");
    setShowLinkModal(false);
  };

  const handleRemoveAttachment = (index) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!form.title.trim()) {
      Alert.alert("Required Field", "Please enter a title for this post.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      type: form.type,
      subject: form.subject || null,
      attachments: attachments,
    };

    onSubmit(payload);
  };

  const getContentTypeColor = (type) => {
    switch (type) {
      case "homework":
        return "#EF4444";
      case "news":
        return colors.primary;
      default:
        return "#3B82F6";
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)" }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              localStyles.modalCard,
              {
                backgroundColor: isDark ? colors.surfaceContainer : "#FFFFFF",
                borderColor: colors.outlineVariant,
              },
            ]}
          >
            {/* Modal Header */}
            <View style={localStyles.headerRow}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <View
                  style={[
                    localStyles.headerIconBadge,
                    { backgroundColor: colors.primary + "18" },
                  ]}
                >
                  <MaterialIcons
                    name="post-add"
                    size={24}
                    color={colors.primary}
                  />
                </View>
                <View>
                  <Text
                    style={[
                      localStyles.headerTitle,
                      { color: colors.onSurface },
                    ]}
                  >
                    Post Class Material
                  </Text>
                  <Text
                    style={[
                      localStyles.headerSubtitle,
                      { color: colors.onSurfaceVariant },
                    ]}
                  >
                    Notes, homework, PPTs, PDFs & videos
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={onClose}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={localStyles.closeBtn}
              >
                <MaterialIcons
                  name="close"
                  size={24}
                  color={colors.onSurfaceVariant}
                />
              </Pressable>
            </View>

            {/* Type Selector */}
            <View style={{ marginBottom: 14 }}>
              <Text
                style={[
                  localStyles.inputLabel,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                CONTENT TYPE
              </Text>
              <View style={localStyles.typeRow}>
                {[
                  { key: "note", label: "Study Note", icon: "menu-book" },
                  { key: "homework", label: "Homework", icon: "assignment" },
                  { key: "news", label: "Notice", icon: "campaign" },
                ].map((item) => {
                  const isSelected = form.type === item.key;
                  const typeColor = getContentTypeColor(item.key);
                  return (
                    <Pressable
                      key={item.key}
                      onPress={() => {
                        Haptics.impactAsync(
                          Haptics.ImpactFeedbackStyle.Light
                        ).catch(() => {});
                        setForm({ ...form, type: item.key });
                      }}
                      style={[
                        localStyles.typeBtn,
                        {
                          backgroundColor: isSelected
                            ? typeColor + "20"
                            : isDark
                            ? colors.surfaceContainerHighest
                            : colors.surfaceContainerHigh,
                          borderColor: isSelected ? typeColor : "transparent",
                        },
                      ]}
                    >
                      <MaterialIcons
                        name={item.icon}
                        size={18}
                        color={isSelected ? typeColor : colors.onSurfaceVariant}
                      />
                      <Text
                        style={[
                          localStyles.typeBtnText,
                          {
                            color: isSelected
                              ? typeColor
                              : colors.onSurfaceVariant,
                            fontFamily: isSelected ? FONTS.bold : FONTS.medium,
                          },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Subject Selector (if subjects available and not preset) */}
            {subjects && subjects.length > 0 && !defaultSubjectId && (
              <View style={{ marginBottom: 14 }}>
                <Text
                  style={[
                    localStyles.inputLabel,
                    { color: colors.onSurfaceVariant },
                  ]}
                >
                  TARGET SUBJECT
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View
                    style={{ flexDirection: "row", gap: 6, paddingVertical: 2 }}
                  >
                    <Pressable
                      onPress={() => setForm({ ...form, subject: "" })}
                      style={[
                        localStyles.subjectChip,
                        {
                          backgroundColor:
                            form.subject === ""
                              ? colors.primary + "20"
                              : isDark
                              ? colors.surfaceContainerHighest
                              : colors.surfaceContainerHigh,
                          borderColor:
                            form.subject === "" ? colors.primary : "transparent",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          localStyles.subjectChipText,
                          {
                            color:
                              form.subject === ""
                                ? colors.primary
                                : colors.onSurfaceVariant,
                            fontFamily:
                              form.subject === "" ? FONTS.bold : FONTS.medium,
                          },
                        ]}
                      >
                        General (Whole Class)
                      </Text>
                    </Pressable>

                    {subjects.map((subj) => {
                      const isSelected = form.subject === subj._id;
                      return (
                        <Pressable
                          key={subj._id}
                          onPress={() =>
                            setForm({ ...form, subject: subj._id })
                          }
                          style={[
                            localStyles.subjectChip,
                            {
                              backgroundColor: isSelected
                                ? colors.primary + "20"
                                : isDark
                                ? colors.surfaceContainerHighest
                                : colors.surfaceContainerHigh,
                              borderColor: isSelected
                                ? colors.primary
                                : "transparent",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              localStyles.subjectChipText,
                              {
                                color: isSelected
                                  ? colors.primary
                                  : colors.onSurfaceVariant,
                                fontFamily: isSelected
                                  ? FONTS.bold
                                  : FONTS.medium,
                              },
                            ]}
                          >
                            {subj.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Title Input */}
            <View style={{ marginBottom: 12 }}>
              <Text
                style={[
                  localStyles.inputLabel,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                TITLE *
              </Text>
              <TextInput
                placeholder="e.g. Chapter 4 Practice Sheet & Slides"
                placeholderTextColor={colors.onSurfaceVariant + "80"}
                style={[
                  localStyles.textInput,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceContainerLowest
                      : colors.surfaceContainerLow,
                    borderColor: colors.outlineVariant,
                    color: colors.onSurface,
                  },
                ]}
                value={form.title}
                onChangeText={(t) => setForm({ ...form, title: t })}
              />
            </View>

            {/* Description Input */}
            <View style={{ marginBottom: 14 }}>
              <Text
                style={[
                  localStyles.inputLabel,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                INSTRUCTIONS / DESCRIPTION
              </Text>
              <TextInput
                placeholder="Write homework instructions, chapter overview, or key learning takeaways..."
                placeholderTextColor={colors.onSurfaceVariant + "80"}
                multiline
                numberOfLines={4}
                style={[
                  localStyles.textInput,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceContainerLowest
                      : colors.surfaceContainerLow,
                    borderColor: colors.outlineVariant,
                    color: colors.onSurface,
                    minHeight: 85,
                    textAlignVertical: "top",
                  },
                ]}
                value={form.description}
                onChangeText={(t) => setForm({ ...form, description: t })}
              />
            </View>

            {/* Attachments Section */}
            <View style={{ marginBottom: 16 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Text
                  style={[
                    localStyles.inputLabel,
                    { color: colors.onSurfaceVariant, marginBottom: 0 },
                  ]}
                >
                  ATTACHMENTS ({attachments.length})
                </Text>
                {uploading && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text
                      style={{
                        fontSize: FONT_SIZES.sm,
                        color: colors.primary,
                        fontFamily: FONTS.bold,
                      }}
                    >
                      Uploading {uploadProgress}%
                    </Text>
                  </View>
                )}
              </View>

              {/* Attachment Picker Buttons */}
              <View style={localStyles.attachToolbar}>
                <Pressable
                  onPress={handlePickImages}
                  disabled={uploading}
                  style={({ pressed }) => [
                    localStyles.attachBtn,
                    {
                      backgroundColor: isDark
                        ? colors.surfaceContainerHighest
                        : colors.surfaceContainerHigh,
                      opacity: pressed || uploading ? 0.7 : 1,
                    },
                  ]}
                >
                  <MaterialIcons name="photo-camera" size={20} color="#06B6D4" />
                  <Text
                    style={[
                      localStyles.attachBtnText,
                      { color: colors.onSurface },
                    ]}
                  >
                    Photo
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handlePickDocument}
                  disabled={uploading}
                  style={({ pressed }) => [
                    localStyles.attachBtn,
                    {
                      backgroundColor: isDark
                        ? colors.surfaceContainerHighest
                        : colors.surfaceContainerHigh,
                      opacity: pressed || uploading ? 0.7 : 1,
                    },
                  ]}
                >
                  <FontAwesome5 name="file-pdf" size={17} color="#EF4444" />
                  <Text
                    style={[
                      localStyles.attachBtnText,
                      { color: colors.onSurface },
                    ]}
                  >
                    PDF / PPT
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handlePickVideo}
                  disabled={uploading}
                  style={({ pressed }) => [
                    localStyles.attachBtn,
                    {
                      backgroundColor: isDark
                        ? colors.surfaceContainerHighest
                        : colors.surfaceContainerHigh,
                      opacity: pressed || uploading ? 0.7 : 1,
                    },
                  ]}
                >
                  <MaterialIcons name="videocam" size={20} color="#9333EA" />
                  <Text
                    style={[
                      localStyles.attachBtnText,
                      { color: colors.onSurface },
                    ]}
                  >
                    Video
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setShowLinkModal(true)}
                  disabled={uploading}
                  style={({ pressed }) => [
                    localStyles.attachBtn,
                    {
                      backgroundColor: isDark
                        ? colors.surfaceContainerHighest
                        : colors.surfaceContainerHigh,
                      opacity: pressed || uploading ? 0.7 : 1,
                    },
                  ]}
                >
                  <MaterialIcons name="link" size={20} color="#0D9488" />
                  <Text
                    style={[
                      localStyles.attachBtnText,
                      { color: colors.onSurface },
                    ]}
                  >
                    Link
                  </Text>
                </Pressable>
              </View>

              {/* Staged Attachments List */}
              {attachments.length > 0 && (
                <View style={localStyles.stagedList}>
                  {attachments.map((item, idx) => {
                    const meta = getDocumentMeta(item);
                    return (
                      <View
                        key={`staged-${idx}`}
                        style={[
                          localStyles.stagedItem,
                          {
                            backgroundColor: isDark
                              ? colors.surfaceContainerLowest
                              : colors.surfaceContainerLow,
                            borderColor: meta.color + "30",
                          },
                        ]}
                      >
                        <View
                          style={[
                            localStyles.stagedIcon,
                            { backgroundColor: meta.color + "18" },
                          ]}
                        >
                          <MaterialIcons
                            name={meta.icon}
                            size={18}
                            color={meta.color}
                          />
                        </View>
                        <Text
                          style={[
                            localStyles.stagedName,
                            { color: colors.onSurface },
                          ]}
                          numberOfLines={1}
                        >
                          {meta.name}
                        </Text>
                        <Pressable
                          onPress={() => handleRemoveAttachment(idx)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          style={localStyles.stagedRemove}
                        >
                          <MaterialIcons
                            name="cancel"
                            size={20}
                            color={colors.error}
                          />
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={localStyles.footerRow}>
              <Pressable
                onPress={onClose}
                disabled={uploading || isLoading}
                style={[
                  localStyles.cancelBtn,
                  { borderColor: colors.outlineVariant },
                ]}
              >
                <Text
                  style={[
                    localStyles.cancelBtnText,
                    { color: colors.onSurfaceVariant },
                  ]}
                >
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={handleSubmit}
                disabled={uploading || isLoading || !form.title.trim()}
                style={({ pressed }) => [
                  localStyles.submitBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity:
                      uploading || isLoading || !form.title.trim()
                        ? 0.6
                        : pressed
                        ? 0.85
                        : 1,
                  },
                ]}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialIcons name="send" size={18} color="#FFFFFF" />
                    <Text style={localStyles.submitBtnText}>Post to Class</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Link Input Modal */}
      <Modal
        visible={showLinkModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLinkModal(false)}
      >
        <View style={localStyles.linkModalBackdrop}>
          <View
            style={[
              localStyles.linkModalCard,
              {
                backgroundColor: isDark ? colors.surfaceContainer : "#FFFFFF",
                borderColor: colors.outlineVariant,
              },
            ]}
          >
            <Text
              style={{
                fontSize: FONT_SIZES.lg,
                fontFamily: FONTS.bold,
                color: colors.onSurface,
                marginBottom: 8,
              }}
            >
              Add Web Resource / Link
            </Text>
            <TextInput
              placeholder="https://drive.google.com/... or https://youtube.com/..."
              placeholderTextColor={colors.onSurfaceVariant + "80"}
              autoCapitalize="none"
              keyboardType="url"
              style={[
                localStyles.textInput,
                {
                  backgroundColor: isDark
                    ? colors.surfaceContainerLowest
                    : colors.surfaceContainerLow,
                  borderColor: colors.outlineVariant,
                  color: colors.onSurface,
                  marginBottom: 16,
                },
              ]}
              value={linkInput}
              onChangeText={setLinkInput}
            />
            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <Pressable
                onPress={() => {
                  setLinkInput("");
                  setShowLinkModal(false);
                }}
                style={{ padding: 10 }}
              >
                <Text
                  style={{
                    fontSize: FONT_SIZES.base,
                    color: colors.onSurfaceVariant,
                    fontFamily: FONTS.medium,
                  }}
                >
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleAddLink}
                disabled={!linkInput.trim()}
                style={[
                  localStyles.submitBtn,
                  {
                    backgroundColor: colors.primary,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    opacity: !linkInput.trim() ? 0.6 : 1,
                  },
                ]}
              >
                <Text style={localStyles.submitBtnText}>Add Link</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const localStyles = StyleSheet.create({
  modalCard: {
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 480,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.bold,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
  },
  inputLabel: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  typeRow: {
    flexDirection: "row",
    gap: 8,
  },
  typeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  typeBtnText: {
    fontSize: FONT_SIZES.sm,
  },
  subjectChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  subjectChipText: {
    fontSize: FONT_SIZES.sm,
  },
  textInput: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.regular,
  },
  attachToolbar: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  attachBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 10,
    gap: 5,
  },
  attachBtnText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  stagedList: {
    gap: 8,
    marginTop: 6,
  },
  stagedItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  stagedIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  stagedName: {
    flex: 1,
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.medium,
  },
  stagedRemove: {
    padding: 4,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.medium,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 10,
    justifyContent: "center",
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.bold,
  },
  linkModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  linkModalCard: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
});
