import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    RefreshControl,
    ActivityIndicator,
    Pressable,
    Animated
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme';
import { useApiQuery } from '../../hooks/useApi';
import apiConfig from '../../config/apiConfig';
import Header from '../../components/Header';
import ExamTimeline from '../../components/ExamTimeline';

/**
 * Student Exam Schedule Screen — Enhanced
 * Shows upcoming exams with hero countdown + timeline
 */
export default function StudentExamScheduleScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const [refreshing, setRefreshing] = useState(false);
    const [filterSubject, setFilterSubject] = useState(null);

    // Entrance animations
    const heroAnim = useRef(new Animated.Value(0)).current;
    const filterAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.stagger(150, [
            Animated.spring(heroAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
            Animated.spring(filterAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
        ]).start();
    }, []);

    // Fetch exam schedule
    const { data: examsData, isLoading, refetch } = useApiQuery(
        ['studentExamSchedule'],
        `${apiConfig.baseUrl}/exams/schedule/student`
    );

    const exams = examsData || [];

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    // Group exams by subject
    const examsBySubject = exams.reduce((acc, exam) => {
        const subjectId = exam.subject?._id;
        if (!subjectId) return acc;
        if (!acc[subjectId]) {
            acc[subjectId] = { subject: exam.subject, exams: [] };
        }
        acc[subjectId].exams.push(exam);
        return acc;
    }, {});

    const subjects = Object.values(examsBySubject).map(group => group.subject);

    // Filter exams
    const filteredExams = filterSubject
        ? exams.filter(e => e.subject?._id === filterSubject)
        : exams;

    // Sort by date
    const sortedExams = [...filteredExams].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Split into upcoming and past
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingExams = sortedExams.filter(e => new Date(e.date) >= today);
    const pastExams = sortedExams.filter(e => new Date(e.date) < today);

    // Next exam for hero card
    const nextExam = upcomingExams[0] || null;
    const getCountdown = (date) => {
        const now = new Date();
        const examDate = new Date(date);
        const diffMs = examDate - now;
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if (days === 0 && hours <= 0) return { text: 'Today!', urgent: true };
        if (days === 0) return { text: `${hours}h left`, urgent: true };
        if (days === 1) return { text: 'Tomorrow', urgent: true };
        return { text: `${days} days`, urgent: days <= 3 };
    };

    if (isLoading) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[colors.primary]}
                    />
                }
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                <View style={{ padding: 16, paddingTop: 24 }}>
                    <Header
                        title="Exam Schedule"
                        subtitle="Stay on top of your exams"
                        showBack
                    />

                    {/* Hero Countdown Card */}
                    {nextExam && (
                        <Animated.View style={{
                            opacity: heroAnim,
                            transform: [{
                                translateY: heroAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [20, 0]
                                })
                            }],
                            marginTop: 20,
                            borderRadius: 20,
                            overflow: 'hidden',
                        }}>
                            <LinearGradient
                                colors={[colors.primary, colors.onPrimaryContainer]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={{ padding: 24 }}
                            >
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{
                                            fontSize: 11,
                                            fontFamily: 'DMSans-Bold',
                                            color: colors.onPrimary,
                                            opacity: 0.7,
                                            textTransform: 'uppercase',
                                            letterSpacing: 1.5,
                                            marginBottom: 8
                                        }}>
                                            Next Exam
                                        </Text>
                                        <Text style={{
                                            fontSize: 22,
                                            fontFamily: 'DMSans-Bold',
                                            color: colors.onPrimary,
                                            marginBottom: 4
                                        }}>
                                            {nextExam.subject?.name || nextExam.name}
                                        </Text>
                                        <Text style={{
                                            fontSize: 13,
                                            fontFamily: 'DMSans-Medium',
                                            color: colors.onPrimary,
                                            opacity: 0.8,
                                        }}>
                                            {new Date(nextExam.date).toLocaleDateString('en-IN', {
                                                weekday: 'long',
                                                day: 'numeric',
                                                month: 'long'
                                            })}
                                        </Text>
                                    </View>
                                    <View style={{
                                        backgroundColor: 'rgba(255,255,255,0.2)',
                                        borderRadius: 16,
                                        padding: 16,
                                        alignItems: 'center',
                                        minWidth: 80,
                                    }}>
                                        <Text style={{
                                            fontSize: 28,
                                            fontFamily: 'DMSans-Bold',
                                            color: colors.onPrimary,
                                            lineHeight: 32,
                                        }}>
                                            {getCountdown(nextExam.date).text.split(' ')[0]}
                                        </Text>
                                        <Text style={{
                                            fontSize: 11,
                                            fontFamily: 'DMSans-Medium',
                                            color: colors.onPrimary,
                                            opacity: 0.8,
                                            marginTop: 2,
                                        }}>
                                            {getCountdown(nextExam.date).text.split(' ').slice(1).join(' ') || 'Exam'}
                                        </Text>
                                    </View>
                                </View>

                                {/* Meta items */}
                                <View style={{
                                    flexDirection: 'row',
                                    gap: 16,
                                    marginTop: 16,
                                    paddingTop: 16,
                                    borderTopWidth: 1,
                                    borderTopColor: 'rgba(255,255,255,0.15)'
                                }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <MaterialIcons name="assignment" size={16} color={colors.onPrimary} style={{ opacity: 0.8 }} />
                                        <Text style={{ fontSize: 13, fontFamily: 'DMSans-Medium', color: colors.onPrimary, opacity: 0.9 }}>
                                            {nextExam.totalMarks} marks
                                        </Text>
                                    </View>
                                    {nextExam.duration && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <MaterialIcons name="schedule" size={16} color={colors.onPrimary} style={{ opacity: 0.8 }} />
                                            <Text style={{ fontSize: 13, fontFamily: 'DMSans-Medium', color: colors.onPrimary, opacity: 0.9 }}>
                                                {nextExam.duration} min
                                            </Text>
                                        </View>
                                    )}
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <MaterialIcons name="label" size={16} color={colors.onPrimary} style={{ opacity: 0.8 }} />
                                        <Text style={{ fontSize: 13, fontFamily: 'DMSans-Medium', color: colors.onPrimary, opacity: 0.9 }}>
                                            {nextExam.standardizedType}
                                        </Text>
                                    </View>
                                </View>
                            </LinearGradient>
                        </Animated.View>
                    )}

                    {/* Stats Row */}
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 20 }}>
                        {[
                            { label: 'Total', value: exams.length, color: colors.primary, bg: colors.primaryContainer },
                            { label: 'Upcoming', value: upcomingExams.length, color: '#FF9800', bg: '#FF980012' },
                            { label: 'Done', value: pastExams.length, color: colors.success, bg: colors.success + '12' },
                        ].map((stat, i) => (
                            <View key={i} style={{
                                flex: 1,
                                backgroundColor: stat.bg,
                                borderRadius: 14,
                                padding: 14,
                                alignItems: 'center',
                            }}>
                                <Text style={{
                                    fontSize: 24,
                                    fontFamily: 'DMSans-Bold',
                                    color: stat.color,
                                    lineHeight: 28,
                                }}>
                                    {stat.value}
                                </Text>
                                <Text style={{
                                    fontSize: 11,
                                    fontFamily: 'DMSans-Medium',
                                    color: colors.onSurfaceVariant,
                                    marginTop: 4
                                }}>
                                    {stat.label}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {/* Subject Filter */}
                    {subjects.length > 1 && (
                        <Animated.View style={{
                            marginBottom: 20,
                            opacity: filterAnim,
                            transform: [{
                                translateY: filterAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [10, 0]
                                })
                            }],
                        }}>
                            <Text style={{
                                fontSize: 13,
                                fontFamily: 'DMSans-Medium',
                                color: colors.onSurfaceVariant,
                                marginBottom: 10
                            }}>
                                Filter by Subject
                            </Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    <Pressable
                                        onPress={() => setFilterSubject(null)}
                                        style={({ pressed }) => ({
                                            backgroundColor: !filterSubject
                                                ? colors.primary
                                                : (pressed ? colors.surfaceContainerHigh : colors.surfaceContainerHighest),
                                            paddingHorizontal: 16,
                                            paddingVertical: 8,
                                            borderRadius: 20
                                        })}
                                    >
                                        <Text style={{
                                            fontSize: 13,
                                            fontFamily: 'DMSans-Bold',
                                            color: !filterSubject ? '#FFFFFF' : colors.onSurface
                                        }}>
                                            All
                                        </Text>
                                    </Pressable>

                                    {subjects.map(subject => (
                                        <Pressable
                                            key={subject._id}
                                            onPress={() => setFilterSubject(subject._id)}
                                            style={({ pressed }) => ({
                                                backgroundColor: filterSubject === subject._id
                                                    ? colors.primary
                                                    : (pressed ? colors.surfaceContainerHigh : colors.surfaceContainerHighest),
                                                paddingHorizontal: 16,
                                                paddingVertical: 8,
                                                borderRadius: 20
                                            })}
                                        >
                                            <Text style={{
                                                fontSize: 13,
                                                fontFamily: 'DMSans-Bold',
                                                color: filterSubject === subject._id ? '#FFFFFF' : colors.onSurface
                                            }}>
                                                {subject.name}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </ScrollView>
                        </Animated.View>
                    )}

                    {/* Upcoming Exams */}
                    {upcomingExams.length > 0 && (
                        <View style={{ marginBottom: 28 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                <MaterialIcons name="upcoming" size={20} color={colors.onSurface} />
                                <Text style={{
                                    fontSize: 18,
                                    fontFamily: 'DMSans-Bold',
                                    color: colors.onSurface
                                }}>
                                    Upcoming Exams
                                </Text>
                                <View style={{
                                    backgroundColor: colors.primaryContainer,
                                    paddingHorizontal: 8,
                                    paddingVertical: 2,
                                    borderRadius: 10,
                                    marginLeft: 4,
                                }}>
                                    <Text style={{
                                        fontSize: 11,
                                        fontFamily: 'DMSans-Bold',
                                        color: colors.primary
                                    }}>
                                        {upcomingExams.length}
                                    </Text>
                                </View>
                            </View>

                            <ExamTimeline
                                exams={upcomingExams}
                                onExamPress={(exam) => {
                                    if (exam.marksPublished) {
                                        router.push('/student/report-card');
                                    }
                                }}
                            />
                        </View>
                    )}

                    {/* Past Exams */}
                    {pastExams.length > 0 && (
                        <View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                <MaterialIcons name="history" size={20} color={colors.onSurfaceVariant} />
                                <Text style={{
                                    fontSize: 18,
                                    fontFamily: 'DMSans-Bold',
                                    color: colors.onSurface
                                }}>
                                    Past Exams
                                </Text>
                                <View style={{
                                    backgroundColor: colors.surfaceContainerHigh,
                                    paddingHorizontal: 8,
                                    paddingVertical: 2,
                                    borderRadius: 10,
                                    marginLeft: 4,
                                }}>
                                    <Text style={{
                                        fontSize: 11,
                                        fontFamily: 'DMSans-Bold',
                                        color: colors.onSurfaceVariant
                                    }}>
                                        {pastExams.length}
                                    </Text>
                                </View>
                            </View>

                            <ExamTimeline
                                exams={pastExams}
                                onExamPress={(exam) => {
                                    if (exam.marksPublished) {
                                        router.push('/student/report-card');
                                    }
                                }}
                            />
                        </View>
                    )}

                    {/* Empty State */}
                    {exams.length === 0 && (
                        <View style={{
                            alignItems: 'center',
                            paddingVertical: 60,
                            backgroundColor: colors.surfaceContainerHighest,
                            borderRadius: 20,
                            marginTop: 20,
                            gap: 12,
                        }}>
                            <View style={{
                                width: 80,
                                height: 80,
                                borderRadius: 40,
                                backgroundColor: colors.primaryContainer,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <MaterialIcons name="event-available" size={40} color={colors.primary} />
                            </View>
                            <Text style={{
                                fontSize: 18,
                                fontFamily: 'DMSans-Bold',
                                color: colors.onSurface,
                            }}>
                                No exams yet
                            </Text>
                            <Text style={{
                                fontSize: 14,
                                fontFamily: 'DMSans-Regular',
                                color: colors.onSurfaceVariant,
                                textAlign: 'center',
                                paddingHorizontal: 40,
                            }}>
                                Your exam schedule will appear here once your school sets up exams
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
