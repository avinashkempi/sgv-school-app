import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    RefreshControl,
    ActivityIndicator,
    Animated,
    Pressable,
    Modal,
    Dimensions
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme';
import { useApiQuery } from '../../hooks/useApi';
import apiConfig from '../../config/apiConfig';
import Header from '../../components/Header';
import Card from '../../components/Card';
import formatClassName from '../../utils/formatClassName';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

/**
 * Admin Exam Analytics Screen
 * School-wide exam performance dashboard — admin/super admin only
 */
export default function ExamAnalyticsScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const [refreshing, setRefreshing] = useState(false);
    const [activeView, setActiveView] = useState('overview'); // 'overview' | 'classes' | 'subjects'
    const [selectedItem, setSelectedItem] = useState(null); // item clicked for drill-down

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
                            {formatClassName(topClass.className)}
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
                            {formatClassName(bottomClass.className)}
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
            <Text style={{ fontSize: 18, fontFamily: 'DMSans-Bold', color: colors.onBackground, marginBottom: 4 }}>
                Class-wise Performance
            </Text>
            <Text style={{ fontSize: 13, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant, marginBottom: 16 }}>
                Tap a class to see exam-type breakdown
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
                            <Pressable key={cls.classId} onPress={() => setSelectedItem({ type: 'class', data: cls })}>
                                <Card variant="elevated" style={{ padding: 16 }}>
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
                                                    {formatClassName(cls.className)}
                                                </Text>
                                                <Text style={{ fontSize: 12, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant }}>
                                                    {cls.examsCount || ''} exams · Tap for breakdown
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
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
                                            <MaterialIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
                                        </View>
                                    </View>

                                     {/* Progress bar */}
                                     <View style={{ marginTop: 14, marginBottom: 2 }}>
                                         <View style={{ height: 10, backgroundColor: colors.surfaceContainerHighest, borderRadius: 100, overflow: 'hidden' }}>
                                             <View style={{
                                                 height: '100%',
                                                 width: `${pct}%`,
                                                 backgroundColor: getGradeColor(pct),
                                                 borderRadius: 100,
                                                 opacity: 0.9,
                                             }} />
                                         </View>
                                     </View>

                                 </Card>
                            </Pressable>
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
                <Text style={{ fontSize: 18, fontFamily: 'DMSans-Bold', color: colors.onBackground, marginBottom: 4 }}>
                    Subject-wise Performance
                </Text>
                <Text style={{ fontSize: 13, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant, marginBottom: 16 }}>
                    Tap a subject to see exam-type breakdown
                </Text>

                {sortedSubjects.length === 0 ? (
                    <Card variant="filled" style={{ padding: 40, alignItems: 'center' }}>
                        <MaterialIcons name="book" size={48} color={colors.onSurfaceVariant} style={{ opacity: 0.5 }} />
                        <Text style={{ fontSize: 15, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant, marginTop: 12 }}>
                            No subject data yet
                        </Text>
                    </Card>
                ) : (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                        {sortedSubjects.map((subj) => {
                            const pct = parseFloat(subj.avgPercentage) || 0;
                            return (
                                <Pressable
                                    key={subj.subjectId || subj.subjectName}
                                    onPress={() => setSelectedItem({ type: 'subject', data: subj })}
                                    style={{ width: (width - 44) / 2, marginBottom: 16 }}
                                >
                                    <Card variant="elevated" style={{ padding: 16 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                            <View style={{ 
                                                width: 32, 
                                                height: 32, 
                                                borderRadius: 16, 
                                                backgroundColor: colors.primaryContainer, 
                                                justifyContent: 'center', 
                                                alignItems: 'center' 
                                            }}>
                                                <Text style={{ fontSize: 14, fontFamily: 'DMSans-Bold', color: colors.primary }}>
                                                    {subj.subjectName.charAt(0).toUpperCase()}
                                                </Text>
                                            </View>
                                            <View style={{ backgroundColor: getGradeColor(pct) + '15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                                                <Text style={{ fontSize: 13, fontFamily: 'DMSans-Bold', color: getGradeColor(pct) }}>
                                                    {pct}%
                                                </Text>
                                            </View>
                                        </View>
                                        
                                        <View style={{ marginBottom: 12 }}>
                                            <Text numberOfLines={1} ellipsizeMode="tail" style={{ fontSize: 15, fontFamily: 'DMSans-Bold', color: colors.onSurface }}>
                                                {subj.subjectName}
                                            </Text>
                                            <Text style={{ fontSize: 11, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant, marginTop: 4 }}>
                                                {subj.examsCount} {subj.examsCount === 1 ? 'exam' : 'exams'} · tap for more
                                            </Text>
                                        </View>

                                        <View style={{ height: 6, backgroundColor: colors.surfaceContainerHighest, borderRadius: 100, overflow: 'hidden', marginTop: 2, marginBottom: 2 }}>
                                            <View style={{
                                                height: '100%',
                                                width: `${pct}%`,
                                                backgroundColor: getGradeColor(pct),
                                                borderRadius: 100,
                                                opacity: 0.85,
                                            }} />
                                        </View>

                                     </Card>
                                </Pressable>
                            );
                        })}
                    </View>
                )}
            </View>
        );
    };

    const renderDetailModal = () => {
        if (!selectedItem) return null;
        const { type, data } = selectedItem;
        const title = type === 'class' ? formatClassName(data.className) : data.subjectName;
        const overallPct = parseFloat(data.avgPercentage) || 0;
        const breakdown = data.examTypeBreakdown || [];

        return (
            <Modal
                transparent
                visible={!!selectedItem}
                animationType="slide"
                onRequestClose={() => setSelectedItem(null)}
            >
                <Pressable
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}
                    onPress={() => setSelectedItem(null)}
                >
                    <Pressable onPress={e => e.stopPropagation()}>
                        <View style={{
                            backgroundColor: colors.background,
                            borderTopLeftRadius: 24,
                            borderTopRightRadius: 24,
                            padding: 24,
                            paddingBottom: 40,
                            maxHeight: '80%'
                        }}>
                            {/* Handle */}
                            <View style={{ width: 40, height: 4, backgroundColor: colors.onSurfaceVariant + '40', borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />

                            {/* Header */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 11, fontFamily: 'DMSans-Bold', color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 1 }}>
                                        {type === 'class' ? 'Class' : 'Subject'} Breakdown
                                    </Text>
                                    <Text style={{ fontSize: 22, fontFamily: 'DMSans-Bold', color: colors.onSurface, marginTop: 4 }}>
                                        {title}
                                    </Text>
                                </View>
                                <View style={{ backgroundColor: getGradeColor(overallPct) + '18', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14 }}>
                                    <Text style={{ fontSize: 22, fontFamily: 'DMSans-Bold', color: getGradeColor(overallPct) }}>
                                        {overallPct}%
                                    </Text>
                                    <Text style={{ fontSize: 10, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant, textAlign: 'center' }}>
                                        Overall
                                    </Text>
                                </View>
                            </View>

                            {/* Breakdown rows */}
                            <ScrollView showsVerticalScrollIndicator={false}>
                                {breakdown.length === 0 ? (
                                    <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                                        <MaterialIcons name="bar-chart" size={40} color={colors.onSurfaceVariant} style={{ opacity: 0.4 }} />
                                        <Text style={{ fontSize: 14, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant, marginTop: 12 }}>
                                            No breakdown data available yet
                                        </Text>
                                    </View>
                                ) : breakdown.map((b) => {
                                    const bPct = b.avgPercentage !== null ? parseFloat(b.avgPercentage) : null;
                                    const bColor = getExamTypeColor(b.examType);

                                    return (
                                        <View key={b.examType} style={{ marginBottom: 20 }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                                    <View style={{ backgroundColor: bColor + '18', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                                                        <Text style={{ fontSize: 13, fontFamily: 'DMSans-Bold', color: bColor }}>
                                                            {b.examType}
                                                        </Text>
                                                    </View>
                                                    <Text style={{ fontSize: 12, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant }}>
                                                        {b.examsCount} {b.examsCount === 1 ? 'exam' : 'exams'}
                                                    </Text>
                                                </View>
                                                <Text style={{
                                                    fontSize: 18,
                                                    fontFamily: 'DMSans-Bold',
                                                    color: bPct !== null ? getGradeColor(bPct) : colors.onSurfaceVariant
                                                }}>
                                                    {bPct !== null ? `${bPct}%` : '—'}
                                                </Text>
                                            </View>
                                            <View style={{ height: 8, backgroundColor: colors.surfaceContainerHighest, borderRadius: 10, overflow: 'hidden' }}>
                                                <View style={{
                                                    height: '100%',
                                                    width: bPct !== null ? `${bPct}%` : '0%',
                                                    backgroundColor: bPct !== null ? bColor : colors.onSurfaceVariant + '30',
                                                    borderRadius: 10,
                                                }} />
                                            </View>
                                            {bPct === null && (
                                                <Text style={{ fontSize: 11, fontFamily: 'DMSans-Regular', color: colors.onSurfaceVariant + '80', marginTop: 4 }}>
                                                    No marks entered yet
                                                </Text>
                                            )}
                                        </View>
                                    );
                                })}
                            </ScrollView>

                            {type === 'class' && (
                                <Pressable
                                    onPress={() => {
                                        setSelectedItem(null);
                                        setTimeout(() => {
                                            router.push(`/shared/class-reports?classId=${data.classId}`);
                                        }, 300);
                                    }}
                                    style={({ pressed }) => ({
                                        backgroundColor: colors.primary,
                                        paddingVertical: 14,
                                        borderRadius: 12,
                                        alignItems: 'center',
                                        flexDirection: 'row',
                                        justifyContent: 'center',
                                        gap: 8,
                                        marginTop: 20,
                                        opacity: pressed ? 0.9 : 1,
                                        shadowColor: colors.primary,
                                        shadowOffset: { width: 0, height: 4 },
                                        shadowOpacity: 0.3,
                                        shadowRadius: 8,
                                        elevation: 4,
                                    })}
                                >
                                    <MaterialIcons name="assessment" size={20} color="#FFFFFF" />
                                    <Text style={{
                                        fontSize: 15,
                                        fontFamily: 'DMSans-Bold',
                                        color: '#FFFFFF'
                                    }}>
                                        View Student Rankings & Reports
                                    </Text>
                                </Pressable>
                            )}
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
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

            {renderDetailModal()}
        </View>
    );
}
