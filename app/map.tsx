import { View, Text, Button, Linking, StyleSheet } from 'react-native';
import { SCHOOL } from '../constants/basic-info';

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>School Location</Text>
      <View style={styles.mapPlaceholder}>
        <Text>📍 {SCHOOL.name}</Text>
      </View>
      <Button title="Open in Google Maps" onPress={() => Linking.openURL(SCHOOL.mapUrl)} />
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  mapPlaceholder: {
    height: 200,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
});
