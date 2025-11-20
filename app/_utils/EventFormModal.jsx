import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Modal, Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from '../../theme';
import { useToast } from './ToastProvider';
import apiConfig from '../config/apiConfig';
import apiFetch from './apiFetch';
import { Checkbox } from 'react-native-paper';

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
    }
  }, [isVisible, isEditing, editItem]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      showToast('Title is required');
      return;
    }

    try {
      setLoading(true);

      const token = await AsyncStorage.getItem('@auth_token');
      if (!token) {
        showToast('Please login to create events');
        return;
      }

      const endpoint = isEditing
        ? apiConfig.url(apiConfig.endpoints.events.update(editItem._id))
        : apiConfig.url(apiConfig.endpoints.events.create);

      const method = isEditing ? 'PUT' : 'POST';

      const response = await apiFetch(endpoint, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title.trim(),
          date: isEditing ? editItem.date : selectedDate,
          description: description.trim(),
          isSchoolEvent: isSchoolEvent
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create event');
      }

      showToast(`Event ${isEditing ? 'updated' : 'created'} successfully`);
      onSuccess(data.event);
      onClose();
      setTitle('');
      setDescription('');

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
              {isEditing ? 'Edit Event' : 'New Event'}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <MaterialIcons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.dateRow}>
            <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Date:</Text>
            <Text style={[styles.dateValue, { color: colors.textPrimary }]}>{isEditing ? formatIndianDate(editItem.date) : formatIndianDate(selectedDate)}</Text>
          </View>

          <TextInput
            style={[globalStyles.input, {
              marginBottom: 12,
              backgroundColor: colors.cardBackground,
              color: colors.textPrimary,
              borderColor: colors.border
            }]}
            placeholder="Event title"
            placeholderTextColor={colors.textSecondary}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />

          <TextInput
            style={[globalStyles.input, {
              marginBottom: 16,
              backgroundColor: colors.cardBackground,
              color: colors.textPrimary,
              borderColor: colors.border,
              minHeight: 100,
              paddingTop: 12,
            }]}
            placeholder="Description (optional)"
            placeholderTextColor={colors.textSecondary}
            value={description}
            onChangeText={setDescription}
            maxLength={500}
            multiline
          />

          <View style={{ marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
            <Checkbox
              status={isSchoolEvent ? 'checked' : 'unchecked'}
              onPress={() => setIsSchoolEvent(!isSchoolEvent)}
              color={colors.primary}
            />
            <Text style={[globalStyles.cardText, { color: colors.textPrimary }]}>Mark as School Event</Text>
          </View>

          <Pressable
            style={[globalStyles.buttonLarge, { width: "100%", backgroundColor: colors.primary }, loading && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={[globalStyles.buttonText, { color: colors.white }]}>
              {loading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Event' : 'Create Event')}
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
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
