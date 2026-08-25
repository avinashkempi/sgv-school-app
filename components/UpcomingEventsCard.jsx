import React, { memo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTheme } from "../theme";
import { useApiQuery } from "../hooks/useApi";
import apiConfig from "../config/apiConfig";
import { CACHE_TIERS } from "../utils/cacheConfig";
import { formatDate } from "../utils/date";

const UpcomingEventsCard = () => {
  const { colors } = useTheme();
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

  if (!events || events.length === 0) {
    return null; // Don't take up space if no upcoming events
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <MaterialIcons
            name="event-note"
            size={18}
            color={colors.tertiary || colors.primary}
          />
          <Text style={[styles.sectionHeading, { color: colors.onSurface }]}>
            Upcoming Events
          </Text>
        </View>
        <Pressable
          onPress={handleNavigate}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <Text style={[styles.viewAllText, { color: colors.primary }]}>
            Calendar
          </Text>
        </Pressable>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surfaceContainer }]}>
        {events.map((event, idx) => {
          const isSchoolEvent = event.isSchoolEvent;
          const formattedDate = formatDate(event.date);

          return (
            <Pressable
              key={event._id || idx}
              onPress={handleNavigate}
              style={({ pressed }) => [
                styles.eventItem,
                idx < events.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.outlineVariant,
                },
                { opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <View
                style={[
                  styles.dateBadge,
                  {
                    backgroundColor: isSchoolEvent
                      ? "#FEF3C7"
                      : colors.surfaceContainerHighest,
                  },
                ]}
              >
                <MaterialIcons
                  name={isSchoolEvent ? "school" : "calendar-today"}
                  size={16}
                  color={isSchoolEvent ? "#D97706" : colors.primary}
                />
              </View>

              <View style={styles.eventInfo}>
                <Text
                  style={[styles.eventTitle, { color: colors.onSurface }]}
                  numberOfLines={1}
                >
                  {event.title}
                </Text>
                <Text
                  style={[styles.eventDate, { color: colors.onSurfaceVariant }]}
                >
                  {formattedDate}
                </Text>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  titleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionHeading: {
    fontSize: 16,
    fontFamily: "DMSans-Bold",
    letterSpacing: -0.2,
  },
  viewAllText: {
    fontSize: 13,
    fontFamily: "DMSans-Bold",
  },
  card: {
    borderRadius: 20,
    overflow: "hidden",
    paddingHorizontal: 16,
  },
  eventItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
  },
  dateBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontFamily: "DMSans-Bold",
    marginBottom: 2,
  },
  eventDate: {
    fontSize: 12,
    fontFamily: "DMSans-Regular",
  },
});

export default memo(UpcomingEventsCard);
