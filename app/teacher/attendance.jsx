import React, { useState, useCallback } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useApiQuery } from '../../hooks/useApi';
import apiFetch from '../../utils/apiFetch';
import apiConfig from '../../config/apiConfig';
import { useTheme } from '../../theme';
import AttendanceView from '../../components/AttendanceView';

const PAGE_SIZE = 30;

export default function TeacherAttendance() {
    const _router = useRouter();
    const { colors } = useTheme();

    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [allRecords, setAllRecords] = useState([]);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [summary, setSummary] = useState(null);

    // Initial fetch (page 1), uses React Query for caching & loading state
    const { isLoading: loading, refetch } = useApiQuery(
        ['teacherAttendance'],
        `${apiConfig.baseUrl}/attendance/my-attendance?page=1&limit=${PAGE_SIZE}`,
        {
            staleTime: 2 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
            onSuccess: (data) => {
                setAllRecords(data?.attendance || []);
                setSummary(data?.summary || null);
                setHasMore(data?.pagination?.hasMore || false);
                setPage(1);
            }
        }
    );

    const loadMore = useCallback(async () => {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);
        try {
            const nextPage = page + 1;
            const res = await apiFetch(
                `${apiConfig.baseUrl}/attendance/my-attendance?page=${nextPage}&limit=${PAGE_SIZE}`
            );
            const data = await res.json();
            if (data?.attendance?.length > 0) {
                setAllRecords(prev => [...prev, ...data.attendance]);
                setHasMore(data?.pagination?.hasMore || false);
                setPage(nextPage);
            } else {
                setHasMore(false);
            }
        } catch (e) {
            console.error('loadMore error:', e);
        } finally {
            setLoadingMore(false);
        }
    }, [loadingMore, hasMore, page]);

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <AttendanceView
                attendanceHistory={allRecords}
                summary={summary}
                loading={loading}
                refreshing={refreshing}
                onRefresh={onRefresh}
                onLoadMore={loadMore}
                loadingMore={loadingMore}
                hasMore={hasMore}
                title="My Attendance"
                subtitle="Track your teaching attendance"
            />
        </View>
    );
}
