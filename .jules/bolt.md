## 2024-05-15 - [TeacherDashboard Optimization]
**Learning:** Performing expensive array computations, such as instantiating multiple Date objects and string manipulations, directly within the render loop (specifically inside a `map` callback) causes unnecessary recalculations and degrades performance during re-renders.
**Action:** Always wrap complex derivations and expensive calculations over state data in a `useMemo` hook to preserve referential equality and avoid recalculations when the source data hasn't changed.
