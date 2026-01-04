'use client';

import Link from "next/link";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// TODO: Replace with real data from server actions
const mockUserProgress = {
  coursesCompleted: 1,
  totalCourses: 3,
  pathsCompleted: 0,
  totalPaths: 1,
  xpEarned: 150,
  achievementsUnlocked: 2,
};

const mockCourses = [
  {
    id: "1",
    title: "Introduktion till Lekbanken",
    slug: "intro-lekbanken",
    description: "Lär dig grunderna i hur Lekbanken fungerar.",
    estimated_duration_minutes: 15,
    status: "completed",
    score: 95,
    completedAt: "2025-01-03T14:30:00Z",
    rewards: { xp: 50, coins: 10 },
  },
  {
    id: "2",
    title: "Säkerhet och Trygghet",
    slug: "sakerhet-trygghet",
    description: "Viktiga riktlinjer för en trygg lekmiljö.",
    estimated_duration_minutes: 20,
    status: "in-progress",
    progress: 60,
    rewards: { xp: 75, coins: 15 },
  },
  {
    id: "3",
    title: "Avancerade Lektekniker",
    slug: "avancerade-lektekniker",
    description: "Fördjupning i pedagogiska lekmetoder.",
    estimated_duration_minutes: 30,
    status: "locked",
    lockedReason: "Slutför 'Säkerhet och Trygghet' först",
    rewards: { xp: 100, coins: 25 },
  },
];

const mockPath = {
  id: "1",
  name: "Lekledarutbildning Grundnivå",
  description: "Komplett grundutbildning för nya lekledare.",
  progress: 33,
  coursesCompleted: 1,
  totalCourses: 3,
};

const statusConfig = {
  completed: { 
    label: "Avklarad", 
    variant: "default" as const, 
    bgColor: "bg-green-500/10",
    textColor: "text-green-600",
  },
  "in-progress": { 
    label: "Pågår", 
    variant: "secondary" as const,
    bgColor: "bg-blue-500/10",
    textColor: "text-blue-600",
  },
  locked: { 
    label: "Låst", 
    variant: "outline" as const,
    bgColor: "bg-muted",
    textColor: "text-muted-foreground",
  },
  available: { 
    label: "Tillgänglig", 
    variant: "outline" as const,
    bgColor: "bg-primary/10",
    textColor: "text-primary",
  },
};

export default function LearningDashboardPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <AcademicCapIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Min Utbildning</h1>
            <p className="text-muted-foreground">Följ din framsteg och slutför kurser</p>
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
                {mockUserProgress.coursesCompleted}/{mockUserProgress.totalCourses}
              </p>
              <p className="text-xs text-muted-foreground">Kurser klara</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <MapIcon className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xl font-bold">
                {mockUserProgress.pathsCompleted}/{mockUserProgress.totalPaths}
              </p>
              <p className="text-xs text-muted-foreground">Lärstigar</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <StarIcon className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xl font-bold">{mockUserProgress.xpEarned}</p>
              <p className="text-xs text-muted-foreground">XP intjänade</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
              <TrophyIcon className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-xl font-bold">{mockUserProgress.achievementsUnlocked}</p>
              <p className="text-xs text-muted-foreground">Prestationer</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Path */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <MapIcon className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-lg">{mockPath.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{mockPath.description}</p>
              </div>
            </div>
            <Badge variant="secondary">
              {mockPath.coursesCompleted}/{mockPath.totalCourses} kurser
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Framsteg</span>
              <span className="font-medium">{mockPath.progress}%</span>
            </div>
            <Progress value={mockPath.progress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Courses */}
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <BookOpenIcon className="h-5 w-5" />
          Kurser
        </h2>

        {mockCourses.map((course) => {
          const statusInfo = statusConfig[course.status as keyof typeof statusConfig];
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
                      ) : course.status === "in-progress" ? (
                        <PlayIcon className="h-6 w-6 text-blue-500" />
                      ) : (
                        <BookOpenIcon className={`h-6 w-6 ${statusInfo.textColor}`} />
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{course.title}</h3>
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{course.description}</p>
                      
                      {/* Progress bar for in-progress */}
                      {course.status === "in-progress" && course.progress !== undefined && (
                        <div className="mt-3">
                          <Progress value={course.progress} className="h-1.5" />
                          <p className="mt-1 text-xs text-muted-foreground">{course.progress}% klart</p>
                        </div>
                      )}

                      {/* Locked reason */}
                      {course.status === "locked" && course.lockedReason && (
                        <p className="mt-2 text-sm text-amber-600">🔒 {course.lockedReason}</p>
                      )}

                      {/* Completed score */}
                      {course.status === "completed" && course.score !== undefined && (
                        <p className="mt-2 text-sm text-green-600">
                          ✓ Godkänd med {course.score}%
                        </p>
                      )}

                      {/* Meta */}
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <ClockIcon className="h-3.5 w-3.5" />
                          {course.estimated_duration_minutes} min
                        </span>
                        <span className="flex items-center gap-1">
                          <StarIcon className="h-3.5 w-3.5" />
                          +{course.rewards.xp} XP
                        </span>
                        <span className="flex items-center gap-1">
                          🪙 +{course.rewards.coins} mynt
                        </span>
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
    </div>
  );
}
