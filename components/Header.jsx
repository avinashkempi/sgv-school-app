import React from "react";
import { View, Text } from "react-native";
import { useTheme } from "../theme";

const Header = ({ title }) => {
  const { styles } = useTheme();

  return (
    <View style={{ marginBottom: 20, paddingHorizontal: 0, paddingBottom: 0 }}>
      {/* centered title */}
      <View style={{ alignItems: "center" }}>
        <Text style={[styles.title, { fontSize: 26 }]} ellipsizeMode="tail">
          {title}
        </Text>
      </View>
    </View>
  );
};

export default React.memo(Header);
