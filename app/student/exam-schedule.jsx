import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    RefreshControl,
    ActivityIndicator,
    Pressable
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../theme';
import { useApiQuery } from '../../hooks/useApi';
import apiConfig from '../../config/apiConfig';
import Header from '../../components/Header';
import ExamTimeline from '../../components/ExamTimeline';

/**
 * Student Exam Schedule Screen - Enhanced
 * Shows upcoming exams in timeline view with countdown and status
 */
export default function StudentExamScheduleScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const [refreshing, setRefreshing] = useState(false);
    const [filterSubject, setFilterSubject] = useState(null);

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
            acc[subjectId] = {
                subject: exam.subject,
                exams: []
            };
        }
        acc[subjectId].exams.push(exam);
        return acc;
    }, {});

    // Get unique subjects for filter
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

    const getExamStats = () => {
        const total = exams.length;
        const upcoming = upcomingExams.length;
        const completed = pastExams.length;

        return { total, upcoming, completed };
    };

    const stats = getExamStats();

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
                        subtitle="View your upcoming exams"
                        showBack
                    />

                    {/* Stats Cards */}
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 20, marginBottom: 20 }}>
                        <View style={{
                            flex: 1,
                            backgroundColor: colors.primaryContainer,
                            borderRadius: 12,
                            padding: 14,
                            alignItems: 'center'
                        }}>
                            <Text style={{ fontSize: 24, fontFamily: 'DMSans-Bold', color: colors.primary }}>
                                {stats.total}
                            </Text>
                            <Text style={{ fontSize: 11, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant, marginTop: 4 }}>
                                Total Exams
                            </Text>
                        </View>
                        <View style={{
                            flex: 1,
                            backgroundColor: colors.secondaryContainer,
                            borderRadius: 12,
                            padding: 14,
                            alignItems: 'center'
                        }}>
                            <Text style={{ fontSize: 24, fontFamily: 'DMSans-Bold', color: '#FF9800' }}>
                                {stats.upcoming}
                            </Text>
                            <Text style={{ fontSize: 11, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant, marginTop: 4 }}>
                                Upcoming
                            </Text>
                        </View>
                        <View style={{
                            flex: 1,
                            backgroundColor: colors.tertiaryContainer,
                            borderRadius: 12,
                            padding: 14,
                            alignItems: 'center'
                        }}>
                            <Text style={{ fontSize: 24, fontFamily: 'DMSans-Bold', color: colors.success }}>
                                {stats.completed}
                            </Text>
                            <Text style={{ fontSize: 11, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant, marginTop: 4 }}>
                                Completed
                            </Text>
                        </View>
                    </View>

                    {/* Subject Filter */}
                    {subjects.length > 1 && (
                        <View style={{ marginBottom: 20 }}>
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
                        </View>
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
                            </View>

                            <ExamTimeline
                                exams={upcomingExams}
                                onExamPress={(exam) => {
                                    // Navigate to exam details or marks if published
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
                            borderRadius: 16,
                            marginTop: 20
                        }}>
                            <MaterialIcons name="event-available" size={64} color={colors.onSurfaceVariant} style={{ opacity: 0.5 }} />
                            <Text style={{
                                fontSize: 16,
                                fontFamily: 'DMSans-Medium',
                                color: colors.onSurfaceVariant,
                                marginTop: 16,
                                textAlign: 'center'
                            }}>
                                No exams scheduled yet
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
