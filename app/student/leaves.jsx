import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, RefreshControl, ActivityIndicator, ScrollView, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useApiQuery, useApiMutation, createApiMutationFn } from '../../hooks/useApi';
import apiConfig from '../../config/apiConfig';
import { useToast } from '../../components/ToastProvider';
import { useQueryClient } from '@tanstack/react-query';

export default function StudentLeaves() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);

    // Form State
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [reason, setReason] = useState('');
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [isHalfDay, setIsHalfDay] = useState(false);
    const [halfDaySlot, setHalfDaySlot] = useState('morning'); // 'morning' or 'afternoon'

    // Fetch Leaves
    const { data: leavesData, isLoading: loading, refetch } = useApiQuery(
        ['studentLeaves'],
        `${apiConfig.baseUrl}/leaves/my-leaves`
    );
    const leaves = leavesData?.data || [];

    // Apply Leave Mutation
    const applyLeaveMutation = useApiMutation({
        mutationFn: createApiMutationFn(`${apiConfig.baseUrl}/leaves/apply`, 'POST'),
        onSuccess: () => {
            showToast('Leave applied successfully', 'success');
            setModalVisible(false);
            setReason('');
            setIsHalfDay(false);
            queryClient.invalidateQueries({ queryKey: ['studentLeaves'] });
        },
        onError: (error) => showToast(error.message || 'Failed to apply leave', 'error')
    });

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    const handleApplyLeave = () => {
        if (!reason.trim()) {
            showToast('Please enter a reason', 'error');
            return;
        }

        if (!isHalfDay && endDate < startDate) {
            showToast('End date cannot be before start date', 'error');
            return;
        }

        // If half day, start and end date should be same (usually)
        // But backend handles logic. For UI simplicity, if half day, we can force end date = start date
        let finalEndDate = endDate;
        if (isHalfDay) {
            finalEndDate = startDate;
        }

        applyLeaveMutation.mutate({
            startDate: startDate.toISOString().split('T')[0],
            endDate: finalEndDate.toISOString().split('T')[0],
            reason,
            leaveType: isHalfDay ? 'half' : 'full',
            halfDaySlot: isHalfDay ? halfDaySlot : undefined
        });
    };

    const formatDate = (date) => {
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved': return '#4CAF50';
            case 'rejected': return '#F44336';
            default: return '#FF9800';
        }
    };

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View>
                    <Text style={styles.dateRange}>
                        {formatDate(new Date(item.startDate))}
                        {item.leaveType === 'full' && item.startDate !== item.endDate && ` - ${formatDate(new Date(item.endDate))}`}
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
                <Text style={styles.headerTitle}>My Leaves</Text>

            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#2F6CD4" style={styles.loader} />
            ) : (
                <FlatList
                    data={leaves}
                    renderItem={renderItem}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={<Text style={styles.emptyText}>No leave history found.</Text>}
                />
            )}

            <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
                <Ionicons name="add" size={24} color="#fff" />
                <Text style={styles.fabText}>Apply Leave</Text>
            </TouchableOpacity>

            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Apply for Leave</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
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
                                    <Text style={styles.dateText}>{formatDate(startDate)}</Text>
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
                                                if (selectedDate > endDate) {
                                                    setEndDate(selectedDate);
                                                }
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
                                        <Text style={styles.dateText}>{formatDate(endDate)}</Text>
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
    fab: {
        position: 'absolute',
        bottom: 100,
        right: 20,
        backgroundColor: '#2F6CD4',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 30,
        elevation: 4,
    },
    fabText: {
        color: '#fff',
        fontWeight: 'bold',
        marginLeft: 8,
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
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    dateRange: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    leaveTypeBadge: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
        fontStyle: 'italic'
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
        marginTop: 8,
        marginBottom: 2,
    },
    reasonText: {
        fontSize: 14,
        color: '#333',
    },
    rejectionBox: {
        marginTop: 12,
        padding: 10,
        backgroundColor: '#FFEBEE',
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#F44336'
    },
    rejectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#D32F2F',
        marginBottom: 4
    },
    rejectionText: {
        fontSize: 12,
        color: '#D32F2F',
        marginBottom: 2
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
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
        fontWeight: '500',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f9f9f9',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    valueText: {
        fontSize: 16,
        color: '#333',
    },
    slotContainer: {
        flexDirection: 'row',
        gap: 12
    },
    slotButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        alignItems: 'center',
        backgroundColor: '#f9f9f9'
    },
    activeSlot: {
        borderColor: '#2F6CD4',
        backgroundColor: '#EDE7F6'
    },
    slotText: {
        color: '#666',
        fontWeight: '500'
    },
    activeSlotText: {
        color: '#2F6CD4',
        fontWeight: 'bold'
    },
    dateButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
    },
    dateText: {
        fontSize: 16,
        color: '#333',
    },
    input: {
        backgroundColor: '#f9f9f9',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    submitButton: {
        backgroundColor: '#2F6CD4',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 20,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
