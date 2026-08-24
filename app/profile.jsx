import React, { useState, useMemo } from "react";
import { View, Text, ScrollView, RefreshControl, Modal, Pressable, KeyboardAvoidingView, Platform } from "react-native";
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
import { Image } from 'expo-image';
import { getGridThumbnailUrl } from '../utils/cloudinaryUpload';

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

  // Fetch user's approved vibes
  const userId = user?._id || authUser?._id;
  const { data: userVibesData, refetch: refetchVibes } = useApiQuery(
    ['userVibes', userId],
    `${apiConfig.baseUrl}${apiConfig.endpoints.vibes.userVibes(userId)}`,
    {
      ...CACHE_TIERS.MODERATE,
      enabled: !!userId,
      select: (data) => data?.data || [],
    }
  );

  const userVibes = userVibesData || [];

  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const hasMinLength = newPassword.length >= 8;
  const hasLetters = /[a-zA-Z]/.test(newPassword);
  const hasNumbersOrSpecial = /[0-9!@#$%^&*(),.?":{}|<>]/.test(newPassword);
  const isDifferentFromCurrent = !currentPassword || (newPassword !== currentPassword);
  const passwordsMatch = Boolean(confirmPassword && newPassword === confirmPassword);

  const strengthScore = useMemo(() => {
    if (!newPassword) return 0;
    let score = 0;
    if (hasMinLength) score += 1;
    if (hasLetters && hasNumbersOrSpecial) score += 1;
    if (newPassword.length >= 10 && /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword) && /[^A-Za-z0-9]/.test(newPassword)) score += 1;
    return Math.min(score, 3);
  }, [newPassword, hasMinLength, hasLetters, hasNumbersOrSpecial]);

  const strengthDetails = useMemo(() => {
    if (!newPassword) return { label: '', color: 'transparent' };
    if (strengthScore <= 1) return { label: 'Weak', color: colors.error };
    if (strengthScore === 2) return { label: 'Good', color: colors.roleStudent || '#E27200' };
    return { label: 'Strong', color: colors.success };
  }, [strengthScore, newPassword, colors]);

  const isPasswordFormValid = Boolean(
    currentPassword?.trim() &&
    hasMinLength &&
    isDifferentFromCurrent &&
    passwordsMatch
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
    if (currentPassword === newPassword) {
      showToast('New password must be different from current password', 'error');
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
    await Promise.all([
      refetch(),
      refetchVibes ? refetchVibes() : Promise.resolve()
    ]);
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

              {/* ═══════════ My SGV Vibes Showcase ═══════════ */}
              <Card variant="filled" style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <MaterialIcons name="auto-awesome" size={18} color="#FF9800" />
                    <Text style={{ fontSize: 14, fontFamily: "DMSans-Bold", color: colors.onSurface }}>
                      My SGV Vibes
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => router.push('/vibes')}
                    hitSlop={8}
                  >
                    <Text style={{ fontSize: 12, fontFamily: "DMSans-Bold", color: colors.primary }}>
                      {userVibes.length > 0 ? `View All (${userVibes.length})` : 'Explore'}
                    </Text>
                  </Pressable>
                </View>

                {userVibes.length > 0 ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {userVibes.slice(0, 6).map((vibe, idx) => {
                      const imgUrl = vibe.images?.[0]?.thumbnailUrl || vibe.images?.[0]?.url;
                      const optimizedUrl = imgUrl ? getGridThumbnailUrl(imgUrl) : null;
                      const isVideo = vibe.images?.[0]?.type === 'video';

                      return (
                        <Pressable
                          key={vibe._id || idx}
                          onPress={() => router.push('/vibes')}
                          style={({ pressed }) => ({
                            width: '31%',
                            aspectRatio: 1,
                            borderRadius: 12,
                            overflow: 'hidden',
                            backgroundColor: colors.surfaceContainerHighest,
                            position: 'relative',
                            opacity: pressed ? 0.8 : 1,
                          })}
                        >
                          {optimizedUrl ? (
                            <Image
                              source={{ uri: optimizedUrl }}
                              style={{ width: '100%', height: '100%' }}
                              contentFit="cover"
                              transition={200}
                            />
                          ) : (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                              <MaterialIcons name="image" size={24} color={colors.onSurfaceVariant} />
                            </View>
                          )}
                          {isVideo && (
                            <View style={{ position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, padding: 2 }}>
                              <MaterialIcons name="play-arrow" size={12} color="#fff" />
                            </View>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                ) : (
                  <View style={{ alignItems: 'center', paddingVertical: 16, gap: 8 }}>
                    <Text style={{ fontSize: 13, fontFamily: 'DMSans-Regular', color: colors.onSurfaceVariant, textAlign: 'center' }}>
                      You haven't posted any vibes yet.
                    </Text>
                    <Pressable
                      onPress={() => router.push('/vibes')}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        paddingHorizontal: 14,
                        paddingVertical: 6,
                        borderRadius: 16,
                        backgroundColor: colors.primaryContainer,
                      }}
                    >
                      <MaterialIcons name="add" size={16} color={colors.onPrimaryContainer} />
                      <Text style={{ fontSize: 12, fontFamily: 'DMSans-Bold', color: colors.onPrimaryContainer }}>
                        Share a Vibe
                      </Text>
                    </Pressable>
                  </View>
                )}
              </Card>
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
          animationType="fade"
          transparent={true}
          onRequestClose={resetPasswordForm}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)" }}
          >
            <ScrollView
              contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center", padding: 20 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={{ backgroundColor: colors.background, borderRadius: 24, padding: 24, width: '100%', maxWidth: 420, borderWidth: 1, borderColor: colors.border, elevation: 5, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryContainer || `${colors.primary}15`, justifyContent: 'center', alignItems: 'center' }}>
                      <MaterialIcons name="lock-reset" size={22} color={colors.primary} />
                    </View>
                    <Text style={{ fontSize: 20, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>
                      {t('profile.resetPassword')}
                    </Text>
                  </View>
                  <Pressable onPress={resetPasswordForm} hitSlop={8}>
                    <MaterialIcons name="close" size={24} color={colors.textSecondary} />
                  </Pressable>
                </View>

                {/* Current Password Field */}
                <View style={{ marginBottom: 14 }}>
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
                <View style={{ marginBottom: 10 }}>
                  <AppTextInput
                    label={t('profile.newPasswordLabel')}
                    placeholder={t('profile.newPasswordPlaceholder')}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                    rightIcon={showNewPassword ? "visibility-off" : "visibility"}
                    onRightIconPress={() => setShowNewPassword(!showNewPassword)}
                    error={currentPassword && newPassword && currentPassword === newPassword ? "New password must be different from current password" : undefined}
                  />
                </View>

                {/* Password Strength Meter & Live Checklist */}
                {newPassword.length > 0 && (
                  <View style={{ marginBottom: 14, backgroundColor: colors.surfaceContainerLow || colors.surfaceContainer, borderRadius: 12, padding: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={{ fontSize: 12, fontFamily: 'DMSans-Medium', color: colors.textSecondary }}>
                        Password Strength
                      </Text>
                      <Text style={{ fontSize: 12, fontFamily: 'DMSans-Bold', color: strengthDetails.color }}>
                        {strengthDetails.label}
                      </Text>
                    </View>
                    {/* Progress Bar Segments */}
                    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
                      <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: strengthScore >= 1 ? strengthDetails.color : colors.outlineVariant }} />
                      <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: strengthScore >= 2 ? strengthDetails.color : colors.outlineVariant }} />
                      <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: strengthScore >= 3 ? strengthDetails.color : colors.outlineVariant }} />
                    </View>

                    {/* Requirement Checklist */}
                    <View style={{ gap: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <MaterialIcons name={hasMinLength ? "check-circle" : "radio-button-unchecked"} size={14} color={hasMinLength ? colors.success : colors.textSecondary} />
                        <Text style={{ fontSize: 12, fontFamily: 'DMSans-Regular', color: hasMinLength ? colors.textPrimary : colors.textSecondary }}>
                          At least 8 characters
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <MaterialIcons name={hasLetters && hasNumbersOrSpecial ? "check-circle" : "radio-button-unchecked"} size={14} color={hasLetters && hasNumbersOrSpecial ? colors.success : colors.textSecondary} />
                        <Text style={{ fontSize: 12, fontFamily: 'DMSans-Regular', color: hasLetters && hasNumbersOrSpecial ? colors.textPrimary : colors.textSecondary }}>
                          Letters & numbers or symbols
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Confirm New Password Field */}
                <View style={{ marginBottom: 20 }}>
                  <AppTextInput
                    label={t('profile.confirmPasswordLabel')}
                    placeholder={t('profile.confirmPasswordPlaceholder')}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    rightIcon={showConfirmPassword ? "visibility-off" : "visibility"}
                    onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    error={confirmPassword.length > 0 && confirmPassword !== newPassword ? t('toasts.passwordsDoNotMatch') : undefined}
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
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </ScrollView>
  );
}
