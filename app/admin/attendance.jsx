import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

import DateTimePicker from '@react-native-community/datetimepicker';
import { useApiQuery, useApiMutation, createApiMutationFn } from '../../hooks/useApi';
import { useQueryClient } from '@tanstack/react-query';
import apiConfig from '../../config/apiConfig';
import { useToast } from '../../components/ToastProvider';
import { useTheme } from '../../theme';

import AttendanceView from '../../components/AttendanceView';

export default function AdminAttendance() {
    const router = useRouter();
    // ... (rest of component)
    const { showToast } = useToast();
    const { colors } = useTheme();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('summary'); // 'summary', 'student', 'staff', 'my_attendance'
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedClass, setSelectedClass] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const styles = useMemo(() => createStyles(colors), [colors]);

    // Fetch User
    const { data: user } = useApiQuery(
        ['currentUser'],
        `${apiConfig.baseUrl}/auth/me`,
        { select: (data) => data.user }
    );

    // Fetch School Summary
    const { data: schoolSummary, isLoading: summaryLoading, refetch: refetchSummary } = useApiQuery(
        ['attendanceSummary', date.toISOString().split('T')[0]],
        `${apiConfig.baseUrl}/attendance/school-summary?date=${date.toISOString().split('T')[0]}`,
        { enabled: activeTab === 'summary' }
    );

    // Fetch Classes
    const { data: classesData = [] } = useApiQuery(
        ['classes'],
        `${apiConfig.baseUrl}/classes`,
        { enabled: activeTab === 'student' }
    );
    const classes = Array.isArray(classesData) ? classesData : (classesData.data || []);

    // Fetch Student Attendance
    const { data: studentAttendance, isLoading: studentLoading, refetch: refetchStudent } = useApiQuery(
        ['studentAttendance', selectedClass?._id, date.toISOString().split('T')[0]],
        `${apiConfig.baseUrl}/attendance/class/${selectedClass?._id}/date/${date.toISOString().split('T')[0]}`,
        { enabled: activeTab === 'student' && !!selectedClass }
    );

    // Fetch Staff List
    const { data: staffListResponse, isLoading: staffLoading, refetch: refetchStaff } = useApiQuery(
        ['staffList', date.toISOString().split('T')[0]],
        `${apiConfig.baseUrl}/attendance/staff-list?date=${date.toISOString().split('T')[0]}`,
        { enabled: activeTab === 'staff' }
    );
    const staffList = staffListResponse?.data;

    // Fetch My Attendance
    const { data: myAttendanceData, isLoading: myAttendanceLoading, refetch: refetchMyAttendance } = useApiQuery(
        ['myAttendance'],
        `${apiConfig.baseUrl}/attendance/my-attendance`,
        { enabled: activeTab === 'my_attendance' }
    );
    const myAttendance = myAttendanceData?.attendance || [];
    const mySummary = myAttendanceData?.summary || null;

    const loading = summaryLoading || studentLoading || staffLoading || myAttendanceLoading;

    const onRefresh = async () => {
        setRefreshing(true);
        if (activeTab === 'summary') await refetchSummary();
        if (activeTab === 'student') await refetchStudent();
        if (activeTab === 'staff') await refetchStaff();
        if (activeTab === 'my_attendance') await refetchMyAttendance();
        setRefreshing(false);
    };

    // Local state for modifications before saving
    const [localStudentAttendance, setLocalStudentAttendance] = useState([]);
    const [localStaffList, setLocalStaffList] = useState([]);

    useEffect(() => {
        if (studentAttendance) setLocalStudentAttendance(studentAttendance);
    }, [studentAttendance]);

    useEffect(() => {
        if (staffList) setLocalStaffList(staffList);
    }, [staffList]);

    // Mutations
    const saveStudentAttendanceMutation = useApiMutation({
        mutationFn: createApiMutationFn(`${apiConfig.baseUrl}/attendance/mark`, 'POST'),
        onSuccess: () => {
            showToast('Student attendance saved', 'success');
            queryClient.invalidateQueries({ queryKey: ['studentAttendance'] });
            queryClient.invalidateQueries({ queryKey: ['attendanceSummary'] });
        },
        onError: () => showToast('Failed to save attendance', 'error')
    });

    const saveStaffAttendanceMutation = useApiMutation({
        mutationFn: createApiMutationFn(`${apiConfig.baseUrl}/attendance/mark-staff`, 'POST'),
        onSuccess: () => {
            showToast('Staff attendance saved', 'success');
            queryClient.invalidateQueries({ queryKey: ['staffList'] });
            queryClient.invalidateQueries({ queryKey: ['attendanceSummary'] });
        },
        onError: () => showToast('Failed to save attendance', 'error')
    });

    // --- Student Attendance Handlers ---

    const handleStudentStatusChange = (index, newStatus) => {
        const newAttendance = [...localStudentAttendance];
        newAttendance[index].status = newStatus;
        setLocalStudentAttendance(newAttendance);
    };

    const markAllStudentsPresent = () => {
        const newAttendance = localStudentAttendance.map(item => ({
            ...item,
            status: 'present'
        }));
        setLocalStudentAttendance(newAttendance);
    };

    const saveStudentAttendance = () => {
        if (!selectedClass) return;
        const records = localStudentAttendance
            .filter(item => item.status)
            .map(item => ({
                studentId: item.student._id,
                status: item.status,
                remarks: item.remarks
            }));

        if (records.length === 0) {
            showToast('No attendance marked to save', 'info');
            return;
        }

        saveStudentAttendanceMutation.mutate({
            classId: selectedClass._id,
            date: date.toISOString().split('T')[0],
            attendanceRecords: records
        });
    };

    // --- Staff Attendance Handlers ---

    const markAllStaffPresent = () => {
        const newStaffList = localStaffList.map(item => ({
            ...item,
            status: 'present'
        }));
        setLocalStaffList(newStaffList);
    };

    const handleStaffStatusChange = (index, newStatus) => {
        const newStaffList = [...localStaffList];
        newStaffList[index].status = newStatus;
        setLocalStaffList(newStaffList);
    };

    const saveStaffAttendance = () => {
        const records = localStaffList
            .filter(item => item.status) // Only send marked records
            .map(item => ({
                userId: item.user._id,
                status: item.status,
                remarks: item.remarks
            }));

        if (records.length === 0) {
            showToast('No attendance marked to save', 'info');
            return;
        }

        saveStaffAttendanceMutation.mutate({
            date: date.toISOString().split('T')[0],
            attendanceRecords: records
        });
    };

    // --- Render Helpers ---

    const getStatusColor = (status) => {
        switch (status) {
            case 'present': return colors.success;
            case 'absent': return colors.error;
            case 'late': return '#FF9800';
            case 'excused': return '#2196F3';
            default: return colors.textSecondary;
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'present': return 'check-circle';
            case 'absent': return 'cancel';
            case 'late': return 'schedule';
            case 'excused': return 'verified';
            default: return 'radio-button-unchecked';
        }
    };

    const renderStaffItem = ({ item, index }) => (
        <View style={{
            backgroundColor: colors.cardBackground,
            borderRadius: 12,
            padding: 14,
            marginBottom: 10,
            elevation: 1
        }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontFamily: "DMSans-SemiBold", color: colors.textPrimary }}>
                        {item.user.name}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2, fontFamily: "DMSans-Regular", textTransform: "capitalize" }}>
                        {item.user.designation ? item.user.designation : item.user.role === 'support_staff' ? 'Support Staff' : item.user.role}
                    </Text>
                </View>
                {item.status && (
                    <MaterialIcons
                        name={getStatusIcon(item.status)}
                        size={24}
                        color={getStatusColor(item.status)}
                    />
                )}
            </View>

            {/* Status Buttons */}
            <View style={{ flexDirection: "row", gap: 8 }}>
                {['present', 'absent', 'late', 'excused'].map((status) => (
                    <TouchableOpacity
                        key={status}
                        onPress={() => handleStaffStatusChange(index, status)}
                        activeOpacity={0.7}
                        style={{
                            flex: 1,
                            backgroundColor: item.status === status
                                ? getStatusColor(status) + "20"
                                : colors.background,
                            borderWidth: item.status === status ? 2 : 1,
                            borderColor: item.status === status
                                ? getStatusColor(status)
                                : colors.textSecondary + "30",
                            borderRadius: 8,
                            paddingVertical: 10,
                            alignItems: "center",
                        }}
                    >
                        <Text style={{
                            fontSize: 11,
                            fontFamily: "DMSans-Bold",
                            color: item.status === status
                                ? getStatusColor(status)
                                : colors.textSecondary,
                            textTransform: "uppercase"
                        }}>
                            {status === 'present' ? 'P' : status === 'absent' ? 'A' : status === 'late' ? 'L' : 'E'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );



    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
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
                                <View style={[styles.summaryCardSmall, { backgroundColor: colors.primary + '15' }]}>
                                    <Text style={[styles.summaryValue, { color: colors.primary }]}>{schoolSummary?.students?.present || 0}/{schoolSummary?.students?.total || 0}</Text>
                                    <Text style={styles.summaryLabel}>Student Attendance</Text>
                                </View>
                                <View style={[styles.summaryCardSmall, { backgroundColor: colors.success + '15' }]}>
                                    <Text style={[styles.summaryValue, { color: colors.success }]}>{schoolSummary?.teachers?.present || 0}/{schoolSummary?.teachers?.total || 0}</Text>
                                    <Text style={styles.summaryLabel}>Teacher Attendance</Text>
                                </View>
                            </View>

                            {/* Absent List */}
                            <Text style={styles.sectionTitle}>Absent Today</Text>
                            {(schoolSummary?.absentList || []).length === 0 ? (
                                <Text style={styles.emptyText}>No one marked absent yet.</Text>
                            ) : (
                                schoolSummary.absentList.map((item) => (
                                    <View key={item._id} style={styles.absentRow}>
                                        <View>
                                            <Text style={styles.absentName}>{item.name}</Text>
                                            <Text style={styles.absentRole}>{item.designation ? item.designation : item.role === 'support_staff' ? 'Support Staff' : item.role} {item.className ? `• ${item.className}` : ''}</Text>
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
                                        style={{ flex: 1 }}
                                        data={localStudentAttendance}
                                        keyExtractor={(item) => item.student._id}
                                        renderItem={({ item, index }) => (
                                            <View
                                                style={{
                                                    backgroundColor: colors.cardBackground,
                                                    borderRadius: 12,
                                                    padding: 14,
                                                    marginBottom: 10,
                                                    elevation: 1
                                                }}
                                            >
                                                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={{ fontSize: 16, fontFamily: "DMSans-SemiBold", color: colors.textPrimary }}>
                                                            {item.student.name}
                                                        </Text>
                                                    </View>
                                                    {item.status && (
                                                        <MaterialIcons
                                                            name={getStatusIcon(item.status)}
                                                            size={24}
                                                            color={getStatusColor(item.status)}
                                                        />
                                                    )}
                                                </View>

                                                {/* Status Buttons */}
                                                <View style={{ flexDirection: "row", gap: 8 }}>
                                                    {['present', 'absent', 'late', 'excused'].map((status) => (
                                                        <TouchableOpacity
                                                            key={status}
                                                            onPress={() => handleStudentStatusChange(index, status)}
                                                            activeOpacity={0.7}
                                                            style={{
                                                                flex: 1,
                                                                backgroundColor: item.status === status
                                                                    ? getStatusColor(status) + "20"
                                                                    : colors.background,
                                                                borderWidth: item.status === status ? 2 : 1,
                                                                borderColor: item.status === status
                                                                    ? getStatusColor(status)
                                                                    : colors.textSecondary + "30",
                                                                borderRadius: 8,
                                                                paddingVertical: 10,
                                                                alignItems: "center",
                                                            }}
                                                        >
                                                            <Text style={{
                                                                fontSize: 11,
                                                                fontFamily: "DMSans-Bold",
                                                                color: item.status === status
                                                                    ? getStatusColor(status)
                                                                    : colors.textSecondary,
                                                                textTransform: "uppercase"
                                                            }}>
                                                                {status === 'present' ? 'P' : status === 'absent' ? 'A' : status === 'late' ? 'L' : 'E'}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </View>
                                            </View>
                                        )}
                                        ListEmptyComponent={<Text style={styles.emptyText}>No students found.</Text>}
                                        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
                                    />
                                    <View style={styles.footer}>
                                        <TouchableOpacity
                                            style={[styles.saveButton, { backgroundColor: colors.primary }]}
                                            onPress={saveStudentAttendance}
                                            disabled={saveStudentAttendanceMutation.isPending}
                                        >
                                            {saveStudentAttendanceMutation.isPending ? (
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
                                style={{ flex: 1 }}
                                data={localStaffList}
                                renderItem={renderStaffItem}
                                keyExtractor={(item) => item.user._id}
                                contentContainerStyle={styles.listContent}
                                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                            />
                            <View style={styles.footer}>
                                <TouchableOpacity
                                    style={[styles.saveButton, { backgroundColor: colors.primary }]}
                                    onPress={saveStaffAttendance}
                                    disabled={saveStaffAttendanceMutation.isPending}
                                >
                                    {saveStaffAttendanceMutation.isPending ? (
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

const createStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: colors.cardBackground, elevation: 2 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
    backButton: { padding: 4 },
    tabContainer: { flexDirection: 'row', backgroundColor: colors.cardBackground, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabText: { fontSize: 16, color: colors.textSecondary, fontWeight: '500' },
    dateBar: { flexDirection: 'row', justifyContent: 'center', padding: 12, backgroundColor: colors.cardBackground, borderBottomWidth: 1, borderBottomColor: colors.border },
    dateSelector: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    dateText: { marginLeft: 8, fontWeight: '600' },
    loader: { marginTop: 20 },
    listContent: { padding: 16, paddingBottom: 100 },
    staffCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.cardBackground, padding: 16, borderRadius: 12, marginBottom: 12, elevation: 1 },
    staffInfo: { flex: 1 },
    staffName: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary },
    staffRole: { fontSize: 12, color: colors.textSecondary },
    statusIndicator: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, minWidth: 80, alignItems: 'center' },
    statusText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
    footer: { padding: 16, paddingBottom: 110, backgroundColor: colors.cardBackground, borderTopWidth: 1, borderTopColor: colors.border },
    saveButton: { padding: 16, borderRadius: 12, alignItems: 'center' },
    saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    summaryCard: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: colors.cardBackground, margin: 16, padding: 16, borderRadius: 12, elevation: 2 },
    summaryItem: { alignItems: 'center' },
    summaryValue: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },
    summaryLabel: { fontSize: 12, color: colors.textSecondary },
    historyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBackground, padding: 16, borderRadius: 12, marginBottom: 12, elevation: 1 },
    historyStatus: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    historyStatusText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
    historyInfo: { flex: 1 },
    historyDate: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
    historyTime: { fontSize: 12, color: colors.textSecondary },
    historyRemarks: { fontSize: 12, color: colors.textSecondary, fontStyle: 'italic' },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 12 },
    classScroll: { maxHeight: 50, marginBottom: 16 },
    classChip: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.cardBackground, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: colors.border },
    classChipText: { color: colors.textSecondary },
    activeClassChipText: { color: '#fff', fontWeight: 'bold' },
    studentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    studentName: { fontSize: 16, color: colors.textPrimary },
    miniStatus: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    miniStatusText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
    emptyText: { textAlign: 'center', marginTop: 20, color: colors.textSecondary },
    summaryCardSmall: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    absentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    absentName: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary },
    absentRole: { fontSize: 12, color: colors.textSecondary },
    absentTag: { backgroundColor: colors.error + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    absentTagText: { color: colors.error, fontSize: 10, fontWeight: 'bold' },
    actionHeader: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: 8 },
    textButton: { padding: 8 },
    textButtonText: { fontWeight: 'bold' },
});
