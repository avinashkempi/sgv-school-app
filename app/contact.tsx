import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { SCHOOL } from '../constants/basic-info';

export default function Contact() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Contact Us</Text>

      <View style={styles.section}>
        <Text style={styles.label}>📍 Address</Text>
        <Text style={styles.text}>{SCHOOL.address}</Text>
        <Pressable onPress={() => Linking.openURL(SCHOOL.mapUrl)}>
          <Text style={styles.link}>📌 View on Google Maps</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>📞 Phone</Text>
        <Text style={styles.text}>{SCHOOL.phone}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>✉️ Email</Text>
        <Text style={styles.text}>{SCHOOL.email}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>🔗 Follow Us</Text>
        <Pressable onPress={() => Linking.openURL(SCHOOL.socials.instagram)}>
          <Text style={styles.link}>📷 Instagram</Text>
        </Pressable>
        <Pressable onPress={() => Linking.openURL(SCHOOL.socials.youtube)}>
          <Text style={styles.link}>▶️ YouTube</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2F6CD4',
    marginBottom: 30,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  text: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
  },
  link: {
    fontSize: 15,
    color: '#2F6CD4',
    marginTop: 4,
  },
});
