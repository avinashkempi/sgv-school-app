import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Modal, Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from '../../theme';
import { useToast } from './ToastProvider';
import apiConfig from '../config/apiConfig';
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

  const handleSubmit = async () => {
    if (!title.trim()) {
      showToast('Title is required');
      return;
    }
    if (!description.trim()) {
      showToast('Description is required');
      return;
    }

    try {
      setLoading(true);

      const token = await AsyncStorage.getItem('@auth_token');
      if (!token) {
        showToast('Please login to create news');
        return;
      }

      const endpoint = isEditing
        ? apiConfig.url(apiConfig.endpoints.news.update(editItem._id))
        : apiConfig.url(apiConfig.endpoints.news.create);

      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          url: url.trim(),
          privateNews: privateNews
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Failed to ${isEditing ? 'update' : 'create'} news`);
      }

      showToast(`News ${isEditing ? 'updated' : 'created'} successfully`);
      onSuccess(data.news);
      onClose();

      if (!isEditing) {
        setTitle('');
        setDescription('');
        setUrl('');
        setPrivateNews(true);
      }

    } catch (error) {
      showToast(error.message);
    } finally {
      setLoading(false);
    }
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
            <Text style={[globalStyles.title, { fontSize: 16, color: colors.textPrimary }]}>
              {isEditing ? 'Edit News' : 'Add News'}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <MaterialIcons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <TextInput
            style={[styles.input, {
              backgroundColor: colors.background,
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
            style={[styles.input, {
              backgroundColor: colors.background,
              color: colors.textPrimary,
              borderColor: colors.border
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
            style={[styles.input, {
              backgroundColor: colors.background,
              color: colors.textPrimary,
              borderColor: colors.border
            }]}
            placeholder="URL (optional)"
            placeholderTextColor={colors.textSecondary}
            value={url}
            onChangeText={setUrl}
            maxLength={200}
          />

          <View style={styles.checkboxRow}>
            <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 4, padding: 2 }}>
              <Checkbox
                status={privateNews ? 'checked' : 'unchecked'}
                onPress={() => setPrivateNews(!privateNews)}
                color={colors.primary}
              />
            </View>
            <Text style={[styles.checkboxLabel, { color: colors.textPrimary }]}>Private News</Text>
          </View>

          <Pressable
            style={[styles.button, { backgroundColor: colors.primary }, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={[styles.buttonText, { color: colors.white }, loading && styles.buttonTextDisabled]}>
              {loading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update' : 'Create')}
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
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  container: {
    width: '85%',
    padding: 16,
    borderRadius: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
    fontSize: 16,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkboxLabel: {
    marginLeft: 8,
    fontSize: 14,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextDisabled: {
    opacity: 0.8,
  },
});
