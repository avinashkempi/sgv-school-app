import React, { useMemo } from "react";
import { View } from "react-native";
import { Calendar } from "react-native-calendars";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme, FONTS, FONT_SIZES } from "../theme";

const ModernCalendar = ({
  current,
  onDayPress,
  markedDates,
  onMonthChange,
  dayComponent,
  style,
  markingType,
  theme: customTheme,
}) => {
  const { colors } = useTheme();

  const defaultTheme = useMemo(
    () => ({
      backgroundColor: "transparent",
      calendarBackground: "transparent",
      textSectionTitleColor: colors.textSecondary,
      selectedDayBackgroundColor: colors.primary,
      selectedDayTextColor: colors.white,
      todayTextColor: colors.primary,
      dayTextColor: colors.textPrimary,
      textDisabledColor: colors.textSecondary + "40",
      dotColor: colors.primary,
      selectedDotColor: colors.white,
      arrowColor: colors.primary,
      monthTextColor: colors.textPrimary,
      indicatorColor: colors.primary,
      textDayFontFamily: FONTS.medium,
      textMonthFontFamily: FONTS.bold,
      textDayHeaderFontFamily: FONTS.bold,
      textDayFontSize: FONT_SIZES.sm,
      textMonthFontSize: FONT_SIZES.md,
      textDayHeaderFontSize: FONT_SIZES.xs,
      "stylesheet.calendar.header": {
        header: {
          flexDirection: "row",
          justifyContent: "space-between",
          paddingHorizontal: 12,
          marginTop: 8,
          marginBottom: 8,
          alignItems: "center",
        },
        monthText: {
          fontSize: FONT_SIZES.md,
          fontFamily: FONTS.bold,
          color: colors.textPrimary,
          letterSpacing: 0.3,
        },
        arrow: {
          padding: 4,
        },
        week: {
          marginTop: 8,
          flexDirection: "row",
          justifyContent: "space-around",
          paddingBottom: 4,
          borderBottomWidth: 1,
          borderBottomColor: colors.outlineVariant ? colors.outlineVariant + "25" : "rgba(0,0,0,0.06)",
        },
      },
      "stylesheet.day.basic": {
        base: {
          width: 36,
          height: 36,
          alignItems: "center",
          justifyContent: "center",
        },
      },
    }),
    [colors]
  );

  return (
    <View
      style={[
        {
          backgroundColor: colors.surfaceContainer,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: colors.outlineVariant ? colors.outlineVariant + "30" : "rgba(0,0,0,0.06)",
          paddingVertical: 10,
          paddingHorizontal: 6,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <Calendar
        current={current}
        onDayPress={onDayPress}
        markedDates={markedDates}
        onMonthChange={(month) => {
          if (onMonthChange) {
            onMonthChange(month);
          }
        }}
        dayComponent={dayComponent}
        markingType={markingType}
        theme={{ ...defaultTheme, ...customTheme }}
        enableSwipeMonths={true}
        hideExtraDays={false}
        renderArrow={(direction) => (
          <View
            style={{
              backgroundColor: colors.surfaceContainerHighest || colors.surfaceVariant,
              borderRadius: 10,
              padding: 6,
              borderWidth: 1,
              borderColor: colors.outlineVariant ? colors.outlineVariant + "30" : "transparent",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialIcons
              name={direction === "left" ? "chevron-left" : "chevron-right"}
              size={20}
              color={colors.textPrimary}
            />
          </View>
        )}
      />
    </View>
  );
};

export default ModernCalendar;
