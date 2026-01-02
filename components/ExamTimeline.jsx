import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../theme';

/**
 * ExamTimeline Component
 * Visual timeline showing upcoming and past exams
 * 
 * @param {Array} exams - Array of exam objects sorted by date
 * @param {Function} onExamPress - Handler for exam press
 */
export default function ExamTimeline({ exams = [], onExamPress }) {
    const { colors } = useTheme();

    const isToday = (date) => {
        const today = new Date();
        const examDate = new Date(date);
        return today.toDateString() === examDate.toDateString();
    };

    const isPast = (date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const examDate = new Date(date);
        examDate.setHours(0, 0, 0, 0);
        return examDate < today;
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short'
        });
    };

    const getDaysUntil = (date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const examDate = new Date(date);
        examDate.setHours(0, 0, 0, 0);
        const diffTime = examDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Tomorrow';
        if (diffDays < 0) return 'Past';
        return `${diffDays} days`;
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

    if (!exams || exams.length === 0) {
        return (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <MaterialIcons name="event-available" size={48} color={colors.onSurfaceVariant} style={{ opacity: 0.5 }} />
                <Text style={{
                    color: colors.onSurfaceVariant,
                    fontSize: 14,
                    fontFamily: 'DMSans-Medium',
                    marginTop: 12,
                    opacity: 0.7
                }}>
                    No exams scheduled
                </Text>
            </View>
        );
    }

    return (
        <View style={{ paddingVertical: 8 }}>
            {exams.map((exam, index) => {
                const examColor = getExamTypeColor(exam.standardizedType);
                const past = isPast(exam.date);
                const today = isToday(exam.date);

                return (
                    <View key={exam._id || index} style={{ flexDirection: 'row', marginBottom: index === exams.length - 1 ? 0 : 16 }}>
                        {/* Timeline Line */}
                        <View style={{ alignItems: 'center', marginRight: 16 }}>
                            {/* Dot */}
                            <View style={{
                                width: 12,
                                height: 12,
                                borderRadius: 6,
                                backgroundColor: past ? colors.onSurfaceVariant : (today ? colors.error : examColor),
                                borderWidth: 2,
                                borderColor: colors.surface,
                                opacity: past ? 0.5 : 1
                            }} />
                            {/* Line */}
                            {index < exams.length - 1 && (
                                <View style={{
                                    width: 2,
                                    flex: 1,
                                    backgroundColor: colors.outlineVariant,
                                    marginVertical: 4,
                                    opacity: 0.5
                                }} />
                            )}
                        </View>

                        {/* Exam Card */}
                        <Pressable
                            onPress={() => onExamPress?.(exam)}
                            style={({ pressed }) => ({
                                flex: 1,
                                backgroundColor: pressed ? colors.surfaceContainerHigh : colors.surfaceContainerHighest,
                                borderRadius: 12,
                                padding: 12,
                                borderLeftWidth: 3,
                                borderLeftColor: past ? colors.onSurfaceVariant : (today ? colors.error : examColor),
                                opacity: past ? 0.7 : 1
                            })}
                        >
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                        <View style={{
                                            backgroundColor: examColor + '20',
                                            paddingHorizontal: 6,
                                            paddingVertical: 2,
                                            borderRadius: 4
                                        }}>
                                            <Text style={{
                                                color: examColor,
                                                fontSize: 10,
                                                fontFamily: 'DMSans-Bold'
                                            }}>
                                                {exam.standardizedType}
                                            </Text>
                                        </View>
                                        {today && (
                                            <View style={{
                                                backgroundColor: colors.error + '20',
                                                paddingHorizontal: 6,
                                                paddingVertical: 2,
                                                borderRadius: 4
                                            }}>
                                                <Text style={{
                                                    color: colors.error,
                                                    fontSize: 10,
                                                    fontFamily: 'DMSans-Bold'
                                                }}>
                                                    TODAY
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={{
                                        fontSize: 15,
                                        fontFamily: 'DMSans-Bold',
                                        color: colors.onSurface,
                                        marginBottom: 2
                                    }}>
                                        {exam.subject?.name || exam.name}
                                    </Text>
                                    <Text style={{
                                        fontSize: 12,
                                        fontFamily: 'DMSans-Regular',
                                        color: colors.onSurfaceVariant
                                    }}>
                                        {exam.name}
                                    </Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={{
                                        fontSize: 12,
                                        fontFamily: 'DMSans-Bold',
                                        color: past ? colors.onSurfaceVariant : (today ? colors.error : colors.primary),
                                        marginBottom: 2
                                    }}>
                                        {formatDate(exam.date)}
                                    </Text>
                                    <Text style={{
                                        fontSize: 10,
                                        fontFamily: 'DMSans-Medium',
                                        color: colors.onSurfaceVariant
                                    }}>
                                        {getDaysUntil(exam.date)}
                                    </Text>
                                </View>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <MaterialIcons name="assessment" size={14} color={colors.onSurfaceVariant} />
                                    <Text style={{ fontSize: 11, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant }}>
                                        {exam.totalMarks} marks
                                    </Text>
                                </View>
                                {exam.duration && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <MaterialIcons name="schedule" size={14} color={colors.onSurfaceVariant} />
                                        <Text style={{ fontSize: 11, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant }}>
                                            {exam.duration} min
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </Pressable>
                    </View>
                );
            })}
        </View>
    );
}
