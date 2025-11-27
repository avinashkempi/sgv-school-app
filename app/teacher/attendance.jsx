import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import apiFetch from '../../utils/apiFetch';
import apiConfig from '../../config/apiConfig';
import { useToast } from '../../components/ToastProvider';

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

    const getStatusColor = (status) => {
        switch (status) {
            case 'present': return '#4CAF50';
            case 'absent': return '#F44336';
            case 'late': return '#FF9800';
            case 'excused': return '#2196F3';
            default: return '#e0e0e0';
        }
    };

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={[styles.statusIcon, { backgroundColor: getStatusColor(item.status) }]}>
                <Text style={styles.statusText}>{item.status.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.info}>
                <Text style={styles.date}>{new Date(item.date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}</Text>
                <Text style={styles.time}>{new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
            {item.remarks ? <Text style={styles.remarks}>{item.remarks}</Text> : null}
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Attendance</Text>
                <View style={{ width: 24 }} />
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#6200ee" style={styles.loader} />
            ) : (
                <>
                    {mySummary && (
                        <View style={styles.summaryCard}>
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryValue}>{mySummary.present}</Text>
                                <Text style={styles.summaryLabel}>Present</Text>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryValue}>{mySummary.absent}</Text>
                                <Text style={styles.summaryLabel}>Absent</Text>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryValue}>{mySummary.percentage}%</Text>
                                <Text style={styles.summaryLabel}>Rate</Text>
                            </View>
                        </View>
                    )}

                    <FlatList
                        data={myAttendance}
                        renderItem={renderItem}
                        keyExtractor={(item) => item._id}
                        contentContainerStyle={styles.listContent}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                        ListEmptyComponent={<Text style={styles.emptyText}>No attendance records found.</Text>}
                    />
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', elevation: 2 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    backButton: { padding: 4 },
    loader: { marginTop: 20 },
    summaryCard: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#fff', margin: 16, padding: 16, borderRadius: 12, elevation: 2 },
    summaryItem: { alignItems: 'center' },
    summaryValue: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    summaryLabel: { fontSize: 12, color: '#666' },
    divider: { width: 1, backgroundColor: '#eee' },
    listContent: { padding: 16 },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 1 },
    statusIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    statusText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
    info: { flex: 1 },
    date: { fontSize: 16, fontWeight: '600', color: '#333' },
    time: { fontSize: 12, color: '#666' },
    remarks: { fontSize: 12, color: '#666', fontStyle: 'italic', maxWidth: '30%' },
    emptyText: { textAlign: 'center', marginTop: 40, color: '#666', fontSize: 16 },
});
