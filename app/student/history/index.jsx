import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '../../../theme';
import Header from '../../../components/Header';
import Card from '../../../components/Card';
import { LoadingState, EmptyState, ErrorState } from '../../../components/StateComponents';
import apiFetch from '../../../utils/apiFetch';
import apiConfig from '../../../config/apiConfig';

export default function StudentHistoryScreen() {
    const router = useRouter();
    const { colors, styles } = useTheme();

    const [historyData, setHistoryData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    const fetchHistory = async () => {
        try {
            setError(null);
            const response = await apiFetch(`${apiConfig.baseUrl}/reports/history/me`);
            if (response.ok) {
                const json = await response.json();
                setHistoryData(json.history || []);
            } else {
                const errJson = await response.json().catch(() => ({}));
                setError(errJson.message || `Error ${response.status}`);
            }
        } catch (error) {
            console.error("Failed to fetch student history", error);
            setError(error.message || "An unexpected error occurred");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchHistory();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchHistory();
    };

    const getGradeColor = (grade) => {
        if (!grade) return colors.outline;
        if (grade === 'A+' || grade === 'A') return colors.success;
        if (grade === 'B+' || grade === 'B') return '#2196F3';
        if (grade === 'C') return '#FF9800';
        if (grade === 'D') return '#FF5722';
        return colors.error;
    };

    if (loading && !refreshing) {
        return <LoadingState message="Retrieving your academic history..." />;
    }

    if (error && historyData.length === 0) {
        return <ErrorState message={error} onRetry={fetchHistory} />;
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            >
                <Header
                    title="Past Reports"
                    subtitle="Your Academic Journey"
                    showBack
                />

                {historyData.length === 0 ? (
                    <EmptyState
                        icon="history"
                        title="No History Found"
                        message="Looks like you don't have any archived academic records yet."
                    />
                ) : (
                    <View style={{ gap: 16, marginTop: 8 }}>
                        {historyData.map((record, index) => (
                            <Card key={record._id || index} variant="elevated" style={{ padding: 0, overflow: 'hidden' }}>
                                <View style={{ padding: 20 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <MaterialIcons name="school" size={24} color={colors.primary} />
                                            <Text style={{ fontSize: 18, fontFamily: 'DMSans-Bold', color: colors.onSurface }}>
                                                Class {record.class?.label || record.class?.name || 'Unknown'}
                                            </Text>
                                        </View>
                                        <View style={{ backgroundColor: colors.surfaceContainerHigh, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                                            <Text style={{ fontSize: 12, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant }}>
                                                {record.academicYear?.name || 'Unknown Year'}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                                        <View>
                                            <Text style={{ fontSize: 13, color: colors.onSurfaceVariant, fontFamily: 'DMSans-Regular', marginBottom: 4 }}>
                                                Final Status
                                            </Text>
                                            <Text style={{
                                                fontSize: 15,
                                                fontFamily: 'DMSans-Bold',
                                                color: record.finalStatus === 'promoted' ? colors.success :
                                                    record.finalStatus === 'graduated' ? colors.primary : colors.error,
                                                textTransform: 'capitalize'
                                            }}>
                                                {record.finalStatus}
                                            </Text>
                                        </View>

                                        <View>
                                            <Text style={{ fontSize: 13, color: colors.onSurfaceVariant, fontFamily: 'DMSans-Regular', marginBottom: 4 }}>
                                                Attendance
                                            </Text>
                                            <Text style={{ fontSize: 15, fontFamily: 'DMSans-Bold', color: colors.onSurface }}>
                                                {record.totalAttendancePercentage ? `${record.totalAttendancePercentage}%` : 'N/A'}
                                            </Text>
                                        </View>

                                        {record.examsAvailable && (
                                            <View>
                                                <Text style={{ fontSize: 13, color: colors.onSurfaceVariant, fontFamily: 'DMSans-Regular', marginBottom: 4 }}>
                                                    Overall
                                                </Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                    <Text style={{ fontSize: 15, fontFamily: 'DMSans-Bold', color: getGradeColor(record.grade) }}>
                                                        {record.overallPercentage}%
                                                    </Text>
                                                    <View style={{
                                                        backgroundColor: getGradeColor(record.grade) + '20',
                                                        paddingHorizontal: 6,
                                                        paddingVertical: 2,
                                                        borderRadius: 4
                                                    }}>
                                                        <Text style={{ fontSize: 10, fontFamily: 'DMSans-Bold', color: getGradeColor(record.grade) }}>
                                                            {record.grade}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                        )}
                                    </View>

                                    {/* Action row could be added here if we make historical detailed views work */}
                                </View>
                            </Card>
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
