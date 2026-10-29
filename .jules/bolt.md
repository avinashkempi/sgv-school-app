## 2024-10-18 - Avoid StyleSheet.create inside functional components\n**Learning:** In React Native, defining `StyleSheet.create` inside a functional component will cause the style object to be recreated and re-evaluated on every render. This creates unnecessary allocations and can hurt performance.\n**Action:** Use `useMemo` to memoize dynamic styles created via `StyleSheet.create`, or move static styles outside of the component. If the styles depend on theme/context variables, `useMemo` is the best choice.

## 2024-10-31 - Memoizing array reductions in React
**Learning:** Performing multiple iterations over large arrays (like `map` and `forEach`) within the render path causes severe performance hits, especially with multiple dashboard cards re-rendering on scroll.
**Action:** When a functional component must perform data aggregation using array iterations (e.g. constructing a Map), wrap it in a `useMemo` hook with proper dependency mapping to avoid recalculations.
