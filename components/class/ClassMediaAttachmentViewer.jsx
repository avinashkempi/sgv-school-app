import React, { useState, memo } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  Linking,
  Platform,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as Haptics from "expo-haptics";
import { useTheme, FONTS, FONT_SIZES } from "../../theme";
import { getDocumentMeta } from "../../utils/cloudinaryUpload";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

/**
 * Universal Multi-Format Media & Attachment Viewer for Classroom Posts
 *
 * @param {Array} attachments - Array of attachment strings or objects { url, name, fileType, size }
 */
export function ClassMediaAttachmentViewer({ attachments = [] }) {
  const { colors, mode } = useTheme();
  const isDark = mode === "dark";

  const [selectedImage, setSelectedImage] = useState(null);

  if (!attachments || attachments.length === 0) return null;

  // Normalize attachments into rich metadata objects
  const items = attachments.map((att) => {
    return getDocumentMeta(att);
  });

  const handleOpenAttachment = async (meta) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    if (!meta.url) return;

    if (meta.type === "image") {
      setSelectedImage(meta.url);
      return;
    }

    if (meta.type === "video") {
      // Open in browser or in-app browser for native smooth hardware decoding
      try {
        await WebBrowser.openBrowserAsync(meta.url);
      } catch {
        Linking.openURL(meta.url).catch(() => {});
      }
      return;
    }

    if (meta.type === "pdf") {
      try {
        await WebBrowser.openBrowserAsync(meta.url);
      } catch {
        Linking.openURL(meta.url).catch(() => {});
      }
      return;
    }

    if (meta.type === "pptx" || meta.type === "docx" || meta.type === "xlsx") {
      // Use Google Docs Viewer for seamless online slide/doc reading on mobile without requiring Office apps
      const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(
        meta.url
      )}&embedded=true`;
      try {
        await WebBrowser.openBrowserAsync(viewerUrl);
      } catch {
        Linking.openURL(meta.url).catch(() => {});
      }
      return;
    }

    // Default: Web Link or general file
    try {
      if (meta.url.startsWith("http://") || meta.url.startsWith("https://")) {
        await WebBrowser.openBrowserAsync(meta.url);
      } else {
        Linking.openURL(meta.url).catch(() => {});
      }
    } catch {
      Linking.openURL(meta.url).catch(() => {});
    }
  };

  // Group images vs documents/videos
  const imageItems = items.filter((i) => i.type === "image");
  const nonImageItems = items.filter((i) => i.type !== "image");

  return (
    <View style={styles.container}>
      {/* 1. Image Gallery / Thumbnails Grid */}
      {imageItems.length > 0 && (
        <View style={styles.imageGrid}>
          {imageItems.map((item, idx) => (
            <Pressable
              key={`img-${idx}`}
              onPress={() => handleOpenAttachment(item)}
              style={({ pressed }) => [
                styles.imageCard,
                {
                  backgroundColor: isDark
                    ? colors.surfaceContainerHighest
                    : colors.surfaceContainerHigh,
                  borderColor: colors.outlineVariant,
                  opacity: pressed ? 0.85 : 1,
                  width: imageItems.length === 1 ? "100%" : (SCREEN_WIDTH - 80) / 2,
                  height: imageItems.length === 1 ? 190 : 130,
                },
              ]}
              accessibilityRole="imagebutton"
              accessibilityLabel="View photo attachment in full screen"
            >
              <Image
                source={{ uri: item.url }}
                style={styles.image}
                contentFit="cover"
                transition={200}
              />
              <View style={styles.imageZoomBadge}>
                <MaterialIcons name="zoom-out-map" size={14} color="#FFFFFF" />
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {/* 2. Documents, Videos & Web Links List */}
      {nonImageItems.length > 0 && (
        <View style={styles.docList}>
          {nonImageItems.map((item, idx) => {
            const isVideo = item.type === "video";
            return (
              <Pressable
                key={`doc-${idx}`}
                onPress={() => handleOpenAttachment(item)}
                style={({ pressed }) => [
                  styles.docCard,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceContainerLow
                      : colors.surfaceContainerLowest,
                    borderColor: item.color + "35",
                    opacity: pressed ? 0.85 : 1,
                    transform: [{ scale: pressed ? 0.99 : 1 }],
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Open ${item.label}: ${item.name}`}
              >
                {/* Left Icon Pill */}
                <View
                  style={[
                    styles.docIconWrap,
                    { backgroundColor: item.bgColor || item.color + "18" },
                  ]}
                >
                  {item.type === "pptx" ? (
                    <FontAwesome5 name="file-powerpoint" size={20} color={item.color} />
                  ) : item.type === "docx" ? (
                    <FontAwesome5 name="file-word" size={20} color={item.color} />
                  ) : item.type === "xlsx" ? (
                    <FontAwesome5 name="file-excel" size={20} color={item.color} />
                  ) : item.type === "pdf" ? (
                    <FontAwesome5 name="file-pdf" size={20} color={item.color} />
                  ) : (
                    <MaterialIcons name={item.icon} size={22} color={item.color} />
                  )}
                </View>

                {/* Center File Info */}
                <View style={styles.docInfo}>
                  <Text
                    style={[styles.docName, { color: colors.onSurface }]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <View style={styles.docMetaRow}>
                    <View
                      style={[
                        styles.extensionBadge,
                        { backgroundColor: item.color + "18" },
                      ]}
                    >
                      <Text
                        style={[styles.extensionText, { color: item.color }]}
                      >
                        {item.extension}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.docLabel,
                        { color: colors.onSurfaceVariant },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </View>
                </View>

                {/* Right Action Button */}
                <View
                  style={[
                    styles.actionIconWrap,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(0,0,0,0.04)",
                    },
                  ]}
                >
                  <MaterialIcons
                    name={isVideo ? "play-arrow" : "open-in-new"}
                    size={18}
                    color={item.color}
                  />
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Full-Screen Image Lightbox Modal */}
      {selectedImage && (
        <Modal
          visible={!!selectedImage}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedImage(null)}
        >
          <View style={styles.lightboxContainer}>
            <Pressable
              style={styles.lightboxCloseBtn}
              onPress={() => setSelectedImage(null)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <MaterialIcons name="close" size={26} color="#FFFFFF" />
            </Pressable>

            <Image
              source={{ uri: selectedImage }}
              style={styles.lightboxImage}
              contentFit="contain"
            />
          </View>
        </Modal>
      )}
    </View>
  );
}

export default memo(ClassMediaAttachmentViewer);

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    gap: 8,
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  imageCard: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageZoomBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 8,
    padding: 4,
  },
  docList: {
    gap: 8,
  },
  docCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  docIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  docInfo: {
    flex: 1,
    minWidth: 0,
  },
  docName: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.bold,
    marginBottom: 3,
  },
  docMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  extensionBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  extensionText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
    letterSpacing: 0.5,
  },
  docLabel: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
  },
  actionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  lightboxContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.94)",
    justifyContent: "center",
    alignItems: "center",
  },
  lightboxCloseBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 54 : 32,
    right: 20,
    zIndex: 10,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 20,
    padding: 8,
  },
  lightboxImage: {
    width: SCREEN_WIDTH,
    height: "80%",
  },
});
