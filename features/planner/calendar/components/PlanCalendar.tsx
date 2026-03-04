'use client';

/**
 * PlanCalendar Component
 * 
 * Main calendar view combining grid and schedule list.
 * Desktop: Split view (calendar left, schedules right)
 * Mobile: Stacked view (calendar top, schedules bottom)
 */

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarHeader } from './CalendarHeader';
import { CalendarGrid } from './CalendarGrid';
import { ScheduleList } from './ScheduleList';
import { PlanPickerModal } from './PlanPickerModal';
import { useCalendar } from '../hooks/useCalendar';
import { useSchedules } from '../hooks/useSchedules';
import { useActiveRuns } from '@/features/planner/hooks/useActiveRuns';
import { getSchedulesForDate } from '../utils/calendarUtils';
import { toISODateString } from '../utils/dateUtils';
import type { PlanSchedule } from '../types';
import type { CalendarView } from '../types';
import type { PlannerPlan } from '@/types/planner';

interface PlanCalendarProps {
  onScheduleChange?: () => void;
}

const CALENDAR_VIEW_KEY = 'lekbanken-calendar-view';

/**
 * Determine initial calendar view with this priority:
 * 1. User's saved preference (localStorage)
 * 2. Mobile viewport → 'week'
 * 3. Default → 'month'
 * 
 * Uses a lazy initializer so the value is correct on first render (no flash).
 */
function usePersistedCalendarView() {
  const [view, setViewState] = useState<CalendarView>(() => {
    if (typeof window === 'undefined') return 'month';
    const saved = localStorage.getItem(CALENDAR_VIEW_KEY);
    if (saved === 'week' || saved === 'month') return saved;
    return window.innerWidth < 768 ? 'week' : 'month';
  });

  const setView = (v: CalendarView) => {
    setViewState(v);
    try { localStorage.setItem(CALENDAR_VIEW_KEY, v); } catch { /* quota */ }
  };

  return { view, setView };
}

export function PlanCalendar({ onScheduleChange }: PlanCalendarProps) {
  const router = useRouter();
  const { view: persistedView, setView: setPersistedView } = usePersistedCalendarView();
  const { activeRunByPlanId } = useActiveRuns();

  // Build a Set<string> of planIds with active runs for ScheduleList
  const activeRunPlanIds = useMemo(
    () => new Set(activeRunByPlanId.keys()),
    [activeRunByPlanId]
  );

  // Calendar state and navigation
  const {
    currentDate: _currentDate,
    selectedDate,
    view,
    goToToday,
    goToPrevious,
    goToNext,
    selectDate,
    setView: setCalendarView,
    headerTitle,
    dateLocale,
    getMonthGrid,
    getWeekGrid,
    visibleRange,
  } = useCalendar({ initialView: persistedView });

  // Sync view changes to localStorage
  const handleViewChange = (v: CalendarView) => {
    setCalendarView(v);
    setPersistedView(v);
  };

  // Schedule data and operations
  const {
    schedules,
    isLoading,
    create,
    markComplete,
    markSkipped,
    dialog,
    openCreateDialog,
    openEditDialog,
    closeDialog,
    isMutating,
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
    router.push(`/app/play/plan/${schedule.planId}`);
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

  // Create a schedule when the user picks a plan from the modal
  const handlePickPlan = async (plan: PlannerPlan) => {
    if (!dialog.selectedDate) return;
    try {
      await create({
        planId: plan.id,
        scheduledDate: dialog.selectedDate,
      });
      closeDialog();
      onScheduleChange?.();
    } catch {
      // Error is handled inside useSchedules (mutationError)
    }
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
        onViewChange={handleViewChange}
      />

      {/* Main content - responsive layout */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Calendar Grid */}
        <CalendarGrid
          monthGrid={monthGrid}
          weekGrid={weekGrid}
          onSelectDate={handleSelectDate}
          locale={dateLocale}
          activeRunPlanIds={activeRunPlanIds}
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
            activeRunPlanIds={activeRunPlanIds}
            activeRunByPlanId={activeRunByPlanId}
          />
        </div>
      </div>

      {/* Plan Picker Modal — opens when user clicks "Add Schedule" */}
      <PlanPickerModal
        open={dialog.isOpen && dialog.mode === 'create'}
        onOpenChange={(open) => !open && closeDialog()}
        onSelectPlan={handlePickPlan}
        scheduledDate={dialog.selectedDate}
        isSubmitting={isMutating}
      />
    </div>
  );
}
