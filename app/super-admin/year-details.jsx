import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    RefreshControl,
    ActivityIndicator,
    Linking
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../theme';
import { useApiQuery } from '../../hooks/useApi';
import { useToast } from '../../components/ToastProvider';
import apiConfig from '../../config/apiConfig';
import Header from '../../components/Header';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * Year Details Screen
 * Comprehensive view of an academic year with all statistics and data
 */
export default function YearDetailsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { colors } = useTheme();
    const { showToast } = useToast();
    const [refreshing, setRefreshing] = useState(false);
    const [selectedTab, setSelectedTab] = useState('overview'); // overview, students, exams, reports

    const yearId = params.yearId;

    // Fetch year details
    const { data: yearData, isLoading, refetch } = useApiQuery(
        ['yearDetails', yearId],
        `${apiConfig.baseUrl}/academic-year/${yearId}/comprehensive-report`,
        { enabled: !!yearId }
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    const year = yearData?.year;
    const snapshot = yearData?.snapshot;

    const getStatusColor = () => {
        if (year?.status === 'current') return colors.success;
        if (year?.status === 'archived') return colors.onSurfaceVariant;
        if (year?.status === 'draft') return colors.primary;
        return colors.onSurface;
    };

    const getStatusIcon = () => {
        if (year?.status === 'current') return 'check-circle';
        if (year?.status === 'archived') return 'archive';
        if (year?.status === 'draft') return 'schedule';
        return 'circle';
    };

    const renderOverview = () => {
        if (!snapshot) {
            return (
                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                    <MaterialIcons name="info-outline" size={48} color={colors.onSurfaceVariant} style={{ opacity: 0.5 }} />
                    <Text style={{ marginTop: 16, fontSize: 14, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant }}>
                        No statistics available for this year
                    </Text>
                </View>
            );
        }

        return (
            <View>
                {/* Key Metrics Grid */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
                    <MetricCard
                        icon="people"
                        label="Total Students"
                        value={snapshot.totalStudents}
                        color={colors.primary}
                    />
                    <MetricCard
                        icon="class"
                        label="Total Classes"
                        value={snapshot.totalClasses}
                        color={colors.secondary}
                    />
                    <MetricCard
                        icon="school"
                        label="Total Exams"
                        value={snapshot.totalExams}
                        color={colors.tertiary}
                    />
                    <MetricCard
                        icon="book"
                        label="Subjects"
                        value={snapshot.totalSubjects}
                        color="#FF9800"
                    />
                    <MetricCard
                        icon="person"
                        label="Teachers"
                        value={snapshot.totalTeachers}
                        color="#9C27B0"
                    />
                    <MetricCard
                        icon="how-to-reg"
                        label="Avg Attendance"
                        value={`${snapshot.averageAttendance?.toFixed(1) || 0}%`}
                        color="#4CAF50"
                    />
                </View>

                {/* Additional Info */}
                {snapshot.capturedAt && (
                    <View style={{
                        backgroundColor: colors.surfaceContainerHighest,
                        borderRadius: 12,
                        padding: 14,
                        marginTop: 8
                    }}>
                        <Text style={{ fontSize: 12, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant }}>
                            Snapshot captured on {new Date(snapshot.capturedAt).toLocaleString()}
                        </Text>
                    </View>
                )}
            </View>
        );
    };

    const renderTabs = () => (
        <View style={{
            flexDirection: 'row',
            backgroundColor: colors.surfaceContainerHighest,
            borderRadius: 12,
            padding: 4,
            marginTop: 20,
            marginBottom: 20
        }}>
            {[
                { id: 'overview', label: 'Overview', icon: 'dashboard' },
                { id: 'students', label: 'Students', icon: 'people' },
                { id: 'exams', label: 'Exams', icon: 'school' },
                { id: 'reports', label: 'Reports', icon: 'description' }
            ].map(tab => (
                <Pressable
                    key={tab.id}
                    onPress={() => setSelectedTab(tab.id)}
                    style={({ pressed }) => ({
                        flex: 1,
                        paddingVertical: 10,
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
                        size={16}
                        color={selectedTab === tab.id ? '#FFFFFF' : colors.onSurfaceVariant}
                    />
                    <Text style={{
                        fontSize: 12,
                        fontFamily: 'DMSans-Bold',
                        color: selectedTab === tab.id ? '#FFFFFF' : colors.onSurfaceVariant
                    }}>
                        {tab.label}
                    </Text>
                </Pressable>
            ))}
        </View>
    );

    if (isLoading) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!year) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                <MaterialIcons name="error-outline" size={64} color={colors.error} style={{ opacity: 0.5 }} />
                <Text style={{ fontSize: 16, fontFamily: 'DMSans-Bold', color: colors.onSurface, marginTop: 16 }}>
                    Year not found
                </Text>
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
                        title={year.name}
                        subtitle="Academic Year Details"
                        showBack
                    />

                    {/* Year Info Card */}
                    <View style={{
                        marginTop: 20,
                        borderRadius: 16,
                        overflow: 'hidden',
                        borderWidth: 1,
                        borderColor: colors.outlineVariant
                    }}>
                        {/* Header with status */}
                        {year.status === 'current' && (
                            <LinearGradient
                                colors={[colors.success, colors.successContainer]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={{ padding: 14 }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <MaterialIcons name="star" size={18} color="#FFF" />
                                    <Text style={{ fontSize: 12, fontFamily: 'DMSans-Bold', color: '#FFF', textTransform: 'uppercase', letterSpacing: 1 }}>
                                        CURRENT ACADEMIC YEAR
                                    </Text>
                                </View>
                            </LinearGradient>
                        )}

                        <View style={{ backgroundColor: colors.surfaceContainerLow, padding: 16 }}>
                            {/* Status Badge */}
                            {year.status !== 'current' && (
                                <View style={{
                                    alignSelf: 'flex-start',
                                    backgroundColor: getStatusColor() + '20',
                                    paddingHorizontal: 12,
                                    paddingVertical: 6,
                                    borderRadius: 8,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 6,
                                    marginBottom: 12
                                }}>
                                    <MaterialIcons name={getStatusIcon()} size={16} color={getStatusColor()} />
                                    <Text style={{ fontSize: 12, fontFamily: 'DMSans-Bold', color: getStatusColor(), textTransform: 'uppercase' }}>
                                        {year.status}
                                    </Text>
                                </View>
                            )}

                            {/* Dates */}
                            <View style={{ flexDirection: 'row', gap: 16, marginBottom: year.description ? 12 : 0 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 11, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant, marginBottom: 4 }}>
                                        Start Date
                                    </Text>
                                    <Text style={{ fontSize: 15, fontFamily: 'DMSans-Bold', color: colors.onSurface }}>
                                        {new Date(year.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                    </Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 11, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant, marginBottom: 4 }}>
                                        End Date
                                    </Text>
                                    <Text style={{ fontSize: 15, fontFamily: 'DMSans-Bold', color: colors.onSurface }}>
                                        {new Date(year.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                    </Text>
                                </View>
                            </View>

                            {/* Description */}
                            {year.description && (
                                <Text style={{ fontSize: 13, fontFamily: 'DMSans-Regular', color: colors.onSurfaceVariant, marginTop: 8 }}>
                                    {year.description}
                                </Text>
                            )}
                        </View>
                    </View>

                    {/* Tabs */}
                    {renderTabs()}

                    {/* Content based on selected tab */}
                    {selectedTab === 'overview' && renderOverview()}
                    {selectedTab === 'students' && (
                        <ComingSoonPlaceholder icon="people" text="Student analytics coming soon" />
                    )}
                    {selectedTab === 'exams' && (
                        <ComingSoonPlaceholder icon="school" text="Exam details coming soon" />
                    )}
                    {selectedTab === 'reports' && (
                        <ComingSoonPlaceholder icon="description" text="Report generation coming soon" />
                    )}
                </View>
            </ScrollView>

            {/* Action FAB */}
            <Pressable
                onPress={async () => {
                    try {
                        const token = await AsyncStorage.getItem('token');
                        if (!token) {
                            showToast("Authentication required", "error");
                            return;
                        }
                        const url = `${apiConfig.baseUrl}/fee-enhancements/export-arrears/${yearId}?token=${token}`;
                        await Linking.openURL(url);
                        showToast("Export started", "success");
                    } catch (error) {
                        console.error('Download error:', error);
                        showToast("Failed to start download", "error");
                    }
                }}
                style={({ pressed }) => ({
                    position: 'absolute',
                    bottom: 20,
                    right: 20,
                    backgroundColor: pressed ? colors.secondary + 'DD' : colors.secondary,
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
                <MaterialIcons name="file-download" size={28} color="#FFFFFF" />
            </Pressable>
        </View>
    );
}

// Helper Components
function MetricCard({ icon, label, value, color }) {
    const { colors } = useTheme();
    return (
        <View style={{
            flex: 1,
            minWidth: '45%',
            backgroundColor: colors.surfaceContainerLow,
            borderRadius: 12,
            padding: 14,
            borderLeftWidth: 4,
            borderLeftColor: color
        }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: color + '20',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <MaterialIcons name={icon} size={20} color={color} />
                </View>
                <Text style={{ fontSize: 11, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant, flex: 1 }}>
                    {label}
                </Text>
            </View>
            <Text style={{ fontSize: 24, fontFamily: 'DMSans-Bold', color }}>
                {value}
            </Text>
        </View>
    );
}

function ComingSoonPlaceholder({ icon, text }) {
    const { colors } = useTheme();
    return (
        <View style={{
            paddingVertical: 60,
            alignItems: 'center',
            backgroundColor: colors.surfaceContainerHighest,
            borderRadius: 16
        }}>
            <MaterialIcons name={icon} size={48} color={colors.onSurfaceVariant} style={{ opacity: 0.5 }} />
            <Text style={{ marginTop: 16, fontSize: 14, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant }}>
                {text}
            </Text>
        </View>
    );
}
