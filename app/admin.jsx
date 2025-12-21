import React, { useState, } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal
} from "react-native";

import { MaterialIcons } from "@expo/vector-icons";


import { useRouter } from "expo-router";
import { useTheme } from "../theme";
import apiConfig from "../config/apiConfig";

import { useToast } from "../components/ToastProvider";
import { useApiQuery, useApiMutation, createApiMutationFn } from "../hooks/useApi";
import { useQueryClient } from "@tanstack/react-query";
import Header from "../components/Header";

export default function AdminScreen() {
  const router = useRouter();
  const { styles, colors } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const [showUserModal, setShowUserModal] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // "add" or "edit"
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    role: "student",
    guardianName: "",
    guardianPhone: "",
    designation: "",
    admissionDate: "",
    joiningDate: ""
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const availableRoles = ["student", "teacher", "class teacher", "staff", "admin", "super admin"];

  // Check Auth & Admin
  const { data: userData, isLoading: userLoading, error: userError } = useApiQuery(
    ['currentUser'],
    `${apiConfig.baseUrl}/auth/me`
  );
  const user = userData?.user;
  const isAdmin = user?.role === 'admin' || user?.role === 'super admin';

  // Fetch Users
  const { data: usersData, isLoading: loading, error: usersError, refetch } = useApiQuery(
    ['users', currentPage, searchQuery, roleFilter, sortBy, sortOrder],
    `${apiConfig.baseUrl}/users?page=${currentPage}&limit=${pageSize}&search=${searchQuery}&role=${roleFilter}&sortBy=${sortBy}&order=${sortOrder}`,
    {
      enabled: !!isAdmin, // Only fetch if admin check passes
      keepPreviousData: true,
    }
  );

  const users = usersData?.data || [];
  const totalPages = usersData?.pagination?.pages || 1;

  // Mutations
  const createUserMutation = useApiMutation({
    mutationFn: createApiMutationFn(apiConfig.url(apiConfig.endpoints.users.create), 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showToast("User created successfully", "success");
      setUserForm({ name: "", phone: "", email: "", password: "", role: "student" });
      setShowUserModal(false);
    },
    onError: (error) => showToast(error.message || "Failed to create user", "error")
  });

  const updateUserMutation = useApiMutation({
    mutationFn: (data) => createApiMutationFn(apiConfig.url(apiConfig.endpoints.users.update(data._id)), 'PUT')(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showToast("User updated successfully", "success");
      setShowUserModal(false);
    },
    onError: (error) => showToast(error.message || "Failed to update user", "error")
  });

  const deleteUserMutation = useApiMutation({
    mutationFn: (id) => createApiMutationFn(apiConfig.url(apiConfig.endpoints.users.delete(id)), 'DELETE')(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showToast("User deleted successfully", "success");
    },
    onError: (error) => showToast(error.message || "Failed to delete user", "error")
  });

  const updateUserRole = (userId, newRole) => {
    updateUserMutation.mutate({ _id: userId, role: newRole });
  };

  const deleteUser = (userId, _name) => {
    deleteUserMutation.mutate(userId);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "super admin":
        return colors.roleSuperAdmin;
      case "admin":
        return colors.roleAdmin;
      case "staff":
        return colors.roleStaff;
      case "class teacher":
      case "teacher":
        return colors.roleClassTeacher;
      case "student":
        return colors.roleStudent;
      default:
        return colors.textSecondary;
    }
  };

  const handleChange = (field, value) => {
    setUserForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field);
  };

  const validateField = (field) => {
    let newErrors = { ...errors };
    if (field === 'name' && !userForm.name) newErrors.name = "Name is required";
    if (field === 'phone' && !userForm.phone) newErrors.phone = "Phone is required";
    if (field === 'password' && !userForm.password) newErrors.password = "Password is required";
    setErrors(newErrors);
  };

  const isFormValid = () => {
    return userForm.name && userForm.phone && userForm.password;
  };

  const saving = createUserMutation.isPending || updateUserMutation.isPending;


  const createUser = () => {
    if (!userForm.name || !userForm.phone || !userForm.password) {
      showToast("Please fill in all required fields", "error");
      return;
    }
    createUserMutation.mutate(userForm);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          {/* Minimal Header */}
          <Header title="Admin" subtitle="Manage users and permissions" />

          {/* Admin Actions - Organized by Category */}
          <View style={{ gap: 24 }}>
            {/* Academic Management Section - Super Admin Only */}
            {user?.role === 'super admin' && (
              <View>
                <Text style={styles.sectionTitle}>
                  Academic Management
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                  <MenuCard
                    title="Academic Year"
                    icon="calendar-today"
                    color={colors.primary}
                    onPress={() => router.push("/admin/academic-year")}
                  />
                  <MenuCard
                    title="Subjects"
                    icon="menu-book"
                    color="#673AB7"
                    onPress={() => router.push("/admin/subjects")}
                  />
                </View>
              </View>
            )}

            {/* Teaching Management Section - Admin & Super Admin */}
            <View>
              <Text style={styles.sectionTitle}>
                Teaching Management
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                <MenuCard
                  title="Teacher Subjects"
                  icon="assignment-ind"
                  color="#4CAF50"
                  onPress={() => router.push("/admin/teacher-subjects")}
                />
              </View>
            </View>

            {/* Class Operations Section */}
            <View>
              <Text style={styles.sectionTitle}>
                Class Operations
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                <MenuCard
                  title="Timetable"
                  icon="schedule"
                  color="#9C27B0"
                  onPress={() => router.push("/admin/timetable")}
                />
                <MenuCard
                  title="Exams"
                  icon="event"
                  color="#E91E63"
                  onPress={() => router.push("/admin/exam-schedule")}
                />
              </View>
            </View>

            {/* Financial Section */}
            <View>
              <Text style={styles.sectionTitle}>
                Financial
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                <MenuCard
                  title="Fees"
                  icon="attach-money"
                  color="#FF5722"
                  onPress={() => router.push("/admin/fees")}
                />
              </View>
            </View>

            {/* Communication & Requests Section */}
            <View>
              <Text style={styles.sectionTitle}>
                Communication
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                <MenuCard
                  title="Complaints"
                  icon="feedback"
                  color="#607D8B"
                  onPress={() => router.push("/complaints")}
                />
                <MenuCard
                  title="Broadcast"
                  icon="campaign"
                  color="#3F51B5"
                  onPress={() => router.push("/admin/send-notification")}
                />
              </View>
            </View>

            {/* Reports Section */}
            <View>
              <Text style={styles.sectionTitle}>
                Reports
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                <MenuCard
                  title="History"
                  icon="history"
                  color="#795548"
                  onPress={() => router.push("/history")}
                />
              </View>
            </View>
          </View>

          {/* User Management Section */}
          <View style={{ marginTop: 32 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={styles.sectionTitle}>
                User Management
              </Text>
              <Pressable
                onPress={() => {
                  setModalMode("add");
                  setUserForm({ name: "", phone: "", email: "", password: "", role: "student" });
                  setShowUserModal(true);
                }}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: colors.primary,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  opacity: pressed ? 0.9 : 1,
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 4,
                })}
              >
                <MaterialIcons name="add" size={20} color="#fff" style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 14, fontFamily: "DMSans-Bold", color: "#fff" }}>
                  Add User
                </Text>
              </Pressable>
            </View>

            {/* Search Bar */}
            <View style={{ marginBottom: 20 }}>
              <View style={[styles.input, {
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 16,
                height: 56,
                borderRadius: 16
              }]}>
                <MaterialIcons name="search" size={24} color={colors.textSecondary} />
                <TextInput
                  style={{
                    flex: 1,
                    marginLeft: 12,
                    fontSize: 16,
                    color: colors.textPrimary,
                    fontFamily: "DMSans-Regular",
                    height: "100%",
                  }}
                  placeholder="Search users..."
                  placeholderTextColor={colors.textSecondary}
                  value={searchQuery}
                  onChangeText={(text) => {
                    setSearchQuery(text);
                    setCurrentPage(1);
                  }}
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery("")}>
                    <MaterialIcons name="close" size={20} color={colors.textSecondary} />
                  </Pressable>
                )}
              </View>
            </View>

            {/* Filters and Sort */}
            <View style={{ marginBottom: 20 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 20 }}>
                {/* Role Filter */}
                {["all", "student", "teacher", "admin", "staff"].map((role) => (
                  <Pressable
                    key={role}
                    onPress={() => {
                      setRoleFilter(role);
                      setCurrentPage(1);
                    }}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      backgroundColor: roleFilter === role ? colors.primary : colors.cardBackground,
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor: roleFilter === role ? colors.primary : colors.border,
                      elevation: roleFilter === role ? 4 : 0,
                      shadowColor: roleFilter === role ? colors.primary : "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: roleFilter === role ? 0.3 : 0,
                      shadowRadius: 4,
                    }}
                  >
                    <Text style={{
                      color: roleFilter === role ? "#fff" : colors.textSecondary,
                      fontFamily: roleFilter === role ? "DMSans-Bold" : "DMSans-Medium",
                      textTransform: "capitalize",
                      fontSize: 14
                    }}>
                      {role === "all" ? "All Roles" : role}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <View style={{ flexDirection: "row", marginTop: 16, gap: 12 }}>
                {/* Sort By */}
                <Pressable
                  onPress={() => setSortBy(sortBy === "createdAt" ? "name" : "createdAt")}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    backgroundColor: colors.cardBackground,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <MaterialIcons name="sort" size={18} color={colors.textSecondary} style={{ marginRight: 6 }} />
                  <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: "DMSans-Medium" }}>
                    Sort: {sortBy === "createdAt" ? "Date" : "Name"}
                  </Text>
                </Pressable>

                {/* Sort Order */}
                <Pressable
                  onPress={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    backgroundColor: colors.cardBackground,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <MaterialIcons name={sortOrder === "asc" ? "arrow-upward" : "arrow-downward"} size={18} color={colors.textSecondary} style={{ marginRight: 6 }} />
                  <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: "DMSans-Medium" }}>
                    {sortOrder === "asc" ? "Ascending" : "Descending"}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Users List */}
            <View>
              {loading && users.length === 0 ? (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={{ marginTop: 16, color: colors.textSecondary, fontFamily: "DMSans-Medium" }}>Loading users...</Text>
                </View>
              ) : userError ? (
                <View style={{ padding: 20, alignItems: 'center', backgroundColor: colors.error + '10', borderRadius: 12 }}>
                  <MaterialIcons name="error-outline" size={40} color={colors.error} />
                  <Text style={{ marginTop: 8, color: colors.error, fontFamily: "DMSans-Bold" }}>Failed to load user profile</Text>
                  <Text style={{ marginTop: 4, color: colors.textSecondary, textAlign: 'center' }}>{userError.message}</Text>
                </View>
              ) : !isAdmin && !userLoading ? (
                <View style={{ padding: 20, alignItems: 'center', backgroundColor: colors.warning + '10', borderRadius: 12 }}>
                  <MaterialIcons name="warning" size={40} color={colors.warning} />
                  <Text style={{ marginTop: 8, color: colors.warning, fontFamily: "DMSans-Bold" }}>Access Denied</Text>
                  <Text style={{ marginTop: 4, color: colors.textSecondary, textAlign: 'center' }}>You do not have permission to view this list.</Text>
                  <Text style={{ marginTop: 4, color: colors.textSecondary, fontSize: 12 }}>Current Role: {user?.role || 'Unknown'}</Text>
                </View>
              ) : usersError ? (
                <View style={{ padding: 20, alignItems: 'center', backgroundColor: colors.error + '10', borderRadius: 12 }}>
                  <MaterialIcons name="error-outline" size={40} color={colors.error} />
                  <Text style={{ marginTop: 8, color: colors.error, fontFamily: "DMSans-Bold" }}>Failed to load users</Text>
                  <Text style={{ marginTop: 4, color: colors.textSecondary, textAlign: 'center' }}>{usersError.message}</Text>
                  <Pressable onPress={refetch} style={{ marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.primary, borderRadius: 8 }}>
                    <Text style={{ color: '#fff', fontFamily: "DMSans-Bold" }}>Retry</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  {users.map((userItem) => (
                    <View
                      key={userItem._id}
                      style={[styles.cardMinimal, { marginBottom: 16, padding: 16 }]}
                    >
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <View style={{ flex: 1, marginRight: 12 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                            <Text style={{ fontSize: 18, fontFamily: "DMSans-Bold", color: colors.textPrimary, marginRight: 8 }}>
                              {userItem.name}
                            </Text>
                            <View
                              style={{
                                backgroundColor: getRoleColor(userItem.role) + "20",
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                                borderRadius: 12,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 11,
                                  fontFamily: "DMSans-Bold",
                                  color: getRoleColor(userItem.role),
                                  textTransform: "uppercase",
                                }}
                              >
                                {userItem.role}
                              </Text>
                            </View>
                          </View>

                          <View style={{ gap: 4 }}>
                            {userItem.email ? (
                              <View style={{ flexDirection: "row", alignItems: "center" }}>
                                <MaterialIcons name="email" size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
                                <Text style={{ fontSize: 14, color: colors.textSecondary, fontFamily: "DMSans-Regular" }}>
                                  {userItem.email}
                                </Text>
                              </View>
                            ) : null}
                            {userItem.phone ? (
                              <View style={{ flexDirection: "row", alignItems: "center" }}>
                                <MaterialIcons name="phone" size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
                                <Text style={{ fontSize: 14, color: colors.textSecondary, fontFamily: "DMSans-Regular" }}>
                                  {userItem.phone}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </View>

                        <View style={{ flexDirection: "row", gap: 12 }}>
                          <Pressable
                            onPress={() => {
                              setModalMode("edit");
                              setEditingUser(userItem);
                              setUserForm({ name: userItem.name, phone: userItem.phone, email: userItem.email, password: "", role: userItem.role });
                              setShowUserModal(true);
                            }}
                            style={({ pressed }) => ({
                              padding: 10,
                              backgroundColor: colors.background,
                              borderRadius: 12,
                              opacity: pressed ? 0.7 : 1,
                              borderWidth: 1,
                              borderColor: colors.border
                            })}
                          >
                            <MaterialIcons name="edit" size={20} color={colors.textSecondary} />
                          </Pressable>

                          <Pressable
                            onPress={() => {
                              Alert.alert(
                                "Delete User",
                                `Are you sure you want to delete ${userItem.name}?`,
                                [
                                  { text: "Cancel", style: "cancel" },
                                  { text: "Delete", style: "destructive", onPress: () => deleteUser(userItem._id, userItem.name) },
                                ]
                              );
                            }}
                            style={({ pressed }) => ({
                              padding: 10,
                              backgroundColor: colors.error + "15",
                              borderRadius: 12,
                              opacity: pressed ? 0.7 : 1,
                            })}
                          >
                            <MaterialIcons name="delete-outline" size={20} color={colors.error} />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  ))}

                  {users.length === 0 && (
                    <View style={{ alignItems: "center", padding: 40, opacity: 0.6 }}>
                      <MaterialIcons name="search-off" size={64} color={colors.textSecondary} />
                      <Text style={{ color: colors.textSecondary, marginTop: 16, fontSize: 16, fontFamily: "DMSans-Medium" }}>
                        No users found
                      </Text>
                    </View>
                  )}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 24, gap: 16 }}>
                      <Pressable
                        onPress={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        style={{
                          padding: 12,
                          backgroundColor: currentPage === 1 ? colors.background : colors.cardBackground,
                          borderRadius: 12,
                          opacity: currentPage === 1 ? 0.5 : 1,
                          borderWidth: 1,
                          borderColor: colors.border
                        }}
                      >
                        <MaterialIcons name="chevron-left" size={24} color={colors.textPrimary} />
                      </Pressable>

                      <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>
                        Page {currentPage} of {totalPages}
                      </Text>

                      <Pressable
                        onPress={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        style={{
                          padding: 12,
                          backgroundColor: currentPage === totalPages ? colors.background : colors.cardBackground,
                          borderRadius: 12,
                          opacity: currentPage === totalPages ? 0.5 : 1,
                          borderWidth: 1,
                          borderColor: colors.border
                        }}
                      >
                        <MaterialIcons name="chevron-right" size={24} color={colors.textPrimary} />
                      </Pressable>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* User Modal */}
      <Modal
        visible={showUserModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowUserModal(false)}
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
                <Pressable onPress={() => setShowUserModal(false)} style={{ padding: 4 }}>
                  <MaterialIcons name="close" size={24} color={colors.textSecondary} />
                </Pressable>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24 }}>
              {modalMode === "add" && (
                <>
                  <View style={{ marginBottom: 20 }}>
                    <Text style={[styles.label, { marginBottom: 8 }]}>NAME</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter name"
                      placeholderTextColor={colors.textSecondary}
                      value={userForm.name}
                      onChangeText={(text) => handleChange("name", text)}
                      onBlur={() => handleBlur("name")}
                    />
                    {errors.name && touched.name && (
                      <Text style={styles.errorText}>{errors.name}</Text>
                    )}
                  </View>

                  <View style={{ marginBottom: 20 }}>
                    <Text style={[styles.label, { marginBottom: 8 }]}>PHONE</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter phone number"
                      placeholderTextColor={colors.textSecondary}
                      value={userForm.phone}
                      onChangeText={(text) => handleChange("phone", text)}
                      onBlur={() => handleBlur("phone")}
                      keyboardType="phone-pad"
                      maxLength={10}
                    />
                    {errors.phone && touched.phone && (
                      <Text style={styles.errorText}>{errors.phone}</Text>
                    )}
                  </View>

                  <View style={{ marginBottom: 20 }}>
                    <Text style={[styles.label, { marginBottom: 8 }]}>EMAIL</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter email (optional)"
                      placeholderTextColor={colors.textSecondary}
                      value={userForm.email}
                      onChangeText={(text) => handleChange("email", text)}
                      onBlur={() => handleBlur("email")}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    {errors.email && touched.email && (
                      <Text style={styles.errorText}>{errors.email}</Text>
                    )}
                  </View>

                  <View style={{ marginBottom: 24 }}>
                    <Text style={[styles.label, { marginBottom: 8 }]}>PASSWORD</Text>
                    <View style={[styles.input, { flexDirection: "row", alignItems: "center", paddingHorizontal: 16 }]}>
                      <TextInput
                        style={{
                          flex: 1,
                          fontSize: 16,
                          color: colors.textPrimary,
                          fontFamily: "DMSans-Regular",
                          height: "100%"
                        }}
                        placeholder="Enter password"
                        placeholderTextColor={colors.textSecondary}
                        value={userForm.password}
                        onChangeText={(text) => handleChange("password", text)}
                        onBlur={() => handleBlur("password")}
                        secureTextEntry={!showPassword}
                      />
                      <Pressable
                        onPress={() => setShowPassword(!showPassword)}
                      >
                        <MaterialIcons
                          name={showPassword ? "visibility-off" : "visibility"}
                          size={20}
                          color={colors.textSecondary}
                        />
                      </Pressable>
                    </View>
                    {errors.password && touched.password && (
                      <Text style={styles.errorText}>{errors.password}</Text>
                    )}
                  </View>

                  {/* Role Selection */}
                  <View style={{ marginBottom: 24 }}>
                    <Text style={[styles.label, { marginBottom: 12 }]}>ROLE</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                      {availableRoles.map((role) => (
                        <Pressable
                          key={role}
                          onPress={() => handleChange("role", role)}
                          style={{
                            paddingHorizontal: 16,
                            paddingVertical: 10,
                            backgroundColor: userForm.role === role ? colors.primary : colors.background,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: userForm.role === role ? colors.primary : colors.border
                          }}
                        >
                          <Text style={{
                            color: userForm.role === role ? "#fff" : colors.textPrimary,
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

                  {/* Student Specific Fields */}
                  {userForm.role === "student" && (
                    <>
                      <View style={{ marginBottom: 20 }}>
                        <Text style={[styles.label, { marginBottom: 8 }]}>GUARDIAN NAME</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="Enter guardian name"
                          placeholderTextColor={colors.textSecondary}
                          value={userForm.guardianName}
                          onChangeText={(text) => handleChange("guardianName", text)}
                        />
                      </View>
                      <View style={{ marginBottom: 20 }}>
                        <Text style={[styles.label, { marginBottom: 8 }]}>GUARDIAN PHONE</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="Enter guardian phone"
                          placeholderTextColor={colors.textSecondary}
                          value={userForm.guardianPhone}
                          onChangeText={(text) => handleChange("guardianPhone", text)}
                          keyboardType="phone-pad"
                          maxLength={10}
                        />
                      </View>
                    </>
                  )}

                  {/* Teacher Specific Fields */}
                  {(userForm.role === "class teacher" || userForm.role === "staff") && (
                    <>
                      <View style={{ marginBottom: 20 }}>
                        <Text style={[styles.label, { marginBottom: 8 }]}>DESIGNATION</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="Enter designation"
                          placeholderTextColor={colors.textSecondary}
                          value={userForm.designation}
                          onChangeText={(text) => handleChange("designation", text)}
                        />
                      </View>
                    </>
                  )}
                </>
              )}

              {modalMode === "edit" && (
                <View style={{ marginBottom: 32 }}>
                  <Text style={[styles.label, { marginBottom: 12 }]}>ROLE</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {availableRoles.map((role) => (
                      <Pressable
                        key={role}
                        onPress={() => setUserForm({ ...userForm, role })}
                        style={{
                          backgroundColor: userForm.role === role ? colors.primary : colors.background,
                          paddingHorizontal: 16,
                          paddingVertical: 10,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: userForm.role === role ? colors.primary : colors.border,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            fontFamily: "DMSans-Bold",
                            color: userForm.role === role ? "#fff" : colors.textSecondary,
                            textTransform: "capitalize",
                          }}
                        >
                          {role}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              <View style={{ flexDirection: "row", gap: 16, marginTop: 12 }}>
                <Pressable
                  onPress={() => setShowUserModal(false)}
                  style={({ pressed }) => ({
                    flex: 1,
                    paddingVertical: 16,
                    borderRadius: 16,
                    alignItems: "center",
                    backgroundColor: colors.background,
                    borderWidth: 1,
                    borderColor: colors.border,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Text style={{ fontSize: 16, fontFamily: "DMSans-Bold", color: colors.textSecondary }}>
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  onPress={modalMode === "add" ? createUser : () => updateUserRole(editingUser._id, userForm.role)}
                  disabled={(modalMode === "add" && !isFormValid()) || saving}
                  style={({ pressed }) => [
                    styles.button,
                    {
                      flex: 1,
                      opacity: ((modalMode === "add" && !isFormValid()) || saving) ? 0.5 : (pressed ? 0.9 : 1),
                      marginBottom: 0 // Override default margin
                    }
                  ]}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>
                      {modalMode === "add" ? "Create User" : "Save Changes"}
                    </Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
        minWidth: "30%",
        backgroundColor: colors.cardBackground,
        padding: 20,
        borderRadius: 24,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1,
        borderColor: colors.border,
        opacity: pressed ? 0.9 : 1
      })}
    >
      <View style={{
        backgroundColor: color + "15",
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <MaterialIcons name={icon} size={28} color={color} />
      </View>
      <Text style={{
        fontSize: 14,
        fontFamily: "DMSans-Bold",
        color: colors.textPrimary,
        textAlign: "center"
      }}>
        {title}
      </Text>
    </Pressable>
  );
};
