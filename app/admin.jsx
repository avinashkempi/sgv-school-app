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
  TouchableWithoutFeedback,
  Keyboard,
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
    role: "student"
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  // Available roles for dropdown
  const availableRoles = ["student", "class teacher", "staff", "admin", "super admin"];

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
    setCurrentPage(1);
  }, [searchQuery]);

  const checkAuthAndLoadUsers = async () => {
    try {
      const storedUser = await AsyncStorage.getItem("@auth_user");
      const token = await AsyncStorage.getItem("@auth_token");

      if (!storedUser || !token) {
        router.replace("/login");
        return;
      }

      const parsedUser = JSON.parse(storedUser);
      if (parsedUser.role !== "admin" && parsedUser.role !== "super admin") {
        Alert.alert("Access Denied", "You don't have permission to access this page.");
        router.replace("/");
        return;
      }

      setUser(parsedUser);

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

      const response = await apiFetch(apiConfig.url(apiConfig.endpoints.users.list), {
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
      if (result.success && result.data) {
        globalUsers = result.data;
        setUsers(globalUsers);
        setLoading(false);
        globalUsersLoading = false;
        usersFetched = true;
        // Cache the data
        await setCachedData(CACHE_KEYS.USERS, result.data);
      } else {
        globalUsers = [];
        setUsers([]);
        setLoading(false);
        globalUsersLoading = false;
        usersFetched = true;
        throw new Error("Failed to load users");
      }
    } catch (error) {
      console.error("Fetch fresh users error:", error);
      // Don't override existing cached data if fetch fails
      if (!globalUsers.length) {
        setLoading(false);
        globalUsersLoading = false;
        setError(error.message);
        globalUsersError = error.message;
        showToast("Failed to load users", "error");
      }
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
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

        // Delay closing to ensure user sees success message
        setTimeout(() => {
          setShowUserModal(false);
        }, 800);
      } else {
        throw new Error("Failed to update role");
      }
    } catch (error) {
      console.error("Update role error:", error);
      showToast("Failed to update role", "error");
    }
  };

  const deleteUser = async (userId, userName) => {
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
        showToast(`User ${userName} deleted successfully`, "success");
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

  const filteredUsers = () => {
    return users.filter(user =>
      (user.name && user.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.phone && user.phone.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.role && user.role.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  };

  const filteredAndSortedUsers = () => {
    return filteredUsers();
  };

  const totalPages = Math.ceil(filteredAndSortedUsers().length / pageSize);

  const paginatedUsers = () => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAndSortedUsers().slice(startIndex, startIndex + pageSize);
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

      // Close modal immediately and show background loader
      setShowUserModal(false);
      setRefreshing(true);

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

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setUsers(prevUsers => [...prevUsers, result.user]);
        showToast("User created successfully", "success");
        setUserForm({ name: "", phone: "", email: "", password: "", role: "student" });
      } else {
        throw new Error(result.message || "Failed to create user");
      }
    } catch (error) {
      console.error("Create user error:", error);
      showToast(error.message || "Failed to create user", "error");
    } finally {
      setRefreshing(false);
    }
  };

  if (loading && users.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.text, { marginTop: 16 }]}>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        <View style={{ padding: 16, paddingTop: 24 }}>
          {/* Minimal Header */}
          <Header title="Admin" subtitle="Manage users and permissions" />

          {/* Minimal Search Bar */}
          <View style={{ marginBottom: 24 }}>
            <View style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.cardBackground,
              borderRadius: 12,
              paddingHorizontal: 16,
              height: 50,
              // Soft shadow
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}>
              <MaterialIcons name="search" size={22} color={colors.textSecondary} />
              <TextInput
                style={{
                  flex: 1,
                  marginLeft: 12,
                  fontSize: 16,
                  color: colors.textPrimary,
                  height: "100%",
                }}
                placeholder="Search users..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery("")}>
                  <MaterialIcons name="close" size={20} color={colors.textSecondary} />
                </Pressable>
              )}
            </View>
          </View>

          {/* Users List */}
          <View>
            <Text style={{
              fontSize: 14,
              fontWeight: "600",
              color: colors.textSecondary,
              marginBottom: 16,
              textTransform: "uppercase",
              letterSpacing: 0.5
            }}>
              All Users ({filteredAndSortedUsers().length})
            </Text>

            {paginatedUsers().map((userItem) => (
              <View
                key={userItem._id}
                style={{
                  backgroundColor: colors.cardBackground,
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 12,
                  // Very subtle shadow
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.03,
                  shadowRadius: 4,
                  elevation: 1,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                      <Text style={{ fontSize: 17, fontWeight: "600", color: colors.textPrimary, marginRight: 8 }}>
                        {userItem.name}
                      </Text>
                      <View
                        style={{
                          backgroundColor: getRoleColor(userItem.role) + "20", // 20% opacity
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 100,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: "600",
                            color: getRoleColor(userItem.role),
                            textTransform: "uppercase",
                          }}
                        >
                          {userItem.role}
                        </Text>
                      </View>
                    </View>

                    <View style={{ gap: 2 }}>
                      {userItem.email ? (
                        <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                          {userItem.email}
                        </Text>
                      ) : null}
                      {userItem.phone ? (
                        <Text style={{ fontSize: 13, color: colors.textSecondary, opacity: 0.8 }}>
                          {userItem.phone}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Pressable
                      onPress={() => {
                        setModalMode("edit");
                        setEditingUser(userItem);
                        setUserForm({ name: userItem.name, phone: userItem.phone, email: userItem.email, password: "", role: userItem.role });
                        setShowUserModal(true);
                      }}
                      style={({ pressed }) => ({
                        padding: 8,
                        backgroundColor: colors.background,
                        borderRadius: 8,
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <MaterialIcons name="edit" size={18} color={colors.textSecondary} />
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
                        padding: 8,
                        backgroundColor: colors.error + "15",
                        borderRadius: 8,
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <MaterialIcons name="delete-outline" size={18} color={colors.error} />
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}

            {filteredAndSortedUsers().length === 0 && (
              <View style={{ alignItems: "center", padding: 40, opacity: 0.6 }}>
                <MaterialIcons name="search-off" size={48} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, marginTop: 16, fontSize: 16 }}>
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
                    padding: 10,
                    backgroundColor: currentPage === 1 ? colors.background : colors.cardBackground,
                    borderRadius: 8,
                    opacity: currentPage === 1 ? 0.5 : 1,
                  }}
                >
                  <MaterialIcons
                    name="chevron-left"
                    size={24}
                    color={colors.textPrimary}
                  />
                </Pressable>

                <Text style={{ fontSize: 15, fontWeight: "600", color: colors.textPrimary }}>
                  {currentPage} / {totalPages}
                </Text>

                <Pressable
                  onPress={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: 10,
                    backgroundColor: currentPage === totalPages ? colors.background : colors.cardBackground,
                    borderRadius: 8,
                    opacity: currentPage === totalPages ? 0.5 : 1,
                  }}
                >
                  <MaterialIcons
                    name="chevron-right"
                    size={24}
                    color={colors.textPrimary}
                  />
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <Pressable
        onPress={() => {
          setModalMode("add");
          setUserForm({ name: "", phone: "", email: "", password: "", role: "student" });
          setShowUserModal(true);
        }}
        style={({ pressed }) => ({
          position: "absolute",
          bottom: 100,
          right: 24,
          backgroundColor: colors.primary,
          width: 56,
          height: 56,
          borderRadius: 28,
          justifyContent: "center",
          alignItems: "center",
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 6,
          transform: [{ scale: pressed ? 0.95 : 1 }],
        })}
      >
        <MaterialIcons name="add" size={28} color="#fff" />
      </Pressable>

      {/* User Modal */}
      <Modal
        visible={showUserModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowUserModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.6)" }}>
            <View style={{
              backgroundColor: colors.cardBackground,
              borderRadius: 24,
              padding: 24,
              width: "90%",
              maxWidth: 400,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.25,
              shadowRadius: 20,
              elevation: 10,
            }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <Text style={{ fontSize: 22, fontWeight: "700", color: colors.textPrimary }}>
                  {modalMode === "add" ? "New User" : "Edit User"}
                </Text>
                <Pressable onPress={() => setShowUserModal(false)} style={{ padding: 4 }}>
                  <MaterialIcons name="close" size={24} color={colors.textSecondary} />
                </Pressable>
              </View>

              {modalMode === "add" && (
                <>
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 8, marginLeft: 4 }}>NAME</Text>
                    <TextInput
                      style={{
                        backgroundColor: colors.background,
                        borderRadius: 12,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        fontSize: 16,
                        color: colors.textPrimary,
                        borderWidth: 1,
                        borderColor: errors.name && touched.name ? colors.error : "transparent"
                      }}
                      placeholder="Enter name"
                      placeholderTextColor={colors.textSecondary}
                      value={userForm.name}
                      onChangeText={(text) => handleChange("name", text)}
                      onBlur={() => handleBlur("name")}
                    />
                    {errors.name && touched.name && (
                      <Text style={{ color: colors.error, fontSize: 12, marginTop: 4, marginLeft: 4 }}>{errors.name}</Text>
                    )}
                  </View>

                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 8, marginLeft: 4 }}>PHONE</Text>
                    <TextInput
                      style={{
                        backgroundColor: colors.background,
                        borderRadius: 12,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        fontSize: 16,
                        color: colors.textPrimary,
                        borderWidth: 1,
                        borderColor: errors.phone && touched.phone ? colors.error : "transparent"
                      }}
                      placeholder="Enter phone number"
                      placeholderTextColor={colors.textSecondary}
                      value={userForm.phone}
                      onChangeText={(text) => handleChange("phone", text)}
                      onBlur={() => handleBlur("phone")}
                      keyboardType="phone-pad"
                      maxLength={10}
                    />
                    {errors.phone && touched.phone && (
                      <Text style={{ color: colors.error, fontSize: 12, marginTop: 4, marginLeft: 4 }}>{errors.phone}</Text>
                    )}
                  </View>

                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 8, marginLeft: 4 }}>EMAIL</Text>
                    <TextInput
                      style={{
                        backgroundColor: colors.background,
                        borderRadius: 12,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        fontSize: 16,
                        color: colors.textPrimary,
                        borderWidth: 1,
                        borderColor: errors.email && touched.email ? colors.error : "transparent"
                      }}
                      placeholder="Enter email (optional)"
                      placeholderTextColor={colors.textSecondary}
                      value={userForm.email}
                      onChangeText={(text) => handleChange("email", text)}
                      onBlur={() => handleBlur("email")}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    {errors.email && touched.email && (
                      <Text style={{ color: colors.error, fontSize: 12, marginTop: 4, marginLeft: 4 }}>{errors.email}</Text>
                    )}
                  </View>

                  <View style={{ marginBottom: 24 }}>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 8, marginLeft: 4 }}>PASSWORD</Text>
                    <View style={{
                      backgroundColor: colors.background,
                      borderRadius: 12,
                      flexDirection: "row",
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: errors.password && touched.password ? colors.error : "transparent"
                    }}>
                      <TextInput
                        style={{
                          flex: 1,
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          fontSize: 16,
                          color: colors.textPrimary,
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
                        style={{ paddingHorizontal: 16 }}
                      >
                        <MaterialIcons
                          name={showPassword ? "visibility-off" : "visibility"}
                          size={20}
                          color={colors.textSecondary}
                        />
                      </Pressable>
                    </View>
                    {errors.password && touched.password && (
                      <Text style={{ color: colors.error, fontSize: 12, marginTop: 4, marginLeft: 4 }}>{errors.password}</Text>
                    )}
                  </View>
                </>
              )}

              <View style={{ marginBottom: 32 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 12, marginLeft: 4 }}>ROLE</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {availableRoles.map((role) => (
                    <Pressable
                      key={role}
                      onPress={() => setUserForm({ ...userForm, role })}
                      style={{
                        backgroundColor: userForm.role === role ? colors.primary : colors.background,
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 100,
                        borderWidth: 1,
                        borderColor: userForm.role === role ? colors.primary : "transparent",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "600",
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

              <View style={{ flexDirection: "row", gap: 12 }}>
                <Pressable
                  onPress={() => setShowUserModal(false)}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: 12,
                    alignItems: "center",
                    backgroundColor: colors.background,
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: "600", color: colors.textSecondary }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={modalMode === "add" ? createUser : () => updateUserRole(editingUser._id, userForm.role)}
                  disabled={modalMode === "add" && !isFormValid()}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: 12,
                    alignItems: "center",
                    backgroundColor: colors.primary,
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                    elevation: 4,
                    opacity: (modalMode === "add" && !isFormValid()) ? 0.5 : 1
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: "600", color: "#fff" }}>
                    {modalMode === "add" ? "Create User" : "Save Changes"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback >
      </Modal >
    </View >
  );
}
