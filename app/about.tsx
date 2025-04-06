import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SCHOOL } from '../constants/basic-info';

export default function About() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{SCHOOL.name}</Text>

      <View style={styles.section}>
        <Text style={styles.label}>🏫 Branches</Text>
        <Text style={styles.text}>
          1. Renuka Nagar, Mangasuli – Kindergarten to 8th Standard (9th and 10th opening soon).
        </Text>
        <Text style={styles.text}>
          2. Ugar Khurd – Only Kindergarten.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>🎯 Our Mission</Text>
        <Text style={styles.text}>{SCHOOL.mission}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>🏫 About Us</Text>
        <Text style={styles.text}>{SCHOOL.about}</Text>
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
});
