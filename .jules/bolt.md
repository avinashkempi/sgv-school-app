## 2024-05-24 - React Native FlatList Bottleneck
**Learning:** React Native's `FlatList` can become a significant performance bottleneck for complex items like social media feeds (`VibeCard`) due to its lack of view recycling. Using `@shopify/flash-list` is a critical and simple optimization for these scenarios if it is already installed.
**Action:** When working with large lists or feeds in React Native apps, prioritize using `FlashList` over `FlatList`. Ensure to add an `estimatedItemSize` based on the largest or typical item height for optimal view recycling.
