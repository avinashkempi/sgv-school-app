import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Modal, Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from '../theme';
import { useToast } from './ToastProvider';
import apiConfig from '../config/apiConfig';
import apiFetch from '../utils/apiFetch';
import { Checkbox } from 'react-native-paper';

export default function NewsFormModal({ isVisible, onClose, onSuccess, editItem = null }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [privateNews, setPrivateNews] = useState(true);
  const [loading, setLoading] = useState(false);
  const { colors, styles: globalStyles } = useTheme();
  const { showToast } = useToast();

  const isEditing = !!editItem;

  useEffect(() => {
    if (isVisible) {
      if (isEditing && editItem) {
        setTitle(editItem.title || '');
        setDescription(editItem.description || '');
        setUrl(editItem.url || '');
        setPrivateNews(editItem.privateNews !== undefined ? editItem.privateNews : true);
      } else {
        setTitle('');
        setDescription('');
        setUrl('');
        setPrivateNews(true);
      }
    }
  }, [isVisible, isEditing, editItem]);

  const handleSubmit = () => {
    if (!title.trim()) {
      showToast('Title is required');
      return;
    }
    if (!description.trim()) {
      showToast('Description is required');
      return;
    }

    // Pass data to parent component
    onSuccess({
      title: title.trim(),
      description: description.trim(),
      url: url.trim() || undefined,
      privateNews: privateNews,
      _id: editItem?._id // Pass ID if editing
    });

    // Reset form is handled by parent closing/re-opening or we can do it here if needed, 
    // but parent will likely close modal immediately.
    // We can reset state when modal closes via useEffect.
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.header}>
            <Text style={[globalStyles.title, { fontSize: 20, color: colors.textPrimary }]}>
              {isEditing ? 'Edit News' : 'Add News'}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <MaterialIcons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <TextInput
            style={[globalStyles.input, {
              marginBottom: 12,
              backgroundColor: colors.cardBackground,
              color: colors.textPrimary,
              borderColor: colors.border
            }]}
            placeholder="News title"
            placeholderTextColor={colors.textSecondary}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />

          <TextInput
            style={[globalStyles.input, {
              marginBottom: 12,
              backgroundColor: colors.cardBackground,
              color: colors.textPrimary,
              borderColor: colors.border,
              minHeight: 100,
              paddingTop: 12,
            }]}
            placeholder="Description"
            placeholderTextColor={colors.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            maxLength={500}
          />

          <TextInput
            style={[globalStyles.input, {
              marginBottom: 16,
              backgroundColor: colors.cardBackground,
              color: colors.textPrimary,
              borderColor: colors.border
            }]}
            placeholder="URL (optional)"
            placeholderTextColor={colors.textSecondary}
            value={url}
            onChangeText={setUrl}
            maxLength={200}
          />

          <View style={{ marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
            <Checkbox
              status={privateNews ? 'checked' : 'unchecked'}
              onPress={() => setPrivateNews(!privateNews)}
              color={colors.primary}
            />
            <Text style={[globalStyles.cardText, { color: colors.textPrimary }]}>Private News</Text>
          </View>

          <Pressable
            style={[globalStyles.buttonLarge, { width: "100%", backgroundColor: colors.primary }, loading && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={[globalStyles.buttonText, { color: colors.white }]}>
              {isEditing ? 'Update News' : 'Create News'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    padding: 24,
    borderRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
});
