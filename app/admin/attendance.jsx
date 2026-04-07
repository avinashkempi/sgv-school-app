import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Pressable, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

import DateTimePicker from '@react-native-community/datetimepicker';
import { useApiQuery, useApiMutation, createApiMutationFn } from '../../hooks/useApi';
import apiFetch from '../../utils/apiFetch';
import { useQueryClient } from '@tanstack/react-query';
import apiConfig from '../../config/apiConfig';
import { useToast } from '../../components/ToastProvider';
import { useTheme } from '../../theme';
import { EmptyState } from '../../components/StateComponents';

import AttendanceView from '../../components/AttendanceView';
import { formatClassName } from '../../utils/formatClassName';

export default function AdminAttendance() {
    const router = useRouter();
    // ... (rest of component)
    const { showToast } = useToast();
    const { colors } = useTheme();
    const queryClient = useQueryClient();

    // Parse initial tab from params if coming from dashboard
    const params = require('expo-router').useLocalSearchParams();
    const initialTab = params?.tab || 'summary';
    const [activeTab, setActiveTab] = useState(initialTab); // 'summary', 'student', 'staff', 'tracker', 'my_attendance'
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedClass, setSelectedClass] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    // Pagination state for My Attendance tab
    const MY_PAGE_SIZE = 30;
    const [myPage, setMyPage] = useState(1);
    const [allMyAttendance, setAllMyAttendance] = useState([]);
    const [myHasMore, setMyHasMore] = useState(false);
    const [myLoadingMore, setMyLoadingMore] = useState(false);
    const [mySummaryData, setMySummaryData] = useState(null);

    // Show More state
    const [absentVisible, setAbsentVisible] = useState(15);
    const ABSENT_PAGE = 15;
    const [trackerVisible, setTrackerVisible] = useState(10);
    const TRACKER_PAGE = 10;

    const styles = useMemo(() => createStyles(colors), [colors]);

    // Fetch User
    const { data: user } = useApiQuery(
        ['currentUser'],
        `${apiConfig.baseUrl}/auth/me`,
        { select: (data) => data.user }
    );

    // Fetch School Summary
    const { data: schoolSummary, isLoading: summaryLoading, isFetching: summaryFetching, refetch: refetchSummary } = useApiQuery(
        ['attendanceSummary', date.toISOString().split('T')[0]],
        `${apiConfig.baseUrl}/attendance/school-summary?date=${date.toISOString().split('T')[0]}`,
        { enabled: activeTab === 'summary', select: (d) => d.data, staleTime: 60 * 1000, gcTime: 10 * 60 * 1000 }
    );

    // Fetch if current date is holiday
    const { data: holidayData, refetch: refetchHoliday } = useApiQuery(
        ['holidayStatus', date.toISOString().split('T')[0]],
        `${apiConfig.baseUrl}/events?startDate=${date.toISOString().split('T')[0]}&endDate=${date.toISOString().split('T')[0]}&isHoliday=true`,
        { enabled: activeTab !== 'my_attendance' && activeTab !== 'tracker', staleTime: 60 * 1000 }
    );
    const holidayEvent = (holidayData?.event && holidayData.event.length > 0) ? holidayData.event[0] : null;
    const isSunday = date.getDay() === 0;
    const isHoliday = isSunday || !!holidayEvent;
    const holidayReason = isSunday ? 'Sunday (Weekend)' : holidayEvent?.title;

    // Mutation to mark as holiday
    const toggleHolidayMutation = useApiMutation({
        mutationFn: createApiMutationFn(`${apiConfig.baseUrl}/events`, 'POST'),
        onSuccess: () => {
            showToast('Holiday marked successfully', 'success');
            refetchHoliday();
            refetchSummary();
        },
        onError: () => showToast('Failed to mark holiday', 'error')
    });

    const handleMarkAsHoliday = () => {
        toggleHolidayMutation.mutate({
            title: 'School Holiday',
            date: date.toISOString().split('T')[0],
            isSchoolEvent: true,
            isHoliday: true,
            description: 'Manually marked as a holiday from attendance dashboard'
        });
    };

    // Fetch Classes
    const { data: classesData = [] } = useApiQuery(
        ['classes'],
        `${apiConfig.baseUrl}/classes`,
        { enabled: activeTab === 'student' || activeTab === 'summary', staleTime: 5 * 60 * 1000, gcTime: 10 * 60 * 1000 }
    );
    const classes = Array.isArray(classesData) ? classesData : (classesData.data || []);

    // Fetch Student Attendance
    const { data: studentAttendance, isLoading: studentLoading, refetch: refetchStudent } = useApiQuery(
        ['studentAttendance', selectedClass?._id, date.toISOString().split('T')[0]],
        `${apiConfig.baseUrl}/attendance/class/${selectedClass?._id}/date/${date.toISOString().split('T')[0]}`,
        { enabled: activeTab === 'student' && !!selectedClass, staleTime: 30 * 1000, gcTime: 5 * 60 * 1000 }
    );

    // Fetch Staff List
    const { data: staffListResponse, isLoading: staffLoading, refetch: refetchStaff } = useApiQuery(
        ['staffList', date.toISOString().split('T')[0]],
        `${apiConfig.baseUrl}/attendance/staff-list?date=${date.toISOString().split('T')[0]}`,
        { enabled: activeTab === 'staff', staleTime: 30 * 1000, gcTime: 5 * 60 * 1000 }
    );
    const staffList = staffListResponse?.data;

    // Fetch My Attendance (page 1) — subsequent pages fetched via loadMoreMyAttendance
    const { isLoading: myAttendanceLoading, refetch: refetchMyAttendance } = useApiQuery(
        ['myAttendanceAdmin'],
        `${apiConfig.baseUrl}/attendance/my-attendance?page=1&limit=${MY_PAGE_SIZE}`,
        {
            enabled: activeTab === 'my_attendance',
            staleTime: 2 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
            onSuccess: (data) => {
                setAllMyAttendance(data?.attendance || []);
                setMySummaryData(data?.summary || null);
                setMyHasMore(data?.pagination?.hasMore || false);
                setMyPage(1);
            }
        }
    );

    const loadMoreMyAttendance = useCallback(async () => {
        if (myLoadingMore || !myHasMore) return;
        setMyLoadingMore(true);
        try {
            const nextPage = myPage + 1;
            const res = await apiFetch(`${apiConfig.baseUrl}/attendance/my-attendance?page=${nextPage}&limit=${MY_PAGE_SIZE}`);
            const data = await res.json();
            if (data?.attendance?.length > 0) {
                setAllMyAttendance(prev => [...prev, ...data.attendance]);
                setMyHasMore(data?.pagination?.hasMore || false);
                setMyPage(nextPage);
            } else {
                setMyHasMore(false);
            }
        } catch (e) {
            console.error('loadMoreMyAttendance error:', e);
        } finally {
            setMyLoadingMore(false);
        }
    }, [myLoadingMore, myHasMore, myPage]);

    // Fetch Classes Marked
    const { data: classesMarkedResponse } = useApiQuery(
        ['classesMarked', date.toISOString().split('T')[0]],
        `${apiConfig.baseUrl}/attendance/classes-marked?date=${date.toISOString().split('T')[0]}`,
        { enabled: activeTab === 'student' || activeTab === 'summary', staleTime: 60 * 1000, gcTime: 10 * 60 * 1000 }
    );
    const classesMarked = classesMarkedResponse?.markedClasses || [];

    // Fetch Tracker Data
    const [trackerStartDate, setTrackerStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 14))); // Last 14 days
    const [trackerEndDate, setTrackerEndDate] = useState(new Date());
    const { data: trackerDataResponse, isLoading: trackerLoading, refetch: refetchTracker } = useApiQuery(
        ['missingTracker', trackerStartDate.toISOString().split('T')[0], trackerEndDate.toISOString().split('T')[0]],
        `${apiConfig.baseUrl}/attendance/missing-tracker?startDate=${trackerStartDate.toISOString().split('T')[0]}&endDate=${trackerEndDate.toISOString().split('T')[0]}`,
        { enabled: activeTab === 'tracker', staleTime: 2 * 60 * 1000, gcTime: 10 * 60 * 1000 }
    );
    const trackerData = trackerDataResponse?.missingData || [];

    const loading = summaryLoading || studentLoading || staffLoading || myAttendanceLoading || trackerLoading;

    const onRefresh = async () => {
        setRefreshing(true);
        if (activeTab === 'summary') { await refetchSummary(); setAbsentVisible(ABSENT_PAGE); }
        if (activeTab === 'student') await refetchStudent();
        if (activeTab === 'staff') await refetchStaff();
        if (activeTab === 'tracker') { await refetchTracker(); setTrackerVisible(TRACKER_PAGE); }
        if (activeTab === 'my_attendance') await refetchMyAttendance();
        setRefreshing(false);
    };

    // Local state for modifications before saving
    const [localStudentAttendance, setLocalStudentAttendance] = useState([]);
    const [localStaffList, setLocalStaffList] = useState([]);

    useEffect(() => {
        if (studentAttendance) {
            // Auto-set on-leave students to absent if no status
            const processed = studentAttendance.map(s =>
                s.onLeave && !s.status ? { ...s, status: 'absent' } : s
            );
            setLocalStudentAttendance(processed);
        }
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
            status: item.onLeave ? 'absent' : 'present'
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
            case 'half-day': return '#9C27B0';
            default: return colors.textSecondary;
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'present': return 'check-circle';
            case 'absent': return 'cancel';
            case 'late': return 'schedule';
            case 'excused': return 'verified';
            case 'half-day': return 'timelapse';
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
                {['present', 'half-day', 'absent', 'late', 'excused'].map((status) => (
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
                            {status === 'present' ? 'P' : status === 'half-day' ? 'HD' : status === 'absent' ? 'A' : status === 'late' ? 'L' : 'E'}
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
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'tracker' && { borderBottomColor: colors.primary }]}
                    onPress={() => setActiveTab('tracker')}
                >
                    <Text style={[styles.tabText, activeTab === 'tracker' && { color: colors.primary, fontWeight: 'bold' }]}>Tracker</Text>
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
            {activeTab !== 'my_attendance' && activeTab !== 'tracker' && (
                <View style={[styles.dateBar, { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary + '15', borderRadius: 24, paddingHorizontal: 4 }}>
                        <TouchableOpacity
                            onPress={() => { const d = new Date(date); d.setDate(d.getDate() - 1); setDate(d); }}
                            style={{ padding: 10 }}
                        >
                            <MaterialIcons name="chevron-left" size={24} color={colors.primary} />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setShowDatePicker(true)} style={{ paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="calendar" size={20} color={colors.primary} />
                            <Text style={[styles.dateText, { color: colors.primary }]}>{date.toDateString()}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => { const d = new Date(date); d.setDate(d.getDate() + 1); setDate(d); }}
                            style={{ padding: 10 }}
                        >
                            <MaterialIcons name="chevron-right" size={24} color={colors.primary} />
                        </TouchableOpacity>
                    </View>
                    
                    {!isHoliday && (user?.role === 'admin' || user?.role === 'super admin') && (
                        <TouchableOpacity 
                            style={{ marginLeft: 12, backgroundColor: colors.primary + '15', padding: 10, borderRadius: 24, justifyContent: 'center', alignItems: 'center' }}
                            onPress={handleMarkAsHoliday}
                        >
                            <MaterialIcons name="event-busy" size={20} color={colors.primary} />
                        </TouchableOpacity>
                    )}

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

            {isHoliday && activeTab !== 'my_attendance' && activeTab !== 'tracker' && (
                <View style={{ backgroundColor: colors.primary + '15', marginHorizontal: 16, marginBottom: 16, padding: 16, borderRadius: 12, alignItems: 'center', borderColor: colors.primary, borderWidth: 1 }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary }}>🌴 Holiday</Text>
                    <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4, textAlign: 'center' }}>{holidayReason}</Text>
                </View>
            )}

            {loading ? (
                <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
            ) : (
                <View style={{ flex: 1 }}>
                    {activeTab === 'summary' && schoolSummary && (
                        <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ paddingBottom: 120 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
                            {/* Summary Cards */}
                            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
                                <View style={[styles.summaryCardSmall, { backgroundColor: colors.primary + '15', alignItems: 'flex-start', padding: 20 }]}>
                                    <Text style={[styles.summaryLabel, { marginBottom: 8 }]}>Student Attendance</Text>
                                    <Text style={[styles.summaryValue, { color: colors.primary, fontSize: 24, marginBottom: 8 }]}>{schoolSummary?.students?.present || 0}/{schoolSummary?.students?.total || 0}</Text>
                                    <View style={{ height: 6, backgroundColor: colors.primary + '30', borderRadius: 3, width: '100%' }}>
                                        <View style={{ height: '100%', backgroundColor: colors.primary, borderRadius: 3, width: `${schoolSummary?.students?.total > 0 ? ((schoolSummary.students.present / schoolSummary.students.total) * 100) : 0}%` }} />
                                    </View>
                                </View>
                                <View style={[styles.summaryCardSmall, { backgroundColor: colors.success + '15', alignItems: 'flex-start', padding: 20 }]}>
                                    <Text style={[styles.summaryLabel, { marginBottom: 8 }]}>Teacher Attendance</Text>
                                    <Text style={[styles.summaryValue, { color: colors.success, fontSize: 24, marginBottom: 8 }]}>{schoolSummary?.teachers?.present || 0}/{schoolSummary?.teachers?.total || 0}</Text>
                                    <View style={{ height: 6, backgroundColor: colors.success + '30', borderRadius: 3, width: '100%' }}>
                                        <View style={{ height: '100%', backgroundColor: colors.success, borderRadius: 3, width: `${schoolSummary?.teachers?.total > 0 ? ((schoolSummary.teachers.present / schoolSummary.teachers.total) * 100) : 0}%` }} />
                                    </View>
                                </View>
                            </View>

                            {/* Classes Marked */}
                            <Text style={styles.sectionTitle}>Classes Marked Today</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBackground, padding: 16, borderRadius: 12, marginBottom: 24, elevation: 1 }}>
                                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.tertiary + '20', justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
                                    <MaterialIcons name="fact-check" size={24} color={colors.tertiary} />
                                </View>
                                <View>
                                    <Text style={{ fontSize: 20, fontFamily: 'DMSans-Bold', color: colors.textPrimary }}>
                                        {classesMarked.length} <Text style={{ fontSize: 14, fontFamily: 'DMSans-Medium', color: colors.textSecondary }}>out of {classes?.length || 0}</Text>
                                    </Text>
                                    <Text style={{ fontSize: 13, fontFamily: 'DMSans-Regular', color: colors.textSecondary, marginTop: 2 }}>
                                        Classes have taken attendance
                                    </Text>
                                </View>
                            </View>

                            {/* Absent List */}
                            <Text style={styles.sectionTitle}>Absent Today</Text>
                            {(schoolSummary?.absentList || []).length === 0 ? (
                                <Text style={styles.emptyText}>No one marked absent yet.</Text>
                            ) : (
                                <>
                                    {schoolSummary.absentList.slice(0, absentVisible).map((item) => (
                                        <View key={item._id} style={styles.absentRow}>
                                            <View>
                                                <Text style={styles.absentName}>{item.name}</Text>
                                                <Text style={styles.absentRole}>{item.designation ? item.designation : item.role === 'support_staff' ? 'Support Staff' : item.role} {item.className ? `• ${formatClassName(item.className)}` : ''}</Text>
                                            </View>
                                            <View style={styles.absentTag}>
                                                <Text style={styles.absentTagText}>Absent</Text>
                                            </View>
                                        </View>
                                    ))}
                                    {absentVisible < schoolSummary.absentList.length && (
                                        <TouchableOpacity
                                            onPress={() => setAbsentVisible(v => v + ABSENT_PAGE)}
                                            style={{ alignItems: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.primary + '50', marginTop: 8 }}
                                        >
                                            <Text style={{ fontSize: 14, fontFamily: 'DMSans-SemiBold', color: colors.primary }}>
                                                Show More ({schoolSummary.absentList.length - absentVisible} remaining)
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </>
                            )}
                        </ScrollView>
                    )}

                    {activeTab === 'student' && (
                        <View style={{ flex: 1 }}>
                            <View style={{ padding: 16, paddingBottom: 0 }}>
                                <Text style={styles.sectionTitle}>Select Class</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classScroll}>
                                    {classes.map((cls) => {
                                        const isMarked = classesMarked.includes(cls._id);
                                        return (
                                            <TouchableOpacity
                                                key={cls._id}
                                                style={[
                                                    styles.classChip,
                                                    selectedClass?._id === cls._id && { backgroundColor: colors.primary, borderColor: colors.primary },
                                                    isMarked && selectedClass?._id !== cls._id && { borderColor: colors.success, backgroundColor: colors.success + '10' }
                                                ]}
                                                onPress={() => setSelectedClass(cls)}
                                            >
                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    {isMarked && (
                                                        <MaterialIcons
                                                            name="check-circle"
                                                            size={16}
                                                            color={selectedClass?._id === cls._id ? '#fff' : colors.success}
                                                            style={{ marginRight: 6 }}
                                                        />
                                                    )}
                                                    <Text style={[styles.classChipText, selectedClass?._id === cls._id && styles.activeClassChipText, isMarked && selectedClass?._id !== cls._id && { color: colors.success }]}>
                                                        {formatClassName(cls.name, cls.section)}
                                                    </Text>
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </View>

                            {selectedClass && (
                                <>
                                {isHoliday ? (
                                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
                                        <MaterialIcons name="event-busy" size={48} color={colors.textSecondary} />
                                        <Text style={{ color: colors.textSecondary, fontSize: 16, marginTop: 12 }}>Attendance cannot be marked on holidays.</Text>
                                    </View>
                                ) : (
                                    <>
                                        <FlatList
                                            style={{ flex: 1 }}
                                            data={localStudentAttendance}
                                            keyExtractor={(item) => item.student._id}
                                        renderItem={({ item, index }) => {
                                            const statusColor = item.status ? getStatusColor(item.status) : null;
                                            const borderColor = item.onLeave ? '#FF9800' : statusColor;
                                            return (
                                                <Pressable
                                                    onPress={() => {
                                                        const newStatus = item.status === 'present' ? 'absent' : 'present';
                                                        handleStudentStatusChange(index, newStatus);
                                                    }}
                                                    style={({ pressed }) => ({
                                                        backgroundColor: colors.cardBackground,
                                                        borderRadius: 12,
                                                        padding: 12,
                                                        marginBottom: 8,
                                                        elevation: 1,
                                                        opacity: pressed ? 0.85 : 1,
                                                        ...(borderColor && { borderLeftWidth: 4, borderLeftColor: borderColor }),
                                                    })}
                                                >
                                                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                                                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                            <Text style={{ fontSize: 15, fontFamily: "DMSans-SemiBold", color: colors.textPrimary }}>
                                                                {index + 1}. {item.student.name}
                                                            </Text>
                                                            {item.onLeave && (
                                                                <View style={{ backgroundColor: '#FF9800' + '20', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 }}>
                                                                    <Text style={{ fontSize: 10, fontFamily: "DMSans-Bold", color: '#FF9800' }}>ON LEAVE</Text>
                                                                </View>
                                                            )}
                                                        </View>
                                                        {item.status ? (
                                                            <View style={{ backgroundColor: getStatusColor(item.status) + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                                <MaterialIcons name={getStatusIcon(item.status)} size={16} color={getStatusColor(item.status)} />
                                                                <Text style={{ fontSize: 12, fontFamily: "DMSans-Bold", color: getStatusColor(item.status), textTransform: 'capitalize' }}>{item.status}</Text>
                                                            </View>
                                                        ) : (
                                                            <Text style={{ fontSize: 12, fontFamily: "DMSans-Medium", color: colors.textSecondary }}>Tap to mark</Text>
                                                        )}
                                                    </View>
                                                    {item.onLeave && item.leaveReason && (
                                                        <Text style={{ fontSize: 11, color: '#FF9800', marginTop: 4, fontFamily: "DMSans-Medium" }}>Reason: {item.leaveReason}</Text>
                                                    )}
                                                    {item.status && (
                                                        <View style={{ flexDirection: "row", gap: 6, marginTop: 8 }}>
                                                            {['present', 'absent', 'late', 'excused'].map((status) => (
                                                                <TouchableOpacity key={status} onPress={() => handleStudentStatusChange(index, status)} activeOpacity={0.7}
                                                                    style={{ flex: 1, backgroundColor: item.status === status ? getStatusColor(status) + '20' : 'transparent', borderWidth: item.status === status ? 1.5 : 1, borderColor: item.status === status ? getStatusColor(status) : colors.textSecondary + '20', borderRadius: 6, paddingVertical: 6, alignItems: 'center' }}>
                                                                    <Text style={{ fontSize: 10, fontFamily: "DMSans-Bold", color: item.status === status ? getStatusColor(status) : colors.textSecondary + '80' }}>
                                                                        {status === 'present' ? 'P' : status === 'absent' ? 'A' : status === 'late' ? 'L' : 'E'}
                                                                    </Text>
                                                                </TouchableOpacity>
                                                            ))}
                                                        </View>
                                                    )}
                                                </Pressable>
                                            );
                                        }}
                                        ListEmptyComponent={<Text style={styles.emptyText}>No students found.</Text>}
                                        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 160 }}
                                    />
                                    {/* Sticky Bottom Action Bar */}
                                    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.cardBackground, borderTopWidth: 1, borderTopColor: colors.textSecondary + '15', paddingHorizontal: 16, paddingVertical: 10, paddingBottom: 20, elevation: 10 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 10 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success }} />
                                                <Text style={{ fontSize: 13, fontFamily: 'DMSans-Bold', color: colors.success }}>{localStudentAttendance.filter(s => s.status === 'present').length} P</Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.error }} />
                                                <Text style={{ fontSize: 13, fontFamily: 'DMSans-Bold', color: colors.error }}>{localStudentAttendance.filter(s => s.status === 'absent').length} A</Text>
                                            </View>
                                            <Text style={{ fontSize: 13, fontFamily: 'DMSans-Bold', color: colors.textSecondary }}>/ {localStudentAttendance.length}</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', gap: 10 }}>
                                            <TouchableOpacity onPress={markAllStudentsPresent} style={{ flex: 1, backgroundColor: colors.success + '15', borderWidth: 1.5, borderColor: colors.success, borderRadius: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                                <MaterialIcons name="check-circle" size={20} color={colors.success} />
                                                <Text style={{ fontSize: 14, fontFamily: 'DMSans-Bold', color: colors.success }}>All Present</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={saveStudentAttendance} disabled={saveStudentAttendanceMutation.isPending} style={{ flex: 1.5, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: saveStudentAttendanceMutation.isPending ? 0.7 : 1, elevation: 3 }}>
                                                {saveStudentAttendanceMutation.isPending ? <ActivityIndicator size="small" color="#fff" /> : (<><MaterialIcons name="save" size={20} color="#fff" /><Text style={{ fontSize: 14, fontFamily: 'DMSans-Bold', color: '#fff' }}>Save</Text></>)}
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                    </>
                                )}
                                </>
                            )}
                        </View>
                    )}

                    {activeTab === 'staff' && (
                        <View style={{ flex: 1 }}>
                            {isHoliday ? (
                                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
                                    <MaterialIcons name="event-busy" size={48} color={colors.textSecondary} />
                                    <Text style={{ color: colors.textSecondary, fontSize: 16, marginTop: 12 }}>Attendance cannot be marked on holidays.</Text>
                                </View>
                            ) : (
                                <>
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
                                </>
                            )}
                        </View>
                    )}

                    {activeTab === 'tracker' && (
                        <View style={{ flex: 1, padding: 16 }}>
                            <Text style={styles.sectionTitle}>Missing Attendance Tracker</Text>
                            <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 16, fontFamily: 'DMSans-Regular' }}>
                                Shows days where classes missed marking attendance.
                            </Text>
                            <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={{ paddingBottom: 100 }}>
                                {trackerData.length === 0 ? (
                                    <EmptyState title="No Tracking Data" message="There is no attendance tracking data for the selected period." icon="event-busy" />
                                ) : (
                                    <>
                                        {trackerData.slice(0, trackerVisible).map((item) => (
                                            <View key={item.date} style={{
                                                backgroundColor: colors.cardBackground,
                                                borderRadius: 12,
                                                padding: 16,
                                                marginBottom: 12,
                                                elevation: 1,
                                                borderLeftWidth: 4,
                                                borderLeftColor: item.missingCount > 0 ? colors.error : colors.success
                                            }}>
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                    <Text style={{ fontSize: 16, fontFamily: 'DMSans-Bold', color: colors.textPrimary }}>
                                                        {new Date(item.date).toDateString()}
                                                    </Text>
                                                    <View style={{ backgroundColor: item.missingCount > 0 ? colors.error + '20' : colors.success + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                                                        <Text style={{ fontSize: 12, fontFamily: 'DMSans-Bold', color: item.missingCount > 0 ? colors.error : colors.success }}>
                                                            {item.missingCount > 0 ? `${item.missingCount} Missing` : 'Complete'}
                                                        </Text>
                                                    </View>
                                                </View>
                                                {item.missingCount > 0 ? (
                                                    <View>
                                                        <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 4, fontFamily: 'DMSans-Medium' }}>
                                                            Classes that missed attendance:
                                                        </Text>
                                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                                            {item.missingClasses.map((cls, idx) => (
                                                                <Text key={idx} style={{
                                                                    fontSize: 12,
                                                                    backgroundColor: colors.surfaceContainer,
                                                                    paddingHorizontal: 8,
                                                                    paddingVertical: 4,
                                                                    borderRadius: 4,
                                                                    color: colors.textPrimary
                                                                }}>
                                                                    {formatClassName(cls.name, cls.section)}
                                                                </Text>
                                                            ))}
                                                        </View>
                                                    </View>
                                                ) : (
                                                    <Text style={{ fontSize: 13, color: colors.textSecondary, fontFamily: 'DMSans-Regular' }}>
                                                        All {item.totalCount} classes marked attendance on this day.
                                                    </Text>
                                                )}
                                            </View>
                                        ))}
                                        {trackerVisible < trackerData.length && (
                                            <TouchableOpacity
                                                onPress={() => setTrackerVisible(v => v + TRACKER_PAGE)}
                                                style={{ alignItems: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.primary + '50', marginTop: 4, marginBottom: 8 }}
                                            >
                                                <Text style={{ fontSize: 14, fontFamily: 'DMSans-SemiBold', color: colors.primary }}>
                                                    Show More ({trackerData.length - trackerVisible} remaining)
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </>
                                )}
                            </ScrollView>
                        </View>
                    )}

                    {activeTab === 'my_attendance' && (
                        <AttendanceView
                            attendanceHistory={allMyAttendance}
                            summary={mySummaryData}
                            loading={myAttendanceLoading}
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            onLoadMore={loadMoreMyAttendance}
                            loadingMore={myLoadingMore}
                            hasMore={myHasMore}
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
