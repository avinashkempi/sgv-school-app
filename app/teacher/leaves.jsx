import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, RefreshControl, ActivityIndicator, ScrollView, Switch, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useApiQuery, useApiMutation, createApiMutationFn } from '../../hooks/useApi';
import { useQueryClient } from '@tanstack/react-query';
import apiConfig from '../../config/apiConfig';
import { useToast } from '../../components/ToastProvider';
import { useTheme } from '../../theme';
import Header from '../../components/Header';

export default function TeacherLeaves() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const { colors, styles } = useTheme();
    const [activeTab, setActiveTab] = useState('requests'); // 'requests' or 'my_leaves'

    // Data State
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

    // Fetch Pending Requests
    const { data: requestsData, isLoading: requestsLoading, refetch: refetchRequests } = useApiQuery(
        ['teacherLeaveRequests'],
        `${apiConfig.baseUrl}/leaves/pending`,
        { enabled: activeTab === 'requests' }
    );
    const requests = requestsData?.data || [];

    // Fetch My Leaves
    const { data: myLeavesData, isLoading: myLeavesLoading, refetch: refetchMyLeaves } = useApiQuery(
        ['teacherMyLeaves'],
        `${apiConfig.baseUrl}/leaves/my-leaves`,
        { enabled: activeTab === 'my_leaves' }
    );
    const myLeaves = myLeavesData?.data || [];

    // Fetch Leave Balance
    const { data: balanceData, isLoading: balanceLoading, refetch: refetchBalance } = useApiQuery(
        ['teacherLeaveBalance'],
        `${apiConfig.baseUrl}/leaves/balance`,
        { enabled: activeTab === 'my_leaves' }
    );
    const leaveBalance = balanceData?.data || null;

    const loading = activeTab === 'requests' ? requestsLoading : (myLeavesLoading || balanceLoading);

    const onRefresh = async () => {
        setRefreshing(true);
        if (activeTab === 'requests') {
            await refetchRequests();
        } else {
            await Promise.all([refetchMyLeaves(), refetchBalance()]);
        }
        setRefreshing(false);
    };

    // Mutations
    const actionMutation = useApiMutation({
        mutationFn: async ({ requestId, payload }) => {
            return createApiMutationFn(`${apiConfig.baseUrl}/leaves/${requestId}/action`, 'PUT')(payload);
        },
        onSuccess: (_data) => {
            showToast(`Leave ${actionType} successfully`, 'success');
            setActionModalVisible(false);
            queryClient.invalidateQueries({ queryKey: ['teacherLeaveRequests'] });
        },
        onError: (error) => showToast(error.message || 'Error updating status', 'error')
    });

    const applyLeaveMutation = useApiMutation({
        mutationFn: createApiMutationFn(`${apiConfig.baseUrl}/leaves/apply`, 'POST'),
        onSuccess: (_data) => {
            showToast('Leave applied successfully', 'success');
            setApplyModalVisible(false);
            setReason('');
            setIsHalfDay(false);
            queryClient.invalidateQueries({ queryKey: ['teacherMyLeaves'] });
            queryClient.invalidateQueries({ queryKey: ['teacherLeaveBalance'] });
        },
        onError: (error) => showToast(error.message || 'Error applying leave', 'error')
    });

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

        const payload = {
            status: actionType,
            reason: actionReason,
            rejectionReason: actionType === 'rejected' ? rejectionReason : undefined,
            rejectionComments: actionType === 'rejected' ? rejectionComments : undefined
        };

        actionMutation.mutate({ requestId: selectedRequest._id, payload });
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

        const payload = {
            startDate: startDate.toISOString().split('T')[0],
            endDate: finalEndDate.toISOString().split('T')[0],
            reason,
            leaveType: isHalfDay ? 'half' : 'full',
            halfDaySlot: isHalfDay ? halfDaySlot : undefined
        };

        applyLeaveMutation.mutate(payload);
    };

    // --- Render Items ---

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved': return colors.success;
            case 'rejected': return colors.error;
            default: return '#FF9800';
        }
    };

    const renderRequestItem = ({ item }) => (
        <View style={{
            backgroundColor: colors.surfaceContainer,
            borderRadius: 16,
            padding: 16,
            marginBottom: 12,
        }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <View>
                    <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: colors.onSurface }}>
                        {item.applicant?.name || 'Unknown'}
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.onSurfaceVariant, fontFamily: "DMSans-Medium" }}>
                        {item.applicantRole === 'student' ? `Class: ${item.class?.name || ''} ${item.class?.section || ''}` : 'Teacher'}
                    </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialIcons name="date-range" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                        <Text style={{ fontSize: 14, color: colors.onSurface, fontFamily: "DMSans-Medium" }}>
                            {formatDate(item.startDate)}
                            {item.leaveType === 'full' && item.startDate !== item.endDate && ` - ${formatDate(item.endDate)}`}
                        </Text>
                    </View>
                    <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2, fontStyle: 'italic' }}>
                        {item.leaveType === 'half' ? `Half Day (${item.halfDaySlot})` : 'Full Day'}
                    </Text>
                </View>
            </View>

            <View style={{ backgroundColor: colors.surface, padding: 12, borderRadius: 8, marginBottom: 12 }}>
                <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 4, fontFamily: "DMSans-Medium" }}>Reason</Text>
                <Text style={{ fontSize: 14, color: colors.onSurface, fontFamily: "DMSans-Regular", lineHeight: 20 }}>{item.reason}</Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, paddingTop: 4 }}>
                <TouchableOpacity
                    style={{
                        paddingVertical: 8,
                        paddingHorizontal: 16,
                        borderRadius: 8,
                        backgroundColor: colors.errorContainer,
                        borderWidth: 1,
                        borderColor: colors.error
                    }}
                    onPress={() => openActionModal(item, 'rejected')}
                >
                    <Text style={{ color: colors.error, fontFamily: "DMSans-Bold", fontSize: 14 }}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={{
                        paddingVertical: 8,
                        paddingHorizontal: 16,
                        borderRadius: 8,
                        backgroundColor: colors.primary,
                        elevation: 1
                    }}
                    onPress={() => openActionModal(item, 'approved')}
                >
                    <Text style={{ color: colors.onPrimary, fontFamily: "DMSans-Bold", fontSize: 14 }}>Approve</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderMyLeaveItem = ({ item }) => {
        const isRejected = item.status === 'rejected';
        const start = new Date(item.startDate);
        const end = new Date(item.endDate);

        return (
            <View style={{
                backgroundColor: colors.surfaceContainer,
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
            }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <MaterialIcons name="date-range" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                            <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: colors.onSurface }}>
                                {formatDate(item.startDate)}
                                {item.leaveType === 'full' && item.startDate !== item.endDate && ` - ${formatDate(item.endDate)}`}
                            </Text>
                        </View>
                        <Text style={{ fontSize: 13, color: colors.onSurfaceVariant, fontFamily: "DMSans-Medium" }}>
                            {item.leaveType === 'half' ? `Half Day (${item.halfDaySlot})` : 'Full Day'}
                        </Text>
                    </View>
                    <View style={{
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 8,
                        backgroundColor: getStatusColor(item.status) + '15',
                        borderWidth: 1,
                        borderColor: getStatusColor(item.status) + '30'
                    }}>
                        <Text style={{ color: getStatusColor(item.status), fontSize: 12, fontFamily: "DMSans-Bold", textTransform: 'uppercase' }}>
                            {(item.status || 'pending')}
                        </Text>
                    </View>
                </View>

                <View style={{ backgroundColor: colors.surface, padding: 12, borderRadius: 8, marginBottom: isRejected ? 12 : 0 }}>
                    <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 4, fontFamily: "DMSans-Medium" }}>Reason</Text>
                    <Text style={{ fontSize: 14, color: colors.onSurface, fontFamily: "DMSans-Regular", lineHeight: 20 }}>{item.reason}</Text>
                </View>

                {isRejected && (
                    <View style={{
                        marginTop: 0,
                        padding: 12,
                        backgroundColor: colors.errorContainer + '40',
                        borderRadius: 8,
                        borderLeftWidth: 3,
                        borderLeftColor: colors.error
                    }}>
                        <Text style={{ fontSize: 13, fontFamily: "DMSans-Bold", color: colors.error, marginBottom: 4 }}>Rejection Details</Text>
                        <Text style={{ fontSize: 13, color: colors.onSurface, marginBottom: 2, fontFamily: "DMSans-Regular" }}>
                            <Text style={{ fontFamily: "DMSans-Bold" }}>Reason: </Text>{item.rejectionReason}
                        </Text>
                        <Text style={{ fontSize: 13, color: colors.onSurface, fontFamily: "DMSans-Regular" }}>
                            <Text style={{ fontFamily: "DMSans-Bold" }}>Note: </Text>{item.rejectionComments}
                        </Text>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{ padding: 16, paddingBottom: 0 }}>
                <Header title="Leave Management" showBack={true} />
            </View>

            <View style={{ flexDirection: 'row', marginHorizontal: 16, marginBottom: 16, backgroundColor: colors.surfaceContainer, borderRadius: 12, padding: 4 }}>
                <TouchableOpacity
                    style={{
                        flex: 1,
                        paddingVertical: 10,
                        alignItems: 'center',
                        borderRadius: 8,
                        backgroundColor: activeTab === 'requests' ? colors.background : 'transparent',
                        elevation: activeTab === 'requests' ? 2 : 0,
                        shadowColor: "#000",
                        shadowOpacity: activeTab === 'requests' ? 0.05 : 0,
                    }}
                    onPress={() => setActiveTab('requests')}
                >
                    <Text style={{
                        fontFamily: activeTab === 'requests' ? "DMSans-Bold" : "DMSans-Medium",
                        color: activeTab === 'requests' ? colors.primary : colors.onSurfaceVariant
                    }}>Requests</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={{
                        flex: 1,
                        paddingVertical: 10,
                        alignItems: 'center',
                        borderRadius: 8,
                        backgroundColor: activeTab === 'my_leaves' ? colors.background : 'transparent',
                        elevation: activeTab === 'my_leaves' ? 2 : 0,
                        shadowColor: "#000",
                        shadowOpacity: activeTab === 'my_leaves' ? 0.05 : 0,
                    }}
                    onPress={() => setActiveTab('my_leaves')}
                >
                    <Text style={{
                        fontFamily: activeTab === 'my_leaves' ? "DMSans-Bold" : "DMSans-Medium",
                        color: activeTab === 'my_leaves' ? colors.primary : colors.onSurfaceVariant
                    }}>My Leaves</Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'my_leaves' && leaveBalance && (
                <View style={{
                    marginHorizontal: 16,
                    marginBottom: 16,
                    backgroundColor: colors.primaryContainer,
                    borderRadius: 16,
                    padding: 16,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <View style={{ alignItems: 'center', flex: 1 }}>
                        <Text style={{ fontSize: 12, color: colors.onPrimaryContainer, fontFamily: "DMSans-Medium", marginBottom: 4 }}>Total</Text>
                        <Text style={{ fontSize: 20, color: colors.onPrimaryContainer, fontFamily: "DMSans-Bold" }}>{leaveBalance.total}</Text>
                    </View>
                    <View style={{ width: 1, height: 24, backgroundColor: colors.onPrimaryContainer, opacity: 0.2 }} />
                    <View style={{ alignItems: 'center', flex: 1 }}>
                        <Text style={{ fontSize: 12, color: colors.onPrimaryContainer, fontFamily: "DMSans-Medium", marginBottom: 4 }}>Used</Text>
                        <Text style={{ fontSize: 20, color: colors.onPrimaryContainer, fontFamily: "DMSans-Bold" }}>{leaveBalance.used}</Text>
                    </View>
                    <View style={{ width: 1, height: 24, backgroundColor: colors.onPrimaryContainer, opacity: 0.2 }} />
                    <View style={{ alignItems: 'center', flex: 1 }}>
                        <Text style={{ fontSize: 12, color: colors.onPrimaryContainer, fontFamily: "DMSans-Medium", marginBottom: 4 }}>Remaining</Text>
                        <Text style={{ fontSize: 20, color: colors.primary, fontFamily: "DMSans-Bold" }}>{leaveBalance.remaining}</Text>
                    </View>
                </View>
            )}

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={activeTab === 'requests' ? requests : myLeaves}
                    renderItem={activeTab === 'requests' ? renderRequestItem : renderMyLeaveItem}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', marginTop: 40, opacity: 0.6 }}>
                            <MaterialIcons name="event-busy" size={64} color={colors.onSurfaceVariant} />
                            <Text style={{ marginTop: 16, fontSize: 16, color: colors.onSurfaceVariant, fontFamily: "DMSans-Medium" }}>No records found.</Text>
                        </View>
                    }
                />
            )}

            {activeTab === 'my_leaves' && (
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => setApplyModalVisible(true)}
                    activeOpacity={0.8}
                >
                    <Ionicons name="add" size={28} color={colors.onPrimaryContainer} />
                </TouchableOpacity>
            )}

            {/* Action Modal */}
            <Modal
                visible={actionModalVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setActionModalVisible(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
                    <View style={{ backgroundColor: colors.surface, borderRadius: 24, padding: 24, elevation: 5 }}>
                        <Text style={{ fontSize: 20, fontFamily: "DMSans-Bold", color: colors.onSurface, marginBottom: 20 }}>
                            {actionType === 'approved' ? 'Approve Leave' : 'Reject Leave'}
                        </Text>

                        {actionType === 'rejected' && (
                            <>
                                <Text style={styles.label}>Rejection Reason *</Text>
                                <TextInput
                                    style={{
                                        borderWidth: 1, borderColor: colors.outline, borderRadius: 8, padding: 12,
                                        color: colors.onSurface, fontFamily: "DMSans-Regular", marginBottom: 16
                                    }}
                                    placeholder="e.g., Exam Period, Staff Shortage"
                                    placeholderTextColor={colors.onSurfaceVariant}
                                    value={rejectionReason}
                                    onChangeText={setRejectionReason}
                                />
                                <Text style={styles.label}>Comments *</Text>
                                <TextInput
                                    style={{
                                        borderWidth: 1, borderColor: colors.outline, borderRadius: 8, padding: 12,
                                        color: colors.onSurface, fontFamily: "DMSans-Regular", minHeight: 80, textAlignVertical: 'top'
                                    }}
                                    placeholder="Add detailed comments..."
                                    placeholderTextColor={colors.onSurfaceVariant}
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
                                    style={{
                                        borderWidth: 1, borderColor: colors.outline, borderRadius: 8, padding: 12,
                                        color: colors.onSurface, fontFamily: "DMSans-Regular", minHeight: 80, textAlignVertical: 'top'
                                    }}
                                    placeholder="Add a note..."
                                    placeholderTextColor={colors.onSurfaceVariant}
                                    value={actionReason}
                                    onChangeText={setActionReason}
                                    multiline
                                    numberOfLines={3}
                                />
                            </>
                        )}

                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                            <TouchableOpacity
                                style={{ paddingVertical: 10, paddingHorizontal: 20 }}
                                onPress={() => setActionModalVisible(false)}
                            >
                                <Text style={{ color: colors.onSurfaceVariant, fontFamily: "DMSans-Bold", fontSize: 16 }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{
                                    backgroundColor: actionType === 'approved' ? colors.primary : colors.error,
                                    paddingVertical: 10, paddingHorizontal: 24, borderRadius: 100
                                }}
                                onPress={handleAction}
                                disabled={actionMutation.isPending}
                            >
                                {actionMutation.isPending ? (
                                    <ActivityIndicator color={colors.onPrimary} size="small" />
                                ) : (
                                    <Text style={{ color: colors.onPrimary, fontFamily: "DMSans-Bold", fontSize: 16 }}>
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
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '90%' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <Text style={{ fontSize: 24, fontFamily: "DMSans-Bold", color: colors.onSurface }}>Apply for Leave</Text>
                            <TouchableOpacity onPress={() => setApplyModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.onSurfaceVariant} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={{ marginBottom: 24 }}>
                                <Text style={styles.label}>LEAVE TYPE</Text>
                                <View style={{ flexDirection: 'row', backgroundColor: colors.surfaceContainer, borderRadius: 12, padding: 4 }}>
                                    <Pressable
                                        style={{
                                            flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8,
                                            backgroundColor: !isHalfDay ? colors.background : 'transparent',
                                            elevation: !isHalfDay ? 1 : 0, shadowColor: "#000", shadowOpacity: !isHalfDay ? 0.05 : 0
                                        }}
                                        onPress={() => setIsHalfDay(false)}
                                    >
                                        <Text style={{ fontFamily: !isHalfDay ? "DMSans-Bold" : "DMSans-Medium", color: !isHalfDay ? colors.primary : colors.onSurfaceVariant }}>Full Day</Text>
                                    </Pressable>
                                    <Pressable
                                        style={{
                                            flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8,
                                            backgroundColor: isHalfDay ? colors.background : 'transparent',
                                            elevation: isHalfDay ? 1 : 0, shadowColor: "#000", shadowOpacity: isHalfDay ? 0.05 : 0
                                        }}
                                        onPress={() => setIsHalfDay(true)}
                                    >
                                        <Text style={{ fontFamily: isHalfDay ? "DMSans-Bold" : "DMSans-Medium", color: isHalfDay ? colors.primary : colors.onSurfaceVariant }}>Half Day</Text>
                                    </Pressable>
                                </View>
                            </View>

                            {isHalfDay && (
                                <View style={{ marginBottom: 24 }}>
                                    <Text style={styles.label}>SLOT</Text>
                                    <View style={{ flexDirection: 'row', gap: 12 }}>
                                        <Pressable
                                            style={{
                                                flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1,
                                                borderColor: halfDaySlot === 'morning' ? colors.primary : colors.outlineVariant,
                                                backgroundColor: halfDaySlot === 'morning' ? colors.secondaryContainer : 'transparent',
                                                alignItems: 'center'
                                            }}
                                            onPress={() => setHalfDaySlot('morning')}
                                        >
                                            <Text style={{ fontFamily: "DMSans-Medium", color: halfDaySlot === 'morning' ? colors.onSecondaryContainer : colors.onSurfaceVariant }}>Morning</Text>
                                        </Pressable>
                                        <Pressable
                                            style={{
                                                flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1,
                                                borderColor: halfDaySlot === 'afternoon' ? colors.primary : colors.outlineVariant,
                                                backgroundColor: halfDaySlot === 'afternoon' ? colors.secondaryContainer : 'transparent',
                                                alignItems: 'center'
                                            }}
                                            onPress={() => setHalfDaySlot('afternoon')}
                                        >
                                            <Text style={{ fontFamily: "DMSans-Medium", color: halfDaySlot === 'afternoon' ? colors.onSecondaryContainer : colors.onSurfaceVariant }}>Afternoon</Text>
                                        </Pressable>
                                    </View>
                                </View>
                            )}

                            <View style={{ flexDirection: 'row', gap: 16 }}>
                                <View style={{ flex: 1, marginBottom: 24 }}>
                                    <Text style={styles.label}>START DATE</Text>
                                    <TouchableOpacity
                                        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surfaceContainer, borderRadius: 12, padding: 14 }}
                                        onPress={() => setShowStartPicker(true)}
                                    >
                                        <Text style={{ fontSize: 16, color: colors.onSurface, fontFamily: "DMSans-Regular" }}>{formatDate(startDate.toISOString())}</Text>
                                        <Ionicons name="calendar-outline" size={20} color={colors.primary} />
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
                                    <View style={{ flex: 1, marginBottom: 24 }}>
                                        <Text style={styles.label}>END DATE</Text>
                                        <TouchableOpacity
                                            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surfaceContainer, borderRadius: 12, padding: 14 }}
                                            onPress={() => setShowEndPicker(true)}
                                        >
                                            <Text style={{ fontSize: 16, color: colors.onSurface, fontFamily: "DMSans-Regular" }}>{formatDate(endDate.toISOString())}</Text>
                                            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
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
                            </View>

                            <View style={{ marginBottom: 32 }}>
                                <Text style={styles.label}>REASON</Text>
                                <TextInput
                                    style={{
                                        backgroundColor: colors.surfaceContainer, borderRadius: 12, padding: 14, fontSize: 16,
                                        color: colors.onSurface, fontFamily: "DMSans-Regular", minHeight: 120, textAlignVertical: 'top'
                                    }}
                                    placeholder="Enter reason for leave..."
                                    placeholderTextColor={colors.onSurfaceVariant}
                                    value={reason}
                                    onChangeText={setReason}
                                    multiline
                                    numberOfLines={4}
                                />
                            </View>

                            <TouchableOpacity
                                style={{
                                    backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 100, alignItems: 'center',
                                    marginBottom: 32, elevation: 2, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8
                                }}
                                onPress={handleApplyLeave}
                                disabled={applyLeaveMutation.isPending}
                            >
                                {applyLeaveMutation.isPending ? (
                                    <ActivityIndicator color={colors.onPrimary} />
                                ) : (
                                    <Text style={{ color: colors.onPrimary, fontSize: 16, fontFamily: "DMSans-Bold", letterSpacing: 0.5 }}>Submit Application</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles_internal = StyleSheet.create({
    // Kept for backward compatibility if needed
    label: {
        fontSize: 12,
        color: '#666',
        marginBottom: 8,
        fontWeight: 'bold',
        letterSpacing: 0.5
    },
    fab: {
        position: 'absolute',
        bottom: 130,
        right: 20,
        backgroundColor: '#2F6CD4', // Will be overridden by inline styles
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 30,
        elevation: 4,
    },
});
