import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme, FONTS, FONT_SIZES } from "../theme";
import { useForm, Controller } from "react-hook-form";

import { useApiQuery } from "../hooks/useApi";
import apiConfig from "../config/apiConfig";
const availableRoles = [
  "student",
  "teacher",
  "staff",
  "admin",
  "super admin",
  "support_staff",
];

export default function UserFormModal({
  visible,
  onClose,
  modalMode,
  initialData,
  saving,
  onSubmit,
}) {
  const { styles, colors } = useTheme();
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm({
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      password: "",
      role: "student",
      gender: "",
      bloodGroup: "",
      dateOfBirth: "",
      address: "",
      guardianName: "",
      guardianPhone: "",
      phone2: "",
      regNo: "",
      satsNumber: "",
      penNumber: "",
      apaarId: "",
      admissionDate: "",
      designation: "",
      joiningDate: "",
      remarks: "",
      currentClass: "",
    },
    mode: "onBlur",
  });

  useEffect(() => {
    if (visible) {
      if (modalMode === "edit" && initialData) {
        reset({
          name: initialData.name || "",
          phone: initialData.phone || "",
          email: initialData.email || "",
          password: "",
          role: initialData.role || "student",
          gender: initialData.gender || "",
          bloodGroup: initialData.bloodGroup || "",
          dateOfBirth: initialData.dateOfBirth
            ? initialData.dateOfBirth.split("T")[0]
            : "",
          address: initialData.address || "",
          guardianName: initialData.guardianName || "",
          guardianPhone: initialData.guardianPhone || "",
          phone2: initialData.phone2 || "",
          regNo: initialData.regNo || "",
          satsNumber: initialData.satsNumber || "",
          penNumber: initialData.penNumber || "",
          apaarId: initialData.apaarId || "",
          admissionDate: initialData.admissionDate
            ? initialData.admissionDate.split("T")[0]
            : "",
          designation: initialData.designation || "",
          joiningDate: initialData.joiningDate
            ? initialData.joiningDate.split("T")[0]
            : "",
          remarks: initialData.remarks || "",
          currentClass:
            initialData.currentClass?._id || initialData.currentClass || "",
        });
      } else {
        reset({
          name: "",
          phone: "",
          email: "",
          password: "",
          role: "student",
          gender: "",
          bloodGroup: "",
          dateOfBirth: "",
          address: "",
          guardianName: "",
          guardianPhone: "",
          phone2: "",
          regNo: "",
          satsNumber: "",
          penNumber: "",
          apaarId: "",
          admissionDate: "",
          designation: "",
          joiningDate: "",
          remarks: "",
          currentClass: "",
        });
      }
      setShowPassword(false);
    }
  }, [visible, modalMode, initialData, reset]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const watchedRole = watch("role");

  const { data: classesData } = useApiQuery(
    ["classes"],
    `${apiConfig.baseUrl}/classes`,
    { enabled: visible }
  );
  const classes = Array.isArray(classesData)
    ? classesData
    : classesData?.data || [];
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "rgba(0,0,0,0.6)",
        }}
      >
        <View
          style={[
            {
              backgroundColor: colors.surfaceContainer,
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
            },
            {
              width: "90%",
              maxWidth: 400,
              maxHeight: "90%",
              padding: 0,
              overflow: "hidden",
            },
          ]}
        >
          <View
            style={{
              padding: 24,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: FONT_SIZES.xxl,
                  fontFamily: FONTS.bold,
                  color: colors.textPrimary,
                }}
              >
                {modalMode === "add" ? "New User" : "Edit User"}
              </Text>
              <Pressable onPress={onClose} style={{ padding: 4 }}>
                <MaterialIcons
                  name="close"
                  size={24}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 24 }}
          >
            {/* Common Fields: Name, Phone, Email, Password */}
            <View style={{ marginBottom: 24 }}>
              <Text style={[styles.labelMedium, { marginBottom: 8 }]}>
                NAME
              </Text>
              <Controller
                control={control}
                name="name"
                rules={{ required: "Name is required" }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[
                      styles.bodyLarge,
                      {
                        borderWidth: errors.name ? 1.5 : 1,
                        borderColor: errors.name ? colors.error : colors.outline,
                        borderRadius: 8,
                        padding: 14,
                        backgroundColor: "transparent",
                      },
                    ]}
                    placeholder="Enter name"
                    placeholderTextColor={colors.textSecondary}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                  />
                )}
              />
              {errors.name && (
                <Text style={{ color: colors.error, fontSize: FONT_SIZES.sm, fontFamily: FONTS.medium, marginTop: 4 }}>
                  {errors.name.message}
                </Text>
              )}
            </View>

            <View style={{ marginBottom: 24 }}>
              <Text style={[styles.labelMedium, { marginBottom: 8 }]}>
                PHONE
              </Text>
              <Controller
                control={control}
                name="phone"
                rules={{
                  required: "Phone is required",
                  minLength: { value: 10, message: "Enter 10 digit number" },
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[
                      [
                        styles.bodyLarge,
                        {
                          borderWidth: errors.phone ? 1.5 : 1,
                          borderColor: errors.phone ? colors.error : colors.outline,
                          borderRadius: 8,
                          padding: 14,
                          backgroundColor: "transparent",
                        },
                      ],
                      modalMode === "edit" && {
                        backgroundColor: colors.surfaceVariant,
                        opacity: 0.7,
                      },
                    ]}
                    placeholder="Enter phone number"
                    placeholderTextColor={colors.textSecondary}
                    value={value}
                    onChangeText={(text) => {
                      onChange(text);
                      if (modalMode === "add") {
                        setValue("password", `${text}@123`);
                      }
                    }}
                    onBlur={onBlur}
                    keyboardType="phone-pad"
                    maxLength={10}
                    editable={modalMode === "add"}
                  />
                )}
              />
              {errors.phone && (
                <Text style={{ color: colors.error, fontSize: FONT_SIZES.sm, fontFamily: FONTS.medium, marginTop: 4 }}>
                  {errors.phone.message}
                </Text>
              )}
              {modalMode === "edit" && (
                <Text
                  style={{
                    fontSize: FONT_SIZES.xs,
                    color: colors.textSecondary,
                    marginTop: 4,
                  }}
                >
                  Phone number cannot be changed.
                </Text>
              )}
            </View>

            <View style={{ marginBottom: 24 }}>
              <Text style={[styles.labelMedium, { marginBottom: 8 }]}>
                EMAIL
              </Text>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[
                      styles.bodyLarge,
                      {
                        borderWidth: 1,
                        borderColor: colors.outline,
                        borderRadius: 4,
                        padding: 14,
                        backgroundColor: "transparent",
                      },
                    ]}
                    placeholder="Enter email (optional)"
                    placeholderTextColor={colors.textSecondary}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                )}
              />
            </View>

            <View style={{ marginBottom: 24 }}>
              <Text style={[styles.labelMedium, { marginBottom: 8 }]}>
                PASSWORD {modalMode === "edit" && "(OPTIONAL)"}
              </Text>
              <View
                style={[
                  [
                    styles.bodyLarge,
                    {
                      borderWidth: 1,
                      borderColor: colors.outline,
                      borderRadius: 4,
                      padding: 14,
                      backgroundColor: "transparent",
                    },
                  ],
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 16,
                    paddingVertical: 0,
                  },
                ]}
              >
                <Controller
                  control={control}
                  name="password"
                  rules={{
                    required:
                      modalMode === "add" ? "Password is required" : false,
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={{
                        flex: 1,
                        fontSize: FONT_SIZES.lg,
                        color: colors.textPrimary,
                        fontFamily: FONTS.regular,
                        paddingVertical: 14, // Match theme vertical padding
                      }}
                      placeholder={
                        modalMode === "edit"
                          ? "Leave blank to keep current"
                          : "Enter password"
                      }
                      placeholderTextColor={colors.textSecondary}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      secureTextEntry={!showPassword}
                    />
                  )}
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ paddingLeft: 8 }}
                >
                  <MaterialIcons
                    name={showPassword ? "visibility-off" : "visibility"}
                    size={20}
                    color={colors.textSecondary}
                  />
                </Pressable>
              </View>
              {errors.password && modalMode === "add" && (
                <Text style={{ color: colors.error, fontSize: FONT_SIZES.sm, fontFamily: FONTS.medium, marginTop: 4 }}>
                  {errors.password.message}
                </Text>
              )}
            </View>

            {/* Role Selection */}
            <View style={{ marginBottom: 24 }}>
              <Text style={[styles.labelMedium, { marginBottom: 12 }]}>
                ROLE
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {availableRoles.map((role) => (
                  <Pressable
                    key={role}
                    onPress={() =>
                      setValue("role", role, { shouldValidate: true })
                    }
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      backgroundColor:
                        watchedRole === role
                          ? colors.primary
                          : colors.background,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor:
                        watchedRole === role ? colors.primary : colors.border,
                    }}
                  >
                    <Text
                      style={{
                        color:
                          watchedRole === role ? "#fff" : colors.textPrimary,
                        fontFamily: FONTS.bold,
                        textTransform: "capitalize",
                        fontSize: FONT_SIZES.base,
                      }}
                    >
                      {role}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Personal Details - Available for All Roles */}
            <Text
              style={[
                styles.titleLarge,
                { marginBottom: 16, marginTop: 8 },
              ]}
            >
              Personal Details
            </Text>

            {/* Gender & Blood Group Row */}
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
              <Controller
                control={control}
                name="gender"
                render={({ field: { value } }) => (
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.labelMedium, { marginBottom: 8 }]}>
                      GENDER
                    </Text>
                    <View
                      style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}
                    >
                      {["Boy", "Girl", "Other"].map((g) => (
                        <Pressable
                          key={g}
                          onPress={() =>
                            setValue("gender", value === g ? "" : g)
                          }
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            backgroundColor:
                              value === g ? colors.primary : colors.background,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor:
                              value === g ? colors.primary : colors.border,
                            marginBottom: 4,
                          }}
                        >
                          <Text
                            style={{
                              color: value === g ? "#fff" : colors.textPrimary,
                              fontSize: FONT_SIZES.sm,
                              fontFamily: FONTS.medium,
                            }}
                          >
                            {g}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.labelMedium, { marginBottom: 8 }]}>
                  BLOOD GROUP
                </Text>
                <Controller
                  control={control}
                  name="bloodGroup"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[
                        styles.bodyLarge,
                        {
                          borderWidth: 1,
                          borderColor: colors.outline,
                          borderRadius: 4,
                          padding: 14,
                          backgroundColor: "transparent",
                        },
                      ]}
                      placeholder="e.g. O+"
                      placeholderTextColor={colors.textSecondary}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                    />
                  )}
                />
              </View>
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text style={[styles.labelMedium, { marginBottom: 8 }]}>
                DATE OF BIRTH (YYYY-MM-DD)
              </Text>
              <Controller
                control={control}
                name="dateOfBirth"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[
                      styles.bodyLarge,
                      {
                        borderWidth: 1,
                        borderColor: colors.outline,
                        borderRadius: 4,
                        padding: 14,
                        backgroundColor: "transparent",
                      },
                    ]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textSecondary}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                  />
                )}
              />
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text style={[styles.labelMedium, { marginBottom: 8 }]}>
                ADDRESS
              </Text>
              <Controller
                control={control}
                name="address"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[
                      [
                        styles.bodyLarge,
                        {
                          borderWidth: 1,
                          borderColor: colors.outline,
                          borderRadius: 4,
                          padding: 14,
                          backgroundColor: "transparent",
                        },
                      ],
                      { height: 80, textAlignVertical: "top", paddingTop: 12 },
                    ]}
                    placeholder="Full address"
                    placeholderTextColor={colors.textSecondary}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    multiline
                    numberOfLines={3}
                  />
                )}
              />
            </View>

            {/* Student Specific Fields */}
            {watchedRole === "student" && (
              <>
                <View style={{ marginBottom: 20 }}>
                  <Text style={[styles.labelMedium, { marginBottom: 8 }]}>
                    CLASS
                  </Text>
                  <Controller
                    control={control}
                    name="currentClass"
                    rules={{ required: "Class is required" }}
                    render={({ field: { onChange, value } }) => (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{ paddingVertical: 4 }}
                      >
                        {classes.map((cls) => (
                          <Pressable
                            key={cls._id}
                            onPress={() => onChange(cls._id)}
                            style={{
                              paddingHorizontal: 14,
                              paddingVertical: 10,
                              backgroundColor:
                                value === cls._id
                                  ? colors.primary
                                  : colors.cardBackground,
                              borderRadius: 10,
                              marginRight: 8,
                              borderWidth: 1,
                              borderColor:
                                value === cls._id
                                  ? colors.primary
                                  : colors.border,
                            }}
                          >
                            <Text
                              style={{
                                color:
                                  value === cls._id
                                    ? "#fff"
                                    : colors.textPrimary,
                                fontFamily: FONTS.medium,
                                fontSize: FONT_SIZES.base,
                              }}
                            >
                              {cls.name || cls.label}
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    )}
                  />
                  {errors.currentClass && (
                    <Text style={{ color: colors.error, fontSize: FONT_SIZES.sm, fontFamily: FONTS.medium, marginTop: 4 }}>
                      {errors.currentClass.message}
                    </Text>
                  )}
                </View>

                <Text
                  style={[
                    styles.titleLarge,
                    { marginBottom: 16, marginTop: 8 },
                  ]}
                >
                  Guardian & Contact
                </Text>

                <View style={{ marginBottom: 20 }}>
                  <Text style={[styles.labelMedium, { marginBottom: 8 }]}>
                    GUARDIAN NAME
                  </Text>
                  <Controller
                    control={control}
                    name="guardianName"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        style={[
                          styles.bodyLarge,
                          {
                            borderWidth: 1,
                            borderColor: colors.outline,
                            borderRadius: 4,
                            padding: 14,
                            backgroundColor: "transparent",
                          },
                        ]}
                        placeholder="Enter guardian name"
                        placeholderTextColor={colors.textSecondary}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                      />
                    )}
                  />
                </View>
                <View style={{ marginBottom: 20 }}>
                  <Text style={[styles.labelMedium, { marginBottom: 8 }]}>
                    GUARDIAN PHONE
                  </Text>
                  <Controller
                    control={control}
                    name="guardianPhone"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        style={[
                          styles.bodyLarge,
                          {
                            borderWidth: 1,
                            borderColor: colors.outline,
                            borderRadius: 4,
                            padding: 14,
                            backgroundColor: "transparent",
                          },
                        ]}
                        placeholder="Enter guardian phone"
                        placeholderTextColor={colors.textSecondary}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        keyboardType="phone-pad"
                        maxLength={10}
                      />
                    )}
                  />
                </View>
                <View style={{ marginBottom: 20 }}>
                  <Text style={[styles.labelMedium, { marginBottom: 8 }]}>
                    SECONDARY PHONE
                  </Text>
                  <Controller
                    control={control}
                    name="phone2"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        style={[
                          styles.bodyLarge,
                          {
                            borderWidth: 1,
                            borderColor: colors.outline,
                            borderRadius: 4,
                            padding: 14,
                            backgroundColor: "transparent",
                          },
                        ]}
                        placeholder="Alt phone (optional)"
                        placeholderTextColor={colors.textSecondary}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        keyboardType="phone-pad"
                        maxLength={10}
                      />
                    )}
                  />
                </View>

                <Text
                  style={[
                    styles.titleLarge,
                    { marginBottom: 16, marginTop: 8 },
                  ]}
                >
                  Academic & IDs
                </Text>

                <View
                  style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.labelMedium, { marginBottom: 8 }]}>
                      REG NO
                    </Text>
                    <Controller
                      control={control}
                      name="regNo"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          style={[
                            styles.bodyLarge,
                            {
                              borderWidth: 1,
                              borderColor: colors.outline,
                              borderRadius: 4,
                              padding: 14,
                              backgroundColor: "transparent",
                            },
                          ]}
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                        />
                      )}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.labelMedium, { marginBottom: 8 }]}>
                      SATS NO
                    </Text>
                    <Controller
                      control={control}
                      name="satsNumber"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          style={[
                            styles.bodyLarge,
                            {
                              borderWidth: 1,
                              borderColor: colors.outline,
                              borderRadius: 4,
                              padding: 14,
                              backgroundColor: "transparent",
                            },
                          ]}
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                        />
                      )}
                    />
                  </View>
                </View>

                <View
                  style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.labelMedium, { marginBottom: 8 }]}>
                      PEN NO
                    </Text>
                    <Controller
                      control={control}
                      name="penNumber"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          style={[
                            styles.bodyLarge,
                            {
                              borderWidth: 1,
                              borderColor: colors.outline,
                              borderRadius: 4,
                              padding: 14,
                              backgroundColor: "transparent",
                            },
                          ]}
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                        />
                      )}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.labelMedium, { marginBottom: 8 }]}>
                      APAAR ID
                    </Text>
                    <Controller
                      control={control}
                      name="apaarId"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          style={[
                            styles.bodyLarge,
                            {
                              borderWidth: 1,
                              borderColor: colors.outline,
                              borderRadius: 4,
                              padding: 14,
                              backgroundColor: "transparent",
                            },
                          ]}
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                        />
                      )}
                    />
                  </View>
                </View>

                <View style={{ marginBottom: 20 }}>
                  <Text style={[styles.labelMedium, { marginBottom: 8 }]}>
                    ADMISSION DATE
                  </Text>
                  <Controller
                    control={control}
                    name="admissionDate"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        style={[
                          styles.bodyLarge,
                          {
                            borderWidth: 1,
                            borderColor: colors.outline,
                            borderRadius: 4,
                            padding: 14,
                            backgroundColor: "transparent",
                          },
                        ]}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={colors.textSecondary}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                      />
                    )}
                  />
                </View>
              </>
            )}

            {/* Non-Student Role Details */}
            {watchedRole !== "student" && (
              <>
                <Text
                  style={[
                    styles.titleLarge,
                    { marginBottom: 16, marginTop: 8 },
                  ]}
                >
                  Role Details
                </Text>
                <View style={{ marginBottom: 20 }}>
                  <Text style={[styles.labelMedium, { marginBottom: 8 }]}>
                    DESIGNATION
                  </Text>
                  <Controller
                    control={control}
                    name="designation"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        style={[
                          styles.bodyLarge,
                          {
                            borderWidth: 1,
                            borderColor: colors.outline,
                            borderRadius: 4,
                            padding: 14,
                            backgroundColor: "transparent",
                          },
                        ]}
                        placeholder="e.g. Physical Instructor, Science Teacher"
                        placeholderTextColor={colors.textSecondary}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                      />
                    )}
                  />
                </View>

                <View style={{ marginBottom: 20 }}>
                  <Text style={[styles.labelMedium, { marginBottom: 8 }]}>
                    JOINING DATE
                  </Text>
                  <Controller
                    control={control}
                    name="joiningDate"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        style={[
                          styles.bodyLarge,
                          {
                            borderWidth: 1,
                            borderColor: colors.outline,
                            borderRadius: 4,
                            padding: 14,
                            backgroundColor: "transparent",
                          },
                        ]}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={colors.textSecondary}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                      />
                    )}
                  />
                </View>

                <View style={{ marginBottom: 20 }}>
                  <Text style={[styles.labelMedium, { marginBottom: 8 }]}>
                    REMARKS
                  </Text>
                  <Controller
                    control={control}
                    name="remarks"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        style={[
                          [
                            styles.bodyLarge,
                            {
                              borderWidth: 1,
                              borderColor: colors.outline,
                              borderRadius: 4,
                              padding: 14,
                              backgroundColor: "transparent",
                            },
                          ],
                          {
                            height: 80,
                            textAlignVertical: "top",
                            paddingTop: 12,
                          },
                        ]}
                        placeholderTextColor={colors.textSecondary}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        multiline
                        numberOfLines={3}
                      />
                    )}
                  />
                </View>
              </>
            )}
          </ScrollView>

          {/* Fixed Footer with Buttons */}
          <View
            style={{
              padding: 24,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              backgroundColor: colors.cardBackground,
              flexDirection: "row",
              gap: 12,
            }}
          >
            <Pressable
              onPress={onClose}
              style={({ pressed }) => ({
                flex: 1,
                padding: 16,
                backgroundColor: colors.background,
                borderRadius: 12,
                alignItems: "center",
                borderWidth: 1,
                borderColor: colors.border,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: FONT_SIZES.lg,
                  fontFamily: FONTS.bold,
                  color: colors.textPrimary,
                }}
              >
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit(onSubmit)}
              disabled={!isValid || saving}
              style={({ pressed }) => ({
                flex: 1,
                padding: 16,
                backgroundColor: isValid ? colors.primary : colors.border,
                borderRadius: 12,
                alignItems: "center",
                opacity: pressed || !isValid || saving ? 0.7 : 1,
              })}
            >
              {saving ? (
                <View style={{ height: 24, justifyContent: "center" }}>
                  <ActivityIndicator color="#fff" size="small" />
                </View>
              ) : (
                <Text
                  style={{
                    fontSize: FONT_SIZES.lg,
                    fontFamily: FONTS.bold,
                    color: "#fff",
                  }}
                >
                  {modalMode === "add" ? "Create User" : "Save Changes"}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
