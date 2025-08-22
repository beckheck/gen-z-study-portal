import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
  },
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
  },
];

export function useLocalization() {
  const { t, i18n } = useTranslation();

  const changeLanguage = useCallback(
    (languageCode: string) => {
      i18n.changeLanguage(languageCode);
    },
    [i18n]
  );

  const getCurrentLanguage = useCallback(() => {
    return SUPPORTED_LANGUAGES.find(lang => lang.code === i18n.language) || SUPPORTED_LANGUAGES[0];
  }, [i18n.language]);

  const formatDate = useCallback(
    (date: Date, options?: Intl.DateTimeFormatOptions) => {
      const locale = i18n.language === 'es' ? 'es-ES' : 'en-GB'; // Use en-GB for DD/MM/YYYY format
      const defaultOptions: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        ...options
      };
      return date.toLocaleDateString(locale, defaultOptions);
    },
    [i18n.language]
  );

  const formatTime = useCallback(
    (date: Date, options?: Intl.DateTimeFormatOptions) => {
      const locale = i18n.language === 'es' ? 'es-ES' : 'en-US';
      return date.toLocaleTimeString(locale, options);
    },
    [i18n.language]
  );

  const formatNumber = useCallback(
    (number: number, options?: Intl.NumberFormatOptions) => {
      const locale = i18n.language === 'es' ? 'es-ES' : 'en-US';
      return number.toLocaleString(locale, options);
    },
    [i18n.language]
  );

  const formatRelativeTime = useCallback(
    (value: number, unit: Intl.RelativeTimeFormatUnit) => {
      const locale = i18n.language === 'es' ? 'es-ES' : 'en-US';
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
      return rtf.format(value, unit);
    },
    [i18n.language]
  );

  // Format date as DD-MM-YYYY or DD/MM/YYYY
  const formatDateDDMMYYYY = useCallback(
    (date: Date | string, separator: string = '-') => {
      const d = typeof date === 'string' ? new Date(date) : date;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}${separator}${month}${separator}${year}`;
    },
    []
  );

  // Get localized day names
  const getDayNames = useCallback(() => {
    return [
      t('time.days.monday'),
      t('time.days.tuesday'),
      t('time.days.wednesday'),
      t('time.days.thursday'),
      t('time.days.friday'),
      t('time.days.saturday'),
      t('time.days.sunday'),
    ];
  }, [t]);

  // Get localized short day names
  const getShortDayNames = useCallback(() => {
    return [
      t('time.days.mon'),
      t('time.days.tue'),
      t('time.days.wed'),
      t('time.days.thu'),
      t('time.days.fri'),
      t('time.days.sat'),
      t('time.days.sun'),
    ];
  }, [t]);

  // Get localized month names
  const getMonthNames = useCallback(() => {
    return [
      t('time.months.january'),
      t('time.months.february'),
      t('time.months.march'),
      t('time.months.april'),
      t('time.months.may'),
      t('time.months.june'),
      t('time.months.july'),
      t('time.months.august'),
      t('time.months.september'),
      t('time.months.october'),
      t('time.months.november'),
      t('time.months.december'),
    ];
  }, [t]);

  // Get localized short month names
  const getShortMonthNames = useCallback(() => {
    return [
      t('time.months.jan'),
      t('time.months.feb'),
      t('time.months.mar'),
      t('time.months.apr'),
      t('time.months.may_short'),
      t('time.months.jun'),
      t('time.months.jul'),
      t('time.months.aug'),
      t('time.months.sep'),
      t('time.months.oct'),
      t('time.months.nov'),
      t('time.months.dec'),
    ];
  }, [t]);

  return {
    t,
    i18n,
    changeLanguage,
    getCurrentLanguage,
    formatDate,
    formatDateDDMMYYYY,
    formatTime,
    formatNumber,
    formatRelativeTime,
    getDayNames,
    getShortDayNames,
    getMonthNames,
    getShortMonthNames,
    currentLanguage: i18n.language,
    isRTL: false, // Add RTL support later if needed
  };
}
