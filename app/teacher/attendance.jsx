import React, { useState, } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useApiQuery } from '../../hooks/useApi';
import apiConfig from '../../config/apiConfig';
import { useToast } from '../../components/ToastProvider';
import { useTheme } from '../../theme';
import AttendanceView from '../../components/AttendanceView';

export default function TeacherAttendance() {
    const _router = useRouter();
    const { _showToast } = useToast();
    const { colors } = useTheme();

    const [refreshing, setRefreshing] = useState(false);

    // Fetch Attendance
    const { data: attendanceData, isLoading: loading, refetch } = useApiQuery(
        ['teacherAttendance'],
        `${apiConfig.baseUrl}/attendance/my-attendance`
    );

    const myAttendance = attendanceData?.attendance || [];
    const mySummary = attendanceData?.summary || null;

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <AttendanceView
                attendanceHistory={myAttendance}
                summary={mySummary}
                loading={loading}
                refreshing={refreshing}
                onRefresh={onRefresh}
                title="My Attendance"
                subtitle="Track your teaching attendance"
            />
        </View>
    );
}
