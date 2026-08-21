import React, { useState } from "react";
import {
    View,
    Text,
    ScrollView,
    Pressable,
    RefreshControl,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "../../theme";
import apiConfig from "../../config/apiConfig";
import { useApiQuery } from "../../hooks/useApi";
import { CACHE_TIERS } from "../../utils/cacheConfig";
import { useToast } from "../../components/ToastProvider";
import AppHeader from "../../components/Header";
import Card from "../../components/Card";
import { formatClassName } from "../../utils/formatClassName";
import { useAuth } from "../../context/AuthContext";
import SegmentedControl from "../../components/SegmentedControl";
import { EmptyState, LoadingState } from "../../components/StateComponents";

export default function TeacherDashboard() {
    const router = useRouter();
    const queryClient = useQueryClient();
    // eslint-disable-next-line no-unused-vars
    const { styles, colors } = useTheme();
    const { _showToast } = useToast();
    // eslint-disable-next-line no-unused-vars
    const { user, userId } = useAuth();
    const isStaff = user?.role === 'staff' || user?.role === 'support_staff';

    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('classTeacher'); // 'classTeacher' or 'mySubjects'

    const { data: dashboardData, isLoading: loading, refetch } = useApiQuery(
        ['teacherDashboard', userId],
        `${apiConfig.baseUrl}/teachers/my-classes-and-subjects`,
        {
            ...CACHE_TIERS.MODERATE,
            enabled: !isStaff && !!userId,
        }
    );

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await Promise.all([
                refetch(),
                queryClient.invalidateQueries({ queryKey: ['teacherDashboard'] }),
            ]);
        } catch (err) {
            console.error("Teacher dashboard refresh error:", err);
        } finally {
            setRefreshing(false);
        }
    };

    if (isStaff) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background }}>
                <ScrollView
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[colors.primary]}
                            tintColor={colors.primary}
                        />
                    }
                    contentContainerStyle={{ flexGrow: 1, padding: 16, paddingTop: 24, paddingBottom: 32 }}
                    alwaysBounceVertical={true}
                    showsVerticalScrollIndicator={false}
                >
                    <AppHeader title="Dashboard" subtitle="Staff quick actions" />

                    <View style={{ marginTop: 12 }}>
                        <Card
                            variant="elevated"
                            onPress={() => router.push('/teacher/timetable')}
                            contentStyle={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: 20
                            }}
                            style={{ marginBottom: 16 }}
                        >
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 16, flex: 1 }}>
                                <View style={{
                                    backgroundColor: "#2196F315",
                                    padding: 12,
                                    borderRadius: 14,
                                    width: 52,
                                    height: 52,
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <MaterialIcons name="schedule" size={26} color="#2196F3" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{
                                        fontSize: 17,
                                        fontFamily: "DMSans-Bold",
                                        color: colors.onSurface,
                                        marginBottom: 4
                                    }}>
                                        School Timetable
                                    </Text>
                                    <Text style={{
                                        fontSize: 13,
                                        color: colors.onSurfaceVariant,
                                        fontFamily: "DMSans-Regular"
                                    }}>
                                        View all classes and period schedules
                                    </Text>
                                </View>
                            </View>
                            <MaterialIcons name="chevron-right" size={24} color={colors.onSurfaceVariant} />
                        </Card>
                    </View>
                </ScrollView>
            </View>
        );
    }

    const asClassTeacher = dashboardData?.asClassTeacher || [];
    const allMySubjects = dashboardData?.allMySubjects || [];

    // Group subjects by subject name for display
    const groupedSubjects = allMySubjects.reduce((acc, subj) => {
        if (!acc[subj.name]) {
            acc[subj.name] = [];
        }
        acc[subj.name].push(subj);
        return acc;
    }, {});

    const renderClassTeacherTab = () => (
        <View>
            {asClassTeacher.length === 0 ? (
                <EmptyState
                    icon="class"
                    title="Not a Class Teacher"
                    message={'You are not a class teacher of any class. Check "My Subjects" tab to see subjects you teach.'}
                />
            ) : (
                asClassTeacher.map((cls) => (
                    <Card
                        key={cls._id}
                        variant="elevated"
                        onPress={() => router.push(`/teacher/class/${cls._id}`)}
                        style={{ marginBottom: 12 }}
                        contentStyle={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center"
                        }}
                    >
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                                <Text style={{
                                    fontSize: 18,
                                    fontFamily: "DMSans-Bold",
                                    color: colors.onSurface
                                }}>
                                    {formatClassName(cls.name, cls.section)}
                                </Text>
                            </View>

                            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 }}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                    <MaterialIcons name="people" size={16} color={colors.onSurfaceVariant} />
                                    <Text style={{
                                        fontSize: 13,
                                        color: colors.onSurfaceVariant,
                                        fontFamily: "DMSans-Medium"
                                    }}>
                                        {cls.studentCount} students
                                    </Text>
                                </View>

                                {cls.mySubjects && cls.mySubjects.length > 0 && (
                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flex: 1 }}>
                                        <MaterialIcons name="book" size={16} color={colors.onSurfaceVariant} />
                                        <Text style={{
                                            fontSize: 13,
                                            color: colors.onSurfaceVariant,
                                            fontFamily: "DMSans-Medium",
                                            flex: 1
                                        }}>
                                            Teaching: {cls.mySubjects.join(", ")}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            <View style={{
                                backgroundColor: colors.primary + "15",
                                alignSelf: "flex-start",
                                paddingHorizontal: 10,
                                paddingVertical: 3,
                                borderRadius: 6,
                                marginTop: 10
                            }}>
                                <Text style={{
                                    color: colors.primary,
                                    fontSize: 11,
                                    fontFamily: "DMSans-Bold",
                                    textTransform: "uppercase"
                                }}>
                                    CLASS TEACHER
                                </Text>
                            </View>
                        </View>

                        <MaterialIcons name="chevron-right" size={24} color={colors.onSurfaceVariant} />
                    </Card>
                ))
            )}
        </View>
    );

    const renderMySubjectsTab = () => (
        <View>
            {Object.keys(groupedSubjects).length === 0 ? (
                <EmptyState
                    icon="library-books"
                    title="No Subjects Assigned"
                    message={'No subjects have been assigned to you yet. Check "As Class Teacher" tab to see your class.'}
                />
            ) : (
                allMySubjects.map((subj) => (
                    <Card
                        key={subj._id}
                        variant="elevated"
                        onPress={() => router.push({
                            pathname: `/teacher/class/subject/${subj._id}`,
                            params: { id: subj.class._id, subjectId: subj._id }
                        })}
                        style={{
                            marginBottom: 8,
                            marginLeft: 12,
                        }}
                        contentStyle={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center"
                        }}
                    >
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                                <Text style={{
                                    fontSize: 16,
                                    fontFamily: "DMSans-SemiBold",
                                    color: colors.onSurface,
                                    flex: 1
                                }}>
                                    {subj.name} • {subj.class.name}
                                </Text>
                                {subj.isClassTeacher && (
                                    <View style={{
                                        backgroundColor: colors.success + "20",
                                        paddingHorizontal: 6,
                                        paddingVertical: 2,
                                        borderRadius: 4
                                    }}>
                                        <Text style={{
                                            fontSize: 10,
                                            color: colors.success,
                                            fontFamily: "DMSans-Bold"
                                        }}>
                                            MY CLASS
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                        <MaterialIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
                    </Card>
                ))
            )}
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                    />
                }
                contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
                alwaysBounceVertical={true}
                showsVerticalScrollIndicator={false}
            >
                <View style={{ padding: 16, paddingTop: 24 }}>
                    <AppHeader title="My Teaching" subtitle="Manage your classes and subjects" />

                    {/* Quick action tiles — admin-style compact grid */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
                        <Pressable
                            onPress={() => router.push('/teacher/exams-dashboard')}
                            style={({ pressed }) => ({
                                flex: 1,
                                minWidth: '30%',
                                backgroundColor: colors.surfaceContainer,
                                padding: 20,
                                borderRadius: 24,
                                alignItems: 'center',
                                shadowColor: colors.shadow,
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.05,
                                shadowRadius: 12,
                                elevation: 3,
                                borderWidth: 1,
                                borderColor: colors.outlineVariant,
                                opacity: pressed ? 0.9 : 1,
                            })}
                        >
                            <View style={{ backgroundColor: '#E91E6315', padding: 16, borderRadius: 20, marginBottom: 12, alignItems: 'center', justifyContent: 'center' }}>
                                <MaterialIcons name="assignment" size={28} color="#E91E63" />
                            </View>
                            <Text style={{ fontSize: 14, fontFamily: 'DMSans-Bold', color: colors.onSurface, textAlign: 'center' }}>Manage Exams</Text>
                        </Pressable>

                        <Pressable
                            onPress={() => router.push('/teacher/timetable')}
                            style={({ pressed }) => ({
                                flex: 1,
                                minWidth: '30%',
                                backgroundColor: colors.surfaceContainer,
                                padding: 20,
                                borderRadius: 24,
                                alignItems: 'center',
                                shadowColor: colors.shadow,
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.05,
                                shadowRadius: 12,
                                elevation: 3,
                                borderWidth: 1,
                                borderColor: colors.outlineVariant,
                                opacity: pressed ? 0.9 : 1,
                            })}
                        >
                            <View style={{ backgroundColor: '#2196F315', padding: 16, borderRadius: 20, marginBottom: 12, alignItems: 'center', justifyContent: 'center' }}>
                                <MaterialIcons name="schedule" size={28} color="#2196F3" />
                            </View>
                            <Text style={{ fontSize: 14, fontFamily: 'DMSans-Bold', color: colors.onSurface, textAlign: 'center' }}>View Timetable</Text>
                        </Pressable>
                    </View>


                    {loading ? (
                        <View style={{ marginTop: 60 }}>
                            <LoadingState message="Loading dashboard..." />
                        </View>
                    ) : (
                        <>
                            {/* Tab Switcher */}
                            <SegmentedControl
                                tabs={[
                                    { key: 'classTeacher', label: 'As Class Teacher' },
                                    { key: 'mySubjects', label: 'My Subjects' },
                                ]}
                                activeTab={activeTab}
                                onTabChange={setActiveTab}
                                style={{ marginBottom: 20 }}
                            />

                            {/* Tab Content */}
                            {activeTab === 'classTeacher' ? renderClassTeacherTab() : renderMySubjectsTab()}
                        </>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
