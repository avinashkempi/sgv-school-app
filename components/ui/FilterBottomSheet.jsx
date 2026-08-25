import React, { forwardRef, useCallback } from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AppBottomSheet from "./AppBottomSheet";
import { useTheme } from "../../theme";

/**
 * FilterBottomSheet - Standardized, accessible filter bottom sheet
 *
 * @param {string} title - Title of the filter modal
 * @param {Array<{ label: string, value: string, icon?: string }>} options - Filter options
 * @param {string|Array<string>} selected - Currently selected value(s)
 * @param {Function} onSelect - Callback when option is selected (value) => void
 * @param {Function} onReset - Callback when Reset is pressed
 * @param {Function} onApply - Callback when Apply is pressed
 */
const FilterBottomSheet = forwardRef((props, ref) => {
  const {
    title = "Filter",
    options = [],
    selected,
    onSelect,
    onReset,
    onApply,
    isMultiSelect = false,
    snapPoints = ["45%", "70%"],
  } = props;

  const { colors } = useTheme();

  const isSelected = useCallback(
    (value) => {
      if (isMultiSelect && Array.isArray(selected)) {
        return selected.includes(value);
      }
      return selected === value;
    },
    [isMultiSelect, selected]
  );

  const handleSelectOption = (value) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics fallback
    }
    if (onSelect) {
      onSelect(value);
    }
  };

  const handleApply = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Haptics fallback
    }
    if (onApply) onApply();
    ref.current?.close();
  };

  return (
    <AppBottomSheet ref={ref} snapPoints={snapPoints} index={-1}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.onSurface }]}>{title}</Text>
        {onReset && (
          <Pressable
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              onReset();
            }}
            hitSlop={8}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={[styles.resetText, { color: colors.primary }]}>
              Reset
            </Text>
          </Pressable>
        )}
      </View>

      {/* Options List */}
      <View style={styles.chipContainer}>
        {options.map((opt) => {
          const active = isSelected(opt.value);
          return (
            <Pressable
              key={opt.value}
              onPress={() => handleSelectOption(opt.value)}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: active
                    ? colors.primaryContainer
                    : colors.surfaceContainerHigh,
                  borderColor: active ? colors.primary : colors.outlineVariant,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              {opt.icon && (
                <MaterialIcons
                  name={opt.icon}
                  size={18}
                  color={
                    active ? colors.onPrimaryContainer : colors.onSurfaceVariant
                  }
                  style={{ marginRight: 6 }}
                />
              )}
              <Text
                style={[
                  styles.chipText,
                  {
                    color: active
                      ? colors.onPrimaryContainer
                      : colors.onSurface,
                    fontFamily: active ? "DMSans-Bold" : "DMSans-Medium",
                  },
                ]}
              >
                {opt.label}
              </Text>
              {active && (
                <MaterialIcons
                  name="check"
                  size={16}
                  color={colors.onPrimaryContainer}
                  style={{ marginLeft: 6 }}
                />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Apply Button */}
      <Pressable
        onPress={handleApply}
        style={({ pressed }) => [
          styles.applyButton,
          {
            backgroundColor: colors.primary,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Text style={[styles.applyButtonText, { color: colors.onPrimary }]}>
          Apply Filters
        </Text>
      </Pressable>
    </AppBottomSheet>
  );
});

FilterBottomSheet.displayName = "FilterBottomSheet";

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(150, 150, 150, 0.2)",
  },
  title: {
    fontSize: 18,
    fontFamily: "DMSans-Bold",
  },
  resetText: {
    fontSize: 14,
    fontFamily: "DMSans-Medium",
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
  },
  applyButton: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  applyButtonText: {
    fontSize: 16,
    fontFamily: "DMSans-Bold",
  },
});

export default React.memo(FilterBottomSheet);
