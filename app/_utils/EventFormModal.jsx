import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Modal, Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from '../../theme';
import { useToast } from './ToastProvider';
import apiConfig from '../config/apiConfig';

export default function EventFormModal({ isVisible, onClose, selectedDate, onSuccess }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
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
          description: description.trim()
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
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.header}>
            <Text style={[globalStyles.title, { fontSize: 18 }]}>New Event</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <MaterialIcons name="close" size={24} color={colors.primary} />
            </Pressable>
          </View>

          <Text style={[globalStyles.text, styles.label]}>Date</Text>
          <Text style={[globalStyles.text, styles.date]}>{selectedDate}</Text>

          <Text style={[globalStyles.text, styles.label]}>Title</Text>
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

          <Text style={[globalStyles.text, styles.label]}>Description (Optional)</Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: colors.background,
              color: colors.textPrimary,
              borderColor: colors.border,
              height: 100,
              textAlignVertical: 'top'
            }]}
            placeholder="Event description"
            placeholderTextColor={colors.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={500}
          />

          <Pressable
            style={[globalStyles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={[globalStyles.buttonText, loading && styles.buttonTextDisabled]}>
              {loading ? 'Creating...' : 'Create Event'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    padding: 20,
    borderRadius: 12,
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
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
    opacity: 0.8,
  },
  date: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonTextDisabled: {
    opacity: 0.8,
  }
});