import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, RefreshControl, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../utils/apiFetch';
import { useToast } from '../../components/ToastProvider';
import { Calendar } from 'react-native-calendars';

export default function StudentLeaves() {
    const router = useRouter();
    const { showToast } = useToast();
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    const [showStartCalendar, setShowStartCalendar] = useState(false);
    const [showEndCalendar, setShowEndCalendar] = useState(false);

    const fetchLeaves = useCallback(async () => {
        try {
            const response = await apiFetch('/leaves/my-leaves');
            if (response.success) {
                setLeaves(response.data);
            } else {
                showToast('Error', response.message || 'Failed to fetch leaves', 'error');
            }
        } catch (error) {
            showToast('Error', 'An error occurred while fetching leaves', 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchLeaves();
    }, [fetchLeaves]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchLeaves();
    };

    const handleApplyLeave = async () => {
        if (!startDate || !endDate || !reason) {
            showToast('Error', 'Please fill in all fields', 'error');
            return;
        }

        setSubmitting(true);
        try {
            const response = await apiFetch('/leaves/apply', {
                method: 'POST',
                body: JSON.stringify({ startDate, endDate, reason }),
            });

            if (response.success) {
                showToast('Success', 'Leave application submitted successfully', 'success');
                setModalVisible(false);
                setStartDate('');
                setEndDate('');
                setReason('');
                fetchLeaves();
            } else {
                showToast('Error', response.message || 'Failed to apply for leave', 'error');
            }
        } catch (error) {
            showToast('Error', 'An error occurred', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved': return '#4CAF50';
            case 'rejected': return '#F44336';
            default: return '#FF9800';
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB'); // dd/mm/yyyy
    };

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.dateRange}>
                    {formatDate(item.startDate)} - {formatDate(item.endDate)}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                </View>
            </View>
            <Text style={styles.reasonLabel}>Reason:</Text>
            <Text style={styles.reasonText}>{item.reason}</Text>

            {item.status !== 'pending' && (
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

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Leaves</Text>
                <View style={{ width: 24 }} />
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#6200ee" style={styles.loader} />
            ) : (
                <FlatList
                    data={leaves}
                    renderItem={renderItem}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>No leave history found.</Text>
                    }
                />
            )}

            <TouchableOpacity
                style={styles.fab}
                onPress={() => setModalVisible(true)}
            >
                <Ionicons name="add" size={30} color="#fff" />
            </TouchableOpacity>

            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Apply for Leave</Text>

                        <Text style={styles.label}>Start Date</Text>
                        <TouchableOpacity
                            style={styles.dateInput}
                            onPress={() => {
                                setShowStartCalendar(!showStartCalendar);
                                setShowEndCalendar(false);
                            }}
                        >
                            <Text>{startDate || 'Select Start Date'}</Text>
                            <Ionicons name="calendar-outline" size={20} color="#666" />
                        </TouchableOpacity>

                        {showStartCalendar && (
                            <Calendar
                                onDayPress={day => {
                                    setStartDate(day.dateString);
                                    setShowStartCalendar(false);
                                }}
                                markedDates={{
                                    [startDate]: { selected: true, selectedColor: '#6200ee' }
                                }}
                                theme={{
                                    todayTextColor: '#6200ee',
                                    arrowColor: '#6200ee',
                                }}
                            />
                        )}

                        <Text style={styles.label}>End Date</Text>
                        <TouchableOpacity
                            style={styles.dateInput}
                            onPress={() => {
                                setShowEndCalendar(!showEndCalendar);
                                setShowStartCalendar(false);
                            }}
                        >
                            <Text>{endDate || 'Select End Date'}</Text>
                            <Ionicons name="calendar-outline" size={20} color="#666" />
                        </TouchableOpacity>

                        {showEndCalendar && (
                            <Calendar
                                onDayPress={day => {
                                    setEndDate(day.dateString);
                                    setShowEndCalendar(false);
                                }}
                                markedDates={{
                                    [endDate]: { selected: true, selectedColor: '#6200ee' }
                                }}
                                theme={{
                                    todayTextColor: '#6200ee',
                                    arrowColor: '#6200ee',
                                }}
                            />
                        )}

                        <Text style={styles.label}>Reason</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Reason for leave"
                            value={reason}
                            onChangeText={setReason}
                            multiline
                            numberOfLines={3}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.button, styles.cancelButton]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.button, styles.submitButton]}
                                onPress={handleApplyLeave}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={styles.submitButtonText}>Submit</Text>
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
    loader: {
        marginTop: 20,
    },
    listContent: {
        padding: 16,
        paddingBottom: 80,
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
        alignItems: 'center',
        marginBottom: 8,
    },
    dateRange: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
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
    },
    reasonText: {
        fontSize: 14,
        color: '#333',
        marginBottom: 8,
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
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        backgroundColor: '#6200ee',
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
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
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#333',
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
        marginBottom: 16,
    },
    dateInput: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
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
    submitButton: {
        backgroundColor: '#6200ee',
        marginLeft: 10,
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
