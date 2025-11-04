import React from "react";
import { View, Text } from "react-native";
import ThemeToggle from "./ThemeToggle";
import { useTheme } from "../../theme";

const Header = ({ title, left }) => {
  const { styles } = useTheme();

  return (
    <View style={{ marginBottom: 8, paddingHorizontal: 8 }}>
      {/* top row: back button (left) and theme toggle (right) */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <View style={{ width: 48 }}>{left}</View>
        <View style={{ width: 48, alignItems: "flex-end" }}>
          <ThemeToggle />
        </View>
      </View>

      {/* second row: centered title */}
      <View style={{ alignItems: "center" }}>
        <Text style={styles.title} ellipsizeMode="tail">
          {title}
        </Text>
      </View>
    </View>
  );
};

export default React.memo(Header);
