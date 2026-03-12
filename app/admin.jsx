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
  Modal,
  FlatList,
} from "react-native";

import { MaterialIcons } from "@expo/vector-icons";


import { useRouter } from "expo-router";
import { useTheme } from "../theme";
import apiConfig from "../config/apiConfig";

import { useToast } from "../components/ToastProvider";
import { useApiQuery, useApiMutation, createApiMutationFn, useApiInfiniteQuery } from "../hooks/useApi";
import { useQueryClient } from "@tanstack/react-query";
import Header from "../components/Header";
import UserDetailModal from "../components/UserDetailModal";
import UserCard from "../components/UserCard";
import UserFormModal from "../components/UserFormModal";

export default function AdminScreen() {
  const router = useRouter();
  const { styles, colors } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [roleFilter, setRoleFilter] = useState("all");
  const pageSize = 20;
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // "add" or "edit"
  const [editingUser, setEditingUser] = useState(null);
  const [selectedDetailUser, setSelectedDetailUser] = useState(null);

  const availableRoles = ["student", "teacher", "staff", "admin", "super admin", "support_staff"];

  // Check Auth & Admin
  const { data: userData, isLoading: userLoading, error: userError } = useApiQuery(
    ['currentUser'],
    `${apiConfig.baseUrl}/auth/me`
  );
  const user = userData?.user;
  const isAdmin = user?.role === 'admin' || user?.role === 'super admin';

  // Fetch Users
  const {
    data: usersData,
    isLoading: loading,
    error: usersError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useApiInfiniteQuery(
    ['users', searchQuery, roleFilter],
    (pageParam) => `${apiConfig.baseUrl}/users?page=${pageParam}&limit=${pageSize}&search=${searchQuery}&role=${roleFilter}`,
    {
      enabled: !!isAdmin, // Only fetch if admin check passes
      getNextPageParam: (lastPage, pages) => {
        if (lastPage.pagination && lastPage.pagination.page < lastPage.pagination.pages) {
          return lastPage.pagination.page + 1;
        }
        return undefined;
      }
    }
  );

  const users = usersData?.pages.flatMap(page => page.data) || [];

  // Mutations
  const createUserMutation = useApiMutation({
    mutationFn: createApiMutationFn(apiConfig.url(apiConfig.endpoints.users.create), 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showToast("User created successfully", "success");
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

  const revertPromotionMutation = useApiMutation({
    mutationFn: (id) => createApiMutationFn(`${apiConfig.baseUrl}/users/${id}/revert-promotion`, 'PUT')(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showToast(data.message || "Promotion reverted successfully", "success");
    },
    onError: (error) => showToast(error.message || "Failed to revert promotion", "error")
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

  const getRoleColor = (role) => {
    switch (role) {
      case "super admin":
        return colors.roleSuperAdmin || "#D32F2F";
      case "admin":
        return colors.roleAdmin || "#1976D2";
      case "staff":
      case "support_staff":
        return colors.roleStaff || "#F57C00";
      case "teacher":
        return colors.roleClassTeacher || "#388E3C";
      case "student":
        return colors.roleStudent || "#7B1FA2";
      case "alumni":
        return "#607D8B";
      default:
        return colors.textSecondary;
    }
  };

  const getRoleDisplay = (user) => {
    if (user.role !== 'student' && user.designation) {
      return user.designation;
    }
    return user.role === 'support_staff' ? 'Support Staff' : user.role;
  };

  const saving = createUserMutation.isPending || updateUserMutation.isPending;

  const handleCreateUser = (data) => {
    createUserMutation.mutate(data);
  };

  const handleUpdateUser = (data) => {
    updateUserMutation.mutate({ ...data, _id: editingUser._id });
  };

  const renderHeader = () => (
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
            <MenuCard
              title="Exam Analytics"
              icon="analytics"
              color="#9C27B0"
              onPress={() => router.push("/admin/exam-analytics")}
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
              setEditingUser(null);
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
                paddingVertical: 0
              }}
              placeholder="Search users..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
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
            {["all", "student", "teacher", "admin", "staff", "support_staff", "alumni", "super admin"].map((role) => (
              <Pressable
                key={role}
                onPress={() => {
                  setRoleFilter(role);
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
                  {role === "all" ? "All Roles" : role === "support_staff" ? "Support Staff" : role}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

        </View>
      </View>
    </View>
  );

  const renderFooter = () => (
    <View style={{ paddingHorizontal: 20, paddingBottom: 100, alignItems: 'center', paddingTop: 16 }}>
      {isFetchingNextPage && <ActivityIndicator size="small" color={colors.primary} />}
    </View>
  );

  const renderEmptyList = () => {
    if (loading && users.length === 0) {
      return (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 16, color: colors.textSecondary, fontFamily: "DMSans-Medium" }}>Loading users...</Text>
        </View>
      );
    }
    if (userError) {
      return (
        <View style={{ padding: 20, marginHorizontal: 20, alignItems: 'center', backgroundColor: colors.error + '10', borderRadius: 12 }}>
          <MaterialIcons name="error-outline" size={40} color={colors.error} />
          <Text style={{ marginTop: 8, color: colors.error, fontFamily: "DMSans-Bold" }}>Failed to load user profile</Text>
          <Text style={{ marginTop: 4, color: colors.textSecondary, textAlign: 'center' }}>{userError.message}</Text>
        </View>
      );
    }
    if (!isAdmin && !userLoading) {
      return (
        <View style={{ padding: 20, marginHorizontal: 20, alignItems: 'center', backgroundColor: colors.warning + '10', borderRadius: 12 }}>
          <MaterialIcons name="warning" size={40} color={colors.warning} />
          <Text style={{ marginTop: 8, color: colors.warning, fontFamily: "DMSans-Bold" }}>Access Denied</Text>
          <Text style={{ marginTop: 4, color: colors.textSecondary, textAlign: 'center' }}>You do not have permission to view this list.</Text>
          <Text style={{ marginTop: 4, color: colors.textSecondary, fontSize: 12 }}>Current Role: {user?.role || 'Unknown'}</Text>
        </View>
      );
    }
    if (usersError) {
      return (
        <View style={{ padding: 20, marginHorizontal: 20, alignItems: 'center', backgroundColor: colors.error + '10', borderRadius: 12 }}>
          <MaterialIcons name="error-outline" size={40} color={colors.error} />
          <Text style={{ marginTop: 8, color: colors.error, fontFamily: "DMSans-Bold" }}>Failed to load users</Text>
          <Text style={{ marginTop: 4, color: colors.textSecondary, textAlign: 'center' }}>{usersError.message}</Text>
          <Pressable onPress={refetch} style={{ marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.primary, borderRadius: 8 }}>
            <Text style={{ color: '#fff', fontFamily: "DMSans-Bold" }}>Retry</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <View style={{ alignItems: "center", padding: 40, opacity: 0.6 }}>
        <MaterialIcons name="search-off" size={64} color={colors.textSecondary} />
        <Text style={{ color: colors.textSecondary, marginTop: 16, fontSize: 16, fontFamily: "DMSans-Medium" }}>
          No users found
        </Text>
      </View>
    );
  };

  const renderUserItem = ({ item: userItem }) => (
    <View style={{ paddingHorizontal: 20 }}>
      <UserCard
        userItem={userItem}
        colors={colors}
        getRoleColor={getRoleColor}
        getRoleDisplay={getRoleDisplay}
        onEdit={() => {
          setModalMode("edit");
          setEditingUser(userItem);
          setShowUserModal(true);
        }}
        onDelete={() => deleteUser(userItem._id, userItem.name)}
        onPress={() => {
          setSelectedDetailUser(userItem);
          setShowDetailModal(true);
        }}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={users}
        keyExtractor={(item) => item._id}
        renderItem={renderUserItem}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmptyList}
        showsVerticalScrollIndicator={false}
        onEndReached={() => {
          if (hasNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
      />

      <UserFormModal
        visible={showUserModal}
        onClose={() => setShowUserModal(false)}
        modalMode={modalMode}
        initialData={editingUser}
        saving={saving}
        onSubmit={modalMode === "add" ? handleCreateUser : handleUpdateUser}
      />
      <UserDetailModal
        visible={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        user={selectedDetailUser}
      />
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
