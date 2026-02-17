import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    RefreshControl,
    ActivityIndicator,
    Animated,
    Pressable,
    Dimensions
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme';
import { useApiQuery } from '../../hooks/useApi';
import apiConfig from '../../config/apiConfig';
import Header from '../../components/Header';
import Card from '../../components/Card';

const { width } = Dimensions.get('window');

/**
 * Admin Exam Analytics Screen
 * School-wide exam performance dashboard — admin/super admin only
 */
export default function ExamAnalyticsScreen() {
    const { colors } = useTheme();
    const [refreshing, setRefreshing] = useState(false);
    const [activeView, setActiveView] = useState('overview'); // 'overview' | 'classes' | 'subjects'

    // Entrance animation
    const fadeAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }, []);

    // Fetch school-wide performance
    const { data: schoolData, isLoading, refetch } = useApiQuery(
        ['schoolExamPerformance'],
        `${apiConfig.baseUrl}/exams/performance/school`
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    const getGradeColor = (percentage) => {
        if (percentage >= 80) return colors.success;
        if (percentage >= 60) return '#2196F3';
        if (percentage >= 40) return '#FF9800';
        return colors.error;
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

    if (isLoading) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    const examPerf = schoolData?.examwisePerformance || [];
    const classPerf = schoolData?.classwiseSummary || [];
    const subjectPerf = schoolData?.subjectwiseSummary || [];

    // Overall school average
    const completedExams = examPerf.filter(e => e.marksEntered > 0);
    const schoolAvg = completedExams.length > 0
        ? (completedExams.reduce((sum, e) => sum + e.avgPercentage, 0) / completedExams.length).toFixed(1)
        : 0;

    // Best and worst performing
    const sortedClasses = [...classPerf].filter(c => c.avgPercentage > 0).sort((a, b) => b.avgPercentage - a.avgPercentage);
    const topClass = sortedClasses[0];
    const bottomClass = sortedClasses[sortedClasses.length - 1];

    const renderOverview = () => (
        <Animated.View style={{ opacity: fadeAnim }}>
            {/* Hero Stats Card */}
            <View style={{ borderRadius: 20, overflow: 'hidden', marginTop: 20 }}>
                <LinearGradient
                    colors={[colors.primary, colors.onPrimaryContainer]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ padding: 24 }}
                >
                    <Text style={{
                        fontSize: 12,
                        fontFamily: 'DMSans-Bold',
                        color: colors.onPrimary,
                        opacity: 0.7,
                        textTransform: 'uppercase',
                        letterSpacing: 1.5,
                        marginBottom: 8
                    }}>
                        School Average
                    </Text>

                    <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 56, fontFamily: 'DMSans-Bold', color: colors.onPrimary, lineHeight: 62 }}>
                            {schoolAvg}
                        </Text>
                        <Text style={{ fontSize: 22, fontFamily: 'DMSans-Bold', color: colors.onPrimary, opacity: 0.7, marginBottom: 10, marginLeft: 4 }}>
                            %
                        </Text>
                    </View>

                    {/* Quick Stats */}
                    <View style={{
                        flexDirection: 'row',
                        gap: 12,
                        marginTop: 16,
                        paddingTop: 16,
                        borderTopWidth: 1,
                        borderTopColor: 'rgba(255,255,255,0.15)'
                    }}>
                        <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 12 }}>
                            <Text style={{ fontSize: 20, fontFamily: 'DMSans-Bold', color: colors.onPrimary }}>
                                {classPerf.length}
                            </Text>
                            <Text style={{ fontSize: 11, fontFamily: 'DMSans-Medium', color: colors.onPrimary, opacity: 0.7 }}>
                                Classes
                            </Text>
                        </View>
                        <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 12 }}>
                            <Text style={{ fontSize: 20, fontFamily: 'DMSans-Bold', color: colors.onPrimary }}>
                                {completedExams.length}
                            </Text>
                            <Text style={{ fontSize: 11, fontFamily: 'DMSans-Medium', color: colors.onPrimary, opacity: 0.7 }}>
                                Exams Done
                            </Text>
                        </View>
                        <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 12 }}>
                            <Text style={{ fontSize: 20, fontFamily: 'DMSans-Bold', color: colors.onPrimary }}>
                                {subjectPerf.length}
                            </Text>
                            <Text style={{ fontSize: 11, fontFamily: 'DMSans-Medium', color: colors.onPrimary, opacity: 0.7 }}>
                                Subjects
                            </Text>
                        </View>
                    </View>
                </LinearGradient>
            </View>

            {/* Exam-wise Performance Bars */}
            <View style={{ marginTop: 32 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Text style={{ fontSize: 18, fontFamily: 'DMSans-Bold', color: colors.onBackground }}>
                        Exam-wise Trend
                    </Text>
                </View>

                <Card variant="filled" style={{ padding: 20 }}>
                    <View style={{ gap: 16 }}>
                        {examPerf.map((exam) => {
                            const examColor = getExamTypeColor(exam.examType);
                            const pct = parseFloat(exam.avgPercentage) || 0;
                            return (
                                <View key={exam.examType}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <View style={{
                                                backgroundColor: examColor + '18',
                                                paddingHorizontal: 8,
                                                paddingVertical: 3,
                                                borderRadius: 6
                                            }}>
                                                <Text style={{ fontSize: 12, fontFamily: 'DMSans-Bold', color: examColor }}>
                                                    {exam.examType}
                                                </Text>
                                            </View>
                                            <Text style={{ fontSize: 12, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant }}>
                                                {exam.examsCount} exams
                                            </Text>
                                        </View>
                                        <Text style={{ fontSize: 14, fontFamily: 'DMSans-Bold', color: getGradeColor(pct) }}>
                                            {pct > 0 ? `${pct}%` : '—'}
                                        </Text>
                                    </View>
                                    <View style={{ height: 8, backgroundColor: colors.surfaceContainerHighest, borderRadius: 10, overflow: 'hidden' }}>
                                        <View style={{
                                            height: '100%',
                                            width: `${pct}%`,
                                            backgroundColor: examColor,
                                            borderRadius: 10,
                                        }} />
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </Card>
            </View>

            {/* Top & Bottom Performers */}
            {topClass && bottomClass && topClass.classId !== bottomClass.classId && (
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
                    <Card variant="outlined" style={{ flex: 1, padding: 16 }}>
                        <MaterialIcons name="emoji-events" size={24} color={colors.success} />
                        <Text style={{ fontSize: 11, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Top Class
                        </Text>
                        <Text style={{ fontSize: 16, fontFamily: 'DMSans-Bold', color: colors.onSurface, marginTop: 4 }}>
                            {topClass.className}
                        </Text>
                        <Text style={{ fontSize: 20, fontFamily: 'DMSans-Bold', color: colors.success, marginTop: 4 }}>
                            {topClass.avgPercentage}%
                        </Text>
                    </Card>
                    <Card variant="outlined" style={{ flex: 1, padding: 16 }}>
                        <MaterialIcons name="trending-down" size={24} color="#FF9800" />
                        <Text style={{ fontSize: 11, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Needs Attention
                        </Text>
                        <Text style={{ fontSize: 16, fontFamily: 'DMSans-Bold', color: colors.onSurface, marginTop: 4 }}>
                            {bottomClass.className}
                        </Text>
                        <Text style={{ fontSize: 20, fontFamily: 'DMSans-Bold', color: '#FF9800', marginTop: 4 }}>
                            {bottomClass.avgPercentage}%
                        </Text>
                    </Card>
                </View>
            )}
        </Animated.View>
    );

    const renderClasses = () => (
        <View style={{ marginTop: 20 }}>
            <Text style={{ fontSize: 18, fontFamily: 'DMSans-Bold', color: colors.onBackground, marginBottom: 16 }}>
                Class-wise Performance
            </Text>

            {sortedClasses.length === 0 ? (
                <Card variant="filled" style={{ padding: 40, alignItems: 'center' }}>
                    <MaterialIcons name="school" size={48} color={colors.onSurfaceVariant} style={{ opacity: 0.5 }} />
                    <Text style={{ fontSize: 15, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant, marginTop: 12 }}>
                        No class data yet
                    </Text>
                </Card>
            ) : (
                <View style={{ gap: 12 }}>
                    {sortedClasses.map((cls, index) => {
                        const pct = parseFloat(cls.avgPercentage) || 0;
                        return (
                            <Card key={cls.classId} variant="elevated" style={{ padding: 16 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                                        <View style={{
                                            width: 36,
                                            height: 36,
                                            borderRadius: 18,
                                            backgroundColor: index === 0 ? colors.success + '15' : colors.primaryContainer,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}>
                                            <Text style={{
                                                fontSize: 14,
                                                fontFamily: 'DMSans-Bold',
                                                color: index === 0 ? colors.success : colors.primary,
                                            }}>
                                                #{index + 1}
                                            </Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 16, fontFamily: 'DMSans-Bold', color: colors.onSurface }}>
                                                {cls.className}
                                            </Text>
                                            <Text style={{ fontSize: 12, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant }}>
                                                {cls.examsCount} exams
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={{
                                        backgroundColor: getGradeColor(pct) + '15',
                                        paddingHorizontal: 14,
                                        paddingVertical: 6,
                                        borderRadius: 12,
                                    }}>
                                        <Text style={{ fontSize: 18, fontFamily: 'DMSans-Bold', color: getGradeColor(pct) }}>
                                            {pct}%
                                        </Text>
                                    </View>
                                </View>

                                {/* Progress bar */}
                                <View style={{ height: 6, backgroundColor: colors.surfaceContainerHighest, borderRadius: 10, overflow: 'hidden', marginTop: 12 }}>
                                    <View style={{
                                        height: '100%',
                                        width: `${pct}%`,
                                        backgroundColor: getGradeColor(pct),
                                        borderRadius: 10,
                                    }} />
                                </View>
                            </Card>
                        );
                    })}
                </View>
            )}
        </View>
    );

    const renderSubjects = () => {
        const sortedSubjects = [...subjectPerf].filter(s => s.avgPercentage > 0).sort((a, b) => b.avgPercentage - a.avgPercentage);

        return (
            <View style={{ marginTop: 20 }}>
                <Text style={{ fontSize: 18, fontFamily: 'DMSans-Bold', color: colors.onBackground, marginBottom: 16 }}>
                    Subject-wise Performance
                </Text>

                {sortedSubjects.length === 0 ? (
                    <Card variant="filled" style={{ padding: 40, alignItems: 'center' }}>
                        <MaterialIcons name="book" size={48} color={colors.onSurfaceVariant} style={{ opacity: 0.5 }} />
                        <Text style={{ fontSize: 15, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant, marginTop: 12 }}>
                            No subject data yet
                        </Text>
                    </Card>
                ) : (
                    <View style={{ gap: 12 }}>
                        {sortedSubjects.map((subj, index) => {
                            const pct = parseFloat(subj.avgPercentage) || 0;
                            return (
                                <Card key={subj.subjectId} variant="elevated" style={{ padding: 16 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 16, fontFamily: 'DMSans-Bold', color: colors.onSurface }}>
                                                {subj.subjectName}
                                            </Text>
                                            <Text style={{ fontSize: 12, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant, marginTop: 2 }}>
                                                {subj.examsCount} exams across classes
                                            </Text>
                                        </View>
                                        <View style={{
                                            backgroundColor: getGradeColor(pct) + '15',
                                            paddingHorizontal: 14,
                                            paddingVertical: 6,
                                            borderRadius: 12,
                                        }}>
                                            <Text style={{ fontSize: 18, fontFamily: 'DMSans-Bold', color: getGradeColor(pct) }}>
                                                {pct}%
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={{ height: 6, backgroundColor: colors.surfaceContainerHighest, borderRadius: 10, overflow: 'hidden', marginTop: 12 }}>
                                        <View style={{
                                            height: '100%',
                                            width: `${pct}%`,
                                            backgroundColor: getGradeColor(pct),
                                            borderRadius: 10,
                                        }} />
                                    </View>
                                </Card>
                            );
                        })}
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
                }
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            >
                <Header
                    title="Exam Analytics"
                    subtitle="School-wide performance overview"
                    showBack
                />

                {/* Tab Switcher */}
                <View style={{
                    flexDirection: 'row',
                    marginTop: 20,
                    backgroundColor: colors.surfaceContainerHigh,
                    borderRadius: 100,
                    padding: 4,
                    height: 44,
                }}>
                    {[
                        { key: 'overview', icon: 'dashboard', label: 'Overview' },
                        { key: 'classes', icon: 'school', label: 'Classes' },
                        { key: 'subjects', icon: 'book', label: 'Subjects' },
                    ].map(tab => (
                        <Pressable
                            key={tab.key}
                            onPress={() => setActiveView(tab.key)}
                            style={{
                                flex: 1,
                                justifyContent: 'center',
                                alignItems: 'center',
                                backgroundColor: activeView === tab.key ? colors.primary : 'transparent',
                                borderRadius: 100,
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <MaterialIcons
                                    name={tab.icon}
                                    size={16}
                                    color={activeView === tab.key ? '#fff' : colors.onSurfaceVariant}
                                />
                                <Text style={{
                                    fontSize: 13,
                                    fontFamily: 'DMSans-Bold',
                                    color: activeView === tab.key ? '#fff' : colors.onSurfaceVariant,
                                }}>
                                    {tab.label}
                                </Text>
                            </View>
                        </Pressable>
                    ))}
                </View>

                {activeView === 'overview' && renderOverview()}
                {activeView === 'classes' && renderClasses()}
                {activeView === 'subjects' && renderSubjects()}

            </ScrollView>
        </View>
    );
}
