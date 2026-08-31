import React, { memo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTheme, FONTS, FONT_SIZES } from "../theme";
import { useApiQuery } from "../hooks/useApi";
import apiConfig from "../config/apiConfig";
import { CACHE_TIERS } from "../utils/cacheConfig";
import HomeModuleContainer from "./home/HomeModuleContainer";

const parseEventDate = (dateStr) => {
  if (!dateStr) return { month: "CAL", day: "--", relative: "" };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { month: "CAL", day: "--", relative: "" };

  const month = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const day = d.getDate();
  const weekday = d.toLocaleDateString("en-US", { weekday: "short" });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDay = new Date(d);
  eventDay.setHours(0, 0, 0, 0);

  const diffMs = eventDay.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  let relative = "";
  if (diffDays === 0) relative = "Today";
  else if (diffDays === 1) relative = "Tomorrow";
  else if (diffDays > 1 && diffDays <= 7) relative = `In ${diffDays} days`;
  else if (diffDays > 7) relative = `${weekday}`;

  return { month, day, relative };
};

const UpcomingEventsCard = () => {
  const { colors, mode } = useTheme();
  const isDark = mode === "dark";
  const router = useRouter();

  const { data: events = [] } = useApiQuery(
    ["events"],
    apiConfig.url(apiConfig.endpoints.events.list),
    {
      ...CACHE_TIERS.MODERATE,
      select: (data) => {
        const rawEvents = data.event || [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return rawEvents
          .filter((e) => e?.date && new Date(e.date) >= today)
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .slice(0, 3);
      },
    }
  );

  const handleNavigate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push("/events");
  };

  const cyanAccent = isDark ? "#22D3EE" : "#0E7490";
  const cardSurface = isDark ? colors.surfaceContainer : "#FFFFFF";
  const subBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";

  if (!events || events.length === 0) {
    return null;
  }

  return (
    <HomeModuleContainer
      title="Upcoming Events"
      icon="event-available"
      accentColor={cyanAccent}
      actionText="Calendar"
      onActionPress={handleNavigate}
      lightBg="rgba(14, 116, 144, 0.045)"
      darkBg="rgba(34, 211, 238, 0.07)"
      lightBorder="rgba(14, 116, 144, 0.14)"
      darkBorder="rgba(34, 211, 238, 0.18)"
    >
      <View
        style={[
          styles.eventsCard,
          {
            backgroundColor: cardSurface,
            borderColor: subBorder,
          },
        ]}
      >
        {events.map((event, idx) => {
          const isSchoolEvent = event.isSchoolEvent;
          const { month, day, relative } = parseEventDate(event.date);

          return (
            <Pressable
              key={event._id || idx}
              onPress={handleNavigate}
              style={({ pressed }) => [
                styles.eventItem,
                idx < events.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: subBorder,
                },
                { opacity: pressed ? 0.75 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={event.title}
            >
              {/* Material 3 Modern Squircle Date Badge */}
              <View
                style={[
                  styles.dateTile,
                  {
                    backgroundColor: isDark
                      ? isSchoolEvent
                        ? "rgba(109, 213, 140, 0.18)"
                        : "rgba(34, 211, 238, 0.16)"
                      : isSchoolEvent
                      ? "rgba(20, 108, 46, 0.10)"
                      : "rgba(14, 116, 144, 0.10)",
                    borderColor: isDark
                      ? isSchoolEvent
                        ? "rgba(109, 213, 140, 0.3)"
                        : "rgba(34, 211, 238, 0.3)"
                      : isSchoolEvent
                      ? "rgba(20, 108, 46, 0.2)"
                      : "rgba(14, 116, 144, 0.2)",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dateMonthText,
                    {
                      color: isSchoolEvent
                        ? isDark
                          ? "#6DD58C"
                          : "#146C2E"
                        : cyanAccent,
                    },
                  ]}
                >
                  {month}
                </Text>
                <Text
                  style={[
                    styles.dateDayText,
                    {
                      color: isSchoolEvent
                        ? isDark
                          ? "#6DD58C"
                          : "#146C2E"
                        : cyanAccent,
                    },
                  ]}
                >
                  {day}
                </Text>
              </View>

              {/* Event Info */}
              <View style={styles.eventInfo}>
                <Text
                  style={[styles.eventTitle, { color: colors.onSurface }]}
                  numberOfLines={1}
                >
                  {event.title}
                </Text>

                <View style={styles.metaRow}>
                  {isSchoolEvent && (
                    <View
                      style={[
                        styles.tagChip,
                        {
                          backgroundColor: isDark
                            ? "rgba(109, 213, 140, 0.15)"
                            : "rgba(20, 108, 46, 0.08)",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.tagChipText,
                          {
                            color: isDark ? "#6DD58C" : "#146C2E",
                          },
                        ]}
                      >
                        Official
                      </Text>
                    </View>
                  )}
                  {relative ? (
                    <Text
                      style={[
                        styles.eventDateSubtext,
                        { color: colors.onSurfaceVariant },
                      ]}
                    >
                      {relative}
                    </Text>
                  ) : null}
                </View>
              </View>

              <MaterialIcons
                name="chevron-right"
                size={20}
                color={colors.onSurfaceVariant}
              />
            </Pressable>
          );
        })}
      </View>
    </HomeModuleContainer>
  );
};

const styles = StyleSheet.create({
  eventsCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  eventItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  dateTile: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    flexShrink: 0,
  },
  dateMonthText: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.bold,
    letterSpacing: 0.5,
    marginTop: 1,
  },
  dateDayText: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
    marginTop: -2,
  },
  eventInfo: {
    flex: 1,
    minWidth: 0,
  },
  eventTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tagChip: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  tagChipText: {
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.bold,
  },
  eventDateSubtext: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
  },
});

export default memo(UpcomingEventsCard);
