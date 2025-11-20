# UI/UX Improvements - Quick Reference Guide

## 🎯 What Changed & Why

### Critical Fixes
1. **Dark Mode Icons** - Navigation icons are now visible in dark mode
2. **Font Consistency** - All text uses Lora font (no Quicksand mix)
3. **Color Contrast** - All text meets WCAG AA accessibility standards

### Major Improvements
- Better spacing consistency (16-24px between elements)
- Larger, easier-to-tap buttons (minimum 44x44px)
- Standardized form field design
- Improved visual hierarchy

---

## 🎨 Button Styles (Use These!)

### Primary Button (Full Width - Most Common)
```jsx
<Pressable style={[styles.buttonLarge, { width: "100%" }]}>
  <Text style={styles.buttonText}>Button Text</Text>
</Pressable>
```

### Small Button (Icon or Compact)
```jsx
<Pressable style={[styles.buttonSmall, { minWidth: 44 }]}>
  <MaterialIcons name="edit" size={18} color={colors.white} />
</Pressable>
```

### Secondary Button (Cancel/Alternative)
```jsx
<Pressable style={[styles.buttonSecondary, { width: "100%" }]}>
  <Text style={[styles.buttonText, { color: colors.textPrimary }]}>Cancel</Text>
</Pressable>
```

### Button with Icon + Text
```jsx
<Pressable style={[styles.buttonLarge, { flexDirection: "row" }]}>
  <MaterialIcons name="add" size={20} color={colors.white} />
  <Text style={[styles.buttonText, { marginLeft: 8 }]}>Add Item</Text>
</Pressable>
```

---

## 📝 Form Fields

### Text Input
```jsx
<TextInput
  style={[styles.input, { marginBottom: 16 }]}
  placeholder="Enter text"
  placeholderTextColor={colors.textSecondary}
  value={value}
  onChangeText={setValue}
/>
```

### Multiline Input
```jsx
<TextInput
  style={[styles.input, { 
    marginBottom: 16,
    minHeight: 100,
    paddingTop: 12
  }]}
  placeholder="Enter description"
  placeholderTextColor={colors.textSecondary}
  value={value}
  onChangeText={setValue}
  multiline
/>
```

### Form Field with Label
```jsx
<View style={{ marginBottom: 16 }}>
  <Text style={[styles.label, { marginBottom: 8, fontSize: 14 }]}>
    Field Label
  </Text>
  <TextInput
    style={styles.input}
    placeholder="Enter text"
    placeholderTextColor={colors.textSecondary}
    value={value}
    onChangeText={setValue}
  />
</View>
```

### Password Field with Visibility Toggle
```jsx
<View style={{ marginBottom: 16 }}>
  <Text style={[styles.label, { marginBottom: 8, fontSize: 14 }]}>Password</Text>
  <View style={[styles.input, {
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 0,
    paddingLeft: 0,
  }]}>
    <TextInput
      style={{
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 14,
        fontSize: 15,
        color: colors.textPrimary,
      }}
      placeholder="Enter password"
      placeholderTextColor={colors.textSecondary}
      value={password}
      onChangeText={setPassword}
      secureTextEntry={!showPassword}
    />
    <Pressable
      onPress={() => setShowPassword(!showPassword)}
      style={{ paddingHorizontal: 12, paddingVertical: 12 }}
    >
      <MaterialIcons
        name={showPassword ? "visibility-off" : "visibility"}
        size={24}
        color={colors.textSecondary}
      />
    </Pressable>
  </View>
</View>
```

---

## 📐 Spacing Reference

### Vertical Spacing Between Elements
```javascript
// Use in marginBottom or marginTop
spacingXS: 4px      // Minimal spacing
spacingSmall: 8px   // Small gap
spacingMedium: 12px // Standard gap
spacingLarge: 16px  // Large gap
spacingXL: 20px     // Extra large gap
spacingXXL: 24px    // Maximum gap
```

### Common Spacing Patterns
```jsx
// Between form fields
marginBottom: 16  // styles.spacingLarge

// Between buttons
gap: 12  // Use gap property for row layouts

// Between cards
marginBottom: 16  // Use styles.card (has this built-in)

// Section spacing
marginBottom: 20  // Larger gap for section separation

// Header spacing
marginBottom: 20  // Under page title
```

---

## 🎭 Card Styling

### Basic Card
```jsx
<View style={styles.card}>
  <Text style={[styles.cardText, { fontWeight: "600" }]}>Title</Text>
  <Text style={styles.text}>Description text</Text>
</View>
```

### Card with Actions
```jsx
<View style={styles.card}>
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
    <View style={{ flex: 1, marginRight: 12 }}>
      <Text style={[styles.cardText, { fontWeight: "600", marginBottom: 8 }]}>Title</Text>
      <Text style={[styles.text, { fontSize: 13 }]}>Description</Text>
    </View>
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Pressable style={[styles.buttonSmall, { minWidth: 44 }]}>
        <MaterialIcons name="edit" size={18} color={colors.white} />
      </Pressable>
      <Pressable style={[styles.buttonSmall, { minWidth: 44, backgroundColor: colors.error }]}>
        <MaterialIcons name="delete" size={18} color={colors.white} />
      </Pressable>
    </View>
  </View>
</View>
```

---

## 🎨 Color Usage

### Text Colors
```javascript
colors.textPrimary       // Main text (headings, important text)
colors.textSecondary     // Secondary text (subtitles, hints)
colors.primary           // Primary brand color (buttons, links)
colors.error             // Error states and destructive actions
colors.white             // White text on colored backgrounds
```

### Background Colors
```javascript
colors.background        // Page background
colors.cardBackground    // Card/input background
colors.border            // Borders and dividers
colors.surface           // Alternative surface color
```

### Role Badge Colors
```javascript
colors.roleSuperAdmin    // Super Admin badge
colors.roleAdmin         // Admin badge
colors.roleStaff         // Staff badge
colors.roleClassTeacher  // Class Teacher badge
colors.roleStudent       // Student badge
```

---

## ✅ Dark Mode Compatibility

### Always Check Both Modes
```jsx
// ✅ GOOD - Uses theme colors
<Text style={[styles.text, { color: colors.textSecondary }]}>Text</Text>

// ❌ BAD - Hardcoded color
<Text style={[styles.text, { color: "#666" }]}>Text</Text>

// ❌ BAD - Wrong color in dark mode
<Text style={[styles.text, { color: "#000000" }]}>Text</Text>

// ✅ GOOD - Uses input styling
<TextInput style={[styles.input]} />

// ❌ BAD - Inline styling
<TextInput style={{ backgroundColor: "#fff", color: "#000" }} />
```

---

## 🔧 Common Patterns

### Flex Row with Gap
```jsx
<View style={{ flexDirection: 'row', gap: 12 }}>
  <Button />
  <Button />
</View>
```

### Full Width Button
```jsx
<Pressable style={[styles.buttonLarge, { width: "100%" }]}>
  <Text style={styles.buttonText}>Action</Text>
</Pressable>
```

### Icon + Text Button
```jsx
<Pressable style={[styles.buttonLarge, { flexDirection: 'row' }]}>
  <MaterialIcons name="icon-name" size={20} color={colors.white} />
  <Text style={[styles.buttonText, { marginLeft: 8 }]}>Text</Text>
</Pressable>
```

### Conditional Styling
```jsx
<View style={[
  styles.card,
  isActive && { borderLeftColor: colors.primary, opacity: 1 },
  !isActive && { opacity: 0.5 }
]}>
  {/* content */}
</View>
```

---

## 🚀 Best Practices

### DO ✅
- Use theme styles from `styles` and `colors`
- Keep buttons at minimum 44x44px for touch
- Use consistent spacing from the scale (4, 8, 12, 16, 20, 24)
- Test in both light and dark modes
- Use flex layout for responsive design
- Add `numberOfLines` to text that might overflow

### DON'T ❌
- Don't hardcode colors - use theme colors
- Don't mix inline styles with theme styles inconsistently
- Don't create buttons smaller than 44x44px
- Don't mix different spacing values
- Don't skip dark mode testing
- Don't use `Quicksand` font - use Lora (theme default)

---

## 🔍 Troubleshooting

### Navigation icons invisible
- ✅ Fixed - now uses `colors.textSecondary`

### Buttons look wrong
- Use `styles.buttonLarge`, `styles.buttonSmall`, or `styles.buttonSecondary`
- Don't mix inline styles with button styles

### Text colors wrong in dark mode
- Replace hardcoded colors with `colors.textPrimary` or `colors.textSecondary`

### Spacing looks inconsistent
- Use the spacing scale: 8, 12, 16, 20, 24
- Avoid using random pixel values

### Forms look cluttered
- Add proper spacing between fields (16px marginBottom)
- Use clear labels with 8px gap below
- Add proper gap between buttons (12px)

---

## 📱 Responsive Design

### Container Width
```jsx
// Full width with padding
style={{ width: "100%" }}

// Modal width
style={{ width: "90%", maxWidth: 400 }}

// Screen consideration
// Safe area handled by ScrollView contentContainerStyle
```

### Text Truncation
```jsx
// Single line with ellipsis
numberOfLines={1}

// Multiple lines with truncation
numberOfLines={2}

// No truncation
// (don't set numberOfLines)
```

---

## 🎬 Animations & Transitions

### Button Press Feedback
```jsx
// Built-in via Pressable component
<Pressable 
  onPress={() => {}}
  style={({ pressed }) => [
    styles.button,
    pressed && { opacity: 0.8 }
  ]}
>
  <Text>Press me</Text>
</Pressable>
```

### Disabled State
```jsx
<Pressable
  disabled={isLoading}
  style={[
    styles.buttonLarge,
    isLoading && { opacity: 0.6 }
  ]}
>
  <Text style={styles.buttonText}>
    {isLoading ? "Loading..." : "Submit"}
  </Text>
</Pressable>
```

---

## 💡 Performance Tips

1. Use `styles` from theme (StyleSheet is cached)
2. Avoid creating new objects in render
3. Use `gap` instead of margin for flex layouts
4. Memoize components that don't change often
5. Use `numberOfLines` to prevent unnecessary layout calculations

---

**Last Updated**: November 20, 2025  
**Version**: 1.0  
**Status**: Production Ready
