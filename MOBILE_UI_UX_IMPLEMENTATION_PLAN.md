# SGV School Mobile UI/UX Implementation Plan

**Source:** [MOBILE_UI_UX_AUDIT.md](./MOBILE_UI_UX_AUDIT.md)  
**Scope:** Expo Router app in `Frontend/` (64 route files, role-based Student/Teacher/Admin/Super Admin flows, shared components and themes).  
**Goal:** Resolve the observed issues, standardize the system, and verify the full product well enough to target a provisional review score of **95/100 or higher**. A 100/100 score is an aspiration, not something implementation can guarantee before cross-device and assistive-technology review.

## 1. Product direction and decisions to lock first

These decisions prevent parallel screens from continuing to diverge.

| Decision | Recommendation | Reason / consequence |
|---|---|---|
| Color identity | Remove the SGV orange/blue brand palette completely. Adopt an unbranded modern indigo–teal–violet system with cool neutral surfaces: light primary `#4F46E5`, secondary `#0F766E`, tertiary accent `#6D28D9`; dark-mode primaries use accessible lighter tints. Keep the school name and logo as identity; do not introduce replacement “brand color” aliases. | This gives the product a fresh, calm education/technology feel while retaining clear action hierarchy. White on the proposed light primary is 6.29:1, white on secondary is 5.47:1, and dark foreground on the proposed light primary in dark mode is 8.02:1. These pairings exceed 4.5:1 for normal text; all containers/status combinations still need a token-level contrast check. |
| UI typeface | Retain DM Sans as the single interface family for body, forms, navigation, tables, metrics, and headings. Use the school’s actual logo/wordmark for identity. Document this as a deliberate choice over Quicksand; do not load a second family unless a brand review demonstrates a clear benefit. | DM Sans is already bundled, legible for dense operational data, and avoids mixed-font drift. |
| Hierarchy | Use one compact, predictable type ramp with semibold for most hierarchy and bold reserved for page titles and key metrics. | Reduces the current risk that every dashboard element competes for attention. |
| Density | Optimize for fast scanning and reliable actions, not for showing the maximum number of metrics. Use plain section groupings first, cards only where they express a meaningful group or action. | Prevents nested cards and dense dashboards from making the app look dated. |
| Navigation | Keep a role-aware bottom bar with no more than five frequent destinations. Move less-used admin/configuration routes into the menu. Confirm the final set with representative parents, students, teachers, and administrators before changing labels or tab membership. | Persistent tabs should represent destinations used frequently, not a shortcut for every feature. |
| Platform | Share design tokens and content hierarchy, while respecting native safe areas, back behavior, keyboards, date pickers, and modal presentation on iOS and Android. | Web-preview success cannot establish native conformance. |
| Motion | Keep quick press/selection feedback and meaningful transitions. Honor reduced-motion settings and avoid decorative motion. | Preserves feedback while making motion purposeful and accessible. |

## 2. Implementation sequence

### Phase 0 — Establish the baseline and close coverage gaps

**Purpose:** Turn the current partial visual audit into a repeatable baseline before broad redesign.

1. Prepare stable preview data and role accounts/fixtures for student, teacher, admin, and super admin. Ensure the preview works without production credentials or live school data.
2. Confirm build/run paths for web, iOS simulator/device, and Android emulator/device. Record unavailable platforms rather than marking them passed.
3. Create a route matrix from Expo Router for all 64 routes, including required role, entry route, major actions, modals, and parent/back behavior. Add any notification-only or parameterized routes discovered in navigation calls.
4. Capture baseline light and dark screenshots for all routes that can be rendered, at 320, 360, 390, 430 CSS/dp widths and one tablet width. Include at least one large-text pass and portrait/landscape where supported.
5. For each important route, capture loading, populated, empty, error, offline, partial-data, refreshing, success, disabled, and submitting states where applicable. Do not infer a settled screen from a spinner or skeleton.
6. Inspect current component use before altering shared controls. Record which compact buttons live inside a larger touch row and which icon controls have route-specific labels.

**Deliverable:** A reproducible screen/state/device matrix with owner, status, screenshot, and issue links. Establish before-state references for the current Home timetable, tab bar, login, menu, and role dashboards.

**Exit gate:** All routes have an owner and purpose; every critical workflow can be entered in preview; native platform gaps are named.

### Phase 1 — Define and implement the foundation

**Primary files:** `Frontend/constants/colors.js`, `typography.js`, `spacing.js`, `shadows.js`, `animations.js`, `Frontend/theme.js`, `Frontend/app/_layout.jsx`, plus all app/component references found by searching color tokens and hex values.

1. **Remove old colors from code completely:** Delete the entire `SGV_BRAND` color export and all `brand*` color compatibility tokens (including orange, blue, purple, green, and their light/container aliases) from `Frontend/constants/colors.js`, `theme.js`, and other source. Migrate consumers to semantic roles such as `primary`, `secondary`, `success`, `warning`, `error`, `info`, and `surface`. Search the entire frontend source for `#FF5E1C`, `#2F6CD4`, `brandOrange`, `brandBlue`, `brandPurple`, and other `brand*` color references; replace UI use with the new semantic token that matches its purpose. Do not retain old values as hidden fallbacks, gradients, focus glows, illustrations, or demo-banner accents. Inspect the app icon, adaptive icon, splash, favicon, and school logo and record any palette mismatch as a suggested asset change only. Do not edit or replace these files; asset updates remain for the owner.
2. **Color roles:** Use light `primary #4F46E5` / `onPrimary #FFFFFF`, `secondary #0F766E` / `onSecondary #FFFFFF`, and `tertiary #6D28D9` / `onTertiary #FFFFFF`. Pair soft containers with dark readable foregrounds. Use `#F8FAFC` background, `#FFFFFF` surface, `#F1F5F9` raised surface, `#0F172A` primary text, `#475569` secondary text, and `#CBD5E1` borders as initial neutral candidates. Keep semantic success, warning, error, and info distinct from these identity accents and never use color alone for state.
3. **Dark mode:** Define an intentional dark palette: `#0B1220` background, `#111827` surface, `#1E293B` raised surface, `#F1F5F9` primary text, `#CBD5E1` secondary text, and `#334155` border. Use lighter accessible accents such as `#A5B4FC` (indigo), `#5EEAD4` (teal), and `#C4B5FD` (violet) with dark on-colors. Review every token pair and component in dark mode; do not invert the light palette.
4. **Typography:** Make DM Sans the documented UI family. Consolidate presets to display 30/36, H1 24/30, H2 20/26, H3 18/24, body-large 16/24, body 14/20, supporting text 13/18, caption 12/18. Restrict 11 px to optional, nonessential metadata; never use it for instructions, primary status, or actions. Preserve text scaling and allow labels to wrap.
5. **Spacing:** Make the base scale 4, 8, 12, 16, 20, 24, 32, 40. Keep named layout aliases only where they add meaning and point them to scale values. Retain 2 px for optical alignment. Standardize default phone gutters at 16–20, card inset 16, section gap 24, form-field gap 16, and header-to-content gap 16–20.
6. **Shape and elevation:** Keep a restrained radius system (8, 12, 16, 24, pill) and use border/tonal surfaces before shadows. Reserve elevation for overlays and elements that truly float.
7. **Motion:** Centralize short durations/easing, add a reduced-motion path, and use the system consistently across press feedback, sheets, and navigation.
8. Remove misleading “strict single source of truth” claims where literal local styles still exist. Document semantic roles, accessibility contrast intent, and examples in a short design-system reference.

**Exit gate:** Both themes pass token contrast review for text, controls, status, disabled and focus states. Searches show no remaining old orange/blue values or `brand*` color aliases in app source and styles. Any image/icon/splash/logo mismatch is listed as an owner-handled suggestion. The new palette and DM Sans policy are documented.

### Phase 2 — Standardize shared components before screen-by-screen restyling

**Primary files:** `components/Button.jsx`, `TextInput.jsx`, `Header.jsx`, `BottomNavigation.jsx`, `ui/AppText.jsx`, `ui/AppBottomSheet.jsx`, `ui/Badge.jsx`, `StateComponents.jsx`, `ToastProvider.jsx`, `Card.jsx`, `ui/Divider.jsx`, `ui/ProgressBar.jsx`.

- **Buttons:** Establish filled primary (48 px), tonal/outlined secondary (48 px), tertiary text action (minimum 44 px hit area), destructive, and icon-button recipes. Keep the existing 40 px small recipe only inside table/list rows whose complete press area is at least 44–48 px. Standardize icon alignment, loading spinner placement, disabled contrast, pressed/focus feedback, `accessibilityRole`, action-specific label, and duplicate-submit prevention.
- **Inputs:** Keep a 48–56 px field, persistent visible label, 16 px horizontal inset, consistent 12 px radius, clear focus indicator, linked helper/error, and readable disabled state. Ensure `TextInput` errors are announced and associated with the field. Give password visibility controls “Show password” / “Hide password” names and report their state.
- **Headers:** Standardize safe-area inset, back target, title wrapping, action placement, scroll/sticky behavior, and spacing across route families. Long titles must not collide with right actions.
- **Navigation:** Set tab item hit areas to at least 48 px, keep icon and text selected states legible in both themes, provide a clear selected semantic state, and preserve safe-area bottom padding. Use consistent active/inactive icon treatments from the Material icon family already in use.
- **Cards and sections:** Define one base card and a small number of intentional variants. Use neutral surfaces with restrained indigo/teal/violet emphasis. Avoid cards inside cards; use section headings and dividers for simple content. Standardize card padding, border, radius, and title spacing.
- **State components:** Give loading, empty, error, offline, partial data, and success states one consistent layout and action vocabulary. Every error has a human explanation and retry/next action when recovery is possible. Avoid blank states and unexplained spinners.
- **Feedback:** Toasts/snackbars must not be the only place that critical form errors or successful destructive/financial actions are communicated. Use inline status for persistent outcomes.
- **Duplicate components:** Compare `components/StatCard.jsx` with `components/dashboard/StatCard.jsx`, and `components/YearSelector.jsx` with `components/academic-year/YearSelector.jsx`. Consolidate only if behavior is equivalent; otherwise name the variants and share their visual primitives.

**Exit gate:** Shared component examples render correctly in light/dark themes, normal/large text, keyboard and screen-reader contexts. No screen should need one-off styling to reproduce a standard button, field, card, header, or state.

### Phase 3 — Fix the verified layout defect and highest-risk workflows

**Home timetable:** `components/home/TodayScheduleHero.jsx`, `TodayTimetableCard.jsx`, and the student/teacher timetable routes.

- Rebuild each schedule row as a width-aware layout: fixed time column sized to keep the chosen time format together; flexible subject column; optional teacher/class metadata on a second line; end time only where it adds value. Use `minWidth: 0`, controlled flex shrink, explicit `numberOfLines` only where truncation is safe, and a stable active-period marker.
- At 320–360 widths, preserve readability by moving teacher details below the subject or omitting duplicate details with a route to full timetable. Never solve clipping by reducing font size.
- Localize time/date formatting and avoid US-only `toLocaleDateString` defaults when the school locale requires another convention.

**Priority operations:** `/teacher/class/attendance`, `/teacher/marks-entry`, `/teacher/exam/enter-marks`, `/teacher/leaves`, `/student/fees`, `/admin/fees`, `/complaints/raise`, `/complaints/give-feedback`, and `/admin/send-notification`.

- Make the current class/student/exam/recipient context visible while users enter data.
- Use explicit field labels, correct keyboard types, predictable focus order, keyboard avoidance, inline actionable validation, save/submission progress, duplicate-submit prevention, and a persistent success/failure result.
- For attendance and marks, keep student names and controls aligned at narrow widths, provide clear selected/present/absent/modified states with text or symbols as well as color, and protect bulk/destructive actions with review/undo where appropriate.
- For fees and complaints, clarify amounts/status, who can see a submission, and next steps; ensure notifications do not expose sensitive content unexpectedly.

**Exit gate:** No critical flow loses context, clips an actionable control, or can silently fail. Screen-level validation and outcome messages are understandable without color or toast timing.

### Phase 4 — Roll out the design system through all 64 routes

Migrate by role and task family, not by isolated CSS cleanup. For each route, record purpose, dominant user question, primary action, secondary actions, content priority, state set, and validation result.

1. **Authentication and onboarding:** `/onboarding`, `/login`. Reduce decorative competing elements; make school identity, sign-in action, recovery contact, and demo access hierarchy explicit. Check keyboard and password behavior.
2. **Shared shell and navigation:** `/`, `/menu`, `/profile`, `/notifications`, `/events`, `/requests`, `/history`, `/subjects`, `/vibes`, complaint routes. Align page gutters, headers, empty/loading/error patterns, and route naming. Keep lower-frequency features discoverable in the menu.
3. **Student:** all `/student/*` routes plus `/shared/class-reports`. Prioritize schedule, attendance, fees, exam dates, report-card comprehension, subject content and leaves. Reduce KPI competition; explain grade/attendance semantics and provide full values in accessible output.
4. **Teacher:** all `/teacher/*` routes. Prioritize class context, attendance, marks entry, timetable, exams, ratings, and leave decisions. Support one-handed repeated entry, long student names, keyboard transitions, and safe bulk submission. Keep analytical charts secondary to actionable class data.
5. **Admin:** all `/admin/*` routes. Separate frequent school operations (attendance, leave, fees, class/timetable management, notifications) from configuration and analytics. On narrow screens, render data as readable records or intentionally scrollable comparison tables with visible context; do not compress columns into illegible text.
6. **Super Admin:** all `/super-admin/*` routes. Make year selection, transition impact, irreversible steps, progress, validation, and rollback/confirmation explicit. The transition wizard must communicate current step and what changes before commit.
7. **Media and social:** `/vibes`, Vibe components, class attachment viewer and post flows. Standardize image ratios/cropping, loading placeholders, playback controls, captions/descriptions, moderation state, and media actions. Do not render decorative overlays over essential controls.

Across each family, remove obsolete local color, spacing, radius, and typography literals where a token exists. Search and replace every old orange/blue value or `brand*` color alias, including hard-coded use outside the token file. Keep genuine one-off values only with an optical/layout reason. Standardize equivalent card, list, badge, chart, form, dialog, sheet, and section patterns. Avoid adding gradients, blur, shadows, or animations as a substitute for hierarchy.

**Exit gate:** Every route in the 64-route inventory has a completed visual/source review, owner, purpose, responsive decision, and state coverage. There are no placeholder `N/V` scores left for routes in the supported product matrix.

### Phase 5 — Accessibility and content quality pass

Apply WCAG 2.2 AA as a reference together with VoiceOver and TalkBack behavior.

- Audit every icon-only Pressable, custom control, chart, tab, state illustration, and clickable card for an accessible role/name/state/hint where useful. Replace generic fallbacks such as “Field action” with the actual action.
- Check touch bounds and spacing for all high-frequency controls; use at least 44 × 44 points as the product baseline and avoid adjacent targets that overlap.
- Verify screen-reader order follows visual reading order. Announce form errors, loading completion, saved/submitted outcomes, tab selection, modal open/close, and meaningful updates without repeatedly announcing decorative content.
- Test VoiceOver and TalkBack at standard speed and with switch/keyboard navigation where applicable. Verify bottom-sheet focus entry/return and modal dismissal.
- Test text scaling to at least 200% where the platform supports it. Replace hard heights, fixed-width assumptions, and line clamping that hide required data. Use wrapping or scrolling before reducing type size.
- Check text, icon, border, focus, and disabled contrast in both themes. Status must not depend on hue alone. Provide chart summary plus accessible underlying values.
- Review all visible copy for plain, consistent terms: “Class” vs “Learning,” “Leave” vs “Request,” “Submit” context, action outcomes, date/number formats, and school-specific vocabulary. Errors explain what happened and how to fix it.
- Respect reduced-motion preferences in Reanimated interactions, animated numbers, skeletons, transitions and media behavior.

**Exit gate:** No known critical accessibility blockers; every route has been checked with screen reader and enlarged text at least once per shared layout family, with route-specific exceptions individually verified.

### Phase 6 — Native, responsive, interaction and performance validation

- Test on current iOS and Android targets with small, standard, and large phones. Include 320/360/390/430 widths, notches/cutouts, gesture bars, landscape where supported, and one tablet because `supportsTablet` is enabled.
- Verify iOS back swipe, Android system back, nested stack return behavior, tab reselect/scroll-to-top, deep links and notification routing, modal swipe/dismissal, status/navigation bars, and safe-area padding.
- Open the keyboard on every form family: sign in, complaint/feedback, mark entry, data import, exam creation, notification composition, search and profile edits. Confirm fields/actions remain reachable and keyboard types/capitalization are appropriate.
- Exercise press, selected, loading, disabled, focus, error, success, refreshing, offline and interrupted-network behavior. A loading state must prevent duplicate submissions and preserve entered data on recoverable failures.
- Profile perceived performance on Home, Vibes, analytics, report cards and large class lists. Verify list virtualization, image sizing/cache/placeholders, chart work, skeleton-to-content stability, and offline cache messaging. Optimize only demonstrated user-facing stalls.
- Confirm images/media have expected aspect ratios, cropping and accessible descriptions; check splash/adaptive icons and onboarding at multiple display sizes.

**Exit gate:** No P0/P1 layout or interaction defects on supported devices; critical flows pass in both light and dark mode.

### Phase 7 — Final visual refinement and score review

1. Compare screenshots side by side with the approved design-system examples. Fix cross-screen drift in gutter, title, header action, button size, card inset, chip, list row, section rhythm, and bottom action placement.
2. Remove accidental nested containers, excess borders/shadows, oversized empty areas, inconsistent icon weights, tiny metadata that carries necessary information, and any leftover orange/blue styling from the former palette.
3. Check long school/student/teacher names, missing profile images, no timetable day, zero values, large totals, translated labels, date rollover, and unusually long content.
4. Re-run the complete 64-route scorecard. Each score must include route/device/theme/state and evidence; separate confirmed defects from likely risks and unverified behavior.
5. Publish a final change log with before/after captures and remaining known limitations. A screen is not “done” because its component was updated; the rendered screen and states must be rechecked.

## 3. Cross-screen irregularities to eliminate

- Leftover orange/blue colors, `SGV_BRAND`/`brand*` tokens, fallbacks, or asset treatments; and indigo/teal/violet values used outside their documented semantic roles.
- Screen-specific padding, button sizes, card radii, header alignments, icon sizes and hand-written typography that duplicate shared tokens.
- Dense screens where headings, cards, KPIs and controls have equal visual weight; nested cards and repeated heavy shadows.
- `numberOfLines` truncation of names, teacher labels, amounts, error instructions, dates or other decision-critical content.
- Tiny utility text used for action labels, statuses, required guidance or chart legends.
- Generic accessibility labels; unlabeled icon controls; status communicated only by color; custom charts without a spoken/text alternative.
- Blank, spinner-only, skeleton-only, or unhelpful empty/error screens without explanation, retry, or a clear next step.
- Small touch controls outside a larger tappable parent; visually obvious controls with no pressed/focused/disabled/loading state.
- Fixed-width tables/cards that fail at phone widths or become awkwardly sparse on tablets.
- Inconsistent back behavior, modal dismissal, current-tab indication, and route titles across role stacks.
- Unnecessary gradients, blur, elevated cards, animation, decorative icons, and saturation that add noise without improving hierarchy.

## 4. Proposed review scorecard

Use the same category set as the audit. These are target minimums for a 95+ review, not guaranteed results.

| Category | Target / 10 | Evidence required |
|---|---:|---|
| Visual Design | 9.5 | Shared system applied; no high-impact clipping or hierarchy defects in rendered routes. |
| UX | 9.5 | Critical student/teacher/admin workflows are clear, reversible where needed, and recover from errors. |
| Typography | 9.5 | DM Sans scale applied; large text and long labels verified without hidden content. |
| Spacing | 9.5 | Tokenized rhythm; no route-family drift or edge/safe-area collisions. |
| Accessibility | 9.5 | Contrast evidence, touch audit, VoiceOver/TalkBack and text scaling pass; no known severe barriers. |
| Navigation | 9.5 | Role-specific IA validated; back, tab, modal, notification and deep-link flows work. |
| Responsiveness | 9.5 | Supported phone/tablet sizes and orientations have screenshots and no high-priority overflow. |
| Consistency | 9.5 | Shared components/tokens cover equivalent controls and states across all roles. |
| Interaction Design | 9.5 | Press/focus/disabled/loading/result feedback is complete and restrained. |
| Performance UX | 9.0 | No observed major stalls, layout jumps, list lag or misleading offline state in representative data. |
| Platform Compliance | 9.5 | Current iOS/Android safe areas, gestures, keyboard, status/navigation bars and modal conventions verified. |
| Overall Modernity | 9.5 | Clear, restrained, professional product identity; trend effects do not replace usability. |

**Score discipline:** 95+ is defensible only when all 64 routes are reviewed, all P0/P1 findings are closed, critical state variants are exercised, and native accessibility/platform evidence exists. Keep an `N/V` result where tooling or account access prevents verification; do not convert it to a pass to meet the target. A 100/100 claim additionally requires exhaustive supported-device/state coverage and no remaining P2/P3 issues, which is unlikely to be provable from a finite review.

## 5. Delivery checklist

- [ ] `SGV_BRAND` and all `brand*` color aliases removed; old orange/blue styling absent from code; any needed icon/logo/splash changes are only suggested to the owner; new indigo/teal/violet palette signed off with contrast pairs documented.
- [ ] DM Sans and type scale documented; Quicksand expectation resolved.
- [ ] Tokens and both themes updated and reviewed.
- [ ] Shared buttons, fields, headers, navigation, cards, overlays and state components standardized.
- [ ] Home timetable is readable at 320–430 widths and teacher details remain available.
- [ ] High-risk attendance, marks, fees, leave, complaint and notification flows are accessible and recoverable.
- [ ] All 64 routes migrated and visually reviewed by role family.
- [ ] Loading, empty, error, offline, partial, success, refresh, disabled and submitting states reviewed where applicable.
- [ ] VoiceOver/TalkBack, 200% text scaling, contrast and touch targets reviewed.
- [ ] iOS, Android, phone, tablet, safe-area, keyboard, back/modal and dark-mode checks completed.
- [ ] Long names/content and missing/zero states reviewed; charts and media have accessible alternatives.
- [ ] Final scorecard includes evidence, screenshots and remaining limitations; no P0/P1 remains.
