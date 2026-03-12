import React, { useState, useEffect } from 'react';
import { View, Text, Modal, ScrollView, TextInput, Pressable, ActivityIndicator } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../theme";
import { useForm, Controller } from "react-hook-form";

const availableRoles = ["student", "teacher", "staff", "admin", "super admin", "support_staff"];

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
        formState: { errors, isValid }
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
        },
        mode: "onBlur"
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
                    dateOfBirth: initialData.dateOfBirth ? initialData.dateOfBirth.split('T')[0] : "",
                    address: initialData.address || "",
                    guardianName: initialData.guardianName || "",
                    guardianPhone: initialData.guardianPhone || "",
                    phone2: initialData.phone2 || "",
                    regNo: initialData.regNo || "",
                    satsNumber: initialData.satsNumber || "",
                    penNumber: initialData.penNumber || "",
                    apaarId: initialData.apaarId || "",
                    admissionDate: initialData.admissionDate ? initialData.admissionDate.split('T')[0] : "",
                    designation: initialData.designation || "",
                    joiningDate: initialData.joiningDate ? initialData.joiningDate.split('T')[0] : "",
                    remarks: initialData.remarks || "",
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
                });
            }
            setShowPassword(false);
        }
    }, [visible, modalMode, initialData, reset]);

    const watchedRole = watch("role");

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.6)" }}>
                <View style={[styles.card, {
                    width: "90%",
                    maxWidth: 400,
                    maxHeight: "90%",
                    padding: 0,
                    overflow: 'hidden'
                }]}>
                    <View style={{ padding: 24, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                            <Text style={{ fontSize: 24, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>
                                {modalMode === "add" ? "New User" : "Edit User"}
                            </Text>
                            <Pressable onPress={onClose} style={{ padding: 4 }}>
                                <MaterialIcons name="close" size={24} color={colors.textSecondary} />
                            </Pressable>
                        </View>
                    </View>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ padding: 24 }}
                    >
                        {/* Common Fields: Name, Phone, Email, Password */}
                        <View style={{ marginBottom: 24 }}>
                            <Text style={[styles.label, { marginBottom: 8 }]}>NAME</Text>
                            <Controller
                                control={control}
                                name="name"
                                rules={{ required: "Name is required" }}
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter name"
                                        placeholderTextColor={colors.textSecondary}
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                    />
                                )}
                            />
                            {errors.name && (
                                <Text style={styles.errorText}>{errors.name.message}</Text>
                            )}
                        </View>

                        <View style={{ marginBottom: 24 }}>
                            <Text style={[styles.label, { marginBottom: 8 }]}>PHONE</Text>
                            <Controller
                                control={control}
                                name="phone"
                                rules={{ required: "Phone is required", minLength: { value: 10, message: "Enter 10 digit number" } }}
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <TextInput
                                        style={[styles.input, modalMode === 'edit' && { backgroundColor: colors.surfaceVariant, opacity: 0.7 }]}
                                        placeholder="Enter phone number"
                                        placeholderTextColor={colors.textSecondary}
                                        value={value}
                                        onChangeText={(text) => {
                                            onChange(text);
                                            if (modalMode === 'add') {
                                                setValue('password', `${text}@123`);
                                            }
                                        }}
                                        onBlur={onBlur}
                                        keyboardType="phone-pad"
                                        maxLength={10}
                                        editable={modalMode === 'add'}
                                    />
                                )}
                            />
                            {errors.phone && (
                                <Text style={styles.errorText}>{errors.phone.message}</Text>
                            )}
                            {modalMode === 'edit' && (
                                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>
                                    Phone number cannot be changed.
                                </Text>
                            )}
                        </View>

                        <View style={{ marginBottom: 24 }}>
                            <Text style={[styles.label, { marginBottom: 8 }]}>EMAIL</Text>
                            <Controller
                                control={control}
                                name="email"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <TextInput
                                        style={styles.input}
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
                            <Text style={[styles.label, { marginBottom: 8 }]}>PASSWORD {modalMode === 'edit' && "(OPTIONAL)"}</Text>
                            <View style={[styles.input, { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 0 }]}>
                                <Controller
                                    control={control}
                                    name="password"
                                    rules={{
                                        required: modalMode === 'add' ? "Password is required" : false
                                    }}
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <TextInput
                                            style={{
                                                flex: 1,
                                                fontSize: 16,
                                                color: colors.textPrimary,
                                                fontFamily: "DMSans-Regular",
                                                paddingVertical: 14 // Match theme vertical padding
                                            }}
                                            placeholder={modalMode === 'edit' ? "Leave blank to keep current" : "Enter password"}
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
                            {errors.password && modalMode === 'add' && (
                                <Text style={styles.errorText}>{errors.password.message}</Text>
                            )}
                        </View>

                        {/* Role Selection */}
                        <View style={{ marginBottom: 24 }}>
                            <Text style={[styles.label, { marginBottom: 12 }]}>ROLE</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                                {availableRoles.map((role) => (
                                    <Pressable
                                        key={role}
                                        onPress={() => setValue("role", role, { shouldValidate: true })}
                                        style={{
                                            paddingHorizontal: 16,
                                            paddingVertical: 10,
                                            backgroundColor: watchedRole === role ? colors.primary : colors.background,
                                            borderRadius: 12,
                                            borderWidth: 1,
                                            borderColor: watchedRole === role ? colors.primary : colors.border
                                        }}
                                    >
                                        <Text style={{
                                            color: watchedRole === role ? "#fff" : colors.textPrimary,
                                            fontFamily: "DMSans-Bold",
                                            textTransform: "capitalize",
                                            fontSize: 14
                                        }}>
                                            {role}
                                        </Text>
                                    </Pressable>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Role Specific Fields */}
                        {watchedRole === "student" && (
                            <>
                                <Text style={[styles.sectionTitle, { fontSize: 16, marginBottom: 16, marginTop: 8 }]}>Personal Details</Text>

                                {/* Gender & Blood Group Row */}
                                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                                    <Controller
                                        control={control}
                                        name="gender"
                                        render={({ field: { value } }) => (
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.label, { marginBottom: 8 }]}>GENDER</Text>
                                                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                                                    {['Boy', 'Girl', 'Other'].map(g => (
                                                        <Pressable
                                                            key={g}
                                                            onPress={() => setValue('gender', g)}
                                                            style={{
                                                                paddingHorizontal: 12,
                                                                paddingVertical: 8,
                                                                backgroundColor: value === g ? colors.primary : colors.background,
                                                                borderRadius: 8,
                                                                borderWidth: 1,
                                                                borderColor: value === g ? colors.primary : colors.border,
                                                                marginBottom: 4
                                                            }}
                                                        >
                                                            <Text style={{ color: value === g ? '#fff' : colors.textPrimary, fontSize: 12 }}>{g}</Text>
                                                        </Pressable>
                                                    ))}
                                                </View>
                                            </View>
                                        )}
                                    />
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.label, { marginBottom: 8 }]}>BLOOD GROUP</Text>
                                        <Controller
                                            control={control}
                                            name="bloodGroup"
                                            render={({ field: { onChange, onBlur, value } }) => (
                                                <TextInput
                                                    style={styles.input}
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
                                    <Text style={[styles.label, { marginBottom: 8 }]}>DATE OF BIRTH (YYYY-MM-DD)</Text>
                                    <Controller
                                        control={control}
                                        name="dateOfBirth"
                                        render={({ field: { onChange, onBlur, value } }) => (
                                            <TextInput
                                                style={styles.input}
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
                                    <Text style={[styles.label, { marginBottom: 8 }]}>ADDRESS</Text>
                                    <Controller
                                        control={control}
                                        name="address"
                                        render={({ field: { onChange, onBlur, value } }) => (
                                            <TextInput
                                                style={[styles.input, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
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

                                <Text style={[styles.sectionTitle, { fontSize: 16, marginBottom: 16, marginTop: 8 }]}>Guardian & Contact</Text>

                                <View style={{ marginBottom: 20 }}>
                                    <Text style={[styles.label, { marginBottom: 8 }]}>GUARDIAN NAME</Text>
                                    <Controller
                                        control={control}
                                        name="guardianName"
                                        render={({ field: { onChange, onBlur, value } }) => (
                                            <TextInput
                                                style={styles.input}
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
                                    <Text style={[styles.label, { marginBottom: 8 }]}>GUARDIAN PHONE</Text>
                                    <Controller
                                        control={control}
                                        name="guardianPhone"
                                        render={({ field: { onChange, onBlur, value } }) => (
                                            <TextInput
                                                style={styles.input}
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
                                    <Text style={[styles.label, { marginBottom: 8 }]}>SECONDARY PHONE</Text>
                                    <Controller
                                        control={control}
                                        name="phone2"
                                        render={({ field: { onChange, onBlur, value } }) => (
                                            <TextInput
                                                style={styles.input}
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

                                <Text style={[styles.sectionTitle, { fontSize: 16, marginBottom: 16, marginTop: 8 }]}>Academic & IDs</Text>

                                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.label, { marginBottom: 8 }]}>REG NO</Text>
                                        <Controller
                                            control={control}
                                            name="regNo"
                                            render={({ field: { onChange, onBlur, value } }) => (
                                                <TextInput
                                                    style={styles.input}
                                                    value={value}
                                                    onChangeText={onChange}
                                                    onBlur={onBlur}
                                                />
                                            )}
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.label, { marginBottom: 8 }]}>SATS NO</Text>
                                        <Controller
                                            control={control}
                                            name="satsNumber"
                                            render={({ field: { onChange, onBlur, value } }) => (
                                                <TextInput
                                                    style={styles.input}
                                                    value={value}
                                                    onChangeText={onChange}
                                                    onBlur={onBlur}
                                                />
                                            )}
                                        />
                                    </View>
                                </View>

                                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.label, { marginBottom: 8 }]}>PEN NO</Text>
                                        <Controller
                                            control={control}
                                            name="penNumber"
                                            render={({ field: { onChange, onBlur, value } }) => (
                                                <TextInput
                                                    style={styles.input}
                                                    value={value}
                                                    onChangeText={onChange}
                                                    onBlur={onBlur}
                                                />
                                            )}
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.label, { marginBottom: 8 }]}>APAAR ID</Text>
                                        <Controller
                                            control={control}
                                            name="apaarId"
                                            render={({ field: { onChange, onBlur, value } }) => (
                                                <TextInput
                                                    style={styles.input}
                                                    value={value}
                                                    onChangeText={onChange}
                                                    onBlur={onBlur}
                                                />
                                            )}
                                        />
                                    </View>
                                </View>

                                <View style={{ marginBottom: 20 }}>
                                    <Text style={[styles.label, { marginBottom: 8 }]}>ADMISSION DATE</Text>
                                    <Controller
                                        control={control}
                                        name="admissionDate"
                                        render={({ field: { onChange, onBlur, value } }) => (
                                            <TextInput
                                                style={styles.input}
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

                        {(watchedRole === "teacher" || watchedRole === "staff" || watchedRole === "support_staff") && (
                            <>
                                <Text style={[styles.sectionTitle, { fontSize: 16, marginBottom: 16, marginTop: 8 }]}>Role Details</Text>
                                <View style={{ marginBottom: 20 }}>
                                    <Text style={[styles.label, { marginBottom: 8 }]}>DESIGNATION</Text>
                                    <Controller
                                        control={control}
                                        name="designation"
                                        render={({ field: { onChange, onBlur, value } }) => (
                                            <TextInput
                                                style={styles.input}
                                                placeholder="e.g. Science Teacher"
                                                placeholderTextColor={colors.textSecondary}
                                                value={value}
                                                onChangeText={onChange}
                                                onBlur={onBlur}
                                            />
                                        )}
                                    />
                                </View>

                                <View style={{ marginBottom: 20 }}>
                                    <Text style={[styles.label, { marginBottom: 8 }]}>JOINING DATE</Text>
                                    <Controller
                                        control={control}
                                        name="joiningDate"
                                        render={({ field: { onChange, onBlur, value } }) => (
                                            <TextInput
                                                style={styles.input}
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
                                    <Text style={[styles.label, { marginBottom: 8 }]}>REMARKS</Text>
                                    <Controller
                                        control={control}
                                        name="remarks"
                                        render={({ field: { onChange, onBlur, value } }) => (
                                            <TextInput
                                                style={[styles.input, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
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
                    <View style={{
                        padding: 24,
                        borderTopWidth: 1,
                        borderTopColor: colors.border,
                        backgroundColor: colors.cardBackground,
                        flexDirection: "row",
                        gap: 12
                    }}>
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
                                opacity: pressed ? 0.7 : 1
                            })}
                        >
                            <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>
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
                                opacity: pressed || !isValid || saving ? 0.7 : 1
                            })}
                        >
                            {saving ? (
                                <View style={{ height: 24, justifyContent: 'center' }}>
                                    <ActivityIndicator color="#fff" size="small" />
                                </View>
                            ) : (
                                <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: "#fff" }}>
                                    {modalMode === "add" ? "Create User" : "Save Changes"}
                                </Text>
                            )}
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
