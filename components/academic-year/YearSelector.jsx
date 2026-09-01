import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme, FONTS, FONT_SIZES } from "../../theme";
import apiFetch from "../../utils/apiFetch";
import apiConfig from "../../config/apiConfig";
import { useAcademicYear } from "../../context/AcademicYearContext";
import { useToast } from "../ToastProvider";
import storage from "../../utils/storage";

const CACHED_YEARS_KEY = "@cached_academic_years";

const formatDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return null;
  try {
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;
    const sStr = s.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    const eStr = e.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    return `${sStr} – ${eStr}`;
  } catch {
    return null;
  }
};

const YearSelector = ({ onYearChanged, style, compact = false }) => {
  const { colors } = useTheme();
  const { selectedYear, setYear } = useAcademicYear();
  const { showToast } = useToast();

  const [modalVisible, setModalVisible] = useState(false);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch available years from backend with offline caching
  const fetchYears = async () => {
    setLoading(true);
    let hasCache = false;

    // 1. Try to load cached years first
    try {
      const cachedStr = await storage.getItem(CACHED_YEARS_KEY);
      if (cachedStr) {
        const cachedData = JSON.parse(cachedStr);
        if (Array.isArray(cachedData) && cachedData.length > 0) {
          setYears(cachedData);
          hasCache = true;
          if (!selectedYear) {
            const activeYear =
              cachedData.find((y) => y.isActive) || cachedData[0];
            if (activeYear) setYear(activeYear);
          }
        }
      }
    } catch (e) {
      console.warn("Failed to load cached academic years", e);
    }

    // 2. Fetch fresh data from network
    try {
      const response = await apiFetch(`${apiConfig.baseUrl}/academic-year`);
      if (response.ok) {
        const data = await response.json();
        setYears(data);
        await storage.setItem(CACHED_YEARS_KEY, JSON.stringify(data));

        if (!selectedYear) {
          const activeYear = data.find((y) => y.isActive);
          if (activeYear) {
            setYear(activeYear);
          } else if (data.length > 0) {
            setYear(data[0]);
          }
        }
      } else if (!hasCache) {
        showToast("Failed to fetch academic years", "error");
      }
    } catch (error) {
      console.error("Error fetching academic years:", error);
      if (!hasCache) {
        showToast("Network error fetching years", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchYears();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenModal = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setModalVisible(true);
  };

  const handleSelectYear = async (year) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    await setYear(year);
    setModalVisible(false);
    showToast(`Switched to Academic Year: ${year.name}`, "success");
    if (onYearChanged) onYearChanged(year);
  };

  const renderYearItem = ({ item }) => {
    const isSelected = selectedYear?._id === item._id;
    const isActiveNow = item.isActive || item.status === "current";
    const isArchived = item.status === "archived";
    const isUpcoming = item.status === "draft";
    const dateRange = formatDateRange(item.startDate, item.endDate);

    const statusBadgeColor = isActiveNow
      ? colors.success || "#2e7d32"
      : isArchived
      ? colors.onSurfaceVariant
      : colors.primary;

    const statusBgColor = isActiveNow
      ? (colors.successContainer || "rgba(46, 125, 50, 0.12)")
      : isArchived
      ? colors.surfaceContainerHighest
      : (colors.primaryContainer || "rgba(33, 150, 243, 0.12)");

    const statusLabel = isActiveNow
      ? "Active Session"
      : isArchived
      ? "Archived"
      : isUpcoming
      ? "Upcoming"
      : item.status || "Past";

    return (
      <Pressable
        style={({ pressed }) => [
          styles.itemCard,
          {
            backgroundColor: isSelected
              ? (colors.primaryContainer ? colors.primaryContainer + "45" : "rgba(33, 150, 243, 0.12)")
              : pressed
              ? colors.surfaceContainerHigh
              : colors.surfaceContainerLow || colors.surface,
            borderColor: isSelected
              ? colors.primary
              : colors.outlineVariant || "rgba(0,0,0,0.08)",
            borderWidth: isSelected ? 1.5 : 1,
          },
        ]}
        onPress={() => handleSelectYear(item)}
      >
        <View style={styles.itemLeftRow}>
          {/* Circular Status Icon */}
          <View
            style={[
              styles.itemIconContainer,
              {
                backgroundColor: isSelected
                  ? colors.primary + "18"
                  : statusBgColor,
              },
            ]}
          >
            <MaterialIcons
              name={
                isActiveNow
                  ? "event-available"
                  : isArchived
                  ? "history"
                  : "event"
              }
              size={20}
              color={isSelected ? colors.primary : statusBadgeColor}
            />
          </View>

          {/* Title & Metadata */}
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={styles.itemTitleRow}>
              <Text
                style={[
                  styles.itemTitle,
                  {
                    color: isSelected ? colors.primary : colors.onSurface,
                    fontFamily: isSelected ? FONTS.bold : FONTS.semiBold,
                  },
                ]}
                numberOfLines={1}
              >
                {item.name}
              </Text>

              {/* Status Pill Badge */}
              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor: statusBgColor,
                    borderColor: statusBadgeColor + "30",
                  },
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: statusBadgeColor },
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: statusBadgeColor },
                  ]}
                >
                  {statusLabel}
                </Text>
              </View>
            </View>

            {dateRange && (
              <Text
                style={[
                  styles.itemDateRange,
                  { color: colors.onSurfaceVariant },
                ]}
                numberOfLines={1}
              >
                {dateRange}
              </Text>
            )}
          </View>
        </View>

        {/* Right Radio/Check Indicator */}
        <View style={styles.itemRightIndicator}>
          {isSelected ? (
            <MaterialIcons
              name="check-circle"
              size={22}
              color={colors.primary}
            />
          ) : (
            <MaterialIcons
              name="radio-button-unchecked"
              size={22}
              color={colors.outlineVariant || colors.onSurfaceVariant + "40"}
            />
          )}
        </View>
      </Pressable>
    );
  };

  if (!selectedYear) return null;

  const isActive = selectedYear.isActive || selectedYear.status === "current";

  return (
    <>
      {/* Sleek Pill Trigger Button */}
      <Pressable
        onPress={handleOpenModal}
        style={({ pressed }) => [
          styles.triggerButton,
          {
            backgroundColor: isActive
              ? (colors.primaryContainer ? colors.primaryContainer + "70" : colors.primary + "18")
              : (colors.surfaceContainerHigh || "#f0f0f0"),
            borderColor: isActive
              ? colors.primary + "40"
              : colors.outlineVariant || "rgba(0,0,0,0.12)",
            paddingHorizontal: compact ? 9 : 12,
            paddingVertical: compact ? 4 : 7,
            opacity: pressed ? 0.75 : 1,
            transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }],
          },
          style,
        ]}
      >
        <MaterialIcons
          name={isActive ? "event-available" : "history"}
          size={compact ? 13 : 15}
          color={isActive ? colors.primary : colors.tertiary || colors.onSurfaceVariant}
          style={{ flexShrink: 0, marginRight: 4 }}
        />

        <Text
          style={[
            styles.triggerText,
            {
              fontSize: compact ? FONT_SIZES.xs : FONT_SIZES.sm,
              color: isActive ? colors.onSurface : colors.onSurfaceVariant,
            },
          ]}
          numberOfLines={1}
        >
          {selectedYear.name}
        </Text>

        {!isActive && (
          <View
            style={[
              styles.pastChip,
              {
                backgroundColor: colors.tertiaryContainer || "rgba(255, 152, 0, 0.18)",
              },
            ]}
          >
            <Text
              style={[
                styles.pastChipText,
                {
                  color: colors.onTertiaryContainer || "#e65100",
                },
              ]}
            >
              PAST
            </Text>
          </View>
        )}

        <MaterialIcons
          name="keyboard-arrow-down"
          size={compact ? 15 : 18}
          color={isActive ? colors.primary : colors.onSurfaceVariant}
          style={{ flexShrink: 0, marginLeft: 2 }}
        />
      </Pressable>

      {/* Modern Academic Year Selection Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setModalVisible(false)}
        >
          <Pressable
            style={[
              styles.modalSheet,
              {
                backgroundColor: colors.surfaceContainerLow || colors.surface,
                borderColor: colors.outlineVariant || "rgba(0,0,0,0.1)",
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Drag Handle Indicator */}
            <View style={styles.dragHandleContainer}>
              <View
                style={[
                  styles.dragHandle,
                  { backgroundColor: colors.outlineVariant || "rgba(0,0,0,0.15)" },
                ]}
              />
            </View>

            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1, minWidth: 0 }}>
                <View
                  style={[
                    styles.modalHeaderIconContainer,
                    {
                      backgroundColor: colors.primary + "15",
                    },
                  ]}
                >
                  <MaterialIcons
                    name="calendar-today"
                    size={20}
                    color={colors.primary}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={[
                      styles.modalTitle,
                      { color: colors.onSurface },
                    ]}
                  >
                    Select Academic Year
                  </Text>
                  <Text
                    style={[
                      styles.modalSubtitle,
                      { color: colors.onSurfaceVariant },
                    ]}
                  >
                    Switch global session context
                  </Text>
                </View>
              </View>

              {/* Close Button */}
              <Pressable
                onPress={() => setModalVisible(false)}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.closeButton,
                  {
                    backgroundColor: pressed
                      ? colors.surfaceContainerHighest
                      : "transparent",
                  },
                ]}
              >
                <MaterialIcons
                  name="close"
                  size={22}
                  color={colors.onSurfaceVariant}
                />
              </Pressable>
            </View>

            {/* Helper Info Banner */}
            <View
              style={[
                styles.infoBanner,
                {
                  backgroundColor: colors.primaryContainer
                    ? colors.primaryContainer + "40"
                    : "rgba(33, 150, 243, 0.08)",
                  borderColor: colors.primary + "20",
                },
              ]}
            >
              <MaterialIcons
                name="info-outline"
                size={16}
                color={colors.primary}
                style={{ marginRight: 8, marginTop: 1 }}
              />
              <Text
                style={[
                  styles.infoBannerText,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                Select an academic session to view marks, attendance, and analytics for that specific year.
              </Text>
            </View>

            {/* Year List / Loading State */}
            {loading && years.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text
                  style={[
                    styles.loadingText,
                    { color: colors.onSurfaceVariant },
                  ]}
                >
                  Loading Academic Years...
                </Text>
              </View>
            ) : (
              <FlatList
                data={years}
                keyExtractor={(item) => item._id || item.name}
                renderItem={renderYearItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <MaterialIcons
                      name="event-busy"
                      size={44}
                      color={colors.onSurfaceVariant + "60"}
                    />
                    <Text
                      style={[
                        styles.emptyText,
                        { color: colors.onSurfaceVariant },
                      ]}
                    >
                      No Academic Years Configured
                    </Text>
                  </View>
                }
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  triggerButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 30,
  },
  triggerText: {
    fontFamily: FONTS.semiBold,
    letterSpacing: 0.1,
    flexShrink: 1,
  },
  pastChip: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    marginLeft: 4,
    marginRight: 2,
  },
  pastChipText: {
    fontSize: FONT_SIZES.micro || 10,
    fontFamily: FONTS.bold,
    letterSpacing: 0.4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    paddingTop: 8,
    maxHeight: "82%",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  dragHandleContainer: {
    alignItems: "center",
    paddingVertical: 6,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  modalHeaderIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    flexShrink: 0,
  },
  modalTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
    letterSpacing: 0.2,
  },
  modalSubtitle: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    marginTop: 1,
  },
  closeButton: {
    padding: 6,
    borderRadius: 18,
    marginLeft: 8,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginHorizontal: 20,
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoBannerText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
    lineHeight: 17,
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 13,
    borderRadius: 14,
    marginBottom: 8,
  },
  itemLeftRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  itemIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    flexShrink: 0,
  },
  itemTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  itemTitle: {
    fontSize: FONT_SIZES.sm,
    letterSpacing: 0.2,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontSize: FONT_SIZES.micro || 10,
    fontFamily: FONTS.bold,
    textTransform: "capitalize",
    letterSpacing: 0.2,
  },
  itemDateRange: {
    fontSize: FONT_SIZES.micro || 11,
    fontFamily: FONTS.regular,
    marginTop: 2,
  },
  itemRightIndicator: {
    marginLeft: 10,
    flexShrink: 0,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.sm,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    marginTop: 10,
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.sm,
  },
});

export default React.memo(YearSelector);
