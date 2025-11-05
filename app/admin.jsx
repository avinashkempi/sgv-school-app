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
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useTheme } from "../theme";
import apiConfig from "./config/apiConfig";
import { useToast } from "./_utils/ToastProvider";

export default function AdminScreen() {
  const router = useRouter();
  const { styles, colors } = useTheme();
  const { showToast } = useToast();
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("username"); // username, email, role
  const [sortOrder, setSortOrder] = useState("asc");
  const [showUserModal, setShowUserModal] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // "add" or "edit"
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "student"
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Available roles for dropdown
  const availableRoles = ["student", "class teacher", "staff", "admin", "super admin"];

  useEffect(() => {
    checkAuthAndLoadUsers();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, pageSize]);

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
      await loadUsers();
    } catch (error) {
      console.error("Auth check error:", error);
      router.replace("/login");
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
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
        setUsers(result.data);
      } else {
        throw new Error("Failed to load users");
      }
    } catch (error) {
      console.error("Load users error:", error);
      showToast("Failed to load users", "error");
    } finally {
      setLoading(false);
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

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const filteredAndSortedUsers = () => {
    let filtered = users.filter(user =>
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role.toLowerCase().includes(searchQuery.toLowerCase())
    );

    filtered.sort((a, b) => {
      let aValue = a[sortBy].toLowerCase();
      let bValue = b[sortBy].toLowerCase();

      if (sortOrder === "asc") {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });

    return filtered;
  };

  const paginatedUsers = () => {
    const filtered = filteredAndSortedUsers();
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filtered.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredAndSortedUsers().length / pageSize);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };



  const getRoleColor = (role) => {
    switch (role) {
      case "super admin":
        return "#FF6B6B";
      case "admin":
        return "#4ECDC4";
      case "staff":
        return "#45B7D1";
      case "class teacher":
        return "#96CEB4";
      case "student":
        return "#FFEAA7";
      default:
        return colors.textSecondary;
    }
  };

  const createUser = async () => {
    try {
      if (!userForm.username || !userForm.email || !userForm.password) {
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
        setUserForm({ username: "", email: "", password: "", role: "student" });
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
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <Text style={[styles.heading, { fontSize: 24 }]}>
              Admin Dashboard
            </Text>
            <Pressable
              onPress={() => {
                setModalMode("add");
                setUserForm({ username: "", email: "", password: "", role: "student" });
                setShowUserModal(true);
              }}
              style={{
                backgroundColor: colors.primary,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 8,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <MaterialIcons name="add" size={20} color={colors.white} />
              <Text style={{ color: colors.white, fontWeight: "600", marginLeft: 6 }}>
                Add
              </Text>
            </Pressable>
          </View>
          <Text style={[styles.text, { color: colors.textSecondary }]}>
            Manage user roles and permissions
          </Text>
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
            placeholder="Search by username, email, or role..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          <View style={{ marginTop: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[{ marginBottom: 4, fontFamily: "Quicksand-SemiBold", fontSize: 14 }]}>Sort by</Text>
                <View style={{
                  backgroundColor: colors.surface,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: colors.border,
                  elevation: 2,
                  shadowColor: colors.shadow,
                  shadowOpacity: 0.06,
                  shadowOffset: { width: 0, height: 1 },
                  shadowRadius: 3,
                }}>
                  <Picker
                    selectedValue={sortBy}
                    onValueChange={(itemValue) => setSortBy(itemValue)}
                    style={{
                      color: colors.text,
                      height: 30,
                      fontFamily: "Quicksand",
                    }}
                  >
                    <Picker.Item label="Username" value="username" />
                    <Picker.Item label="Email" value="email" />
                    <Picker.Item label="Role" value="role" />
                  </Picker>
                </View>
              </View>
              <View style={{ flex: 1, marginHorizontal: 8 }}>
                <Text style={[{ marginBottom: 4, fontFamily: "Quicksand-SemiBold", fontSize: 14 }]}>Order</Text>
                <View style={{
                  backgroundColor: colors.surface,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: colors.border,
                  elevation: 2,
                  shadowColor: colors.shadow,
                  shadowOpacity: 0.06,
                  shadowOffset: { width: 0, height: 1 },
                  shadowRadius: 3,
                }}>
                  <Picker
                    selectedValue={sortOrder}
                    onValueChange={(itemValue) => setSortOrder(itemValue)}
                    style={{
                      color: colors.text,
                      height: 30,
                      fontFamily: "Quicksand",
                    }}
                  >
                    <Picker.Item label="Ascending" value="asc" />
                    <Picker.Item label="Descending" value="desc" />
                  </Picker>
                </View>
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={[{ marginBottom: 4, fontFamily: "Quicksand-SemiBold", fontSize: 14 }]}>Per page</Text>
                <View style={{
                  backgroundColor: colors.surface,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: colors.border,
                  elevation: 2,
                  shadowColor: colors.shadow,
                  shadowOpacity: 0.06,
                  shadowOffset: { width: 0, height: 1 },
                  shadowRadius: 3,
                }}>
                  <Picker
                    selectedValue={pageSize}
                    onValueChange={(itemValue) => setPageSize(itemValue)}
                    style={{
                      color: colors.text,
                      height: 30,
                      fontFamily: "Quicksand",
                    }}
                  >
                    <Picker.Item label="20" value={20} />
                    <Picker.Item label="50" value={50} />
                    <Picker.Item label="50" value={100} />
                  </Picker>
                </View>
              </View>
            </View>
          </View>
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
                    {userItem.username}
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

                <Pressable
                  onPress={() => {
                    setModalMode("edit");
                    setEditingUser(userItem);
                    setUserForm({ username: userItem.username, email: userItem.email, password: "", role: userItem.role });
                    setShowUserModal(true);
                  }}
                  style={{
                    backgroundColor: colors.primary,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 8,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <MaterialIcons name="edit" size={16} color={colors.white} />
                  <Text style={{ color: colors.white, fontWeight: "600", marginLeft: 6 }}>
                    Edit Role
                  </Text>
                </Pressable>
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
                  <Text style={[styles.label, { marginBottom: 8 }]}>Username</Text>
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
                    placeholder="Enter username"
                    placeholderTextColor={colors.textSecondary}
                    value={userForm.username}
                    onChangeText={(text) => setUserForm({ ...userForm, username: text })}
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
                    placeholder="Enter password"
                    placeholderTextColor={colors.textSecondary}
                    value={userForm.password}
                    onChangeText={(text) => setUserForm({ ...userForm, password: text })}
                    secureTextEntry
                  />
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
