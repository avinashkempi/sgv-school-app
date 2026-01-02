import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    TextInput,
    ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../theme';
import { useApiMutation, createApiMutationFn } from '../../hooks/useApi';
import { useToast } from '../../components/ToastProvider';
import apiConfig from '../../config/apiConfig';
import Header from '../../components/Header';

/**
 * Create Academic Year Form
 * Super Admin interface for creating new academic years
 */
export default function CreateYearScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const { showToast } = useToast();

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        isActive: false,
        terms: [],
        settings: {
            autoPromoteStudents: true,
            preserveTimetables: false,
            carryForwardSubjects: true,
            resetAttendance: true
        }
    });

    const [errors, setErrors] = useState({});

    const createMutation = useApiMutation({
        mutationFn: createApiMutationFn(`${apiConfig.baseUrl}/academic-year`, 'POST'),
        onSuccess: () => {
            showToast('Academic year created successfully!', 'success');
            setTimeout(() => router.back(), 1500);
        },
        onError: (error) => showToast(error.message || 'Failed to create year', 'error')
    });

    const validateForm = () => {
        const newErrors = {};

        // Validate name format (YYYY-YYYY)
        if (!formData.name) {
            newErrors.name = 'Year name is required';
        } else if (!/^\d{4}-\d{4}$/.test(formData.name)) {
            newErrors.name = 'Format must be YYYY-YYYY (e.g., 2024-2025)';
        } else {
            const [start, end] = formData.name.split('-').map(Number);
            if (end !== start + 1) {
                newErrors.name = 'End year must be start year + 1';
            }
        }

        // Validate dates
        if (!formData.startDate) {
            newErrors.startDate = 'Start date is required';
        }
        if (!formData.endDate) {
            newErrors.endDate = 'End date is required';
        }
        if (formData.startDate && formData.endDate) {
            if (new Date(formData.endDate) <= new Date(formData.startDate)) {
                newErrors.endDate = 'End date must be after start date';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (!validateForm()) {
            showToast('Please fix all errors', 'error');
            return;
        }

        createMutation.mutate(formData);
    };

    const updateField = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when field is updated
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    const updateSetting = (setting, value) => {
        setFormData(prev => ({
            ...prev,
            settings: { ...prev.settings, [setting]: value }
        }));
    };

    const renderInput = (label, field, options = {}) => (
        <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 14, fontFamily: 'DMSans-Bold', color: colors.onSurface, marginBottom: 8 }}>
                {label} {options.required && <Text style={{ color: colors.error }}>*</Text>}
            </Text>
            <TextInput
                value={formData[field]}
                onChangeText={(value) => updateField(field, value)}
                placeholder={options.placeholder}
                placeholderTextColor={colors.onSurfaceVariant}
                style={{
                    backgroundColor: colors.surfaceContainerLow,
                    borderWidth: 2,
                    borderColor: errors[field] ? colors.error : colors.outlineVariant,
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    fontSize: 15,
                    fontFamily: 'DMSans-Medium',
                    color: colors.onSurface
                }}
                {...options}
            />
            {errors[field] && (
                <Text style={{ fontSize: 12, fontFamily: 'DMSans-Medium', color: colors.error, marginTop: 6 }}>
                    {errors[field]}
                </Text>
            )}
            {options.hint && !errors[field] && (
                <Text style={{ fontSize: 12, fontFamily: 'DMSans-Regular', color: colors.onSurfaceVariant, marginTop: 6 }}>
                    {options.hint}
                </Text>
            )}
        </View>
    );

    const renderCheckbox = (label, checked, onToggle, description) => (
        <Pressable
            onPress={onToggle}
            style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 12,
                padding: 14,
                borderRadius: 12,
                backgroundColor: pressed ? colors.surfaceContainerHigh : colors.surfaceContainerLow,
                marginBottom: 12
            })}
        >
            <View style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                borderWidth: 2,
                borderColor: checked ? colors.primary : colors.outline,
                backgroundColor: checked ? colors.primary : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 2
            }}>
                {checked && <MaterialIcons name="check" size={16} color="#FFF" />}
            </View>
            <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontFamily: 'DMSans-Bold', color: colors.onSurface, marginBottom: 4 }}>
                    {label}
                </Text>
                {description && (
                    <Text style={{ fontSize: 12, fontFamily: 'DMSans-Regular', color: colors.onSurfaceVariant }}>
                        {description}
                    </Text>
                )}
            </View>
        </Pressable>
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 24, paddingBottom: 100 }}>
                <Header
                    title="Create Academic Year"
                    subtitle="Set up new school year"
                    showBack
                />

                <View style={{ marginTop: 24 }}>
                    {/* Basic Information */}
                    <View style={{
                        backgroundColor: colors.surfaceContainerLow,
                        borderRadius: 16,
                        padding: 16,
                        marginBottom: 20
                    }}>
                        <Text style={{ fontSize: 16, fontFamily: 'DMSans-Bold', color: colors.onSurface, marginBottom: 16 }}>
                            Basic Information
                        </Text>

                        {renderInput('Academic Year Name', 'name', {
                            required: true,
                            placeholder: '2024-2025',
                            hint: 'Format: YYYY-YYYY (e.g., 2024-2025)'
                        })}

                        {renderInput('Description', 'description', {
                            placeholder: 'Optional description',
                            multiline: true,
                            numberOfLines: 3,
                            hint: 'Brief description of this academic year'
                        })}

                        {renderInput('Start Date', 'startDate', {
                            required: true,
                            placeholder: 'YYYY-MM-DD',
                            hint: 'Format: YYYY-MM-DD (e.g., 2024-04-01)'
                        })}

                        {renderInput('End Date', 'endDate', {
                            required: true,
                            placeholder: 'YYYY-MM-DD',
                            hint: 'Format: YYYY-MM-DD (e.g., 2025-03-31)'
                        })}

                        {renderCheckbox(
                            'Set as Active Year',
                            formData.isActive,
                            () => updateField('isActive', !formData.isActive),
                            'This will deactivate the current active year and set this as the new current year'
                        )}
                    </View>

                    {/* Settings */}
                    <View style={{
                        backgroundColor: colors.surfaceContainerLow,
                        borderRadius: 16,
                        padding: 16,
                        marginBottom: 20
                    }}>
                        <Text style={{ fontSize: 16, fontFamily: 'DMSans-Bold', color: colors.onSurface, marginBottom: 4 }}>
                            Year Settings
                        </Text>
                        <Text style={{ fontSize: 12, fontFamily: 'DMSans-Regular', color: colors.onSurfaceVariant, marginBottom: 16 }}>
                            Configure default behavior for this academic year
                        </Text>

                        {renderCheckbox(
                            'Auto-Promote Students',
                            formData.settings.autoPromoteStudents,
                            () => updateSetting('autoPromoteStudents', !formData.settings.autoPromoteStudents),
                            'Automatically promote students to next grade when transitioning years'
                        )}

                        {renderCheckbox(
                            'Preserve Timetables',
                            formData.settings.preserveTimetables,
                            () => updateSetting('preserveTimetables', !formData.settings.preserveTimetables),
                            'Keep existing timetable structure for next year'
                        )}

                        {renderCheckbox(
                            'Carry Forward Subjects',
                            formData.settings.carryForwardSubjects,
                            () => updateSetting('carryForwardSubjects', !formData.settings.carryForwardSubjects),
                            'Copy subject assignments to new year'
                        )}

                        {renderCheckbox(
                            'Reset Attendance',
                            formData.settings.resetAttendance,
                            () => updateSetting('resetAttendance', !formData.settings.resetAttendance),
                            'Start with fresh attendance records for new year'
                        )}
                    </View>

                    {/* Info Box */}
                    <View style={{
                        backgroundColor: colors.primaryContainer,
                        borderRadius: 12,
                        padding: 14,
                        flexDirection: 'row',
                        gap: 12,
                        marginBottom: 20
                    }}>
                        <MaterialIcons name="info-outline" size={20} color={colors.primary} style={{ marginTop: 2 }} />
                        <Text style={{ flex: 1, fontSize: 12, fontFamily: 'DMSans-Regular', color: colors.onSurface }}>
                            After creating the year, you can add terms, configure holidays, and set up the academic calendar from the year details screen.
                        </Text>
                    </View>

                    {/* Action Buttons */}
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <Pressable
                            onPress={() => router.back()}
                            style={({ pressed }) => ({
                                flex: 1,
                                backgroundColor: pressed ? colors.surfaceContainerHighest : colors.surfaceContainerHigh,
                                paddingVertical: 14,
                                borderRadius: 12,
                                alignItems: 'center'
                            })}
                        >
                            <Text style={{ fontSize: 15, fontFamily: 'DMSans-Bold', color: colors.onSurface }}>
                                Cancel
                            </Text>
                        </Pressable>
                        <Pressable
                            onPress={handleSubmit}
                            disabled={createMutation.isPending}
                            style={({ pressed }) => ({
                                flex: 2,
                                backgroundColor: createMutation.isPending
                                    ? colors.surfaceContainerHigh
                                    : (pressed ? colors.primary + 'DD' : colors.primary),
                                paddingVertical: 14,
                                borderRadius: 12,
                                alignItems: 'center',
                                opacity: createMutation.isPending ? 0.5 : 1
                            })}
                        >
                            {createMutation.isPending ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <Text style={{ fontSize: 15, fontFamily: 'DMSans-Bold', color: '#FFF' }}>
                                    Create Year
                                </Text>
                            )}
                        </Pressable>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}
