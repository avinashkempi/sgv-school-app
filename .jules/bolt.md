
## 2024-05-18 - Unmemoized flatMap in FlatList breaks referential equality
**Learning:** In React Native, calculating a flattened list directly inside the component using `data?.pages?.flatMap(...)` without memoization causes the list reference to change on every render, which ruins `FlatList` performance and causes unnecessary re-renders.
**Action:** Use `useMemo` to memoize the array operations (like `flatMap`) before passing them to `FlatList`.
