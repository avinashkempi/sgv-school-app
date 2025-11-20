# Testing Guide - UI/UX Improvements

## 🧪 Comprehensive Testing Checklist

---

## Phase 1: Light Mode Testing

### Navigation (Bottom Tab Bar)
- [ ] All 5 navigation items visible
- [ ] Icons appear in dark/medium gray
- [ ] Active tab shows blue icon
- [ ] Tab labels readable and visible
- [ ] Transitions smooth between tabs

### Home Page
- [ ] Page title visible and properly spaced
- [ ] Cards have proper spacing (20px bottom margin)
- [ ] Text not overlapping
- [ ] Icons aligned properly with text

### Events Page
- [ ] Calendar displays correctly
- [ ] Event cards show title, description, badge
- [ ] Edit/Delete buttons are visible and tappable (44px+)
- [ ] Add Event button uses blue button style
- [ ] Date displays correctly
- [ ] School Event badge visible with gold color

### News Page
- [ ] Add News button visible (top-left)
- [ ] News cards show date badge, title, description
- [ ] Private lock icon visible for private news
- [ ] Edit/Delete buttons visible and properly spaced
- [ ] Link shows correctly with emoji indicator
- [ ] Pagination buttons properly styled

### Admin Dashboard
- [ ] "Admin Dashboard" header properly sized
- [ ] Search bar has "Search Users" label
- [ ] Search bar placeholder clear
- [ ] User cards show: Name, Email, Phone, Role (in order)
- [ ] Phone displays with emoji (📱)
- [ ] Role badges colored correctly (different colors per role)
- [ ] Badge text readable (white on colored background)
- [ ] Edit button (blue) and Delete button (red) properly spaced (12px gap)
- [ ] Pagination buttons: Previous, Page X/Y, Next
- [ ] Disabled pagination button (gray) when at first/last page

### Login Page
- [ ] "Login" header visible
- [ ] "Phone Number" label above field
- [ ] Phone input field properly styled
- [ ] "Password" label above field
- [ ] Password input field properly styled
- [ ] Login button is large, blue, full-width
- [ ] Text input focus doesn't break layout

### Profile Page
- [ ] User avatar visible (if logged in)
- [ ] User name displays properly
- [ ] Logout button: large, blue, full-width (if logged in)
- [ ] OR Login button: large, blue, full-width (if not logged in)
- [ ] Theme toggle button: secondary style, shows current mode
- [ ] Menu items properly spaced
- [ ] Social icons visible at bottom

### About & Contact Pages
- [ ] Similar spacing and styling as home page
- [ ] Cards properly formatted
- [ ] All text readable

---

## Phase 2: Dark Mode Testing

### Navigation (Bottom Tab Bar) **[CRITICAL]**
- [ ] All 5 navigation items visible **[This was broken before]**
- [ ] Icons appear in light gray (NOT black)
- [ ] Active tab shows light blue
- [ ] All labels readable in dark background
- [ ] No icons disappearing

### Theme Toggle
- [ ] Can toggle from light to dark mode
- [ ] Theme changes across entire app
- [ ] Text colors update appropriately
- [ ] Card backgrounds change to dark shade
- [ ] Input fields change background color
- [ ] No text becomes invisible

### Dark Mode Text Colors
- [ ] Main text (textPrimary) visible: light gray
- [ ] Secondary text (textSecondary) visible: medium gray (not too dark)
- [ ] Links show in light blue
- [ ] Buttons text remains white and readable

### Dark Mode Buttons
- [ ] Blue buttons remain visible
- [ ] Red/error buttons remain visible
- [ ] Secondary buttons have visible border
- [ ] All button text readable

### Dark Mode Cards
- [ ] Card backgrounds dark (not same as page background)
- [ ] Left border accent visible
- [ ] Text readable on card background
- [ ] No text on card is too dim

### Dark Mode Forms
- [ ] Form field borders visible
- [ ] Input text visible
- [ ] Placeholder text visible but lighter
- [ ] Label text readable
- [ ] Focus state border visible

### Dark Mode Badges
- [ ] Role badges readable (white text on color)
- [ ] Date badges readable (white text on color)
- [ ] Private lock icon visible

---

## Phase 3: Interaction Testing

### Button Interactions
- [ ] All buttons are tappable (44x44px minimum)
- [ ] Button press provides visual feedback
- [ ] Disabled buttons appear grayed out
- [ ] Buttons don't overlap with other elements

### Form Interactions
- [ ] Focus on input shows border highlight
- [ ] Can type in all input fields
- [ ] Multiline inputs (description) expand properly
- [ ] Password visibility toggle works
- [ ] Can scroll form if needed

### Modal/Dialog Testing

#### Event Modal
- [ ] Opens when Add Event clicked
- [ ] Date displays correctly
- [ ] Can enter title
- [ ] Can enter description
- [ ] School Event checkbox works
- [ ] Create button functional
- [ ] Close button works
- [ ] Modal properly centered

#### News Modal
- [ ] Opens when Add News clicked
- [ ] Can enter title
- [ ] Can enter description
- [ ] Can enter URL
- [ ] Private News checkbox works
- [ ] Create button functional
- [ ] Close button works

#### Admin User Modal
- [ ] Opens when Add User clicked
- [ ] All form fields visible
- [ ] Can enter Name, Phone, Email, Password
- [ ] Password visibility toggle works
- [ ] Role selection buttons work (5 options)
- [ ] Create button functional
- [ ] Close button works

### Navigation
- [ ] Can navigate between all tabs
- [ ] Smooth transitions between screens
- [ ] No crashes on navigation
- [ ] Data persists when navigating away and back

### Pagination
- [ ] Previous button disabled on first page
- [ ] Next button disabled on last page
- [ ] Can navigate between pages
- [ ] Correct users shown on each page

### Search Functionality
- [ ] Search filters by name
- [ ] Search filters by email
- [ ] Search filters by phone
- [ ] Search filters by role
- [ ] Search case-insensitive
- [ ] Real-time filtering works

---

## Phase 4: Responsive Testing

### Small Phones (iPhone SE - 375px width)
- [ ] All content fits on screen
- [ ] No horizontal scrolling needed
- [ ] Buttons still tappable (44px minimum)
- [ ] Text not truncated unexpectedly
- [ ] Forms not cramped

### Regular Phones (iPhone 12 - 390px width)
- [ ] Standard experience
- [ ] All tests from Phase 1-3 pass
- [ ] No issues with spacing

### Large Phones (iPhone 14 Plus - 430px width)
- [ ] Content properly distributed
- [ ] Spacing looks balanced
- [ ] Not too much whitespace

### Tablets/Landscape
- [ ] Content doesn't stretch too much
- [ ] Layout remains usable
- [ ] No overflow issues

---

## Phase 5: Accessibility Testing

### Color Contrast (WCAG AA)
- [ ] Text on light backgrounds: Contrast ≥ 4.5:1
- [ ] Text on dark backgrounds: Contrast ≥ 4.5:1
- [ ] Use contrast checker online for specific colors

Colors to verify:
- [ ] Primary text (#333) on light background (#f7f8fc)
- [ ] Secondary text (#555) on light background
- [ ] Primary text (#E6EDF3) on dark background (#0D1117)
- [ ] Secondary text (#A8B1BA) on dark background
- [ ] White text (#fff) on primary blue (#2F6CD4)

### Touch Targets
- [ ] All buttons at least 44x44px
- [ ] Edit/Delete buttons 44px+
- [ ] Pagination buttons 44px+
- [ ] Tab navigation items tappable
- [ ] Menu items easily tappable

### Text Sizing
- [ ] No text smaller than 13px (body text)
- [ ] Labels at least 14px
- [ ] Headings at least 22px
- [ ] Can still read at default system size

### Keyboard Navigation (if applicable)
- [ ] Can navigate between form fields with tab
- [ ] Focus is visible on all interactive elements
- [ ] Can submit forms with keyboard

### Screen Reader Testing (VoiceOver/TalkBack)
- [ ] Page titles announced clearly
- [ ] Form labels associated with inputs
- [ ] Buttons announce purpose clearly
- [ ] Images have alt text (if any)

---

## Phase 6: Performance Testing

### Load Times
- [ ] Home page loads quickly
- [ ] Navigation between tabs is smooth (no lag)
- [ ] Modals open immediately
- [ ] Search results appear instantly

### Animations
- [ ] Tab transitions smooth (not stuttering)
- [ ] No animation jank
- [ ] 60fps animations (no visible frame drops)

### Memory
- [ ] App doesn't crash after heavy use
- [ ] Navigating repeatedly doesn't cause issues
- [ ] Opening/closing modals multiple times works

---

## Phase 7: Specific Feature Testing

### Admin Dashboard
- [ ] Add User button creates user
- [ ] Edit button opens modal with current data
- [ ] Delete button removes user
- [ ] Pagination works correctly
- [ ] Search filters all fields

### Events
- [ ] Can create event with all fields
- [ ] School Event checkbox toggles correctly
- [ ] Can edit existing event
- [ ] Can delete event with confirmation
- [ ] Calendar displays correctly

### News
- [ ] Can create news item
- [ ] Private toggle works
- [ ] Can edit news
- [ ] Can delete news with confirmation
- [ ] Private items have lock icon

### Authentication
- [ ] Login works with valid credentials
- [ ] Invalid credentials show error
- [ ] Session persists after logout/login
- [ ] Admin features only visible when logged in as admin

---

## Phase 8: Cross-Browser/Device Testing

### iOS Devices
- [ ] iPhone 12 Mini (375px)
- [ ] iPhone 12 (390px)
- [ ] iPhone 12 Pro Max (428px)
- [ ] iPad (if available)

### Android Devices
- [ ] Google Pixel 4a (390px)
- [ ] Samsung Galaxy S21 (360px)
- [ ] Larger device (640px+)

### Operating Systems
- [ ] iOS latest version
- [ ] iOS 1-2 versions back (if possible)
- [ ] Android latest version
- [ ] Android 1-2 versions back (if possible)

---

## Common Issues to Watch For

### ⚠️ Dark Mode Issues
- [ ] Text invisible (too dark on dark background)
- [ ] Navigation icons missing
- [ ] Buttons unreadable
- [ ] Form fields don't stand out

### ⚠️ Spacing Issues
- [ ] Text overlapping buttons
- [ ] Buttons too close together
- [ ] Cards cramped together
- [ ] Form fields too tight

### ⚠️ Touch Target Issues
- [ ] Buttons smaller than 44px (check inspector)
- [ ] Hard to tap pagination buttons
- [ ] Hard to tap edit/delete buttons
- [ ] Tab navigation hard to select

### ⚠️ Typography Issues
- [ ] Mixed fonts (not all Lora)
- [ ] Text size inconsistent
- [ ] Text truncation in unexpected places
- [ ] Labels not visible

### ⚠️ Color Issues
- [ ] Hardcoded colors visible
- [ ] Contrast issues (test with contrast checker)
- [ ] Colors don't match between pages
- [ ] Badge text unreadable

### ⚠️ Form Issues
- [ ] Focus state not visible
- [ ] Required fields not marked
- [ ] Error messages missing
- [ ] Form fields cramped

---

## Test Report Template

```
App: SGV School App
Date: [Date]
Tester: [Name]
Device: [iPhone 12, Pixel 5a, etc.]
OS Version: [iOS 15.2, Android 12, etc.]
Theme: [Light / Dark / Both]

PASSED TESTS: [Count]
FAILED TESTS: [Count]
ISSUES FOUND: [Count]

Issues Found:
1. [Issue Description] - Severity: [Critical/High/Medium/Low]
2. [Issue Description] - Severity: [Critical/High/Medium/Low]

Screenshots: [Attach before/after if applicable]
```

---

## Sign-Off Criteria

All of the following must be true before marking as complete:

✅ No critical issues remain  
✅ All buttons 44x44px minimum  
✅ Navigation fully functional in both themes  
✅ All text meets WCAG AA contrast  
✅ Form fields properly spaced (16px between)  
✅ All buttons use theme styles  
✅ No hardcoded colors visible  
✅ Dark mode fully tested and working  
✅ Touch targets verified on real device  
✅ Performance acceptable (no jank/lag)  
✅ Responsive on multiple screen sizes  
✅ No unexpected text truncation  
✅ Modals open/close properly  
✅ Search functions correctly  
✅ All pages load without errors  

---

## Quick Test Command

For rapid testing, check:

### Light Mode Quick Test (5 min)
1. Open app in light mode
2. Navigate all 5 tabs
3. Click buttons in each tab
4. Verify text is readable
5. Check colors look consistent

### Dark Mode Quick Test (5 min)
1. Toggle to dark mode
2. Navigate all 5 tabs
3. Check navigation icons visible
4. Verify text is readable
5. Check form fields stand out

### Button Quick Test (2 min)
1. Open admin page
2. Check all button sizes visually
3. Try tapping all buttons
4. Verify 44px minimum using inspector

### Spacing Quick Test (2 min)
1. Check form field spacing (should be 16px)
2. Check button gaps (should be 12px)
3. Check card spacing (should be 16px)
4. Check no text overlap

---

## Automated Testing (Optional)

Consider adding tests for:
- Button sizes (minimum 44px)
- Color contrast ratios
- Text truncation with numberOfLines
- Theme color usage (no hardcoded colors)
- Spacing consistency
- Dark mode functionality

---

**Testing Status**: Ready for QA  
**Last Updated**: November 20, 2025  
**Test Lead**: [Name]  
**Sign-Off Date**: [Date]
