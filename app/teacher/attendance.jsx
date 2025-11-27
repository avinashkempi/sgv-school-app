import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import apiFetch from '../../utils/apiFetch';
import apiConfig from '../../config/apiConfig';
import { useToast } from '../../components/ToastProvider';
import AttendanceView from '../../components/AttendanceView';

export default function TeacherAttendance() {
    const router = useRouter();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [myAttendance, setMyAttendance] = useState([]);
    const [mySummary, setMySummary] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            const res = await apiFetch(`${apiConfig.baseUrl}/attendance/my-attendance`);
            const data = await res.json();
            setMyAttendance(data.attendance);
            setMySummary(data.summary);
        } catch (error) {
            showToast('Error fetching attendance', 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    return (
        <View style={styles.container}>
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

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
});
