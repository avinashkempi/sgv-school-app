import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Platform, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../../theme';
import { useApiQuery } from '../../hooks/useApi';
import Header from '../../components/Header';
import Card from '../../components/Card';
import apiFetch from '../../utils/apiFetch';
import apiConfig from '../../config/apiConfig';
import { useToast } from '../../components/ToastProvider';

export default function ImportDataScreen() {
    const router = useRouter();
    const { colors, styles } = useTheme();
    const { showToast } = useToast();

    const [uploadingStudent, setUploadingStudent] = useState(false);
    const [uploadingStaff, setUploadingStaff] = useState(false);
    const [wipeData, setWipeData] = useState(false);
    const [feesOnly, setFeesOnly] = useState(false);
    const [result, setResult] = useState(null);
    const [selectedYearId, setSelectedYearId] = useState(null); // null = active year

    // Fetch all academic years for the dropdown
    const { data: yearsData } = useApiQuery(
        ['academicYears'],
        `${apiConfig.baseUrl}/academic-year`
    );
    const years = Array.isArray(yearsData) ? yearsData : (yearsData?.years || []);

    const handleImport = async () => {
        if (wipeData) {
            const confirmed = Platform.OS === 'web'
                ? window.confirm("Warning: Wipe Data Selected\n\nThis will DELETE ALL existing students, fees, and non-admin users before syncing. This action cannot be undone. Are you sure?")
                : await new Promise(resolve => {
                    Alert.alert(
                        "Warning: Wipe Data Selected",
                        "This will DELETE ALL existing students, fees, and non-admin users. Proceed?",
                        [
                            { text: "Cancel", onPress: () => resolve(false), style: "cancel" },
                            { text: "Yes, Wipe & Sync", onPress: () => resolve(true), style: "destructive" }
                        ]
                    );
                });

            if (confirmed) processLocalSync();
        } else {
            processLocalSync();
        }
    };

    const processLocalSync = async () => {
        console.log('--- Starting Local Sync ---');
        setUploadingStudent(true);
        setResult(null);

        try {
            const response = await apiFetch(`${apiConfig.baseUrl}/import/students/local`, {
                method: 'POST',
                body: JSON.stringify({ wipe: wipeData.toString(), academicYearId: selectedYearId, feesOnly }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const json = await response.json();
            console.log('Sync Response:', json);

            if (response.ok) {
                setResult(json.data);
                showToast('Import completed successfully', 'success');
            } else {
                showToast(json.message || 'Sync failed', 'error');
                const errMsg = json.message || "Failed to sync local data store";
                if (Platform.OS === 'web') window.alert("Error: " + errMsg);
                else Alert.alert("Sync Error", errMsg);
            }
        } catch (error) {
            console.error('CRITICAL SYNC ERROR:', error);
            showToast('Network error during sync', 'error');
        } finally {
            setUploadingStudent(false);
            console.log('--- Sync Finished ---');
        }
    };

    const handleStaffImport = async () => {
        console.log('--- Starting Staff Sync ---');
        setUploadingStaff(true);
        setResult(null);

        try {
            const response = await apiFetch(`${apiConfig.baseUrl}/import/staff/local`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const json = await response.json();
            console.log('Staff Sync Response:', json);

            if (response.ok) {
                setResult(json.data);
                showToast('Staff import completed successfully', 'success');
            } else {
                showToast(json.message || 'Staff Sync failed', 'error');
                const errMsg = json.message || "Failed to sync local staff data";
                if (Platform.OS === 'web') window.alert("Error: " + errMsg);
                else Alert.alert("Sync Error", errMsg);
            }
        } catch (error) {
            console.error('CRITICAL STAFF SYNC ERROR:', error);
            showToast('Network error during staff sync', 'error');
        } finally {
            setUploadingStaff(false);
            console.log('--- Staff Sync Finished ---');
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <Header title="Direct Data Sync" back={true} />

            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 150 }}>

                {/* 1. Static Source Info */}
                <Card variant="elevated" style={{ marginBottom: 16 }}>
                    <Text style={styles.titleMedium}>Data Source</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, backgroundColor: colors.surfaceVariant, padding: 12, borderRadius: 8 }}>
                        <MaterialIcons name="storage" size={24} color={colors.primary} />
                        <View style={{ marginLeft: 12 }}>
                            <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 14 }}>
                                Server Data Store
                            </Text>
                            <Text style={{ fontSize: 12, color: colors.onSurfaceVariant }}>
                                backend/data/student_data.csv
                            </Text>
                        </View>
                    </View>
                </Card>

                {/* 2. Options Card */}
                <Card variant="elevated" style={{ marginBottom: 16 }}>
                    <Text style={styles.titleMedium}>2. Import Options</Text>

                    <TouchableOpacity
                        onPress={() => setWipeData(!wipeData)}
                        style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}
                    >
                        <MaterialIcons
                            name={wipeData ? "check-box" : "check-box-outline-blank"}
                            size={24}
                            color={wipeData ? colors.error : colors.onSurfaceVariant}
                        />
                        <View style={{ marginLeft: 12, flex: 1 }}>
                            <Text style={{
                                fontFamily: 'DMSans-Bold',
                                color: wipeData ? colors.error : colors.onSurface
                            }}>
                                Wipe Existing Data
                            </Text>
                            <Text style={{ fontSize: 12, color: colors.onSurfaceVariant }}>
                                Delete all non-admin users & fees before import. Use for fresh start.
                            </Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => {
                            setFeesOnly(!feesOnly);
                            if (!feesOnly) setWipeData(false); // Can't wipe + feesOnly
                        }}
                        style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}
                    >
                        <MaterialIcons
                            name={feesOnly ? "check-box" : "check-box-outline-blank"}
                            size={24}
                            color={feesOnly ? colors.secondary : colors.onSurfaceVariant}
                        />
                        <View style={{ marginLeft: 12, flex: 1 }}>
                            <Text style={{
                                fontFamily: 'DMSans-Bold',
                                color: feesOnly ? colors.secondary : colors.onSurface
                            }}>
                                Fees Only Mode
                            </Text>
                            <Text style={{ fontSize: 12, color: colors.onSurfaceVariant }}>
                                Only update fee records. Student profiles, classes, and other data remain untouched.
                            </Text>
                        </View>
                    </TouchableOpacity>
                </Card>

                {/* 2b. Target Academic Year */}
                <Card variant="elevated" style={{ marginBottom: 16 }}>
                    <Text style={styles.titleMedium}>Target Academic Year</Text>
                    <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginTop: 4, marginBottom: 12 }}>
                        Choose which academic year this CSV data should be imported into.
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                        <TouchableOpacity
                            onPress={() => setSelectedYearId(null)}
                            style={{
                                paddingHorizontal: 16,
                                paddingVertical: 10,
                                backgroundColor: selectedYearId === null ? colors.primary : colors.surfaceVariant,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: selectedYearId === null ? colors.primary : colors.outline
                            }}
                        >
                            <Text style={{
                                fontFamily: 'DMSans-Bold',
                                fontSize: 13,
                                color: selectedYearId === null ? '#fff' : colors.onSurface
                            }}>
                                Active Year (Default)
                            </Text>
                        </TouchableOpacity>
                        {years.map((yr) => (
                            <TouchableOpacity
                                key={yr._id}
                                onPress={() => setSelectedYearId(yr._id)}
                                style={{
                                    paddingHorizontal: 16,
                                    paddingVertical: 10,
                                    backgroundColor: selectedYearId === yr._id ? colors.primary : colors.surfaceVariant,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: selectedYearId === yr._id ? colors.primary : colors.outline
                                }}
                            >
                                <Text style={{
                                    fontFamily: 'DMSans-Bold',
                                    fontSize: 13,
                                    color: selectedYearId === yr._id ? '#fff' : colors.onSurface
                                }}>
                                    {yr.name} {yr.status === 'current' ? '●' : ''}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </Card>

                {/* 3. Action Button */}
                <TouchableOpacity
                    onPress={handleImport}
                    disabled={uploadingStudent || uploadingStaff}
                    style={{
                        backgroundColor: uploadingStudent ? colors.surfaceVariant : (wipeData ? colors.error : colors.primary),
                        padding: 18,
                        borderRadius: 12,
                        alignItems: 'center',
                        marginBottom: 24,
                        elevation: 4,
                        shadowColor: colors.shadow,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.2
                    }}
                >
                    {uploadingStudent ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <ActivityIndicator color={colors.onSurface} style={{ marginRight: 10 }} />
                            <Text style={{ color: colors.onSurface, fontFamily: 'DMSans-Bold' }}>SYNCING DATA...</Text>
                        </View>
                    ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <MaterialIcons name="sync" size={20} color={colors.white} style={{ marginRight: 8 }} />
                            <Text style={{
                                color: colors.white,
                                fontFamily: 'DMSans-Bold',
                                fontSize: 16
                            }}>
                                {wipeData ? "WIPE & SYNC NOW" : "RUN DIRECT SYNC"}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* 4. Staff Import Section */}
                <Card variant="elevated" style={{ marginBottom: 16 }}>
                    <Text style={styles.titleMedium}>3. Staff Data Import</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, backgroundColor: colors.surfaceVariant, padding: 12, borderRadius: 8 }}>
                        <MaterialIcons name="badge" size={24} color={colors.secondary} />
                        <View style={{ marginLeft: 12 }}>
                            <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 14 }}>
                                Staff Data Store
                            </Text>
                            <Text style={{ fontSize: 12, color: colors.onSurfaceVariant }}>
                                backend/data/staff_data.csv
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        onPress={handleStaffImport}
                        disabled={uploadingStudent || uploadingStaff}
                        style={{
                            backgroundColor: uploadingStaff ? colors.surfaceVariant : colors.secondary,
                            padding: 14,
                            borderRadius: 12,
                            alignItems: 'center',
                            marginTop: 16,
                            elevation: 2
                        }}
                    >
                        {uploadingStaff ? (
                            <ActivityIndicator color={colors.onSurface} />
                        ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <MaterialIcons name="sync" size={20} color={colors.white} style={{ marginRight: 8 }} />
                                <Text style={{ color: colors.white, fontFamily: 'DMSans-Bold' }}>SYNC STAFF DATA</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </Card>

                {/* 4. Results Section */}
                {result && (
                    <View style={{ marginBottom: 30 }}>
                        <Text style={[styles.titleMedium, { marginBottom: 12 }]}>Import Summary</Text>

                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                            <ResultCard label="Total" value={result.total} color={colors.primary} />
                            <ResultCard label="Created" value={result.created} color={colors.success} />
                            <ResultCard label="Updated" value={result.updated} color={colors.secondary} />
                            <ResultCard label="Failed" value={result.failed} color={colors.error} />
                        </View>

                        {/* Class/Designation Distribution */}
                        {result.classCounts && Object.keys(result.classCounts).length > 0 && (
                            <Card variant="outlined" style={{ marginBottom: 16 }}>
                                <Text style={[styles.titleSmall, { marginBottom: 12 }]}>Class Distribution</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                    {Object.entries(result.classCounts).map(([className, count]) => (
                                        <View key={className} style={{
                                            backgroundColor: colors.surfaceVariant,
                                            paddingHorizontal: 10,
                                            paddingVertical: 6,
                                            borderRadius: 8,
                                            flexDirection: 'row',
                                            alignItems: 'center'
                                        }}>
                                            <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 12, marginRight: 4 }}>
                                                {className}:
                                            </Text>
                                            <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 12 }}>
                                                {count}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </Card>
                        )}

                        {/* Designation Distribution (For Staff Import) */}
                        {result.designationCounts && Object.keys(result.designationCounts).length > 0 && (
                            <Card variant="outlined" style={{ marginBottom: 16 }}>
                                <Text style={[styles.titleSmall, { marginBottom: 12 }]}>Designation Summary</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                    {Object.entries(result.designationCounts).map(([desig, count]) => (
                                        <View key={desig} style={{
                                            backgroundColor: colors.primary + '10',
                                            paddingHorizontal: 10,
                                            paddingVertical: 6,
                                            borderRadius: 8,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            borderWidth: 1,
                                            borderColor: colors.primary + '30'
                                        }}>
                                            <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 12, marginRight: 4, color: colors.primary }}>
                                                {desig}:
                                            </Text>
                                            <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.primary }}>
                                                {count}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </Card>
                        )}

                        {/* Updated Students List Button */}
                        {result.updated > 0 && result.updatedStudents && (
                            <TouchableOpacity
                                onPress={() => setResult({ ...result, showUpdatedModal: true })}
                                style={{
                                    backgroundColor: colors.secondary + '20',
                                    padding: 12,
                                    borderRadius: 8,
                                    marginBottom: 16,
                                    alignItems: 'center',
                                    borderWidth: 1,
                                    borderColor: colors.secondary
                                }}
                            >
                                <Text style={{ color: colors.secondary, fontFamily: 'DMSans-Bold' }}>
                                    View {result.updated} Updated Students
                                </Text>
                            </TouchableOpacity>
                        )}

                        {/* Created Staff List Button */}
                        {result.created > 0 && result.createdStaff && (
                            <TouchableOpacity
                                onPress={() => setResult({ ...result, showCreatedStaffModal: true })}
                                style={{
                                    backgroundColor: colors.success + '20',
                                    padding: 12,
                                    borderRadius: 8,
                                    marginBottom: 16,
                                    alignItems: 'center',
                                    borderWidth: 1,
                                    borderColor: colors.success
                                }}
                            >
                                <Text style={{ color: colors.success, fontFamily: 'DMSans-Bold' }}>
                                    View {result.created} Created Staff
                                </Text>
                            </TouchableOpacity>
                        )}

                        {/* Updated Staff List Button */}
                        {result.updated > 0 && result.updatedStaff && (
                            <TouchableOpacity
                                onPress={() => setResult({ ...result, showUpdatedStaffModal: true })}
                                style={{
                                    backgroundColor: colors.secondary + '20',
                                    padding: 12,
                                    borderRadius: 8,
                                    marginBottom: 16,
                                    alignItems: 'center',
                                    borderWidth: 1,
                                    borderColor: colors.secondary
                                }}
                            >
                                <Text style={{ color: colors.secondary, fontFamily: 'DMSans-Bold' }}>
                                    View {result.updated} Updated Staff
                                </Text>
                            </TouchableOpacity>
                        )}

                        {/* Errors */}
                        {result.errors.length > 0 && (
                            <Card variant="outlined" style={{ borderColor: colors.error }}>
                                <Text style={[styles.titleSmall, { color: colors.error, marginBottom: 8 }]}>
                                    Errors ({result.errors.length})
                                </Text>
                                {result.errors.map((err, idx) => (
                                    <View key={idx} style={{ marginBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant, paddingBottom: 4 }}>
                                        <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 12 }}>
                                            Row {err.row}: {err.name}
                                        </Text>
                                        <Text style={{ fontSize: 12, color: colors.error }}>
                                            {err.error}
                                        </Text>
                                    </View>
                                ))}
                            </Card>
                        )}

                        {/* Updated Students Modal */}
                        <Modal
                            visible={result.showUpdatedModal === true}
                            animationType="slide"
                            transparent={true}
                            onRequestClose={() => setResult({ ...result, showUpdatedModal: false })}
                        >
                            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
                                <View style={{ backgroundColor: colors.background, borderRadius: 12, maxHeight: '80%', padding: 20 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                        <Text style={styles.titleMedium}>Updated Students ({result.updated})</Text>
                                        <TouchableOpacity onPress={() => setResult({ ...result, showUpdatedModal: false })}>
                                            <MaterialIcons name="close" size={24} color={colors.onSurface} />
                                        </TouchableOpacity>
                                    </View>
                                    <ScrollView>
                                        {result.updatedStudents && result.updatedStudents.length > 0 ? (
                                            result.updatedStudents.map((stud, idx) => (
                                                <View key={idx} style={{
                                                    padding: 12,
                                                    borderBottomWidth: 1,
                                                    borderBottomColor: colors.outlineVariant,
                                                    flexDirection: 'row',
                                                    justifyContent: 'space-between'
                                                }}>
                                                    <View>
                                                        <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 14 }}>{stud.name}</Text>
                                                        <Text style={{ fontSize: 12, color: colors.onSurfaceVariant }}>Class: {stud.class}</Text>
                                                    </View>
                                                    <Text style={{ fontFamily: 'DMSans-Mono', fontSize: 14, color: colors.primary }}>
                                                        {stud.phone}
                                                    </Text>
                                                </View>
                                            ))
                                        ) : (
                                            <Text style={{ padding: 20, textAlign: 'center', color: colors.onSurfaceVariant }}>
                                                No updated student details available.
                                            </Text>
                                        )}
                                    </ScrollView>
                                </View>
                            </View>
                        </Modal>

                        {/* Created Staff Modal */}
                        <Modal
                            visible={result.showCreatedStaffModal === true}
                            animationType="slide"
                            transparent={true}
                            onRequestClose={() => setResult({ ...result, showCreatedStaffModal: false })}
                        >
                            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
                                <View style={{ backgroundColor: colors.background, borderRadius: 12, maxHeight: '80%', padding: 20 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                        <Text style={styles.titleMedium}>Created Staff ({result.created})</Text>
                                        <TouchableOpacity onPress={() => setResult({ ...result, showCreatedStaffModal: false })}>
                                            <MaterialIcons name="close" size={24} color={colors.onSurface} />
                                        </TouchableOpacity>
                                    </View>
                                    <ScrollView>
                                        {result.createdStaff && result.createdStaff.length > 0 ? (
                                            result.createdStaff.map((staff, idx) => (
                                                <View key={idx} style={{
                                                    padding: 12,
                                                    borderBottomWidth: 1,
                                                    borderBottomColor: colors.outlineVariant,
                                                    flexDirection: 'row',
                                                    justifyContent: 'space-between'
                                                }}>
                                                    <View>
                                                        <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 14 }}>{staff.name}</Text>
                                                        <Text style={{ fontSize: 12, color: colors.onSurfaceVariant }}>{staff.designation}</Text>
                                                    </View>
                                                    <Text style={{ fontFamily: 'DMSans-Mono', fontSize: 14, color: colors.primary }}>
                                                        {staff.phone}
                                                    </Text>
                                                </View>
                                            ))
                                        ) : (
                                            <Text style={{ textAlign: 'center', marginTop: 20, color: colors.onSurfaceVariant }}>No details available</Text>
                                        )}
                                    </ScrollView>
                                </View>
                            </View>
                        </Modal>

                        {/* Updated Staff Modal */}
                        <Modal
                            visible={result.showUpdatedStaffModal === true}
                            animationType="slide"
                            transparent={true}
                            onRequestClose={() => setResult({ ...result, showUpdatedStaffModal: false })}
                        >
                            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
                                <View style={{ backgroundColor: colors.background, borderRadius: 12, maxHeight: '80%', padding: 20 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                        <Text style={styles.titleMedium}>Updated Staff ({result.updated})</Text>
                                        <TouchableOpacity onPress={() => setResult({ ...result, showUpdatedStaffModal: false })}>
                                            <MaterialIcons name="close" size={24} color={colors.onSurface} />
                                        </TouchableOpacity>
                                    </View>
                                    <ScrollView>
                                        {result.updatedStaff && result.updatedStaff.length > 0 ? (
                                            result.updatedStaff.map((staff, idx) => (
                                                <View key={idx} style={{
                                                    padding: 12,
                                                    borderBottomWidth: 1,
                                                    borderBottomColor: colors.outlineVariant,
                                                    flexDirection: 'row',
                                                    justifyContent: 'space-between'
                                                }}>
                                                    <View>
                                                        <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 14 }}>{staff.name}</Text>
                                                        <Text style={{ fontSize: 12, color: colors.onSurfaceVariant }}>{staff.designation}</Text>
                                                    </View>
                                                    <Text style={{ fontFamily: 'DMSans-Mono', fontSize: 14, color: colors.primary }}>
                                                        {staff.phone}
                                                    </Text>
                                                </View>
                                            ))
                                        ) : (
                                            <Text style={{ textAlign: 'center', marginTop: 20, color: colors.onSurfaceVariant }}>No details available</Text>
                                        )}
                                    </ScrollView>
                                </View>
                            </View>
                        </Modal>
                    </View>
                )}

            </ScrollView>
        </View>
    );
}

const ResultCard = ({ label, value, color }) => (
    <View style={{
        flex: 1,
        backgroundColor: color + '20', // 20 hex = 12% opacity
        padding: 12,
        borderRadius: 8,
        alignItems: 'center'
    }}>
        <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 18, color: color }}>
            {value}
        </Text>
        <Text style={{ fontSize: 12, color: color }}>
            {label}
        </Text>
    </View>
);
