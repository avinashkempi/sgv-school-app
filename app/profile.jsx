import React, { useState, } from "react";
import { View, Text, ScrollView, RefreshControl, Modal, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import storage from "../utils/storage";
import { useTheme } from "../theme";
import { useToast } from "../components/ToastProvider";
import { formatDate } from "../utils/date";
import { useRouter } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { useLabel } from '../context/LabelsContext';

import { useApiQuery, useApiMutation, createApiMutationFn } from "../hooks/useApi";
import { CACHE_TIERS } from "../utils/cacheConfig";
import apiConfig from "../config/apiConfig";

import Card from "../components/Card";
import Button from "../components/Button";
import AppTextInput from "../components/TextInput";
import { LoadingState } from "../components/StateComponents";
import Header from "../components/Header";

export default function ProfileScreen() {
  const { styles, colors } = useTheme();
  const { showToast } = useToast();
  const router = useRouter();
  const { user: authUser, logout } = useAuth();
  const { t } = useLabel();
  const [refreshing, setRefreshing] = useState(false);

  const { data: user, refetch, isLoading } = useApiQuery(
    ['currentUser'],
    `${apiConfig.baseUrl}/auth/me`,
    {
      ...CACHE_TIERS.MODERATE,
      placeholderData: authUser ? { user: authUser } : undefined,
      select: (data) => data.user
    }
  );

  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isPasswordFormValid = Boolean(
    currentPassword?.trim() &&
    newPassword &&
    newPassword.length >= 8 &&
    confirmPassword &&
    newPassword === confirmPassword
  );

  const resetPasswordForm = () => {
    setShowChangePasswordModal(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const changePasswordMutation = useApiMutation({
    mutationFn: (data) => createApiMutationFn(`${apiConfig.baseUrl}/auth/change-password`, 'POST')(data),
    onSuccess: async (data) => {
      if (data?.token) {
        await storage.setItem('@auth_token', data.token);
      }
      showToast(t('toasts.passwordResetSuccessfully'), "success");
      resetPasswordForm();
    },
    onError: (error) => {
      showToast(error.message || t('toasts.failedToResetPassword'), "error");
    }
  });

  const handleChangePasswordSubmit = () => {
    if (!currentPassword?.trim() || !newPassword?.trim() || !confirmPassword?.trim()) {
      showToast(t('toasts.allFieldsMandatory'), "error");
      return;
    }
    if (newPassword.length < 8) {
      showToast(t('toasts.passwordMinLength'), "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast(t('toasts.passwordsDoNotMatch'), "error");
      return;
    }
    changePasswordMutation.mutate({
      currentPassword,
      newPassword
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await logout(router, null, showToast);
  };

  const handleLogin = () => {
    router.replace('/login');
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Header title={t('profile.title')} />
        <View style={{ flex: 1, justifyContent: "center" }}>
          <LoadingState message={t('profile.loadingProfile')} />
        </View>
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
                  {user.role !== 'student' && user.designation ? user.designation : user.role === 'support_staff' ? t('profile.supportStaff') : user.role}
                </Text>
              </View>
            )}

            <View style={{ width: '100%', paddingHorizontal: 4 }}>
              <Card variant="filled" style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontFamily: "DMSans-Bold", color: colors.onSurfaceVariant, marginBottom: 16 }}>{t('profile.contactInfo')}</Text>

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
                    {user.role === 'student' ? t('profile.studentDetails') : t('profile.staffDetails')}
                  </Text>

                  {user.role === 'student' && (
                    <>
                      {/* Class & Branch */}
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
                        {user.currentClass && (
                          <View style={{ width: '50%', marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 4 }}>{t('common.class')}</Text>
                            <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.onSurface }}>
                              {typeof user.currentClass === 'string' ? user.currentClass : user.currentClass?.name || user.currentClass?.label || 'N/A'}
                            </Text>
                          </View>
                        )}
                        {user.currentClass?.branch && (
                          <View style={{ width: '50%', marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 4 }}>{t('common.branch')}</Text>
                            <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.onSurface }}>{user.currentClass.branch}</Text>
                          </View>
                        )}
                      </View>

                      {user.guardianName && (
                        <View style={{ marginBottom: 16 }}>
                          <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 4 }}>{t('common.guardianName')}</Text>
                          <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.onSurface }}>{user.guardianName}</Text>
                        </View>
                      )}
                      {user.guardianPhone && (
                        <View style={{ marginBottom: 16 }}>
                          <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 4 }}>{t('common.guardianPhone')}</Text>
                          <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.onSurface }}>{user.guardianPhone}</Text>
                        </View>
                      )}

                      {/* Personal Details */}
                      <Text style={{ fontSize: 14, fontFamily: "DMSans-Bold", color: colors.onSurfaceVariant, marginBottom: 12, marginTop: 8 }}>{t('profile.personalDetails')}</Text>

                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
                        {user.gender && (
                          <View style={{ width: '50%', marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 4 }}>{t('common.gender')}</Text>
                            <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.onSurface }}>{user.gender}</Text>
                          </View>
                        )}
                        {user.bloodGroup && (
                          <View style={{ width: '50%', marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 4 }}>{t('common.bloodGroup')}</Text>
                            <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.onSurface }}>{user.bloodGroup}</Text>
                          </View>
                        )}
                        {user.dateOfBirth && (
                          <View style={{ width: '50%', marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 4 }}>{t('common.dateOfBirth')}</Text>
                            <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.onSurface }}>{formatDate(user.dateOfBirth)}</Text>
                          </View>
                        )}
                        {user.phone2 && (
                          <View style={{ width: '50%', marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 4 }}>{t('common.altPhone')}</Text>
                            <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.onSurface }}>{user.phone2}</Text>
                          </View>
                        )}
                      </View>

                      {user.address && (
                        <View style={{ marginBottom: 16 }}>
                          <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 4 }}>{t('common.address')}</Text>
                          <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.onSurface }}>{user.address}</Text>
                        </View>
                      )}

                      {/* Academic Identifiers */}
                      <Text style={{ fontSize: 14, fontFamily: "DMSans-Bold", color: colors.onSurfaceVariant, marginBottom: 12, marginTop: 8 }}>{t('profile.academicIds')}</Text>

                      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        {user.regNo && (
                          <View style={{ width: '50%', marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 4 }}>{t('common.regNo')}</Text>
                            <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.onSurface }}>{user.regNo}</Text>
                          </View>
                        )}
                        {user.satsNumber && (
                          <View style={{ width: '50%', marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 4 }}>{t('common.satsNo')}</Text>
                            <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.onSurface }}>{user.satsNumber}</Text>
                          </View>
                        )}
                        {user.penNumber && (
                          <View style={{ width: '50%', marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 4 }}>{t('common.penNo')}</Text>
                            <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.onSurface }}>{user.penNumber}</Text>
                          </View>
                        )}
                        {user.apaarId && (
                          <View style={{ width: '50%', marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 4 }}>{t('common.apaarId')}</Text>
                            <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.onSurface }}>{user.apaarId}</Text>
                          </View>
                        )}
                      </View>
                      {user.admissionDate && (
                        <View>
                          <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 4 }}>{t('common.admissionDate')}</Text>
                          <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.onSurface }}>{formatDate(user.admissionDate)}</Text>
                        </View>
                      )}
                    </>
                  )}

                  {(user.role === 'teacher' || user.role === 'staff' || user.role === 'admin' || user.role === 'super admin' || user.role === 'support_staff') && (
                    <>
                      {user.designation && (
                        <View style={{ marginBottom: 16 }}>
                          <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 4 }}>{t('common.designation')}</Text>
                          <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.onSurface }}>{user.designation}</Text>
                        </View>
                      )}

                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
                        {user.dateOfBirth && (
                          <View style={{ width: '50%', marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 4 }}>{t('common.dateOfBirth')}</Text>
                            <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.onSurface }}>{formatDate(user.dateOfBirth)}</Text>
                          </View>
                        )}
                        {user.bloodGroup && (
                          <View style={{ width: '50%', marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 4 }}>{t('common.bloodGroup')}</Text>
                            <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.onSurface }}>{user.bloodGroup}</Text>
                          </View>
                        )}
                      </View>

                      {user.address && (
                        <View style={{ marginBottom: 16 }}>
                          <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 4 }}>{t('common.address')}</Text>
                          <Text style={{ fontSize: 16, fontFamily: "DMSans-Medium", color: colors.onSurface }}>{user.address}</Text>
                        </View>
                      )}

                      {user.joiningDate && (
                        <View>
                          <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 4 }}>{t('common.joiningDate')}</Text>
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
              {t('profile.guestUser')}
            </Text>
            <Text style={{ fontSize: 14, fontFamily: "DMSans-Regular", color: colors.onSurfaceVariant }}>
              {t('profile.loginToAccess')}
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
            {t('profile.resetPassword')}
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
            {t('common.logOut')}
          </Button>
        ) : (
          <Button
            variant="filled"
            onPress={handleLogin}
            icon="login"
          >
            {t('common.logIn')}
          </Button>
        )}
      </View>

      {/* Reset Password Modal */}
      {showChangePasswordModal && (
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
                  {t('profile.resetPassword')}
                </Text>
                <Pressable onPress={resetPasswordForm}>
                  <MaterialIcons name="close" size={24} color={colors.textSecondary} />
                </Pressable>
              </View>

              {/* Current Password Field */}
              <View style={{ marginBottom: 16 }}>
                <AppTextInput
                  label={t('profile.currentPasswordLabel')}
                  placeholder={t('profile.currentPasswordPlaceholder')}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={!showCurrentPassword}
                  autoCapitalize="none"
                  rightIcon={showCurrentPassword ? "visibility-off" : "visibility"}
                  onRightIconPress={() => setShowCurrentPassword(!showCurrentPassword)}
                />
              </View>

              {/* New Password Field */}
              <View style={{ marginBottom: 16 }}>
                <AppTextInput
                  label={t('profile.newPasswordLabel')}
                  placeholder={t('profile.newPasswordPlaceholder')}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                  rightIcon={showNewPassword ? "visibility-off" : "visibility"}
                  onRightIconPress={() => setShowNewPassword(!showNewPassword)}
                />
              </View>

              {/* Confirm New Password Field */}
              <View style={{ marginBottom: 24 }}>
                <AppTextInput
                  label={t('profile.confirmPasswordLabel')}
                  placeholder={t('profile.confirmPasswordPlaceholder')}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  rightIcon={showConfirmPassword ? "visibility-off" : "visibility"}
                  onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
                />
              </View>

              {/* Actions */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Button
                  variant="outlined"
                  onPress={resetPasswordForm}
                  style={{ flex: 1 }}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="filled"
                  onPress={handleChangePasswordSubmit}
                  loading={changePasswordMutation.isPending}
                  disabled={!isPasswordFormValid || changePasswordMutation.isPending}
                  style={{ flex: 1 }}
                >
                  {t('common.save')}
                </Button>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
}
