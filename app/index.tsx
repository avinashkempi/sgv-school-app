// app/index.tsx
import {
  View,
  Text,
  Pressable,
  StatusBar,
  Linking,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Link } from "expo-router";
import {
  FontAwesome,
  MaterialIcons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { SCHOOL } from "../constants/basic-info";
import { ROUTES } from "../constants/routes";

export default function HomeScreen() {
  const handlePress = async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />

      <Text style={styles.heading}>🎓 Welcome</Text>
      <Text style={styles.subheading}>{SCHOOL.name}</Text>

      <View style={styles.cardGroup}>
        <Link href={ROUTES.ABOUT} asChild>
          <Pressable style={styles.card}>
            <MaterialIcons name="info" size={24} color="#2F6CD4" />
            <Text style={styles.cardText}>About</Text>
          </Pressable>
        </Link>

        <Link href={ROUTES.MAP} asChild>
          <Pressable style={styles.card}>
            <MaterialIcons name="map" size={24} color="#2F6CD4" />
            <Text style={styles.cardText}>Map</Text>
          </Pressable>
        </Link>

        <Link href={ROUTES.EVENTS} asChild>
          <Pressable style={styles.card}>
            <MaterialIcons name="event" size={24} color="#2F6CD4" />
            <Text style={styles.cardText}>Events</Text>
          </Pressable>
        </Link>

        <Link href={ROUTES.NEWS} asChild>
          <Pressable style={styles.card}>
            <MaterialCommunityIcons
              name="newspaper"
              size={24}
              color="#2F6CD4"
            />
            <Text style={styles.cardText}>News</Text>
          </Pressable>
        </Link>

        <Link href={ROUTES.CONTACT} asChild>
          <Pressable style={styles.card}>
            <MaterialIcons name="contact-page" size={24} color="#2F6CD4" />
            <Text style={styles.cardText}>Contact Us</Text>
          </Pressable>
        </Link>
      </View>

      <View style={styles.socialContainer}>
        <Pressable
          onPress={() => handlePress(SCHOOL.socials.youtube)}
          style={styles.iconBox}
        >
          <FontAwesome name="youtube-play" size={28} color="#FF0000" />
          <Text style={styles.iconLabel}>YouTube</Text>
        </Pressable>

        <Pressable
          onPress={() => handlePress(SCHOOL.socials.instagram)}
          style={styles.iconBox}
        >
          <FontAwesome name="instagram" size={28} color="#C13584" />
          <Text style={styles.iconLabel}>Instagram</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  heading: {
    fontSize: 32,
    fontFamily: "Poppins-Bold",
    color: "#2F6CD4",
    textAlign: "center",
    marginBottom: 4,
  },
  subheading: {
    fontSize: 16,
    fontFamily: "Poppins",
    color: "#666",
    textAlign: "center",
    marginBottom: 36,
  },
  cardGroup: {
    marginBottom: 40,
  },
  card: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 16,
    elevation: 3,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  cardText: {
    fontSize: 17,
    fontFamily: "Poppins",
    color: "#333",
    marginLeft: 12,
  },
  socialContainer: {
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingTop: 24,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  iconBox: {
    alignItems: "center",
  },
  iconLabel: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: "Poppins",
    color: "#666",
  },
});
