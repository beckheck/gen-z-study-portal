# 🌍 Localization System Documentation

## Overview

This project uses `react-i18next` for internationalization (i18n) and localization (l10n), providing comprehensive support for English and Spanish with the ability to easily add more languages. The system features runtime language switching, TypeScript safety, and scalable architecture.

**Key Features:**

- ✅ **Runtime Language Switching** - No page reload required
- ✅ **TypeScript Safety** - Full autocomplete and validation
- ✅ **Persistent Selection** - Remembers user choice in localStorage
- ✅ **Automatic Detection** - Uses browser/system language as fallback
- ✅ **Locale-aware Formatting** - Dates, numbers, and cultural adaptation

## 📁 Architecture & File Structure

### Core Technologies

- **react-i18next**: Primary internationalization framework
- **i18next-browser-languagedetector**: Automatic language detection
- **TypeScript**: Type-safe translations with autocomplete

### Directory Structure

```plain
src/
├── i18n/
│   ├── config.ts              # i18n configuration and initialization
│   └── types.ts               # TypeScript declarations for type safety
├── locales/
│   ├── en/                    # English translations
│   │   ├── common.json        # Common UI elements, actions, navigation
│   │   ├── planner.json       # Planner-specific translations
│   │   ├── wellness.json      # Wellness-specific translations
│   │   ├── tracker.json       # Study tracker translations
│   │   ├── timetable.json     # Timetable translations
│   │   ├── settings.json      # Settings translations
│   │   ├── degreePlan.json    # Degree planning translations
│   │   ├── courseManager.json # Course management translations
│   │   ├── soundtrack.json    # Soundtrack translations
│   │   └── tips.json          # Tips and advice translations
│   └── es/                    # Spanish translations (same structure)
├── hooks/
│   └── useLocalization.ts     # Custom localization hook
└── components/
    └── LanguageSelector.tsx   # Language switching component
```

## 🔧 Advanced Features

### Interpolation & Pluralization

```tsx
// Translation file examples
"goal": "Goal: {{count}} cups / day"
"progress": "{{current}} / {{target}} cups today"
"streakCount": "{{count}} day streak",
"streakCount_plural": "{{count}} days streak"

// Usage
t('hydration.goal', { count: 8 })
t('hydration.progress', { current: 3, target: 8 })
t('stats.streakCount', { count: 1 })  // "1 day streak" 
t('stats.streakCount', { count: 5 })  // "5 days streak"
```

### Multiple Namespaces

```tsx
function MyComponent() {
  const { t } = useTranslation('planner');
  const { t: tCommon } = useTranslation('common');
  
  return (
    <div>
      <h1>{t('title')}</h1>
      <button>{tCommon('actions.save')}</button>
    </div>
  );
}
```

### Localized Formatting API

```tsx
const { 
  formatDate, formatTime, formatNumber,     // Locale-aware formatting
  getDayNames, getMonthNames,               // Full localized names
  getShortDayNames, getShortMonthNames      // Abbreviated names
} = useLocalization();
```

## 🎯 Integration Examples

### PlannerTab Integration

```tsx
export default function PlannerTab() {
  const { t } = useTranslation('planner');
  const { getShortDayNames, formatDate } = useLocalization();

  return (
    <div>
      <Button>
        <Plus className="w-4 h-4 mr-2" />
        {t('events.addEvent')}
      </Button>
      
      <Select>
        <SelectItem value="class">{t('eventTypes.class')}</SelectItem>
        <SelectItem value="exam">{t('eventTypes.exam')}</SelectItem>
      </Select>

      <div className="calendar-header">
        {getShortDayNames().map(day => (
          <div key={day}>{day}</div>
        ))}
      </div>
    </div>
  );
}
```

### CourseManagerTab Integration

```tsx
export default function CourseManagerTab() {
  const { t: tCourse } = useTranslation('courseManager');
  const { t: tCommon } = useTranslation('common');

  return (
    <Card>
      <CardTitle>{tCourse('tasks.title')}</CardTitle>
      <Button onClick={addTask}>
        <Plus className="w-4 h-4 mr-2" />
        {tCourse('actions.addTask')}
      </Button>
      <Button onClick={clearData}>
        {tCommon('actions.cancel')}
      </Button>
    </Card>
  );
}
```

## 🌐 Supported Languages

| Language | Code | Native Name | Flag | Coverage |
|----------|------|-------------|------|----------|
| English  | `en` | English     | 🇺🇸  | 100% |
| Spanish  | `es` | Español     | 🇪🇸  | 100% |  

## 🔄 Adding New Languages

### 1. Create Translation Files

```bash
mkdir src/locales/fr  # For French
cp -r src/locales/en/* src/locales/fr/
# Edit the French files with translations
```

### 2. Update Configuration

```typescript
// Add to src/i18n/config.ts
import frCommon from '../locales/fr/common.json';
import frPlanner from '../locales/fr/planner.json';
// ... other imports

const resources = {
  // ... existing languages
  fr: {
    common: frCommon,
    planner: frPlanner,
    wellness: frWellness,
    // ... other namespaces
  },
};
```

### 3. Add to Language List

```typescript
// Add to src/hooks/useLocalization.ts
export const SUPPORTED_LANGUAGES: Language[] = [
  // ... existing languages
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
  },
];
```

### 4. Update TypeScript Types

```typescript
// The TypeScript declarations will automatically include new languages
// once the translation files are properly imported in config.ts
```

## 🧪 Development & Testing

### Development Workflow

1. **Extract strings** - Identify all user-facing text
2. **Create keys** - Add to appropriate JSON files
3. **Update components** - Replace hardcoded text with `t()` calls
4. **Test switching** - Verify both languages work
5. **Validate formatting** - Test date/number formatting

### Missing Translation Handling

- Development console warnings for missing keys
- Automatic fallback to English when translations are missing
- Graceful degradation for missing keys

### Testing Checklist

- Language switching without page reload
- Persistent language selection (localStorage)
- Browser language detection
- Text overflow with longer translations
- Date/number formatting accuracy

## 🎨 Best Practices

### Translation Keys

- Use dot notation: `section.subsection.key`
- Be descriptive: `forms.eventTitle` not just `title`
- Group related keys: `actions.save`, `actions.cancel`
- Consistent naming conventions across namespaces

### Translation Content

- Keep translations culturally appropriate
- Consider text expansion (Spanish ~30% longer than English)
- Use proper grammar and punctuation
- Test with native speakers when possible

### Component Integration

- Import translations at component level
- Use namespace separation for large features
- Leverage TypeScript for key validation
- Handle pluralization and interpolation properly

### Performance

- All translations bundled with the app (no runtime requests)
- Minimal bundle size impact
- Consider code splitting for large translation sets

## � Troubleshooting

### Common Issues

**Translation not updating:**

- Clear localStorage: `localStorage.removeItem('i18nextLng')`
- Check browser console for missing key warnings
- Verify translation key exists in JSON files

**TypeScript errors:**

- Ensure all namespaces are imported in `types.ts`
- Check translation key spelling and nesting
- Rebuild TypeScript declarations if needed

**Language detection issues:**

- Check browser language settings
- Verify localStorage persistence
- Test with incognito/private browsing mode

### Debug Tools

- Browser console warnings for missing keys
- React DevTools i18n state inspection
- localStorage language persistence verification

## � Migration Guide

To add localization to existing components:

1. **Add translation imports**

   ```tsx
   import { useTranslation } from 'react-i18next';
   ```

2. **Replace hardcoded strings**

   ```tsx
   // Before
   <button>Add Event</button>
   
   // After
   const { t } = useTranslation('planner');
   <button>{t('events.addEvent')}</button>
   ```

3. **Use localization hooks for dates/numbers**

   ```tsx
   const { formatDate } = useLocalization();
   <p>{formatDate(new Date())}</p>
   ```

4. **Add language selector to UI**

   ```tsx
   <LanguageSelector showText variant="outline" />
   ```

5. **Test all functionality in both languages**

## 🔮 Future Enhancements

**Advanced Features:** RTL Support, Context-aware translations, Translation management UI

**Performance:** Code splitting, Lazy loading, CDN delivery

---

This localization system provides a comprehensive foundation for multi-language support in the Gen Z Study Portal, balancing developer experience, user experience, and maintainability while enabling seamless global reach.
