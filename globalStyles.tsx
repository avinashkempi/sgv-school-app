import { StyleSheet } from "react-native";

export const COLORS = {
  primary: "#2F6CD4",
  secondary: "#FF5E1C",
  background: "#f7f8fc",
  cardBackground: "#fff",
  textPrimary: "#333",
  textSecondary: "#666",
  border: "#e0e0e0",
  shadow: "#000",
  instagram: "#C13584",
  youtube: "#FF0000",
  error: "#FF4C4C",
  white: "#ffffff",
};

export const FONTS = {
  bold: "Quicksand-Bold",
  semiBold: "Quicksand-SemiBold",
  regular: "Quicksand",
};

const shadowBase = {
  elevation: 4,
  shadowColor: COLORS.shadow,
  shadowOpacity: 0.1,
  shadowOffset: { width: 0, height: 2 },
  shadowRadius: 5,
};

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 20,
  },

  // Typography
  title: {
    fontSize: 32,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    marginBottom: 40,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  label: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
    textTransform: "uppercase",
  },
  text: {
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    lineHeight: 24,
    marginBottom: 8,
  },
  link: {
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.primary,
    textDecorationLine: "underline",
  },
  iconLabel: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: COLORS.white,
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.error,
    marginTop: 4,
  },

  // Layout
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  column: {
    flexDirection: "column",
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  fullWidth: {
    width: "100%",
  },
  fullHeight: {
    height: "100%",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },

  // Cards / Box / Shadow
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    ...shadowBase,
    elevation: 5,
  },
  shadowBox: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: 16,
    ...shadowBase,
  },
  socialIconBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: COLORS.cardBackground,
    ...shadowBase,
    shadowRadius: 6,
  },

  // Forms
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.cardBackground,
  },

  // Buttons
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  // Navigation
  backButton: {
    flexDirection: "row",
  },

  // Icons
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
});
