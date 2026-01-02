import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    RefreshControl,
    ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../theme';
import { useApiQuery } from '../../hooks/useApi';
import apiConfig from '../../config/apiConfig';
import Header from '../../components/Header';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * Academic Years Management Dashboard
 * Super Admin interface for managing all academic years
 */
export default function AcademicYearsScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const [refreshing, setRefreshing] = useState(false);

    // Fetch dashboard data
    const { data: dashboardData, isLoading, refetch } = useApiQuery(
        ['academicYearsDashboard'],
        `${apiConfig.baseUrl}/academic-year/dashboard`
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    const currentYear = dashboardData?.currentYear;
    const upcomingYears = dashboardData?.upcomingYears || [];
    const archivedYears = dashboardData?.archivedYears || [];

    const handleCreateYear = () => {
        router.push('/super-admin/create-year');
    };

    const handleViewYearDetails = (yearId) => {
        router.push(`/super-admin/year-details?yearId=${yearId}`);
    };

    const handleStartTransition = (yearId) => {
        if (!currentYear) {
            // No current year, just activate
            return;
        }
        router.push(`/super-admin/transition-wizard?currentId=${currentYear._id}&nextId=${yearId}`);
    };

    const handleViewComparison = () => {
        router.push('/super-admin/year-comparison');
    };

    const renderYearCard = (year, type) => {
        const isActive = type === 'current';
        const isUpcoming = type === 'upcoming';
        const isArchived = type === 'archived';

        const statusColors = {
            current: { bg: colors.success + '15', text: colors.success, icon: 'check-circle' },
            upcoming: { bg: colors.primary + '15', text: colors.primary, icon: 'schedule' },
            archived: { bg: colors.onSurfaceVariant + '15', text: colors.onSurfaceVariant, icon: 'archive' }
        };

        const statusColor = statusColors[type];

        return (
            <Pressable
                key={year._id}
                onPress={() => handleViewYearDetails(year._id)}
                style={({ pressed }) => ({
                    marginBottom: 16,
                    borderRadius: 16,
                    overflow: 'hidden',
                    backgroundColor: pressed ? colors.surfaceContainerHigh : colors.surfaceContainerLow,
                    borderWidth: isActive ? 2 : 1,
                    borderColor: isActive ? colors.success : colors.outlineVariant,
                    elevation: isActive ? 4 : 2,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4
                })}
            >
                {/* Header with gradient for active year */}
                {isActive && (
                    <LinearGradient
                        colors={[colors.success, colors.successContainer]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{ padding: 16 }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <MaterialIcons name="star" size={20} color="#FFF" />
                            <Text style={{
                                fontSize: 13,
                                fontFamily: 'DMSans-Bold',
                                color: '#FFF',
                                textTransform: 'uppercase',
                                letterSpacing: 1
                            }}>
                                CURRENT ACADEMIC YEAR
                            </Text>
                        </View>
                    </LinearGradient>
                )}

                {/* Content */}
                <View style={{ padding: 16 }}>
                    {/* Year Name & Status */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                                <MaterialIcons name="date-range" size={24} color={colors.primary} />
                                <Text style={{
                                    fontSize: 20,
                                    fontFamily: 'DMSans-Bold',
                                    color: colors.onSurface
                                }}>
                                    {year.name}
                                </Text>
                            </View>
                            {year.description && (
                                <Text style={{
                                    fontSize: 13,
                                    fontFamily: 'DMSans-Regular',
                                    color: colors.onSurfaceVariant,
                                    marginTop: 4
                                }}>
                                    {year.description}
                                </Text>
                            )}
                        </View>

                        {!isActive && (
                            <View style={{
                                backgroundColor: statusColor.bg,
                                paddingHorizontal: 12,
                                paddingVertical: 6,
                                borderRadius: 8,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6
                            }}>
                                <MaterialIcons name={statusColor.icon} size={16} color={statusColor.text} />
                                <Text style={{
                                    fontSize: 12,
                                    fontFamily: 'DMSans-Bold',
                                    color: statusColor.text
                                }}>
                                    {type.toUpperCase()}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Dates */}
                    <View style={{
                        flexDirection: 'row',
                        gap: 16,
                        marginBottom: 16,
                        paddingVertical: 12,
                        borderTopWidth: 1,
                        borderBottomWidth: 1,
                        borderColor: colors.outlineVariant
                    }}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 11, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant, marginBottom: 4 }}>
                                Start Date
                            </Text>
                            <Text style={{ fontSize: 14, fontFamily: 'DMSans-Bold', color: colors.onSurface }}>
                                {new Date(year.startDate).toLocaleDateString()}
                            </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 11, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant, marginBottom: 4 }}>
                                End Date
                            </Text>
                            <Text style={{ fontSize: 14, fontFamily: 'DMSans-Bold', color: colors.onSurface }}>
                                {new Date(year.endDate).toLocaleDateString()}
                            </Text>
                        </View>
                    </View>

                    {/* Statistics (if snapshot available) */}
                    {year.snapshot && (
                        <View style={{
                            backgroundColor: colors.surfaceContainerHighest,
                            borderRadius: 12,
                            padding: 12,
                            marginBottom: 16
                        }}>
                            <Text style={{ fontSize: 12, fontFamily: 'DMSans-Bold', color: colors.onSurface, marginBottom: 10 }}>
                                Statistics
                            </Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                                <StatItem icon="people" label="Students" value={year.snapshot.totalStudents} color={colors.primary} />
                                <StatItem icon="class" label="Classes" value={year.snapshot.totalClasses} color={colors.secondary} />
                                <StatItem icon="school" label="Exams" value={year.snapshot.totalExams} color={colors.tertiary} />
                            </View>
                        </View>
                    )}

                    {/* Action Buttons */}
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        {isUpcoming && (
                            <Pressable
                                onPress={() => handleStartTransition(year._id)}
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
                                <MaterialIcons name="sync" size={18} color="#FFF" />
                                <Text style={{ fontSize: 14, fontFamily: 'DMSans-Bold', color: '#FFF' }}>
                                    Activate & Transition
                                </Text>
                            </Pressable>
                        )}

                        <Pressable
                            onPress={() => handleViewYearDetails(year._id)}
                            style={({ pressed }) => ({
                                flex: isUpcoming ? 0 : 1,
                                backgroundColor: pressed ? colors.surfaceContainerHighest : colors.surfaceContainerHigh,
                                paddingVertical: 12,
                                paddingHorizontal: isUpcoming ? 16 : 0,
                                borderRadius: 10,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6
                            })}
                        >
                            <MaterialIcons name={isArchived ? 'folder-open' : 'visibility'} size={18} color={colors.onSurface} />
                            <Text style={{ fontSize: 14, fontFamily: 'DMSans-Bold', color: colors.onSurface }}>
                                {isArchived ? 'View Archive' : 'View Details'}
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </Pressable>
        );
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
                        title="Academic Years"
                        subtitle="Manage school calendar and year transitions"
                        showBack
                    />

                    {/* Quick Actions */}
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 20, marginBottom: 24 }}>
                        <Pressable
                            onPress={handleCreateYear}
                            style={({ pressed }) => ({
                                flex: 1,
                                backgroundColor: pressed ? colors.primary + 'DD' : colors.primary,
                                paddingVertical: 14,
                                borderRadius: 12,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8
                            })}
                        >
                            <MaterialIcons name="add-circle" size={20} color="#FFF" />
                            <Text style={{ fontSize: 14, fontFamily: 'DMSans-Bold', color: '#FFF' }}>
                                Create New Year
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={handleViewComparison}
                            style={({ pressed }) => ({
                                backgroundColor: pressed ? colors.secondaryContainer : colors.surfaceContainerHigh,
                                paddingHorizontal: 16,
                                paddingVertical: 14,
                                borderRadius: 12,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 8
                            })}
                        >
                            <MaterialIcons name="analytics" size={20} color={colors.onSurface} />
                            <Text style={{ fontSize: 14, fontFamily: 'DMSans-Bold', color: colors.onSurface }}>
                                Compare
                            </Text>
                        </Pressable>
                    </View>

                    {/* Current Year */}
                    {currentYear && (
                        <View style={{ marginBottom: 24 }}>
                            {renderYearCard(currentYear, 'current')}
                        </View>
                    )}

                    {/* Upcoming Years */}
                    {upcomingYears.length > 0 && (
                        <View style={{ marginBottom: 24 }}>
                            <Text style={{
                                fontSize: 18,
                                fontFamily: 'DMSans-Bold',
                                color: colors.onSurface,
                                marginBottom: 16
                            }}>
                                Upcoming Years ({upcomingYears.length})
                            </Text>
                            {upcomingYears.map(year => renderYearCard(year, 'upcoming'))}
                        </View>
                    )}

                    {/* Archived Years */}
                    {archivedYears.length > 0 && (
                        <View>
                            <Text style={{
                                fontSize: 18,
                                fontFamily: 'DMSans-Bold',
                                color: colors.onSurface,
                                marginBottom: 16
                            }}>
                                Archived Years ({archivedYears.length})
                            </Text>
                            {archivedYears.map(year => renderYearCard(year, 'archived'))}
                        </View>
                    )}

                    {/* Empty State */}
                    {!currentYear && upcomingYears.length === 0 && archivedYears.length === 0 && (
                        <View style={{
                            alignItems: 'center',
                            paddingVertical: 60,
                            backgroundColor: colors.surfaceContainerHighest,
                            borderRadius: 16
                        }}>
                            <MaterialIcons name="event" size={64} color={colors.onSurfaceVariant} style={{ opacity: 0.5 }} />
                            <Text style={{
                                fontSize: 16,
                                fontFamily: 'DMSans-Bold',
                                color: colors.onSurface,
                                marginTop: 16
                            }}>
                                No Academic Years Yet
                            </Text>
                            <Text style={{
                                fontSize: 14,
                                fontFamily: 'DMSans-Regular',
                                color: colors.onSurfaceVariant,
                                marginTop: 8,
                                textAlign: 'center',
                                paddingHorizontal: 32
                            }}>
                                Create your first academic year to start managing your school calendar
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

// Helper component for statistics
function StatItem({ icon, label, value, color }) {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 100 }}>
            <View style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: color + '20',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <MaterialIcons name={icon} size={16} color={color} />
            </View>
            <View>
                <Text style={{ fontSize: 16, fontFamily: 'DMSans-Bold', color: color }}>
                    {value}
                </Text>
                <Text style={{ fontSize: 10, fontFamily: 'DMSans-Medium', color: color, opacity: 0.7 }}>
                    {label}
                </Text>
            </View>
        </View>
    );
}
