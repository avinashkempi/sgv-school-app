import React from "react";
import { View, Text } from "react-native";
import { useTheme } from "../../theme";

const Header = ({ title }) => {
  const { styles } = useTheme();

  return (
    <View style={{ marginBottom: 8, paddingHorizontal: 8 }}>
      {/* centered title */}
      <View style={{ alignItems: "center" }}>
        <Text style={styles.title} ellipsizeMode="tail">
          {title}
        </Text>
      </View>
    </View>
  );
};

export default React.memo(Header);
