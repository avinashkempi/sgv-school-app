import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import apiFetch from '../../utils/apiFetch';
import apiConfig from '../../config/apiConfig';
import { useToast } from '../../components/ToastProvider';

export default function AdminAttendance() {
    const router = useRouter();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('student'); // 'student', 'staff', 'my_attendance'

    // Common State
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Student Attendance State
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState(null);
    const [studentAttendance, setStudentAttendance] = useState([]);

    // Staff Attendance State
    const [staffList, setStaffList] = useState([]);
    const [submittingStaff, setSubmittingStaff] = useState(false);

    // My Attendance State
    const [myAttendance, setMyAttendance] = useState([]);
    const [mySummary, setMySummary] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            if (activeTab === 'student') {
                // Fetch Classes
                const res = await apiFetch(`${apiConfig.baseUrl}/classes`);
                const data = await res.json();
                if (data.success) {
                    setClasses(data.data);
                    // If class selected, fetch attendance for it
                    if (selectedClass) {
                        fetchStudentAttendance(selectedClass._id);
                    }
                }
            } else if (activeTab === 'staff') {
                // Fetch Staff List & Attendance
                const dateStr = date.toISOString().split('T')[0];
                const res = await apiFetch(`${apiConfig.baseUrl}/attendance/staff-list?date=${dateStr}`);
                const data = await res.json();
                if (data.success) {
                    setStaffList(data.data);
                }
            } else if (activeTab === 'my_attendance') {
                // Fetch My Attendance
                const res = await apiFetch(`${apiConfig.baseUrl}/attendance/my-attendance`);
                const data = await res.json();
                setMyAttendance(data.attendance);
                setMySummary(data.summary);
            }
        } catch (error) {
            showToast('Error fetching data', 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [activeTab, date, selectedClass]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const fetchStudentAttendance = async (classId) => {
        try {
            const dateStr = date.toISOString().split('T')[0];
            const res = await apiFetch(`${apiConfig.baseUrl}/attendance/class/${classId}/date/${dateStr}`);
            const data = await res.json();
            setStudentAttendance(data);
        } catch (error) {
            console.error(error);
        }
    };

    // --- Staff Attendance Handlers ---

    const toggleStaffStatus = (index) => {
        const newStaffList = [...staffList];
        const currentStatus = newStaffList[index].status;
        // Cycle: null -> present -> absent -> late -> null
        let nextStatus = 'present';
        if (currentStatus === 'present') nextStatus = 'absent';
        else if (currentStatus === 'absent') nextStatus = 'late';
        else if (currentStatus === 'late') nextStatus = 'present'; // Loop back to present for ease, or null to clear? Let's stick to valid statuses once clicked.

        // If it was null, start with present
        if (!currentStatus) nextStatus = 'present';

        newStaffList[index].status = nextStatus;
        setStaffList(newStaffList);
    };

    const saveStaffAttendance = async () => {
        setSubmittingStaff(true);
        try {
            const records = staffList
                .filter(item => item.status) // Only send marked records
                .map(item => ({
                    userId: item.user._id,
                    status: item.status,
                    remarks: item.remarks
                }));

            if (records.length === 0) {
                showToast('No attendance marked to save', 'info');
                setSubmittingStaff(false);
                return;
            }

            const response = await apiFetch(`${apiConfig.baseUrl}/attendance/mark-staff`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: date.toISOString().split('T')[0],
                    attendanceRecords: records
                })
            });

            if (response.ok) {
                showToast('Staff attendance saved', 'success');
            } else {
                showToast('Failed to save attendance', 'error');
            }
        } catch (error) {
            showToast('Error saving attendance', 'error');
        } finally {
            setSubmittingStaff(false);
        }
    };

    // --- Render Helpers ---

    const getStatusColor = (status) => {
        switch (status) {
            case 'present': return '#4CAF50';
            case 'absent': return '#F44336';
            case 'late': return '#FF9800';
            case 'excused': return '#2196F3';
            default: return '#e0e0e0';
        }
    };

    const renderStaffItem = ({ item, index }) => (
        <TouchableOpacity
            style={styles.staffCard}
            onPress={() => toggleStaffStatus(index)}
        >
            <View style={styles.staffInfo}>
                <Text style={styles.staffName}>{item.user.name}</Text>
                <Text style={styles.staffRole}>Class Teacher</Text>
            </View>
            <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(item.status) }]}>
                <Text style={styles.statusText}>{item.status ? item.status.toUpperCase() : 'MARK'}</Text>
            </View>
        </TouchableOpacity>
    );

    const renderMyAttendanceItem = ({ item }) => (
        <View style={styles.historyCard}>
            <View style={[styles.historyStatus, { backgroundColor: getStatusColor(item.status) }]}>
                <Text style={styles.historyStatusText}>{item.status.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.historyInfo}>
                <Text style={styles.historyDate}>{new Date(item.date).toLocaleDateString()}</Text>
                <Text style={styles.historyTime}>{new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
            {item.remarks ? <Text style={styles.historyRemarks}>{item.remarks}</Text> : null}
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Attendance Management</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'student' && styles.activeTab]}
                    onPress={() => setActiveTab('student')}
                >
                    <Text style={[styles.tabText, activeTab === 'student' && styles.activeTabText]}>Student</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'staff' && styles.activeTab]}
                    onPress={() => setActiveTab('staff')}
                >
                    <Text style={[styles.tabText, activeTab === 'staff' && styles.activeTabText]}>Staff</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'my_attendance' && styles.activeTab]}
                    onPress={() => setActiveTab('my_attendance')}
                >
                    <Text style={[styles.tabText, activeTab === 'my_attendance' && styles.activeTabText]}>My Log</Text>
                </TouchableOpacity>
            </View>

            {/* Date Picker for Student/Staff tabs */}
            {activeTab !== 'my_attendance' && (
                <View style={styles.dateBar}>
                    <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateSelector}>
                        <Ionicons name="calendar" size={20} color="#6200ee" />
                        <Text style={styles.dateText}>{date.toDateString()}</Text>
                    </TouchableOpacity>
                    {showDatePicker && (
                        <DateTimePicker
                            value={date}
                            mode="date"
                            display="default"
                            onChange={(event, selectedDate) => {
                                setShowDatePicker(false);
                                if (selectedDate) setDate(selectedDate);
                            }}
                        />
                    )}
                </View>
            )}

            {loading ? (
                <ActivityIndicator size="large" color="#6200ee" style={styles.loader} />
            ) : (
                <View style={{ flex: 1 }}>
                    {activeTab === 'student' && (
                        <View style={{ flex: 1, padding: 16 }}>
                            <Text style={styles.sectionTitle}>Select Class</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classScroll}>
                                {classes.map((cls) => (
                                    <TouchableOpacity
                                        key={cls._id}
                                        style={[styles.classChip, selectedClass?._id === cls._id && styles.activeClassChip]}
                                        onPress={() => setSelectedClass(cls)}
                                    >
                                        <Text style={[styles.classChipText, selectedClass?._id === cls._id && styles.activeClassChipText]}>
                                            {cls.name} {cls.section}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            {selectedClass && (
                                <FlatList
                                    data={studentAttendance}
                                    keyExtractor={(item) => item.student._id}
                                    renderItem={({ item }) => (
                                        <View style={styles.studentRow}>
                                            <Text style={styles.studentName}>{item.student.name}</Text>
                                            <View style={[styles.miniStatus, { backgroundColor: getStatusColor(item.status) }]}>
                                                <Text style={styles.miniStatusText}>{item.status ? item.status.toUpperCase() : '-'}</Text>
                                            </View>
                                        </View>
                                    )}
                                    ListEmptyComponent={<Text style={styles.emptyText}>No attendance records found.</Text>}
                                />
                            )}
                        </View>
                    )}

                    {activeTab === 'staff' && (
                        <View style={{ flex: 1 }}>
                            <FlatList
                                data={staffList}
                                renderItem={renderStaffItem}
                                keyExtractor={(item) => item.user._id}
                                contentContainerStyle={styles.listContent}
                                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                            />
                            <View style={styles.footer}>
                                <TouchableOpacity
                                    style={styles.saveButton}
                                    onPress={saveStaffAttendance}
                                    disabled={submittingStaff}
                                >
                                    {submittingStaff ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.saveButtonText}>Save Attendance</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {activeTab === 'my_attendance' && (
                        <View style={{ flex: 1 }}>
                            {mySummary && (
                                <View style={styles.summaryCard}>
                                    <View style={styles.summaryItem}>
                                        <Text style={styles.summaryValue}>{mySummary.present}</Text>
                                        <Text style={styles.summaryLabel}>Present</Text>
                                    </View>
                                    <View style={styles.summaryItem}>
                                        <Text style={styles.summaryValue}>{mySummary.absent}</Text>
                                        <Text style={styles.summaryLabel}>Absent</Text>
                                    </View>
                                    <View style={styles.summaryItem}>
                                        <Text style={styles.summaryValue}>{mySummary.percentage}%</Text>
                                        <Text style={styles.summaryLabel}>Attendance</Text>
                                    </View>
                                </View>
                            )}
                            <FlatList
                                data={myAttendance}
                                renderItem={renderMyAttendanceItem}
                                keyExtractor={(item) => item._id}
                                contentContainerStyle={styles.listContent}
                                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                            />
                        </View>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', elevation: 2 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    backButton: { padding: 4 },
    tabContainer: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    activeTab: { borderBottomColor: '#6200ee' },
    tabText: { fontSize: 16, color: '#666', fontWeight: '500' },
    activeTabText: { color: '#6200ee', fontWeight: 'bold' },
    dateBar: { flexDirection: 'row', justifyContent: 'center', padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
    dateSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0e6ff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    dateText: { marginLeft: 8, color: '#6200ee', fontWeight: '600' },
    loader: { marginTop: 20 },
    listContent: { padding: 16 },
    staffCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 1 },
    staffInfo: { flex: 1 },
    staffName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    staffRole: { fontSize: 12, color: '#666' },
    statusIndicator: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, minWidth: 80, alignItems: 'center' },
    statusText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
    footer: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
    saveButton: { backgroundColor: '#6200ee', padding: 16, borderRadius: 12, alignItems: 'center' },
    saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    summaryCard: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#fff', margin: 16, padding: 16, borderRadius: 12, elevation: 2 },
    summaryItem: { alignItems: 'center' },
    summaryValue: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    summaryLabel: { fontSize: 12, color: '#666' },
    historyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 1 },
    historyStatus: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    historyStatusText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
    historyInfo: { flex: 1 },
    historyDate: { fontSize: 16, fontWeight: '600', color: '#333' },
    historyTime: { fontSize: 12, color: '#666' },
    historyRemarks: { fontSize: 12, color: '#666', fontStyle: 'italic' },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 12 },
    classScroll: { maxHeight: 50, marginBottom: 16 },
    classChip: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fff', borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#ddd' },
    activeClassChip: { backgroundColor: '#6200ee', borderColor: '#6200ee' },
    classChipText: { color: '#666' },
    activeClassChipText: { color: '#fff', fontWeight: 'bold' },
    studentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
    studentName: { fontSize: 16, color: '#333' },
    miniStatus: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    miniStatusText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
    emptyText: { textAlign: 'center', marginTop: 20, color: '#666' },
});
