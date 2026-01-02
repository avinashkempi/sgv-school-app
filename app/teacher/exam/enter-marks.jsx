import React, { useState, useEffect, useMemo } from "react";
import {
    View,
    Text,
    ScrollView,
    Pressable,
    TextInput,
    ActivityIndicator,
    RefreshControl,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme } from "../../../theme";
import apiConfig from "../../../config/apiConfig";
import { useApiQuery, useApiMutation, createApiMutationFn } from "../../../hooks/useApi";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "../../../components/ToastProvider";
import AppHeader from "../../../components/Header";
import DataGrid from "../../../components/DataGrid";
import StatCard from "../../../components/StatCard";

export default function EnterMarksScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const queryClient = useQueryClient();
    const { colors } = useTheme();
    const { showToast } = useToast();

    const { examId } = params;

    const [refreshing, setRefreshing] = useState(false);
    const [marksData, setMarksData] = useState({});
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

    // Fetch Exam Details
    const { data: exam, isLoading: examLoading } = useApiQuery(
        ['examDetails', examId],
        `${apiConfig.baseUrl}/exams/${examId}`,
        { enabled: !!examId }
    );

    // Fetch Students
    const { data: classData, isLoading: studentsLoading } = useApiQuery(
        ['classStudents', exam?.class?._id],
        `${apiConfig.baseUrl}/classes/${exam?.class?._id}/full-details`,
        { enabled: !!exam?.class?._id }
    );
    const students = classData?.students || [];

    // Fetch Existing Marks
    const { data: existingMarksData, isLoading: marksLoading, refetch: refetchMarks } = useApiQuery(
        ['examMarks', examId],
        `${apiConfig.baseUrl}/marks/exam/${examId}`,
        { enabled: !!examId }
    );

    // Fetch marks entry status
    const { data: marksStatus } = useApiQuery(
        ['marksStatus', examId],
        `${apiConfig.baseUrl}/marks/exam/${examId}/status`,
        { enabled: !!examId }
    );

    // Process existing marks
    useEffect(() => {
        if (existingMarksData) {
            const marksMap = {};
            existingMarksData.forEach(mark => {
                marksMap[mark.student._id] = mark.marksObtained.toString();
            });
            setMarksData(marksMap);
        }
    }, [existingMarksData]);

    const existingMarksMap = useMemo(() => {
        const map = {};
        if (existingMarksData) {
            existingMarksData.forEach(mark => {
                map[mark.student._id] = mark;
            });
        }
        return map;
    }, [existingMarksData]);

    // Grid update mutation
    const gridUpdateMutation = useApiMutation({
        mutationFn: createApiMutationFn(`${apiConfig.baseUrl}/marks/grid-update`, 'POST'),
        onSuccess: (result) => {
            if (result.errors && result.errors.length > 0) {
                showToast(`Saved with ${result.errors.length} errors`, "warning");
            } else {
                showToast(`Updated: ${result.updated}, Created: ${result.created}`, "success");
            }
            queryClient.invalidateQueries({ queryKey: ['examMarks', examId] });
            queryClient.invalidateQueries({ queryKey: ['marksStatus', examId] });
            refetchMarks();
        },
        onError: (error) => showToast(error.message || "Failed to save marks", "error")
    });

    // Bulk save mutation (for list view)
    const saveMarksMutation = useApiMutation({
        mutationFn: createApiMutationFn(`${apiConfig.baseUrl}/marks/bulk`, 'POST'),
        onSuccess: (result) => {
            const failures = result.results.filter(r => !r.success);
            if (failures.length > 0) {
                showToast(`Marks saved with ${failures.length} errors`, "warning");
            } else {
                showToast("All marks saved successfully", "success");
            }
            queryClient.invalidateQueries({ queryKey: ['examMarks', examId] });
            queryClient.invalidateQueries({ queryKey: ['marksStatus', examId] });
            refetchMarks();
        },
        onError: (error) => showToast(error.message || "Failed to save marks", "error")
    });

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['examDetails', examId] }),
            queryClient.invalidateQueries({ queryKey: ['classStudents', exam?.class?._id] }),
            queryClient.invalidateQueries({ queryKey: ['marksStatus', examId] }),
            refetchMarks()
        ]);
        setRefreshing(false);
    };

    const handleMarksChange = (studentId, value) => {
        setMarksData(prev => ({
            ...prev,
            [studentId]: value
        }));
    };

    const handleGridSave = (gridData) => {
        const marksArray = gridData
            .filter(row => row.marksObtained !== '' && row.marksObtained !== undefined && row.marksObtained !== null)
            .map(row => ({
                studentId: row._id,
                marksObtained: parseFloat(row.marksObtained),
                remarks: row.remarks || ''
            }));

        if (marksArray.length === 0) {
            showToast("No marks to save", "warning");
            return;
        }

        gridUpdateMutation.mutate({
            examId,
            gridData: marksArray
        });
    };

    const handleListSave = () => {
        const marksArray = Object.keys(marksData)
            .filter(studentId => marksData[studentId] !== '' && marksData[studentId] !== undefined)
            .map(studentId => ({
                studentId,
                marksObtained: parseFloat(marksData[studentId])
            }));

        if (marksArray.length === 0) {
            showToast("Please enter marks for at least one student", "warning");
            return;
        }

        const invalidMarks = marksArray.filter(
            m => isNaN(m.marksObtained) || m.marksObtained < 0 || m.marksObtained > exam.totalMarks
        );

        if (invalidMarks.length > 0) {
            showToast(`Marks must be between 0 and ${exam.totalMarks}`, "error");
            return;
        }

        saveMarksMutation.mutate({
            examId,
            marksData: marksArray
        });
    };

    const getGradeColor = (grade) => {
        if (grade === 'A+' || grade === 'A') return colors.success;
        if (grade === 'B+' || grade === 'B') return '#2196F3';
        if (grade === 'C') return '#FF9800';
        if (grade === 'D') return '#FF5722';
        return colors.error;
    };

    // Prepare data for grid view
    const gridData = useMemo(() => {
        return students.map(student => {
            const existingMark = existingMarksMap[student._id];
            return {
                _id: student._id,
                studentName: student.name,
                marksObtained: marksData[student._id] || '',
                percentage: marksData[student._id]
                    ? ((parseFloat(marksData[student._id]) / exam?.totalMarks) * 100).toFixed(1)
                    : '',
                grade: existingMark?.grade || '',
                remarks: existingMark?.remarks || ''
            };
        });
    }, [students, marksData, existingMarksMap, exam?.totalMarks]);

    const gridColumns = [
        { key: 'studentName', label: 'Student Name', width: 200, editable: false },
        {
            key: 'marksObtained',
            label: `Marks (/${exam?.totalMarks || 100})`,
            width: 120,
            editable: true,
            type: 'number'
        },
        { key: 'percentage', label: '%', width: 80, editable: false },
        { key: 'grade', label: 'Grade', width: 80, editable: false, type: 'grade' },
        { key: 'remarks', label: 'Remarks', width: 200, editable: false }
    ];

    const gridValidation = {
        marksObtained: {
            required: false,
            min: 0,
            max: exam?.totalMarks || 100
        }
    };

    const loading = examLoading || studentsLoading || marksLoading;

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!exam) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center", padding: 20 }}>
                <MaterialIcons name="error-outline" size={64} color={colors.error} />
                <Text style={{ fontSize: 18, fontFamily: "DMSans-SemiBold", color: colors.onSurface, marginTop: 16 }}>
                    Exam not found
                </Text>
            </View>
        );
    }

    const renderStatCards = () => {
        if (!marksStatus) return null;

        return (
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20, marginBottom: 20 }}>
                <StatCard
                    label="Total Students"
                    value={marksStatus.totalStudents}
                    icon="people"
                    color="#2196F3"
                    variant="compact"
                />
                <StatCard
                    label="Entered"
                    value={marksStatus.marksEntered}
                    icon="check-circle"
                    color="#4CAF50"
                    variant="compact"
                />
                <StatCard
                    label="Pending"
                    value={marksStatus.pending}
                    icon="pending-actions"
                    color="#FF9800"
                    variant="compact"
                />
            </View>
        );
    };

    const renderGridView = () => (
        <View style={{ flex: 1, minHeight: 400 }}>
            <DataGrid
                columns={gridColumns}
                data={gridData}
                onCellChange={(rowIndex, columnKey, value) => {
                    const studentId = gridData[rowIndex]._id;
                    handleMarksChange(studentId, value);
                }}
                onSave={handleGridSave}
                validation={gridValidation}
                showLineNumbers
                stickyHeader
            />
        </View>
    );

    const renderListView = () => (
        <>
            {students.length === 0 ? (
                <View style={{ alignItems: "center", marginTop: 40 }}>
                    <MaterialIcons name="people-outline" size={64} color={colors.onSurfaceVariant} />
                    <Text style={{ fontSize: 16, color: colors.onSurfaceVariant, marginTop: 16, fontFamily: "DMSans-Medium" }}>
                        No students in this class
                    </Text>
                </View>
            ) : (
                students.map((student, index) => {
                    const existingMark = existingMarksMap[student._id];
                    const currentValue = marksData[student._id] || '';

                    return (
                        <View
                            key={student._id}
                            style={{
                                backgroundColor: colors.surfaceContainerLow,
                                borderRadius: 12,
                                padding: 16,
                                marginBottom: 12,
                                borderWidth: 1,
                                borderColor: colors.outlineVariant
                            }}
                        >
                            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 16, fontFamily: "DMSans-SemiBold", color: colors.onSurface }}>
                                        {index + 1}. {student.name}
                                    </Text>
                                    {student.email && (
                                        <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2, fontFamily: "DMSans-Regular" }}>
                                            {student.email}
                                        </Text>
                                    )}
                                </View>

                                {existingMark && (
                                    <View style={{
                                        backgroundColor: getGradeColor(existingMark.grade) + "20",
                                        paddingHorizontal: 12,
                                        paddingVertical: 6,
                                        borderRadius: 8
                                    }}>
                                        <Text style={{
                                            fontSize: 16,
                                            fontFamily: "DMSans-Bold",
                                            color: getGradeColor(existingMark.grade)
                                        }}>
                                            {existingMark.grade}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 6, fontFamily: "DMSans-Medium" }}>
                                        Marks Obtained (out of {exam.totalMarks})
                                    </Text>
                                    <TextInput
                                        placeholder="0"
                                        placeholderTextColor={colors.onSurfaceVariant + "60"}
                                        keyboardType="numeric"
                                        style={{
                                            backgroundColor: colors.surface,
                                            padding: 12,
                                            borderRadius: 10,
                                            color: colors.onSurface,
                                            fontSize: 18,
                                            fontFamily: "DMSans-Bold",
                                            borderWidth: 2,
                                            borderColor: currentValue !== '' ? colors.primary : colors.outline
                                        }}
                                        value={currentValue}
                                        onChangeText={(value) => handleMarksChange(student._id, value)}
                                    />
                                </View>

                                {currentValue !== '' && !isNaN(currentValue) && (
                                    <View style={{ alignItems: "center", minWidth: 60 }}>
                                        <Text style={{ fontSize: 11, color: colors.onSurfaceVariant, marginBottom: 4, fontFamily: "DMSans-Medium" }}>
                                            %
                                        </Text>
                                        <Text style={{ fontSize: 24, fontFamily: "DMSans-Bold", color: colors.primary }}>
                                            {((parseFloat(currentValue) / exam.totalMarks) * 100).toFixed(0)}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    );
                })
            )}

            {students.length > 0 && (
                <Pressable
                    onPress={handleListSave}
                    disabled={saveMarksMutation.isPending}
                    style={({ pressed }) => ({
                        backgroundColor: colors.primary,
                        borderRadius: 12,
                        padding: 16,
                        marginTop: 24,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        opacity: pressed || saveMarksMutation.isPending ? 0.7 : 1
                    })}
                >
                    {saveMarksMutation.isPending ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <>
                            <MaterialIcons name="save" size={24} color="#fff" />
                            <Text style={{ fontSize: 17, fontFamily: "DMSans-Bold", color: "#fff" }}>
                                Save All Marks
                            </Text>
                        </>
                    )}
                </Pressable>
            )}
        </>
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                <View style={{ padding: 16, paddingTop: 24 }}>
                    <AppHeader
                        title="Enter Marks"
                        subtitle={`${exam.name} - ${exam.subject.name}`}
                        showBack
                    />

                    {/* Exam Info Card */}
                    <View style={{
                        backgroundColor: colors.primaryContainer,
                        borderRadius: 16,
                        padding: 16,
                        marginTop: 20,
                        borderLeftWidth: 4,
                        borderLeftColor: colors.primary
                    }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                            <Text style={{ fontSize: 14, color: colors.onSurfaceVariant, fontFamily: "DMSans-Medium" }}>
                                Class
                            </Text>
                            <Text style={{ fontSize: 14, fontFamily: "DMSans-Bold", color: colors.onSurface }}>
                                {exam.class.name} {exam.class.section}
                            </Text>
                        </View>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                            <Text style={{ fontSize: 14, color: colors.onSurfaceVariant, fontFamily: "DMSans-Medium" }}>
                                Type
                            </Text>
                            <Text style={{ fontSize: 14, fontFamily: "DMSans-Bold", color: colors.onSurface, textTransform: "capitalize" }}>
                                {exam.standardizedType || exam.type.replace('-', ' ')}
                            </Text>
                        </View>
                        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                            <Text style={{ fontSize: 14, color: colors.onSurfaceVariant, fontFamily: "DMSans-Medium" }}>
                                Total Marks
                            </Text>
                            <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.primary }}>
                                {exam.totalMarks}
                            </Text>
                        </View>
                    </View>

                    {/* Stats Cards */}
                    {renderStatCards()}

                    {/* View Mode Toggle */}
                    <View style={{
                        flexDirection: 'row',
                        backgroundColor: colors.surfaceContainerHighest,
                        borderRadius: 12,
                        padding: 4,
                        marginBottom: 20
                    }}>
                        <Pressable
                            onPress={() => setViewMode('grid')}
                            style={({ pressed }) => ({
                                flex: 1,
                                paddingVertical: 10,
                                borderRadius: 8,
                                backgroundColor: viewMode === 'grid'
                                    ? (pressed ? colors.primary + 'DD' : colors.primary)
                                    : 'transparent',
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6
                            })}
                        >
                            <MaterialIcons
                                name="grid-on"
                                size={18}
                                color={viewMode === 'grid' ? '#FFFFFF' : colors.onSurfaceVariant}
                            />
                            <Text style={{
                                fontFamily: 'DMSans-Bold',
                                fontSize: 13,
                                color: viewMode === 'grid' ? '#FFFFFF' : colors.onSurfaceVariant
                            }}>
                                Grid View
                            </Text>
                        </Pressable>
                        <Pressable
                            onPress={() => setViewMode('list')}
                            style={({ pressed }) => ({
                                flex: 1,
                                paddingVertical: 10,
                                borderRadius: 8,
                                backgroundColor: viewMode === 'list'
                                    ? (pressed ? colors.primary + 'DD' : colors.primary)
                                    : 'transparent',
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6
                            })}
                        >
                            <MaterialIcons
                                name="view-list"
                                size={18}
                                color={viewMode === 'list' ? '#FFFFFF' : colors.onSurfaceVariant}
                            />
                            <Text style={{
                                fontFamily: 'DMSans-Bold',
                                fontSize: 13,
                                color: viewMode === 'list' ? '#FFFFFF' : colors.onSurfaceVariant
                            }}>
                                List View
                            </Text>
                        </Pressable>
                    </View>

                    {/* Content */}
                    <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.onSurface, marginBottom: 16 }}>
                        Student Marks ({students.length})
                    </Text>

                    {viewMode === 'grid' ? renderGridView() : renderListView()}
                </View>
            </ScrollView>
        </View>
    );
}
