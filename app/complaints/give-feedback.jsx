import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import {
  useTheme,
  FONTS,
  FONT_SIZES,
  SPACING,
  RADIUS,
  ICON_SIZES,
} from "../../theme";
import apiConfig from "../../config/apiConfig";
import {
  useApiMutation,
  createApiMutationFn,
  useApiQuery,
} from "../../hooks/useApi";
import { useQueryClient } from "@tanstack/react-query";
import Header from "../../components/Header";
import Button from "../../components/Button";
import TextInput from "../../components/TextInput";
import UserAvatar from "../../components/ui/UserAvatar";
import { useLabel } from "../../context/LabelsContext";
import { useToast } from "../../components/ToastProvider";
import { formatClassName } from "../../utils/formatClassName";
import { useAuth } from "../../context/AuthContext";

export default function GiveFeedbackScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLabel();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { user, userId } = useAuth();
  const userRole = user?.role;

  // Form inputs
  const [message, setMessage] = useState("");
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);

  // Filtered data states
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);

  // UI States
  const [showClassModal, setShowClassModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [classSearch, setClassSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");

  const isAdmin = userRole === "admin" || userRole === "super admin";

  // Fetch Teacher's Classes and Subjects (for teachers)
  const { data: teacherData, isLoading: loadingTeacherClasses } = useApiQuery(
    ["myClassesAndSubjects", userId],
    `${apiConfig.baseUrl}/teachers/my-classes-and-subjects`,
    { enabled: userRole === "teacher" && !!userId }
  );

  // Fetch All Classes (for admins)
  const { data: allClassesData, isLoading: loadingAllClasses } = useApiQuery(
    ["allClassesForFeedback"],
    `${apiConfig.baseUrl}/classes`,
    { enabled: isAdmin }
  );

  const loadingClasses = loadingTeacherClasses || loadingAllClasses;

  // Build classes list based on role
  const classes = isAdmin
    ? (allClassesData || []).map((c) => ({ ...c, role: "admin" }))
    : teacherData
    ? [
        ...(teacherData.asClassTeacher || []).map((c) => ({
          ...c,
          role: "class_teacher",
        })),
        ...(teacherData.asSubjectTeacher || []).map((c) => ({
          ...c,
          role: "subject_teacher",
        })),
      ]
    : [];

  // Fetch Students when Class is Selected
  const { data: studentsData, isFetching: loadingStudents } = useApiQuery(
    ["classStudents", selectedClass?._id],
    `${apiConfig.baseUrl}/classes/${selectedClass?._id}/full-details`,
    { enabled: !!selectedClass }
  );

  useEffect(() => {
    if (studentsData?.students) {
      setAvailableStudents(studentsData.students);
    }
  }, [studentsData]);

  const handleClassSelect = (cls) => {
    setSelectedClass(cls);
    setSelectedStudent(null);
    setSelectedSubject(null);
    setAvailableStudents([]);

    // Admins can give general feedback to any class
    if (isAdmin) {
      setAvailableSubjects([]);
    } else if (cls.role === "class_teacher") {
      // Class teachers can give general feedback OR specific subject feedback
      const mySubjectsInThisClass =
        teacherData.allMySubjects?.filter((s) => s.class._id === cls._id) || [];
      setAvailableSubjects(mySubjectsInThisClass);
    } else {
      // Subject teacher must pick from their subject(s) in this class
      const mySubjectsInThisClass =
        teacherData.asSubjectTeacher?.filter((s) => s.class._id === cls._id) ||
        [];
      setAvailableSubjects(mySubjectsInThisClass);
      if (mySubjectsInThisClass.length === 1) {
        setSelectedSubject(mySubjectsInThisClass[0]);
      }
    }
    setShowClassModal(false);
  };

  // Submit Feedback Mutation
  const submitMutation = useApiMutation({
    mutationFn: createApiMutationFn(`${apiConfig.baseUrl}/feedback`, "POST"),
    onSuccess: () => {
      showToast(
        t("feedback.sentSuccess", "Feedback sent successfully"),
        "success"
      );
      queryClient.invalidateQueries(["complaintsData"]);
      router.back();
    },
    onError: (err) =>
      showToast(
        err.message || t("feedback.sentFailure", "Failed to send feedback"),
        "error"
      ),
  });

  const handleSubmit = () => {
    if (!selectedClass) {
      showToast(
        t("feedback.selectClassError", "Please select a class"),
        "error"
      );
      return;
    }
    if (!selectedStudent) {
      showToast(
        t("feedback.selectStudentError", "Please select a student"),
        "error"
      );
      return;
    }
    if (!message.trim()) {
      showToast(
        t(
          "feedback.enterFeedbackMessageError",
          "Please enter a feedback message"
        ),
        "error"
      );
      return;
    }

    submitMutation.mutate({
      studentId: selectedStudent._id,
      subjectId: selectedSubject ? selectedSubject._id : null,
      message: message.trim(),
    });
  };

  const filteredClasses = classes.filter(
    (c) =>
      c.name.toLowerCase().includes(classSearch.toLowerCase()) ||
      (c.section && c.section.toLowerCase().includes(classSearch.toLowerCase()))
  );

  const filteredStudents = availableStudents.filter((s) =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase())
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={{ flex: 1 }}>
          <View
            style={{
              paddingHorizontal: SPACING.lg || 16,
              paddingTop: SPACING.md || 12,
            }}
          >
            <Header
              title={t("feedback.giveFeedback", "Give Feedback")}
              subtitle={t("feedback.shareExperience", "Share feedback or recognition")}
              variant="modal"
            />
          </View>

          <ScrollView
            contentContainerStyle={{
              padding: SPACING.lg || 16,
              paddingBottom: SPACING.xxxl || 40,
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {/* Class Selection */}
            <View style={{ marginBottom: SPACING.lg || 18 }}>
              <Text
                style={{
                  color: colors.onSurfaceVariant,
                  marginBottom: SPACING.xs || 8,
                  fontFamily: FONTS.medium,
                  fontSize: FONT_SIZES.sm,
                }}
              >
                {t("common.classRequired", "Class *")}
              </Text>
              <Pressable
                onPress={() => setShowClassModal(true)}
                style={{
                  backgroundColor: colors.surfaceContainer,
                  padding: SPACING.lg || 16,
                  borderRadius: RADIUS.md || 12,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderWidth: 1.5,
                  borderColor: colors.outlineVariant,
                }}
              >
                <Text
                  style={{
                    color: selectedClass
                      ? colors.onSurface
                      : colors.onSurfaceVariant,
                    fontFamily: selectedClass
                      ? FONTS.semiBold
                      : FONTS.regular,
                    fontSize: FONT_SIZES.md,
                  }}
                >
                  {selectedClass
                    ? `${formatClassName(
                        selectedClass.name,
                        selectedClass.section
                      )}${
                        selectedClass.role === "admin"
                          ? ""
                          : selectedClass.role === "class_teacher"
                          ? t("common.roleClassTeacher", " (Class Teacher)")
                          : t("common.roleSubjectTeacher", " (Subject Teacher)")
                      }`
                    : t("feedback.selectClassPlaceholder", "Select Class")}
                </Text>
                <MaterialIcons
                  name="arrow-drop-down"
                  size={ICON_SIZES.md || 24}
                  color={colors.onSurfaceVariant}
                />
              </Pressable>
            </View>

            {/* Subject Selection (Conditional) */}
            {selectedClass &&
              (availableSubjects.length > 0 ||
                selectedClass.role === "subject_teacher") && (
                <View style={{ marginBottom: SPACING.lg || 18 }}>
                  <Text
                    style={{
                      color: colors.onSurfaceVariant,
                      marginBottom: SPACING.xs || 8,
                      fontFamily: FONTS.medium,
                      fontSize: FONT_SIZES.sm,
                    }}
                  >
                    {t("common.subject", "Subject")}{" "}
                    {selectedClass.role === "subject_teacher"
                      ? "*"
                      : t("common.optional", "(Optional)")}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: "row", gap: SPACING.sm || 10 }}>
                      {selectedClass.role === "class_teacher" && (
                        <Pressable
                          onPress={() => setSelectedSubject(null)}
                          style={{
                            paddingHorizontal: SPACING.lg || 16,
                            paddingVertical: SPACING.sm || 10,
                            backgroundColor: !selectedSubject
                              ? colors.primary
                              : colors.surfaceContainerHighest,
                            borderRadius: RADIUS.full || 20,
                          }}
                        >
                          <Text
                            style={{
                              color: !selectedSubject
                                ? colors.onPrimary
                                : colors.onSurfaceVariant,
                              fontFamily: FONTS.medium,
                              fontSize: FONT_SIZES.xs,
                            }}
                          >
                            {t("common.general", "General")}
                          </Text>
                        </Pressable>
                      )}
                      {availableSubjects.map((sub) => {
                        const isSubSelected = selectedSubject?._id === sub._id;
                        return (
                          <Pressable
                            key={sub._id}
                            onPress={() => setSelectedSubject(sub)}
                            style={{
                              paddingHorizontal: SPACING.lg || 16,
                              paddingVertical: SPACING.sm || 10,
                              backgroundColor: isSubSelected
                                ? colors.primary
                                : colors.surfaceContainerHighest,
                              borderRadius: RADIUS.full || 20,
                            }}
                          >
                            <Text
                              style={{
                                color: isSubSelected
                                  ? colors.onPrimary
                                  : colors.onSurfaceVariant,
                                fontFamily: FONTS.medium,
                                fontSize: FONT_SIZES.xs,
                              }}
                            >
                              {sub.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>
              )}

            {/* Student Selection */}
            <View style={{ marginBottom: SPACING.lg || 18 }}>
              <Text
                style={{
                  color: colors.onSurfaceVariant,
                  marginBottom: SPACING.xs || 8,
                  fontFamily: FONTS.medium,
                  fontSize: FONT_SIZES.sm,
                }}
              >
                {t("common.studentRequired", "Student *")}
              </Text>
              <Pressable
                onPress={() => {
                  if (!selectedClass) {
                    showToast(
                      t(
                        "feedback.selectClassFirstError",
                        "Please select a class first"
                      ),
                      "error"
                    );
                    return;
                  }
                  setShowStudentModal(true);
                }}
                style={{
                  backgroundColor: colors.surfaceContainer,
                  padding: SPACING.lg || 16,
                  borderRadius: RADIUS.md || 12,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderWidth: 1.5,
                  borderColor: colors.outlineVariant,
                  opacity: selectedClass ? 1 : 0.6,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: SPACING.sm || 10,
                    flex: 1,
                  }}
                >
                  {selectedStudent && (
                    <UserAvatar
                      photoUrl={selectedStudent.profilePhoto}
                      name={selectedStudent.name}
                      role="student"
                      size={26}
                    />
                  )}
                  <Text
                    style={{
                      color: selectedStudent
                        ? colors.onSurface
                        : colors.onSurfaceVariant,
                      fontFamily: selectedStudent
                        ? FONTS.semiBold
                        : FONTS.regular,
                      fontSize: FONT_SIZES.md,
                    }}
                  >
                    {selectedStudent
                      ? selectedStudent.name
                      : t("feedback.selectStudentPlaceholder", "Select Student")}
                  </Text>
                </View>
                {loadingStudents ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <MaterialIcons
                    name="arrow-drop-down"
                    size={ICON_SIZES.md || 24}
                    color={colors.onSurfaceVariant}
                  />
                )}
              </Pressable>
            </View>

            {/* Feedback Message */}
            <View style={{ marginBottom: SPACING.xxl || 24 }}>
              <TextInput
                label={t("feedback.feedbackMessageRequired", "Feedback Message *")}
                value={message}
                onChangeText={setMessage}
                placeholder={t(
                  "feedback.feedbackPlaceholder",
                  "Write your feedback here..."
                )}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                inputStyle={{ height: 110, paddingTop: 10 }}
                style={{ height: 120, alignItems: "flex-start" }}
                variant="outlined"
              />
            </View>

            {/* Submit Button */}
            <Button
              variant="filled"
              size="lg"
              fullWidth
              onPress={handleSubmit}
              loading={submitMutation.isPending}
            >
              {t("feedback.sendFeedback", "Send Feedback")}
            </Button>
          </ScrollView>

          {/* Class Selection Modal */}
          <Modal
            visible={showClassModal}
            animationType="slide"
            transparent
            onRequestClose={() => setShowClassModal(false)}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{ flex: 1 }}
            >
              <Pressable
                style={{
                  flex: 1,
                  backgroundColor: "rgba(0,0,0,0.5)",
                  justifyContent: "flex-end",
                }}
                onPress={Keyboard.dismiss}
              >
                <Pressable
                  style={{
                    backgroundColor: colors.surface,
                    borderTopLeftRadius: RADIUS.xl || 24,
                    borderTopRightRadius: RADIUS.xl || 24,
                    maxHeight: "80%",
                  }}
                  onPress={(e) => e.stopPropagation()}
                >
                  <View
                    style={{
                      padding: SPACING.lg || 20,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.outlineVariant,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: FONT_SIZES.lg,
                        fontFamily: FONTS.bold,
                        color: colors.onSurface,
                      }}
                    >
                      {t("feedback.selectClassTitle", "Select Class")}
                    </Text>
                    <View style={{ marginTop: SPACING.md || 12 }}>
                      <TextInput
                        placeholder={t(
                          "feedback.searchClassPlaceholder",
                          "Search class..."
                        )}
                        value={classSearch}
                        onChangeText={setClassSearch}
                        icon="search"
                        variant="filled"
                      />
                    </View>
                  </View>
                  <ScrollView
                    contentContainerStyle={{ padding: SPACING.lg || 20 }}
                    keyboardShouldPersistTaps="handled"
                  >
                    {loadingClasses ? (
                      <ActivityIndicator size="large" color={colors.primary} />
                    ) : filteredClasses.length === 0 ? (
                      <Text
                        style={{
                          textAlign: "center",
                          color: colors.onSurfaceVariant,
                          padding: SPACING.lg || 20,
                          fontFamily: FONTS.regular,
                        }}
                      >
                        {t("feedback.noClassesFound", "No classes found")}
                      </Text>
                    ) : (
                      filteredClasses.map((cls) => (
                        <Pressable
                          key={cls._id + cls.role}
                          onPress={() => handleClassSelect(cls)}
                          style={{
                            paddingVertical: SPACING.md || 14,
                            borderBottomWidth: 1,
                            borderBottomColor: colors.outlineVariant,
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <View>
                            <Text
                              style={{
                                fontSize: FONT_SIZES.md,
                                fontFamily: FONTS.semiBold,
                                color: colors.onSurface,
                              }}
                            >
                              {formatClassName(cls.name, cls.section)}
                            </Text>
                            <Text
                              style={{
                                fontSize: FONT_SIZES.xs,
                                color: colors.onSurfaceVariant,
                                marginTop: 2,
                                fontFamily: FONTS.regular,
                              }}
                            >
                              {cls.role === "admin"
                                ? `${cls.students?.length || ""} ${t(
                                    "common.studentsCount",
                                    "students"
                                  )}`
                                : t("common.classTeacherRole", "Class Teacher")}
                            </Text>
                          </View>
                          {selectedClass?._id === cls._id &&
                            selectedClass?.role === cls.role && (
                              <MaterialIcons
                                name="check"
                                size={ICON_SIZES.md || 24}
                                color={colors.primary}
                              />
                            )}
                        </Pressable>
                      ))
                    )}
                  </ScrollView>
                  <View style={{ padding: SPACING.md || 16 }}>
                    <Button
                      variant="text"
                      fullWidth
                      onPress={() => setShowClassModal(false)}
                      textStyle={{ color: colors.error }}
                    >
                      {t("common.cancel", "Cancel")}
                    </Button>
                  </View>
                </Pressable>
              </Pressable>
            </KeyboardAvoidingView>
          </Modal>

          {/* Student Selection Modal */}
          <Modal
            visible={showStudentModal}
            animationType="slide"
            transparent
            onRequestClose={() => setShowStudentModal(false)}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{ flex: 1 }}
            >
              <Pressable
                style={{
                  flex: 1,
                  backgroundColor: "rgba(0,0,0,0.5)",
                  justifyContent: "flex-end",
                }}
                onPress={Keyboard.dismiss}
              >
                <Pressable
                  style={{
                    backgroundColor: colors.surface,
                    borderTopLeftRadius: RADIUS.xl || 24,
                    borderTopRightRadius: RADIUS.xl || 24,
                    maxHeight: "80%",
                  }}
                  onPress={(e) => e.stopPropagation()}
                >
                  <View
                    style={{
                      padding: SPACING.lg || 20,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.outlineVariant,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: FONT_SIZES.lg,
                        fontFamily: FONTS.bold,
                        color: colors.onSurface,
                      }}
                    >
                      {t("feedback.selectStudentTitle", "Select Student")}
                    </Text>
                    <View style={{ marginTop: SPACING.md || 12 }}>
                      <TextInput
                        placeholder={t(
                          "feedback.searchStudentPlaceholder",
                          "Search student..."
                        )}
                        value={studentSearch}
                        onChangeText={setStudentSearch}
                        icon="search"
                        variant="filled"
                      />
                    </View>
                  </View>
                  <ScrollView
                    contentContainerStyle={{ padding: SPACING.lg || 20 }}
                    keyboardShouldPersistTaps="handled"
                  >
                    {filteredStudents.length === 0 ? (
                      <Text
                        style={{
                          textAlign: "center",
                          color: colors.onSurfaceVariant,
                          padding: SPACING.lg || 20,
                          fontFamily: FONTS.regular,
                        }}
                      >
                        {t("feedback.noStudentsFound", "No students found")}
                      </Text>
                    ) : (
                      filteredStudents.map((student) => (
                        <Pressable
                          key={student._id}
                          onPress={() => {
                            setSelectedStudent(student);
                            setShowStudentModal(false);
                          }}
                          style={{
                            paddingVertical: SPACING.md || 12,
                            borderBottomWidth: 1,
                            borderBottomColor: colors.outlineVariant,
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: SPACING.md || 12,
                              flex: 1,
                            }}
                          >
                            <UserAvatar
                              photoUrl={student.profilePhoto}
                              name={student.name}
                              role="student"
                              size={38}
                            />
                            <View style={{ flex: 1 }}>
                              <Text
                                style={{
                                  fontSize: FONT_SIZES.md,
                                  fontFamily: FONTS.semiBold,
                                  color: colors.onSurface,
                                }}
                              >
                                {student.name}
                              </Text>
                              {student.phone ? (
                                <Text
                                  style={{
                                    fontSize: FONT_SIZES.xs,
                                    color: colors.onSurfaceVariant,
                                    marginTop: 2,
                                    fontFamily: FONTS.regular,
                                  }}
                                >
                                  {student.phone}
                                </Text>
                              ) : null}
                            </View>
                          </View>
                          {selectedStudent?._id === student._id && (
                            <MaterialIcons
                              name="check"
                              size={ICON_SIZES.md || 24}
                              color={colors.primary}
                            />
                          )}
                        </Pressable>
                      ))
                    )}
                  </ScrollView>
                  <View style={{ padding: SPACING.md || 16 }}>
                    <Button
                      variant="text"
                      fullWidth
                      onPress={() => setShowStudentModal(false)}
                      textStyle={{ color: colors.error }}
                    >
                      {t("common.cancel", "Cancel")}
                    </Button>
                  </View>
                </Pressable>
              </Pressable>
            </KeyboardAvoidingView>
          </Modal>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
