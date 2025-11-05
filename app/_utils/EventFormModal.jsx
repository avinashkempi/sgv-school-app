import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Modal, Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from '../../theme';
import { useToast } from './ToastProvider';
import apiConfig from '../config/apiConfig';
import { Checkbox } from 'react-native-paper';

export default function EventFormModal({ isVisible, onClose, selectedDate, onSuccess }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSchoolEvent, setIsSchoolEvent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { colors, styles: globalStyles } = useTheme();
  const { showToast } = useToast();

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

      const response = await fetch(apiConfig.url(apiConfig.endpoints.events.create), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title.trim(),
          date: selectedDate,
          description: description.trim(),
          isSchoolEvent: isSchoolEvent
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create event');
      }

      showToast('Event created successfully');
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
            <Text style={[globalStyles.title, { fontSize: 16, color: colors.textPrimary }]}>New Event</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <MaterialIcons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.dateRow}>
            <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Date:</Text>
            <Text style={[styles.dateValue, { color: colors.textPrimary }]}>{selectedDate}</Text>
          </View>

          <TextInput
            style={[styles.input, {
              backgroundColor: colors.background,
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
            style={[styles.input, {
              backgroundColor: colors.background,
              color: colors.textPrimary,
              borderColor: colors.border,
              height: 80,
              textAlignVertical: 'top'
            }]}
            placeholder="Description (optional)"
            placeholderTextColor={colors.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={500}
          />

          <View style={styles.checkboxRow}>
            <Checkbox
              status={isSchoolEvent ? 'checked' : 'unchecked'}
              onPress={() => setIsSchoolEvent(!isSchoolEvent)}
              color={colors.primary}
            />
            <Text style={[styles.checkboxLabel, { color: colors.textPrimary }]}>School Event</Text>
          </View>

          <Pressable
            style={[styles.button, { backgroundColor: colors.primary }, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={[styles.buttonText, { color: colors.white }, loading && styles.buttonTextDisabled]}>
              {loading ? 'Creating...' : 'Create'}
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
