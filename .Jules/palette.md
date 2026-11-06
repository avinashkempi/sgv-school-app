## 2024-05-18 - Added accessibility labels to icon-only buttons
**Learning:** Found multiple Pressable elements used as icon-only buttons in `GlobalSearch.jsx` missing `accessibilityRole="button"` and `accessibilityLabel` attributes. These are critical for screen reader users to understand the functionality of the icons.
**Action:** Always verify that interactive icon-only components have proper accessibility roles and labels for screen readers.
## 2024-05-18 - Improved touch targets for icon-only buttons
**Learning:** Icon-only close buttons in modals/sheets were missing `hitSlop` padding, making them difficult to tap on mobile devices.
**Action:** Add `hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}` to small interactive elements to ensure a comfortable minimum touch target size (44x44px).
## 2024-06-25 - Found missing accessibility attributes in NotificationCenter
**Learning:** Even in central feature components like NotificationCenter, accessibility attributes (`accessibilityRole="button"`, `accessibilityLabel`) and `hitSlop` are often missed on icon-only \`Pressable\` elements like action buttons (mark read, archive) and settings toggles.
**Action:** When working on new or existing components with interactive icons, consistently apply accessibility roles, descriptive labels, and `hitSlop` to ensure a robust and accessible experience for all users.
