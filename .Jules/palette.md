## 2024-05-18 - Added accessibility labels to icon-only buttons
**Learning:** Found multiple Pressable elements used as icon-only buttons in `GlobalSearch.jsx` missing `accessibilityRole="button"` and `accessibilityLabel` attributes. These are critical for screen reader users to understand the functionality of the icons.
**Action:** Always verify that interactive icon-only components have proper accessibility roles and labels for screen readers.
## 2024-05-18 - Improved touch targets for icon-only buttons
**Learning:** Icon-only close buttons in modals/sheets were missing `hitSlop` padding, making them difficult to tap on mobile devices.
**Action:** Add `hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}` to small interactive elements to ensure a comfortable minimum touch target size (44x44px).
## $(date +%Y-%m-%d) - Adding HitSlops to Icon-only Buttons
**Learning:** Found missing `hitSlop` attributes on small icon-only buttons in the UI, making them harder to tap. Added `hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}` to ensure comfortable touch targets on mobile.
**Action:** When adding or updating small interactive elements, proactively verify and add `hitSlop` to achieve minimum standard touch targets.
