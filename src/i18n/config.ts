import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enCommon from '../locales/en/common.json';
import enPlanner from '../locales/en/planner.json';
import enWellness from '../locales/en/wellness.json';
import enSettings from '../locales/en/settings.json';
import enTracker from '../locales/en/tracker.json';
import enTimetable from '../locales/en/timetable.json';
import enDegreePlan from '../locales/en/degreePlan.json';
import enCourseManager from '../locales/en/courseManager.json';
import enSoundtrack from '../locales/en/soundtrack.json';
import enTips from '../locales/en/tips.json';

import esCommon from '../locales/es/common.json';
import esPlanner from '../locales/es/planner.json';
import esWellness from '../locales/es/wellness.json';
import esSettings from '../locales/es/settings.json';
import esTracker from '../locales/es/tracker.json';
import esTimetable from '../locales/es/timetable.json';
import esDegreePlan from '../locales/es/degreePlan.json';
import esCourseManager from '../locales/es/courseManager.json';
import esSoundtrack from '../locales/es/soundtrack.json';
import esTips from '../locales/es/tips.json';

// Translation resources
const resources = {
  en: {
    common: enCommon,
    planner: enPlanner,
    wellness: enWellness,
    settings: enSettings,
    tracker: enTracker,
    timetable: enTimetable,
    degreePlan: enDegreePlan,
    courseManager: enCourseManager,
    soundtrack: enSoundtrack,
    tips: enTips,
  },
  es: {
    common: esCommon,
    planner: esPlanner,
    wellness: esWellness,
    settings: esSettings,
    tracker: esTracker,
    timetable: esTimetable,
    degreePlan: esDegreePlan,
    courseManager: esCourseManager,
    soundtrack: esSoundtrack,
    tips: esTips,
  },
};

// Language detection options
const languageDetectorOptions = {
  order: ['localStorage', 'sessionStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],
  lookupLocalStorage: 'i18nextLng',
  lookupSessionStorage: 'i18nextLng',
  caches: ['localStorage', 'sessionStorage'],
  excludeCacheFor: ['cimode'],
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: [
      'common',
      'planner',
      'wellness',
      'settings',
      'tracker',
      'timetable',
      'degreePlan',
      'courseManager',
      'soundtrack',
      'tips',
    ],

    detection: languageDetectorOptions,

    interpolation: {
      escapeValue: false, // React already escapes by default
    },

    // Additional configuration
    saveMissing: true,
    missingKeyHandler: (lng, ns, key, fallbackValue) => {
      console.warn(`Missing translation key: ${key} in ${lng}:${ns}`);
    },

    // React-specific options
    react: {
      useSuspense: false,
    },
  });

export default i18n;
