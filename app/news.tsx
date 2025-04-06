import { View, Text, FlatList, StyleSheet } from 'react-native';

type NewsItem = {
  id: string;
  date: string;
  title: string;
};

export default function NewsScreen() {
  const news: NewsItem[] = []; // define empty list with correct type

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Latest News</Text>
      <FlatList
        data={news}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.empty}>No news available</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.date}>{item.date}</Text>
            <Text style={styles.text}>{item.title}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, color: '#2F6CD4' },
  item: { marginBottom: 16 },
  date: { fontSize: 14, color: '#888' },
  text: { fontSize: 18, fontWeight: '500', color: '#333' },
  empty: { fontSize: 16, color: '#666', marginTop: 10 },
});
