'use client';

import { useFormatter, useLocale } from 'next-intl';
import { useMemo } from 'react';

/**
 * Hook for locale-aware date and number formatting
 * 
 * Wraps next-intl's useFormatter with convenience methods
 */
export function useFormatters() {
  const format = useFormatter();
  const locale = useLocale();

  return useMemo(
    () => ({
      /**
       * Format a date with short format (e.g., "15 jan 2024")
       */
      dateShort: (date: Date | number | string) => {
        const d = typeof date === 'string' ? new Date(date) : date;
        return format.dateTime(d, 'short');
      },

      /**
       * Format a date with medium format (e.g., "15 januari 2024")
       */
      dateMedium: (date: Date | number | string) => {
        const d = typeof date === 'string' ? new Date(date) : date;
        return format.dateTime(d, 'medium');
      },

      /**
       * Format a date with full format (e.g., "måndag 15 januari 2024")
       */
      dateFull: (date: Date | number | string) => {
        const d = typeof date === 'string' ? new Date(date) : date;
        return format.dateTime(d, 'full');
      },

      /**
       * Format time (e.g., "14:30")
       */
      time: (date: Date | number | string) => {
        const d = typeof date === 'string' ? new Date(date) : date;
        return format.dateTime(d, 'time');
      },

      /**
       * Format date and time (e.g., "15 jan 2024 14:30")
       */
      dateTime: (date: Date | number | string) => {
        const d = typeof date === 'string' ? new Date(date) : date;
        return format.dateTime(d, 'dateTime');
      },

      /**
       * Format relative time (e.g., "2 dagar sedan", "om 3 timmar")
       */
      relative: (date: Date | number | string) => {
        const d = typeof date === 'string' ? new Date(date) : date;
        return format.relativeTime(d);
      },

      /**
       * Format number with locale-specific formatting
       */
      number: (value: number) => {
        return format.number(value);
      },

      /**
       * Format currency (SEK by default)
       */
      currency: (value: number, currencyCode?: string) => {
        return format.number(value, {
          style: 'currency',
          currency: currencyCode || 'SEK',
        });
      },

      /**
       * Format percentage
       */
      percent: (value: number, fractionDigits?: number) => {
        return format.number(value, {
          style: 'percent',
          minimumFractionDigits: fractionDigits ?? 0,
          maximumFractionDigits: fractionDigits ?? 1,
        });
      },

      /**
       * Get native Intl.DateTimeFormat for custom formatting
       */
      getDateFormatter: (options?: Intl.DateTimeFormatOptions) => {
        return new Intl.DateTimeFormat(locale, options);
      },

      /**
       * Get native Intl.NumberFormat for custom formatting
       */
      getNumberFormatter: (options?: Intl.NumberFormatOptions) => {
        return new Intl.NumberFormat(locale, options);
      },

      /**
       * Current locale code
       */
      locale,
    }),
    [format, locale]
  );
}

/**
 * Server-side formatting utilities
 * Use these when you need formatting in Server Components
 */
export function createServerFormatters(locale: string) {
  return {
    dateShort: (date: Date | number | string) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(d);
    },

    dateMedium: (date: Date | number | string) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(d);
    },

    dateFull: (date: Date | number | string) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        weekday: 'long',
      }).format(d);
    },

    time: (date: Date | number | string) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    },

    dateTime: (date: Date | number | string) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    },

    number: (value: number) => {
      return new Intl.NumberFormat(locale).format(value);
    },

    currency: (value: number, currencyCode = 'SEK') => {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
      }).format(value);
    },

    percent: (value: number, fractionDigits = 1) => {
      return new Intl.NumberFormat(locale, {
        style: 'percent',
        minimumFractionDigits: 0,
        maximumFractionDigits: fractionDigits,
      }).format(value);
    },

    locale,
  };
}
