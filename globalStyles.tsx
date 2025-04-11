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
};

export const FONTS = {
  bold: "Quicksand-Bold",
  semiBold: "Quicksand-SemiBold",
  regular: "Quicksand",
};

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 20,
    fontFamily: FONTS.regular,
  },
  cardContainer: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 24,
    elevation: 5,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  title: {
    fontSize: 32,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    marginBottom: 40,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  subheading: {
    fontSize: 18,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 40,
  },
  label: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
    textTransform: "uppercase" as const,
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
    marginTop: 6,
    textDecorationLine: "underline" as const,
  },
  iconRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: 12,
    gap: 12,
  },
  socialIconBox: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: COLORS.cardBackground,
    elevation: 3,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  iconLabel: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  column: {
    flexDirection: 'column',
  },

  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  fullWidth: {
    width: '100%',
  },

  fullHeight: {
    height: '100%',
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },

  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonText: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: '#fff',
    textAlign: 'center',
  },

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

  errorText: {
    color: '#FF4C4C',
    fontSize: 14,
    fontFamily: FONTS.regular,
    marginTop: 4,
  },

  shadowBox: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: 16,
    elevation: 4,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  backText: {
    fontSize: 16,
    color: COLORS.primary,
    fontFamily: "Quicksand-SemiBold",
    marginLeft: 8,
  },
  
});
