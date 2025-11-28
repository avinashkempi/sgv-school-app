import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal,
  StyleSheet,
  Platform,

} from "react-native";

import { MaterialIcons } from "@expo/vector-icons";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useTheme } from "../theme";
import apiConfig from "../config/apiConfig";
import apiFetch from "../utils/apiFetch";
import { useToast } from "../components/ToastProvider";
import { getCachedData, setCachedData, updateCachedData, CACHE_KEYS, CACHE_EXPIRY } from "../utils/cache";
import Header from "../components/Header";

// Global cache for users to persist across component re-mounts
let globalUsers = [];
let globalUsersLoading = true;
let globalUsersError = null;
let usersFetched = false;

export default function AdminScreen() {
  const router = useRouter();
  const { styles, colors } = useTheme();
  const { showToast } = useToast();
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState(globalUsers);
  const [loading, setLoading] = useState(globalUsersLoading);
  const [error, setError] = useState(globalUsersError);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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
  const [saving, setSaving] = useState(false);

  // Available roles for dropdown
  const availableRoles = ["student", "teacher", "staff", "admin", "super admin"];

  const validateField = (name, value) => {
    let error = "";
    switch (name) {
      case "name":
        if (!value.trim()) error = "Name is required";
        else if (value.trim().length < 3) error = "Name must be at least 3 characters";
        break;
      case "phone":
        if (!value.trim()) error = "Phone number is required";
        else if (!/^\d{10}$/.test(value.trim())) error = "Phone must be exactly 10 digits";
        break;
      case "email":
        if (value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
          error = "Invalid email format";
        }
        break;
      case "password":
        if (!value) error = "Password is required";
        else if (value.length < 6) error = "Password must be at least 6 characters";
        break;
    }
    return error;
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, userForm[field]);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const handleChange = (field, value) => {
    setUserForm(prev => ({ ...prev, [field]: value }));
    if (touched[field]) {
      const error = validateField(field, value);
      setErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  const isFormValid = () => {
    const nameError = validateField("name", userForm.name);
    const phoneError = validateField("phone", userForm.phone);
    const passwordError = validateField("password", userForm.password);
    const emailError = validateField("email", userForm.email);

    return !nameError && !phoneError && !passwordError && !emailError &&
      userForm.name && userForm.phone && userForm.password;
  };

  useEffect(() => {
    checkAuthAndLoadUsers();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      loadUsers();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, roleFilter, sortBy, sortOrder, currentPage]);

  const checkAuthAndLoadUsers = async () => {
    try {
      const storedUser = await AsyncStorage.getItem("@auth_user");
      const token = await AsyncStorage.getItem("@auth_token");

      if (!storedUser || !token) {
        router.replace("/login");
        return;
      }

      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser.role !== "admin" && parsedUser.role !== "super admin") {
          Alert.alert("Access Denied", "You don't have permission to access this page.");
          router.replace("/");
          return;
        }
        setUser(parsedUser);
      } catch (e) {
        console.error("Failed to parse stored user:", e);
        await AsyncStorage.removeItem("@auth_user");
        router.replace("/login");
        return;
      }

      if (usersFetched) {
        // If already fetched, use cached data
        setUsers(globalUsers);
        setLoading(globalUsersLoading);
        return;
      }

      await loadUsers();
    } catch (error) {
      console.error("Auth check error:", error);
      router.replace("/login");
    }
  };

  const loadUsers = async () => {
    try {
      // Try to load from cache first
      const cachedUsers = await getCachedData(CACHE_KEYS.USERS, CACHE_EXPIRY.USERS);
      if (cachedUsers) {
        globalUsers = cachedUsers;
        setUsers(globalUsers);
        setLoading(false);
        globalUsersLoading = false;
        usersFetched = true;
        // Fetch fresh data in background
        fetchFreshUsers();
        return;
      }

      // Only show loading if we need to fetch from API
      setLoading(true);
      await fetchFreshUsers();
    } catch (error) {
      console.error("Load users error:", error);
      setError(error.message);
      globalUsersError = error.message;
      globalUsers = [];
      setUsers([]);
      setLoading(false);
      globalUsersLoading = false;
      usersFetched = true;
      showToast("Failed to load users", "error");
    }
  };

  const fetchFreshUsers = async () => {
    try {
      const token = await AsyncStorage.getItem("@auth_token");

      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        search: searchQuery,
        role: roleFilter,
        sortBy,
        order: sortOrder
      });

      // Construct URL manually to ensure correct formatting
      const url = `${apiConfig.url(apiConfig.endpoints.users.list)}?${queryParams.toString()}`;

      const response = await apiFetch(url, {
        method: "GET",
        silent: true,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        globalUsers = result.data;
        setUsers(result.data);
        setTotalPages(result.pagination.pages);
        setLoading(false);
        globalUsersLoading = false;
        usersFetched = true;
        // Only cache if default view
        if (currentPage === 1 && !searchQuery && roleFilter === 'all') {
          await setCachedData(CACHE_KEYS.USERS, result.data);
        }
      } else {
        setUsers([]);
        setTotalPages(1);
        setLoading(false);
        globalUsersLoading = false;
        usersFetched = true;
        throw new Error("Failed to load users");
      }
    } catch (error) {
      console.error("Fetch fresh users error:", error);
      setLoading(false);
      globalUsersLoading = false;
      setError(error.message);
      globalUsersError = error.message;
      showToast("Failed to load users", "error");
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      setSaving(true);
      const token = await AsyncStorage.getItem("@auth_token");

      const response = await apiFetch(apiConfig.url(apiConfig.endpoints.users.update(userId)), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        // Update local state
        setUsers(prevUsers =>
          prevUsers.map(u => u._id === userId ? { ...u, role: newRole } : u)
        );
        showToast("Role updated successfully", "success");
        setShowUserModal(false);
      } else {
        throw new Error("Failed to update role");
      }
    } catch (error) {
      console.error("Update role error:", error);
      showToast("Failed to update role", "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (userId, name) => {
    try {
      const token = await AsyncStorage.getItem("@auth_token");

      const response = await apiFetch(apiConfig.url(apiConfig.endpoints.users.delete(userId)), {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        // Update local state
        setUsers(prevUsers => prevUsers.filter(u => u._id !== userId));
        // Update cache
        await updateCachedData(CACHE_KEYS.USERS, (cachedUsers) =>
          cachedUsers.filter(u => u._id !== userId)
        );
        showToast(`User ${name} deleted successfully`, "success");
      } else {
        throw new Error("Failed to delete user");
      }
    } catch (error) {
      console.error("Delete user error:", error);
      showToast("Failed to delete user", "error");
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
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

  const createUser = async () => {
    try {
      if (!userForm.name || !userForm.phone || !userForm.password) {
        showToast("Please fill in all required fields", "error");
        return;
      }

      setSaving(true);

      const userData = { ...userForm }; // Capture form data

      const token = await AsyncStorage.getItem("@auth_token");

      const response = await apiFetch(apiConfig.url(apiConfig.endpoints.users.create), {
        method: "POST",
        silent: true,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(userData),
      });

      const result = await response.json();

      if (!response.ok) {
        let errorMessage = result.message || `Failed to create user (Status: ${response.status})`;

        // Check for specific validation errors
        if (result.errors && Array.isArray(result.errors) && result.errors.length > 0) {
          errorMessage = result.errors[0].msg || errorMessage;
        }

        throw new Error(errorMessage);
      }

      if (result.success) {
        setUsers(prevUsers => [...prevUsers, result.user]);
        showToast("User created successfully", "success");
        setUserForm({ name: "", phone: "", email: "", password: "", role: "student" });
        setShowUserModal(false);
      } else {
        throw new Error(result.message || "Failed to create user");
      }
    } catch (error) {
      console.error("Create user error:", error);
      showToast(error.message || "Failed to create user", "error");
    } finally {
      setSaving(false);
    }
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
                  onPress={() => router.push("/admin/complaints")}
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
