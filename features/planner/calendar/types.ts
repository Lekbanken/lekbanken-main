/**
 * Calendar Types
 * 
 * Type definitions for the planner calendar feature.
 */

// =============================================================================
// Schedule Types
// =============================================================================

export type ScheduleStatus = 'scheduled' | 'completed' | 'skipped';

export type RecurrenceType = 'daily' | 'weekly' | 'monthly';

export interface ScheduleRecurrence {
  type: RecurrenceType;
  interval: number;          // Every N days/weeks/months
  daysOfWeek?: number[];     // 0-6 for weekly (0 = Sunday)
  endDate?: string;          // ISO date string
}

export interface ScheduleReminder {
  enabled: boolean;
  minutesBefore: number;
}

export interface PlanSchedule {
  id: string;
  planId: string;
  planName: string;
  scheduledDate: string;     // ISO date (YYYY-MM-DD)
  scheduledTime?: string;    // HH:mm
  recurrence?: ScheduleRecurrence;
  reminder?: ScheduleReminder;
  status: ScheduleStatus;
  completedAt?: string;
  notes?: string;
  totalTimeMinutes?: number;
  blockCount?: number;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Calendar Types
// =============================================================================

export interface CalendarDay {
  date: string;              // ISO date (YYYY-MM-DD)
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isPast: boolean;
  isWeekend: boolean;
  schedules: PlanSchedule[];
}

export interface CalendarWeek {
  weekNumber: number;
  days: CalendarDay[];
}

export interface CalendarMonth {
  year: number;
  month: number;             // 0-11
  weeks: CalendarWeek[];
}

export type CalendarView = 'month' | 'week' | 'day';

// =============================================================================
// API Types
// =============================================================================

export interface CreateScheduleInput {
  planId: string;
  scheduledDate: string;
  scheduledTime?: string;
  recurrence?: ScheduleRecurrence;
  reminder?: ScheduleReminder;
  notes?: string;
}

export interface UpdateScheduleInput {
  scheduledDate?: string;
  scheduledTime?: string;
  recurrence?: ScheduleRecurrence;
  reminder?: ScheduleReminder;
  status?: ScheduleStatus;
  notes?: string;
}

export interface ScheduleFilters {
  from: string;              // ISO date
  to: string;                // ISO date
  planId?: string;
  status?: ScheduleStatus;
}

// =============================================================================
// UI State Types
// =============================================================================

export interface CalendarState {
  currentDate: Date;
  selectedDate: Date | null;
  view: CalendarView;
  isLoading: boolean;
  error: string | null;
}

export interface ScheduleDialogState {
  isOpen: boolean;
  mode: 'create' | 'edit';
  schedule?: PlanSchedule;
  selectedDate?: string;
}
