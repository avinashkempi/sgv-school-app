import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
} from "react-native";
import AppRefreshControl from "../../components/ui/AppRefreshControl";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme, FONTS, FONT_SIZES } from "../../theme";
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
import { useLabel } from "../../context/LabelsContext";
import Badge from "../../components/ui/Badge";

export default function TeacherDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  // eslint-disable-next-line no-unused-vars
  const { styles, colors } = useTheme();
  const { _showToast } = useToast();
  // eslint-disable-next-line no-unused-vars
  const { user, userId } = useAuth();
  const isStaff = user?.role === "staff" || user?.role === "support_staff";

  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("classTeacher"); // 'classTeacher' or 'mySubjects'
  const { t } = useLabel();

  const {
    data: dashboardData,
    isLoading: loading,
    refetch,
  } = useApiQuery(
    ["teacherDashboard", userId],
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
        queryClient.invalidateQueries({ queryKey: ["teacherDashboard"] }),
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
            <AppRefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          }
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 32,
          }}
          alwaysBounceVertical={true}
          showsVerticalScrollIndicator={false}
        >
          <AppHeader
            title={t("nav.dashboard")}
            subtitle={t("teacher.staffDashboardSubtitle")}
            variant="root"
          />

          <View style={{ marginTop: 12 }}>
            <Card
              variant="elevated"
              onPress={() => router.push("/teacher/timetable")}
              contentStyle={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 20,
              }}
              style={{ marginBottom: 16 }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 16,
                  flex: 1,
                }}
              >
                <View
                  style={{
                    backgroundColor: "#2F6CD415",
                    padding: 12,
                    borderRadius: 14,
                    width: 52,
                    height: 52,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MaterialIcons name="schedule" size={26} color="#2F6CD4" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: FONT_SIZES.md,
                      fontFamily: FONTS.bold,
                      color: colors.onSurface,
                      marginBottom: 4,
                    }}
                  >
                    {t("teacher.schoolTimetable")}
                  </Text>
                  <Text
                    style={{
                      fontSize: FONT_SIZES.sm,
                      color: colors.onSurfaceVariant,
                      fontFamily: FONTS.regular,
                    }}
                  >
                    {t("teacher.viewAllSchedules")}
                  </Text>
                </View>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={24}
                color={colors.onSurfaceVariant}
              />
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
          title={t("teacher.notClassTeacherTitle")}
          message={t("teacher.notClassTeacherMessage")}
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
              alignItems: "center",
            }}
          >
            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: FONT_SIZES.md,
                    fontFamily: FONTS.bold,
                    color: colors.onSurface,
                  }}
                  numberOfLines={1}
                >
                  {formatClassName(cls.name, cls.section)}
                </Text>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  marginTop: 4,
                }}
              >
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <MaterialIcons
                    name="people"
                    size={16}
                    color={colors.onSurfaceVariant}
                  />
                  <Text
                    style={{
                      fontSize: FONT_SIZES.xs,
                      color: colors.onSurfaceVariant,
                      fontFamily: FONTS.medium,
                    }}
                    numberOfLines={1}
                  >
                    {cls.studentCount} {t("common.students")}
                  </Text>
                </View>

                {cls.mySubjects && cls.mySubjects.length > 0 && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <MaterialIcons
                      name="book"
                      size={16}
                      color={colors.onSurfaceVariant}
                    />
                    <Text
                      style={{
                        fontSize: FONT_SIZES.xs,
                        color: colors.onSurfaceVariant,
                        fontFamily: FONTS.medium,
                        flex: 1,
                      }}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {t("common.teaching")}: {cls.mySubjects.join(", ")}
                    </Text>
                  </View>
                )}
              </View>

              <View style={{ marginTop: 10 }}>
                <Badge
                  label={t("teacher.classTeacher")}
                  variant="brand"
                  size="sm"
                />
              </View>
            </View>

            <MaterialIcons
              name="chevron-right"
              size={24}
              color={colors.onSurfaceVariant}
            />
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
          title={t("teacher.noSubjectsTitle")}
          message={t("teacher.noSubjectsMessage")}
        />
      ) : (
        allMySubjects.map((subj) => (
          <Card
            key={subj._id}
            variant="elevated"
            onPress={() =>
              router.push({
                pathname: `/teacher/class/subject/${subj._id}`,
                params: { id: subj.class._id, subjectId: subj._id },
              })
            }
            style={{
              marginBottom: 8,
              marginLeft: 12,
            }}
            contentStyle={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  flex: 1,
                }}
              >
                <Text
                  style={{
                    fontSize: FONT_SIZES.md,
                    fontFamily: FONTS.semiBold,
                    color: colors.onSurface,
                    flex: 1,
                  }}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {subj.name} • {formatClassName(subj.class?.name || subj.class, subj.class?.section)}
                </Text>
                {subj.isClassTeacher && (
                  <Badge
                    label={t("teacher.myClass")}
                    variant="success"
                    size="sm"
                  />
                )}
              </View>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={20}
              color={colors.onSurfaceVariant}
            />
          </Card>
        ))
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        refreshControl={
          <AppRefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 }}
        alwaysBounceVertical={true}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <AppHeader
            title={t("teacher.dashboardTitle")}
            subtitle={t("teacher.dashboardSubtitle")}
            variant="root"
          />

          {/* Quick action tiles — admin-style compact grid */}
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <Pressable
              onPress={() => router.push("/teacher/exams-dashboard")}
              style={({ pressed }) => ({
                flex: 1,
                minWidth: "30%",
                backgroundColor: colors.surfaceContainer,
                padding: 20,
                borderRadius: 24,
                alignItems: "center",
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
              <View
                style={{
                  backgroundColor: colors.primaryContainer || "#E0ECFF",
                  padding: 16,
                  borderRadius: 20,
                  marginBottom: 12,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons name="assignment" size={28} color={colors.primary || "#2F6CD4"} />
              </View>
              <Text
                style={{
                  fontSize: FONT_SIZES.sm,
                  fontFamily: FONTS.bold,
                  color: colors.onSurface,
                  textAlign: "center",
                }}
              >
                {t("teacher.manageExams")}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.push("/teacher/timetable")}
              style={({ pressed }) => ({
                flex: 1,
                minWidth: "30%",
                backgroundColor: colors.surfaceContainer,
                padding: 20,
                borderRadius: 24,
                alignItems: "center",
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
              <View
                style={{
                  backgroundColor: "#2F6CD415",
                  padding: 16,
                  borderRadius: 20,
                  marginBottom: 12,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons name="schedule" size={28} color="#2F6CD4" />
              </View>
              <Text
                style={{
                  fontSize: FONT_SIZES.sm,
                  fontFamily: FONTS.bold,
                  color: colors.onSurface,
                  textAlign: "center",
                }}
              >
                {t("teacher.viewTimetable")}
              </Text>
            </Pressable>
          </View>

          {loading ? (
            <View style={{ marginTop: 60 }}>
              <LoadingState message={t("teacher.loadingDashboard")} />
            </View>
          ) : (
            <>
              {/* Tab Switcher */}
              <SegmentedControl
                tabs={[
                  { key: "classTeacher", label: t("teacher.asClassTeacher") },
                  { key: "mySubjects", label: t("teacher.mySubjects") },
                ]}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                style={{ marginBottom: 20 }}
              />

              {/* Tab Content */}
              {activeTab === "classTeacher"
                ? renderClassTeacherTab()
                : renderMySubjectsTab()}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
