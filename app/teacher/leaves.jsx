import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, RefreshControl, ActivityIndicator, ScrollView, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import apiFetch from '../../utils/apiFetch';
import apiConfig from '../../config/apiConfig';
import { useToast } from '../../components/ToastProvider';

export default function TeacherLeaves() {
    const router = useRouter();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('requests'); // 'requests' or 'my_leaves'

    // Data State
    const [requests, setRequests] = useState([]);
    const [myLeaves, setMyLeaves] = useState([]);
    const [leaveBalance, setLeaveBalance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Action Modal State
    const [actionModalVisible, setActionModalVisible] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [actionType, setActionType] = useState(''); // 'approved' or 'rejected'
    const [actionReason, setActionReason] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');
    const [rejectionComments, setRejectionComments] = useState('');
    const [submittingAction, setSubmittingAction] = useState(false);

    // Apply Leave Modal State
    const [applyModalVisible, setApplyModalVisible] = useState(false);
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [reason, setReason] = useState('');
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [isHalfDay, setIsHalfDay] = useState(false);
    const [halfDaySlot, setHalfDaySlot] = useState('morning');
    const [submittingApplication, setSubmittingApplication] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            if (activeTab === 'requests') {
                const response = await apiFetch(`${apiConfig.baseUrl}/leaves/pending`);
                const data = await response.json();
                if (data.success) setRequests(data.data);
                else showToast(data.message, 'error');
            } else {
                // Fetch My Leaves
                const leavesRes = await apiFetch(`${apiConfig.baseUrl}/leaves/my-leaves`);
                const leavesData = await leavesRes.json();
                if (leavesData.success) setMyLeaves(leavesData.data);

                // Fetch Balance
                const balanceRes = await apiFetch(`${apiConfig.baseUrl}/leaves/balance`);
                const balanceData = await balanceRes.json();
                if (balanceData.success) setLeaveBalance(balanceData.data);
            }
        } catch (error) {
            showToast('Error fetching data', 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [activeTab]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
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

    const handleAction = async () => {
        if (actionType === 'rejected' && (!rejectionReason || !rejectionComments)) {
            showToast('Rejection reason and comments are required', 'error');
            return;
        }

        setSubmittingAction(true);
        try {
            const payload = {
                status: actionType,
                reason: actionReason,
                rejectionReason: actionType === 'rejected' ? rejectionReason : undefined,
                rejectionComments: actionType === 'rejected' ? rejectionComments : undefined
            };

            const response = await apiFetch(`${apiConfig.baseUrl}/leaves/${selectedRequest._id}/action`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await response.json();

            if (data.success) {
                showToast(`Leave ${actionType} successfully`, 'success');
                setActionModalVisible(false);
                fetchData();
            } else {
                showToast(data.message, 'error');
            }
        } catch (error) {
            showToast('Error updating status', 'error');
        } finally {
            setSubmittingAction(false);
        }
    };

    // --- Apply Leave Handlers ---

    const handleApplyLeave = async () => {
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

        setSubmittingApplication(true);
        try {
            const payload = {
                startDate: startDate.toISOString().split('T')[0],
                endDate: finalEndDate.toISOString().split('T')[0],
                reason,
                leaveType: isHalfDay ? 'half' : 'full',
                halfDaySlot: isHalfDay ? halfDaySlot : undefined
            };

            const response = await apiFetch(`${apiConfig.baseUrl}/leaves/apply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await response.json();

            if (data.success) {
                showToast('Leave applied successfully', 'success');
                setApplyModalVisible(false);
                setReason('');
                setIsHalfDay(false);
                fetchData();
            } else {
                showToast(data.message, 'error');
            }
        } catch (error) {
            showToast('Error applying leave', 'error');
        } finally {
            setSubmittingApplication(false);
        }
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
                        {item.applicantRole === 'student' ? `Class: ${item.class?.name || ''} ${item.class?.section || ''}` : 'Teacher'}
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
                    <Text style={styles.statusText}>{(item.status || 'pending').toUpperCase()}</Text>
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
                <FlatList
                    data={activeTab === 'requests' ? requests : myLeaves}
                    renderItem={activeTab === 'requests' ? renderRequestItem : renderMyLeaveItem}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={<Text style={styles.emptyText}>No records found.</Text>}
                />
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
                                disabled={submittingAction}
                            >
                                {submittingAction ? (
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
                                    <Text style={styles.dateText}>{formatDate(startDate.toISOString())}</Text>
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
                                        <Text style={styles.dateText}>{formatDate(endDate.toISOString())}</Text>
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
                                disabled={submittingApplication}
                            >
                                {submittingApplication ? (
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
    dateText: { fontSize: 16, color: '#333' },
    submitButton: { backgroundColor: '#2F6CD4', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, marginBottom: 20 },
    rejectionBox: { marginTop: 12, padding: 10, backgroundColor: '#FFEBEE', borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#F44336' },
    rejectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#D32F2F', marginBottom: 4 },
    rejectionText: { fontSize: 12, color: '#D32F2F', marginBottom: 2 },
});
