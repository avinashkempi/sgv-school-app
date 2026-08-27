import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme, FONTS, FONT_SIZES, LINE_HEIGHTS, LETTER_SPACINGS } from "../../theme";
import apiFetch from "../../utils/apiFetch";
import apiConfig from "../../config/apiConfig";
import { useAcademicYear } from "../../context/AcademicYearContext";
import { useToast } from "../ToastProvider";
import storage from "../../utils/storage";

const CACHED_YEARS_KEY = "@cached_academic_years";

const YearSelector = ({ onYearChanged, style, compact = false }) => {
  const { colors, styles } = useTheme();
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

        // If no year is currently selected (first launch), default to the 'isActive: true' one
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
      // Only show network error toast if NO cached data was available (WhatsApp-like behavior)
      if (!hasCache) {
        showToast("Network error fetching years", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetchYears();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectYear = async (year) => {
    await setYear(year);
    setModalVisible(false);
    showToast(`Time Travel Context Changed to ${year.name}`, "success");
    if (onYearChanged) onYearChanged(year);
  };

  const renderYearItem = ({ item }) => {
    const isSelected = selectedYear?._id === item._id;
    const isActiveNow = item.isActive;
    const isArchived = item.status === "archived";

    return (
      <Pressable
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          padding: 16,
          backgroundColor: isSelected
            ? colors.primaryContainer
            : pressed
            ? colors.surfaceContainer
            : colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.outlineVariant,
        })}
        onPress={() => handleSelectYear(item)}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <MaterialIcons
            name={
              isArchived ? "history" : isActiveNow ? "event-available" : "event"
            }
            size={24}
            color={isSelected ? colors.primary : colors.onSurfaceVariant}
            style={{ marginRight: 16 }}
          />
          <View>
            <Text
              style={{
                fontSize: FONT_SIZES.lg,
                fontFamily: isSelected ? FONTS.bold : FONTS.medium,
                color: isSelected
                  ? colors.onPrimaryContainer
                  : colors.onSurface,
              }}
            >
              {item.name}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 4,
              }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: isActiveNow
                    ? colors.success
                    : isArchived
                    ? colors.error
                    : colors.tertiary,
                  marginRight: 6,
                }}
              />
              <Text
                style={{
                  fontSize: FONT_SIZES.sm,
                  fontFamily: FONTS.regular,
                  color: colors.onSurfaceVariant,
                  textTransform: "capitalize",
                }}
              >
                {isActiveNow ? "Current Session (Live)" : item.status}
              </Text>
            </View>
          </View>
        </View>

        {isSelected && (
          <MaterialIcons name="check-circle" size={24} color={colors.primary} />
        )}
      </Pressable>
    );
  };

  if (!selectedYear) return null;

  return (
    <>
      <Pressable
        onPress={() => setModalVisible(true)}
        style={({ pressed }) => [
          {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: selectedYear.isActive
              ? colors.primaryContainer
              : colors.errorContainer,
            paddingHorizontal: compact ? 8 : 12,
            paddingVertical: compact ? 4 : 6,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: selectedYear.isActive
              ? colors.primary + "40"
              : colors.error + "40",
            opacity: pressed ? 0.8 : 1,
          },
          style,
        ]}
      >
        <MaterialIcons
          name={
            selectedYear.isArchived
              ? "history"
              : selectedYear.isActive
              ? "event-available"
              : "event"
          }
          size={16}
          color={
            selectedYear.isActive
              ? colors.onPrimaryContainer
              : colors.onErrorContainer
          }
          style={{ flexShrink: 0 }}
        />
        <Text
          style={{
            fontSize: FONT_SIZES.md,
            fontFamily: FONTS.bold,
            marginLeft: 6,
            marginRight: 4,
            color: selectedYear.isActive
              ? colors.onPrimaryContainer
              : colors.onErrorContainer,
            flexShrink: 1,
          }}
          numberOfLines={1}
        >
          {selectedYear.name}
        </Text>
        <MaterialIcons
          name="arrow-drop-down"
          size={18}
          color={
            selectedYear.isActive
              ? colors.onPrimaryContainer
              : colors.onErrorContainer
          }
          style={{ flexShrink: 0 }}
        />

        {/* Visual marker if looking at historical data to prevent confusion */}
        {!selectedYear.isActive && (
          <View
            style={{
              position: "absolute",
              top: -6,
              right: -6,
              backgroundColor: colors.error,
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 10,
            }}
          >
            <Text
              style={{
                fontSize: FONT_SIZES.micro,
                color: colors.onError,
                fontFamily: FONTS.bold,
                textTransform: "uppercase",
              }}
            >
              PAST
            </Text>
          </View>
        )}
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
          onPress={() => setModalVisible(false)}
        >
          <Pressable
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingTop: 8,
              maxHeight: "80%",
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ alignItems: "center", paddingVertical: 8 }}>
              <View
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: colors.outlineVariant,
                }}
              />
            </View>

            <View style={{ paddingHorizontal: 24, paddingBottom: 16 }}>
              <Text style={styles.titleLarge}>Time Travel Control</Text>
              <Text
                style={[
                  styles.bodyMedium,
                  { color: colors.onSurfaceVariant, marginTop: 4 },
                ]}
              >
                Change the global context to view absolute historical data
              </Text>
            </View>

            {loading && years.length === 0 ? (
              <View style={{ padding: 40, alignItems: "center" }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text
                  style={{
                    marginTop: 12,
                    color: colors.onSurfaceVariant,
                    fontFamily: FONTS.medium,
                  }}
                >
                  Loading Timelines...
                </Text>
              </View>
            ) : (
              <FlatList
                data={years}
                keyExtractor={(item) => item._id}
                renderItem={renderYearItem}
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

export default YearSelector;
