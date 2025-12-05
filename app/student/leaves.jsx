import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, RefreshControl, ActivityIndicator, ScrollView, Switch, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useApiQuery, useApiMutation, createApiMutationFn } from '../../hooks/useApi';
import apiConfig from '../../config/apiConfig';
import { useToast } from '../../components/ToastProvider';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../theme';
import Header from '../../components/Header';

export default function StudentLeaves() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const { colors, styles } = useTheme();
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
            case 'approved': return colors.success;
            case 'rejected': return colors.error;
            default: return '#FF9800'; // Warning/Pending color
        }
    };

    const renderItem = ({ item }) => {
        const statusColor = getStatusColor(item.status);
        const isRejected = item.status === 'rejected';

        return (
            <View style={{
                backgroundColor: colors.surfaceContainer,
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
            }}>
                <View style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 12,
                }}>
                    <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <MaterialIcons name="date-range" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                            <Text style={{
                                fontSize: 16,
                                fontFamily: "DMSans-Bold",
                                color: colors.onSurface,
                            }}>
                                {formatDate(new Date(item.startDate))}
                                {item.leaveType === 'full' && item.startDate !== item.endDate && ` - ${formatDate(new Date(item.endDate))}`}
                            </Text>
                        </View>
                        <Text style={{
                            fontSize: 13,
                            color: colors.onSurfaceVariant,
                            fontFamily: "DMSans-Medium",
                        }}>
                            {item.leaveType === 'half' ? `Half Day (${item.halfDaySlot})` : 'Full Day'}
                        </Text>
                    </View>
                    <View style={{
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 8,
                        backgroundColor: statusColor + '15', // 10% opacity
                        borderWidth: 1,
                        borderColor: statusColor + '30'
                    }}>
                        <Text style={{
                            color: statusColor,
                            fontSize: 12,
                            fontFamily: "DMSans-Bold",
                            textTransform: 'uppercase'
                        }}>{item.status || 'pending'}</Text>
                    </View>
                </View>

                <View style={{
                    backgroundColor: colors.surface,
                    padding: 12,
                    borderRadius: 8,
                    marginBottom: isRejected ? 12 : 0
                }}>
                    <Text style={{
                        fontSize: 12,
                        color: colors.onSurfaceVariant,
                        marginBottom: 4,
                        fontFamily: "DMSans-Medium"
                    }}>Reason</Text>
                    <Text style={{
                        fontSize: 14,
                        color: colors.onSurface,
                        fontFamily: "DMSans-Regular",
                        lineHeight: 20
                    }}>{item.reason}</Text>
                </View>

                {isRejected && (
                    <View style={{
                        marginTop: 0,
                        padding: 12,
                        backgroundColor: colors.errorContainer + '40', // Light error background
                        borderRadius: 8,
                        borderLeftWidth: 3,
                        borderLeftColor: colors.error
                    }}>
                        <Text style={{
                            fontSize: 13,
                            fontFamily: "DMSans-Bold",
                            color: colors.error,
                            marginBottom: 4
                        }}>Rejection Details</Text>

                        {item.rejectionReason && (
                            <Text style={{ fontSize: 13, color: colors.onSurface, marginBottom: 2, fontFamily: "DMSans-Regular" }}>
                                <Text style={{ fontFamily: "DMSans-Bold" }}>Reason: </Text>{item.rejectionReason}
                            </Text>
                        )}
                        {item.rejectionComments && (
                            <Text style={{ fontSize: 13, color: colors.onSurface, fontFamily: "DMSans-Regular" }}>
                                <Text style={{ fontFamily: "DMSans-Bold" }}>Note: </Text>{item.rejectionComments}
                            </Text>
                        )}
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{ padding: 16, paddingBottom: 0 }}>
                <Header title="My Leaves" showBack={true} />
            </View>

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={leaves}
                    renderItem={renderItem}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', marginTop: 40, opacity: 0.6 }}>
                            <MaterialIcons name="event-busy" size={64} color={colors.onSurfaceVariant} />
                            <Text style={{ marginTop: 16, fontSize: 16, color: colors.onSurfaceVariant, fontFamily: "DMSans-Medium" }}>No leave history found.</Text>
                        </View>
                    }
                />
            )}

            <TouchableOpacity
                style={styles.fab}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.8}
            >
                <Ionicons name="add" size={28} color={colors.onPrimaryContainer} />
            </TouchableOpacity>

            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    justifyContent: 'flex-end',
                }}>
                    <View style={{
                        backgroundColor: colors.surface,
                        borderTopLeftRadius: 28,
                        borderTopRightRadius: 28,
                        padding: 24,
                        maxHeight: '90%',
                        elevation: 24,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: -2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 10
                    }}>
                        <View style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 24,
                        }}>
                            <Text style={{
                                fontSize: 24,
                                fontFamily: "DMSans-Bold",
                                color: colors.onSurface,
                            }}>Apply for Leave</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={{ padding: 4 }}>
                                <Ionicons name="close" size={24} color={colors.onSurfaceVariant} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Leave Type Toggle */}
                            <View style={{ marginBottom: 24 }}>
                                <Text style={styles.label}>LEAVE TYPE</Text>
                                <View style={{
                                    flexDirection: 'row',
                                    backgroundColor: colors.surfaceContainer,
                                    borderRadius: 12,
                                    padding: 4
                                }}>
                                    <Pressable
                                        style={{
                                            flex: 1,
                                            paddingVertical: 10,
                                            alignItems: 'center',
                                            borderRadius: 8,
                                            backgroundColor: !isHalfDay ? colors.background : 'transparent',
                                            elevation: !isHalfDay ? 1 : 0,
                                            shadowColor: "#000",
                                            shadowOpacity: !isHalfDay ? 0.05 : 0,
                                        }}
                                        onPress={() => setIsHalfDay(false)}
                                    >
                                        <Text style={{
                                            fontFamily: !isHalfDay ? "DMSans-Bold" : "DMSans-Medium",
                                            color: !isHalfDay ? colors.primary : colors.onSurfaceVariant
                                        }}>Full Day</Text>
                                    </Pressable>
                                    <Pressable
                                        style={{
                                            flex: 1,
                                            paddingVertical: 10,
                                            alignItems: 'center',
                                            borderRadius: 8,
                                            backgroundColor: isHalfDay ? colors.background : 'transparent',
                                            elevation: isHalfDay ? 1 : 0,
                                            shadowColor: "#000",
                                            shadowOpacity: isHalfDay ? 0.05 : 0,
                                        }}
                                        onPress={() => setIsHalfDay(true)}
                                    >
                                        <Text style={{
                                            fontFamily: isHalfDay ? "DMSans-Bold" : "DMSans-Medium",
                                            color: isHalfDay ? colors.primary : colors.onSurfaceVariant
                                        }}>Half Day</Text>
                                    </Pressable>
                                </View>
                            </View>

                            {isHalfDay && (
                                <View style={{ marginBottom: 24 }}>
                                    <Text style={styles.label}>SLOT</Text>
                                    <View style={{ flexDirection: 'row', gap: 12 }}>
                                        <Pressable
                                            style={{
                                                flex: 1,
                                                paddingVertical: 12,
                                                borderRadius: 12,
                                                borderWidth: 1,
                                                borderColor: halfDaySlot === 'morning' ? colors.primary : colors.outlineVariant,
                                                backgroundColor: halfDaySlot === 'morning' ? colors.secondaryContainer : 'transparent',
                                                alignItems: 'center'
                                            }}
                                            onPress={() => setHalfDaySlot('morning')}
                                        >
                                            <Text style={{
                                                fontFamily: "DMSans-Medium",
                                                color: halfDaySlot === 'morning' ? colors.onSecondaryContainer : colors.onSurfaceVariant
                                            }}>Morning</Text>
                                        </Pressable>
                                        <Pressable
                                            style={{
                                                flex: 1,
                                                paddingVertical: 12,
                                                borderRadius: 12,
                                                borderWidth: 1,
                                                borderColor: halfDaySlot === 'afternoon' ? colors.primary : colors.outlineVariant,
                                                backgroundColor: halfDaySlot === 'afternoon' ? colors.secondaryContainer : 'transparent',
                                                alignItems: 'center'
                                            }}
                                            onPress={() => setHalfDaySlot('afternoon')}
                                        >
                                            <Text style={{
                                                fontFamily: "DMSans-Medium",
                                                color: halfDaySlot === 'afternoon' ? colors.onSecondaryContainer : colors.onSurfaceVariant
                                            }}>Afternoon</Text>
                                        </Pressable>
                                    </View>
                                </View>
                            )}

                            <View style={{ flexDirection: 'row', gap: 16 }}>
                                <View style={{ flex: 1, marginBottom: 24 }}>
                                    <Text style={styles.label}>START DATE</Text>
                                    <TouchableOpacity
                                        style={{
                                            flexDirection: 'row',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            backgroundColor: colors.surfaceContainer,
                                            borderRadius: 12,
                                            padding: 14,
                                        }}
                                        onPress={() => setShowStartPicker(true)}
                                    >
                                        <Text style={{ fontSize: 16, color: colors.onSurface, fontFamily: "DMSans-Regular" }}>
                                            {formatDate(startDate)}
                                        </Text>
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
                                                    if (selectedDate > endDate) {
                                                        setEndDate(selectedDate);
                                                    }
                                                }
                                            }}
                                        />
                                    )}
                                </View>

                                {!isHalfDay && (
                                    <View style={{ flex: 1, marginBottom: 24 }}>
                                        <Text style={styles.label}>END DATE</Text>
                                        <TouchableOpacity
                                            style={{
                                                flexDirection: 'row',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                backgroundColor: colors.surfaceContainer,
                                                borderRadius: 12,
                                                padding: 14,
                                            }}
                                            onPress={() => setShowEndPicker(true)}
                                        >
                                            <Text style={{ fontSize: 16, color: colors.onSurface, fontFamily: "DMSans-Regular" }}>
                                                {formatDate(endDate)}
                                            </Text>
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
                                        backgroundColor: colors.surfaceContainer,
                                        borderRadius: 12,
                                        padding: 14,
                                        fontSize: 16,
                                        color: colors.onSurface,
                                        fontFamily: "DMSans-Regular",
                                        minHeight: 120,
                                        textAlignVertical: 'top'
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
                                    backgroundColor: colors.primary,
                                    paddingVertical: 16,
                                    borderRadius: 100,
                                    alignItems: 'center',
                                    marginBottom: 32,
                                    elevation: 2,
                                    shadowColor: colors.primary,
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 8,
                                }}
                                onPress={handleApplyLeave}
                                disabled={applyLeaveMutation.isPending}
                            >
                                {applyLeaveMutation.isPending ? (
                                    <ActivityIndicator color={colors.onPrimary} />
                                ) : (
                                    <Text style={{
                                        color: colors.onPrimary,
                                        fontSize: 16,
                                        fontFamily: "DMSans-Bold",
                                        letterSpacing: 0.5
                                    }}>Submit Application</Text>
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
    // Kept for backward compatibility if needed, but we used inline styles from theme
});
