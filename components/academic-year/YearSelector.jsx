import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Modal, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import apiFetch from '../../utils/apiFetch';
import apiConfig from '../../config/apiConfig';
import { useAcademicYear } from '../../contexts/AcademicYearContext';
import { useToast } from '../ToastProvider';

const YearSelector = ({ onYearChanged }) => {
    const { colors, styles } = useTheme();
    const { selectedYear, setYear } = useAcademicYear();
    const { showToast } = useToast();

    const [modalVisible, setModalVisible] = useState(false);
    const [years, setYears] = useState([]);
    const [loading, setLoading] = useState(false);

    // Fetch available years from backend
    const fetchYears = async () => {
        setLoading(true);
        try {
            const response = await apiFetch(`${apiConfig.baseUrl}/academic-year`);
            if (response.ok) {
                const data = await response.json();
                setYears(data);

                // If no year is currently selected (first launch), default to the 'isActive: true' one
                if (!selectedYear) {
                    const activeYear = data.find(y => y.isActive);
                    if (activeYear) {
                        setYear(activeYear);
                    } else if (data.length > 0) {
                        setYear(data[0]);
                    }
                }
            } else {
                showToast("Failed to fetch academic years", "error");
            }
        } catch (error) {
            console.error("Error fetching academic years:", error);
            showToast("Network error fetching years", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchYears();
    }, []);

    const handleSelectYear = async (year) => {
        await setYear(year);
        setModalVisible(false);
        showToast(`Time Travel Context Changed to ${year.name}`, "success");
        if (onYearChanged) onYearChanged(year);
    };

    const renderYearItem = ({ item }) => {
        const isSelected = selectedYear?._id === item._id;
        const isActiveNow = item.isActive;
        const isArchived = item.status === 'archived';

        return (
            <Pressable
                style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 16,
                    backgroundColor: isSelected ? colors.primaryContainer : (pressed ? colors.surfaceContainer : colors.surface),
                    borderBottomWidth: 1,
                    borderBottomColor: colors.outlineVariant
                })}
                onPress={() => handleSelectYear(item)}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialIcons
                        name={isArchived ? "history" : (isActiveNow ? "event-available" : "event")}
                        size={24}
                        color={isSelected ? colors.primary : colors.onSurfaceVariant}
                        style={{ marginRight: 16 }}
                    />
                    <View>
                        <Text style={{
                            fontSize: 16,
                            fontFamily: isSelected ? 'DMSans-Bold' : 'DMSans-Medium',
                            color: isSelected ? colors.onPrimaryContainer : colors.onSurface
                        }}>
                            {item.name}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                            <View style={{
                                width: 8,
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: isActiveNow ? colors.success : (isArchived ? colors.error : colors.tertiary),
                                marginRight: 6
                            }} />
                            <Text style={{
                                fontSize: 12,
                                fontFamily: 'DMSans-Regular',
                                color: colors.onSurfaceVariant,
                                textTransform: 'capitalize'
                            }}>
                                {isActiveNow ? 'Current Session (Live)' : item.status}
                            </Text>
                        </View>
                    </View>
                </View>

                {isSelected && (
                    <MaterialIcons name="check-circle" size={24} color={colors.primary} />
                )}
            </Pressable>
        );
    };

    if (!selectedYear) {
        return (
            <View style={{ padding: 8, opacity: loading ? 0.5 : 1 }}>
                {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={{ color: colors.onSurfaceVariant, fontSize: 12 }}>Time Travel Syncing...</Text>}
            </View>
        );
    }

    return (
        <>
            <Pressable
                onPress={() => setModalVisible(true)}
                style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: selectedYear.isActive ? colors.primaryContainer : colors.errorContainer,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                    opacity: pressed ? 0.8 : 1,
                    borderWidth: 1,
                    borderColor: selectedYear.isActive ? colors.primary : colors.error,
                    marginBottom: 16,
                    alignSelf: 'flex-start'
                })}
            >
                <MaterialIcons
                    name={selectedYear.status === 'archived' ? 'history' : 'calendar-today'}
                    size={16}
                    color={selectedYear.isActive ? colors.onPrimaryContainer : colors.onErrorContainer}
                />
                <Text style={{
                    fontSize: 13,
                    fontFamily: 'DMSans-Bold',
                    marginLeft: 6,
                    marginRight: 4,
                    color: selectedYear.isActive ? colors.onPrimaryContainer : colors.onErrorContainer
                }}>
                    {selectedYear.name}
                </Text>
                <MaterialIcons
                    name="arrow-drop-down"
                    size={18}
                    color={selectedYear.isActive ? colors.onPrimaryContainer : colors.onErrorContainer}
                />

                {/* Visual marker if looking at historical data to prevent confusion */}
                {!selectedYear.isActive && (
                    <View style={{ position: 'absolute', top: -6, right: -6, backgroundColor: colors.error, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 }}>
                        <Text style={{ fontSize: 9, color: colors.onError, fontFamily: 'DMSans-Bold', textTransform: 'uppercase' }}>PAST</Text>
                    </View>
                )}
            </Pressable>

            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <Pressable
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        justifyContent: 'flex-end'
                    }}
                    onPress={() => setModalVisible(false)}
                >
                    <Pressable
                        style={{
                            backgroundColor: colors.surface,
                            borderTopLeftRadius: 28,
                            borderTopRightRadius: 28,
                            paddingTop: 8,
                            maxHeight: '80%'
                        }}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.outlineVariant }} />
                        </View>

                        <View style={{ paddingHorizontal: 24, paddingBottom: 16 }}>
                            <Text style={styles.titleLarge}>Time Travel Control</Text>
                            <Text style={[styles.bodyMedium, { color: colors.onSurfaceVariant, marginTop: 4 }]}>
                                Change the global context to view absolute historical data
                            </Text>
                        </View>

                        {loading && years.length === 0 ? (
                            <View style={{ padding: 40, alignItems: 'center' }}>
                                <ActivityIndicator size="large" color={colors.primary} />
                                <Text style={{ marginTop: 12, color: colors.onSurfaceVariant, fontFamily: 'DMSans-Medium' }}>
                                    Loading Timelines...
                                </Text>
                            </View>
                        ) : (
                            <FlatList
                                data={years}
                                keyExtractor={(item) => item._id}
                                renderItem={renderYearItem}
                                contentContainerStyle={{ paddingBottom: 40 }}
                                showsVerticalScrollIndicator={false}
                            />
                        )}
                    </Pressable>
                </Pressable>
            </Modal>
        </>
    );
};

export default YearSelector;
