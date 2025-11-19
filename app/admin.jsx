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
} from "react-native";

import { MaterialIcons } from "@expo/vector-icons";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useTheme } from "../theme";
import apiConfig from "./config/apiConfig";
import { useToast } from "./_utils/ToastProvider";
import { getCachedData, setCachedData, updateCachedData, CACHE_KEYS, CACHE_EXPIRY } from "./utils/cache";

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
  const [showPassword, setShowPassword] = useState(false);

  // Available roles for dropdown
  const availableRoles = ["student", "class teacher", "staff", "admin", "super admin"];

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

      const response = await fetch(apiConfig.url(apiConfig.endpoints.users.list), {
        method: "GET",
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
        // Cache the data
        await setCachedData(CACHE_KEYS.USERS, result.data);
      } else {
        globalUsers = [];
        setUsers([]);
        throw new Error("Failed to load users");
      }
    } catch (error) {
      console.error("Fetch fresh users error:", error);
      // Don't override existing cached data if fetch fails
      if (!globalUsers.length) {
        setError(error.message);
        globalUsersError = error.message;
        showToast("Failed to load users", "error");
      }
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      const token = await AsyncStorage.getItem("@auth_token");

      const response = await fetch(apiConfig.url(apiConfig.endpoints.users.update(userId)), {
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
        setShowUserModal(false);
        showToast("Role updated successfully", "success");
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

      const response = await fetch(apiConfig.url(apiConfig.endpoints.users.delete(userId)), {
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

      const token = await AsyncStorage.getItem("@auth_token");

      const response = await fetch(apiConfig.url(apiConfig.endpoints.users.create), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(userForm),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setUsers(prevUsers => [...prevUsers, result.user]);
        setShowUserModal(false);
        setUserForm({ name: "", phone: "", email: "", password: "", role: "student" });
        showToast("User created successfully", "success");
      } else {
        throw new Error(result.message || "Failed to create user");
      }
    } catch (error) {
      console.error("Create user error:", error);
      showToast(error.message || "Failed to create user", "error");
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.text, { marginTop: 16 }]}>Loading users...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }
    >
      <View style={{ padding: 16 }}>
        {/* Header */}
        <View style={{ marginBottom: 20 }}>
          <View style={{ marginBottom: 8 }}>
            <Text style={[styles.heading, { fontSize: 24 }]}>
              Admin Dashboard
            </Text>
          </View>
          <Text style={[styles.text, { color: colors.textSecondary }]}>
            Manage user roles and permissions
          </Text>
        </View>

        {/* Add User Button */}
        <View style={{ marginBottom: 16 }}>
          <Pressable
            onPress={() => {
              setModalMode("add");
              setUserForm({ name: "", phone: "", email: "", password: "", role: "student" });
              setShowUserModal(true);
            }}
            style={{
              backgroundColor: colors.primary,
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 8,
              flexDirection: "row",
              alignItems: "center",
              alignSelf: "flex-start",
            }}
          >
            <MaterialIcons name="add" size={20} color={colors.white} />
            <Text style={{ color: colors.white, fontWeight: "600", marginLeft: 6 }}>
              Add User
            </Text>
          </Pressable>
        </View>

        {/* Search and Sort */}
        <View style={{ marginBottom: 16 }}>
          <TextInput
            style={{
              backgroundColor: colors.surface,
              borderRadius: 6,
              padding: 10,
              fontSize: 16,
              color: colors.text,
              borderWidth: 1,
              borderColor: colors.border,
              fontFamily: "Quicksand",
            }}
            placeholder="Search by name, email, or role..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />


        </View>

        {/* Users List */}
        <View style={{ marginBottom: 20 }}>
          <Text style={[styles.label, { marginBottom: 12 }]}>
            Users ({filteredAndSortedUsers().length})
          </Text>

          {paginatedUsers().map((userItem) => (
            <View
              key={userItem._id}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardText, { fontWeight: "600", fontSize: 16, marginBottom: 4 }]}>
                    {userItem.name}
                  </Text>
                  <Text style={[styles.text, { fontSize: 14, color: colors.textSecondary, marginBottom: 8 }]}>
                    {userItem.email}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View
                      style={{
                        backgroundColor: getRoleColor(userItem.role),
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 12,
                        marginRight: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "600",
                          color: "#000",
                          textTransform: "capitalize",
                        }}
                      >
                        {userItem.role}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Pressable
                    onPress={() => {
                      setModalMode("edit");
                      setEditingUser(userItem);
                      setUserForm({ name: userItem.name, phone: userItem.phone, email: userItem.email, password: "", role: userItem.role });
                      setShowUserModal(true);
                    }}
                    style={{
                      backgroundColor: colors.primary,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 8,
                      flexDirection: "row",
                      alignItems: "center",
                      marginRight: 8,
                    }}
                  >
                    <MaterialIcons name="edit" size={16} color={colors.white} />
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      Alert.alert(
                        "Delete User",
                        `Are you sure you want to delete ${userItem.name}? This action cannot be undone.`,
                        [
                          { text: "Cancel", style: "cancel" },
                          { text: "Delete", style: "destructive", onPress: () => deleteUser(userItem._id, userItem.name) },
                        ]
                      );
                    }}
                    style={{
                      backgroundColor: colors.error,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 8,
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <MaterialIcons name="delete" size={16} color={colors.white} />
                  </Pressable>
                </View>
              </View>
            </View>
          ))}

          {filteredAndSortedUsers().length === 0 && (
            <View style={{ alignItems: "center", padding: 40 }}>
              <MaterialIcons name="search-off" size={48} color={colors.textSecondary} />
              <Text style={[styles.text, { color: colors.textSecondary, marginTop: 16 }]}>
                No users found matching your search.
              </Text>
            </View>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 16 }}>
              <Pressable
                onPress={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 6,
                  backgroundColor: currentPage === 1 ? colors.surface : colors.primary,
                  marginRight: 8,
                }}
              >
                <MaterialIcons
                  name="chevron-left"
                  size={20}
                  color={currentPage === 1 ? colors.textSecondary : colors.white}
                />
              </Pressable>

              <Text style={[styles.text, { marginHorizontal: 16 }]}>
                Page {currentPage} of {totalPages}
              </Text>

              <Pressable
                onPress={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 6,
                  backgroundColor: currentPage === totalPages ? colors.surface : colors.primary,
                  marginLeft: 8,
                }}
              >
                <MaterialIcons
                  name="chevron-right"
                  size={20}
                  color={currentPage === totalPages ? colors.textSecondary : colors.white}
                />
              </Pressable>
            </View>
          )}
        </View>
      </View>

      {/* User Modal */}
      <Modal
        visible={showUserModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowUserModal(false)}
      >
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View style={{ backgroundColor: "#ffffff", borderRadius: 12, padding: 20, width: "90%", maxWidth: 400 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <Text style={[styles.heading, { fontSize: 20 }]}>
                {modalMode === "add" ? "Add New User" : "Edit User Role"}
              </Text>
              <Pressable onPress={() => setShowUserModal(false)}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            {modalMode === "add" && (
              <>
                <View style={{ marginBottom: 16 }}>
                  <Text style={[styles.label, { marginBottom: 8 }]}>Name</Text>
                  <TextInput
                    style={{
                      backgroundColor: colors.background,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 16,
                      color: colors.text,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                    placeholder="Enter name"
                    placeholderTextColor={colors.textSecondary}
                    value={userForm.name}
                    onChangeText={(text) => setUserForm({ ...userForm, name: text })}
                  />
                </View>

                <View style={{ marginBottom: 16 }}>
                  <Text style={[styles.label, { marginBottom: 8 }]}>Phone</Text>
                  <TextInput
                    style={{
                      backgroundColor: colors.background,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 16,
                      color: colors.text,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                    placeholder="Enter phone number"
                    placeholderTextColor={colors.textSecondary}
                    value={userForm.phone}
                    onChangeText={(text) => setUserForm({ ...userForm, phone: text })}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={{ marginBottom: 16 }}>
                  <Text style={[styles.label, { marginBottom: 8 }]}>Email</Text>
                  <TextInput
                    style={{
                      backgroundColor: colors.background,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 16,
                      color: colors.text,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                    placeholder="Enter email"
                    placeholderTextColor={colors.textSecondary}
                    value={userForm.email}
                    onChangeText={(text) => setUserForm({ ...userForm, email: text })}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={{ marginBottom: 16 }}>
                  <Text style={[styles.label, { marginBottom: 8 }]}>Password</Text>
                  <View style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: colors.background,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}>
                    <TextInput
                      style={{
                        flex: 1,
                        padding: 12,
                        fontSize: 16,
                        color: colors.text,
                      }}
                      placeholder="Enter password"
                      placeholderTextColor={colors.textSecondary}
                      value={userForm.password}
                      onChangeText={(text) => setUserForm({ ...userForm, password: text })}
                      secureTextEntry={!showPassword}
                    />
                    <Pressable
                      onPress={() => setShowPassword(!showPassword)}
                      style={{ padding: 8 }}
                    >
                      <MaterialIcons
                        name={showPassword ? "visibility-off" : "visibility"}
                        size={24}
                        color={colors.textSecondary}
                      />
                    </Pressable>
                  </View>
                </View>
              </>
            )}

            <View style={{ marginBottom: 24 }}>
              <Text style={[styles.label, { marginBottom: 8 }]}>Role</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {availableRoles.map((role) => (
                  <Pressable
                    key={role}
                    onPress={() => setUserForm({ ...userForm, role })}
                    style={{
                      backgroundColor: userForm.role === role ? colors.primary : colors.surface,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 6,
                      marginRight: 8,
                      marginBottom: 8,
                      borderWidth: 1,
                      borderColor: userForm.role === role ? colors.primary : colors.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: userForm.role === role ? colors.white : colors.text,
                        textTransform: "capitalize",
                      }}
                    >
                      {role}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Pressable
                onPress={() => setShowUserModal(false)}
                style={{
                  flex: 1,
                  backgroundColor: colors.surface,
                  paddingVertical: 12,
                  borderRadius: 8,
                  marginRight: 8,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ textAlign: "center", fontWeight: "600", color: colors.text }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={modalMode === "add" ? createUser : () => updateUserRole(editingUser._id, userForm.role)}
                style={{
                  flex: 1,
                  backgroundColor: colors.primary,
                  paddingVertical: 12,
                  borderRadius: 8,
                  marginLeft: 8,
                }}
              >
                <Text style={{ textAlign: "center", fontWeight: "600", color: colors.white }}>
                  {modalMode === "add" ? "Create User" : "Update Role"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
