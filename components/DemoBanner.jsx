import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { FONTS, FONT_SIZES, LETTER_SPACINGS } from "../theme";

export default function DemoBanner() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Demo Mode • Log in for full access</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FF9800",
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: "#fff",
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
    textTransform: "uppercase",
    letterSpacing: LETTER_SPACINGS.micro,
  },
});
