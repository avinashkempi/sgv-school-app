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
  uploadAcademicAttachment,
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
  defaultSubjectName = "",
  className = "",
  branch = "",
  teacherName = "",
  isLoading = false,
}) {
  const { colors, mode } = useTheme();
  const isDark = mode === "dark";

  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "homework", // default or note/homework/news
    subject: defaultSubjectId || "",
  });

  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkInput, setLinkInput] = useState("");

  useEffect(() => {
    if (visible) {
      setForm({
        title: "",
        description: "",
        type: "homework",
        subject: defaultSubjectId || "",
      });
      setAttachments([]);
      setUploading(false);
      setUploadProgress(0);
      setShowLinkInput(false);
      setLinkInput("");
    }
  }, [visible, defaultSubjectId]);

  const selectedSubjectObj = subjects.find(
    (s) => String(s._id || s.id) === String(form.subject)
  );
  const currentSubjectName =
    selectedSubjectObj?.name || defaultSubjectName || "";

  const getAcademicContext = (originalName = "") => ({
    className,
    subjectName: currentSubjectName,
    contentType: form.type || "note",
    title: form.title || "",
    branch,
    teacherName,
    originalName,
  });

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

      const academicCtx = getAcademicContext();

      for (let i = 0; i < pickedList.length; i++) {
        const item = pickedList[i];
        const uploaded = await uploadAcademicAttachment(
          item,
          {
            ...academicCtx,
            originalName: `photo_${i + 1}.jpg`,
          },
          (pct) =>
            setUploadProgress(
              Math.round(((i + pct / 100) / pickedList.length) * 100)
            )
        );

        setAttachments((prev) => [
          ...prev,
          {
            url: uploaded.url,
            name: uploaded.name,
            fileType: "image",
            size: 0,
            folder: uploaded.folder,
            publicId: uploaded.publicId,
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

      const academicCtx = getAcademicContext("video_clip.mp4");
      const uploaded = await uploadAcademicAttachment(
        pickedList[0],
        academicCtx,
        (pct) => setUploadProgress(pct)
      );

      setAttachments((prev) => [
        ...prev,
        {
          url: uploaded.url,
          name: uploaded.name,
          fileType: "video",
          size: 0,
          folder: uploaded.folder,
          publicId: uploaded.publicId,
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

      const academicCtx = getAcademicContext();

      const uploaded = await pickAndUploadDocument(
        (pct) => setUploadProgress(pct),
        { academicContext: academicCtx }
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
          folder: uploaded.folder,
          publicId: uploaded.publicId,
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
    setShowLinkInput(false);
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
        return "#F59E0B";
      default:
        return "#3B82F6";
    }
  };

  const getContentTypeIcon = (type) => {
    switch (type) {
      case "homework":
        return "assignment";
      case "news":
        return "campaign";
      default:
        return "menu-book";
    }
  };

  const currentColor = getContentTypeColor(form.type);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={localStyles.backdrop}
      >
        <ScrollView
          contentContainerStyle={localStyles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              localStyles.modalCard,
              {
                backgroundColor: isDark ? colors.surfaceContainer : "#FFFFFF",
                borderColor: isDark
                  ? colors.outlineVariant
                  : "rgba(0,0,0,0.08)",
              },
            ]}
          >
            {/* Modal Header */}
            <View style={localStyles.headerRow}>
              <View style={localStyles.headerLeft}>
                <View
                  style={[
                    localStyles.headerIconBadge,
                    { backgroundColor: currentColor + "18" },
                  ]}
                >
                  <MaterialIcons
                    name={getContentTypeIcon(form.type)}
                    size={22}
                    color={currentColor}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={[
                      localStyles.headerTitle,
                      { color: colors.onSurface },
                    ]}
                    numberOfLines={1}
                  >
                    {form.type === "homework"
                      ? "Post Homework"
                      : form.type === "news"
                      ? "Post Notice"
                      : "Post Study Material"}
                  </Text>
                  <Text
                    style={[
                      localStyles.headerSubtitle,
                      { color: colors.onSurfaceVariant },
                    ]}
                    numberOfLines={1}
                  >
                    Share with students & class feed
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={({ pressed }) => [
                  localStyles.closeBtn,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceContainerHighest
                      : colors.surfaceContainerHigh,
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

            {/* Type Selector */}
            <View style={localStyles.fieldGroup}>
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
                  { key: "homework", label: "Homework", icon: "assignment" },
                  { key: "note", label: "Study Note", icon: "menu-book" },
                  { key: "news", label: "Notice", icon: "campaign" },
                ].map((item) => {
                  const isSelected = form.type === item.key;
                  const itemColor = getContentTypeColor(item.key);
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
                            ? itemColor + "18"
                            : isDark
                            ? colors.surfaceContainerHighest
                            : colors.surfaceContainerHigh,
                          borderColor: isSelected ? itemColor : "transparent",
                        },
                      ]}
                    >
                      <MaterialIcons
                        name={item.icon}
                        size={16}
                        color={isSelected ? itemColor : colors.onSurfaceVariant}
                      />
                      <Text
                        style={[
                          localStyles.typeBtnText,
                          {
                            color: isSelected
                              ? itemColor
                              : colors.onSurfaceVariant,
                            fontFamily: isSelected
                              ? FONTS.bold
                              : FONTS.medium,
                          },
                        ]}
                        numberOfLines={1}
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
              <View style={localStyles.fieldGroup}>
                <Text
                  style={[
                    localStyles.inputLabel,
                    { color: colors.onSurfaceVariant },
                  ]}
                >
                  TARGET SUBJECT
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={localStyles.subjectScrollContent}
                >
                  <Pressable
                    onPress={() => setForm({ ...form, subject: "" })}
                    style={[
                      localStyles.subjectChip,
                      {
                        backgroundColor:
                          form.subject === ""
                            ? colors.primary + "18"
                            : isDark
                            ? colors.surfaceContainerHighest
                            : colors.surfaceContainerHigh,
                        borderColor:
                          form.subject === ""
                            ? colors.primary
                            : isDark
                            ? colors.outlineVariant
                            : "transparent",
                      },
                    ]}
                  >
                    {form.subject === "" && (
                      <MaterialIcons
                        name="check"
                        size={14}
                        color={colors.primary}
                        style={{ marginRight: 4 }}
                      />
                    )}
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
                      Whole Class (General)
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
                              ? colors.primary + "18"
                              : isDark
                              ? colors.surfaceContainerHighest
                              : colors.surfaceContainerHigh,
                            borderColor: isSelected
                              ? colors.primary
                              : isDark
                              ? colors.outlineVariant
                              : "transparent",
                          },
                        ]}
                      >
                        {isSelected && (
                          <MaterialIcons
                            name="check"
                            size={14}
                            color={colors.primary}
                            style={{ marginRight: 4 }}
                          />
                        )}
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
                </ScrollView>
              </View>
            )}

            {/* Title Input */}
            <View style={localStyles.fieldGroup}>
              <Text
                style={[
                  localStyles.inputLabel,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                TITLE *
              </Text>
              <TextInput
                placeholder={
                  form.type === "homework"
                    ? "e.g. Chapter 4 Exercises - Pg 45-48"
                    : "e.g. Chapter 4 Practice Sheet & Slides"
                }
                placeholderTextColor={colors.onSurfaceVariant + "80"}
                style={[
                  localStyles.textInput,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceContainerLowest
                      : colors.surfaceContainerLow,
                    borderColor: isDark
                      ? colors.outlineVariant
                      : "rgba(0,0,0,0.1)",
                    color: colors.onSurface,
                  },
                ]}
                value={form.title}
                onChangeText={(t) => setForm({ ...form, title: t })}
              />
            </View>

            {/* Description Input */}
            <View style={localStyles.fieldGroup}>
              <Text
                style={[
                  localStyles.inputLabel,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                INSTRUCTIONS / DETAILS
              </Text>
              <TextInput
                placeholder={
                  form.type === "homework"
                    ? "Specify submission deadline, instructions, questions to complete..."
                    : "Write notes overview, learning objectives, or important remarks..."
                }
                placeholderTextColor={colors.onSurfaceVariant + "80"}
                multiline
                numberOfLines={3}
                style={[
                  localStyles.textInput,
                  localStyles.textArea,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceContainerLowest
                      : colors.surfaceContainerLow,
                    borderColor: isDark
                      ? colors.outlineVariant
                      : "rgba(0,0,0,0.1)",
                    color: colors.onSurface,
                  },
                ]}
                value={form.description}
                onChangeText={(t) => setForm({ ...form, description: t })}
              />
            </View>

            {/* Attachments Section */}
            <View style={localStyles.fieldGroup}>
              <View style={localStyles.attachHeader}>
                <Text
                  style={[
                    localStyles.inputLabel,
                    { color: colors.onSurfaceVariant, marginBottom: 0 },
                  ]}
                >
                  ATTACHMENTS {attachments.length > 0 ? `(${attachments.length})` : ""}
                </Text>
                {uploading && (
                  <View style={localStyles.uploadingBadge}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text
                      style={{
                        fontSize: FONT_SIZES.xs,
                        color: colors.primary,
                        fontFamily: FONTS.bold,
                      }}
                    >
                      Uploading {uploadProgress}%
                    </Text>
                  </View>
                )}
              </View>

              {/* Attachment Picker Buttons (Vertical Stack with Icon & Label) */}
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
                    numberOfLines={1}
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
                    numberOfLines={1}
                  >
                    PDF / Doc
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
                  <MaterialIcons name="videocam" size={20} color="#8B5CF6" />
                  <Text
                    style={[
                      localStyles.attachBtnText,
                      { color: colors.onSurface },
                    ]}
                    numberOfLines={1}
                  >
                    Video
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setShowLinkInput(!showLinkInput)}
                  disabled={uploading}
                  style={({ pressed }) => [
                    localStyles.attachBtn,
                    {
                      backgroundColor: showLinkInput
                        ? "#10B98118"
                        : isDark
                        ? colors.surfaceContainerHighest
                        : colors.surfaceContainerHigh,
                      borderColor: showLinkInput ? "#10B981" : "transparent",
                      borderWidth: showLinkInput ? 1 : 0,
                      opacity: pressed || uploading ? 0.7 : 1,
                    },
                  ]}
                >
                  <MaterialIcons name="link" size={20} color="#10B981" />
                  <Text
                    style={[
                      localStyles.attachBtnText,
                      {
                        color: showLinkInput ? "#10B981" : colors.onSurface,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    Link
                  </Text>
                </Pressable>
              </View>

              {/* Inline Link Input */}
              {showLinkInput && (
                <View
                  style={[
                    localStyles.inlineLinkContainer,
                    {
                      backgroundColor: isDark
                        ? colors.surfaceContainerLowest
                        : colors.surfaceContainerLow,
                      borderColor: isDark
                        ? colors.outlineVariant
                        : "rgba(0,0,0,0.1)",
                    },
                  ]}
                >
                  <TextInput
                    placeholder="Paste link (https://drive.google.com/...)"
                    placeholderTextColor={colors.onSurfaceVariant + "80"}
                    autoCapitalize="none"
                    keyboardType="url"
                    style={[
                      localStyles.inlineLinkInput,
                      { color: colors.onSurface },
                    ]}
                    value={linkInput}
                    onChangeText={setLinkInput}
                  />
                  <View style={localStyles.inlineLinkActions}>
                    <Pressable
                      onPress={() => {
                        setLinkInput("");
                        setShowLinkInput(false);
                      }}
                      style={localStyles.inlineLinkCancel}
                    >
                      <Text
                        style={{
                          fontSize: FONT_SIZES.xs,
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
                        localStyles.inlineLinkAdd,
                        {
                          backgroundColor: "#10B981",
                          opacity: !linkInput.trim() ? 0.5 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: FONT_SIZES.xs,
                          color: "#FFFFFF",
                          fontFamily: FONTS.bold,
                        }}
                      >
                        Attach
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}

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
                            size={16}
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
                            size={18}
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
                style={({ pressed }) => [
                  localStyles.cancelBtn,
                  {
                    borderColor: isDark
                      ? colors.outlineVariant
                      : "rgba(0,0,0,0.12)",
                    opacity: pressed ? 0.7 : 1,
                  },
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
                        ? 0.5
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
                    <MaterialIcons name="send" size={16} color="#FFFFFF" />
                    <Text style={localStyles.submitBtnText}>
                      {form.type === "homework"
                        ? "Post Homework"
                        : "Post to Class"}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const localStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  modalCard: {
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 480,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  headerIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.xs,
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
  fieldGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
    letterSpacing: 0.6,
    marginBottom: 6,
    textTransform: "uppercase",
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
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 5,
  },
  typeBtnText: {
    fontSize: FONT_SIZES.xs,
  },
  subjectScrollContent: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },
  subjectChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  subjectChipText: {
    fontSize: FONT_SIZES.xs,
  },
  textInput: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
  },
  textArea: {
    minHeight: 76,
    textAlignVertical: "top",
  },
  attachHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  uploadingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  attachToolbar: {
    flexDirection: "row",
    gap: 8,
  },
  attachBtn: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    gap: 4,
  },
  attachBtnText: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.semiBold,
  },
  inlineLinkContainer: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    padding: 8,
    gap: 8,
  },
  inlineLinkInput: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  inlineLinkActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
  },
  inlineLinkCancel: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  inlineLinkAdd: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  stagedList: {
    gap: 6,
    marginTop: 8,
  },
  stagedItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  stagedIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  stagedName: {
    flex: 1,
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
  },
  stagedRemove: {
    padding: 4,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.medium,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    justifyContent: "center",
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
});

