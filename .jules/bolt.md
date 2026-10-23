## 2024-05-24 - Unmemoized flatMap inside functional components
**Learning:** Found several places where expensive array operations like `flatMap` were placed directly in the main render body or unmemoized variables, causing reference equality to break on every render. This was specifically pointed out in memory as a codebase performance anti-pattern.
**Action:** Wrap these derivations in `useMemo` so that the result is referentially stable across re-renders.
