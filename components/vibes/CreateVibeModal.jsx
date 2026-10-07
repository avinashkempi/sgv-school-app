import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Keyboard,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme, FONTS, FONT_SIZES, LINE_HEIGHTS, LETTER_SPACINGS } from "../../theme";
import { useToast } from "../ToastProvider";
import { useAuth } from "../../context/AuthContext";
import { createApiMutationFn, useApiQuery } from "../../hooks/useApi";
import { CACHE_TIERS } from "../../utils/cacheConfig";
import UserAvatar from "../ui/UserAvatar";
import { formatUserName } from "../../utils/userFormatters";
import apiConfig from "../../config/apiConfig";
import {
  pickVibeMedia,
  compressImage,
  uploadToCloudinary,
  uploadVideoToCloudinary,
  CLOUDINARY_FOLDERS,
  getBlurPlaceholderUrl,
} from "../../utils/cloudinaryUpload";

const MAX_IMAGES = 5;
const MAX_CAPTION_LENGTH = 2200;
const DRAFT_STORAGE_KEY = "@vibe_create_draft_v3";

const FALLBACK_CATEGORIES = [
  { key: "general", label: "General", icon: "auto-awesome" },
  { key: "achievement", label: "Achievement", icon: "emoji-events" },
  { key: "sports", label: "Sports", icon: "sports-soccer" },
  { key: "arts", label: "Arts & Events", icon: "palette" },
  { key: "life", label: "Campus Life", icon: "local-florist" },
  { key: "official", label: "Official", icon: "school", adminOnly: true },
];

const SUGGESTED_HASHTAGS = [
  "#CampusLife",
  "#Achievements",
  "#SGVPride",
  "#SportsDay",
  "#AnnualFest",
  "#CreativeHub",
];

// Exponential backoff upload retry helper
const uploadWithRetry = async (uploadFn, retries = 2) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await uploadFn();
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((res) => setTimeout(res, 800 * (attempt + 1)));
    }
  }
};

/**
 * CreateVibeModal — Material 3 Creator and Editor for Vibes.
 *
 * Ground-up rewrite solving:
 * 1. Android Edit popup getting stuck or never closing (safe dirty check & dismiss).
 * 2. Category selector clipping on Android (responsive Material 3 chips).
 * 3. Full keyboard adaptation & scrolling without content collapse on Android.
 * 4. Location and hashtags support.
 * 5. Instant draft persistence and reliable submission.
 */
export default function CreateVibeModal({ visible, onClose, editVibe = null }) {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = Boolean(editVibe);

  const isAdmin = user?.role === "admin" || user?.role === "super admin";

  // Dynamic Categories from Server
  const { data: serverCategoriesData } = useApiQuery(
    ["vibeCategories"],
    `${apiConfig.baseUrl}${apiConfig.endpoints.vibes.categories}`,
    {
      ...CACHE_TIERS.VIBES_FEED,
      staleTime: 1000 * 60 * 30,
    }
  );

  const categories = useMemo(() => {
    const rawList =
      Array.isArray(serverCategoriesData?.data) &&
      serverCategoriesData.data.length > 0
        ? serverCategoriesData.data
        : FALLBACK_CATEGORIES;
    return rawList.filter((c) => !c.adminOnly || isAdmin);
  }, [serverCategoriesData, isAdmin]);

  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState("general");
  const [location, setLocation] = useState("");
  const [postAs, setPostAs] = useState(isAdmin ? "school" : "self");
  const [isSpotlight, setIsSpotlight] = useState(false);
  const [isVisibleToDemo, setIsVisibleToDemo] = useState(false);
  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Initial values snapshot to accurately detect user changes without false positives
  const initialValuesRef = useRef(null);
  const isInitializedRef = useRef(false);

  // Keyboard awareness
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isCaptionFocused, setIsCaptionFocused] = useState(false);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, () =>
      setIsKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
      setIsCaptionFocused(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
    setIsCaptionFocused(false);
  }, []);

  // Initialize form state when modal becomes visible
  useEffect(() => {
    if (visible) {
      if (editVibe) {
        const initialCaption = editVibe.caption || "";
        const initialCategory =
          editVibe.category || (isAdmin ? "official" : "general");
        const initialLocation = editVibe.location || "";
        const initialPostAs = editVibe.postAs || (isAdmin ? "school" : "self");
        const initialSpotlight = Boolean(editVibe.isSpotlight);
        const initialVisibleToDemo = Boolean(editVibe.isVisibleToDemo);

        const initialMedia = (editVibe.images || []).map((img) => {
          const rawUrl = typeof img === "string" ? img : img?.url || "";
          const isVideo =
            img?.type === "video" ||
            /\.(mp4|mov|webm|m4v|avi|3gp|mkv|flv|wmv|qt)(\?.*)?$/i.test(rawUrl);
          return {
            id: `edit_${Math.random()}`,
            type: isVideo ? "video" : "image",
            url: rawUrl,
            thumbnailUrl:
              typeof img === "object" ? img?.thumbnailUrl || "" : "",
            duration: typeof img === "object" ? img?.duration || 0 : 0,
            localUri: null,
            uploading: false,
            progress: 100,
            width: typeof img === "object" ? img?.width || 1080 : 1080,
            height: typeof img === "object" ? img?.height || 1080 : 1080,
            aspectRatio:
              typeof img === "object" ? img?.aspectRatio || 1 : 1,
            publicId: typeof img === "object" ? img?.publicId || "" : "",
          };
        });

        setCaption(initialCaption);
        setCategory(initialCategory);
        setLocation(initialLocation);
        setPostAs(initialPostAs);
        setIsSpotlight(initialSpotlight);
        setIsVisibleToDemo(initialVisibleToDemo);
        setImages(initialMedia);

        initialValuesRef.current = {
          caption: initialCaption,
          category: initialCategory,
          location: initialLocation,
          postAs: initialPostAs,
          isSpotlight: initialSpotlight,
          isVisibleToDemo: initialVisibleToDemo,
          imagesLength: initialMedia.length,
        };
        isInitializedRef.current = true;
      } else {
        // Create mode: load draft if available
        AsyncStorage.getItem(DRAFT_STORAGE_KEY)
          .then((raw) => {
            if (raw) {
              try {
                const saved = JSON.parse(raw);
                setCaption(saved.caption || "");
                setCategory(saved.category || "general");
                setLocation(saved.location || "");
              } catch {
                setCaption("");
                setCategory("general");
                setLocation("");
              }
            } else {
              setCaption("");
              setCategory("general");
              setLocation("");
            }
          })
          .catch(() => {});

        setPostAs(isAdmin ? "school" : "self");
        setIsSpotlight(false);
        setIsVisibleToDemo(false);
        setImages([]);

        initialValuesRef.current = {
          caption: "",
          category: "general",
          location: "",
          postAs: isAdmin ? "school" : "self",
          isSpotlight: false,
          isVisibleToDemo: false,
          imagesLength: 0,
        };
        isInitializedRef.current = true;
      }
    } else {
      isInitializedRef.current = false;
      initialValuesRef.current = null;
    }
  }, [visible, editVibe, isAdmin]);

  // Persist draft on text changes (create mode only)
  useEffect(() => {
    if (visible && !isEditing && (caption || location)) {
      AsyncStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({
          caption,
          category,
          location,
        })
      ).catch(() => {});
    }
  }, [visible, caption, category, location, isEditing]);

  const clearDraft = useCallback(() => {
    AsyncStorage.removeItem(DRAFT_STORAGE_KEY).catch(() => {});
  }, []);

  const resetForm = useCallback(() => {
    setCaption("");
    setCategory("general");
    setLocation("");
    setPostAs(isAdmin ? "school" : "self");
    setIsSpotlight(false);
    setImages([]);
    setSubmitting(false);
    isInitializedRef.current = false;
    initialValuesRef.current = null;
    clearDraft();
  }, [isAdmin, clearDraft]);

  // Precise dirty check
  const isDirty = useMemo(() => {
    if (!visible || !isInitializedRef.current || !initialValuesRef.current) {
      return false;
    }
    const init = initialValuesRef.current;
    if (!isEditing) {
      return Boolean(caption.trim() || location.trim() || images.length > 0);
    }
    const captionChanged = caption.trim() !== (init.caption || "").trim();
    const categoryChanged = category !== init.category;
    const locationChanged = location.trim() !== (init.location || "").trim();
    const imagesChanged =
      images.length !== init.imagesLength ||
      images.some((img) => img.localUri || img.uploading);
    const postAsChanged = isAdmin && postAs !== init.postAs;
    const spotlightChanged = isAdmin && isSpotlight !== init.isSpotlight;
    const demoChanged = isAdmin && isVisibleToDemo !== init.isVisibleToDemo;

    return (
      captionChanged ||
      categoryChanged ||
      locationChanged ||
      imagesChanged ||
      postAsChanged ||
      spotlightChanged ||
      demoChanged
    );
  }, [
    visible,
    isEditing,
    caption,
    category,
    location,
    images,
    isAdmin,
    postAs,
    isSpotlight,
    isVisibleToDemo,
  ]);

  const handleClose = useCallback(() => {
    dismissKeyboard();
    if (isDirty) {
      Alert.alert(
        isEditing ? "Discard Changes?" : "Discard Vibe?",
        isEditing
          ? "Any unsaved changes will be lost."
          : "Your draft will be removed.",
        [
          { text: "Keep Editing", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => {
              resetForm();
              onClose();
            },
          },
        ]
      );
    } else {
      resetForm();
      onClose();
    }
  }, [dismissKeyboard, isDirty, isEditing, resetForm, onClose]);

  const hasVideo = images.some((img) => img.type === "video");

  // Parallel Photo Picking
  const handleAddPhotos = useCallback(
    async (source) => {
      dismissKeyboard();
      if (hasVideo) {
        Alert.alert(
          "Switch to Photos?",
          "A Vibe can contain either 1 video or up to 5 photos. Selecting photos will replace your video.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Replace Video",
              style: "destructive",
              onPress: () => {
                setImages([]);
                setTimeout(() => handleAddPhotos(source), 200);
              },
            },
          ]
        );
        return;
      }

      if (images.length >= MAX_IMAGES) {
        showToast(`Maximum ${MAX_IMAGES} photos allowed per vibe`, "warning");
        return;
      }

      try {
        const remainingSlots = MAX_IMAGES - images.length;
        const picked = await pickVibeMedia(source, "images", remainingSlots);
        if (!picked || picked.length === 0) return;

        const newPhotosToUpload = picked.slice(0, remainingSlots);

        // If video picked by mistake in gallery
        if (newPhotosToUpload[0]?.type === "video") {
          const video = newPhotosToUpload[0];
          const videoId = `${Date.now()}_${Math.random()}`;
          const videoItem = {
            id: videoId,
            type: "video",
            localUri: video.uri,
            duration: video.duration || 0,
            url: null,
            uploading: true,
            progress: 0,
            width: video.width,
            height: video.height,
            aspectRatio: video.aspectRatio,
          };
          setImages([videoItem]);

          (async () => {
            try {
              const result = await uploadWithRetry(() =>
                uploadVideoToCloudinary(video.uri, (progress) => {
                  setImages((prev) =>
                    prev.map((item) =>
                      item.id === videoId ? { ...item, progress } : item
                    )
                  );
                })
              );

              setImages((prev) =>
                prev.map((item) =>
                  item.id === videoId
                    ? {
                        ...item,
                        url: result.url,
                        publicId: result.publicId,
                        thumbnailUrl: result.thumbnailUrl,
                        duration: result.duration || item.duration,
                        uploading: false,
                        progress: 100,
                      }
                    : item
                )
              );
            } catch (err) {
              showToast(err.message || "Failed to upload video", "error");
              setImages([]);
            }
          })();
          return;
        }

        const placeholderItems = newPhotosToUpload.map((photo) => ({
          id: `${Date.now()}_${Math.random()}`,
          type: "image",
          localUri: photo.uri,
          url: null,
          uploading: true,
          progress: 0,
          width: photo.width,
          height: photo.height,
          aspectRatio: photo.aspectRatio,
        }));

        setImages((prev) => [
          ...prev.filter((i) => i.type !== "video"),
          ...placeholderItems,
        ]);

        await Promise.all(
          placeholderItems.map(async (item) => {
            try {
              const compressedUri = await compressImage(item.localUri);
              const result = await uploadWithRetry(() =>
                uploadToCloudinary(
                  compressedUri,
                  (progress) => {
                    setImages((prev) =>
                      prev.map((img) =>
                        img.id === item.id ? { ...img, progress } : img
                      )
                    );
                  },
                  {
                    folder: CLOUDINARY_FOLDERS.VIBES_IMAGES,
                    fileNamePrefix: "vibe_img",
                  }
                )
              );

              setImages((prev) =>
                prev.map((img) =>
                  img.id === item.id
                    ? {
                        ...img,
                        url: result.url,
                        publicId: result.publicId,
                        uploading: false,
                        progress: 100,
                      }
                    : img
                )
              );
            } catch (err) {
              showToast(err.message || "Failed to upload photo", "error");
              setImages((prev) => prev.filter((img) => img.id !== item.id));
            }
          })
        );
      } catch (error) {
        showToast(error.message || "Error selecting photos", "error");
      }
    },
    [dismissKeyboard, hasVideo, images.length, showToast]
  );

  // Video Picking
  const handleAddVideo = useCallback(
    async (source) => {
      dismissKeyboard();
      if (images.length > 0 && !hasVideo) {
        Alert.alert(
          "Switch to Video?",
          "A Vibe can contain either 1 video or up to 5 photos. Selecting a video will replace your selected photos.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Replace Photos",
              style: "destructive",
              onPress: () => {
                setImages([]);
                setTimeout(() => handleAddVideo(source), 200);
              },
            },
          ]
        );
        return;
      }

      try {
        const picked = await pickVibeMedia(source, "videos", 1);
        if (!picked || picked.length === 0) return;

        const video = picked[0];
        const videoId = `${Date.now()}_${Math.random()}`;
        const newVideo = {
          id: videoId,
          type: "video",
          localUri: video.uri,
          duration: video.duration || 0,
          url: null,
          uploading: true,
          progress: 0,
          width: video.width,
          height: video.height,
          aspectRatio: video.aspectRatio,
        };

        setImages([newVideo]);

        (async () => {
          try {
            const result = await uploadWithRetry(() =>
              uploadVideoToCloudinary(video.uri, (progress) => {
                setImages((prev) =>
                  prev.map((item) =>
                    item.id === videoId ? { ...item, progress } : item
                  )
                );
              })
            );

            setImages((prev) =>
              prev.map((item) =>
                item.id === videoId
                  ? {
                      ...item,
                      url: result.url,
                      publicId: result.publicId,
                      thumbnailUrl: result.thumbnailUrl,
                      duration: result.duration || item.duration,
                      uploading: false,
                      progress: 100,
                    }
                  : item
              )
            );
          } catch (err) {
            showToast(err.message || "Failed to upload video", "error");
            setImages([]);
          }
        })();
      } catch (error) {
        showToast(error.message || "Error selecting video", "error");
      }
    },
    [dismissKeyboard, images.length, hasVideo, showToast]
  );

  const handleRemoveImage = useCallback((index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleAppendHashtag = useCallback((tag) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setCaption((prev) => {
      const cleanPrev = prev.trim();
      if (!cleanPrev) return tag;
      if (cleanPrev.includes(tag)) return prev;
      return `${cleanPrev} ${tag}`;
    });
  }, []);

  // Submit Vibe
  const handleSubmit = useCallback(async () => {
    dismissKeyboard();
    if (images.length === 0) {
      showToast("Please add at least one photo or video", "warning");
      return;
    }

    const stillUploading = images.some((img) => img.uploading);
    if (stillUploading) {
      showToast("Please wait for media to finish uploading", "warning");
      return;
    }

    const finalImages = images
      .filter((img) => img.url)
      .map((img) => ({
        type: img.type || "image",
        url: img.url,
        thumbnailUrl: img.thumbnailUrl || "",
        duration: img.duration || 0,
        publicId: img.publicId || "",
        width: img.width || 1080,
        height: img.height || 1080,
        aspectRatio: img.aspectRatio || 1,
      }));

    if (finalImages.length === 0) {
      showToast("Please upload at least one photo or video", "warning");
      return;
    }

    setSubmitting(true);

    try {
      const vibePayload = {
        caption: caption.trim(),
        category,
        location: location.trim(),
        postAs: isAdmin ? postAs : "self",
        images: finalImages,
        ...(isAdmin ? { isSpotlight, isVisibleToDemo } : {}),
      };

      const url = isEditing
        ? `${apiConfig.baseUrl}${apiConfig.endpoints.vibes.update(
            editVibe._id
          )}`
        : `${apiConfig.baseUrl}${apiConfig.endpoints.vibes.create}`;
      const method = isEditing ? "PUT" : "POST";

      const mutationFn = createApiMutationFn(url, method);
      const res = await mutationFn(vibePayload);

      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      ).catch(() => {});
      showToast(
        res.message ||
          (isAdmin ? "Vibe published!" : "Vibe submitted for review!"),
        "success",
        3000
      );

      // Eagerly update caches
      if (isEditing && editVibe?._id && res?.data) {
        const updatedVibe = res.data;
        const updateVibesCache = (oldData) => {
          if (!oldData?.pages) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              data: (page.data || []).map((v) =>
                v._id === editVibe._id ? { ...v, ...updatedVibe } : v
              ),
            })),
          };
        };

        queryClient.setQueriesData({ queryKey: ["vibes"] }, updateVibesCache);
        queryClient.setQueriesData({ queryKey: ["myVibes"] }, updateVibesCache);
        queryClient.setQueriesData({ queryKey: ["savedVibes"] }, updateVibesCache);
        queryClient.setQueriesData({ queryKey: ["userVibes"] }, updateVibesCache);

        queryClient.setQueryData(["vibeSpotlight"], (old) => {
          if (!old?.data || old.data._id !== editVibe._id) return old;
          return { ...old, data: { ...old.data, ...updatedVibe } };
        });

        queryClient.setQueryData(
          ["targetVibe", String(editVibe._id)],
          (old) => {
            if (!old?.data) return old;
            return { ...old, data: { ...old.data, ...updatedVibe } };
          }
        );
      }

      // Invalidate relevant queries for sync
      queryClient.invalidateQueries({ queryKey: ["vibes"] });
      queryClient.invalidateQueries({ queryKey: ["myVibes"] });
      queryClient.invalidateQueries({ queryKey: ["savedVibes"] });
      queryClient.invalidateQueries({ queryKey: ["userVibes"] });
      queryClient.invalidateQueries({ queryKey: ["vibeHighlights"] });
      queryClient.invalidateQueries({ queryKey: ["vibeSpotlight"] });
      queryClient.invalidateQueries({ queryKey: ["pendingVibes"] });
      queryClient.invalidateQueries({ queryKey: ["pendingVibesCount"] });
      if (isEditing && editVibe?._id) {
        queryClient.invalidateQueries({
          queryKey: ["targetVibe", String(editVibe._id)],
        });
      }

      resetForm();
      onClose();
    } catch (error) {
      showToast(error.message || "Failed to publish vibe", "error");
    } finally {
      setSubmitting(false);
    }
  }, [
    dismissKeyboard,
    images,
    caption,
    category,
    location,
    isAdmin,
    postAs,
    isSpotlight,
    isVisibleToDemo,
    isEditing,
    editVibe,
    showToast,
    queryClient,
    resetForm,
    onClose,
  ]);

  const canSubmit =
    images.length > 0 && !submitting && !images.some((img) => img.uploading);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
        style={styles.overlay}
      >
        {/* Backdrop tap to dismiss */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => {
            if (isKeyboardVisible) {
              dismissKeyboard();
            } else {
              handleClose();
            }
          }}
          accessibilityLabel="Dismiss modal backdrop"
        />

        <View
          style={[
            styles.container,
            { backgroundColor: colors.surfaceContainerHigh || colors.surface },
          ]}
        >
          {/* ──── Header ──── */}
          <View
            style={[
              styles.header,
              { borderBottomColor: colors.outlineVariant || "rgba(0,0,0,0.08)" },
            ]}
          >
            <Pressable
              onPress={handleClose}
              hitSlop={12}
              style={styles.headerIconButton}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <MaterialIcons name="close" size={24} color={colors.onSurface} />
            </Pressable>

            <Text style={[styles.headerTitle, { color: colors.onSurface }]}>
              {isEditing ? "Edit Vibe" : "New Vibe"}
            </Text>

            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit}
              style={[
                styles.publishButton,
                {
                  backgroundColor: canSubmit
                    ? colors.primary
                    : colors.surfaceContainerHighest,
                },
              ]}
              accessibilityRole="button"
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text
                  style={[
                    styles.publishText,
                    {
                      color: canSubmit ? "#fff" : colors.onSurfaceVariant,
                    },
                  ]}
                >
                  {isEditing ? "Save" : isAdmin ? "Share" : "Submit"}
                </Text>
              )}
            </Pressable>
          </View>

          {/* ──── Scrollable Form Content ──── */}
          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContentContainer}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            showsVerticalScrollIndicator={false}
          >
            {/* Non-Admin Approval Notice Banner */}
            {!isAdmin && !isEditing && (
              <View
                style={[
                  styles.infoBanner,
                  { backgroundColor: colors.primaryContainer },
                ]}
              >
                <MaterialIcons
                  name="verified-user"
                  size={18}
                  color={colors.onPrimaryContainer}
                />
                <Text
                  style={[
                    styles.infoBannerText,
                    { color: colors.onPrimaryContainer },
                  ]}
                >
                  Your vibe will appear on the school feed once approved by
                  administrators.
                </Text>
              </View>
            )}

            {/* Admin Identity Selector */}
            {isAdmin && (
              <View style={styles.section}>
                <Text
                  style={[
                    styles.sectionLabel,
                    { color: colors.onSurfaceVariant },
                  ]}
                >
                  POSTING AS
                </Text>
                <View style={styles.identityRow}>
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      setPostAs("school");
                      setCategory("official");
                    }}
                    style={[
                      styles.identityCard,
                      {
                        backgroundColor:
                          postAs === "school"
                            ? "#FFF8E1"
                            : colors.surfaceContainerHighest,
                        borderColor:
                          postAs === "school" ? "#FFB300" : "transparent",
                      },
                    ]}
                  >
                    <View style={styles.identityIconBox}>
                      <Image
                        source={require("../../assets/images/icon.png")}
                        style={{ width: "100%", height: "100%", borderRadius: 18 }}
                        contentFit="cover"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Text
                          style={[
                            styles.identityTitle,
                            {
                              color:
                                postAs === "school"
                                  ? colors.primary
                                  : colors.onSurface,
                            },
                          ]}
                        >
                          SGV School
                        </Text>
                        <MaterialIcons
                          name="verified"
                          size={14}
                          color="#FFB300"
                        />
                      </View>
                      <Text
                        style={[
                          styles.identitySub,
                          { color: colors.onSurfaceVariant },
                        ]}
                      >
                        Official School Profile
                      </Text>
                    </View>
                    {postAs === "school" && (
                      <MaterialIcons
                        name="check-circle"
                        size={20}
                        color="#F57F17"
                      />
                    )}
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      setPostAs("self");
                      if (category === "official") {
                        setCategory("general");
                      }
                    }}
                    style={[
                      styles.identityCard,
                      {
                        backgroundColor:
                          postAs === "self"
                            ? colors.primaryContainer
                            : colors.surfaceContainerHighest,
                        borderColor:
                          postAs === "self" ? colors.primary : "transparent",
                      },
                    ]}
                  >
                    <UserAvatar
                      photoUrl={user?.profilePhoto}
                      name={formatUserName(user?.name, "User")}
                      role={user?.role}
                      size={34}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.identityTitle,
                          {
                            color:
                              postAs === "self"
                                ? colors.primary
                                : colors.onSurface,
                          },
                        ]}
                      >
                        Myself
                      </Text>
                      <Text
                        style={[
                          styles.identitySub,
                          { color: colors.onSurfaceVariant },
                        ]}
                      >
                        {formatUserName(user?.name, "Personal Account")}
                      </Text>
                    </View>
                    {postAs === "self" && (
                      <MaterialIcons
                        name="check-circle"
                        size={20}
                        color={colors.primary}
                      />
                    )}
                  </Pressable>
                </View>
              </View>
            )}

            {/* Admin Home Spotlight Toggle */}
            {isAdmin && (
              <View style={styles.section}>
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(
                      Haptics.ImpactFeedbackStyle.Light
                    ).catch(() => {});
                    setIsSpotlight((prev) => !prev);
                  }}
                  style={[
                    styles.spotlightToggleCard,
                    {
                      backgroundColor: isSpotlight
                        ? "#FFFBEB"
                        : colors.surfaceContainerHighest,
                      borderColor: isSpotlight
                        ? "#F59E0B"
                        : colors.outlineVariant || "transparent",
                    },
                  ]}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: isSpotlight }}
                >
                  <View
                    style={[
                      styles.spotlightIconWrap,
                      {
                        backgroundColor: isSpotlight
                          ? "#FDE68A"
                          : colors.surfaceContainer,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="auto-awesome"
                      size={20}
                      color={isSpotlight ? "#D97706" : colors.onSurfaceVariant}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.spotlightToggleTitle,
                        {
                          color: isSpotlight ? "#B45309" : colors.onSurface,
                        },
                      ]}
                    >
                      Feature on Home Spotlight
                    </Text>
                    <Text
                      style={[
                        styles.spotlightToggleSub,
                        { color: colors.onSurfaceVariant },
                      ]}
                    >
                      Show this vibe prominently in the Home Screen Spotlight card
                    </Text>
                  </View>
                  <MaterialIcons
                    name={isSpotlight ? "toggle-on" : "toggle-off"}
                    size={36}
                    color={isSpotlight ? "#D97706" : colors.onSurfaceVariant}
                  />
                </Pressable>
              </View>
            )}

            {/* Admin Visible to Demo Users Toggle */}
            {isAdmin && (
              <View style={styles.section}>
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(
                      Haptics.ImpactFeedbackStyle.Light
                    ).catch(() => {});
                    setIsVisibleToDemo((prev) => !prev);
                  }}
                  style={[
                    styles.spotlightToggleCard,
                    {
                      backgroundColor: isVisibleToDemo
                        ? "#ECFDF5"
                        : colors.surfaceContainerHighest,
                      borderColor: isVisibleToDemo
                        ? "#10B981"
                        : colors.outlineVariant || "transparent",
                    },
                  ]}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: isVisibleToDemo }}
                >
                  <View
                    style={[
                      styles.spotlightIconWrap,
                      {
                        backgroundColor: isVisibleToDemo
                          ? "#A7F3D0"
                          : colors.surfaceContainer,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name={isVisibleToDemo ? "public" : "public-off"}
                      size={20}
                      color={isVisibleToDemo ? "#059669" : colors.onSurfaceVariant}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.spotlightToggleTitle,
                        {
                          color: isVisibleToDemo ? "#047857" : colors.onSurface,
                        },
                      ]}
                    >
                      Visible to Demo Users
                    </Text>
                    <Text
                      style={[
                        styles.spotlightToggleSub,
                        { color: colors.onSurfaceVariant },
                      ]}
                    >
                      Allow non-logged-in demo visitors to view this vibe in the feed
                    </Text>
                  </View>
                  <MaterialIcons
                    name={isVisibleToDemo ? "toggle-on" : "toggle-off"}
                    size={36}
                    color={isVisibleToDemo ? "#059669" : colors.onSurfaceVariant}
                  />
                </Pressable>
              </View>
            )}

            {/* ──── Media Upload Section ──── */}
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Text
                  style={[
                    styles.sectionLabel,
                    { color: colors.onSurfaceVariant, marginBottom: 0 },
                  ]}
                >
                  MEDIA{" "}
                  {hasVideo
                    ? "(1 Video)"
                    : `(${images.length}/${MAX_IMAGES} Photos)`}
                </Text>
                <Text
                  style={{
                    fontSize: FONT_SIZES.xs,
                    color: colors.onSurfaceVariant,
                    fontFamily: FONTS.regular,
                  }}
                >
                  {hasVideo ? "Max 30s video" : "Up to 5 photos"}
                </Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.imageScroll}
              >
                {images.map((img, index) => (
                  <View key={img.id || index} style={styles.imageThumbWrapper}>
                    <Image
                      source={{
                        uri: img.thumbnailUrl || img.localUri || img.url,
                      }}
                      placeholder={
                        img.url
                          ? { uri: getBlurPlaceholderUrl(img.url) }
                          : undefined
                      }
                      style={styles.imageThumb}
                      contentFit="cover"
                      transition={150}
                    />
                    {/* Video Duration Badge */}
                    {img.type === "video" && (
                      <View style={styles.videoDurationBadge}>
                        <MaterialIcons name="videocam" size={12} color="#fff" />
                        <Text style={styles.videoDurationText}>
                          {img.duration
                            ? `0:${img.duration < 10 ? "0" : ""}${img.duration}`
                            : "VIDEO"}
                        </Text>
                      </View>
                    )}
                    {img.uploading && (
                      <View style={styles.uploadOverlay}>
                        <ActivityIndicator size="small" color="#fff" />
                        <Text style={styles.uploadPercent}>
                          {img.progress > 0
                            ? `${img.progress}%`
                            : "Optimizing..."}
                        </Text>
                      </View>
                    )}
                    {!img.uploading && (
                      <Pressable
                        onPress={() => handleRemoveImage(index)}
                        style={styles.removeButton}
                        hitSlop={8}
                        accessibilityLabel="Remove media"
                      >
                        <MaterialIcons name="close" size={14} color="#fff" />
                      </Pressable>
                    )}
                  </View>
                ))}

                {/* Media Picker Buttons */}
                {images.length === 0 ? (
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Pressable
                      onPress={() => handleAddPhotos("gallery")}
                      style={[
                        styles.addMediaLargeButton,
                        {
                          backgroundColor: colors.surfaceContainerHighest,
                          borderColor:
                            colors.outlineVariant || "rgba(0,0,0,0.08)",
                        },
                      ]}
                    >
                      <MaterialIcons
                        name="photo-library"
                        size={24}
                        color={colors.primary}
                      />
                      <Text
                        style={[
                          styles.addImageText,
                          { color: colors.onSurface },
                        ]}
                      >
                        Photos
                      </Text>
                      <Text
                        style={[
                          styles.addMediaSubtext,
                          { color: colors.onSurfaceVariant },
                        ]}
                      >
                        Up to 5
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => handleAddVideo("gallery")}
                      style={[
                        styles.addMediaLargeButton,
                        {
                          backgroundColor: colors.surfaceContainerHighest,
                          borderColor:
                            colors.outlineVariant || "rgba(0,0,0,0.08)",
                        },
                      ]}
                    >
                      <MaterialIcons
                        name="videocam"
                        size={24}
                        color={colors.tertiary || "#6D28D9"}
                      />
                      <Text
                        style={[
                          styles.addImageText,
                          { color: colors.onSurface },
                        ]}
                      >
                        Video
                      </Text>
                      <Text
                        style={[
                          styles.addMediaSubtext,
                          { color: colors.onSurfaceVariant },
                        ]}
                      >
                        Max 30s
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => handleAddPhotos("camera")}
                      style={[
                        styles.addMediaLargeButton,
                        {
                          backgroundColor: colors.surfaceContainerHighest,
                          borderColor:
                            colors.outlineVariant || "rgba(0,0,0,0.08)",
                        },
                      ]}
                    >
                      <MaterialIcons
                        name="photo-camera"
                        size={24}
                        color={colors.tertiary || "#0284C7"}
                      />
                      <Text
                        style={[
                          styles.addImageText,
                          { color: colors.onSurface },
                        ]}
                      >
                        Camera
                      </Text>
                      <Text
                        style={[
                          styles.addMediaSubtext,
                          { color: colors.onSurfaceVariant },
                        ]}
                      >
                        Snap
                      </Text>
                    </Pressable>
                  </View>
                ) : !hasVideo && images.length < MAX_IMAGES ? (
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Pressable
                      onPress={() => handleAddPhotos("gallery")}
                      style={[
                        styles.addImageButton,
                        {
                          backgroundColor: colors.surfaceContainerHighest,
                          borderColor:
                            colors.outlineVariant || "rgba(0,0,0,0.08)",
                        },
                      ]}
                    >
                      <MaterialIcons
                        name="add-photo-alternate"
                        size={22}
                        color={colors.primary}
                      />
                      <Text
                        style={[
                          styles.addImageText,
                          { color: colors.onSurfaceVariant },
                        ]}
                      >
                        + Photo
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </ScrollView>
            </View>

            {/* ──── Material 3 Category Chips (No Android Dropdown Clipping) ──── */}
            <View style={styles.section}>
              <Text
                style={[
                  styles.sectionLabel,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                CATEGORY
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryChipsContainer}
              >
                {categories.map((cat) => {
                  const isSelected = cat.key === category;
                  return (
                    <Pressable
                      key={cat.key}
                      onPress={() => {
                        Haptics.impactAsync(
                          Haptics.ImpactFeedbackStyle.Light
                        ).catch(() => {});
                        setCategory(cat.key);
                      }}
                      style={[
                        styles.categoryChip,
                        {
                          backgroundColor: isSelected
                            ? colors.primaryContainer
                            : colors.surfaceContainerHighest,
                          borderColor: isSelected
                            ? colors.primary
                            : "transparent",
                        },
                      ]}
                      accessibilityRole="button"
                    >
                      <MaterialIcons
                        name={cat.icon || "auto-awesome"}
                        size={16}
                        color={
                          isSelected
                            ? colors.onPrimaryContainer
                            : colors.onSurfaceVariant
                        }
                      />
                      <Text
                        style={[
                          styles.categoryChipText,
                          {
                            color: isSelected
                              ? colors.onPrimaryContainer
                              : colors.onSurface,
                            fontFamily: isSelected
                              ? FONTS.bold
                              : FONTS.medium,
                          },
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* ──── Caption Input ──── */}
            <View style={styles.section}>
              <View style={styles.captionHeaderRow}>
                <Text
                  style={[
                    styles.sectionLabel,
                    { color: colors.onSurfaceVariant, marginBottom: 0 },
                  ]}
                >
                  CAPTION
                </Text>

                {(isKeyboardVisible || isCaptionFocused) && (
                  <Pressable
                    onPress={dismissKeyboard}
                    style={[
                      styles.doneKeypadButton,
                      { backgroundColor: colors.primaryContainer },
                    ]}
                    hitSlop={8}
                  >
                    <MaterialIcons
                      name="keyboard-hide"
                      size={15}
                      color={colors.onPrimaryContainer}
                    />
                    <Text
                      style={[
                        styles.doneKeypadText,
                        { color: colors.onPrimaryContainer },
                      ]}
                    >
                      Done
                    </Text>
                  </Pressable>
                )}
              </View>

              <TextInput
                placeholder="Write a caption for your vibe..."
                placeholderTextColor={colors.onSurfaceVariant}
                value={caption}
                onChangeText={setCaption}
                onFocus={() => setIsCaptionFocused(true)}
                onBlur={() => setIsCaptionFocused(false)}
                maxLength={MAX_CAPTION_LENGTH}
                multiline
                numberOfLines={4}
                style={[
                  styles.captionInput,
                  {
                    backgroundColor: colors.surfaceContainerHighest,
                    color: colors.onSurface,
                    borderColor: isCaptionFocused
                      ? colors.primary
                      : colors.outlineVariant || "transparent",
                  },
                ]}
              />
              <Text
                style={[styles.charCount, { color: colors.onSurfaceVariant }]}
              >
                {caption.length}/{MAX_CAPTION_LENGTH}
              </Text>

              {/* Hashtag Quick-Tap Suggestions */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hashtagsRow}
              >
                {SUGGESTED_HASHTAGS.map((tag) => (
                  <Pressable
                    key={tag}
                    onPress={() => handleAppendHashtag(tag)}
                    style={[
                      styles.hashtagChip,
                      {
                        backgroundColor: colors.surfaceContainerHighest,
                        borderColor: colors.outlineVariant || "transparent",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.hashtagChipText,
                        { color: colors.primary },
                      ]}
                    >
                      {tag}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* ──── Location / Campus Spot ──── */}
            <View style={styles.section}>
              <Text
                style={[
                  styles.sectionLabel,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                CAMPUS SPOT (OPTIONAL)
              </Text>
              <View
                style={[
                  styles.locationInputWrapper,
                  {
                    backgroundColor: colors.surfaceContainerHighest,
                    borderColor: colors.outlineVariant || "transparent",
                  },
                ]}
              >
                <MaterialIcons
                  name="place"
                  size={18}
                  color={colors.onSurfaceVariant}
                />
                <TextInput
                  placeholder="e.g. Main Auditorium, Library, Sports Ground"
                  placeholderTextColor={colors.onSurfaceVariant}
                  value={location}
                  onChangeText={setLocation}
                  style={[styles.locationInput, { color: colors.onSurface }]}
                  maxLength={60}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  container: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "94%",
    height: "94%",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerIconButton: {
    padding: 6,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
  },
  publishButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 72,
    alignItems: "center",
  },
  publishText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 18,
  },
  scrollContentContainer: {
    paddingBottom: 48,
    paddingTop: 8,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 14,
    marginTop: 6,
  },
  infoBannerText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
    flex: 1,
    lineHeight: LINE_HEIGHTS.xs,
  },
  section: {
    marginTop: 18,
  },
  sectionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
    letterSpacing: LETTER_SPACINGS.xs,
    marginBottom: 8,
  },
  identityRow: {
    gap: 8,
  },
  identityCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 12,
  },
  identityIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  identityTitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  identitySub: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
  },
  spotlightToggleCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 12,
  },
  spotlightIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  spotlightToggleTitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
  },
  spotlightToggleSub: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    marginTop: 2,
  },
  imageScroll: {
    gap: 10,
    paddingBottom: 4,
  },
  imageThumbWrapper: {
    width: 96,
    height: 96,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  imageThumb: {
    width: "100%",
    height: "100%",
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  uploadPercent: {
    color: "#fff",
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
  removeButton: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  videoDurationBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  videoDurationText: {
    color: "#fff",
    fontSize: FONT_SIZES.micro || 11,
    fontFamily: FONTS.bold,
  },
  addMediaLargeButton: {
    width: 96,
    height: 96,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    gap: 2,
  },
  addImageButton: {
    width: 96,
    height: 96,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  addImageText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
  addMediaSubtext: {
    fontSize: FONT_SIZES.micro || 11,
    fontFamily: FONTS.regular,
  },
  categoryChipsContainer: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  categoryChipText: {
    fontSize: FONT_SIZES.xs,
  },
  captionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  doneKeypadButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  doneKeypadText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
  captionInput: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    minHeight: 100,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: FONT_SIZES.xs,
    textAlign: "right",
    marginTop: 4,
  },
  hashtagsRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },
  hashtagChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  hashtagChipText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
  },
  locationInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  locationInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
  },
});
