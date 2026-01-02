import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import Card from './Card';

/**
 * ExamCard Component
 * Reusable card for displaying exam information
 * 
 * @param {Object} exam - Exam object
 * @param {Function} onPress - Optional press handler
 * @param {Function} onEnterMarks - Handler for enter marks action
 * @param {Function} onEdit - Handler for edit action
 * @param {Function} onDelete - Handler for delete action
 * @param {Function} onPublish - Handler for publish marks action
 * @param {Boolean} showActions - Whether to show action buttons
 */
export default function ExamCard({
    exam,
    onPress,
    onEnterMarks,
    onEdit,
    onDelete,
    onPublish,
    showActions = true,
    showProgress = false,
    marksEntered = 0,
    totalStudents = 0
}) {
    const { colors } = useTheme();

    const getStatusColor = (status) => {
        const statusColors = {
            draft: '#9E9E9E',
            scheduled: '#2196F3',
            ongoing: '#FF9800',
            completed: '#4CAF50',
            cancelled: '#F44336'
        };
        return statusColors[status] || '#2196F3';
    };

    const getExamTypeColor = (type) => {
        const typeColors = {
            FA1: '#2196F3',
            FA2: '#03A9F4',
            SA1: '#9C27B0',
            FA3: '#FF9800',
            FA4: '#FF5722',
            SA2: '#F44336'
        };
        return typeColors[type] || '#2196F3';
    };

    const statusColor = getStatusColor(exam.status);
    const typeColor = getExamTypeColor(exam.standardizedType);

    const formatDate = (date) => {
        if (!date) return 'Not scheduled';
        return new Date(date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const progressPercentage = totalStudents > 0
        ? (marksEntered / totalStudents) * 100
        : 0;

    return (
        <Card
            variant="elevated"
            style={{ marginBottom: 12 }}
            contentStyle={{ padding: 0 }}
        >
            <Pressable
                onPress={onPress}
                style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                    padding: 16
                })}
            >
                {/* Header */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <View style={{
                                backgroundColor: typeColor + '20',
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 6
                            }}>
                                <Text style={{
                                    color: typeColor,
                                    fontSize: 12,
                                    fontFamily: 'DMSans-Bold'
                                }}>
                                    {exam.standardizedType}
                                </Text>
                            </View>
                            {exam.marksPublished && (
                                <View style={{
                                    backgroundColor: colors.success + '20',
                                    paddingHorizontal: 8,
                                    paddingVertical: 4,
                                    borderRadius: 6,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 4
                                }}>
                                    <MaterialIcons name="check-circle" size={12} color={colors.success} />
                                    <Text style={{
                                        color: colors.success,
                                        fontSize: 10,
                                        fontFamily: 'DMSans-Medium'
                                    }}>
                                        Published
                                    </Text>
                                </View>
                            )}
                        </View>
                        <Text style={{
                            fontSize: 18,
                            fontFamily: 'DMSans-Bold',
                            color: colors.onSurface,
                            marginBottom: 4
                        }}>
                            {exam.name}
                        </Text>
                        {exam.subject && (
                            <Text style={{
                                fontSize: 14,
                                fontFamily: 'DMSans-Medium',
                                color: colors.onSurfaceVariant
                            }}>
                                {exam.subject.name}
                            </Text>
                        )}
                    </View>
                    <View style={{
                        backgroundColor: statusColor + '15',
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8
                    }}>
                        <Text style={{
                            color: statusColor,
                            fontSize: 12,
                            fontFamily: 'DMSans-Bold',
                            textTransform: 'capitalize'
                        }}>
                            {exam.status || 'Scheduled'}
                        </Text>
                    </View>
                </View>

                {/* Divider */}
                <View style={{ height: 1, backgroundColor: colors.outlineVariant, marginBottom: 12 }} />

                {/* Details */}
                <View style={{ flexDirection: 'row', gap: 20, flexWrap: 'wrap', marginBottom: showProgress ? 12 : 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <MaterialIcons name="calendar-today" size={16} color={colors.onSurfaceVariant} />
                        <Text style={{ color: colors.onSurface, fontSize: 13, fontFamily: 'DMSans-Medium' }}>
                            {formatDate(exam.date)}
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <MaterialIcons name="assessment" size={16} color={colors.onSurfaceVariant} />
                        <Text style={{ color: colors.onSurface, fontSize: 13, fontFamily: 'DMSans-Medium' }}>
                            {exam.totalMarks} marks
                        </Text>
                    </View>
                    {exam.duration && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <MaterialIcons name="schedule" size={16} color={colors.onSurfaceVariant} />
                            <Text style={{ color: colors.onSurface, fontSize: 13, fontFamily: 'DMSans-Medium' }}>
                                {exam.duration} mins
                            </Text>
                        </View>
                    )}
                    {exam.startTime && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <MaterialIcons name="access-time" size={16} color={colors.onSurfaceVariant} />
                            <Text style={{ color: colors.onSurface, fontSize: 13, fontFamily: 'DMSans-Medium' }}>
                                {exam.startTime}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Progress Bar */}
                {showProgress && (
                    <View style={{ marginBottom: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                            <Text style={{ fontSize: 12, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant }}>
                                Marks Entry Progress
                            </Text>
                            <Text style={{ fontSize: 12, fontFamily: 'DMSans-Bold', color: colors.primary }}>
                                {marksEntered}/{totalStudents} ({progressPercentage.toFixed(0)}%)
                            </Text>
                        </View>
                        <View style={{
                            height: 6,
                            backgroundColor: colors.surfaceContainerHighest,
                            borderRadius: 3,
                            overflow: 'hidden'
                        }}>
                            <View style={{
                                height: '100%',
                                width: `${progressPercentage}%`,
                                backgroundColor: progressPercentage === 100 ? colors.success : colors.primary,
                                borderRadius: 3
                            }} />
                        </View>
                    </View>
                )}

                {/* Action Buttons */}
                {showActions && (
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                        {onEnterMarks && (
                            <Pressable
                                onPress={onEnterMarks}
                                style={({ pressed }) => ({
                                    flex: 1,
                                    minWidth: 100,
                                    backgroundColor: pressed ? colors.primary + 'DD' : colors.primary,
                                    paddingVertical: 10,
                                    paddingHorizontal: 16,
                                    borderRadius: 8,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6
                                })}
                            >
                                <MaterialIcons name="edit" size={18} color="#FFFFFF" />
                                <Text style={{ color: '#FFFFFF', fontSize: 13, fontFamily: 'DMSans-Bold' }}>
                                    Enter Marks
                                </Text>
                            </Pressable>
                        )}
                        {onPublish && !exam.marksPublished && (
                            <Pressable
                                onPress={onPublish}
                                style={({ pressed }) => ({
                                    backgroundColor: pressed ? colors.success + 'DD' : colors.success,
                                    paddingVertical: 10,
                                    paddingHorizontal: 16,
                                    borderRadius: 8,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 6
                                })}
                            >
                                <MaterialIcons name="publish" size={18} color="#FFFFFF" />
                                <Text style={{ color: '#FFFFFF', fontSize: 13, fontFamily: 'DMSans-Bold' }}>
                                    Publish
                                </Text>
                            </Pressable>
                        )}
                        {onEdit && (
                            <Pressable
                                onPress={onEdit}
                                style={({ pressed }) => ({
                                    backgroundColor: pressed ? colors.surfaceContainerHighest : colors.surfaceContainerHigh,
                                    paddingVertical: 10,
                                    paddingHorizontal: 12,
                                    borderRadius: 8
                                })}
                            >
                                <MaterialIcons name="edit" size={18} color={colors.onSurface} />
                            </Pressable>
                        )}
                        {onDelete && (
                            <Pressable
                                onPress={onDelete}
                                style={({ pressed }) => ({
                                    backgroundColor: pressed ? colors.errorContainer : colors.errorContainer + '80',
                                    paddingVertical: 10,
                                    paddingHorizontal: 12,
                                    borderRadius: 8
                                })}
                            >
                                <MaterialIcons name="delete" size={18} color={colors.error} />
                            </Pressable>
                        )}
                    </View>
                )}
            </Pressable>
        </Card>
    );
}
