import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Linking,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme, FONTS, FONT_SIZES, LETTER_SPACINGS } from "../../theme";
import { useApiQuery } from "../../hooks/useApi";
import { useToast } from "../../components/ToastProvider";
import apiConfig from "../../config/apiConfig";
import Header from "../../components/Header";
import { LinearGradient } from "expo-linear-gradient";

/**
 * Year Details Screen
 * Comprehensive view of an academic year with all statistics and data
 */
export default function YearDetailsScreen() {
  // eslint-disable-next-line no-unused-vars
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState("overview"); // overview, students, exams, reports

  const yearId = params.yearId;

  // Fetch year details
  const {
    data: yearData,
    isLoading,
    isFetching,
    refetch,
  } = useApiQuery(
    ["yearDetails", yearId],
    `${apiConfig.baseUrl}/academic-year/${yearId}/comprehensive-report`,
    { enabled: !!yearId }
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const year = yearData?.year;
  const snapshot = yearData?.snapshot;

  const getStatusColor = () => {
    if (year?.status === "current") return colors.success;
    if (year?.status === "archived") return colors.onSurfaceVariant;
    if (year?.status === "draft") return colors.primary;
    return colors.onSurface;
  };

  const getStatusIcon = () => {
    if (year?.status === "current") return "check-circle";
    if (year?.status === "archived") return "archive";
    if (year?.status === "draft") return "schedule";
    return "circle";
  };

  const renderOverview = () => {
    if (!snapshot) {
      return (
        <View style={{ paddingVertical: 40, alignItems: "center" }}>
          <MaterialIcons
            name="info-outline"
            size={48}
            color={colors.onSurfaceVariant}
            style={{ opacity: 0.5 }}
          />
          <Text
            style={{
              marginTop: 16,
              fontSize: FONT_SIZES.sm,
              fontFamily: FONTS.medium,
              color: colors.onSurfaceVariant,
            }}
          >
            No statistics available for this year
          </Text>
        </View>
      );
    }

    return (
      <View>
        {/* Key Metrics Grid */}
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <MetricCard
            icon="people"
            label="Total Students"
            value={snapshot.totalStudents}
            color={colors.primary}
          />
          <MetricCard
            icon="class"
            label="Total Classes"
            value={snapshot.totalClasses}
            color={colors.secondary}
          />
          <MetricCard
            icon="school"
            label="Total Exams"
            value={snapshot.totalExams}
            color={colors.tertiary}
          />
          <MetricCard
            icon="payments"
            label="Fee Collection"
            value={`${(
              (snapshot.totalFeeCollected / (snapshot.totalFeeExpected || 1)) *
              100
            ).toFixed(0)}%`}
            color={colors.success}
          />
          <MetricCard
            icon="book"
            label="Subjects"
            value={snapshot.totalSubjects}
            color="#FF9800"
          />
          <MetricCard
            icon="person"
            label="Teachers"
            value={snapshot.totalTeachers}
            color="#9C27B0"
          />
          <MetricCard
            icon="how-to-reg"
            label="Avg Attendance"
            value={`${snapshot.averageAttendance?.toFixed(1) || 0}%`}
            color="#4CAF50"
          />
        </View>

        {/* Additional Info */}
        {snapshot.capturedAt && (
          <View
            style={{
              backgroundColor: colors.surfaceContainerHighest,
              borderRadius: 12,
              padding: 14,
              marginTop: 8,
            }}
          >
            <Text
              style={{
                fontSize: FONT_SIZES.sm,
                fontFamily: FONTS.medium,
                color: colors.onSurfaceVariant,
              }}
            >
              Snapshot captured on{" "}
              {new Date(snapshot.capturedAt).toLocaleString()}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderTabs = () => (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: colors.surfaceContainerLow,
        borderRadius: 12,
        padding: 4,
        marginVertical: 16,
      }}
    >
      {[
        { id: "overview", label: "Overview", icon: "dashboard" },
        { id: "students", label: "Students", icon: "people" },
        { id: "exams", label: "Exams", icon: "school" },
        { id: "reports", label: "Reports", icon: "description" },
      ].map((tab) => (
        <Pressable
          key={tab.id}
          onPress={() => setSelectedTab(tab.id)}
          style={({ pressed }) => ({
            flex: 1,
            paddingVertical: 10,
            borderRadius: 8,
            backgroundColor:
              selectedTab === tab.id
                ? colors.primary
                : pressed
                ? colors.surfaceContainerHigh
                : "transparent",
            alignItems: "center",
            justifyContent: "center",
          })}
        >
          <Text
            style={{
              fontSize: FONT_SIZES.sm,
              fontFamily: FONTS.bold,
              color:
                selectedTab === tab.id ? "#FFFFFF" : colors.onSurfaceVariant,
            }}
          >
            {tab.label}
          </Text>
        </Pressable>
      ))}
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
          />
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <View style={{ padding: 16, paddingTop: 24 }}>
          <Header
            title={year?.name || "Academic Year"}
            subtitle="Academic Year Details"
            showBack
          />

          {isLoading && !yearData ? (
            <View
              style={{
                paddingVertical: 48,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ActivityIndicator size="large" color={colors.primary} />
              <Text
                style={{
                  fontSize: FONT_SIZES.sm,
                  fontFamily: FONTS.medium,
                  color: colors.onSurfaceVariant,
                  marginTop: 12,
                }}
              >
                Loading academic year details...
              </Text>
            </View>
          ) : !year ? (
            <View
              style={{
                paddingVertical: 48,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcons
                name="error-outline"
                size={56}
                color={colors.error}
                style={{ opacity: 0.5 }}
              />
              <Text
                style={{
                  fontSize: FONT_SIZES.md,
                  fontFamily: FONTS.bold,
                  color: colors.onSurface,
                  marginTop: 16,
                }}
              >
                Year not found
              </Text>
            </View>
          ) : (
            <View style={{ opacity: isFetching && !isLoading ? 0.85 : 1 }}>
              {/* Year Info Card */}
              <View
                style={{
                  marginTop: 20,
                  borderRadius: 16,
                  overflow: "hidden",
                  borderWidth: 1,
                  borderColor: colors.outlineVariant,
                }}
              >
                {/* Header with status */}
                {year.status === "current" && (
                  <LinearGradient
                    colors={[colors.success, colors.successContainer]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ padding: 14 }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <MaterialIcons name="star" size={18} color="#FFF" />
                      <Text
                        style={{
                          fontSize: FONT_SIZES.sm,
                          fontFamily: FONTS.bold,
                          color: "#FFF",
                          textTransform: "uppercase",
                          letterSpacing: LETTER_SPACINGS.micro,
                        }}
                      >
                        CURRENT ACADEMIC YEAR
                      </Text>
                    </View>
                  </LinearGradient>
                )}

                <View
                  style={{
                    backgroundColor: colors.surfaceContainerLow,
                    padding: 16,
                  }}
                >
                  {/* Status Badge */}
                  {year.status !== "current" && (
                    <View
                      style={{
                        alignSelf: "flex-start",
                        backgroundColor: getStatusColor() + "20",
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 8,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 12,
                      }}
                    >
                      <MaterialIcons
                        name={getStatusIcon()}
                        size={16}
                        color={getStatusColor()}
                      />
                      <Text
                        style={{
                          fontSize: FONT_SIZES.sm,
                          fontFamily: FONTS.bold,
                          color: getStatusColor(),
                          textTransform: "uppercase",
                        }}
                      >
                        {year.status}
                      </Text>
                    </View>
                  )}

                  {/* Dates */}
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 16,
                      marginBottom: year.description ? 12 : 0,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: FONT_SIZES.xs,
                          fontFamily: FONTS.medium,
                          color: colors.onSurfaceVariant,
                          marginBottom: 4,
                        }}
                      >
                        Start Date
                      </Text>
                      <Text
                        style={{
                          fontSize: FONT_SIZES.md,
                          fontFamily: FONTS.bold,
                          color: colors.onSurface,
                        }}
                      >
                        {new Date(year.startDate).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: FONT_SIZES.xs,
                          fontFamily: FONTS.medium,
                          color: colors.onSurfaceVariant,
                          marginBottom: 4,
                        }}
                      >
                        End Date
                      </Text>
                      <Text
                        style={{
                          fontSize: FONT_SIZES.md,
                          fontFamily: FONTS.bold,
                          color: colors.onSurface,
                        }}
                      >
                        {new Date(year.endDate).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </Text>
                    </View>
                  </View>

                  {/* Description */}
                  {year.description && (
                    <Text
                      style={{
                        fontSize: FONT_SIZES.sm,
                        fontFamily: FONTS.regular,
                        color: colors.onSurfaceVariant,
                        marginTop: 8,
                      }}
                    >
                      {year.description}
                    </Text>
                  )}
                </View>
              </View>

              {/* Tabs */}
              {renderTabs()}

              {/* Content based on selected tab */}
              {selectedTab === "overview" && renderOverview()}
              {selectedTab === "students" && (
                <ComingSoonPlaceholder
                  icon="people"
                  text="Student analytics coming soon"
                />
              )}
              {selectedTab === "exams" && (
                <ComingSoonPlaceholder
                  icon="school"
                  text="Exam details coming soon"
                />
              )}
              {selectedTab === "reports" && (
                <ComingSoonPlaceholder
                  icon="description"
                  text="Report generation coming soon"
                />
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action FAB */}
      <Pressable
        onPress={async () => {
          try {
            const token = await AsyncStorage.getItem("token");
            if (!token) {
              showToast("Authentication required", "error");
              return;
            }
            const url = `${apiConfig.baseUrl}/fee-enhancements/export-arrears/${yearId}?token=${token}`;
            await Linking.openURL(url);
            showToast("Export started", "success");
          } catch (error) {
            console.error("Download error:", error);
            showToast("Failed to start download", "error");
          }
        }}
        style={({ pressed }) => ({
          position: "absolute",
          bottom: 20,
          right: 20,
          backgroundColor: pressed ? colors.secondary + "DD" : colors.secondary,
          width: 56,
          height: 56,
          borderRadius: 28,
          alignItems: "center",
          justifyContent: "center",
          elevation: 4,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
        })}
      >
        <MaterialIcons name="file-download" size={28} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

// Helper Components
function MetricCard({ icon, label, value, color }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        minWidth: "45%",
        backgroundColor: colors.surfaceContainerLow,
        borderRadius: 12,
        padding: 14,
        borderLeftWidth: 4,
        borderLeftColor: color,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          marginBottom: 8,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: color + "20",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialIcons name={icon} size={20} color={color} />
        </View>
        <Text
          style={{
            fontSize: FONT_SIZES.xs,
            fontFamily: FONTS.medium,
            color: colors.onSurfaceVariant,
            flex: 1,
          }}
        >
          {label}
        </Text>
      </View>
      <Text style={{ fontSize: FONT_SIZES.lg, fontFamily: FONTS.bold, color }}>
        {value}
      </Text>
    </View>
  );
}

function ComingSoonPlaceholder({ icon, text }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        paddingVertical: 60,
        alignItems: "center",
        backgroundColor: colors.surfaceContainerHighest,
        borderRadius: 16,
      }}
    >
      <MaterialIcons
        name={icon}
        size={48}
        color={colors.onSurfaceVariant}
        style={{ opacity: 0.5 }}
      />
      <Text
        style={{
          marginTop: 16,
          fontSize: FONT_SIZES.sm,
          fontFamily: FONTS.medium,
          color: colors.onSurfaceVariant,
        }}
      >
        {text}
      </Text>
    </View>
  );
}
