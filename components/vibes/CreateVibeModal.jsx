import React, { useState, useCallback } from 'react';
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
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../theme';
import { useToast } from '../ToastProvider';
import { useAuth } from '../../context/AuthContext';
import { createApiMutationFn } from '../../hooks/useApi';
import apiConfig from '../../config/apiConfig';
import { pickVibeMedia, compressImage, uploadToCloudinary, uploadVideoToCloudinary } from '../../utils/cloudinaryUpload';

const MAX_IMAGES = 5;
const MAX_CAPTION_LENGTH = 2200;

const CATEGORIES = [
  { key: 'general', label: 'General', icon: 'auto-awesome' },
  { key: 'official', label: 'Official', icon: 'school', adminOnly: true },
  { key: 'achievement', label: 'Achievement', icon: 'emoji-events' },
  { key: 'sports', label: 'Sports', icon: 'sports-soccer' },
  { key: 'arts', label: 'Arts & Events', icon: 'palette' },
  { key: 'life', label: 'Campus Life', icon: 'local-florist' },
];

const SUGGESTED_TAGS = ['AnnualDay', 'SportsMeet', 'ScienceExhibition', 'CampusLife', 'ArtShowcase', 'QuizClub'];

export default function CreateVibeModal({ visible, onClose, editVibe = null }) {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!editVibe;

  const isAdmin = user?.role === 'admin' || user?.role === 'super admin';

  const [caption, setCaption] = useState(editVibe?.caption || '');
  const [category, setCategory] = useState(editVibe?.category || (isAdmin ? 'official' : 'general'));
  const [postAs, setPostAs] = useState(editVibe?.postAs || (isAdmin ? 'school' : 'self'));
  const [location, setLocation] = useState(editVibe?.location || '');
  const [images, setImages] = useState(
    editVibe?.images?.map(img => ({
      type: img.type || 'image',
      url: typeof img === 'string' ? img : img.url,
      thumbnailUrl: img.thumbnailUrl || '',
      duration: img.duration || 0,
      localUri: null,
      uploading: false,
      progress: 0,
      width: img.width || 1080,
      height: img.height || 1080,
      aspectRatio: img.aspectRatio || 1,
    })) || []
  );
  const [submitting, setSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    setCaption('');
    setCategory(isAdmin ? 'official' : 'general');
    setPostAs(isAdmin ? 'school' : 'self');
    setLocation('');
    setImages([]);
    setSubmitting(false);
  }, [isAdmin]);

  const handleClose = useCallback(() => {
    if (submitting) return;
    if (caption || images.length > 0) {
      Alert.alert('Discard Vibe?', 'Your draft will not be saved.', [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => { resetForm(); onClose(); } },
      ]);
    } else {
      resetForm();
      onClose();
    }
  }, [submitting, caption, images, resetForm, onClose]);

  const hasVideo = images.some(img => img.type === 'video');

  // Photo Picking (Up to 5 Photos)
  const handleAddPhotos = useCallback(async (source) => {
    if (hasVideo) {
      Alert.alert(
        'Switch to Photos?',
        'A Vibe can contain either 1 video or up to 5 photos. Selecting photos will replace your video.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Replace Video',
            style: 'destructive',
            onPress: () => {
              setImages([]);
              setTimeout(() => handleAddPhotos(source), 200);
            }
          }
        ]
      );
      return;
    }

    if (images.length >= MAX_IMAGES) {
      showToast(`Maximum ${MAX_IMAGES} photos allowed per vibe`, 'warning');
      return;
    }

    try {
      const remainingSlots = MAX_IMAGES - images.length;
      const picked = await pickVibeMedia(source, 'images', remainingSlots);
      if (!picked || picked.length === 0) return;

      const newPhotosToUpload = picked.slice(0, remainingSlots);

      for (const photo of newPhotosToUpload) {
        const imageId = `${Date.now()}_${Math.random()}`;

        if (photo.type === 'video') {
          // If a video was picked, switch to video pipeline
          const videoItem = {
            id: imageId,
            type: 'video',
            localUri: photo.uri,
            duration: photo.duration || 0,
            url: null,
            uploading: true,
            progress: 0,
            width: photo.width,
            height: photo.height,
            aspectRatio: photo.aspectRatio,
          };
          setImages([videoItem]);

          (async () => {
            try {
              const result = await uploadVideoToCloudinary(photo.uri, (progress) => {
                setImages(prev => prev.map(item =>
                  item.id === imageId ? { ...item, progress } : item
                ));
              });

              setImages(prev => prev.map(item =>
                item.id === imageId ? {
                  ...item,
                  url: result.url,
                  publicId: result.publicId,
                  thumbnailUrl: result.thumbnailUrl,
                  duration: result.duration || item.duration,
                  uploading: false,
                  progress: 100,
                } : item
              ));
            } catch (err) {
              showToast(err.message || 'Failed to upload video', 'error');
              setImages([]);
            }
          })();
          return; // Only 1 video permitted
        }

        const newImage = {
          id: imageId,
          type: 'image',
          localUri: photo.uri,
          url: null,
          uploading: true,
          progress: 0,
          width: photo.width,
          height: photo.height,
          aspectRatio: photo.aspectRatio,
        };

        setImages(prev => [...prev.filter(i => i.type !== 'video'), newImage]);

        // Background compress & upload to Cloudinary
        (async () => {
          try {
            const compressedUri = await compressImage(photo.uri);
            const result = await uploadToCloudinary(compressedUri, (progress) => {
              setImages(prev => prev.map(img =>
                img.id === imageId ? { ...img, progress } : img
              ));
            });

            setImages(prev => prev.map(img =>
              img.id === imageId ? {
                ...img,
                url: result.url,
                publicId: result.publicId,
                uploading: false,
                progress: 100
              } : img
            ));
          } catch (err) {
            showToast(err.message || 'Failed to upload photo', 'error');
            setImages(prev => prev.filter(img => img.id !== imageId));
          }
        })();
      }
    } catch (error) {
      showToast(error.message || 'Error selecting photos', 'error');
    }
  }, [hasVideo, images.length, showToast]);

  // Video Picking (Only 1 Video - Max 30s)
  const handleAddVideo = useCallback(async (source) => {
    if (images.length > 0 && !hasVideo) {
      Alert.alert(
        'Switch to Video?',
        'A Vibe can contain either 1 video or up to 5 photos. Selecting a video will replace your selected photos.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Replace Photos',
            style: 'destructive',
            onPress: () => {
              setImages([]);
              setTimeout(() => handleAddVideo(source), 200);
            }
          }
        ]
      );
      return;
    }

    try {
      const picked = await pickVibeMedia(source, 'videos', 1);
      if (!picked || picked.length === 0) return;

      const video = picked[0];
      const videoId = `${Date.now()}_${Math.random()}`;
      const newVideo = {
        id: videoId,
        type: 'video',
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

      // Background upload to Cloudinary Video endpoint
      (async () => {
        try {
          const result = await uploadVideoToCloudinary(video.uri, (progress) => {
            setImages(prev => prev.map(item =>
              item.id === videoId ? { ...item, progress } : item
            ));
          });

          setImages(prev => prev.map(item =>
            item.id === videoId ? {
              ...item,
              url: result.url,
              publicId: result.publicId,
              thumbnailUrl: result.thumbnailUrl,
              duration: result.duration || item.duration,
              uploading: false,
              progress: 100
            } : item
          ));
        } catch (err) {
          showToast(err.message || 'Failed to upload video', 'error');
          setImages([]);
        }
      })();
    } catch (error) {
      showToast(error.message || 'Error selecting video', 'error');
    }
  }, [images.length, hasVideo, showToast]);

  const handleRemoveImage = useCallback((index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleAddTag = useCallback((tag) => {
    const formattedTag = `#${tag} `;
    if (!caption.includes(formattedTag)) {
      setCaption(prev => `${prev} ${formattedTag}`.trimStart());
    }
  }, [caption]);

  // Submit Vibe
  const handleSubmit = useCallback(async () => {
    if (images.length === 0) {
      showToast('Please add at least one photo or video', 'warning');
      return;
    }

    const stillUploading = images.some(img => img.uploading);
    if (stillUploading) {
      showToast('Please wait for media to finish uploading', 'warning');
      return;
    }

    const finalImages = images
      .filter(img => img.url)
      .map(img => ({
        type: img.type || 'image',
        url: img.url,
        thumbnailUrl: img.thumbnailUrl || '',
        duration: img.duration || 0,
        publicId: img.publicId,
        width: img.width,
        height: img.height,
        aspectRatio: img.aspectRatio,
      }));

    if (finalImages.length === 0) {
      showToast('Please upload at least one photo or video', 'warning');
      return;
    }

    setSubmitting(true);

    try {
      const vibePayload = {
        caption: caption.trim(),
        category,
        postAs: isAdmin ? postAs : 'self',
        location: location.trim(),
        images: finalImages,
      };

      const url = isEditing
        ? `${apiConfig.baseUrl}${apiConfig.endpoints.vibes.update(editVibe._id)}`
        : `${apiConfig.baseUrl}${apiConfig.endpoints.vibes.create}`;
      const method = isEditing ? 'PUT' : 'POST';

      const mutationFn = createApiMutationFn(url, method);
      const res = await mutationFn(vibePayload);

      showToast(
        res.message || (isAdmin ? 'Vibe published!' : 'Vibe submitted for admin approval!'),
        'success',
        3000
      );

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['vibes'] });
      queryClient.invalidateQueries({ queryKey: ['myVibes'] });
      queryClient.invalidateQueries({ queryKey: ['vibeHighlights'] });
      queryClient.invalidateQueries({ queryKey: ['vibeSpotlight'] });
      if (isAdmin) {
        queryClient.invalidateQueries({ queryKey: ['pendingVibes'] });
      }

      resetForm();
      onClose();
    } catch (error) {
      showToast(error.message || 'Failed to publish vibe', 'error');
    } finally {
      setSubmitting(false);
    }
  }, [images, caption, category, isAdmin, postAs, location, isEditing, editVibe, showToast, queryClient, resetForm, onClose]);

  const canSubmit = images.length > 0 && !submitting && !images.some(img => img.uploading);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          {/* ──── Header ──── */}
          <View style={[styles.header, { borderBottomColor: colors.outlineVariant }]}>
            <Pressable onPress={handleClose} disabled={submitting} hitSlop={12}>
              <MaterialIcons name="close" size={24} color={colors.onSurface} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: colors.onSurface }]}>
              {isEditing ? 'Edit Vibe' : 'New Vibe'}
            </Text>
            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit}
              style={[
                styles.publishButton,
                { backgroundColor: canSubmit ? colors.primary : colors.surfaceContainerHighest }
              ]}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[styles.publishText, { color: canSubmit ? '#fff' : colors.onSurfaceVariant }]}>
                  {isAdmin ? 'Share' : 'Submit'}
                </Text>
              )}
            </Pressable>
          </View>

          <ScrollView
            style={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ──── Non-Admin Approval Notice Banner ──── */}
            {!isAdmin && (
              <View style={[styles.infoBanner, { backgroundColor: colors.primaryContainer }]}>
                <MaterialIcons name="verified-user" size={18} color={colors.onPrimaryContainer} />
                <Text style={[styles.infoBannerText, { color: colors.onPrimaryContainer }]}>
                  Your vibe will appear on the school feed once approved by school administrators.
                </Text>
              </View>
            )}

            {/* ──── Admin Identity Selector (Post as School vs Myself) ──── */}
            {isAdmin && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}>
                  POSTING AS
                </Text>
                <View style={styles.identityRow}>
                  <Pressable
                    onPress={() => setPostAs('school')}
                    style={[
                      styles.identityCard,
                      {
                        backgroundColor: postAs === 'school' ? '#FFF8E1' : colors.surfaceContainerHighest,
                        borderColor: postAs === 'school' ? '#FFB300' : 'transparent',
                      }
                    ]}
                  >
                    <View style={styles.identityIconBox}>
                      <MaterialIcons name="school" size={20} color={postAs === 'school' ? '#F57F17' : colors.onSurfaceVariant} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={[styles.identityTitle, { color: postAs === 'school' ? '#E65100' : colors.onSurface }]}>
                          SGV School
                        </Text>
                        <MaterialIcons name="verified" size={14} color="#FFB300" />
                      </View>
                      <Text style={[styles.identitySub, { color: colors.onSurfaceVariant }]}>
                        Official School Profile
                      </Text>
                    </View>
                    {postAs === 'school' && (
                      <MaterialIcons name="check-circle" size={20} color="#F57F17" />
                    )}
                  </Pressable>

                  <Pressable
                    onPress={() => setPostAs('self')}
                    style={[
                      styles.identityCard,
                      {
                        backgroundColor: postAs === 'self' ? colors.primaryContainer : colors.surfaceContainerHighest,
                        borderColor: postAs === 'self' ? colors.primary : 'transparent',
                      }
                    ]}
                  >
                    <View style={styles.identityIconBox}>
                      <MaterialIcons name="person" size={20} color={postAs === 'self' ? colors.primary : colors.onSurfaceVariant} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.identityTitle, { color: postAs === 'self' ? colors.primary : colors.onSurface }]}>
                        Myself
                      </Text>
                      <Text style={[styles.identitySub, { color: colors.onSurfaceVariant }]}>
                        {user?.name || 'Personal Account'}
                      </Text>
                    </View>
                    {postAs === 'self' && (
                      <MaterialIcons name="check-circle" size={20} color={colors.primary} />
                    )}
                  </Pressable>
                </View>
              </View>
            )}

            {/* ──── Media Upload Section ──── */}
            <View style={styles.section}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={[styles.sectionLabel, { color: colors.onSurfaceVariant, marginBottom: 0 }]}>
                  MEDIA {hasVideo ? '(1 Video)' : `(${images.length}/${MAX_IMAGES} Photos)`}
                </Text>
                <Text style={{ fontSize: 11, color: colors.onSurfaceVariant, fontFamily: 'DMSans-Regular' }}>
                  {hasVideo ? 'Max 30s video' : 'Up to 5 photos'}
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
                      source={{ uri: img.thumbnailUrl || img.localUri || img.url }}
                      style={styles.imageThumb}
                      contentFit="cover"
                      transition={150}
                    />
                    {/* Video Duration Badge */}
                    {img.type === 'video' && (
                      <View style={styles.videoDurationBadge}>
                        <MaterialIcons name="videocam" size={12} color="#fff" />
                        <Text style={styles.videoDurationText}>
                          {img.duration ? `0:${img.duration < 10 ? '0' : ''}${img.duration}` : 'VIDEO'}
                        </Text>
                      </View>
                    )}
                    {img.uploading && (
                      <View style={styles.uploadOverlay}>
                        <ActivityIndicator size="small" color="#fff" />
                        <Text style={styles.uploadPercent}>{img.progress}%</Text>
                      </View>
                    )}
                    {!img.uploading && (
                      <Pressable
                        onPress={() => handleRemoveImage(index)}
                        style={styles.removeButton}
                        hitSlop={8}
                      >
                        <MaterialIcons name="close" size={14} color="#fff" />
                      </Pressable>
                    )}
                  </View>
                ))}

                {/* Media Picker Buttons */}
                {images.length === 0 ? (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable
                      onPress={() => handleAddPhotos('gallery')}
                      style={[styles.addMediaLargeButton, { backgroundColor: colors.surfaceContainerHighest, borderColor: colors.outlineVariant }]}
                    >
                      <MaterialIcons name="photo-library" size={24} color={colors.primary} />
                      <Text style={[styles.addImageText, { color: colors.onSurface }]}>Photos</Text>
                      <Text style={[styles.addMediaSubtext, { color: colors.onSurfaceVariant }]}>Up to 5</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => handleAddVideo('gallery')}
                      style={[styles.addMediaLargeButton, { backgroundColor: colors.surfaceContainerHighest, borderColor: colors.outlineVariant }]}
                    >
                      <MaterialIcons name="videocam" size={24} color="#E91E63" />
                      <Text style={[styles.addImageText, { color: colors.onSurface }]}>Video</Text>
                      <Text style={[styles.addMediaSubtext, { color: colors.onSurfaceVariant }]}>Max 30s</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => handleAddPhotos('camera')}
                      style={[styles.addMediaLargeButton, { backgroundColor: colors.surfaceContainerHighest, borderColor: colors.outlineVariant }]}
                    >
                      <MaterialIcons name="photo-camera" size={24} color={colors.tertiary} />
                      <Text style={[styles.addImageText, { color: colors.onSurface }]}>Camera</Text>
                      <Text style={[styles.addMediaSubtext, { color: colors.onSurfaceVariant }]}>Snap</Text>
                    </Pressable>
                  </View>
                ) : !hasVideo && images.length < MAX_IMAGES ? (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable
                      onPress={() => handleAddPhotos('gallery')}
                      style={[styles.addImageButton, { backgroundColor: colors.surfaceContainerHighest, borderColor: colors.outlineVariant }]}
                    >
                      <MaterialIcons name="add-photo-alternate" size={24} color={colors.primary} />
                      <Text style={[styles.addImageText, { color: colors.onSurfaceVariant }]}>+ Photo</Text>
                    </Pressable>
                  </View>
                ) : null}
              </ScrollView>
            </View>

            {/* ──── Category Selector ──── */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}>CATEGORY</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                {CATEGORIES.filter(c => !c.adminOnly || isAdmin).map(cat => (
                  <Pressable
                    key={cat.key}
                    onPress={() => setCategory(cat.key)}
                    style={[
                      styles.categoryPill,
                      {
                        backgroundColor: category === cat.key ? colors.primary : colors.surfaceContainerHighest,
                      }
                    ]}
                  >
                    <MaterialIcons
                      name={cat.icon}
                      size={16}
                      color={category === cat.key ? '#fff' : colors.onSurfaceVariant}
                    />
                    <Text
                      style={[
                        styles.categoryPillText,
                        { color: category === cat.key ? '#fff' : colors.onSurfaceVariant }
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* ──── Caption Input ──── */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}>CAPTION</Text>
              <TextInput
                placeholder="Share the story behind these photos... Use #hashtags"
                placeholderTextColor={colors.onSurfaceVariant}
                value={caption}
                onChangeText={setCaption}
                maxLength={MAX_CAPTION_LENGTH}
                multiline
                numberOfLines={4}
                style={[
                  styles.captionInput,
                  {
                    backgroundColor: colors.surfaceContainerHighest,
                    color: colors.onSurface,
                    borderColor: colors.outlineVariant,
                  }
                ]}
              />
              <Text style={[styles.charCount, { color: colors.onSurfaceVariant }]}>
                {caption.length}/{MAX_CAPTION_LENGTH}
              </Text>

              {/* Hashtag Suggestions */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagsScroll}>
                {SUGGESTED_TAGS.map(tag => (
                  <Pressable
                    key={tag}
                    onPress={() => handleAddTag(tag)}
                    style={[styles.tagChip, { backgroundColor: colors.surfaceContainerHighest }]}
                  >
                    <Text style={[styles.tagChipText, { color: colors.primary }]}>#{tag}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* ──── Location Input ──── */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}>LOCATION (OPTIONAL)</Text>
              <View style={[styles.locationRow, { backgroundColor: colors.surfaceContainerHighest, borderColor: colors.outlineVariant }]}>
                <MaterialIcons name="location-on" size={20} color={colors.primary} />
                <TextInput
                  placeholder="e.g. Main Campus, Sports Ground, Auditorium"
                  placeholderTextColor={colors.onSurfaceVariant}
                  value={location}
                  onChangeText={setLocation}
                  maxLength={100}
                  style={[styles.locationInput, { color: colors.onSurface }]}
                />
              </View>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '94%',
    minHeight: '75%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'DMSans-Bold',
  },
  publishButton: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 76,
    alignItems: 'center',
  },
  publishText: {
    fontSize: 14,
    fontFamily: 'DMSans-Bold',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  infoBannerText: {
    fontSize: 12,
    fontFamily: 'DMSans-Medium',
    flex: 1,
    lineHeight: 16,
  },
  section: {
    marginTop: 18,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'DMSans-Bold',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  identityRow: {
    gap: 8,
  },
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 12,
  },
  identityIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  identityTitle: {
    fontSize: 14,
    fontFamily: 'DMSans-Bold',
  },
  identitySub: {
    fontSize: 11,
    fontFamily: 'DMSans-Regular',
  },
  imageScroll: {
    gap: 10,
    paddingBottom: 4,
  },
  imageThumbWrapper: {
    width: 100,
    height: 100,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  imageThumb: {
    width: '100%',
    height: '100%',
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  uploadPercent: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'DMSans-Bold',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoDurationBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  videoDurationText: {
    color: '#fff',
    fontSize: 9,
    fontFamily: 'DMSans-Bold',
  },
  addMediaLargeButton: {
    width: 90,
    height: 100,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  addMediaSubtext: {
    fontSize: 10,
    fontFamily: 'DMSans-Regular',
  },
  addImageButton: {
    width: 85,
    height: 100,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  addImageText: {
    fontSize: 12,
    fontFamily: 'DMSans-Medium',
  },
  categoryScroll: {
    gap: 8,
    paddingBottom: 4,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  categoryPillText: {
    fontSize: 13,
    fontFamily: 'DMSans-Bold',
  },
  captionInput: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    fontSize: 14,
    fontFamily: 'DMSans-Regular',
    borderWidth: 1,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
    fontFamily: 'DMSans-Regular',
    textAlign: 'right',
    marginTop: 4,
  },
  tagsScroll: {
    gap: 8,
    marginTop: 8,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  tagChipText: {
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  locationInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'DMSans-Regular',
  },
});
