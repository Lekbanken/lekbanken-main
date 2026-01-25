'use client';

/**
 * useCalendar Hook
 * 
 * Manages calendar navigation and selection state.
 */

import { useState, useCallback, useMemo } from 'react';
import type { CalendarView, CalendarMonth, CalendarWeek } from '../types';
import { 
  addMonths, 
  addWeeks, 
  getMonthName,
  toISODateString,
} from '../utils/dateUtils';
import { generateMonthGrid, generateWeekGrid } from '../utils/calendarUtils';
import type { PlanSchedule } from '../types';

interface UseCalendarOptions {
  initialDate?: Date;
  initialView?: CalendarView;
}

interface UseCalendarReturn {
  // State
  currentDate: Date;
  selectedDate: Date | null;
  view: CalendarView;
  
  // Navigation
  goToToday: () => void;
  goToPrevious: () => void;
  goToNext: () => void;
  goToDate: (date: Date) => void;
  
  // Selection
  selectDate: (date: Date | string) => void;
  clearSelection: () => void;
  
  // View
  setView: (view: CalendarView) => void;
  
  // Display helpers
  currentMonthName: string;
  currentYear: number;
  headerTitle: string;
  
  // Grid generation
  getMonthGrid: (schedules: PlanSchedule[]) => CalendarMonth;
  getWeekGrid: (schedules: PlanSchedule[]) => CalendarWeek;
  
  // Date range for API queries
  visibleRange: { from: string; to: string };
}

export function useCalendar(options: UseCalendarOptions = {}): UseCalendarReturn {
  const { 
    initialDate = new Date(), 
    initialView = 'month' 
  } = options;

  const [currentDate, setCurrentDate] = useState<Date>(initialDate);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<CalendarView>(initialView);

  // Navigation
  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  }, []);

  const goToPrevious = useCallback(() => {
    setCurrentDate(prev => {
      if (view === 'month') {
        return addMonths(prev, -1);
      } else if (view === 'week') {
        return addWeeks(prev, -1);
      }
      return prev;
    });
  }, [view]);

  const goToNext = useCallback(() => {
    setCurrentDate(prev => {
      if (view === 'month') {
        return addMonths(prev, 1);
      } else if (view === 'week') {
        return addWeeks(prev, 1);
      }
      return prev;
    });
  }, [view]);

  const goToDate = useCallback((date: Date) => {
    setCurrentDate(date);
    setSelectedDate(date);
  }, []);

  // Selection
  const selectDate = useCallback((date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    setSelectedDate(dateObj);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedDate(null);
  }, []);

  // Display helpers
  const currentMonthName = useMemo(() => 
    getMonthName(currentDate.getMonth()), 
    [currentDate]
  );

  const currentYear = useMemo(() => 
    currentDate.getFullYear(), 
    [currentDate]
  );

  const headerTitle = useMemo(() => {
    if (view === 'month') {
      return `${currentMonthName} ${currentYear}`;
    } else if (view === 'week') {
      return `Vecka ${getWeekNumber(currentDate)}, ${currentYear}`;
    }
    return currentDate.toLocaleDateString('sv-SE', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    });
  }, [view, currentMonthName, currentYear, currentDate]);

  // Grid generation
  const getMonthGrid = useCallback((schedules: PlanSchedule[]) => {
    return generateMonthGrid(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      selectedDate,
      schedules
    );
  }, [currentDate, selectedDate]);

  const getWeekGrid = useCallback((schedules: PlanSchedule[]) => {
    return generateWeekGrid(currentDate, selectedDate, schedules);
  }, [currentDate, selectedDate]);

  // Visible range for API queries
  const visibleRange = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    if (view === 'month') {
      // Include extra days for partial weeks
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const startOffset = (firstDay.getDay() + 6) % 7; // Days from Monday
      const endOffset = 6 - ((lastDay.getDay() + 6) % 7); // Days to Sunday
      
      const from = new Date(year, month, 1 - startOffset);
      const to = new Date(year, month + 1, endOffset);
      
      return {
        from: toISODateString(from),
        to: toISODateString(to),
      };
    } else {
      // Week view
      const dayOfWeek = (currentDate.getDay() + 6) % 7;
      const from = new Date(currentDate);
      from.setDate(from.getDate() - dayOfWeek);
      const to = new Date(from);
      to.setDate(to.getDate() + 6);
      
      return {
        from: toISODateString(from),
        to: toISODateString(to),
      };
    }
  }, [currentDate, view]);

  return {
    currentDate,
    selectedDate,
    view,
    goToToday,
    goToPrevious,
    goToNext,
    goToDate,
    selectDate,
    clearSelection,
    setView,
    currentMonthName,
    currentYear,
    headerTitle,
    getMonthGrid,
    getWeekGrid,
    visibleRange,
  };
}

// Helper function not exported in the main return
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
