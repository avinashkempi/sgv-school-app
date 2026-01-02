import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    ActivityIndicator,
    TextInput,
    Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../theme';
import { useApiMutation, createApiMutationFn } from '../../hooks/useApi';
import { useToast } from '../../components/ToastProvider';
import apiConfig from '../../config/apiConfig';
import Header from '../../components/Header';

/**
 * Transition Wizard - 3-Step Process for Academic Year Transitions
 * Step 1: Preview Impact
 * Step 2: Review Promotions
 * Step 3: Confirm & Execute
 */
export default function TransitionWizardScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { colors } = useTheme();
    const { showToast } = useToast();

    const [currentStep, setCurrentStep] = useState(1);
    const [impactData, setImpactData] = useState(null);
    const [editedPromotionPlan, setEditedPromotionPlan] = useState([]);
    const [confirmationText, setConfirmationText] = useState('');
    const [createRollback, setCreateRollback] = useState(true);
    const [sendNotifications, setSendNotifications] = useState(true);
    const [generateReport, setGenerateReport] = useState(true);

    const currentYearId = params.currentId;
    const nextYearId = params.nextId;

    // Preview mutation
    const previewMutation = useApiMutation({
        mutationFn: createApiMutationFn(`${apiConfig.baseUrl}/academic-year/transition/preview`, 'POST'),
        onSuccess: (data) => {
            setImpactData(data);
            setEditedPromotionPlan(data.promotionPlan || []);
            setCurrentStep(2);
        },
        onError: (error) => showToast(error.message || 'Preview failed', 'error')
    });

    // Execute mutation
    const executeMutation = useApiMutation({
        mutationFn: createApiMutationFn(`${apiConfig.baseUrl}/academic-year/transition/execute`, 'POST'),
        onSuccess: (data) => {
            showToast('Year transition completed successfully!', 'success');

            // Show rollback token if created
            if (data.rollbackToken) {
                Alert.alert(
                    'Transition Complete',
                    `Year transition successful!\n\nRollback Token (valid for 24 hours):\n${data.rollbackToken}\n\nPlease save this token securely.`,
                    [
                        {
                            text: 'Copy Token',
                            onPress: () => {
                                // In production, use Clipboard API
                                showToast('Token copied to clipboard', 'success');
                            }
                        },
                        {
                            text: 'Done',
                            onPress: () => router.back()
                        }
                    ]
                );
            } else {
                setTimeout(() => router.back(), 1500);
            }
        },
        onError: (error) => showToast(error.message || 'Transition failed', 'error')
    });

    const handleStartPreview = () => {
        previewMutation.mutate({
            currentYearId,
            nextYearId
        });
    };

    const handleUpdatePromotion = (index, field, value) => {
        const updated = [...editedPromotionPlan];
        updated[index] = { ...updated[index], [field]: value };
        setEditedPromotionPlan(updated);
    };

    const handleExecuteTransition = () => {
        if (confirmationText !== 'CONFIRM TRANSITION') {
            showToast('Please type the confirmation text correctly', 'error');
            return;
        }

        executeMutation.mutate({
            currentYearId,
            nextYearId,
            promotionPlan: editedPromotionPlan,
            createRollback
        });
    };

    const renderStepIndicator = () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24, marginTop: 8 }}>
            {[1, 2, 3].map((step) => {
                const isActive = step === currentStep;
                const isCompleted = step < currentStep;

                return (
                    <React.Fragment key={step}>
                        <View style={{ alignItems: 'center', flex: 1 }}>
                            <View style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                backgroundColor: isCompleted
                                    ? colors.success
                                    : isActive
                                        ? colors.primary
                                        : colors.surfaceContainerHigh,
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderWidth: 2,
                                borderColor: isActive ? colors.primary : 'transparent'
                            }}>
                                {isCompleted ? (
                                    <MaterialIcons name="check" size={24} color="#FFF" />
                                ) : (
                                    <Text style={{
                                        fontSize: 16,
                                        fontFamily: 'DMSans-Bold',
                                        color: isActive ? '#FFF' : colors.onSurfaceVariant
                                    }}>
                                        {step}
                                    </Text>
                                )}
                            </View>
                            <Text style={{
                                fontSize: 11,
                                fontFamily: 'DMSans-Medium',
                                color: isActive ? colors.primary : colors.onSurfaceVariant,
                                marginTop: 6,
                                textAlign: 'center'
                            }}>
                                {step === 1 ? 'Preview' : step === 2 ? 'Review' : 'Confirm'}
                            </Text>
                        </View>
                        {step < 3 && (
                            <View style={{
                                flex: 1,
                                height: 2,
                                backgroundColor: step < currentStep ? colors.success : colors.outlineVariant,
                                marginHorizontal: -20,
                                marginTop: -30
                            }} />
                        )}
                    </React.Fragment>
                );
            })}
        </View>
    );

    const renderStep1Preview = () => (
        <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontFamily: 'DMSans-Bold', color: colors.onSurface, marginBottom: 8 }}>
                Preview Transition Impact
            </Text>
            <Text style={{ fontSize: 14, fontFamily: 'DMSans-Regular', color: colors.onSurfaceVariant, marginBottom: 24 }}>
                Review what will happen when you transition to the new academic year
            </Text>

            {previewMutation.isPending ? (
                <View style={{ paddingVertical: 60, alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={{ marginTop: 16, fontSize: 14, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant }}>
                        Analyzing transition impact...
                    </Text>
                </View>
            ) : (
                <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                    <MaterialIcons name="preview" size={64} color={colors.primary} style={{ opacity: 0.5 }} />
                    <Text style={{ fontSize: 16, fontFamily: 'DMSans-Bold', color: colors.onSurface, marginTop: 16 }}>
                        Ready to Preview
                    </Text>
                    <Text style={{ fontSize: 14, fontFamily: 'DMSans-Regular', color: colors.onSurfaceVariant, marginTop: 8, textAlign: 'center', paddingHorizontal: 32 }}>
                        Click below to analyze the impact of this year transition
                    </Text>
                    <Pressable
                        onPress={handleStartPreview}
                        style={({ pressed }) => ({
                            backgroundColor: pressed ? colors.primary + 'DD' : colors.primary,
                            paddingVertical: 14,
                            paddingHorizontal: 32,
                            borderRadius: 12,
                            marginTop: 24,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8
                        })}
                    >
                        <MaterialIcons name="play-arrow" size={20} color="#FFF" />
                        <Text style={{ fontSize: 15, fontFamily: 'DMSans-Bold', color: '#FFF' }}>
                            Start Preview
                        </Text>
                    </Pressable>
                </View>
            )}
        </View>
    );

    const renderStep2Review = () => {
        if (!impactData) return null;

        const { impact, warnings = [], promotionPlan = [] } = impactData;
        const manualReviewStudents = promotionPlan.filter(p => p.status === 'manual_review');

        return (
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                <Text style={{ fontSize: 20, fontFamily: 'DMSans-Bold', color: colors.onSurface, marginBottom: 8 }}>
                    Review Impact & Promotions
                </Text>
                <Text style={{ fontSize: 14, fontFamily: 'DMSans-Regular', color: colors.onSurfaceVariant, marginBottom: 20 }}>
                    Review the analysis and make any necessary adjustments
                </Text>

                {/* Impact Summary */}
                <View style={{ backgroundColor: colors.primaryContainer, borderRadius: 12, padding: 16, marginBottom: 16 }}>
                    <Text style={{ fontSize: 16, fontFamily: 'DMSans-Bold', color: colors.onSurface, marginBottom: 12 }}>
                        Impact Summary
                    </Text>
                    <View style={{ gap: 10 }}>
                        <StatRow icon="people" label="Students Affected" value={impact?.studentsAffected || 0} color={colors.primary} />
                        <StatRow icon="trending-up" label="Will be Promoted" value={impact?.studentsPromoted || 0} color={colors.success} />
                        <StatRow icon="school" label="Will Graduate" value={impact?.studentsGraduated || 0} color={colors.secondary} />
                        <StatRow icon="flag" label="Need Manual Review" value={impact?.studentsNeedReview || 0} color={colors.error} />
                    </View>
                </View>

                {/* Warnings */}
                {warnings.length > 0 && (
                    <View style={{ backgroundColor: colors.errorContainer, borderRadius: 12, padding: 16, marginBottom: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <MaterialIcons name="warning" size={20} color={colors.error} />
                            <Text style={{ fontSize: 16, fontFamily: 'DMSans-Bold', color: colors.error }}>
                                Warnings ({warnings.length})
                            </Text>
                        </View>
                        {warnings.map((warning, index) => (
                            <Text key={index} style={{ fontSize: 13, fontFamily: 'DMSans-Regular', color: colors.onErrorContainer, marginBottom: 6 }}>
                                • {warning.message}
                            </Text>
                        ))}
                    </View>
                )}

                {/* Manual Review Required */}
                {manualReviewStudents.length > 0 && (
                    <View style={{ marginBottom: 16 }}>
                        <Text style={{ fontSize: 16, fontFamily: 'DMSans-Bold', color: colors.onSurface, marginBottom: 12 }}>
                            Manual Review Required ({manualReviewStudents.length})
                        </Text>
                        {manualReviewStudents.slice(0, 5).map((student, index) => (
                            <View
                                key={index}
                                style={{
                                    backgroundColor: colors.surfaceContainerHighest,
                                    borderRadius: 12,
                                    padding: 14,
                                    marginBottom: 10,
                                    borderLeftWidth: 3,
                                    borderLeftColor: colors.error
                                }}
                            >
                                <Text style={{ fontSize: 15, fontFamily: 'DMSans-Bold', color: colors.onSurface }}>
                                    {student.studentName}
                                </Text>
                                <Text style={{ fontSize: 12, fontFamily: 'DMSans-Regular', color: colors.onSurfaceVariant, marginTop: 4 }}>
                                    Current: {student.currentClass || 'None'} → Next: {student.nextClass || 'Not assigned'}
                                </Text>
                                <Text style={{ fontSize: 12, fontFamily: 'DMSans-Regular', color: colors.error, marginTop: 4 }}>
                                    Reason: {student.reason}
                                </Text>
                            </View>
                        ))}
                        {manualReviewStudents.length > 5 && (
                            <Text style={{ fontSize: 13, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant, marginTop: 8 }}>
                                ...and {manualReviewStudents.length - 5} more students need review
                            </Text>
                        )}
                    </View>
                )}

                {/* Navigation Buttons */}
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 24 }}>
                    <Pressable
                        onPress={() => setCurrentStep(1)}
                        style={({ pressed }) => ({
                            flex: 1,
                            backgroundColor: pressed ? colors.surfaceContainerHighest : colors.surfaceContainerHigh,
                            paddingVertical: 14,
                            borderRadius: 12,
                            alignItems: 'center'
                        })}
                    >
                        <Text style={{ fontSize: 15, fontFamily: 'DMSans-Bold', color: colors.onSurface }}>
                            ← Back
                        </Text>
                    </Pressable>
                    <Pressable
                        onPress={() => setCurrentStep(3)}
                        style={({ pressed }) => ({
                            flex: 2,
                            backgroundColor: pressed ? colors.primary + 'DD' : colors.primary,
                            paddingVertical: 14,
                            borderRadius: 12,
                            alignItems: 'center'
                        })}
                    >
                        <Text style={{ fontSize: 15, fontFamily: 'DMSans-Bold', color: '#FFF' }}>
                            Next: Confirm →
                        </Text>
                    </Pressable>
                </View>
            </ScrollView>
        );
    };

    const renderStep3Confirm = () => {
        if (!impactData) return null;

        const isConfirmed = confirmationText === 'CONFIRM TRANSITION';

        return (
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                <Text style={{ fontSize: 20, fontFamily: 'DMSans-Bold', color: colors.onSurface, marginBottom: 8 }}>
                    Confirm & Execute
                </Text>
                <Text style={{ fontSize: 14, fontFamily: 'DMSans-Regular', color: colors.onSurfaceVariant, marginBottom: 20 }}>
                    Final confirmation before executing the year transition
                </Text>

                {/* Warning Box */}
                <View style={{ backgroundColor: colors.errorContainer, borderRadius: 12, padding: 16, marginBottom: 20 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <MaterialIcons name="warning" size={24} color={colors.error} />
                        <Text style={{ fontSize: 16, fontFamily: 'DMSans-Bold', color: colors.error }}>
                            THIS ACTION WILL:
                        </Text>
                    </View>
                    <View style={{ gap: 8 }}>
                        <CheckItem text={`Archive current year (${impactData.currentYear?.name})`} />
                        <CheckItem text={`Promote ${impactData.impact?.studentsPromoted || 0} students`} />
                        <CheckItem text={`Graduate ${impactData.impact?.studentsGraduated || 0} students`} />
                        <CheckItem text="Reset all class rosters" />
                        <CheckItem text={`Create ${impactData.impact?.studentsAffected || 0} historical records`} />
                        <CheckItem text={`Activate new year (${impactData.nextYear?.name})`} />
                    </View>
                </View>

                {/* Options */}
                <View style={{ gap: 12, marginBottom: 20 }}>
                    <Pressable
                        onPress={() => setCreateRollback(!createRollback)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
                    >
                        <View style={{
                            width: 24,
                            height: 24,
                            borderRadius: 6,
                            borderWidth: 2,
                            borderColor: createRollback ? colors.primary : colors.outline,
                            backgroundColor: createRollback ? colors.primary : 'transparent',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {createRollback && <MaterialIcons name="check" size={16} color="#FFF" />}
                        </View>
                        <Text style={{ fontSize: 14, fontFamily: 'DMSans-Medium', color: colors.onSurface, flex: 1 }}>
                            Create rollback point (recommended)
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={() => setSendNotifications(!sendNotifications)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
                    >
                        <View style={{
                            width: 24,
                            height: 24,
                            borderRadius: 6,
                            borderWidth: 2,
                            borderColor: sendNotifications ? colors.primary : colors.outline,
                            backgroundColor: sendNotifications ? colors.primary : 'transparent',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {sendNotifications && <MaterialIcons name="check" size={16} color="#FFF" />}
                        </View>
                        <Text style={{ fontSize: 14, fontFamily: 'DMSans-Medium', color: colors.onSurface, flex: 1 }}>
                            Send notifications to all users
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={() => setGenerateReport(!generateReport)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
                    >
                        <View style={{
                            width: 24,
                            height: 24,
                            borderRadius: 6,
                            borderWidth: 2,
                            borderColor: generateReport ? colors.primary : colors.outline,
                            backgroundColor: generateReport ? colors.primary : 'transparent',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {generateReport && <MaterialIcons name="check" size={16} color="#FFF" />}
                        </View>
                        <Text style={{ fontSize: 14, fontFamily: 'DMSans-Medium', color: colors.onSurface, flex: 1 }}>
                            Generate transition report
                        </Text>
                    </Pressable>
                </View>

                {/* Confirmation Input */}
                <View style={{ backgroundColor: colors.surfaceContainerHighest, borderRadius: 12, padding: 16, marginBottom: 20 }}>
                    <Text style={{ fontSize: 14, fontFamily: 'DMSans-Bold', color: colors.onSurface, marginBottom: 8 }}>
                        🔐 Security Confirmation Required
                    </Text>
                    <Text style={{ fontSize: 13, fontFamily: 'DMSans-Regular', color: colors.onSurfaceVariant, marginBottom: 12 }}>
                        Type "CONFIRM TRANSITION" to proceed:
                    </Text>
                    <TextInput
                        value={confirmationText}
                        onChangeText={setConfirmationText}
                        placeholder="CONFIRM TRANSITION"
                        placeholderTextColor={colors.onSurfaceVariant}
                        style={{
                            backgroundColor: colors.surface,
                            borderWidth: 2,
                            borderColor: isConfirmed ? colors.success : colors.outline,
                            borderRadius: 8,
                            paddingHorizontal: 16,
                            paddingVertical: 12,
                            fontSize: 15,
                            fontFamily: 'DMSans-Bold',
                            color: colors.onSurface
                        }}
                    />
                </View>

                {/* Navigation Buttons */}
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 24 }}>
                    <Pressable
                        onPress={() => setCurrentStep(2)}
                        style={({ pressed }) => ({
                            flex: 1,
                            backgroundColor: pressed ? colors.surfaceContainerHighest : colors.surfaceContainerHigh,
                            paddingVertical: 14,
                            borderRadius: 12,
                            alignItems: 'center'
                        })}
                    >
                        <Text style={{ fontSize: 15, fontFamily: 'DMSans-Bold', color: colors.onSurface }}>
                            ← Back
                        </Text>
                    </Pressable>
                    <Pressable
                        onPress={handleExecuteTransition}
                        disabled={!isConfirmed || executeMutation.isPending}
                        style={({ pressed }) => ({
                            flex: 2,
                            backgroundColor: !isConfirmed || executeMutation.isPending
                                ? colors.surfaceContainerHigh
                                : (pressed ? colors.error + 'DD' : colors.error),
                            paddingVertical: 14,
                            borderRadius: 12,
                            alignItems: 'center',
                            opacity: !isConfirmed || executeMutation.isPending ? 0.5 : 1
                        })}
                    >
                        {executeMutation.isPending ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <Text style={{ fontSize: 15, fontFamily: 'DMSans-Bold', color: '#FFF' }}>
                                Execute Transition
                            </Text>
                        )}
                    </Pressable>
                </View>
            </ScrollView>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 24, paddingBottom: 40 }}>
                <Header
                    title="Year Transition"
                    subtitle="3-Step Wizard"
                    showBack
                />

                {renderStepIndicator()}

                {currentStep === 1 && renderStep1Preview()}
                {currentStep === 2 && renderStep2Review()}
                {currentStep === 3 && renderStep3Confirm()}
            </ScrollView>
        </View>
    );
}

// Helper Components
function StatRow({ icon, label, value, color }) {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <MaterialIcons name={icon} size={20} color={color} />
            <Text style={{ flex: 1, fontSize: 14, fontFamily: 'DMSans-Medium', color: color }}>
                {label}
            </Text>
            <Text style={{ fontSize: 16, fontFamily: 'DMSans-Bold', color }}>
                {value}
            </Text>
        </View>
    );
}

function CheckItem({ text }) {
    const { colors } = useTheme();
    return (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <MaterialIcons name="check" size={16} color={colors.onErrorContainer} style={{ marginTop: 2 }} />
            <Text style={{ fontSize: 13, fontFamily: 'DMSans-Regular', color: colors.onErrorContainer, flex: 1 }}>
                {text}
            </Text>
        </View>
    );
}
