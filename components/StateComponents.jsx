import React, { memo } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useTheme, FONTS, FONT_SIZES, SPACING, RADIUS } from "../theme";
import { MaterialIcons } from "@expo/vector-icons";
import { useLabel } from "../context/LabelsContext";
import Button from "./Button";

/**
 * Premium Empty State Component
 *
 * @param {string} icon - MaterialIcons name (default: 'inbox')
 * @param {string} title - Header text
 * @param {string} message - Description / guidance text
 * @param {string} actionLabel - Primary CTA button label
 * @param {Function} onAction - Primary CTA button callback
 * @param {string} [secondaryActionLabel] - Optional secondary action
 * @param {Function} [onSecondaryAction] - Optional secondary action callback
 * @param {Object} [style] - Container style overrides
 */
const EmptyState = memo(({
  icon = "inbox",
  title,
  message,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  style,
}) => {
  const { colors } = useTheme();
  const { t } = useLabel();

  const displayTitle = title ?? t("states.emptyTitle", "Nothing here yet");
  const displayMessage =
    message ?? t("states.emptyMessage", "There is no information to display right now.");

  return (
    <View
      style={[
        {
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 40,
          paddingHorizontal: 24,
          minHeight: 220,
        },
        style,
      ]}
    >
      <View
        style={{
          width: 68,
          height: 68,
          borderRadius: RADIUS.full || 34,
          backgroundColor: colors.primaryContainer || colors.surfaceContainerHigh || "#EEF2FF",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: SPACING.md || 16,
          borderWidth: 1,
          borderColor: colors.outlineVariant || "transparent",
        }}
      >
        <MaterialIcons
          name={icon}
          size={32}
          color={colors.primary || "#4F46E5"}
        />
      </View>

      <Text
        style={{
          fontSize: FONT_SIZES.md || 16,
          color: colors.textPrimary || colors.onSurface,
          marginBottom: 6,
          textAlign: "center",
          fontFamily: FONTS.bold || FONTS.semiBold,
        }}
      >
        {displayTitle}
      </Text>

      {displayMessage ? (
        <Text
          style={{
            fontSize: FONT_SIZES.sm || 13,
            color: colors.onSurfaceVariant,
            textAlign: "center",
            lineHeight: 19,
            maxWidth: 280,
            marginBottom: actionLabel && onAction ? 20 : 0,
            fontFamily: FONTS.regular,
            fontStyle: "italic",
          }}
        >
          {displayMessage}
        </Text>
      ) : null}

      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 }}>
        {secondaryActionLabel && onSecondaryAction && (
          <Button
            variant="text"
            size="md"
            onPress={onSecondaryAction}
            title={secondaryActionLabel}
          />
        )}
        {actionLabel && onAction && (
          <Button
            variant="tonalPrimary"
            size="md"
            onPress={onAction}
            title={actionLabel}
          />
        )}
      </View>
    </View>
  );
});

EmptyState.displayName = "EmptyState";

/**
 * Premium Loading State Component
 *
 * @param {string} [message] - Assistive loading text
 * @param {Object} [style] - Container style overrides
 */
const LoadingState = memo(({ message, style }) => {
  const { colors } = useTheme();
  const { t } = useLabel();
  const displayMessage = message ?? t("states.loadingDefault", "Loading...");

  return (
    <View
      style={[
        {
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 40,
          paddingHorizontal: 24,
          minHeight: 200,
        },
        style,
      ]}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.surface || "#FFFFFF",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 14,
          shadowColor: colors.shadow || "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 6,
          elevation: 2,
        }}
      >
        <ActivityIndicator size="small" color={colors.primary || "#4F46E5"} />
      </View>

      <Text
        style={{
          fontSize: FONT_SIZES.sm || 13,
          color: colors.textSecondary || colors.onSurfaceVariant,
          fontFamily: FONTS.medium,
          textAlign: "center",
        }}
      >
        {displayMessage}
      </Text>
    </View>
  );
});

LoadingState.displayName = "LoadingState";

/**
 * Premium Error State Component
 *
 * @param {string} [title] - Header text
 * @param {string} [message] - Explanatory error details
 * @param {Function} [onRetry] - Retry callback action
 * @param {string} [retryLabel] - Custom retry button label
 * @param {Object} [style] - Container style overrides
 */
const ErrorState = memo(({ title, message, onRetry, retryLabel, style }) => {
  const { colors } = useTheme();
  const { t } = useLabel();

  const displayTitle =
    title ?? t("states.errorDefault", "Something went wrong");
  const displayRetry = retryLabel ?? t("states.retryButton", "Try Again");

  return (
    <View
      style={[
        {
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 40,
          paddingHorizontal: 24,
          minHeight: 220,
        },
        style,
      ]}
    >
      <View
        style={{
          width: 68,
          height: 68,
          borderRadius: RADIUS.full || 34,
          backgroundColor: colors.errorContainer || "#FEF2F2",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: SPACING.md || 16,
          borderWidth: 1,
          borderColor: colors.outlineVariant || "transparent",
        }}
      >
        <MaterialIcons
          name="error-outline"
          size={32}
          color={colors.error || "#DC2626"}
        />
      </View>

      <Text
        style={{
          fontSize: FONT_SIZES.md || 16,
          color: colors.textPrimary || colors.onSurface,
          marginBottom: 6,
          textAlign: "center",
          fontFamily: FONTS.bold || FONTS.semiBold,
        }}
      >
        {displayTitle}
      </Text>

      {message ? (
        <Text
          style={{
            fontSize: FONT_SIZES.sm || 13,
            color: colors.textSecondary || colors.onSurfaceVariant,
            textAlign: "center",
            lineHeight: 19,
            maxWidth: 300,
            marginBottom: onRetry ? 20 : 0,
            fontFamily: FONTS.regular,
          }}
        >
          {message}
        </Text>
      ) : null}

      {onRetry && (
        <Button
          variant="filled"
          size="md"
          icon="refresh"
          onPress={onRetry}
          title={displayRetry}
          style={{ minWidth: 130 }}
        />
      )}
    </View>
  );
});

ErrorState.displayName = "ErrorState";

/**
 * Premium Offline State Component
 */
const OfflineState = memo(({ onRetry, style }) => {
  const { colors } = useTheme();
  const { t } = useLabel();

  return (
    <View
      style={[
        {
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 40,
          paddingHorizontal: 24,
          minHeight: 220,
        },
        style,
      ]}
    >
      <View
        style={{
          width: 68,
          height: 68,
          borderRadius: RADIUS.full || 34,
          backgroundColor: colors.surfaceContainerHigh || "#E2E8F0",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: SPACING.md || 16,
          borderWidth: 1,
          borderColor: colors.outlineVariant || "transparent",
        }}
      >
        <MaterialIcons
          name="cloud-off"
          size={32}
          color={colors.textSecondary || "#64748B"}
        />
      </View>

      <Text
        style={{
          fontSize: FONT_SIZES.md || 16,
          color: colors.textPrimary || colors.onSurface,
          marginBottom: 6,
          textAlign: "center",
          fontFamily: FONTS.bold || FONTS.semiBold,
        }}
      >
        {t("states.offlineTitle", "You are offline")}
      </Text>

      <Text
        style={{
          fontSize: FONT_SIZES.sm || 13,
          color: colors.textSecondary || colors.onSurfaceVariant,
          textAlign: "center",
          lineHeight: 19,
          maxWidth: 290,
          marginBottom: onRetry ? 20 : 0,
          fontFamily: FONTS.regular,
        }}
      >
        {t(
          "states.offlineMessage",
          "Showing saved offline data. Please check your internet connection to sync latest changes."
        )}
      </Text>

      {onRetry && (
        <Button
          variant="outlined"
          size="md"
          icon="refresh"
          onPress={onRetry}
          title={t("states.reconnectButton", "Try Reconnecting")}
          style={{ minWidth: 160 }}
        />
      )}
    </View>
  );
});

OfflineState.displayName = "OfflineState";

/**
 * Premium Partial Data State Banner Component
 */
const PartialDataState = memo(({ message, onRetry, style }) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.surfaceContainer,
          borderColor: colors.outlineVariant,
          borderWidth: 1,
          borderRadius: RADIUS.md || 12,
          paddingHorizontal: 14,
          paddingVertical: 10,
          gap: 10,
          marginVertical: 8,
        },
        style,
      ]}
    >
      <MaterialIcons
        name="info-outline"
        size={20}
        color={colors.warning || "#D97706"}
      />
      <Text
        style={{
          flex: 1,
          fontSize: FONT_SIZES.xs || 12,
          color: colors.textSecondary,
          fontFamily: FONTS.medium,
        }}
      >
        {message || "Some content could not be updated. Showing cached version."}
      </Text>
      {onRetry && (
        <Button
          variant="text"
          size="sm"
          onPress={onRetry}
          title="Retry"
        />
      )}
    </View>
  );
});

PartialDataState.displayName = "PartialDataState";

export { EmptyState, LoadingState, ErrorState, OfflineState, PartialDataState };
