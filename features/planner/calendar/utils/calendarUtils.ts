/**
 * Calendar Grid Utilities
 * 
 * Functions for generating calendar grid data.
 */

import type { CalendarDay, CalendarWeek, CalendarMonth, PlanSchedule } from '../types';
import {
  toISODateString,
  isToday,
  isPast,
  isWeekend,
  isSameDay,
  getFirstDayOfWeek,
  getMonthViewRange,
  getWeekNumber,
  addDays,
} from './dateUtils';

// =============================================================================
// Calendar Grid Generation
// =============================================================================

/**
 * Create a CalendarDay object
 */
function createCalendarDay(
  date: Date,
  currentMonth: number,
  selectedDate: Date | null,
  schedules: PlanSchedule[]
): CalendarDay {
  const dateString = toISODateString(date);
  const daySchedules = schedules.filter(s => s.scheduledDate === dateString);

  return {
    date: dateString,
    dayOfMonth: date.getDate(),
    isCurrentMonth: date.getMonth() === currentMonth,
    isToday: isToday(date),
    isSelected: selectedDate ? isSameDay(date, selectedDate) : false,
    isPast: isPast(date),
    isWeekend: isWeekend(date),
    schedules: daySchedules,
  };
}

/**
 * Generate a month view grid
 */
export function generateMonthGrid(
  year: number,
  month: number,
  selectedDate: Date | null,
  schedules: PlanSchedule[]
): CalendarMonth {
  const { start, end } = getMonthViewRange(year, month);
  const weeks: CalendarWeek[] = [];
  
  let currentDate = new Date(start);
  
  while (currentDate <= end) {
    const weekStart = getFirstDayOfWeek(currentDate);
    const days: CalendarDay[] = [];
    
    for (let i = 0; i < 7; i++) {
      const dayDate = addDays(weekStart, i);
      days.push(createCalendarDay(dayDate, month, selectedDate, schedules));
    }
    
    weeks.push({
      weekNumber: getWeekNumber(currentDate),
      days,
    });
    
    currentDate = addDays(currentDate, 7);
  }
  
  return {
    year,
    month,
    weeks,
  };
}

/**
 * Generate a week view grid
 */
export function generateWeekGrid(
  date: Date,
  selectedDate: Date | null,
  schedules: PlanSchedule[]
): CalendarWeek {
  const weekStart = getFirstDayOfWeek(date);
  const days: CalendarDay[] = [];
  
  for (let i = 0; i < 7; i++) {
    const dayDate = addDays(weekStart, i);
    days.push(createCalendarDay(dayDate, date.getMonth(), selectedDate, schedules));
  }
  
  return {
    weekNumber: getWeekNumber(date),
    days,
  };
}

// =============================================================================
// Schedule Helpers
// =============================================================================

/**
 * Group schedules by date
 */
export function groupSchedulesByDate(
  schedules: PlanSchedule[]
): Map<string, PlanSchedule[]> {
  const grouped = new Map<string, PlanSchedule[]>();
  
  for (const schedule of schedules) {
    const existing = grouped.get(schedule.scheduledDate) || [];
    existing.push(schedule);
    grouped.set(schedule.scheduledDate, existing);
  }
  
  return grouped;
}

/**
 * Sort schedules by time
 */
export function sortSchedulesByTime(schedules: PlanSchedule[]): PlanSchedule[] {
  return [...schedules].sort((a, b) => {
    const timeA = a.scheduledTime || '00:00';
    const timeB = b.scheduledTime || '00:00';
    return timeA.localeCompare(timeB);
  });
}

/**
 * Get schedules for a specific date
 */
export function getSchedulesForDate(
  schedules: PlanSchedule[],
  date: string
): PlanSchedule[] {
  return sortSchedulesByTime(
    schedules.filter(s => s.scheduledDate === date)
  );
}

/**
 * Count schedules by status
 */
export function countSchedulesByStatus(
  schedules: PlanSchedule[]
): { scheduled: number; completed: number; skipped: number } {
  return schedules.reduce(
    (acc, schedule) => {
      acc[schedule.status]++;
      return acc;
    },
    { scheduled: 0, completed: 0, skipped: 0 }
  );
}

/**
 * Get today's schedules
 */
export function getTodaySchedules(schedules: PlanSchedule[]): PlanSchedule[] {
  const today = toISODateString(new Date());
  return getSchedulesForDate(schedules, today);
}

/**
 * Get upcoming schedules (next 7 days)
 */
export function getUpcomingSchedules(
  schedules: PlanSchedule[],
  days: number = 7
): PlanSchedule[] {
  const today = new Date();
  const endDate = addDays(today, days);
  const todayStr = toISODateString(today);
  const endStr = toISODateString(endDate);
  
  return schedules
    .filter(s => s.scheduledDate >= todayStr && s.scheduledDate <= endStr)
    .sort((a, b) => {
      if (a.scheduledDate !== b.scheduledDate) {
        return a.scheduledDate.localeCompare(b.scheduledDate);
      }
      return (a.scheduledTime || '').localeCompare(b.scheduledTime || '');
    });
}
