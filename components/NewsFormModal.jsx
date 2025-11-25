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
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
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
      setErrors({});
      setTouched({});
    }
  }, [isVisible, isEditing, editItem]);

  const validateField = (name, value) => {
    let error = "";
    switch (name) {
      case "title":
        if (!value.trim()) error = "Title is required";
        else if (value.trim().length < 3) error = "Title must be at least 3 characters";
        break;
      case "description":
        if (!value.trim()) error = "Description is required";
        else if (value.trim().length < 10) error = "Description must be at least 10 characters";
        break;
      case "url":
        if (value.trim() && !/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/.test(value.trim())) {
          error = "Invalid URL format";
        }
        break;
    }
    return error;
  };

  const handleBlur = (field, value) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, value);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const handleChange = (field, value) => {
    if (field === 'title') setTitle(value);
    if (field === 'description') setDescription(value);
    if (field === 'url') setUrl(value);

    if (touched[field]) {
      const error = validateField(field, value);
      setErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  const handleSubmit = () => {
    const titleError = validateField("title", title);
    const descriptionError = validateField("description", description);
    const urlError = validateField("url", url);

    setErrors({
      title: titleError,
      description: descriptionError,
      url: urlError
    });
    setTouched({
      title: true,
      description: true,
      url: true
    });

    if (titleError || descriptionError || urlError) {
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

          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 8, marginLeft: 4 }}>TITLE</Text>
            <TextInput
              style={[globalStyles.input, {
                backgroundColor: colors.cardBackground,
                color: colors.textPrimary,
                borderColor: errors.title && touched.title ? colors.error : colors.border,
                borderWidth: 1
              }]}
              placeholder="News title"
              placeholderTextColor={colors.textSecondary}
              value={title}
              onChangeText={(text) => handleChange('title', text)}
              onBlur={() => handleBlur('title', title)}
              maxLength={100}
            />
            {errors.title && touched.title && (
              <Text style={{ color: colors.error, fontSize: 12, marginTop: 4, marginLeft: 4 }}>{errors.title}</Text>
            )}
          </View>

          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 8, marginLeft: 4 }}>DESCRIPTION</Text>
            <TextInput
              style={[globalStyles.input, {
                backgroundColor: colors.cardBackground,
                color: colors.textPrimary,
                borderColor: errors.description && touched.description ? colors.error : colors.border,
                borderWidth: 1,
                minHeight: 100,
                paddingTop: 12,
              }]}
              placeholder="Description"
              placeholderTextColor={colors.textSecondary}
              value={description}
              onChangeText={(text) => handleChange('description', text)}
              onBlur={() => handleBlur('description', description)}
              multiline
              numberOfLines={4}
              maxLength={500}
            />
            {errors.description && touched.description && (
              <Text style={{ color: colors.error, fontSize: 12, marginTop: 4, marginLeft: 4 }}>{errors.description}</Text>
            )}
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 8, marginLeft: 4 }}>URL (OPTIONAL)</Text>
            <TextInput
              style={[globalStyles.input, {
                backgroundColor: colors.cardBackground,
                color: colors.textPrimary,
                borderColor: errors.url && touched.url ? colors.error : colors.border,
                borderWidth: 1
              }]}
              placeholder="https://example.com"
              placeholderTextColor={colors.textSecondary}
              value={url}
              onChangeText={(text) => handleChange('url', text)}
              onBlur={() => handleBlur('url', url)}
              maxLength={200}
              autoCapitalize="none"
              keyboardType="url"
            />
            {errors.url && touched.url && (
              <Text style={{ color: colors.error, fontSize: 12, marginTop: 4, marginLeft: 4 }}>{errors.url}</Text>
            )}
          </View>

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
