import React, { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  FlatList,
} from "react-native";

import { MaterialIcons } from "@expo/vector-icons";

import { useRouter } from "expo-router";
import { useTheme, FONTS, FONT_SIZES } from "../../theme";
import apiConfig from "../../config/apiConfig";

import { useToast } from "../../components/ToastProvider";
import {
  useApiQuery,
  useApiMutation,
  createApiMutationFn,
  useApiInfiniteQuery,
} from "../../hooks/useApi";
import { useQueryClient } from "@tanstack/react-query";
import Header from "../../components/Header";
import { useLabel } from "../../context/LabelsContext";
import UserDetailModal from "../../components/UserDetailModal";
import UserCard from "../../components/UserCard";
import UserFormModal from "../../components/UserFormModal";
import useTabScrollToTop from "../../hooks/useTabScrollToTop";
import AppRefreshControl from "../../components/ui/AppRefreshControl";

export default function AdminScreen() {
  const router = useRouter();
  const { styles, colors } = useTheme();
  const { t } = useLabel();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const scrollRef = useRef(null);

  // Mobile standard gestures
  useTabScrollToTop(scrollRef, "/admin");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [roleFilter, setRoleFilter] = useState("all");
  const pageSize = 20;
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // "add" or "edit"
  const [editingUser, setEditingUser] = useState(null);
  const [selectedDetailUser, setSelectedDetailUser] = useState(null);

  // eslint-disable-next-line no-unused-vars
  const availableRoles = [
    "student",
    "teacher",
    "staff",
    "admin",
    "super admin",
    "support_staff",
  ];

  // Check Auth & Admin
  const {
    data: userData,
    isLoading: userLoading,
    error: userError,
  } = useApiQuery(["currentUser"], `${apiConfig.baseUrl}/auth/me`);
  const user = userData?.user;
  const isAdmin = user?.role === "admin" || user?.role === "super admin";

  // Fetch Users
  const {
    data: usersData,
    isLoading: loading,
    error: usersError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useApiInfiniteQuery(
    ["users", searchQuery, roleFilter],
    (pageParam) =>
      `${apiConfig.baseUrl}/users?page=${pageParam}&limit=${pageSize}&search=${searchQuery}&role=${roleFilter}`,
    {
      enabled: !!isAdmin, // Only fetch if admin check passes
      initialPageParam: 1,
      // eslint-disable-next-line no-unused-vars
      getNextPageParam: (lastPage, pages) => {
        if (
          lastPage?.pagination &&
          lastPage.pagination.page < lastPage.pagination.pages
        ) {
          return lastPage.pagination.page + 1;
        }
        return undefined;
      },
    }
  );

  const users = usersData?.pages.flatMap((page) => page.data) || [];

  // Mutations
  const createUserMutation = useApiMutation({
    mutationFn: createApiMutationFn(
      apiConfig.url(apiConfig.endpoints.users.create),
      "POST"
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      showToast(
        t("admin.userCreatedSuccess", "User created successfully"),
        "success"
      );
      setShowUserModal(false);
    },
    onError: (error) =>
      showToast(
        error.message || t("admin.userCreatedFailure", "Failed to create user"),
        "error"
      ),
  });

  const updateUserMutation = useApiMutation({
    mutationFn: (data) =>
      createApiMutationFn(
        apiConfig.url(apiConfig.endpoints.users.update(data._id)),
        "PUT"
      )(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      showToast(
        t("admin.userUpdatedSuccess", "User updated successfully"),
        "success"
      );
      setShowUserModal(false);
    },
    onError: (error) =>
      showToast(
        error.message || t("admin.userUpdatedFailure", "Failed to update user"),
        "error"
      ),
  });

  const deleteUserMutation = useApiMutation({
    mutationFn: (id) =>
      createApiMutationFn(
        apiConfig.url(apiConfig.endpoints.users.delete(id)),
        "DELETE"
      )(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      showToast(
        t("admin.userDeletedSuccess", "User deleted successfully"),
        "success"
      );
    },
    onError: (error) =>
      showToast(
        error.message || t("admin.userDeletedFailure", "Failed to delete user"),
        "error"
      ),
  });

  // eslint-disable-next-line no-unused-vars
  const revertPromotionMutation = useApiMutation({
    mutationFn: (id) =>
      createApiMutationFn(
        `${apiConfig.baseUrl}/users/${id}/revert-promotion`,
        "PUT"
      )(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      showToast(
        data.message ||
          t(
            "admin.promotionRevertedSuccess",
            "Promotion reverted successfully"
          ),
        "success"
      );
    },
    onError: (error) =>
      showToast(
        error.message ||
          t("admin.promotionRevertedFailure", "Failed to revert promotion"),
        "error"
      ),
  });

  // eslint-disable-next-line no-unused-vars
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
    if (user.role !== "student" && user.designation) {
      return user.designation;
    }
    return user.role === "support_staff"
      ? t("common.supportStaff", "Support Staff")
      : user.role;
  };

  const saving = createUserMutation.isPending || updateUserMutation.isPending;

  const handleCreateUser = (data) => {
    createUserMutation.mutate(data);
  };

  const handleUpdateUser = (data) => {
    updateUserMutation.mutate({ ...data, _id: editingUser._id });
  };

  const renderFooter = () => (
    <View
      style={{
        paddingHorizontal: 20,
        paddingBottom: 24,
        alignItems: "center",
        paddingTop: 16,
      }}
    >
      {isFetchingNextPage && (
        <ActivityIndicator size="small" color={colors.primary} />
      )}
    </View>
  );

  const renderEmptyList = () => {
    if (loading && users.length === 0) {
      return (
        <View style={{ padding: 40, alignItems: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text
            style={{
              marginTop: 16,
              color: colors.textSecondary,
              fontFamily: FONTS.medium,
            }}
          >
            {t("admin.loadingUsers", "Loading users...")}
          </Text>
        </View>
      );
    }
    if (userError) {
      return (
        <View
          style={{
            padding: 20,
            marginHorizontal: 20,
            alignItems: "center",
            backgroundColor: colors.error + "10",
            borderRadius: 12,
          }}
        >
          <MaterialIcons name="error-outline" size={40} color={colors.error} />
          <Text
            style={{
              marginTop: 8,
              color: colors.error,
              fontFamily: FONTS.bold,
            }}
          >
            {t("admin.failedToLoadProfile", "Failed to load user profile")}
          </Text>
          <Text
            style={{
              marginTop: 4,
              color: colors.textSecondary,
              textAlign: "center",
            }}
          >
            {userError.message}
          </Text>
        </View>
      );
    }
    if (!isAdmin && !userLoading) {
      return (
        <View
          style={{
            padding: 20,
            marginHorizontal: 20,
            alignItems: "center",
            backgroundColor: colors.warning + "10",
            borderRadius: 12,
          }}
        >
          <MaterialIcons name="warning" size={40} color={colors.warning} />
          <Text
            style={{
              marginTop: 8,
              color: colors.warning,
              fontFamily: FONTS.bold,
            }}
          >
            {t("common.accessDenied", "Access Denied")}
          </Text>
          <Text
            style={{
              marginTop: 4,
              color: colors.textSecondary,
              textAlign: "center",
            }}
          >
            {t(
              "common.accessDeniedDesc",
              "You do not have permission to view this list."
            )}
          </Text>
          <Text
            style={{ marginTop: 4, color: colors.textSecondary, fontSize: FONT_SIZES.sm }}
          >
            ${t("common.currentRole", "Current Role")}:{" "}
            {user?.role || t("common.unknown", "Unknown")}
          </Text>
        </View>
      );
    }
    if (usersError) {
      return (
        <View
          style={{
            padding: 20,
            marginHorizontal: 20,
            alignItems: "center",
            backgroundColor: colors.error + "10",
            borderRadius: 12,
          }}
        >
          <MaterialIcons name="error-outline" size={40} color={colors.error} />
          <Text
            style={{
              marginTop: 8,
              color: colors.error,
              fontFamily: FONTS.bold,
            }}
          >
            {t("admin.failedToLoadUsers", "Failed to load users")}
          </Text>
          <Text
            style={{
              marginTop: 4,
              color: colors.textSecondary,
              textAlign: "center",
            }}
          >
            {usersError.message}
          </Text>
          <Pressable
            onPress={refetch}
            style={{
              marginTop: 12,
              paddingHorizontal: 16,
              paddingVertical: 8,
              backgroundColor: colors.primary,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: "#fff", fontFamily: FONTS.bold }}>
              {t("common.retry", "Retry")}
            </Text>
          </Pressable>
        </View>
      );
    }
    return (
      <View style={{ alignItems: "center", padding: 40, opacity: 0.6 }}>
        <MaterialIcons
          name="search-off"
          size={64}
          color={colors.textSecondary}
        />
        <Text
          style={{
            color: colors.textSecondary,
            marginTop: 16,
            fontSize: FONT_SIZES.lg,
            fontFamily: FONTS.medium,
          }}
        >
          {t("admin.noUsersFound", "No users found")}
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
        ListHeaderComponent={
          <AdminHeader
            user={user}
            colors={colors}
            styles={styles}
            router={router}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            roleFilter={roleFilter}
            setRoleFilter={setRoleFilter}
            onAddUser={() => {
              setModalMode("add");
              setEditingUser(null);
              setShowUserModal(true);
            }}
          />
        }
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmptyList}
        showsVerticalScrollIndicator={false}
        ref={scrollRef}
        scrollsToTop={true}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        onEndReached={() => {
          if (hasNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        refreshControl={
          <AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      {showUserModal && (
        <UserFormModal
          visible={showUserModal}
          onClose={() => setShowUserModal(false)}
          modalMode={modalMode}
          initialData={editingUser}
          saving={saving}
          onSubmit={modalMode === "add" ? handleCreateUser : handleUpdateUser}
        />
      )}
      {showDetailModal && (
        <UserDetailModal
          visible={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          user={selectedDetailUser}
        />
      )}
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
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <View
        style={{
          backgroundColor: color + "15",
          padding: 16,
          borderRadius: 20,
          marginBottom: 12,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MaterialIcons name={icon} size={28} color={color} />
      </View>
      <Text
        style={{
          fontSize: FONT_SIZES.base,
          fontFamily: FONTS.bold,
          color: colors.textPrimary,
          textAlign: "center",
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
};

const AdminHeader = React.memo(function AdminHeader({
  user,
  colors,
  styles,
  router,
  searchQuery,
  setSearchQuery,
  roleFilter,
  setRoleFilter,
  onAddUser,
}) {
  const { t } = useLabel();
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
      {/* Minimal Header */}
      <Header
        title={t("admin.admin", "Admin")}
        subtitle={t("admin.manageUsersDesc", "Manage users and permissions")}
      />

      {/* Admin Actions - Organized by Category */}
      <View style={{ gap: 24 }}>
        {/* Academic Management Section - Super Admin Only */}
        {user?.role === "super admin" && (
          <View>
            <Text style={styles.titleMedium}>
              {t("admin.academicManagement", "Academic Management")}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              <MenuCard
                title={t("admin.academicYear", "Academic Year")}
                icon="calendar-today"
                color={colors.primary}
                onPress={() => router.push("/admin/academic-year")}
              />
              <MenuCard
                title={t("admin.subjects", "Subjects")}
                icon="menu-book"
                color="#673AB7"
                onPress={() => router.push("/admin/subjects")}
              />
            </View>
          </View>
        )}

        {/* Teaching Management Section - Admin & Super Admin */}
        <View>
          <Text style={styles.titleMedium}>
            {t("admin.teachingManagement", "Teaching Management")}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            <MenuCard
              title={t("admin.teacherSubjects", "Teacher Subjects")}
              icon="assignment-ind"
              color="#4CAF50"
              onPress={() => router.push("/admin/teacher-subjects")}
            />
          </View>
        </View>

        {/* Class Operations Section */}
        <View>
          <Text style={styles.titleMedium}>
            {t("admin.classOperations", "Class Operations")}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            <MenuCard
              title={t("admin.timetable", "Timetable")}
              icon="schedule"
              color="#9C27B0"
              onPress={() => router.push("/admin/timetable")}
            />
            <MenuCard
              title={t("admin.exams", "Exams")}
              icon="event"
              color="#E91E63"
              onPress={() => router.push("/admin/exam-schedule")}
            />
            <MenuCard
              title={t("admin.examAnalytics", "Exam Analytics")}
              icon="analytics"
              color="#9C27B0"
              onPress={() => router.push("/admin/exam-analytics")}
            />
          </View>
        </View>

        {/* Financial Section */}
        <View>
          <Text style={styles.titleMedium}>
            {t("admin.financial", "Financial")}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            <MenuCard
              title={t("admin.fees", "Fees")}
              icon="attach-money"
              color="#FF5722"
              onPress={() => router.push("/admin/fees")}
            />
          </View>
        </View>

        {/* Communication & Requests Section */}
        <View>
          <Text style={styles.titleMedium}>
            {t("admin.communication", "Communication")}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            <MenuCard
              title={t("admin.complaints", "Complaints")}
              icon="feedback"
              color="#607D8B"
              onPress={() => router.push("/complaints")}
            />
            <MenuCard
              title={t("admin.broadcast", "Broadcast")}
              icon="campaign"
              color="#3F51B5"
              onPress={() => router.push("/admin/send-notification")}
            />
          </View>
        </View>
      </View>

      {/* User Management Section */}
      <View style={{ marginTop: 32 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <Text style={styles.titleMedium}>
            {t("admin.userManagement", "User Management")}
          </Text>
          <Pressable
            onPress={onAddUser}
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
            <MaterialIcons
              name="add"
              size={20}
              color="#fff"
              style={{ marginRight: 4 }}
            />
            <Text
              style={{ fontSize: FONT_SIZES.base, fontFamily: FONTS.bold, color: "#fff" }}
            >
              {t("admin.addUser", "Add User")}
            </Text>
          </Pressable>
        </View>

        {/* Search Bar */}
        <View style={{ marginBottom: 20 }}>
          <View
            style={[
              [
                styles.bodyLarge,
                {
                  borderWidth: 1,
                  borderColor: colors.outline,
                  backgroundColor: "transparent",
                },
              ],
              {
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 16,
                height: 56,
                borderRadius: 16,
              },
            ]}
          >
            <MaterialIcons
              name="search"
              size={24}
              color={colors.textSecondary}
            />
            <TextInput
              style={{
                flex: 1,
                marginLeft: 12,
                fontSize: FONT_SIZES.lg,
                color: colors.textPrimary,
                fontFamily: FONTS.regular,
                paddingVertical: 0,
              }}
              placeholder={t("admin.searchUsersPlaceholder", "Search users...")}
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
              }}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")}>
                <MaterialIcons
                  name="close"
                  size={20}
                  color={colors.textSecondary}
                />
              </Pressable>
            )}
          </View>
        </View>

        {/* Filters and Sort */}
        <View style={{ marginBottom: 20 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingRight: 20 }}
          >
            {/* Role Filter */}
            {[
              "all",
              "student",
              "teacher",
              "admin",
              "staff",
              "support_staff",
              "alumni",
              "super admin",
            ].map((role) => (
              <Pressable
                key={role}
                onPress={() => {
                  setRoleFilter(role);
                }}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  backgroundColor:
                    roleFilter === role
                      ? colors.primary
                      : colors.cardBackground,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor:
                    roleFilter === role ? colors.primary : colors.border,
                  elevation: roleFilter === role ? 4 : 0,
                  shadowColor: roleFilter === role ? colors.primary : "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: roleFilter === role ? 0.3 : 0,
                  shadowRadius: 4,
                }}
              >
                <Text
                  style={{
                    color: roleFilter === role ? "#fff" : colors.textSecondary,
                    fontFamily:
                      roleFilter === role ? FONTS.bold : FONTS.medium,
                    textTransform: "capitalize",
                    fontSize: FONT_SIZES.base,
                  }}
                >
                  {role === "all"
                    ? t("admin.allRoles", "All Roles")
                    : role === "support_staff"
                    ? t("common.supportStaff", "Support Staff")
                    : role}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </View>
  );
});
