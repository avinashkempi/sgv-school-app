## 2024-05-18 - Added accessibility labels to icon-only buttons
**Learning:** Found multiple Pressable elements used as icon-only buttons in `GlobalSearch.jsx` missing `accessibilityRole="button"` and `accessibilityLabel` attributes. These are critical for screen reader users to understand the functionality of the icons.
**Action:** Always verify that interactive icon-only components have proper accessibility roles and labels for screen readers.
## 2024-05-19 - Added accessibility labels to icon-only modal close button
**Learning:** Found a `TouchableOpacity` element used as an icon-only close button in `ReportCardExportModal.jsx` missing `accessibilityRole="button"` and `accessibilityLabel` attributes. These are critical for screen reader users to understand the functionality of the close icon.
**Action:** Always verify that interactive icon-only components in modals and overlays have proper accessibility roles and labels for screen readers.
