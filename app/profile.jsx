import React, { useState, } from "react";
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, TextInput, Modal, Pressable, Alert } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import storage from "../utils/storage";
import { useTheme } from "../theme";
import { useToast } from "../components/ToastProvider";
import { formatDate } from "../utils/date";
import { useRouter } from "expo-router";
import { logoutHandler } from "../utils/logoutHandler";

import { useApiQuery, useApiMutation, createApiMutationFn } from "../hooks/useApi";
import apiConfig from "../config/apiConfig";

import Card from "../components/Card";
import Button from "../components/Button";

export default function ProfileScreen() {
  const { styles, colors } = useTheme();
  const { showToast } = useToast();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: user, refetch, isLoading } = useApiQuery(
    ['currentUser'],
    `${apiConfig.baseUrl}/auth/me`,
    {
      staleTime: 0,
      select: (data) => data.user
    }
  );

  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const changePasswordMutation = useApiMutation({
    mutationFn: (data) => createApiMutationFn(`${apiConfig.baseUrl}/auth/change-password`, 'POST')(data),
    onSuccess: () => {
      showToast("Password changed successfully", "success");
      setShowChangePasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (error) => {
      showToast(error.message || "Failed to change password", "error");
    }
  });

  const handleChangePasswordSubmit = () => {
    if (user && !user.mustChangePassword && !currentPassword) {
      showToast("Current password is required", "error");
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      showToast("New password must be at least 8 characters long", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match", "error");
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: user.mustChangePassword ? undefined : currentPassword,
      newPassword
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await logoutHandler(router, showToast);
  };

  const handleLogin = () => {
    const { router } = require('expo-router');
    router.replace('/login');
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.contentPaddingBottom, { paddingHorizontal: 16, paddingTop: 16 }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }
    >
      <View style={{ alignItems: "center", marginTop: 20, marginBottom: 40 }}>
        <View style={{
          width: 100,
          height: 100,
          borderRadius: 50,
          backgroundColor: colors.surfaceContainerHigh,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
          elevation: 5,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
        }}>
          <MaterialIcons name="person" size={50} color={colors.primary} />
        </View>

        {user ? (
          <>
            <Text style={{ fontSize: 24, fontFamily: "DMSans-Bold", color: colors.onSurface, marginBottom: 8 }}>
              {user.name}
            </Text>

            {user.role && (
              <View style={{
                backgroundColor: colors.primaryContainer,
                paddingVertical: 6,
                paddingHorizontal: 16,
                borderRadius: 20,
                marginTop: 4,
                marginBottom: 24
              }}>
                <Text style={{ color: colors.onPrimaryContainer, fontFamily: "DMSans-Bold", fontSize: 12, textTransform: 'uppercase' }}>
                  {user.role !== 'student' && user.designation ? user.designation : user.role === 'support_staff' ? 'Support Staff' : user.role}
                </Text>
              </View>
            )}

            <View style={{ width: '100%', paddingHorizontal: 4 }}>
              <Card variant="filled" style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontFamily: "DMSans-Bold", color: colors.onSurfaceVariant, marginBottom: 16 }}>CONTACT INFO</Text>

                {user.phone && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <View style={{ width: 32, alignItems: 'center' }}><MaterialIcons name="phone" size={20} color={colors.primary} /></View>
                    <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.onSurface, marginLeft: 8 }}>{user.phone}</Text>
                  </View>
                )}

                {user.email && (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 32, alignItems: 'center' }}><MaterialIcons name="email" size={20} color={colors.primary} /></View>
                    <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.onSurface, marginLeft: 8 }}>{user.email}</Text>
                  </View>
                )}
              </Card>

              {(user.role === 'student' || user.role === 'teacher' || user.role === 'staff' || user.role === 'admin' || user.role === 'super admin' || user.role === 'support_staff') && (
                <Card variant="filled" style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, fontFamily: "DMSans-Bold", color: colors.onSurfaceVariant, marginBottom: 16 }}>
                    {user.role === 'student' ? 'STUDENT DETAILS' : 'STAFF DETAILS'}
                  </Text>

                  {user.role === 'student' && (
                    <>
                      {/* Class & Branch */}
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
                        {user.currentClass && (
                          <View style={{ width: '50%', marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 4 }}>Class</Text>
                            <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.onSurface }}>
                              {typeof user.currentClass === 'string' ? user.currentClass : user.currentClass?.name || user.currentClass?.label || 'N/A'}
                            </Text>
                          </View>
                        )}
                        {user.currentClass?.branch && (
                          <View style={{ width: '50%', marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 4 }}>Branch</Text>
                            <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.onSurface }}>{user.currentClass.branch}</Text>
                          </View>
                        )}
                      </View>

                      {user.guardianName && (
                        <View style={{ marginBottom: 16 }}>
                          <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 4 }}>Guardian Name</Text>
                          <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.onSurface }}>{user.guardianName}</Text>
                        </View>
                      )}
                      {user.guardianPhone && (
                        <View style={{ marginBottom: 16 }}>
                          <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 4 }}>Guardian Phone</Text>
                          <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.onSurface }}>{user.guardianPhone}</Text>
                        </View>
                      )}

                      {/* Personal Details */}
                      <Text style={{ fontSize: 14, fontFamily: "DMSans-Bold", color: colors.onSurfaceVariant, marginBottom: 12, marginTop: 8 }}>PERSONAL DETAILS</Text>

                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
                        {user.gender && (
                          <View style={{ width: '50%', marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 4 }}>Gender</Text>
                            <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.onSurface }}>{user.gender}</Text>
                          </View>
                        )}
                        {user.bloodGroup && (
                          <View style={{ width: '50%', marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 4 }}>Blood Group</Text>
                            <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.onSurface }}>{user.bloodGroup}</Text>
                          </View>
                        )}
                        {user.dateOfBirth && (
                          <View style={{ width: '50%', marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 4 }}>Date of Birth</Text>
                            <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.onSurface }}>{formatDate(user.dateOfBirth)}</Text>
                          </View>
                        )}
                        {user.phone2 && (
                          <View style={{ width: '50%', marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 4 }}>Alt Phone</Text>
                            <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.onSurface }}>{user.phone2}</Text>
                          </View>
                        )}
                      </View>

                      {user.address && (
                        <View style={{ marginBottom: 16 }}>
                          <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 4 }}>Address</Text>
                          <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.onSurface }}>{user.address}</Text>
                        </View>
                      )}

                      {/* Academic Identifiers */}
                      <Text style={{ fontSize: 14, fontFamily: "DMSans-Bold", color: colors.onSurfaceVariant, marginBottom: 12, marginTop: 8 }}>ACADEMIC IDs</Text>

                      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        {user.regNo && (
                          <View style={{ width: '50%', marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 4 }}>Reg No</Text>
                            <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.onSurface }}>{user.regNo}</Text>
                          </View>
                        )}
                        {user.satsNumber && (
                          <View style={{ width: '50%', marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 4 }}>SATS No</Text>
                            <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.onSurface }}>{user.satsNumber}</Text>
                          </View>
                        )}
                        {user.penNumber && (
                          <View style={{ width: '50%', marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 4 }}>PEN No</Text>
                            <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.onSurface }}>{user.penNumber}</Text>
                          </View>
                        )}
                        {user.apaarId && (
                          <View style={{ width: '50%', marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 4 }}>APAAR ID</Text>
                            <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.onSurface }}>{user.apaarId}</Text>
                          </View>
                        )}
                      </View>
                      {user.admissionDate && (
                        <View>
                          <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 4 }}>Admission Date</Text>
                          <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.onSurface }}>{formatDate(user.admissionDate)}</Text>
                        </View>
                      )}
                    </>
                  )}

                  {(user.role === 'teacher' || user.role === 'staff' || user.role === 'admin' || user.role === 'super admin' || user.role === 'support_staff') && (
                    <>
                      {user.designation && (
                        <View style={{ marginBottom: 16 }}>
                          <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 4 }}>Designation</Text>
                          <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.onSurface }}>{user.designation}</Text>
                        </View>
                      )}

                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
                        {user.dateOfBirth && (
                          <View style={{ width: '50%', marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 4 }}>Date of Birth</Text>
                            <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.onSurface }}>{formatDate(user.dateOfBirth)}</Text>
                          </View>
                        )}
                        {user.bloodGroup && (
                          <View style={{ width: '50%', marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 4 }}>Blood Group</Text>
                            <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.onSurface }}>{user.bloodGroup}</Text>
                          </View>
                        )}
                      </View>

                      {user.address && (
                        <View style={{ marginBottom: 16 }}>
                          <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 4 }}>Address</Text>
                          <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.onSurface }}>{user.address}</Text>
                        </View>
                      )}

                      {user.joiningDate && (
                        <View>
                          <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 4 }}>Joining Date</Text>
                          <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.onSurface }}>{formatDate(user.joiningDate)}</Text>
                        </View>
                      )}
                    </>
                  )}
                </Card>
              )}
            </View>
          </>
        ) : (
          <>
            <Text style={{ fontSize: 24, fontFamily: "DMSans-Bold", color: colors.onSurface, marginBottom: 4 }}>
              Guest User
            </Text>
            <Text style={{ fontSize: 14, fontFamily: "DMSans-Regular", color: colors.onSurfaceVariant }}>
              Login to access all features
            </Text>
          </>
        )}
      </View>

      <View style={{ gap: 12 }}>
        {user && (
          <Button
            variant="outlined"
            onPress={() => setShowChangePasswordModal(true)}
            icon="lock"
            style={{ borderColor: colors.primary }}
            textStyle={{ color: colors.primary }}
          >
            Change Password
          </Button>
        )}
        {user ? (
          <Button
            variant="filled"
            onPress={handleLogout}
            style={{ backgroundColor: colors.errorContainer }}
            textStyle={{ color: colors.onErrorContainer }}
            icon="logout"
          >
            Log Out
          </Button>
        ) : (
          <Button
            variant="filled"
            onPress={handleLogin}
            icon="login"
          >
            Log In
          </Button>
        )}
      </View>

      {/* Change Password Modal */}
      {user && (
        <Modal
          visible={showChangePasswordModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowChangePasswordModal(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <View style={{ backgroundColor: colors.background, borderRadius: 24, padding: 24, width: '100%', maxWidth: 400, borderWidth: 1, borderColor: colors.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Text style={{ fontSize: 20, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>
                  Change Password
                </Text>
                <Pressable onPress={() => {
                  setShowChangePasswordModal(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}>
                  <MaterialIcons name="close" size={24} color={colors.textSecondary} />
                </Pressable>
              </View>

              {/* Current Password Field (only if mustChangePassword is not true) */}
              {!user.mustChangePassword && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, fontFamily: "DMSans-Bold", color: colors.textSecondary, marginBottom: 8 }}>
                    CURRENT PASSWORD
                  </Text>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    backgroundColor: colors.cardBackground
                  }}>
                    <TextInput
                      style={{ flex: 1, paddingVertical: 12, fontSize: 15, fontFamily: "DMSans-Medium", color: colors.textPrimary }}
                      placeholder="Enter current password"
                      placeholderTextColor={colors.textSecondary}
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      secureTextEntry={!showCurrentPassword}
                      autoCapitalize="none"
                    />
                    <Pressable onPress={() => setShowCurrentPassword(!showCurrentPassword)} style={{ padding: 4 }}>
                      <MaterialIcons name={showCurrentPassword ? "visibility-off" : "visibility"} size={20} color={colors.textSecondary} />
                    </Pressable>
                  </View>
                </View>
              )}

              {/* New Password Field */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 13, fontFamily: "DMSans-Bold", color: colors.textSecondary, marginBottom: 8 }}>
                  NEW PASSWORD
                </Text>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  backgroundColor: colors.cardBackground
                }}>
                  <TextInput
                    style={{ flex: 1, paddingVertical: 12, fontSize: 15, fontFamily: "DMSans-Medium", color: colors.textPrimary }}
                    placeholder="At least 8 characters"
                    placeholderTextColor={colors.textSecondary}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                  />
                  <Pressable onPress={() => setShowNewPassword(!showNewPassword)} style={{ padding: 4 }}>
                    <MaterialIcons name={showNewPassword ? "visibility-off" : "visibility"} size={20} color={colors.textSecondary} />
                  </Pressable>
                </View>
              </View>

              {/* Confirm New Password Field */}
              <View style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 13, fontFamily: "DMSans-Bold", color: colors.textSecondary, marginBottom: 8 }}>
                  CONFIRM NEW PASSWORD
                </Text>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  backgroundColor: colors.cardBackground
                }}>
                  <TextInput
                    style={{ flex: 1, paddingVertical: 12, fontSize: 15, fontFamily: "DMSans-Medium", color: colors.textPrimary }}
                    placeholder="Re-enter new password"
                    placeholderTextColor={colors.textSecondary}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Actions */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Button
                  variant="outlined"
                  onPress={() => {
                    setShowChangePasswordModal(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  style={{ flex: 1 }}
                >
                  Cancel
                </Button>
                <Button
                  variant="filled"
                  onPress={handleChangePasswordSubmit}
                  loading={changePasswordMutation.isPending}
                  style={{ flex: 1 }}
                >
                  Submit
                </Button>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
}
