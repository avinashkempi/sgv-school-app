## 2025-01-20 - Optimized Unmemoized Array Operations for Referentail Equality

**Learning:** Unmemoized array manipulations like `flatMap` or `filter` on every render can cause performance bottlenecks and break referential equality, which in turn leads to unnecessary re-renders in components like `FlatList`.

**Action:** Wrap these operations with `useMemo` to maintain referential equality across renders, ensuring child components only update when the underlying source data changes.
