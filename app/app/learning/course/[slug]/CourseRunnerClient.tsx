'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from 'next-intl';
import {
  ArrowLeftIcon,
  XCircleIcon,
  ClockIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolidIcon } from "@heroicons/react/24/solid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { submitQuizAnswers, startCourseAttempt } from '@/app/actions/learning';
import { AchievementUnlockCelebration } from '@/features/gamification/components/AchievementUnlockCelebration';
import type { CourseRunnerData } from '@/app/actions/learning';
import type { Achievement } from '@/features/gamification/types';

type CourseStep = "intro" | "content" | "quiz" | "results";

interface CourseRunnerClientProps {
  course: CourseRunnerData;
  tenantId?: string;
}

export function CourseRunnerClient({ course, tenantId }: CourseRunnerClientProps) {
  const t = useTranslations('app.learning.runner');
  const [step, setStep] = useState<CourseStep>("intro");
  const [currentContentIndex, setCurrentContentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [unlockedAchievement, setUnlockedAchievement] = useState<Achievement | null>(null);
  const [results, setResults] = useState<{
    passed: boolean;
    score: number;
    correctCount: number;
    totalQuestions: number;
    rewards?: {
      dicecoin: number;
      xp: number;
      achievement?: string;
      levelUp: boolean;
    };
  } | null>(null);

  // Fetch achievement details when unlocked
  useEffect(() => {
    if (results?.rewards?.achievement && tenantId) {
      fetch(`/api/gamification/achievement/${results.rewards.achievement}?tenantId=${tenantId}`)
        .then(res => res.json())
        .then(data => {
          if (data.achievement) {
            setUnlockedAchievement(data.achievement);
          }
        })
        .catch(console.error);
    }
  }, [results?.rewards?.achievement, tenantId]);

  const handleStartCourse = async () => {
    // Create an attempt record
    const result = await startCourseAttempt(course.id, tenantId ?? null);
    if (result.success && result.attemptId) {
      setAttemptId(result.attemptId);
    }
    setStep("content");
  };

  const handleNextContent = () => {
    if (currentContentIndex < course.content_blocks.length - 1) {
      setCurrentContentIndex((prev) => prev + 1);
    } else {
      setStep("quiz");
    }
  };

  const handlePrevContent = () => {
    if (currentContentIndex > 0) {
      setCurrentContentIndex((prev) => prev - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    setIsSubmitting(true);
    
    // Create attempt if we don't have one yet
    let currentAttemptId = attemptId;
    if (!currentAttemptId) {
      const attemptResult = await startCourseAttempt(course.id, tenantId ?? null);
      if (attemptResult.success && attemptResult.attemptId) {
        currentAttemptId = attemptResult.attemptId;
        setAttemptId(currentAttemptId);
      } else {
        console.error('Failed to create attempt:', attemptResult.error);
        setIsSubmitting(false);
        return;
      }
    }
    
    // Convert answers to format expected by server action
    const formattedAnswers = Object.entries(answers).map(([questionId, optionId]) => ({
      questionId,
      selectedOptionIds: [optionId],
    }));

    const result = await submitQuizAnswers(
      course.id,
      tenantId ?? null,
      currentAttemptId,
      formattedAnswers
    );

    if (result.success) {
      // Calculate correct count from score
      const correctCount = Math.round((result.score / 100) * course.quiz_questions.length);
      
      setResults({
        passed: result.passed,
        score: result.score,
        correctCount,
        totalQuestions: course.quiz_questions.length,
        rewards: result.rewards,
      });
      setStep("results");
    }
    
    setIsSubmitting(false);
  };

  const allQuestionsAnswered = course.quiz_questions.every((q) => answers[q.id]);
  const contentProgress = course.content_blocks.length > 0 
    ? ((currentContentIndex + 1) / course.content_blocks.length) * 100 
    : 100;

  // If course has no content blocks, skip directly to quiz
  const hasContent = course.content_blocks.length > 0;
  const hasQuiz = course.quiz_questions.length > 0;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      {/* Back link */}
      <Link
        href="/app/learning"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        {t('backToLearning')}
      </Link>

      {/* Intro Step */}
      {step === "intro" && (
        <Card>
          <CardHeader>
            {course.estimated_duration_minutes && (
              <Badge variant="secondary" className="mb-2 w-fit">
                <ClockIcon className="mr-1 h-3 w-3" />
                {course.estimated_duration_minutes} min
              </Badge>
            )}
            <CardTitle className="text-2xl">{course.title}</CardTitle>
            <p className="text-muted-foreground">{course.description}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg bg-muted/50 p-4">
              <h3 className="font-medium">{t('courseContent')}</h3>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {hasContent && <li>• {course.content_blocks.length} {t('readingSections')}</li>}
                {hasQuiz && <li>• {course.quiz_questions.length} {t('quizQuestions')}</li>}
                <li>• {t('passThreshold')}: {course.pass_score}%</li>
              </ul>
            </div>

            <div className="flex items-center gap-4 rounded-lg border border-border p-4">
              {course.rewards.xp && (
                <div className="flex items-center gap-2">
                  <StarIcon className="h-5 w-5 text-amber-500" />
                  <span className="font-medium">+{course.rewards.xp} XP</span>
                </div>
              )}
              {course.rewards.dicecoin && (
                <div className="flex items-center gap-2">
                  <span className="text-lg">🪙</span>
                  <span className="font-medium">+{course.rewards.dicecoin} DiceCoin</span>
                </div>
              )}
            </div>

            {course.userProgress?.status === 'completed' && (
              <div className="rounded-lg bg-green-500/10 p-4 text-center">
                <CheckCircleSolidIcon className="mx-auto h-8 w-8 text-green-500" />
                <p className="mt-2 font-medium text-green-700">
                  {t('alreadyCompleted', { score: course.userProgress.best_score ?? 0 })}
                </p>
              </div>
            )}

            <Button onClick={handleStartCourse} className="w-full" size="lg">
              {course.userProgress?.status === 'completed' ? t('retakeCourse') : t('startCourse')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Content Step */}
      {step === "content" && hasContent && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{course.title}</CardTitle>
              <Badge variant="outline">
                {currentContentIndex + 1} / {course.content_blocks.length}
              </Badge>
            </div>
            <Progress value={contentProgress} className="mt-2 h-1" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="min-h-[200px] rounded-lg bg-muted/30 p-6">
              {course.content_blocks[currentContentIndex]?.title && (
                <h3 className="mb-4 text-xl font-semibold">
                  {course.content_blocks[currentContentIndex].title}
                </h3>
              )}
              <p className="text-lg leading-relaxed whitespace-pre-wrap">
                {course.content_blocks[currentContentIndex]?.content}
              </p>
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={handlePrevContent}
                disabled={currentContentIndex === 0}
              >
                {t('previous')}
              </Button>
              <Button onClick={handleNextContent}>
                {currentContentIndex === course.content_blocks.length - 1
                  ? hasQuiz ? t('goToQuiz') : t('finish')
                  : t('next')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quiz Step */}
      {step === "quiz" && hasQuiz && (
        <Card>
          <CardHeader>
            <CardTitle>{t('quiz')}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t('quizInstructions', { threshold: course.pass_score ?? 70 })}
            </p>
          </CardHeader>
          <CardContent className="space-y-8">
            {course.quiz_questions.map((question, idx) => (
              <div key={question.id} className="space-y-3">
                <h3 className="font-medium">
                  {idx + 1}. {question.question}
                </h3>
                <div className="space-y-2">
                  {question.options.map((option) => (
                    <label
                      key={option.id}
                      className={`flex cursor-pointer items-center space-x-3 rounded-lg border p-3 transition-colors hover:bg-muted/30 ${
                        answers[question.id] === option.id
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      }`}
                    >
                      <input
                        type="radio"
                        name={question.id}
                        value={option.id}
                        checked={answers[question.id] === option.id}
                        onChange={(e) =>
                          setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))
                        }
                        className="h-4 w-4 text-primary"
                      />
                      <span className="flex-1">{option.text}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <Button
              onClick={handleSubmitQuiz}
              disabled={!allQuestionsAnswered || isSubmitting}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? t('grading') : t('submitAnswers')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* No quiz - auto complete after content */}
      {step === "content" && !hasContent && hasQuiz && (() => {
        // If no content, go directly to quiz
        setStep("quiz");
        return null;
      })()}

      {/* Results Step */}
      {step === "results" && results && (
        <Card>
          <CardContent className="py-12 text-center">
            {results.passed ? (
              <>
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
                  <CheckCircleSolidIcon className="h-12 w-12 text-green-500" />
                </div>
                <h2 className="mt-6 text-2xl font-bold text-green-600">{t('passed.title')}</h2>
                <p className="mt-2 text-muted-foreground">
                  {t('passed.score', { score: results.score, correct: results.correctCount, total: results.totalQuestions })}
                </p>

                {results.rewards && (results.rewards.xp > 0 || results.rewards.dicecoin > 0) && (
                  <div className="mt-8 flex justify-center gap-6">
                    {results.rewards.xp > 0 && (
                      <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-4 py-2">
                        <StarIcon className="h-5 w-5 text-amber-500" />
                        <span className="font-bold">+{results.rewards.xp} XP</span>
                      </div>
                    )}
                    {results.rewards.dicecoin > 0 && (
                      <div className="flex items-center gap-2 rounded-lg bg-yellow-500/10 px-4 py-2">
                        <span className="text-xl">🪙</span>
                        <span className="font-bold">+{results.rewards.dicecoin} DiceCoin</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-8 flex justify-center gap-4">
                  <Button href="/app/learning">{t('backToCourses')}</Button>
                </div>
              </>
            ) : (
              <>
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10">
                  <XCircleIcon className="h-12 w-12 text-red-500" />
                </div>
                <h2 className="mt-6 text-2xl font-bold text-red-600">{t('failed.title')}</h2>
                <p className="mt-2 text-muted-foreground">
                  {t('failed.score', { score: results.score, threshold: course.pass_score ?? 70 })}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {results.correctCount}/{results.totalQuestions} {t('correctAnswers')}
                </p>

                <div className="mt-8 flex justify-center gap-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStep("intro");
                      setAnswers({});
                      setCurrentContentIndex(0);
                      setResults(null);
                      setAttemptId(null);
                    }}
                  >
                    {t('tryAgain')}
                  </Button>
                  <Button variant="outline" href="/app/learning">
                    {t('back')}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Achievement Celebration Modal */}
      <AchievementUnlockCelebration
        achievement={unlockedAchievement}
        onClose={() => setUnlockedAchievement(null)}
      />
    </div>
  );
}
