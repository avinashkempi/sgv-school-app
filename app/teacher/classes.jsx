import React, { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme, FONTS, FONT_SIZES } from "../../theme";
import apiConfig from "../../config/apiConfig";
import { useApiQuery } from "../../hooks/useApi";
import { useToast } from "../../components/ToastProvider";
import AppHeader from "../../components/Header";
import { formatClassName } from "../../utils/formatClassName";
import { useAuth } from "../../context/AuthContext";
import { useLabel } from "../../context/LabelsContext";
import useTabScrollToTop from "../../hooks/useTabScrollToTop";
import AppRefreshControl from "../../components/ui/AppRefreshControl";

export default function TeacherClassesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { action } = params;
  const { styles, colors } = useTheme();
  const { _showToast } = useToast();
  const { user, userId: authUserId } = useAuth();
  const userId = user?.id || user?._id || authUserId;
  const { t } = useLabel();
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef(null);

  // Mobile standard gestures
  useTabScrollToTop(scrollRef, "/teacher/classes");
  useTabScrollToTop(scrollRef, "/teacher");

  const {
    data: classesData,
    isLoading: loading,
    refetch,
  } = useApiQuery(
    ["teacherClasses", userId],
    `${apiConfig.baseUrl}/classes/my-classes`
  );
  const classes = classesData || [];

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        ref={scrollRef}
        refreshControl={
          <AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32, minHeight: "100%" }}
        showsVerticalScrollIndicator={false}
        scrollsToTop={true}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <AppHeader
            title={t("teacher.classesTitle", "My Classes")}
            subtitle={t(
              "teacher.classesSubtitle",
              "Manage your assigned classes"
            )}
            variant="root"
          />

          {loading ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                marginTop: 100,
              }}
            >
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <View style={{ gap: 24 }}>
              <View>
                <Text style={styles.titleMedium}>
                  {t("teacher.classesTitle", "My Classes")}
                </Text>
                {classes.length === 0 ? (
                  <View
                    style={{
                      alignItems: "center",
                      marginTop: 40,
                      opacity: 0.6,
                    }}
                  >
                    <MaterialIcons
                      name="class"
                      size={48}
                      color={colors.textSecondary}
                    />
                    <Text
                      style={{
                        color: colors.textSecondary,
                        marginTop: 16,
                        fontSize: FONT_SIZES.md,
                        fontFamily: FONTS.medium,
                      }}
                    >
                      {t(
                        "teacher.noClassesAssigned",
                        "No classes assigned to you yet."
                      )}
                    </Text>
                  </View>
                ) : (
                  <View style={{ gap: 12 }}>
                    {classes.map((cls) => (
                      <Pressable
                        key={cls._id}
                        onPress={() => {
                          if (action === "attendance") {
                            router.push({
                              pathname: "/teacher/class/attendance",
                              params: { classId: cls._id },
                            });
                          } else {
                            router.push(`/teacher/class/${cls._id}`);
                          }
                        }}
                        style={({ pressed }) => [
                          styles.cardMinimal,
                          {
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: 20,
                            opacity: pressed ? 0.9 : 1,
                          },
                        ]}
                      >
                        <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                          <Text
                            style={{
                              fontSize: FONT_SIZES.md,
                              fontFamily: FONTS.bold,
                              color: colors.textPrimary,
                            }}
                            numberOfLines={1}
                          >
                            {formatClassName(cls.name, cls.section)}
                          </Text>
                          <Text
                            style={{
                              fontSize: FONT_SIZES.xs,
                              color: colors.textSecondary,
                              marginTop: 4,
                              fontFamily: FONTS.regular,
                            }}
                            numberOfLines={1}
                          >
                            {cls.academicYear?.name} • {cls.branch}
                          </Text>
                          <View
                            style={{
                              backgroundColor: colors.primary + "15",
                              alignSelf: "flex-start",
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 8,
                              marginTop: 10,
                            }}
                          >
                            <Text
                              style={{
                                color: colors.primary,
                                fontSize: FONT_SIZES.micro,
                                fontFamily: FONTS.bold,
                              }}
                            >
                              {t("teacher.classTeacher", "CLASS TEACHER")}
                            </Text>
                          </View>
                        </View>
                        <MaterialIcons
                          name="chevron-right"
                          size={24}
                          color={colors.textSecondary}
                        />
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
