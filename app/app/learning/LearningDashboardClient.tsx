'use client';

import Link from "next/link";
import { useTranslations } from 'next-intl'
import {
  AcademicCapIcon,
  BookOpenIcon,
  MapIcon,
  CheckCircleIcon,
  PlayIcon,
  ClockIcon,
  TrophyIcon,
  ChevronRightIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolidIcon } from "@heroicons/react/24/solid";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { LearnerDashboardData } from '@/app/actions/learning';

interface LearningDashboardClientProps {
  data: LearnerDashboardData;
}

const statusConfig = {
  completed: { 
    labelKey: "status.completed", 
    variant: "default" as const, 
    bgColor: "bg-green-500/10",
    textColor: "text-green-600",
  },
  in_progress: { 
    labelKey: "status.inProgress", 
    variant: "secondary" as const,
    bgColor: "bg-blue-500/10",
    textColor: "text-blue-600",
  },
  failed: { 
    labelKey: "status.failed", 
    variant: "destructive" as const,
    bgColor: "bg-red-500/10",
    textColor: "text-red-600",
  },
  locked: { 
    labelKey: "status.locked", 
    variant: "outline" as const,
    bgColor: "bg-muted",
    textColor: "text-muted-foreground",
  },
  available: { 
    labelKey: "status.available", 
    variant: "outline" as const,
    bgColor: "bg-primary/10",
    textColor: "text-primary",
  },
};

export function LearningDashboardClient({ data }: LearningDashboardClientProps) {
  const t = useTranslations('app.learning');
  const { courses, stats } = data;

  // Check if we have no courses
  const isEmpty = courses.length === 0;
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <AcademicCapIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
            <p className="text-muted-foreground">{t('subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="mb-8 grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-xl font-bold">
                {stats.coursesCompleted}/{stats.totalCourses}
              </p>
              <p className="text-xs text-muted-foreground">{t('progress.coursesComplete')}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <MapIcon className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">{t('progress.paths')}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <StarIcon className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xl font-bold">{stats.totalXpEarned}</p>
              <p className="text-xs text-muted-foreground">{t('progress.xpEarned')}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
              <TrophyIcon className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-xl font-bold">{stats.totalDicecoinEarned}</p>
              <p className="text-xs text-muted-foreground">DiceCoin</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Empty State */}
      {isEmpty && (
        <Card className="mb-8">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpenIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('empty.title')}</h3>
            <p className="text-muted-foreground max-w-md">
              {t('empty.description')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Courses */}
      {!isEmpty && (
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <BookOpenIcon className="h-5 w-5" />
            {t('courses')}
          </h2>

          {courses.map((course) => {
            const statusInfo = statusConfig[course.status] || statusConfig.available;
            const isLocked = course.status === "locked";
            
            return (
              <Card 
                key={course.id} 
                className={isLocked ? "opacity-60" : ""}
              >
                <CardContent className="p-0">
                  <Link 
                    href={isLocked ? "#" : `/app/learning/course/${course.slug}`}
                    className={`block p-5 ${isLocked ? "cursor-not-allowed" : "transition-colors hover:bg-muted/30"}`}
                    onClick={(e) => isLocked && e.preventDefault()}
                  >
                    <div className="flex items-start gap-4">
                      {/* Status icon */}
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${statusInfo.bgColor}`}>
                        {course.status === "completed" ? (
                          <CheckCircleSolidIcon className="h-6 w-6 text-green-500" />
                        ) : course.status === "in_progress" ? (
                          <PlayIcon className="h-6 w-6 text-blue-500" />
                        ) : course.status === "failed" ? (
                          <BookOpenIcon className="h-6 w-6 text-red-500" />
                        ) : (
                          <BookOpenIcon className={`h-6 w-6 ${statusInfo.textColor}`} />
                        )}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">{course.title}</h3>
                          <Badge variant={statusInfo.variant}>{t(statusInfo.labelKey as 'status.completed')}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{course.description}</p>
                        
                        {/* Progress bar for in-progress */}
                        {course.status === "in_progress" && course.progress?.attempts_count != null && (
                          <div className="mt-3">
                            <p className="text-xs text-muted-foreground">
                              {t('attemptsCount', { count: course.progress.attempts_count ?? 0 })}
                            </p>
                          </div>
                        )}

                        {/* Completed score */}
                        {course.status === "completed" && course.progress?.best_score != null && (
                          <p className="mt-2 text-sm text-green-600">
                            ✓ {t('passedWith', { score: course.progress.best_score })}
                          </p>
                        )}

                        {/* Failed - show last score */}
                        {course.status === "failed" && course.progress?.last_score != null && (
                          <p className="mt-2 text-sm text-red-600">
                            ✗ {t('failedWith', { score: course.progress.last_score, required: course.pass_score ?? 70 })}
                          </p>
                        )}

                        {/* Locked reason */}
                        {course.status === "locked" && course.lockedReason && (
                          <p className="mt-2 text-sm text-amber-600">🔒 {course.lockedReason}</p>
                        )}

                        {/* Meta */}
                        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                          {course.estimated_duration_minutes && (
                            <span className="flex items-center gap-1">
                              <ClockIcon className="h-3.5 w-3.5" />
                              {course.estimated_duration_minutes} min
                            </span>
                          )}
                          {course.rewards.xp && (
                            <span className="flex items-center gap-1">
                              <StarIcon className="h-3.5 w-3.5" />
                              +{course.rewards.xp} XP
                            </span>
                          )}
                          {course.rewards.dicecoin && (
                            <span className="flex items-center gap-1">
                              🪙 +{course.rewards.dicecoin} DiceCoin
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Arrow */}
                      {!isLocked && (
                        <ChevronRightIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
                      )}
                    </div>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
