import React, { useState, useEffect, useCallback, memo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  Modal,
  Platform,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { useRouter } from "expo-router";
import { useTheme, FONTS, FONT_SIZES } from "../../theme";
import {
  useApiQuery,
  useApiMutation,
  createApiMutationFn,
} from "../../hooks/useApi";
import { CACHE_TIERS } from "../../utils/cacheConfig";
import apiConfig from "../../config/apiConfig";
import { useQueryClient } from "@tanstack/react-query";
import Header from "../../components/Header";
import { useToast } from "../../components/ToastProvider";
import DateTimePicker from "@react-native-community/datetimepicker";
import { formatClassName } from "../../utils/formatClassName";

// ---------- Memoised row — only re-renders when its own props change ----------
const SubjectMarkRow = memo(function SubjectMarkRow({
  subject,
  isExcluded,
  marks,
  defaultMarks,
  onToggle,
  onChangeMark,
  colors,
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start", // let text block set height; checkbox/input self-center
        paddingVertical: 9,
        borderBottomWidth: 1,
        borderBottomColor: colors.textSecondary + "15",
        gap: 10,
      }}
    >
      {/* Checkbox — alignSelf center so it floats in the middle of the row */}
      <Pressable
        onPress={onToggle}
        hitSlop={10}
        style={{ alignSelf: "center" }}
      >
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            borderWidth: 2,
            borderColor: isExcluded
              ? colors.textSecondary + "50"
              : colors.primary,
            backgroundColor: isExcluded ? "transparent" : colors.primary + "18",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {!isExcluded && (
            <MaterialIcons name="check" size={13} color={colors.primary} />
          )}
        </View>
      </Pressable>

      {/* Subject name + class — flex:1, anchors the row height */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            fontSize: FONT_SIZES.sm,
            fontFamily: FONTS.semiBold,
            color: isExcluded ? colors.textSecondary : colors.textPrimary,
          }}
          numberOfLines={1}
        >
          {subject.name}
        </Text>
        <Text
          style={{
            fontSize: FONT_SIZES.xs,
            color: colors.textSecondary,
            fontFamily: FONTS.regular,
            marginTop: 2,
          }}
          numberOfLines={1}
        >
          {subject.class?.name ? formatClassName(subject.class) : ""}
        </Text>
      </View>

      {/* Marks input — alignSelf center so it floats in the middle of the row */}
      <TextInput
        value={marks ?? defaultMarks}
        onChangeText={onChangeMark}
        keyboardType="numeric"
        editable={!isExcluded}
        maxLength={4}
        style={{
          alignSelf: "center",
          width: 60,
          borderWidth: 1.5,
          borderColor: isExcluded
            ? colors.textSecondary + "20"
            : marks && marks !== defaultMarks
            ? colors.primary
            : colors.textSecondary + "40",
          borderRadius: 8,
          paddingVertical: 5,
          textAlign: "center",
          color: isExcluded ? colors.textSecondary + "60" : colors.textPrimary,
          fontSize: FONT_SIZES.sm,
          fontFamily: FONTS.semiBold,
          backgroundColor: isExcluded
            ? colors.textSecondary + "08"
            : colors.cardBackground,
        }}
      />
    </View>
  );
});
// ---------------------------------------------------------------------------

export default function AdminExamScheduleScreen() {
  const _router = useRouter();
  const { _styles, colors } = useTheme();
  const { showToast } = useToast();

  const queryClient = useQueryClient();
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [deletingExamId, setDeletingExamId] = useState(null);

  // eslint-disable-next-line no-unused-vars
  const [activeTab, setActiveTab] = useState("schedules"); // Reverting tab code but keep string as fallback or remove if not used elsewhere, let's remove it entirely
  // const [statusSearch, setStatusSearch] = useState("");
  // const [statusFilter, setStatusFilter] = useState("All");

  // Edit Date State
  const [editingExam, setEditingExam] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newDate, setNewDate] = useState(new Date());
  const [newRoom, setNewRoom] = useState("");

  const [refreshing, setRefreshing] = useState(false);

  // Fetch Current User
  const { data: userData } = useApiQuery(
    ["currentUser"],
    `${apiConfig.baseUrl}/auth/me`
  );
  const currentUser = userData?.user;

  // Fetch Classes
  const { data: classesData, isLoading: classesLoading } = useApiQuery(
    ["adminClassesInit"],
    `${apiConfig.baseUrl}/classes/admin/init`,
    CACHE_TIERS.STABLE
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const classes = classesData?.classes || [];

  // Set initial selected class
  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0]._id);
    }
  }, [classes, selectedClassId]);

  // Fetch Exams for Selected Class
  const { data: exams = [], isLoading: examsLoading } = useApiQuery(
    ["adminExamSchedule", selectedClassId],
    `${apiConfig.baseUrl}/exams/schedule/class/${selectedClassId}`,
    {
      enabled: !!selectedClassId && activeTab === "schedules",
      ...CACHE_TIERS.STABLE,
    }
  );

  // Removed adminMarksStatus query

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["adminClassesInit"] });
    if (selectedClassId) {
      await queryClient.invalidateQueries({
        queryKey: ["adminExamSchedule", selectedClassId],
      });
    }
    setRefreshing(false);
  };

  const loading = classesLoading || (!!selectedClassId && examsLoading);

  // Update Exam Mutation
  const updateExamMutation = useApiMutation({
    mutationFn: (data) =>
      createApiMutationFn(
        `${apiConfig.baseUrl}/exams/${data.id}`,
        "PUT"
      )(data.body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["adminExamSchedule", selectedClassId],
      });
      showToast("Exam date updated", "success");
      setEditingExam(null);
    },
    onError: (error) =>
      showToast(error.message || "Failed to update date", "error"),
  });

  // Delete Exam Mutation
  const deleteExamMutation = useApiMutation({
    mutationFn: (examId) =>
      createApiMutationFn(`${apiConfig.baseUrl}/exams/${examId}`, "DELETE")(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["adminExamSchedule", selectedClassId],
      });
      showToast("Exam deleted successfully", "success");
      setDeletingExamId(null);
    },
    onError: (error) => {
      showToast(error.message || "Failed to delete exam", "error");
      setDeletingExamId(null);
    },
  });

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setNewDate(selectedDate);
    }
  };

  const saveNewDate = () => {
    if (!editingExam) return;

    updateExamMutation.mutate({
      id: editingExam._id,
      body: {
        date: newDate,
        room: newRoom,
      },
    });
  };

  const handleDeleteExam = (exam) => {
    Alert.alert(
      "Delete Exam",
      `Are you sure you want to delete ${exam.subject?.name} - ${exam.name}? This will also delete all associated marks.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          onPress: () => {
            setDeletingExamId(exam._id);
            deleteExamMutation.mutate(exam._id);
          },
          style: "destructive",
        },
      ]
    );
  };

  const [showInitModal, setShowInitModal] = useState(false);
  const [initType, setInitType] = useState("FA1");
  const [initTotalMarks, setInitTotalMarks] = useState("100");
  const [initDate, setInitDate] = useState(new Date());
  const [initDuration, setInitDuration] = useState("90");
  const [initInstructions, setInitInstructions] = useState("");
  const [showInitDatePicker, setShowInitDatePicker] = useState(false);
  const [initScope, setInitScope] = useState("all"); // "all" or "selected"
  const [initSelectedClassIds, setInitSelectedClassIds] = useState([]);
  // Per-subject marks
  const [showPerSubjectMarks, setShowPerSubjectMarks] = useState(false);
  const [subjectMarksMap, setSubjectMarksMap] = useState({}); // { subjectId: marksString }
  const [excludedSubjectMap, setExcludedSubjectMap] = useState({}); // { subjectId: true } if excluded

  // Stable callbacks — prevent re-creating on every parent render
  const handleToggleSubject = useCallback((subjectId) => {
    setExcludedSubjectMap((prev) => ({
      ...prev,
      [subjectId]: !prev[subjectId],
    }));
  }, []);

  const handleChangeSubjectMark = useCallback((subjectId, value) => {
    setSubjectMarksMap((prev) => ({ ...prev, [subjectId]: value }));
  }, []);

  const initMutation = useApiMutation({
    mutationFn: createApiMutationFn(
      `${apiConfig.baseUrl}/exams/school-wide/init`,
      "POST"
    ),
    onSuccess: (data) => {
      showToast(
        `${data.message}. Created: ${data.created}, Skipped: ${data.skipped}`,
        "success"
      );
      setShowInitModal(false);
      setShowPerSubjectMarks(false);
      setSubjectMarksMap({});
      setExcludedSubjectMap({});
      queryClient.invalidateQueries({ queryKey: ["adminExamSchedule"] });
    },
    onError: (error) =>
      showToast(error.message || "Failed to initialize exams", "error"),
  });

  const handleInitDateChange = (event, selectedDate) => {
    setShowInitDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setInitDate(selectedDate);
    }
  };

  const handleInitialize = () => {
    if (
      !initTotalMarks ||
      isNaN(initTotalMarks) ||
      parseFloat(initTotalMarks) <= 0
    ) {
      showToast("Please enter valid total marks", "error");
      return;
    }

    if (initScope === "selected" && initSelectedClassIds.length === 0) {
      showToast("Please select at least one class", "error");
      return;
    }

    // Build subjectMarks — only include entries with values, coerce to Number
    const subjectMarks = showPerSubjectMarks
      ? Object.fromEntries(
          Object.entries(subjectMarksMap)
            .filter(([_, v]) => v && !isNaN(v) && parseFloat(v) > 0)
            .map(([k, v]) => [k, parseFloat(v)])
        )
      : null;

    initMutation.mutate({
      type: initType,
      totalMarks: parseFloat(initTotalMarks),
      date: initDate.toISOString(),
      instructions: initInstructions,
      duration: initDuration ? parseInt(initDuration) : null,
      classIds: initScope === "selected" ? initSelectedClassIds : null,
      subjectMarks,
      excludedSubjectIds: showPerSubjectMarks
        ? Object.keys(excludedSubjectMap).filter((k) => excludedSubjectMap[k])
        : null,
    });
  };

  // Use actual Subjects from classes data which have class mappings
  const allSubjects = (classesData?.subjects || []).map((subject) => {
    // If class is just an ID, map it to the actual class object for display
    if (typeof subject.class === "string" || !subject.class?.name) {
      const clsObj = classes.find(
        (c) => c._id === (subject.class?._id || subject.class?.toString())
      );
      return { ...subject, class: clsObj || subject.class };
    }
    return subject;
  });

  // When global marks change, update all per-subject marks that haven't been individually customised
  const applyGlobalMarksToSubjects = useCallback(
    (newGlobalMarks) => {
      setSubjectMarksMap((prev) => {
        const updated = {};
        allSubjects.forEach((s) => {
          // overwrite if empty OR still matches old global (hasn't been manually changed)
          updated[s._id] =
            !prev[s._id] || prev[s._id] === initTotalMarks
              ? newGlobalMarks
              : prev[s._id];
        });
        return updated;
      });
    },
    [allSubjects, initTotalMarks]
  );

  // When subjects load or per-subject toggle turns on, pre-fill marks from global default
  useEffect(() => {
    if (showPerSubjectMarks && allSubjects.length > 0) {
      setSubjectMarksMap((prev) => {
        const updated = { ...prev };
        allSubjects.forEach((s) => {
          if (!updated[s._id]) updated[s._id] = initTotalMarks;
        });
        return updated;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPerSubjectMarks, allSubjects.length]);

  if (loading && classes.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 }}>
        <Header title="Exam Management" subtitle="Manage Schedules" showBack />

        <Pressable
          onPress={() => setShowInitModal(true)}
          style={{
            backgroundColor: colors.primary + "15",
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: 10,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 10,
            gap: 6,
            borderWidth: 1,
            borderColor: colors.primary + "30",
          }}
        >
          <MaterialIcons
            name="playlist-add-check"
            size={20}
            color={colors.primary}
          />
          <Text
            style={{
              color: colors.primary,
              fontFamily: FONTS.bold,
              fontSize: FONT_SIZES.sm,
            }}
          >
            Initialize School Exams
          </Text>
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
        <Text
          style={{
            color: colors.textSecondary,
            marginBottom: 6,
            fontSize: FONT_SIZES.xs,
            fontFamily: FONTS.medium,
          }}
        >
          Filter by Class
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {classes.map((cls) => (
              <Pressable
                key={cls._id}
                onPress={() => setSelectedClassId(cls._id)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  backgroundColor:
                    selectedClassId === cls._id
                      ? colors.primary
                      : colors.cardBackground,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor:
                    selectedClassId === cls._id
                      ? colors.primary
                      : colors.textSecondary + "20",
                }}
              >
                <Text
                  style={{
                    color:
                      selectedClassId === cls._id ? "#fff" : colors.textPrimary,
                    fontFamily: FONTS.medium,
                    fontSize: FONT_SIZES.xs,
                  }}
                >
                  {formatClassName(cls.name, cls.section)}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : exams.length === 0 ? (
          <View style={{ alignItems: "center", marginTop: 40, opacity: 0.6 }}>
            <MaterialIcons
              name="event-busy"
              size={40}
              color={colors.textSecondary}
            />
            <Text
              style={{
                color: colors.textSecondary,
                marginTop: 12,
                fontSize: FONT_SIZES.sm,
                fontFamily: FONTS.medium,
              }}
            >
              No exams found for this class
            </Text>
          </View>
        ) : (
          exams.map((exam) => (
            <View
              key={exam._id}
              style={{
                backgroundColor: colors.cardBackground,
                borderRadius: 12,
                padding: 12,
                marginBottom: 10,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                borderWidth: 1,
                borderColor: colors.textSecondary + "08",
              }}
            >
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text
                  style={{
                    fontSize: FONT_SIZES.sm,
                    fontFamily: FONTS.bold,
                    color: colors.textPrimary,
                  }}
                >
                  {exam.subject?.name}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                    marginTop: 2,
                  }}
                >
                  <View
                    style={{
                      paddingHorizontal: 5,
                      paddingVertical: 1.5,
                      backgroundColor: colors.primary + "15",
                      borderRadius: 4,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.primary,
                        fontSize: FONT_SIZES.micro,
                        fontFamily: FONTS.bold,
                      }}
                    >
                      {exam.standardizedType || "EXAM"}
                    </Text>
                  </View>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: 6,
                    gap: 10,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    <MaterialIcons
                      name="calendar-today"
                      size={12}
                      color={colors.textSecondary}
                    />
                    <Text
                      style={{
                        color: colors.textPrimary,
                        fontSize: FONT_SIZES.xs,
                        fontFamily: FONTS.medium,
                      }}
                    >
                      {new Date(exam.date).toLocaleDateString()}
                    </Text>
                  </View>
                  {exam.room && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 3,
                      }}
                    >
                      <MaterialIcons
                        name="meeting-room"
                        size={12}
                        color={colors.textSecondary}
                      />
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontSize: FONT_SIZES.xs,
                          fontFamily: FONTS.medium,
                        }}
                      >
                        {exam.room}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 6 }}>
                <Pressable
                  onPress={() => {
                    setEditingExam(exam);
                    setNewDate(new Date(exam.date));
                    setNewRoom(exam.room || "");
                    setShowDatePicker(true);
                  }}
                  style={{
                    padding: 8,
                    backgroundColor: colors.primary + "10",
                    borderRadius: 8,
                  }}
                >
                  <MaterialIcons name="edit" size={18} color={colors.primary} />
                </Pressable>

                {(currentUser?.role === "admin" ||
                  currentUser?.role === "super admin") && (
                  <Pressable
                    onPress={() => handleDeleteExam(exam)}
                    disabled={deletingExamId === exam._id}
                    style={{
                      padding: 8,
                      backgroundColor: (colors.error || "#ff4444") + "10",
                      borderRadius: 8,
                    }}
                  >
                    {deletingExamId === exam._id ? (
                      <ActivityIndicator
                        size={18}
                        color={colors.error || "#ff4444"}
                      />
                    ) : (
                      <MaterialIcons
                        name="delete"
                        size={18}
                        color={colors.error || "#ff4444"}
                      />
                    )}
                  </Pressable>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Date Picker Modal */}
      {editingExam && (
        <Modal
          transparent={true}
          visible={!!editingExam}
          animationType="fade"
          onRequestClose={() => setEditingExam(null)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.5)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <View
              style={{
                backgroundColor: colors.cardBackground,
                width: "85%",
                borderRadius: 16,
                padding: 20,
              }}
            >
              <Text
                style={{
                  fontSize: FONT_SIZES.md,
                  fontFamily: FONTS.bold,
                  color: colors.textPrimary,
                  marginBottom: 12,
                }}
              >
                Reschedule Exam
              </Text>
              <Text
                style={{
                  fontSize: FONT_SIZES.xs,
                  color: colors.textSecondary,
                  marginBottom: 16,
                  fontFamily: FONTS.medium,
                }}
              >
                {editingExam.subject?.name} - {editingExam.name}
              </Text>

              <View style={{ marginBottom: 16 }}>
                <Text
                  style={{
                    color: colors.textSecondary,
                    marginBottom: 6,
                    fontSize: FONT_SIZES.xs,
                    fontFamily: FONTS.medium,
                  }}
                >
                  Date
                </Text>
                <View style={{ alignItems: "center" }}>
                  {showDatePicker && (
                    <DateTimePicker
                      value={newDate}
                      mode="date"
                      display="default"
                      onChange={handleDateChange}
                      minimumDate={new Date()}
                    />
                  )}
                  {Platform.OS === "android" && (
                    <Pressable
                      onPress={() => setShowDatePicker(true)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        padding: 10,
                        borderWidth: 1,
                        borderColor: colors.textSecondary + "40",
                        borderRadius: 8,
                        width: "100%",
                        justifyContent: "center",
                      }}
                    >
                      <MaterialIcons
                        name="calendar-today"
                        size={18}
                        color={colors.primary}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={{
                          color: colors.textPrimary,
                          fontSize: FONT_SIZES.sm,
                          fontFamily: FONTS.medium,
                        }}
                      >
                        {newDate.toLocaleDateString()}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>

              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    color: colors.textSecondary,
                    marginBottom: 6,
                    fontSize: FONT_SIZES.xs,
                    fontFamily: FONTS.medium,
                  }}
                >
                  Room Number
                </Text>
                <TextInput
                  value={newRoom}
                  onChangeText={setNewRoom}
                  placeholder="e.g. Room 101"
                  placeholderTextColor={colors.textSecondary + "80"}
                  style={{
                    borderWidth: 1,
                    borderColor: colors.textSecondary + "40",
                    borderRadius: 8,
                    padding: 10,
                    color: colors.textPrimary,
                    fontSize: FONT_SIZES.sm,
                    fontFamily: FONTS.medium,
                  }}
                />
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  onPress={() => setEditingExam(null)}
                  style={{
                    flex: 1,
                    padding: 10,
                    alignItems: "center",
                    borderRadius: 8,
                    backgroundColor: colors.background,
                  }}
                >
                  <Text
                    style={{
                      color: colors.textPrimary,
                      fontFamily: FONTS.bold,
                      fontSize: FONT_SIZES.sm,
                    }}
                  >
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  onPress={saveNewDate}
                  disabled={updateExamMutation.isPending}
                  style={{
                    flex: 1,
                    padding: 10,
                    alignItems: "center",
                    borderRadius: 8,
                    backgroundColor: colors.primary,
                  }}
                >
                  {updateExamMutation.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text
                      style={{
                        color: "#fff",
                        fontFamily: FONTS.bold,
                        fontSize: FONT_SIZES.sm,
                      }}
                    >
                      Save
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* School-wide Initialization Modal */}
      <Modal
        transparent={true}
        visible={showInitModal}
        animationType="slide"
        onRequestClose={() => setShowInitModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              maxHeight: "90%",
            }}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 14,
                }}
              >
                <Text
                  style={{
                    fontSize: FONT_SIZES.md,
                    fontFamily: FONTS.bold,
                    color: colors.textPrimary,
                  }}
                >
                  Initialize Exams
                </Text>
                <Pressable onPress={() => setShowInitModal(false)}>
                  <MaterialIcons
                    name="close"
                    size={22}
                    color={colors.textSecondary}
                  />
                </Pressable>
              </View>

              <Text
                style={{
                  fontSize: FONT_SIZES.xs,
                  color: colors.textSecondary,
                  marginBottom: 16,
                  fontFamily: FONTS.regular,
                }}
              >
                This will create the selected exam type for the selected scope
                where it does not exist yet.
              </Text>

              {/* Scope Selection */}
              <View style={{ marginBottom: 14 }}>
                <Text
                  style={{
                    fontSize: FONT_SIZES.xs,
                    fontFamily: FONTS.medium,
                    color: colors.textSecondary,
                    marginBottom: 6,
                  }}
                >
                  Scope *
                </Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable
                    onPress={() => setInitScope("all")}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      backgroundColor:
                        initScope === "all"
                          ? colors.primary
                          : colors.cardBackground,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor:
                        initScope === "all"
                          ? colors.primary
                          : colors.textSecondary + "20",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color:
                          initScope === "all" ? "#fff" : colors.textPrimary,
                        fontFamily: FONTS.medium,
                        fontSize: FONT_SIZES.xs,
                      }}
                    >
                      All Classes
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setInitScope("selected")}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      backgroundColor:
                        initScope === "selected"
                          ? colors.primary
                          : colors.cardBackground,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor:
                        initScope === "selected"
                          ? colors.primary
                          : colors.textSecondary + "20",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color:
                          initScope === "selected"
                            ? "#fff"
                            : colors.textPrimary,
                        fontFamily: FONTS.medium,
                        fontSize: FONT_SIZES.xs,
                      }}
                    >
                      Specific Classes
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Class Selection (Multi-select) */}
              {initScope === "selected" && (
                <View style={{ marginBottom: 14 }}>
                  <Text
                    style={{
                      fontSize: FONT_SIZES.xs,
                      fontFamily: FONTS.medium,
                      color: colors.textSecondary,
                      marginBottom: 6,
                    }}
                  >
                    Select Classes *
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ maxHeight: 42 }}
                  >
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      {classes.map((cls) => {
                        const isSelected = initSelectedClassIds.includes(
                          cls._id
                        );
                        return (
                          <Pressable
                            key={cls._id}
                            onPress={() => {
                              if (isSelected) {
                                setInitSelectedClassIds((prev) =>
                                   prev.filter((id) => id !== cls._id)
                                );
                              } else {
                                setInitSelectedClassIds((prev) => [
                                  ...prev,
                                  cls._id,
                                ]);
                              }
                            }}
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              backgroundColor: isSelected
                                ? colors.primary
                                : colors.cardBackground,
                              borderRadius: 16,
                              borderWidth: 1,
                              borderColor: isSelected
                                ? colors.primary
                                : colors.textSecondary + "20",
                            }}
                          >
                            <Text
                              style={{
                                color: isSelected ? "#fff" : colors.textPrimary,
                                fontSize: FONT_SIZES.xs,
                                fontFamily: FONTS.medium,
                              }}
                            >
                              {formatClassName(cls.name, cls.section)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </ScrollView>
                  {initSelectedClassIds.length === 0 && (
                    <Text style={{ color: "red", fontSize: FONT_SIZES.xs, marginTop: 4 }}>
                      Please select at least one class
                    </Text>
                  )}
                </View>
              )}

              {/* Exam Type Selection */}
              <View style={{ marginBottom: 14 }}>
                <Text
                  style={{
                    fontSize: FONT_SIZES.xs,
                    fontFamily: FONTS.medium,
                    color: colors.textSecondary,
                    marginBottom: 6,
                  }}
                >
                  Exam Type *
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    {["FA1", "FA2", "SA1", "FA3", "FA4", "SA2"].map((type) => (
                      <Pressable
                        key={type}
                        onPress={() => setInitType(type)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          backgroundColor:
                            initType === type
                              ? colors.primary
                              : colors.cardBackground,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor:
                            initType === type
                              ? colors.primary
                              : colors.textSecondary + "20",
                        }}
                      >
                        <Text
                          style={{
                            color:
                              initType === type ? "#fff" : colors.textPrimary,
                            fontFamily: FONTS.medium,
                            fontSize: FONT_SIZES.xs,
                          }}
                        >
                          {type}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Total Marks */}
              <View style={{ marginBottom: 14 }}>
                <Text
                  style={{
                    fontSize: FONT_SIZES.xs,
                    fontFamily: FONTS.medium,
                    color: colors.textSecondary,
                    marginBottom: 6,
                  }}
                >
                  Default Total Marks *
                </Text>
                <TextInput
                  value={initTotalMarks}
                  onChangeText={(v) => {
                    setInitTotalMarks(v);
                    if (showPerSubjectMarks) applyGlobalMarksToSubjects(v);
                  }}
                  keyboardType="numeric"
                  placeholder="100"
                  placeholderTextColor={colors.textSecondary + "80"}
                  style={{
                    backgroundColor: colors.cardBackground,
                    padding: 10,
                    borderRadius: 10,
                    color: colors.textPrimary,
                    fontSize: FONT_SIZES.sm,
                    fontFamily: FONTS.regular,
                    borderWidth: 1,
                    borderColor: colors.textSecondary + "20",
                  }}
                />
              </View>

              {/* Per-Subject Marks Toggle */}
              <Pressable
                onPress={() => setShowPerSubjectMarks((v) => !v)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 10,
                  gap: 8,
                }}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 5,
                    borderWidth: 2,
                    borderColor: showPerSubjectMarks
                      ? colors.primary
                      : colors.textSecondary + "60",
                    backgroundColor: showPerSubjectMarks
                      ? colors.primary
                      : "transparent",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  {showPerSubjectMarks && (
                    <MaterialIcons name="check" size={13} color="#fff" />
                  )}
                </View>
                <Text
                  style={{
                    fontSize: FONT_SIZES.xs,
                    fontFamily: FONTS.medium,
                    color: colors.textPrimary,
                  }}
                >
                  Set different marks per subject
                </Text>
              </Pressable>

              {/* Per-Subject Marks List */}
              {showPerSubjectMarks && (
                <View
                  style={{
                    backgroundColor: colors.background,
                    borderRadius: 10,
                    padding: 10,
                    marginBottom: 14,
                    borderWidth: 1,
                    borderColor: colors.textSecondary + "20",
                  }}
                >
                  {allSubjects.length === 0 ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    allSubjects
                      .filter((s) => {
                        if (
                          initScope === "selected" &&
                          initSelectedClassIds.length > 0
                        ) {
                          return initSelectedClassIds.includes(
                            s.class?._id || s.class?.toString()
                          );
                        }
                        return true;
                      })
                      .sort((a, b) => {
                        const ca = (a.class?.name || "").toLowerCase();
                        const cb = (b.class?.name || "").toLowerCase();
                        if (ca !== cb) return ca.localeCompare(cb);
                        return a.name
                          .toLowerCase()
                          .localeCompare(b.name.toLowerCase());
                      })
                      .map((subject) => (
                        <SubjectMarkRow
                          key={subject._id}
                          subject={subject}
                          isExcluded={!!excludedSubjectMap[subject._id]}
                          marks={subjectMarksMap[subject._id]}
                          defaultMarks={initTotalMarks}
                          onToggle={() => handleToggleSubject(subject._id)}
                          onChangeMark={(v) =>
                            handleChangeSubjectMark(subject._id, v)
                          }
                          colors={colors}
                        />
                      ))
                  )}
                </View>
              )}

              {/* Date */}
              <View style={{ marginBottom: 14 }}>
                <Text
                  style={{
                    fontSize: FONT_SIZES.xs,
                    fontFamily: FONTS.medium,
                    color: colors.textSecondary,
                    marginBottom: 6,
                  }}
                >
                  Exam Date
                </Text>
                <Pressable
                  onPress={() => setShowInitDatePicker(true)}
                  style={{
                    backgroundColor: colors.cardBackground,
                    padding: 10,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: colors.textSecondary + "20",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Text
                    style={{
                      fontSize: FONT_SIZES.sm,
                      fontFamily: FONTS.regular,
                      color: colors.textPrimary,
                    }}
                  >
                    {initDate.toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </Text>
                  <MaterialIcons
                    name="calendar-today"
                    size={18}
                    color={colors.textSecondary}
                  />
                </Pressable>
                {showInitDatePicker && (
                  <DateTimePicker
                    value={initDate}
                    mode="date"
                    display="default"
                    onChange={handleInitDateChange}
                  />
                )}
              </View>

              {/* Duration */}
              <View style={{ marginBottom: 14 }}>
                <Text
                  style={{
                    fontSize: FONT_SIZES.xs,
                    fontFamily: FONTS.medium,
                    color: colors.textSecondary,
                    marginBottom: 6,
                  }}
                >
                  Duration (minutes)
                </Text>
                <TextInput
                  value={initDuration}
                  onChangeText={setInitDuration}
                  keyboardType="numeric"
                  placeholder="90"
                  placeholderTextColor={colors.textSecondary + "80"}
                  style={{
                    backgroundColor: colors.cardBackground,
                    padding: 10,
                    borderRadius: 10,
                    color: colors.textPrimary,
                    fontSize: FONT_SIZES.sm,
                    fontFamily: FONTS.regular,
                    borderWidth: 1,
                    borderColor: colors.textSecondary + "20",
                  }}
                />
              </View>

              {/* Instructions */}
              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    fontSize: FONT_SIZES.xs,
                    fontFamily: FONTS.medium,
                    color: colors.textSecondary,
                    marginBottom: 6,
                  }}
                >
                  Instructions (Optional)
                </Text>
                <TextInput
                  value={initInstructions}
                  onChangeText={setInitInstructions}
                  multiline
                  numberOfLines={3}
                  placeholder="Enter instructions..."
                  placeholderTextColor={colors.textSecondary + "80"}
                  textAlignVertical="top"
                  style={{
                    backgroundColor: colors.cardBackground,
                    padding: 10,
                    borderRadius: 10,
                    color: colors.textPrimary,
                    fontSize: FONT_SIZES.sm,
                    fontFamily: FONTS.regular,
                    borderWidth: 1,
                    borderColor: colors.textSecondary + "20",
                    minHeight: 70,
                  }}
                />
              </View>

              {/* Submit Button */}
              <Pressable
                onPress={handleInitialize}
                disabled={initMutation.isPending}
                style={({ pressed }) => ({
                  backgroundColor: colors.primary,
                  borderRadius: 10,
                  padding: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  opacity: pressed || initMutation.isPending ? 0.7 : 1,
                })}
              >
                {initMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialIcons
                      name="playlist-add-check"
                      size={20}
                      color="#fff"
                    />
                    <Text
                      style={{
                        fontSize: FONT_SIZES.sm,
                        fontFamily: FONTS.bold,
                        color: "#fff",
                      }}
                    >
                      Initialize Exams
                    </Text>
                  </>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
