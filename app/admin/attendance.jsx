import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import apiFetch from '../../utils/apiFetch';
import apiConfig from '../../config/apiConfig';
import { useToast } from '../../components/ToastProvider';
import { useTheme } from '../../theme';

import AttendanceView from '../../components/AttendanceView';

export default function AdminAttendance() {
    const router = useRouter();
    // ... (rest of component)
    const { showToast } = useToast();
    const { colors } = useTheme();
    const [activeTab, setActiveTab] = useState('summary'); // 'summary', 'student', 'staff', 'my_attendance'
    const [user, setUser] = useState(null);

    // Common State
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Summary State
    const [schoolSummary, setSchoolSummary] = useState(null);

    // Student Attendance State
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState(null);
    const [studentAttendance, setStudentAttendance] = useState([]);
    const [submittingStudent, setSubmittingStudent] = useState(false);

    // Staff Attendance State
    const [staffList, setStaffList] = useState([]);
    const [submittingStaff, setSubmittingStaff] = useState(false);

    // My Attendance State
    const [myAttendance, setMyAttendance] = useState([]);
    const [mySummary, setMySummary] = useState(null);

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        try {
            const storedUser = await AsyncStorage.getItem('@auth_user');
            if (storedUser) {
                setUser(JSON.parse(storedUser));
            }
        } catch (e) {
            console.warn('Failed to load user', e);
        }
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            if (activeTab === 'summary') {
                const dateStr = date.toISOString().split('T')[0];
                const res = await apiFetch(`${apiConfig.baseUrl}/attendance/school-summary?date=${dateStr}`);
                const data = await res.json();
                if (data.success) {
                    setSchoolSummary(data.data);
                }
            } else if (activeTab === 'student') {
                const res = await apiFetch(`${apiConfig.baseUrl}/classes`);
                const data = await res.json();
                let classData = [];
                if (Array.isArray(data)) {
                    classData = data;
                } else if (data.success && data.data) {
                    classData = data.data;
                } else {
                    classData = data;
                }
                setClasses(classData);
                if (selectedClass) {
                    fetchStudentAttendance(selectedClass._id);
                }
            } else if (activeTab === 'staff') {
                const dateStr = date.toISOString().split('T')[0];
                const res = await apiFetch(`${apiConfig.baseUrl}/attendance/staff-list?date=${dateStr}`);
                const data = await res.json();
                if (data.success) {
                    setStaffList(data.data);
                }
            } else if (activeTab === 'my_attendance') {
                const res = await apiFetch(`${apiConfig.baseUrl}/attendance/my-attendance`);
                const data = await res.json();
                setMyAttendance(data.attendance);
                setMySummary(data.summary);
            }
        } catch (error) {
            showToast('Error fetching data', 'error');
            console.error(error);
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

    // --- Student Attendance Handlers ---

    const toggleStudentStatus = (index) => {
        const newAttendance = [...studentAttendance];
        const currentStatus = newAttendance[index].status;
        // Cycle: null -> present -> absent -> late -> excused -> null
        // Simplified: present -> absent -> late -> present
        let nextStatus = 'present';
        if (currentStatus === 'present') nextStatus = 'absent';
        else if (currentStatus === 'absent') nextStatus = 'late';
        else if (currentStatus === 'late') nextStatus = 'excused';
        else if (currentStatus === 'excused') nextStatus = 'present';

        if (!currentStatus) nextStatus = 'present';

        newAttendance[index].status = nextStatus;
        setStudentAttendance(newAttendance);
    };

    const markAllStudentsPresent = () => {
        const newAttendance = studentAttendance.map(item => ({
            ...item,
            status: 'present'
        }));
        setStudentAttendance(newAttendance);
    };

    const saveStudentAttendance = async () => {
        if (!selectedClass) return;
        setSubmittingStudent(true);
        try {
            const records = studentAttendance
                .filter(item => item.status)
                .map(item => ({
                    studentId: item.student._id,
                    status: item.status,
                    remarks: item.remarks
                }));

            if (records.length === 0) {
                showToast('No attendance marked to save', 'info');
                setSubmittingStudent(false);
                return;
            }

            const response = await apiFetch(`${apiConfig.baseUrl}/attendance/mark`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    classId: selectedClass._id,
                    date: date.toISOString().split('T')[0],
                    attendanceRecords: records
                })
            });

            if (response.ok) {
                showToast('Student attendance saved', 'success');
            } else {
                showToast('Failed to save attendance', 'error');
            }
        } catch (error) {
            showToast('Error saving attendance', 'error');
        } finally {
            setSubmittingStudent(false);
        }
    };

    // --- Staff Attendance Handlers ---

    const markAllStaffPresent = () => {
        const newStaffList = staffList.map(item => ({
            ...item,
            status: 'present'
        }));
        setStaffList(newStaffList);
    };

    const toggleStaffStatus = (index) => {
        const newStaffList = [...staffList];
        const currentStatus = newStaffList[index].status;
        // Cycle: null -> present -> absent -> late -> null
        let nextStatus = 'present';
        if (currentStatus === 'present') nextStatus = 'absent';
        else if (currentStatus === 'absent') nextStatus = 'late';
        else if (currentStatus === 'late') nextStatus = 'present';

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
                    style={[styles.tab, activeTab === 'summary' && { borderBottomColor: colors.primary }]}
                    onPress={() => setActiveTab('summary')}
                >
                    <Text style={[styles.tabText, activeTab === 'summary' && { color: colors.primary, fontWeight: 'bold' }]}>Summary</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'student' && { borderBottomColor: colors.primary }]}
                    onPress={() => setActiveTab('student')}
                >
                    <Text style={[styles.tabText, activeTab === 'student' && { color: colors.primary, fontWeight: 'bold' }]}>Student</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'staff' && { borderBottomColor: colors.primary }]}
                    onPress={() => setActiveTab('staff')}
                >
                    <Text style={[styles.tabText, activeTab === 'staff' && { color: colors.primary, fontWeight: 'bold' }]}>Staff</Text>
                </TouchableOpacity>
                {user?.role !== 'super admin' && (
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'my_attendance' && { borderBottomColor: colors.primary }]}
                        onPress={() => setActiveTab('my_attendance')}
                    >
                        <Text style={[styles.tabText, activeTab === 'my_attendance' && { color: colors.primary, fontWeight: 'bold' }]}>My Log</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Date Picker for Student/Staff/Summary tabs */}
            {activeTab !== 'my_attendance' && (
                <View style={styles.dateBar}>
                    <TouchableOpacity onPress={() => setShowDatePicker(true)} style={[styles.dateSelector, { backgroundColor: colors.primary + '15' }]}>
                        <Ionicons name="calendar" size={20} color={colors.primary} />
                        <Text style={[styles.dateText, { color: colors.primary }]}>{date.toDateString()}</Text>
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
                <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
            ) : (
                <View style={{ flex: 1 }}>
                    {activeTab === 'summary' && schoolSummary && (
                        <ScrollView style={{ flex: 1, padding: 16 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
                            {/* Summary Cards */}
                            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
                                <View style={[styles.summaryCardSmall, { backgroundColor: '#E3F2FD' }]}>
                                    <Text style={[styles.summaryValue, { color: '#1976D2' }]}>{schoolSummary.students.present}/{schoolSummary.students.total}</Text>
                                    <Text style={styles.summaryLabel}>Student Attendance</Text>
                                </View>
                                <View style={[styles.summaryCardSmall, { backgroundColor: '#E8F5E9' }]}>
                                    <Text style={[styles.summaryValue, { color: '#388E3C' }]}>{schoolSummary.teachers.present}/{schoolSummary.teachers.total}</Text>
                                    <Text style={styles.summaryLabel}>Teacher Attendance</Text>
                                </View>
                            </View>

                            {/* Absent List */}
                            <Text style={styles.sectionTitle}>Absent Today</Text>
                            {schoolSummary.absentList.length === 0 ? (
                                <Text style={styles.emptyText}>No one marked absent yet.</Text>
                            ) : (
                                schoolSummary.absentList.map((item) => (
                                    <View key={item._id} style={styles.absentRow}>
                                        <View>
                                            <Text style={styles.absentName}>{item.name}</Text>
                                            <Text style={styles.absentRole}>{item.role} • {item.className}</Text>
                                        </View>
                                        <View style={styles.absentTag}>
                                            <Text style={styles.absentTagText}>Absent</Text>
                                        </View>
                                    </View>
                                ))
                            )}
                        </ScrollView>
                    )}

                    {activeTab === 'student' && (
                        <View style={{ flex: 1 }}>
                            <View style={{ padding: 16, paddingBottom: 0 }}>
                                <Text style={styles.sectionTitle}>Select Class</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classScroll}>
                                    {classes.map((cls) => (
                                        <TouchableOpacity
                                            key={cls._id}
                                            style={[styles.classChip, selectedClass?._id === cls._id && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                                            onPress={() => setSelectedClass(cls)}
                                        >
                                            <Text style={[styles.classChipText, selectedClass?._id === cls._id && styles.activeClassChipText]}>
                                                {cls.name} {cls.section}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            {selectedClass && (
                                <>
                                    <View style={styles.actionHeader}>
                                        <TouchableOpacity onPress={markAllStudentsPresent} style={styles.textButton}>
                                            <Text style={[styles.textButtonText, { color: colors.primary }]}>Mark All Present</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <FlatList
                                        data={studentAttendance}
                                        keyExtractor={(item) => item.student._id}
                                        renderItem={({ item, index }) => (
                                            <TouchableOpacity
                                                style={styles.studentRow}
                                                onPress={() => toggleStudentStatus(index)}
                                            >
                                                <Text style={styles.studentName}>{item.student.name}</Text>
                                                <View style={[styles.miniStatus, { backgroundColor: getStatusColor(item.status) }]}>
                                                    <Text style={styles.miniStatusText}>{item.status ? item.status.toUpperCase() : 'MARK'}</Text>
                                                </View>
                                            </TouchableOpacity>
                                        )}
                                        ListEmptyComponent={<Text style={styles.emptyText}>No students found.</Text>}
                                        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
                                    />
                                    <View style={styles.footer}>
                                        <TouchableOpacity
                                            style={[styles.saveButton, { backgroundColor: colors.primary }]}
                                            onPress={saveStudentAttendance}
                                            disabled={submittingStudent}
                                        >
                                            {submittingStudent ? (
                                                <ActivityIndicator color="#fff" />
                                            ) : (
                                                <Text style={styles.saveButtonText}>Save Student Attendance</Text>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}
                        </View>
                    )}

                    {activeTab === 'staff' && (
                        <View style={{ flex: 1 }}>
                            <View style={styles.actionHeader}>
                                <TouchableOpacity onPress={markAllStaffPresent} style={styles.textButton}>
                                    <Text style={[styles.textButtonText, { color: colors.primary }]}>Mark All Present</Text>
                                </TouchableOpacity>
                            </View>
                            <FlatList
                                data={staffList}
                                renderItem={renderStaffItem}
                                keyExtractor={(item) => item.user._id}
                                contentContainerStyle={styles.listContent}
                                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                            />
                            <View style={styles.footer}>
                                <TouchableOpacity
                                    style={[styles.saveButton, { backgroundColor: colors.primary }]}
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
                        <AttendanceView
                            attendanceHistory={myAttendance}
                            summary={mySummary}
                            loading={loading}
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            title="My Attendance Log"
                            subtitle="Track your admin attendance"
                        />
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
    tabText: { fontSize: 16, color: '#666', fontWeight: '500' },
    dateBar: { flexDirection: 'row', justifyContent: 'center', padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
    dateSelector: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    dateText: { marginLeft: 8, fontWeight: '600' },
    loader: { marginTop: 20 },
    listContent: { padding: 16, paddingBottom: 100 },
    staffCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 1 },
    staffInfo: { flex: 1 },
    staffName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    staffRole: { fontSize: 12, color: '#666' },
    statusIndicator: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, minWidth: 80, alignItems: 'center' },
    statusText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
    footer: { padding: 16, paddingBottom: 80, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
    saveButton: { padding: 16, borderRadius: 12, alignItems: 'center' },
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
    classChipText: { color: '#666' },
    activeClassChipText: { color: '#fff', fontWeight: 'bold' },
    studentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
    studentName: { fontSize: 16, color: '#333' },
    miniStatus: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    miniStatusText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
    emptyText: { textAlign: 'center', marginTop: 20, color: '#666' },
    summaryCardSmall: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    absentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
    absentName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    absentRole: { fontSize: 12, color: '#666' },
    absentTag: { backgroundColor: '#FFEBEE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    absentTagText: { color: '#D32F2F', fontSize: 10, fontWeight: 'bold' },
    actionHeader: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: 8 },
    textButton: { padding: 8 },
    textButtonText: { fontWeight: 'bold' },
});
