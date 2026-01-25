'use client';

/**
 * PlanCalendar Component
 * 
 * Main calendar view combining grid and schedule list.
 * Desktop: Split view (calendar left, schedules right)
 * Mobile: Stacked view (calendar top, schedules bottom)
 */

import { useRouter } from 'next/navigation';
import { CalendarHeader } from './CalendarHeader';
import { CalendarGrid } from './CalendarGrid';
import { ScheduleList } from './ScheduleList';
import { useCalendar } from '../hooks/useCalendar';
import { useSchedules } from '../hooks/useSchedules';
import { getSchedulesForDate } from '../utils/calendarUtils';
import { toISODateString } from '../utils/dateUtils';
import type { PlanSchedule } from '../types';

interface PlanCalendarProps {
  onScheduleChange?: () => void;
}

export function PlanCalendar({ onScheduleChange }: PlanCalendarProps) {
  const router = useRouter();

  // Calendar state and navigation
  const {
    currentDate: _currentDate,
    selectedDate,
    view,
    goToToday,
    goToPrevious,
    goToNext,
    selectDate,
    setView,
    headerTitle,
    getMonthGrid,
    getWeekGrid,
    visibleRange,
  } = useCalendar();

  // Schedule data and operations
  const {
    schedules,
    isLoading,
    markComplete,
    markSkipped,
    openCreateDialog,
    openEditDialog,
  } = useSchedules({
    filters: visibleRange,
    enabled: true,
  });

  // Get schedules for selected date
  const selectedDateStr = selectedDate ? toISODateString(selectedDate) : null;
  const selectedSchedules = selectedDateStr 
    ? getSchedulesForDate(schedules, selectedDateStr)
    : [];

  // Generate calendar grid
  const monthGrid = view === 'month' ? getMonthGrid(schedules) : undefined;
  const weekGrid = view === 'week' ? getWeekGrid(schedules) : undefined;

  // Handlers
  const handleSelectDate = (dateStr: string) => {
    selectDate(dateStr);
  };

  const handleAddSchedule = () => {
    openCreateDialog(selectedDateStr || undefined);
  };

  const handlePlaySchedule = (schedule: PlanSchedule) => {
    // Navigate to play mode for this plan
    router.push(`/app/planner/plan/${schedule.planId}/play`);
  };

  const handleMarkComplete = async (schedule: PlanSchedule) => {
    await markComplete(schedule.id);
    onScheduleChange?.();
  };

  const handleMarkSkipped = async (schedule: PlanSchedule) => {
    await markSkipped(schedule.id);
    onScheduleChange?.();
  };

  const handleEditSchedule = (schedule: PlanSchedule) => {
    openEditDialog(schedule);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <CalendarHeader
        title={headerTitle}
        view={view}
        onPrevious={goToPrevious}
        onNext={goToNext}
        onToday={goToToday}
        onViewChange={setView}
      />

      {/* Main content - responsive layout */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Calendar Grid */}
        <CalendarGrid
          monthGrid={monthGrid}
          weekGrid={weekGrid}
          onSelectDate={handleSelectDate}
        />

        {/* Schedule List */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <ScheduleList
            date={selectedDateStr}
            schedules={selectedSchedules}
            isLoading={isLoading}
            onAddSchedule={handleAddSchedule}
            onPlaySchedule={handlePlaySchedule}
            onMarkComplete={handleMarkComplete}
            onMarkSkipped={handleMarkSkipped}
            onEditSchedule={handleEditSchedule}
          />
        </div>
      </div>
    </div>
  );
}
