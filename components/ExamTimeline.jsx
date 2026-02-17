import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme';

/**
 * ExamTimeline Component — Enhanced
 * Visual timeline showing upcoming and past exams with animations
 *
 * @param {Array} exams - Array of exam objects sorted by date
 * @param {Function} onExamPress - Handler for exam press
 */
export default function ExamTimeline({ exams = [], onExamPress }) {
    const { colors } = useTheme();
    const animations = useRef(exams.map(() => new Animated.Value(0))).current;

    useEffect(() => {
        // Staggered entrance animation
        const staggeredAnimations = animations.map((anim, index) =>
            Animated.timing(anim, {
                toValue: 1,
                duration: 400,
                delay: index * 80,
                useNativeDriver: true,
            })
        );
        Animated.stagger(60, staggeredAnimations).start();
    }, []);

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
            month: 'short',
            weekday: 'short'
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
        if (diffDays === -1) return 'Yesterday';
        if (diffDays < 0) return `${Math.abs(diffDays)}d ago`;
        if (diffDays <= 7) return `${diffDays} days`;
        return `${Math.ceil(diffDays / 7)}w`;
    };

    const getExamTypeColor = (type) => {
        const typeColors = {
            FA1: '#2196F3',
            FA2: '#03A9F4',
            SA1: '#9C27B0',
            FA3: '#FF9800',
            FA4: '#FF5722',
            SA2: '#E91E63'
        };
        return typeColors[type] || '#2196F3';
    };

    if (!exams || exams.length === 0) {
        return (
            <View style={{
                alignItems: 'center',
                paddingVertical: 48,
                backgroundColor: colors.surfaceContainerHighest,
                borderRadius: 16,
                gap: 12
            }}>
                <View style={{
                    width: 72,
                    height: 72,
                    borderRadius: 36,
                    backgroundColor: colors.primaryContainer,
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <MaterialIcons name="event-available" size={36} color={colors.primary} />
                </View>
                <Text style={{
                    color: colors.onSurfaceVariant,
                    fontSize: 15,
                    fontFamily: 'DMSans-Medium',
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
                const daysLabel = getDaysUntil(exam.date);
                const isLast = index === exams.length - 1;

                // Animated values
                const opacity = animations[index] || new Animated.Value(1);
                const translateX = opacity.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                });

                return (
                    <Animated.View
                        key={exam._id || index}
                        style={{
                            flexDirection: 'row',
                            marginBottom: isLast ? 0 : 4,
                            opacity,
                            transform: [{ translateX }],
                        }}
                    >
                        {/* Timeline Column */}
                        <View style={{ alignItems: 'center', width: 28 }}>
                            {/* Dot */}
                            <View style={{
                                width: today ? 18 : 14,
                                height: today ? 18 : 14,
                                borderRadius: today ? 9 : 7,
                                backgroundColor: past
                                    ? colors.outlineVariant
                                    : (today ? colors.error : examColor),
                                borderWidth: today ? 3 : 2,
                                borderColor: today
                                    ? colors.error + '30'
                                    : (past ? colors.surfaceContainerHighest : examColor + '30'),
                                zIndex: 1,
                                ...(today ? {
                                    shadowColor: colors.error,
                                    shadowOffset: { width: 0, height: 0 },
                                    shadowOpacity: 0.5,
                                    shadowRadius: 6,
                                    elevation: 4,
                                } : {})
                            }} />

                            {/* Gradient Connector Line */}
                            {!isLast && (
                                <View style={{
                                    width: 2.5,
                                    flex: 1,
                                    marginVertical: 2,
                                    borderRadius: 2,
                                    overflow: 'hidden',
                                }}>
                                    <LinearGradient
                                        colors={[
                                            past ? colors.outlineVariant + '60' : examColor + '60',
                                            past ? colors.outlineVariant + '20' : (getExamTypeColor(exams[index + 1]?.standardizedType) + '60' || examColor + '20')
                                        ]}
                                        style={{ flex: 1 }}
                                    />
                                </View>
                            )}
                        </View>

                        {/* Exam Card */}
                        <Pressable
                            onPress={() => onExamPress?.(exam)}
                            style={({ pressed }) => ({
                                flex: 1,
                                marginLeft: 12,
                                backgroundColor: pressed
                                    ? colors.surfaceContainerHigh
                                    : (today ? examColor + '08' : colors.surfaceContainerHighest),
                                borderRadius: 14,
                                padding: 14,
                                borderLeftWidth: 3,
                                borderLeftColor: past ? colors.outlineVariant : (today ? colors.error : examColor),
                                opacity: past ? 0.65 : 1,
                                marginBottom: 12,
                                ...(today ? {
                                    borderWidth: 1,
                                    borderColor: colors.error + '20',
                                } : {})
                            })}
                        >
                            {/* Top Row: Type Badge + Date */}
                            <View style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                marginBottom: 8
                            }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                    <View style={{
                                        backgroundColor: examColor + '18',
                                        paddingHorizontal: 8,
                                        paddingVertical: 3,
                                        borderRadius: 6
                                    }}>
                                        <Text style={{
                                            color: examColor,
                                            fontSize: 11,
                                            fontFamily: 'DMSans-Bold',
                                            letterSpacing: 0.5
                                        }}>
                                            {exam.standardizedType}
                                        </Text>
                                    </View>
                                    {today && (
                                        <View style={{
                                            backgroundColor: colors.error,
                                            paddingHorizontal: 8,
                                            paddingVertical: 3,
                                            borderRadius: 6,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 3
                                        }}>
                                            <MaterialIcons name="circle" size={6} color="#fff" />
                                            <Text style={{
                                                color: '#fff',
                                                fontSize: 10,
                                                fontFamily: 'DMSans-Bold',
                                                letterSpacing: 1
                                            }}>
                                                TODAY
                                            </Text>
                                        </View>
                                    )}
                                    {exam.marksPublished && (
                                        <View style={{
                                            backgroundColor: colors.success + '18',
                                            paddingHorizontal: 8,
                                            paddingVertical: 3,
                                            borderRadius: 6,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 3
                                        }}>
                                            <MaterialIcons name="check-circle" size={10} color={colors.success} />
                                            <Text style={{
                                                color: colors.success,
                                                fontSize: 10,
                                                fontFamily: 'DMSans-Bold',
                                            }}>
                                                MARKS OUT
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {/* Countdown / Date Badge */}
                                <View style={{
                                    backgroundColor: past
                                        ? colors.surfaceContainerHigh
                                        : (today ? colors.error + '15' : colors.primaryContainer),
                                    paddingHorizontal: 10,
                                    paddingVertical: 4,
                                    borderRadius: 8,
                                    alignItems: 'center',
                                    minWidth: 54,
                                }}>
                                    <Text style={{
                                        fontSize: 12,
                                        fontFamily: 'DMSans-Bold',
                                        color: past
                                            ? colors.onSurfaceVariant
                                            : (today ? colors.error : colors.primary),
                                    }}>
                                        {daysLabel}
                                    </Text>
                                </View>
                            </View>

                            {/* Subject Name */}
                            <Text style={{
                                fontSize: 16,
                                fontFamily: 'DMSans-Bold',
                                color: colors.onSurface,
                                marginBottom: 4
                            }}>
                                {exam.subject?.name || exam.name}
                            </Text>

                            {/* Bottom Row: Date + Marks + Duration */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <MaterialIcons name="calendar-today" size={13} color={colors.onSurfaceVariant} />
                                    <Text style={{ fontSize: 12, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant }}>
                                        {formatDate(exam.date)}
                                    </Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <MaterialIcons name="assessment" size={13} color={colors.onSurfaceVariant} />
                                    <Text style={{ fontSize: 12, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant }}>
                                        {exam.totalMarks} marks
                                    </Text>
                                </View>
                                {exam.duration && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <MaterialIcons name="schedule" size={13} color={colors.onSurfaceVariant} />
                                        <Text style={{ fontSize: 12, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant }}>
                                            {exam.duration}m
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </Pressable>
                    </Animated.View>
                );
            })}
        </View>
    );
}
