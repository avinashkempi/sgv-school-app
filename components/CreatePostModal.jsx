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
import { useTheme } from '../theme';
import { useToast } from './ToastProvider';
import { createApiMutationFn } from '../hooks/useApi';
import apiConfig from '../config/apiConfig';
import { pickImage, compressImage, uploadToCloudinary } from '../utils/cloudinaryUpload';

const MAX_IMAGES = 5;
const MAX_TITLE_LENGTH = 200;
const MAX_DESC_LENGTH = 2000;

/**
 * CreatePostModal — full-featured post creation UI with image picker and Cloudinary upload.
 *
 * @param {boolean} visible
 * @param {Function} onClose
 * @param {Object|null} editPost - If provided, opens in edit mode
 */
export default function CreatePostModal({ visible, onClose, editPost = null }) {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!editPost;

  const [category, setCategory] = useState(editPost?.category || 'general');
  const [title, setTitle] = useState(editPost?.title || '');
  const [description, setDescription] = useState(editPost?.description || '');
  const [images, setImages] = useState(
    editPost?.imageUrls?.map(url => ({ url, localUri: null, uploading: false, progress: 0 })) || []
  );
  const [submitting, setSubmitting] = useState(false);

  // Reset form on open/close
  const resetForm = useCallback(() => {
    setCategory('general');
    setTitle('');
    setDescription('');
    setImages([]);
    setSubmitting(false);
  }, []);

  const handleClose = useCallback(() => {
    if (submitting) return;
    if (title || description || images.length > 0) {
      Alert.alert('Discard Post?', 'Your draft will be lost.', [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => { resetForm(); onClose(); } },
      ]);
    } else {
      resetForm();
      onClose();
    }
  }, [submitting, title, description, images, resetForm, onClose]);

  // Image picking
  const handleAddImage = useCallback(async (source) => {
    if (images.length >= MAX_IMAGES) {
      showToast(`Maximum ${MAX_IMAGES} images allowed`, 'warning');
      return;
    }

    try {
      const picked = await pickImage(source);
      if (!picked) return;

      const imageId = Date.now().toString();
      const newImage = { id: imageId, localUri: picked.uri, url: null, uploading: true, progress: 0 };
      setImages(prev => [...prev, newImage]);

      // Compress
      const compressedUri = await compressImage(picked.uri);

      // Upload to Cloudinary
      const result = await uploadToCloudinary(compressedUri, (progress) => {
        setImages(prev => prev.map(img =>
          img.id === imageId ? { ...img, progress } : img
        ));
      });

      // Update with the final URL
      setImages(prev => prev.map(img =>
        img.id === imageId ? { ...img, url: result.url, uploading: false, progress: 100 } : img
      ));
    } catch (error) {
      showToast(error.message || 'Failed to upload image', 'error');
      // Remove the failed image
      setImages(prev => prev.filter(img => img.url || !img.uploading));
    }
  }, [images.length, showToast]);

  const handleRemoveImage = useCallback((index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  const showImageSourcePicker = useCallback(() => {
    Alert.alert('Add Photo', 'Choose a source', [
      { text: 'Camera', onPress: () => handleAddImage('camera') },
      { text: 'Gallery', onPress: () => handleAddImage('gallery') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [handleAddImage]);

  // Submit
  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      showToast('Please add a title', 'warning');
      return;
    }

    const uploadedUrls = images.filter(img => img.url).map(img => img.url);
    const stillUploading = images.some(img => img.uploading);

    if (stillUploading) {
      showToast('Please wait for images to finish uploading', 'warning');
      return;
    }

    setSubmitting(true);

    try {
      const postData = {
        title: title.trim(),
        description: description.trim(),
        category,
        imageUrls: uploadedUrls,
      };

      const url = isEditing
        ? `${apiConfig.baseUrl}${apiConfig.endpoints.posts.update(editPost._id)}`
        : `${apiConfig.baseUrl}${apiConfig.endpoints.posts.create}`;
      const method = isEditing ? 'PUT' : 'POST';

      const mutationFn = createApiMutationFn(url, method);
      await mutationFn(postData);

      showToast(isEditing ? 'Post updated!' : 'Post published!', 'success');
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      resetForm();
      onClose();
    } catch (error) {
      showToast(error.message || 'Failed to save post', 'error');
    } finally {
      setSubmitting(false);
    }
  }, [title, description, category, images, isEditing, editPost, showToast, queryClient, resetForm, onClose]);

  const canSubmit = title.trim().length > 0 && !submitting && !images.some(img => img.uploading);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.outlineVariant }]}>
            <Pressable onPress={handleClose} disabled={submitting} hitSlop={12}>
              <MaterialIcons name="close" size={24} color={colors.onSurface} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: colors.onSurface }]}>
              {isEditing ? 'Edit Post' : 'New Post'}
            </Text>
            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit}
              style={[
                styles.publishButton,
                {
                  backgroundColor: canSubmit ? colors.primary : colors.surfaceContainerHighest,
                }
              ]}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[styles.publishText, { color: canSubmit ? '#fff' : colors.onSurfaceVariant }]}>
                  {isEditing ? 'Save' : 'Publish'}
                </Text>
              )}
            </Pressable>
          </View>

          <ScrollView
            style={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Category Selector */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}>CATEGORY</Text>
              <View style={styles.categoryRow}>
                <CategoryPill
                  label="General"
                  icon="campaign"
                  isActive={category === 'general'}
                  activeColor={colors.primary}
                  activeTextColor="#fff"
                  inactiveColor={colors.surfaceContainerHighest}
                  inactiveTextColor={colors.onSurfaceVariant}
                  onPress={() => setCategory('general')}
                />
                <CategoryPill
                  label="Achievement"
                  icon="emoji-events"
                  isActive={category === 'achievement'}
                  activeColor="#E65100"
                  activeTextColor="#fff"
                  inactiveColor={colors.surfaceContainerHighest}
                  inactiveTextColor={colors.onSurfaceVariant}
                  onPress={() => setCategory('achievement')}
                />
              </View>
              {category === 'achievement' && (
                <View style={[styles.notifHint, { backgroundColor: '#FFF3E0' }]}>
                  <MaterialIcons name="notifications-active" size={14} color="#E65100" />
                  <Text style={[styles.notifHintText, { color: '#BF360C' }]}>
                    Students will receive a push notification for achievements
                  </Text>
                </View>
              )}
            </View>

            {/* Images Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}>
                PHOTOS ({images.length}/{MAX_IMAGES})
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageScroll}>
                {/* Existing images */}
                {images.map((img, index) => (
                  <View key={img.id || index} style={styles.imageThumbWrapper}>
                    <Image
                      source={{ uri: img.localUri || img.url }}
                      style={[styles.imageThumb, { backgroundColor: colors.surfaceContainerHighest }]}
                      contentFit="cover"
                      transition={150}
                    />
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

                {/* Add image button */}
                {images.length < MAX_IMAGES && (
                  <Pressable
                    onPress={showImageSourcePicker}
                    style={[styles.addImageButton, { backgroundColor: colors.surfaceContainerHighest, borderColor: colors.outlineVariant }]}
                  >
                    <MaterialIcons name="add-photo-alternate" size={28} color={colors.onSurfaceVariant} />
                    <Text style={[styles.addImageText, { color: colors.onSurfaceVariant }]}>Add</Text>
                  </Pressable>
                )}
              </ScrollView>
            </View>

            {/* Title Input */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}>TITLE *</Text>
              <TextInput
                placeholder="What's this about?"
                placeholderTextColor={colors.onSurfaceVariant}
                value={title}
                onChangeText={setTitle}
                maxLength={MAX_TITLE_LENGTH}
                style={[
                  styles.titleInput,
                  {
                    backgroundColor: colors.surfaceContainerHighest,
                    color: colors.onSurface,
                    borderColor: colors.outlineVariant,
                  }
                ]}
              />
              <Text style={[styles.charCount, { color: colors.onSurfaceVariant }]}>
                {title.length}/{MAX_TITLE_LENGTH}
              </Text>
            </View>

            {/* Description Input */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}>DESCRIPTION</Text>
              <TextInput
                placeholder="Add more details (optional)"
                placeholderTextColor={colors.onSurfaceVariant}
                value={description}
                onChangeText={setDescription}
                maxLength={MAX_DESC_LENGTH}
                multiline
                numberOfLines={4}
                style={[
                  styles.descInput,
                  {
                    backgroundColor: colors.surfaceContainerHighest,
                    color: colors.onSurface,
                    borderColor: colors.outlineVariant,
                  }
                ]}
              />
              <Text style={[styles.charCount, { color: colors.onSurfaceVariant }]}>
                {description.length}/{MAX_DESC_LENGTH}
              </Text>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Category pill button
const CategoryPill = ({ label, icon, isActive, activeColor, activeTextColor, inactiveColor, inactiveTextColor, onPress }) => (
  <Pressable
    onPress={onPress}
    style={[
      styles.categoryPill,
      { backgroundColor: isActive ? activeColor : inactiveColor }
    ]}
  >
    <MaterialIcons name={icon} size={16} color={isActive ? activeTextColor : inactiveTextColor} />
    <Text style={[styles.categoryPillText, { color: isActive ? activeTextColor : inactiveTextColor }]}>
      {label}
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    minHeight: '70%',
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
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 80,
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
  section: {
    marginTop: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'DMSans-Bold',
    letterSpacing: 1,
    marginBottom: 10,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  categoryPillText: {
    fontSize: 14,
    fontFamily: 'DMSans-Bold',
  },
  notifHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  notifHintText: {
    fontSize: 12,
    fontFamily: 'DMSans-Medium',
    flex: 1,
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
    borderRadius: 14,
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageButton: {
    width: 100,
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
  titleInput: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 16,
    fontFamily: 'DMSans-Medium',
    borderWidth: 1,
  },
  descInput: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 14,
    fontFamily: 'DMSans-Regular',
    borderWidth: 1,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
    fontFamily: 'DMSans-Regular',
    textAlign: 'right',
    marginTop: 4,
  },
});
