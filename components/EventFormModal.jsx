import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Modal, Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from '../theme';
import { useToast } from './ToastProvider';
import apiConfig from '../config/apiConfig';
import apiFetch from '../utils/apiFetch';


// Helper to format dates for display in Indian format (DD-MM-YYYY)
const formatIndianDate = (dateInput) => {
  if (!dateInput) return "";
  try {
    // handle yyyy-mm-dd strings (selectedDate from calendar) by forcing midnight
    const d =
      typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)
        ? new Date(dateInput + "T00:00:00")
        : new Date(dateInput);
    if (isNaN(d)) return String(dateInput);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (e) {
    return String(dateInput);
  }
};

export default function EventFormModal({ isVisible, onClose, selectedDate, onSuccess, editItem = null }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSchoolEvent, setIsSchoolEvent] = useState(false);
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
        setIsSchoolEvent(editItem.isSchoolEvent !== undefined ? editItem.isSchoolEvent : false);
      } else {
        setTitle('');
        setDescription('');
        setIsSchoolEvent(false);
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
        if (value.trim() && value.trim().length < 10) error = "Description must be at least 10 characters if provided";
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

    if (touched[field]) {
      const error = validateField(field, value);
      setErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  const handleSubmit = () => {
    const titleError = validateField("title", title);
    const descriptionError = validateField("description", description);

    setErrors({
      title: titleError,
      description: descriptionError
    });
    setTouched({
      title: true,
      description: true
    });

    if (titleError || descriptionError) {
      return;
    }

    // Pass data to parent component
    onSuccess({
      title: title.trim(),
      date: isEditing ? editItem.date : selectedDate,
      description: description.trim(),
      isSchoolEvent: isSchoolEvent,
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
              {isEditing ? 'Edit Event' : 'New Event'}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <MaterialIcons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.dateRow}>
            <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Date:</Text>
            <Text style={[styles.dateValue, { color: colors.textPrimary }]}>{isEditing ? formatIndianDate(editItem.date) : formatIndianDate(selectedDate)}</Text>
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
              placeholder="Event title"
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
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 8, marginLeft: 4 }}>DESCRIPTION (OPTIONAL)</Text>
            <TextInput
              style={[globalStyles.input, {
                backgroundColor: colors.cardBackground,
                color: colors.textPrimary,
                borderColor: errors.description && touched.description ? colors.error : colors.border,
                borderWidth: 1,
                minHeight: 100,
                paddingTop: 12,
              }]}
              placeholder="Description (optional)"
              placeholderTextColor={colors.textSecondary}
              value={description}
              onChangeText={(text) => handleChange('description', text)}
              onBlur={() => handleBlur('description', description)}
              maxLength={500}
              multiline
            />
            {errors.description && touched.description && (
              <Text style={{ color: colors.error, fontSize: 12, marginTop: 4, marginLeft: 4 }}>{errors.description}</Text>
            )}
          </View>

          <Pressable
            style={{ marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}
            onPress={() => setIsSchoolEvent(!isSchoolEvent)}
          >
            <MaterialIcons
              name={isSchoolEvent ? "check-box" : "check-box-outline-blank"}
              size={24}
              color={colors.primary}
              style={{ marginRight: 8 }}
            />
            <Text style={[globalStyles.cardText, { color: colors.textPrimary }]}>Mark as School Event</Text>
          </Pressable>

          <Pressable
            style={[globalStyles.buttonLarge, { width: "100%", backgroundColor: colors.primary }, loading && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={[globalStyles.buttonText, { color: colors.white }]}>
              {isEditing ? 'Update Event' : 'Create Event'}
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
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '600',
  },
});
