import React, { useState,} from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, RefreshControl, ActivityIndicator, ScrollView, Switch, SectionList } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useApiQuery, useApiMutation, createApiMutationFn } from '../../hooks/useApi';
import apiConfig from '../../config/apiConfig';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../components/ToastProvider';

export default function AdminLeaves() {
    const router = useRouter();
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('requests'); // 'requests', 'my_leaves', 'daily'
    const [refreshing, setRefreshing] = useState(false);

    // Action Modal State
    const [actionModalVisible, setActionModalVisible] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [actionType, setActionType] = useState(''); // 'approved' or 'rejected'
    const [actionReason, setActionReason] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');
    const [rejectionComments, setRejectionComments] = useState('');

    // Apply Leave Modal State
    const [applyModalVisible, setApplyModalVisible] = useState(false);
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [reason, setReason] = useState('');
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [isHalfDay, setIsHalfDay] = useState(false);
    const [halfDaySlot, setHalfDaySlot] = useState('morning');

    // Fetch Requests
    const { data: requestsData, isLoading: requestsLoading, refetch: refetchRequests } = useApiQuery(
        ['adminLeaveRequests'],
        `${apiConfig.baseUrl}/leaves/pending`,
        { enabled: activeTab === 'requests' }
    );

    const requests = React.useMemo(() => {
        if (!requestsData?.data) return [];
        const data = requestsData.data;
        const studentRequests = data.filter(r => r.applicantRole === 'student');
        const teacherRequests = data.filter(r => r.applicantRole === 'teacher');
        const adminRequests = data.filter(r => r.applicantRole === 'admin');

        const sections = [];
        if (studentRequests.length > 0) sections.push({ title: 'Student Requests', data: studentRequests });
        if (teacherRequests.length > 0) sections.push({ title: 'Teacher Requests', data: teacherRequests });
        if (adminRequests.length > 0) sections.push({ title: 'Admin Requests', data: adminRequests });
        return sections;
    }, [requestsData]);

    // Fetch My Leaves
    const { data: myLeavesData, isLoading: myLeavesLoading, refetch: refetchMyLeaves } = useApiQuery(
        ['myLeaves'],
        `${apiConfig.baseUrl}/leaves/my-leaves`,
        { enabled: activeTab === 'my_leaves' }
    );
    const myLeaves = myLeavesData?.data || [];

    // Fetch Leave Balance
    const { data: balanceData, refetch: refetchBalance } = useApiQuery(
        ['leaveBalance'],
        `${apiConfig.baseUrl}/leaves/balance`,
        { enabled: activeTab === 'my_leaves' }
    );
    const leaveBalance = balanceData?.data;

    // Fetch Daily Stats
    const { data: dailyStatsData, isLoading: dailyStatsLoading, refetch: refetchDailyStats } = useApiQuery(
        ['dailyLeaveStats'],
        `${apiConfig.baseUrl}/leaves/daily-stats`,
        { enabled: activeTab === 'daily' }
    );
    const dailyStats = dailyStatsData?.data || [];

    const loading = (activeTab === 'requests' && requestsLoading) ||
        (activeTab === 'my_leaves' && myLeavesLoading) ||
        (activeTab === 'daily' && dailyStatsLoading);

    // Mutations
    const actionMutation = useApiMutation({
        mutationFn: (data) => createApiMutationFn(`${apiConfig.baseUrl}/leaves/${data.id}/action`, 'PUT')(data.body),
        onSuccess: () => {
            showToast(`Leave ${actionType} successfully`, 'success');
            setActionModalVisible(false);
            queryClient.invalidateQueries({ queryKey: ['adminLeaveRequests'] });
            queryClient.invalidateQueries({ queryKey: ['dailyLeaveStats'] }); // Status change might affect daily stats
        },
        onError: (error) => showToast(error.message || 'Error updating status', 'error')
    });

    const applyLeaveMutation = useApiMutation({
        mutationFn: createApiMutationFn(`${apiConfig.baseUrl}/leaves/apply`, 'POST'),
        onSuccess: () => {
            showToast('Leave applied successfully', 'success');
            setApplyModalVisible(false);
            setReason('');
            setIsHalfDay(false);
            queryClient.invalidateQueries({ queryKey: ['myLeaves'] });
            queryClient.invalidateQueries({ queryKey: ['leaveBalance'] });
            queryClient.invalidateQueries({ queryKey: ['adminLeaveRequests'] }); // If admin applies, it might show up in requests depending on logic, but good to invalidate
        },
        onError: (error) => showToast(error.message || 'Error applying leave', 'error')
    });



    const onRefresh = async () => {
        setRefreshing(true);
        if (activeTab === 'requests') await refetchRequests();
        else if (activeTab === 'my_leaves') {
            await Promise.all([refetchMyLeaves(), refetchBalance()]);
        } else if (activeTab === 'daily') await refetchDailyStats();
        setRefreshing(false);
    };

    // --- Action Handlers ---

    const openActionModal = (request, type) => {
        setSelectedRequest(request);
        setActionType(type);
        setActionReason('');
        setRejectionReason('');
        setRejectionComments('');
        setActionModalVisible(true);
    };

    const handleAction = () => {
        if (actionType === 'rejected' && (!rejectionReason || !rejectionComments)) {
            showToast('Rejection reason and comments are required', 'error');
            return;
        }

        actionMutation.mutate({
            id: selectedRequest._id,
            body: {
                status: actionType,
                reason: actionReason,
                rejectionReason: actionType === 'rejected' ? rejectionReason : undefined,
                rejectionComments: actionType === 'rejected' ? rejectionComments : undefined
            }
        });
    };

    // --- Apply Leave Handlers ---

    const handleApplyLeave = () => {
        if (!reason.trim()) {
            showToast('Please enter a reason', 'error');
            return;
        }

        if (!isHalfDay && endDate < startDate) {
            showToast('End date cannot be before start date', 'error');
            return;
        }

        let finalEndDate = endDate;
        if (isHalfDay) finalEndDate = startDate;

        applyLeaveMutation.mutate({
            startDate: startDate.toISOString().split('T')[0],
            endDate: finalEndDate.toISOString().split('T')[0],
            reason,
            leaveType: isHalfDay ? 'half' : 'full',
            halfDaySlot: isHalfDay ? halfDaySlot : undefined
        });
    };

    // --- Render Items ---

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved': return '#4CAF50';
            case 'rejected': return '#F44336';
            default: return '#FF9800';
        }
    };

    const renderRequestItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View>
                    <Text style={styles.studentName}>{item.applicant?.name || 'Unknown'}</Text>
                    <Text style={styles.classInfo}>
                        {item.applicantRole === 'student' ? `Class: ${item.class?.name || ''} ${item.class?.section || ''}` : (item.applicantRole || 'Unknown').toUpperCase()}
                    </Text>
                </View>
                <View style={styles.dateContainer}>
                    <Text style={styles.dateText}>
                        {formatDate(item.startDate)}
                        {item.leaveType === 'full' && item.startDate !== item.endDate && ` - ${formatDate(item.endDate)}`}
                    </Text>
                    <Text style={styles.leaveTypeBadge}>
                        {item.leaveType === 'half' ? `Half Day (${item.halfDaySlot})` : 'Full Day'}
                    </Text>
                </View>
            </View>

            <Text style={styles.reasonLabel}>Reason:</Text>
            <Text style={styles.reasonText}>{item.reason}</Text>

            <View style={styles.actionButtons}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => openActionModal(item, 'rejected')}
                >
                    <Text style={styles.actionButtonText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionButton, styles.approveButton]}
                    onPress={() => openActionModal(item, 'approved')}
                >
                    <Text style={styles.actionButtonText}>Approve</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderMyLeaveItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View>
                    <Text style={styles.dateText}>
                        {formatDate(item.startDate)}
                        {item.leaveType === 'full' && item.startDate !== item.endDate && ` - ${formatDate(item.endDate)}`}
                    </Text>
                    <Text style={styles.leaveTypeBadge}>
                        {item.leaveType === 'half' ? `Half Day (${item.halfDaySlot})` : 'Full Day'}
                    </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                </View>
            </View>
            <Text style={styles.reasonLabel}>Reason:</Text>
            <Text style={styles.reasonText}>{item.reason}</Text>
            {item.status === 'rejected' && (
                <View style={styles.rejectionBox}>
                    <Text style={styles.rejectionTitle}>Rejection Details:</Text>
                    <Text style={styles.rejectionText}><Text style={{ fontWeight: 'bold' }}>Reason:</Text> {item.rejectionReason}</Text>
                    <Text style={styles.rejectionText}><Text style={{ fontWeight: 'bold' }}>Comments:</Text> {item.rejectionComments}</Text>
                </View>
            )}
        </View>
    );

    const renderDailyItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View>
                    <Text style={styles.studentName}>{item.applicant?.name || 'Unknown'}</Text>
                    <Text style={styles.classInfo}>
                        {item.applicantRole === 'student' ? `Class: ${item.class?.name || ''} ${item.class?.section || ''}` : (item.applicantRole || 'Unknown').toUpperCase()}
                    </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: '#4CAF50' }]}>
                    <Text style={styles.statusText}>ON LEAVE</Text>
                </View>
            </View>
            <Text style={styles.dateText}>
                Until: {formatDate(item.endDate)} ({item.leaveType === 'half' ? 'Half Day' : 'Full Day'})
            </Text>
            <Text style={styles.reasonLabel}>Reason:</Text>
            <Text style={styles.reasonText}>{item.reason}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Leave Management</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
                    onPress={() => setActiveTab('requests')}
                >
                    <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>Requests</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'my_leaves' && styles.activeTab]}
                    onPress={() => setActiveTab('my_leaves')}
                >
                    <Text style={[styles.tabText, activeTab === 'my_leaves' && styles.activeTabText]}>My Leaves</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'daily' && styles.activeTab]}
                    onPress={() => setActiveTab('daily')}
                >
                    <Text style={[styles.tabText, activeTab === 'daily' && styles.activeTabText]}>Daily Stats</Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'my_leaves' && leaveBalance && (
                <View style={styles.balanceCard}>
                    <View style={styles.balanceItem}>
                        <Text style={styles.balanceLabel}>Total</Text>
                        <Text style={styles.balanceValue}>{leaveBalance.total}</Text>
                    </View>
                    <View style={styles.balanceDivider} />
                    <View style={styles.balanceItem}>
                        <Text style={styles.balanceLabel}>Used</Text>
                        <Text style={styles.balanceValue}>{leaveBalance.used}</Text>
                    </View>
                    <View style={styles.balanceDivider} />
                    <View style={styles.balanceItem}>
                        <Text style={styles.balanceLabel}>Remaining</Text>
                        <Text style={[styles.balanceValue, { color: '#4CAF50' }]}>{leaveBalance.remaining}</Text>
                    </View>
                </View>
            )}

            {loading ? (
                <ActivityIndicator size="large" color="#2F6CD4" style={styles.loader} />
            ) : (
                <>
                    {activeTab === 'requests' ? (
                        <SectionList
                            sections={requests}
                            renderItem={renderRequestItem}
                            renderSectionHeader={({ section: { title } }) => (
                                <Text style={styles.sectionHeader}>{title}</Text>
                            )}
                            keyExtractor={(item) => item._id}
                            contentContainerStyle={styles.listContent}
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                            ListEmptyComponent={<Text style={styles.emptyText}>No pending requests.</Text>}
                        />
                    ) : (
                        <FlatList
                            data={activeTab === 'my_leaves' ? myLeaves : dailyStats}
                            renderItem={activeTab === 'my_leaves' ? renderMyLeaveItem : renderDailyItem}
                            keyExtractor={(item) => item._id}
                            contentContainerStyle={styles.listContent}
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                            ListEmptyComponent={<Text style={styles.emptyText}>No records found.</Text>}
                        />
                    )}
                </>
            )}

            {activeTab === 'my_leaves' && (
                <TouchableOpacity style={styles.fab} onPress={() => setApplyModalVisible(true)}>
                    <Ionicons name="add" size={24} color="#fff" />
                    <Text style={styles.fabText}>Apply Leave</Text>
                </TouchableOpacity>
            )}

            {/* Action Modal */}
            <Modal
                visible={actionModalVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setActionModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {actionType === 'approved' ? 'Approve Leave' : 'Reject Leave'}
                        </Text>

                        {actionType === 'rejected' && (
                            <>
                                <Text style={styles.label}>Rejection Reason *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g., Exam Period, Staff Shortage"
                                    value={rejectionReason}
                                    onChangeText={setRejectionReason}
                                />
                                <Text style={styles.label}>Comments *</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="Add detailed comments..."
                                    value={rejectionComments}
                                    onChangeText={setRejectionComments}
                                    multiline
                                    numberOfLines={3}
                                />
                            </>
                        )}

                        {actionType === 'approved' && (
                            <>
                                <Text style={styles.label}>Note (Optional)</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="Add a note..."
                                    value={actionReason}
                                    onChangeText={setActionReason}
                                    multiline
                                    numberOfLines={3}
                                />
                            </>
                        )}

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.button, styles.cancelButton]}
                                onPress={() => setActionModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.button, actionType === 'approved' ? styles.approveButton : styles.rejectButton]}
                                onPress={handleAction}
                                disabled={actionMutation.isPending}
                            >
                                {actionMutation.isPending ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={styles.submitButtonText}>
                                        {actionType === 'approved' ? 'Approve' : 'Reject'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Apply Leave Modal */}
            <Modal
                visible={applyModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setApplyModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Apply for Leave</Text>
                            <TouchableOpacity onPress={() => setApplyModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Leave Type</Text>
                                <View style={styles.row}>
                                    <Text style={styles.valueText}>{isHalfDay ? 'Half Day' : 'Full Day'}</Text>
                                    <Switch
                                        value={isHalfDay}
                                        onValueChange={setIsHalfDay}
                                        trackColor={{ false: "#767577", true: "#81b0ff" }}
                                        thumbColor={isHalfDay ? "#2F6CD4" : "#f4f3f4"}
                                    />
                                </View>
                            </View>

                            {isHalfDay && (
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Slot</Text>
                                    <View style={styles.slotContainer}>
                                        <TouchableOpacity
                                            style={[styles.slotButton, halfDaySlot === 'morning' && styles.activeSlot]}
                                            onPress={() => setHalfDaySlot('morning')}
                                        >
                                            <Text style={[styles.slotText, halfDaySlot === 'morning' && styles.activeSlotText]}>Morning</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.slotButton, halfDaySlot === 'afternoon' && styles.activeSlot]}
                                            onPress={() => setHalfDaySlot('afternoon')}
                                        >
                                            <Text style={[styles.slotText, halfDaySlot === 'afternoon' && styles.activeSlotText]}>Afternoon</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Start Date</Text>
                                <TouchableOpacity
                                    style={styles.dateButton}
                                    onPress={() => setShowStartPicker(true)}
                                >
                                    <Text style={styles.dateLabelText}>{formatDate(startDate.toISOString())}</Text>
                                    <Ionicons name="calendar-outline" size={20} color="#666" />
                                </TouchableOpacity>
                                {showStartPicker && (
                                    <DateTimePicker
                                        value={startDate}
                                        mode="date"
                                        display="default"
                                        minimumDate={new Date()}
                                        onChange={(event, selectedDate) => {
                                            setShowStartPicker(false);
                                            if (selectedDate) {
                                                setStartDate(selectedDate);
                                                if (selectedDate > endDate) setEndDate(selectedDate);
                                            }
                                        }}
                                    />
                                )}
                            </View>

                            {!isHalfDay && (
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>End Date</Text>
                                    <TouchableOpacity
                                        style={styles.dateButton}
                                        onPress={() => setShowEndPicker(true)}
                                    >
                                        <Text style={styles.dateLabelText}>{formatDate(endDate.toISOString())}</Text>
                                        <Ionicons name="calendar-outline" size={20} color="#666" />
                                    </TouchableOpacity>
                                    {showEndPicker && (
                                        <DateTimePicker
                                            value={endDate}
                                            mode="date"
                                            display="default"
                                            minimumDate={startDate}
                                            onChange={(event, selectedDate) => {
                                                setShowEndPicker(false);
                                                if (selectedDate) setEndDate(selectedDate);
                                            }}
                                        />
                                    )}
                                </View>
                            )}

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Reason</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="Enter reason for leave..."
                                    value={reason}
                                    onChangeText={setReason}
                                    multiline
                                    numberOfLines={4}
                                />
                            </View>

                            <TouchableOpacity
                                style={styles.submitButton}
                                onPress={handleApplyLeave}
                                disabled={applyLeaveMutation.isPending}
                            >
                                {applyLeaveMutation.isPending ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.submitButtonText}>Submit Application</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
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
    activeTab: { borderBottomColor: '#2F6CD4' },
    tabText: { fontSize: 16, color: '#666', fontWeight: '500' },
    activeTabText: { color: '#2F6CD4', fontWeight: 'bold' },
    loader: { marginTop: 20 },
    listContent: { padding: 16, paddingBottom: 80 },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    studentName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    classInfo: { fontSize: 14, color: '#666' },
    dateContainer: { alignItems: 'flex-end' },
    dateText: { fontSize: 14, color: '#333', fontWeight: '500' },
    leaveTypeBadge: { fontSize: 12, color: '#666', marginTop: 2, fontStyle: 'italic' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    statusText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    reasonLabel: { fontSize: 14, color: '#666', marginTop: 8, marginBottom: 2 },
    reasonText: { fontSize: 14, color: '#333', marginBottom: 12 },
    actionButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 12 },
    actionButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginLeft: 12 },
    approveButton: { backgroundColor: '#4CAF50' },
    rejectButton: { backgroundColor: '#F44336' },
    actionButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
    emptyText: { textAlign: 'center', marginTop: 40, color: '#666', fontSize: 16 },
    fab: { position: 'absolute', bottom: 100, right: 20, backgroundColor: '#2F6CD4', flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 30, elevation: 4 },
    fabText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
    balanceCard: { flexDirection: 'row', backgroundColor: '#fff', margin: 16, marginBottom: 0, padding: 16, borderRadius: 12, elevation: 2, justifyContent: 'space-around' },
    balanceItem: { alignItems: 'center' },
    balanceLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
    balanceValue: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    balanceDivider: { width: 1, backgroundColor: '#eee' },
    modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 20, maxHeight: '90%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 10 },
    label: { fontSize: 14, color: '#666', marginBottom: 6, fontWeight: '500', marginTop: 10 },
    input: { backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16 },
    textArea: { height: 80, textAlignVertical: 'top' },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
    button: { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center' },
    cancelButton: { backgroundColor: '#f5f5f5', marginRight: 10 },
    cancelButtonText: { color: '#666', fontWeight: '600', fontSize: 16 },
    submitButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
    inputGroup: { marginBottom: 20 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f9f9f9', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
    valueText: { fontSize: 16, color: '#333' },
    slotContainer: { flexDirection: 'row', gap: 12 },
    slotButton: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', alignItems: 'center', backgroundColor: '#f9f9f9' },
    activeSlot: { borderColor: '#2F6CD4', backgroundColor: '#EDE7F6' },
    slotText: { color: '#666', fontWeight: '500' },
    activeSlotText: { color: '#2F6CD4', fontWeight: 'bold' },
    dateButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12 },
    dateLabelText: { fontSize: 16, color: '#333' },
    submitButton: { backgroundColor: '#2F6CD4', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, marginBottom: 20 },
    sectionHeader: { fontSize: 14, fontWeight: 'bold', color: '#666', backgroundColor: '#f5f5f5', paddingVertical: 8, paddingHorizontal: 4, marginTop: 10, textTransform: 'uppercase' },
    rejectionBox: { marginTop: 12, padding: 10, backgroundColor: '#FFEBEE', borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#F44336' },
    rejectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#D32F2F', marginBottom: 4 },
    rejectionText: { fontSize: 12, color: '#D32F2F', marginBottom: 2 },
});
