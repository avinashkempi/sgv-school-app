import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Modal,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, FONTS, FONT_SIZES, LETTER_SPACINGS } from "../theme";
import storage from "../utils/storage";
import apiFetch from "../utils/apiFetch";
import apiConfig from "../config/apiConfig";
import formatClassName from "../utils/formatClassName";
import { useLabel } from "../context/LabelsContext";
import UserAvatar from "./ui/UserAvatar";
import {
  formatUserName,
  formatUserDesignationOrRole,
} from "../utils/userFormatters";
import { useAuth } from "../context/AuthContext";

const STORAGE_KEY_RECENT = "@recent_searches";

const GlobalSearch = ({ visible, onClose }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLabel();
  const { user: authUser } = useAuth();
  // eslint-disable-next-line no-unused-vars
  const { colors, styles } = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);

  // Load recent searches from persistent storage on mount
  useEffect(() => {
    const loadRecentSearches = async () => {
      try {
        const stored = await storage.getItem(STORAGE_KEY_RECENT);
        if (stored && Array.isArray(stored)) {
          setRecentSearches(stored);
        }
      } catch (err) {
        console.warn("Failed to load recent searches:", err);
      }
    };
    if (visible) {
      loadRecentSearches();
    }
  }, [visible]);

  const saveRecentSearches = useCallback(async (updatedList) => {
    try {
      await storage.setItem(STORAGE_KEY_RECENT, updatedList);
    } catch (err) {
      console.warn("Failed to save recent searches:", err);
    }
  }, []);

  const handleClearRecent = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setRecentSearches([]);
    await storage.removeItem(STORAGE_KEY_RECENT).catch(() => {});
  }, []);

  const handleSearch = async (searchQuery) => {
    if (searchQuery.trim().length < 2) return;

    setLoading(true);
    try {
      const response = await apiFetch(
        `${apiConfig.baseUrl}/search/global?q=${encodeURIComponent(
          searchQuery
        )}&limit=5`
      );
      if (response.ok) {
        const data = await response.json();
        setResults(data);

        // Add to recent searches (deduplicated, max 8)
        setRecentSearches((prev) => {
          const updated = [
            searchQuery.trim(),
            ...prev.filter((s) => s.toLowerCase() !== searchQuery.trim().toLowerCase()),
          ].slice(0, 8);
          saveRecentSearches(updated);
          return updated;
        });
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = global.setTimeout(() => {
      if (query.trim().length >= 2) {
        handleSearch(query);
      } else {
        setResults(null);
      }
    }, 300); // Debounce

    return () => global.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const navigateToResult = (type, item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onClose();
    const isAdmin = authUser?.role === "admin" || authUser?.role === "super admin";
    const isTeacher = authUser?.role === "teacher" || authUser?.role === "staff";
    const isStudent = authUser?.role === "student";

    switch (type) {
      case "users":
        if (isAdmin) {
          router.push({
            pathname: "/admin",
            params: { search: item.name },
          });
        } else if (isTeacher) {
          router.push({
            pathname: "/teacher/classes",
          });
        } else {
          router.push("/profile");
        }
        break;
      case "classes":
        if (isAdmin) {
          router.push("/admin/classes");
        } else if (isTeacher) {
          router.push({
            pathname: "/teacher/classes",
            params: { classId: item._id },
          });
        } else {
          router.push("/student/class");
        }
        break;
      case "subjects":
        if (isStudent && item.class?._id) {
          router.push({
            pathname: `/student/class/subject/${item._id}`,
            params: { id: item.class._id, subjectId: item._id },
          });
        } else if (isTeacher) {
          router.push("/teacher/dashboard");
        } else {
          router.push("/admin/subjects");
        }
        break;
      case "exams":
        if (isStudent) {
          router.push("/student/exam-schedule");
        } else {
          router.push("/admin/exam-schedule");
        }
        break;
      case "complaints":
        router.push("/complaints");
        break;
      case "events":
        router.push("/events");
        break;
    }
  };

  const renderResultItem = (type, item) => {
    let title, subtitle, icon;

    switch (type) {
      case "users":
        title = formatUserName(item.name);
        subtitle = `${formatUserDesignationOrRole(item)} • ${item.email || item.phone || ""}`;
        icon = item.role === "student" ? "person" : "person-outline";
        break;
      case "classes":
        title = `${formatClassName(item.name)} ${item.section || ""}`;
        subtitle = `Class Teacher: ${
          item.classTeacher?.name ? formatUserName(item.classTeacher.name) : t("common.notAssigned", "Not assigned")
        }`;
        icon = "class";
        break;
      case "subjects":
        title = item.name;
        subtitle = `${formatClassName(item.class?.name)} ${
          item.class?.section || ""
        }`;
        icon = "menu-book";
        break;
      case "exams":
        title = item.name;
        subtitle = `${item.subject?.name} • ${new Date(
          item.examDate
        ).toLocaleDateString()}`;
        icon = "event";
        break;
      case "complaints":
        title = item.title;
        subtitle = `by ${item.student?.name ? formatUserName(item.student.name) : "Student"} • ${item.status}`;
        icon = "feedback";
        break;
      case "events":
        title = item.title;
        subtitle = new Date(item.date).toLocaleDateString();
        icon = "event-available";
        break;
    }

    return (
      <Pressable
        key={item._id}
        onPress={() => navigateToResult(type, item)}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          padding: 16,
          backgroundColor: pressed
            ? colors.surfaceContainerHighest
            : "transparent",
          borderRadius: 12,
        })}
      >
        {type === "users" ? (
          <UserAvatar
            photoUrl={item.profilePhoto}
            name={item.name}
            role={item.role}
            size={40}
            shape="rounded"
            style={{ marginRight: 12 }}
          />
        ) : (
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: colors.primaryContainer,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <MaterialIcons
              name={icon}
              size={20}
              color={colors.onPrimaryContainer}
            />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: FONT_SIZES.md,
              fontFamily: FONTS.bold,
              color: colors.onSurface,
            }}
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              style={{
                fontSize: FONT_SIZES.sm,
                fontFamily: FONTS.regular,
                color: colors.onSurfaceVariant,
                marginTop: 2,
              }}
            >
              {subtitle}
            </Text>
          )}
        </View>
        <MaterialIcons
          name="chevron-right"
          size={20}
          color={colors.onSurfaceVariant}
        />
      </Pressable>
    );
  };

  const renderCategoryResults = (type, items, label) => {
    if (!items || items.length === 0) return null;

    return (
      <View key={type} style={{ marginBottom: 16 }}>
        <Text
          style={{
            fontSize: FONT_SIZES.sm,
            fontFamily: FONTS.bold,
            color: colors.onSurfaceVariant,
            textTransform: "uppercase",
            marginBottom: 8,
            paddingHorizontal: 16,
          }}
        >
          {label} ({items.length})
        </Text>
        {items.map((item) => renderResultItem(type, item))}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header with Search Bar and Safe Area Insets */}
        <View
          style={{
            paddingTop: Math.max(insets.top + 8, 20),
            paddingHorizontal: 16,
            paddingBottom: 12,
            backgroundColor: colors.surface,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.outlineVariant,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.surfaceContainerHighest,
              borderRadius: 28,
              paddingHorizontal: 16,
              height: 52,
            }}
          >
            <MaterialIcons
              name="search"
              size={24}
              color={colors.onSurfaceVariant}
            />
            <TextInput
              style={{
                flex: 1,
                fontSize: FONT_SIZES.md,
                fontFamily: FONTS.regular,
                color: colors.onSurface,
                marginLeft: 12,
                marginRight: 8,
              }}
              placeholder={t(
                "search.placeholder",
                "Search students, exams, complaints..."
              )}
              placeholderTextColor={colors.onSurfaceVariant}
              value={query}
              onChangeText={setQuery}
              autoFocus
            />
            {query.length > 0 && (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  setQuery("");
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons
                  name="close"
                  size={20}
                  color={colors.onSurfaceVariant}
                />
              </Pressable>
            )}
            <Pressable
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{ marginLeft: 12 }}
            >
              <Text
                style={{
                  fontSize: FONT_SIZES.sm,
                  fontFamily: FONTS.bold,
                  color: colors.primary,
                }}
              >
                {t("common.cancel", "Cancel")}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Results */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom + 16, 24) }}
          keyboardShouldPersistTaps="handled"
        >
          {loading ? (
            <View style={{ alignItems: "center", padding: 40 }}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={{ marginTop: 16, color: colors.onSurfaceVariant, fontFamily: FONTS.medium }}>
                {t("common.searching", "Searching...")}
              </Text>
            </View>
          ) : results ? (
            <>
              {results.totalResults === 0 ? (
                <View style={{ alignItems: "center", padding: 40 }}>
                  <MaterialIcons
                    name="search-off"
                    size={64}
                    color={colors.onSurfaceVariant}
                  />
                  <Text
                    style={{
                      marginTop: 16,
                      fontSize: FONT_SIZES.md,
                      fontFamily: FONTS.medium,
                      color: colors.onSurface,
                    }}
                  >
                    {t("search.noResults", "No results found")}
                  </Text>
                  <Text
                    style={{
                      marginTop: 8,
                      color: colors.onSurfaceVariant,
                      textAlign: "center",
                      fontFamily: FONTS.regular,
                    }}
                  >
                    {t("search.tryDifferentKeywords", "Try different keywords")}
                  </Text>
                </View>
              ) : (
                <>
                  {renderCategoryResults(
                    "users",
                    results.results.users,
                    t("search.categoryPeople", "People")
                  )}
                  {renderCategoryResults(
                    "classes",
                    results.results.classes,
                    t("search.categoryClasses", "Classes")
                  )}
                  {renderCategoryResults(
                    "subjects",
                    results.results.subjects,
                    t("search.categorySubjects", "Subjects")
                  )}
                  {renderCategoryResults(
                    "exams",
                    results.results.exams,
                    t("search.categoryExams", "Exams")
                  )}
                  {renderCategoryResults(
                    "complaints",
                    results.results.complaints,
                    t("search.categoryComplaints", "Complaints")
                  )}
                  {renderCategoryResults(
                    "events",
                    results.results.events,
                    t("search.categoryEvents", "Events")
                  )}
                </>
              )}
            </>
          ) : recentSearches.length > 0 ? (
            <View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                  paddingHorizontal: 4,
                }}
              >
                <Text
                  style={{
                    fontSize: FONT_SIZES.sm,
                    fontFamily: FONTS.bold,
                    color: colors.onSurfaceVariant,
                    textTransform: "uppercase",
                    letterSpacing: LETTER_SPACINGS.xs,
                  }}
                >
                  {t("search.recentSearches", "Recent Searches")}
                </Text>
                <Pressable
                  onPress={handleClearRecent}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text
                    style={{
                      fontSize: FONT_SIZES.sm,
                      fontFamily: FONTS.medium,
                      color: colors.error || "#B3261E",
                    }}
                  >
                    {t("common.clearAll", "Clear All")}
                  </Text>
                </Pressable>
              </View>
              {recentSearches.map((search, index) => (
                <Pressable
                  key={index}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setQuery(search);
                  }}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 12,
                    backgroundColor: pressed
                      ? colors.surfaceContainerHighest
                      : "transparent",
                    borderRadius: 12,
                  })}
                >
                  <MaterialIcons
                    name="history"
                    size={20}
                    color={colors.onSurfaceVariant}
                  />
                  <Text
                    style={{
                      flex: 1,
                      fontSize: FONT_SIZES.md,
                      fontFamily: FONTS.regular,
                      color: colors.onSurface,
                      marginLeft: 12,
                    }}
                  >
                    {search}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={{ alignItems: "center", padding: 40 }}>
              <MaterialIcons
                name="search"
                size={64}
                color={colors.onSurfaceVariant}
                style={{ opacity: 0.5 }}
              />
              <Text
                style={{
                  marginTop: 16,
                  color: colors.onSurfaceVariant,
                  textAlign: "center",
                }}
              >
                {t("search.startTypingToSearch", "Start typing to search")}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

export default GlobalSearch;
