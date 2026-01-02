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
import StatCard from '../../components/StatCard';
import ExamCard from '../../components/ExamCard';
import { useToast } from '../../components/ToastProvider';

/**
 * Teacher Exam Dashboard
 * Unified interface for all exam management tasks
 */
export default function TeacherExamDashboard() {
    const router = useRouter();
    const { colors } = useTheme();
    const { showToast } = useToast();
    const [refreshing, setRefreshing] = useState(false);
    const [selectedTab, setSelectedTab] = useState('overview'); // 'overview', 'manage', 'reports'

    // Manage tab filters
    const [filterStatus, setFilterStatus] = useState(null); // null = all, or 'scheduled', 'completed', etc.
    const [filterExamType, setFilterExamType] = useState(null); // null = all, or 'FA1', 'FA2', etc.
    const [filterClass, setFilterClass] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch dashboard data
    const { data: dashboardData, isLoading, refetch } = useApiQuery(
        ['teacherExamDashboard'],
        `${apiConfig.baseUrl}/exams/teacher/dashboard`
    );

    const dashboard = dashboardData?.dashboard || [];
    const academicYear = dashboardData?.academicYear;

    // Get all exams from dashboard for Manage tab
    const allExams = dashboard.flatMap(item =>
        item.examStatus
            .filter(e => e.exists)
            .map(e => ({
                ...e,
                className: item.className,
                subjectName: item.subjectName,
                classId: item.classId,
                subjectId: item.subjectId
            }))
    );

    // Apply filters to exams
    const filteredExams = allExams.filter(exam => {
        if (filterStatus && exam.status !== filterStatus) return false;
        if (filterExamType && exam.type !== filterExamType) return false;
        if (filterClass && exam.classId !== filterClass) return false;
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return exam.subjectName.toLowerCase().includes(query) ||
                exam.className.toLowerCase().includes(query);
        }
        return true;
    });

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    // Calculate overall summary
    const overallSummary = dashboard.reduce((acc, item) => {
        acc.examsCreated += item.summary.examsCreated;
        acc.marksEntered += item.summary.marksEntered;
        acc.marksPublished += item.summary.marksPublished;
        acc.pending += item.summary.pending;
        return acc;
    }, { examsCreated: 0, marksEntered: 0, marksPublished: 0, pending: 0 });

    const handleQuickInit = () => {
        router.push('/teacher/subject/create-exam');
    };

    const handleEnterMarks = (classSubject, examType) => {
        const exam = classSubject.examStatus.find(e => e.type === examType);
        if (exam?.examId) {
            router.push(`/teacher/exam/enter-marks?examId=${exam.examId}`);
        } else {
            showToast('Exam not created yet', 'error');
        }
    };

    const handleViewReports = (classId, subjectId) => {
        router.push(`/shared/class-reports?classId=${classId}&subjectId=${subjectId}`);
    };

    const renderSummaryCards = () => (
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
            <StatCard
                label="Exams Created"
                value={overallSummary.examsCreated}
                icon="school"
                color="#2196F3"
                gradient
                variant="compact"
            />
            <StatCard
                label="Marks Entered"
                value={overallSummary.marksEntered}
                icon="check-circle"
                color="#4CAF50"
                gradient
                variant="compact"
            />
            <StatCard
                label="Pending"
                value={overallSummary.pending}
                icon="pending-actions"
                color="#FF9800"
                gradient
                variant="compact"
            />
        </View>
    );

    const renderExamProgress = (examStatus) => {
        const examTypes = ['FA1', 'FA2', 'SA1', 'FA3', 'FA4', 'SA2'];

        return (
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
                {examTypes.map(type => {
                    const exam = examStatus.find(e => e.type === type);
                    const exists = exam?.exists;
                    const complete = exam?.marksComplete;
                    const published = exam?.marksPublished;

                    let bgColor = colors.surfaceContainerHighest;
                    let icon = 'radio-button-unchecked';

                    if (published) {
                        bgColor = '#4CAF50';
                        icon = 'check-circle';
                    } else if (complete) {
                        bgColor = '#03A9F4';
                        icon = 'check-circle-outline';
                    } else if (exists) {
                        bgColor = '#FF9800';
                        icon = 'circle';
                    }

                    return (
                        <View
                            key={type}
                            style={{
                                flex: 1,
                                height: 32,
                                backgroundColor: bgColor,
                                borderRadius: 6,
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexDirection: 'row',
                                gap: 4
                            }}
                        >
                            <MaterialIcons
                                name={icon}
                                size={12}
                                color={exists ? '#FFFFFF' : colors.onSurfaceVariant}
                            />
                            <Text style={{
                                fontSize: 10,
                                fontFamily: 'DMSans-Bold',
                                color: exists ? '#FFFFFF' : colors.onSurfaceVariant
                            }}>
                                {type}
                            </Text>
                        </View>
                    );
                })}
            </View>
        );
    };

    const renderClassSubjectCard = (item) => (
        <View
            key={`${item.classId}-${item.subjectId}`}
            style={{
                backgroundColor: colors.surfaceContainerLow,
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: colors.outlineVariant
            }}
        >
            {/* Header */}
            <View style={{ marginBottom: 12 }}>
                <Text style={{
                    fontSize: 18,
                    fontFamily: 'DMSans-Bold',
                    color: colors.onSurface,
                    marginBottom: 4
                }}>
                    {item.className}
                </Text>
                <Text style={{
                    fontSize: 15,
                    fontFamily: 'DMSans-Medium',
                    color: colors.primary
                }}>
                    {item.subjectName}
                </Text>
                <Text style={{
                    fontSize: 12,
                    fontFamily: 'DMSans-Regular',
                    color: colors.onSurfaceVariant,
                    marginTop: 4
                }}>
                    {item.studentCount} students
                </Text>
            </View>

            {/* Progress indicators */}
            {renderExamProgress(item.examStatus)}

            {/* Summary stats */}
            <View style={{
                flexDirection: 'row',
                gap: 12,
                marginTop: 12,
                paddingTop: 12,
                borderTopWidth: 1,
                borderTopColor: colors.outlineVariant
            }}>
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 20, fontFamily: 'DMSans-Bold', color: colors.primary }}>
                        {item.summary.examsCreated}/6
                    </Text>
                    <Text style={{ fontSize: 11, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant }}>
                        Created
                    </Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 20, fontFamily: 'DMSans-Bold', color: colors.success }}>
                        {item.summary.marksEntered}
                    </Text>
                    <Text style={{ fontSize: 11, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant }}>
                        Marks Entered
                    </Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 20, fontFamily: 'DMSans-Bold', color: colors.error }}>
                        {item.summary.pending}
                    </Text>
                    <Text style={{ fontSize: 11, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant }}>
                        Pending
                    </Text>
                </View>
            </View>

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                <Pressable
                    onPress={() => handleEnterMarks(item, 'FA1')}
                    style={({ pressed }) => ({
                        flex: 1,
                        backgroundColor: pressed ? colors.primary + 'DD' : colors.primary,
                        paddingVertical: 12,
                        borderRadius: 10,
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
                <Pressable
                    onPress={() => handleViewReports(item.classId, item.subjectId)}
                    style={({ pressed }) => ({
                        backgroundColor: pressed ? colors.surfaceContainerHighest : colors.surfaceContainerHigh,
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        borderRadius: 10,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6
                    })}
                >
                    <MaterialIcons name="analytics" size={18} color={colors.onSurface} />
                    <Text style={{ color: colors.onSurface, fontSize: 13, fontFamily: 'DMSans-Bold' }}>
                        Reports
                    </Text>
                </Pressable>
            </View>
        </View>
    );

    const renderOverviewTab = () => (
        <View>
            {renderSummaryCards()}

            {/* Your Classes Section */}
            <View style={{ marginBottom: 20 }}>
                <Text style={{
                    fontSize: 20,
                    fontFamily: 'DMSans-Bold',
                    color: colors.onSurface,
                    marginBottom: 16
                }}>
                    Your Classes
                </Text>

                {dashboard.length === 0 ? (
                    <View style={{
                        alignItems: 'center',
                        paddingVertical: 60,
                        backgroundColor: colors.surfaceContainerHighest,
                        borderRadius: 16
                    }}>
                        <MaterialIcons name="school" size={64} color={colors.onSurfaceVariant} style={{ opacity: 0.5 }} />
                        <Text style={{
                            color: colors.onSurfaceVariant,
                            fontSize: 16,
                            fontFamily: 'DMSans-Medium',
                            marginTop: 16,
                            textAlign: 'center'
                        }}>
                            No classes assigned yet
                        </Text>
                    </View>
                ) : (
                    dashboard.map(item => renderClassSubjectCard(item))
                )}
            </View>
        </View>
    );

    const renderContent = () => {
        if (selectedTab === 'overview') {
            return renderOverviewTab();
        }
        // TODO: Add manage and reports tabs
        return null;
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
                        title="Exam Management"
                        subtitle={academicYear ? `${academicYear.name}` : 'Manage all your exams'}
                        showBack
                    />

                    {/* Tabs  */}
                    <View style={{
                        flexDirection: 'row',
                        gap: 8,
                        marginTop: 20,
                        marginBottom: 24,
                        backgroundColor: colors.surfaceContainerHighest,
                        padding: 4,
                        borderRadius: 12
                    }}>
                        {[
                            { id: 'overview', label: 'Overview', icon: 'dashboard' },
                            { id: 'manage', label: 'Manage', icon: 'edit-calendar' },
                            { id: 'reports', label: 'Reports', icon: 'analytics' }
                        ].map(tab => (
                            <Pressable
                                key={tab.id}
                                onPress={() => setSelectedTab(tab.id)}
                                style={({ pressed }) => ({
                                    flex: 1,
                                    paddingVertical: 12,
                                    borderRadius: 8,
                                    backgroundColor: selectedTab === tab.id
                                        ? (pressed ? colors.primary + 'DD' : colors.primary)
                                        : (pressed ? colors.surfaceContainerHigh : 'transparent'),
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6
                                })}
                            >
                                <MaterialIcons
                                    name={tab.icon}
                                    size={18}
                                    color={selectedTab === tab.id ? '#FFFFFF' : colors.onSurfaceVariant}
                                />
                                <Text style={{
                                    fontSize: 13,
                                    fontFamily: 'DMSans-Bold',
                                    color: selectedTab === tab.id ? '#FFFFFF' : colors.onSurfaceVariant
                                }}>
                                    {tab.label}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    {renderContent()}
                </View>
            </ScrollView>

            {/* FAB */}
            <Pressable
                onPress={handleQuickInit}
                style={({ pressed }) => ({
                    position: 'absolute',
                    bottom: 20,
                    right: 20,
                    backgroundColor: pressed ? colors.primary + 'DD' : colors.primary,
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    alignItems: 'center',
                    justifyContent: 'center',
                    elevation: 4,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 4
                })}
            >
                <MaterialIcons name="add" size={28} color="#FFFFFF" />
            </Pressable>
        </View>
    );
}
