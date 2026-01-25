/**
 * Planner Calendar Module
 * 
 * Calendar feature for scheduling and viewing plan runs.
 * 
 * @example
 * ```tsx
 * import { PlanCalendar } from '@/features/planner/calendar';
 * 
 * function CalendarPage() {
 *   return <PlanCalendar />;
 * }
 * ```
 */

// Types
export type {
  PlanSchedule,
  ScheduleStatus,
  ScheduleRecurrence,
  ScheduleReminder,
  CalendarDay as CalendarDayType,
  CalendarWeek,
  CalendarMonth,
  CalendarView,
  CreateScheduleInput,
  UpdateScheduleInput,
  ScheduleFilters,
  CalendarState,
  ScheduleDialogState,
} from './types';

// Hooks
export { useCalendar, useSchedules } from './hooks';

// Components
export { 
  PlanCalendar,
  CalendarHeader,
  CalendarGrid,
  CalendarDay,
  CalendarDayHeader,
  ScheduleList,
  ScheduleCard,
  ScheduleCardSkeleton,
} from './components';

// Utils
export * from './utils';
