import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    ActivityIndicator,
    TextInput
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../theme';
import apiConfig from '../../../config/apiConfig';
import { useApiQuery, useApiMutation, createApiMutationFn } from '../../../hooks/useApi';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../../components/ToastProvider';
import Header from '../../../components/Header';

/**
 * Quick Exam Initialization Wizard
 * Multi-step wizard for quickly creating all 6 exam types at once
 */
export default function QuickExamWizard() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { colors } = useTheme();
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    const [currentStep, setCurrentStep] = useState(1);
    const [selectedClass, setSelectedClass] = useState(params.classId || null);
    const [selectedSubject, setSelectedSubject] = useState(params.subjectId || null);
    const [examConfig, setExamConfig] = useState({
        totalMarks: '100',
        duration: '60',
        instructions: '',
        FA1: { date: '', totalMarks: '', startTime: '09:00 AM', endTime: '11:00 AM' },
        FA2: { date: '', totalMarks: '', startTime: '09:00 AM', endTime: '11:00 AM' },
        SA1: { date: '', totalMarks: '', startTime: '09:00 AM', endTime: '12:00 PM' },
        FA3: { date: '', totalMarks: '', startTime: '09:00 AM', endTime: '11:00 AM' },
        FA4: { date: '', totalMarks: '', startTime: '09:00 AM', endTime: '11:00 AM' },
        SA2: { date: '', totalMarks: '', startTime: '09:00 AM', endTime: '12:00 PM' }
    });

    // Fetch teacher's subjects
    const { data: subjectsData, isLoading: subjectsLoading } = useApiQuery(
        ['teacherSubjects'],
        `${apiConfig.baseUrl}/subjects/my-subjects`
    );
    const subjects = subjectsData || [];

    // Quick init mutation
    const quickInitMutation = useApiMutation({
        mutationFn: createApiMutationFn(`${apiConfig.baseUrl}/exams/quick-init`, 'POST'),
        onSuccess: (result) => {
            const created = result.results.filter(r => r.status === 'created').length;
            const existing = result.results.filter(r => r.status === 'exists').length;

            showToast(`Created ${created} exams${existing > 0 ? `, ${existing} already existed` : ''}`, 'success');
            queryClient.invalidateQueries({ queryKey: ['teacherExamDashboard'] });
            router.back();
        },
        onError: (error) => showToast(error.message || 'Failed to create exams', 'error')
    });

    const handleNext = () => {
        if (currentStep === 1 && (!selectedClass || !selectedSubject)) {
            showToast('Please select class and subject', 'warning');
            return;
        }
        if (currentStep < 3) setCurrentStep(currentStep + 1);
    };

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
    };

    const handleSubmit = () => {
        const examsConfig = {
            totalMarks: parseInt(examConfig.totalMarks) || 100,
            duration: parseInt(examConfig.duration) || 60,
            instructions: examConfig.instructions,
            FA1: { ...examConfig.FA1, totalMarks: examConfig.FA1.totalMarks || examConfig.totalMarks },
            FA2: { ...examConfig.FA2, totalMarks: examConfig.FA2.totalMarks || examConfig.totalMarks },
            SA1: { ...examConfig.SA1, totalMarks: examConfig.SA1.totalMarks || examConfig.totalMarks },
            FA3: { ...examConfig.FA3, totalMarks: examConfig.FA3.totalMarks || examConfig.totalMarks },
            FA4: { ...examConfig.FA4, totalMarks: examConfig.FA4.totalMarks || examConfig.totalMarks },
            SA2: { ...examConfig.SA2, totalMarks: examConfig.SA2.totalMarks || examConfig.totalMarks }
        };

        quickInitMutation.mutate({
            classId: selectedClass,
            subjectId: selectedSubject,
            examsConfig
        });
    };

    const renderStep1 = () => {
        // Group subjects by class
        const subjectsByClass = {};
        subjects.forEach(subject => {
            const classKey = subject.class._id;
            if (!subjectsByClass[classKey]) {
                subjectsByClass[classKey] = {
                    class: subject.class,
                    subjects: []
                };
            }
            subjectsByClass[classKey].subjects.push(subject);
        });

        return (
            <View>
                <Text style={{ fontSize: 18, fontFamily: 'DMSans-Bold', color: colors.onSurface, marginBottom: 16 }}>
                    Select Class & Subject
                </Text>

                {Object.values(subjectsByClass).map(group => (
                    <View key={group.class._id} style={{ marginBottom: 20 }}>
                        <Text style={{
                            fontSize: 16,
                            fontFamily: 'DMSans-SemiBold',
                            color: colors.onSurface,
                            marginBottom: 12
                        }}>
                            {group.class.name} {group.class.section}
                        </Text>

                        {group.subjects.map(subject => (
                            <Pressable
                                key={subject._id}
                                onPress={() => {
                                    setSelectedClass(subject.class._id);
                                    setSelectedSubject(subject._id);
                                }}
                                style={({ pressed }) => ({
                                    backgroundColor: selectedSubject === subject._id
                                        ? colors.primaryContainer
                                        : (pressed ? colors.surfaceContainerHigh : colors.surfaceContainerHighest),
                                    borderRadius: 12,
                                    padding: 16,
                                    marginBottom: 8,
                                    borderWidth: 2,
                                    borderColor: selectedSubject === subject._id ? colors.primary : 'transparent'
                                })}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{
                                            fontSize: 15,
                                            fontFamily: 'DMSans-Bold',
                                            color: colors.onSurface
                                        }}>
                                            {subject.name}
                                        </Text>
                                    </View>
                                    {selectedSubject === subject._id && (
                                        <MaterialIcons name="check-circle" size={24} color={colors.primary} />
                                    )}
                                </View>
                            </Pressable>
                        ))}
                    </View>
                ))}
            </View>
        );
    };

    const renderStep2 = () => {
        const examTypes = ['FA1', 'FA2', 'SA1', 'FA3', 'FA4', 'SA2'];

        return (
            <View>
                <Text style={{ fontSize: 18, fontFamily: 'DMSans-Bold', color: colors.onSurface, marginBottom: 8 }}>
                    Configure Exams
                </Text>
                <Text style={{ fontSize: 13, fontFamily: 'DMSans-Regular', color: colors.onSurfaceVariant, marginBottom: 20 }}>
                    Set common defaults and customize individual exams
                </Text>

                {/* Common Configuration */}
                <View style={{
                    backgroundColor: colors.primaryContainer,
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 20
                }}>
                    <Text style={{ fontSize: 15, fontFamily: 'DMSans-Bold', color: colors.onSurface, marginBottom: 12 }}>
                        Common Defaults
                    </Text>

                    <View style={{ marginBottom: 12 }}>
                        <Text style={{ fontSize: 12, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant, marginBottom: 6 }}>
                            Total Marks
                        </Text>
                        <TextInput
                            value={examConfig.totalMarks}
                            onChangeText={(value) => setExamConfig({ ...examConfig, totalMarks: value })}
                            keyboardType="numeric"
                            style={{
                                backgroundColor: colors.surface,
                                padding: 12,
                                borderRadius: 8,
                                fontSize: 14,
                                fontFamily: 'DMSans-Medium',
                                color: colors.onSurface,
                                borderWidth: 1,
                                borderColor: colors.outline
                            }}
                        />
                    </View>

                    <View>
                        <Text style={{ fontSize: 12, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant, marginBottom: 6 }}>
                            Duration (minutes)
                        </Text>
                        <TextInput
                            value={examConfig.duration}
                            onChangeText={(value) => setExamConfig({ ...examConfig, duration: value })}
                            keyboardType="numeric"
                            style={{
                                backgroundColor: colors.surface,
                                padding: 12,
                                borderRadius: 8,
                                fontSize: 14,
                                fontFamily: 'DMSans-Medium',
                                color: colors.onSurface,
                                borderWidth: 1,
                                borderColor: colors.outline
                            }}
                        />
                    </View>
                </View>

                {/* Individual Exam Configuration */}
                <Text style={{ fontSize: 15, fontFamily: 'DMSans-Bold', color: colors.onSurface, marginBottom: 12 }}>
                    Individual Exam Dates
                </Text>

                {examTypes.map(type => (
                    <View
                        key={type}
                        style={{
                            backgroundColor: colors.surfaceContainerLow,
                            borderRadius: 12,
                            padding: 14,
                            marginBottom: 10,
                            borderLeftWidth: 3,
                            borderLeftColor: type.startsWith('SA') ? '#9C27B0' : '#2196F3'
                        }}
                    >
                        <Text style={{ fontSize: 14, fontFamily: 'DMSans-Bold', color: colors.onSurface, marginBottom: 8 }}>
                            {type}
                        </Text>
                        <TextInput
                            placeholder="YYYY-MM-DD (e.g., 2026-02-15)"
                            placeholderTextColor={colors.onSurfaceVariant + '60'}
                            value={examConfig[type].date}
                            onChangeText={(value) => setExamConfig({
                                ...examConfig,
                                [type]: { ...examConfig[type], date: value }
                            })}
                            style={{
                                backgroundColor: colors.surface,
                                padding: 10,
                                borderRadius: 8,
                                fontSize: 13,
                                fontFamily: 'DMSans-Medium',
                                color: colors.onSurface,
                                borderWidth: 1,
                                borderColor: colors.outline
                            }}
                        />
                    </View>
                ))}
            </View>
        );
    };

    const renderStep3 = () => {
        const selectedSubjectObj = subjects.find(s => s._id === selectedSubject);

        return (
            <View>
                <Text style={{ fontSize: 18, fontFamily: 'DMSans-Bold', color: colors.onSurface, marginBottom: 20 }}>
                    Review & Confirm
                </Text>

                <View style={{
                    backgroundColor: colors.surfaceContainerLow,
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 20
                }}>
                    <View style={{ marginBottom: 12 }}>
                        <Text style={{ fontSize: 12, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant }}>
                            Class
                        </Text>
                        <Text style={{ fontSize: 16, fontFamily: 'DMSans-Bold', color: colors.onSurface, marginTop: 4 }}>
                            {selectedSubjectObj?.class.name} {selectedSubjectObj?.class.section}
                        </Text>
                    </View>

                    <View style={{ marginBottom: 12 }}>
                        <Text style={{ fontSize: 12, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant }}>
                            Subject
                        </Text>
                        <Text style={{ fontSize: 16, fontFamily: 'DMSans-Bold', color: colors.onSurface, marginTop: 4 }}>
                            {selectedSubjectObj?.name}
                        </Text>
                    </View>

                    <View style={{ marginBottom: 12 }}>
                        <Text style={{ fontSize: 12, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant }}>
                            Total Marks (Default)
                        </Text>
                        <Text style={{ fontSize: 16, fontFamily: 'DMSans-Bold', color: colors.primary, marginTop: 4 }}>
                            {examConfig.totalMarks}
                        </Text>
                    </View>

                    <View>
                        <Text style={{ fontSize: 12, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant }}>
                            Duration
                        </Text>
                        <Text style={{ fontSize: 16, fontFamily: 'DMSans-Bold', color: colors.onSurface, marginTop: 4 }}>
                            {examConfig.duration} minutes
                        </Text>
                    </View>
                </View>

                <Text style={{ fontSize: 15, fontFamily: 'DMSans-Bold', color: colors.onSurface, marginBottom: 12 }}>
                    6 Exams Will Be Created
                </Text>

                {['FA1', 'FA2', 'SA1', 'FA3', 'FA4', 'SA2'].map(type => (
                    <View
                        key={type}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: colors.surfaceContainerHighest,
                            padding: 12,
                            borderRadius: 8,
                            marginBottom: 8
                        }}
                    >
                        <MaterialIcons name="check-circle" size={20} color={colors.success} />
                        <Text style={{ fontSize: 14, fontFamily: 'DMSans-Medium', color: colors.onSurface, marginLeft: 10, flex: 1 }}>
                            {type}
                        </Text>
                        {examConfig[type].date && (
                            <Text style={{ fontSize: 12, fontFamily: 'DMSans-Regular', color: colors.onSurfaceVariant }}>
                                {examConfig[type].date}
                            </Text>
                        )}
                    </View>
                ))}
            </View>
        );
    };

    const renderStepIndicator = () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 28 }}>
            {[1, 2, 3].map(step => (
                <React.Fragment key={step}>
                    <View style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: currentStep >= step ? colors.primary : colors.surfaceContainerHigh,
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        {currentStep > step ? (
                            <MaterialIcons name="check" size={18} color="#FFFFFF" />
                        ) : (
                            <Text style={{
                                fontSize: 14,
                                fontFamily: 'DMSans-Bold',
                                color: currentStep >= step ? '#FFFFFF' : colors.onSurfaceVariant
                            }}>
                                {step}
                            </Text>
                        )}
                    </View>
                    {step < 3 && (
                        <View style={{
                            flex: 1,
                            height: 2,
                            backgroundColor: currentStep > step ? colors.primary : colors.surfaceContainerHigh,
                            marginHorizontal: 8
                        }} />
                    )}
                </React.Fragment>
            ))}
        </View>
    );

    if (subjectsLoading) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={{ padding: 16, paddingTop: 24 }}>
                    <Header
                        title="Quick Exam Setup"
                        subtitle="Create all 6 exams at once"
                        showBack
                    />

                    {renderStepIndicator()}

                    {currentStep === 1 && renderStep1()}
                    {currentStep === 2 && renderStep2()}
                    {currentStep === 3 && renderStep3()}
                </View>
            </ScrollView>

            {/* Navigation Buttons */}
            <View style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: colors.surface,
                padding: 16,
                borderTopWidth: 1,
                borderTopColor: colors.outlineVariant,
                flexDirection: 'row',
                gap: 12
            }}>
                {currentStep > 1 && (
                    <Pressable
                        onPress={handleBack}
                        style={({ pressed }) => ({
                            flex: 1,
                            backgroundColor: pressed ? colors.surfaceContainerHigh : colors.surfaceContainerHighest,
                            paddingVertical: 14,
                            borderRadius: 12,
                            alignItems: 'center'
                        })}
                    >
                        <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 15, color: colors.onSurface }}>
                            Back
                        </Text>
                    </Pressable>
                )}

                <Pressable
                    onPress={currentStep === 3 ? handleSubmit : handleNext}
                    disabled={quickInitMutation.isPending}
                    style={({ pressed }) => ({
                        flex: 2,
                        backgroundColor: pressed ? colors.primary + 'DD' : colors.primary,
                        paddingVertical: 14,
                        borderRadius: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        opacity: quickInitMutation.isPending ? 0.7 : 1
                    })}
                >
                    {quickInitMutation.isPending ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <>
                            <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 15, color: '#FFFFFF' }}>
                                {currentStep === 3 ? 'Create All Exams' : 'Next'}
                            </Text>
                            <MaterialIcons name={currentStep === 3 ? 'check' : 'arrow-forward'} size={20} color="#FFFFFF" />
                        </>
                    )}
                </Pressable>
            </View>
        </View>
    );
}
