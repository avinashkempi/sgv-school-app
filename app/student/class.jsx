import React, { useState, useRef } from "react";
import {
    View,
    Text,
    ScrollView,
    ActivityIndicator,
    Pressable,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../../theme";
import apiConfig from "../../config/apiConfig";
import { useToast } from "../../components/ToastProvider";
import Header from "../../components/Header";
import { useLabel } from "../../context/LabelsContext";
import { useApiQuery } from "../../hooks/useApi";
import { formatClassName } from "../../utils/formatClassName";
import { useAuth } from "../../context/AuthContext";
import useTabScrollToTop from "../../hooks/useTabScrollToTop";
import AppRefreshControl from "../../components/ui/AppRefreshControl";

export default function StudentClassScreen() {
    const router = useRouter();
    const { styles, colors } = useTheme();
    const { t } = useLabel();
    const { _showToast } = useToast();
    const [refreshing, setRefreshing] = useState(false);
    const { user } = useAuth();
    const scrollRef = useRef(null);

    // Mobile standard gestures
    useTabScrollToTop(scrollRef, '/student/class');

    const classId = user?.currentClass?._id || user?.currentClass;

    // Fetch Class Details
    const { data, isLoading: loading, refetch } = useApiQuery(
        ['studentClassDetails', classId],
        `${apiConfig.baseUrl}/classes/${classId}/full-details`,
        { enabled: !!classId }
    );

    const classData = data?.classData;
    const subjects = data?.subjects || [];

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    if (!classData) {
        return (
            <ScrollView
                ref={scrollRef}
                contentContainerStyle={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}
                refreshControl={<AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                scrollsToTop={true}
                keyboardShouldPersistTaps="handled"
            >
                <MaterialIcons name="school" size={64} color={colors.textSecondary} />
                <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginTop: 16, textAlign: "center" }}>
                    {t('student.noClassAssigned', 'No Class Assigned')}
                </Text>
                <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: "center", fontFamily: "DMSans-Regular" }}>
                    {t('student.contactAdminForClass', 'Please contact your administrator to be assigned to a class.')}
                </Text>
            </ScrollView>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView
                ref={scrollRef}
                refreshControl={<AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                contentContainerStyle={{ paddingBottom: 24 }}
                showsVerticalScrollIndicator={false}
                scrollsToTop={true}
                keyboardShouldPersistTaps="handled"
            >
                <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
                    <Header
                        title={formatClassName(classData.name)}
                        subtitle={`${t('common.section', 'Section')} ${classData.section || t('common.na', 'N/A')} • ${classData.academicYear?.name || ''}`}
                    />

                    {loading ? (
                        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", marginTop: 100 }}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : (
                        <View style={{ gap: 24 }}>
                            <View>


                                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                                    <MenuCard
                                        title={t('student.reportCard', 'Report Card')}
                                        icon="assessment"
                                        color="#FF9800"
                                        onPress={() => router.push("/student/report-card")}
                                    />
                                    <MenuCard
                                        title={t('student.timetable', 'Timetable')}
                                        icon="calendar-today"
                                        color="#009688"
                                        onPress={() => router.push("/student/timetable")}
                                    />
                                    <MenuCard
                                        title={t('student.fees', 'Fees')}
                                        icon="attach-money"
                                        color="#FF5722"
                                        onPress={() => router.push("/student/fees")}
                                    />
                                    <MenuCard
                                        title={t('student.exams', 'Exams')}
                                        icon="event"
                                        color="#E91E63"
                                        onPress={() => router.push("/student/exam-schedule")}
                                    />
                                </View>
                            </View>

                            <View>


                                {subjects.length === 0 ? (
                                    <View style={{ alignItems: "center", marginTop: 40, opacity: 0.6 }}>
                                        <MaterialIcons name="library-books" size={48} color={colors.textSecondary} />
                                        <Text style={{ color: colors.textSecondary, marginTop: 16, fontSize: 16, fontFamily: "DMSans-Medium" }}>
                                            {t('student.noSubjectsYet', 'No subjects added yet.')}
                                        </Text>
                                    </View>
                                ) : (
                                    <View style={{ gap: 12 }}>
                                        {subjects.map((subject) => (
                                            <Pressable
                                                key={subject._id}
                                                onPress={() => router.push({
                                                    pathname: "/student/class/subject/[subjectId]",
                                                    params: { id: classData._id, subjectId: subject._id }
                                                })}
                                                style={({ pressed }) => [
                                                    styles.cardMinimal,
                                                    {
                                                        flexDirection: "row",
                                                        justifyContent: "space-between",
                                                        alignItems: "center",
                                                        padding: 16,
                                                        opacity: pressed ? 0.9 : 1,
                                                    }
                                                ]}
                                            >
                                                <View style={{ flexDirection: "row", alignItems: "center", gap: 14, flex: 1 }}>
                                                    <View style={{
                                                        backgroundColor: colors.primary + "15",
                                                        padding: 12,
                                                        borderRadius: 12
                                                    }}>
                                                        <MaterialIcons name="book" size={24} color={colors.primary} />
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={{
                                                            fontSize: 16,
                                                            fontFamily: "DMSans-Bold",
                                                            color: colors.textPrimary,
                                                            marginBottom: 4
                                                        }}>
                                                            {subject.name}
                                                        </Text>
                                                        {subject.teachers && subject.teachers.length > 0 ? (
                                                            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                                                <MaterialIcons name="person" size={14} color={colors.textSecondary} />
                                                                <Text style={{
                                                                    fontSize: 13,
                                                                    color: colors.textSecondary,
                                                                    fontFamily: "DMSans-Medium"
                                                                }}>
                                                                    {subject.teachers.map(t => t.name).join(", ")}
                                                                </Text>
                                                            </View>
                                                        ) : (
                                                            <Text style={{
                                                                fontSize: 12,
                                                                color: colors.textSecondary,
                                                                fontStyle: "italic",
                                                                fontFamily: "DMSans-Regular"
                                                            }}>
                                                                {t('student.noTeacherAssigned', 'No teacher assigned')}
                                                            </Text>
                                                        )}
                                                    </View>
                                                </View>
                                                <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
                                            </Pressable>
                                        ))}
                                    </View>
                                )}
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

// Helper Component for Menu Cards
const MenuCard = ({ title, icon, color, onPress }) => {
    const { colors } = useTheme();

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => ({
                flex: 1,
                minWidth: "45%",
                backgroundColor: colors.cardBackground,
                padding: 20,
                borderRadius: 24,
                alignItems: "center",
                opacity: pressed ? 0.9 : 1,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.05,
                shadowRadius: 12,
                elevation: 3,
                borderWidth: 1,
                borderColor: colors.border
            })}
        >
            <View style={{
                backgroundColor: color + "15",
                padding: 16,
                borderRadius: 20,
                marginBottom: 12
            }}>
                <MaterialIcons name={icon} size={28} color={color} />
            </View>
            <Text style={{
                fontSize: 15,
                fontFamily: "DMSans-Bold",
                color: colors.textPrimary,
                textAlign: "center"
            }}>
                {title}
            </Text>
        </Pressable>
    );
};
