import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, RefreshControl, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../utils/apiFetch';
import { useToast } from '../../components/ToastProvider';

export default function AdminLeaves() {
    const router = useRouter();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('requests'); // 'requests' or 'daily'
    const [leaves, setLeaves] = useState([]);
    const [dailyStats, setDailyStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Action Modal State
    const [actionModalVisible, setActionModalVisible] = useState(false);
    const [selectedLeave, setSelectedLeave] = useState(null);
    const [actionType, setActionType] = useState(''); // 'approved' or 'rejected'
    const [actionReason, setActionReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchLeaves = useCallback(async () => {
        try {
            const response = await apiFetch('/leaves/class-leaves'); // Admin gets all leaves if no classId provided
            if (response.success) {
                setLeaves(response.data);
            } else {
                showToast(response.message || 'Failed to fetch leaves', 'error');
            }
        } catch (error) {
            showToast('An error occurred while fetching leaves', 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const fetchDailyStats = useCallback(async () => {
        try {
            const response = await apiFetch('/leaves/daily-stats');
            if (response.success) {
                setDailyStats(response.data);
            } else {
                showToast(response.message || 'Failed to fetch daily stats', 'error');
            }
        } catch (error) {
            showToast('An error occurred while fetching stats', 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'requests') {
            fetchLeaves();
        } else {
            fetchDailyStats();
        }
    }, [activeTab, fetchLeaves, fetchDailyStats]);

    const onRefresh = () => {
        setRefreshing(true);
        if (activeTab === 'requests') {
            fetchLeaves();
        } else {
            fetchDailyStats();
        }
    };

    const openActionModal = (leave, type) => {
        setSelectedLeave(leave);
        setActionType(type);
        setActionReason('');
        setActionModalVisible(true);
    };

    const handleAction = async () => {
        if (!selectedLeave) return;

        setSubmitting(true);
        try {
            const response = await apiFetch(`/leaves/${selectedLeave._id}/action`, {
                method: 'PUT',
                body: JSON.stringify({ status: actionType, reason: actionReason }),
            });

            if (response.success) {
                showToast(`Leave request ${actionType}`, 'success');
                setActionModalVisible(false);
                fetchLeaves(); // Refresh list
            } else {
                showToast(response.message || 'Failed to update leave status', 'error');
            }
        } catch (error) {
            showToast('An error occurred', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB');
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
                    <Text style={styles.studentName}>{item.student?.name || 'Unknown Student'}</Text>
                    <Text style={styles.classInfo}>
                        Class: {item.class?.name} {item.class?.section}
                    </Text>
                    <Text style={styles.dateRange}>
                        {formatDate(item.startDate)} - {formatDate(item.endDate)}
                    </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                </View>
            </View>

            <Text style={styles.reasonLabel}>Reason:</Text>
            <Text style={styles.reasonText}>{item.reason}</Text>

            {item.status === 'pending' ? (
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
            ) : (
                <View style={styles.actionInfo}>
                    <Text style={styles.actionText}>
                        {item.status === 'approved' ? 'Approved' : 'Rejected'} by Teacher/Admin
                    </Text>
                    {item.actionReason && (
                        <Text style={styles.actionReason}>Note: {item.actionReason}</Text>
                    )}
                </View>
            )}
        </View>
    );

    const renderDailyItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View>
                    <Text style={styles.studentName}>{item.student?.name || 'Unknown Student'}</Text>
                    <Text style={styles.classInfo}>
                        Class: {item.class?.name} {item.class?.section}
                    </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: '#4CAF50' }]}>
                    <Text style={styles.statusText}>ON LEAVE</Text>
                </View>
            </View>
            <Text style={styles.dateRange}>
                Until: {formatDate(item.endDate)}
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
                    <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
                        All Requests
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'daily' && styles.activeTab]}
                    onPress={() => setActiveTab('daily')}
                >
                    <Text style={[styles.tabText, activeTab === 'daily' && styles.activeTabText]}>
                        On Leave Today
                    </Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#6200ee" style={styles.loader} />
            ) : (
                <FlatList
                    data={activeTab === 'requests' ? leaves : dailyStats}
                    renderItem={activeTab === 'requests' ? renderRequestItem : renderDailyItem}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>
                            {activeTab === 'requests' ? 'No leave requests found.' : 'No students on leave today.'}
                        </Text>
                    }
                />
            )}

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
                        <Text style={styles.modalSubtitle}>
                            Are you sure you want to {actionType} this request?
                        </Text>

                        <Text style={styles.label}>Reason (Optional)</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Add a note..."
                            value={actionReason}
                            onChangeText={setActionReason}
                            multiline
                            numberOfLines={3}
                        />

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
                                disabled={submitting}
                            >
                                {submitting ? (
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#fff',
        elevation: 2,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    backButton: {
        padding: 4,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: '#6200ee',
    },
    tabText: {
        fontSize: 16,
        color: '#666',
        fontWeight: '500',
    },
    activeTabText: {
        color: '#6200ee',
        fontWeight: 'bold',
    },
    loader: {
        marginTop: 20,
    },
    listContent: {
        padding: 16,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    studentName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 2,
    },
    classInfo: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    dateRange: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    reasonLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
        marginTop: 8,
    },
    reasonText: {
        fontSize: 14,
        color: '#333',
        marginBottom: 12,
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 12,
    },
    actionButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginLeft: 12,
    },
    approveButton: {
        backgroundColor: '#4CAF50',
    },
    rejectButton: {
        backgroundColor: '#F44336',
    },
    actionButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    actionInfo: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    actionText: {
        fontSize: 12,
        color: '#666',
        fontStyle: 'italic',
    },
    actionReason: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 40,
        color: '#666',
        fontSize: 16,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
        color: '#333',
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        color: '#666',
        marginBottom: 6,
        fontWeight: '500',
    },
    input: {
        backgroundColor: '#f9f9f9',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 20,
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    button: {
        flex: 1,
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#f5f5f5',
        marginRight: 10,
    },
    cancelButtonText: {
        color: '#666',
        fontWeight: '600',
        fontSize: 16,
    },
    submitButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
});
