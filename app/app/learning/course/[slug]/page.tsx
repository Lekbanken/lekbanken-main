'use client';

import { useState } from "react";
import Link from "next/link";
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

type CourseStep = "intro" | "content" | "quiz" | "results";

// TODO: Replace with real data from API
const mockCourse = {
  id: "1",
  title: "Introduktion till Lekbanken",
  slug: "intro-lekbanken",
  description: "Lär dig grunderna i hur Lekbanken fungerar och hur du som lekledare kan använda plattformen för att skapa engagerande lekstunder.",
  estimated_duration_minutes: 15,
  pass_threshold: 80,
  max_attempts: 3,
  content_blocks: [
    {
      type: "text",
      content: "Välkommen till Lekbanken! Denna plattform är designad för att hjälpa lekledare att organisera, planera och genomföra roliga och lärorika aktiviteter.",
    },
    {
      type: "text", 
      content: "Som lekledare har du tillgång till ett bibliotek med hundratals lekar, verktyg för att planera lekpass, och möjlighet att spåra deltagarnas framsteg.",
    },
    {
      type: "text",
      content: "I denna kurs kommer du lära dig de grundläggande funktionerna i Lekbanken, hur du navigerar i gränssnittet, och hur du kommer igång med din första aktivitet.",
    },
  ],
  quiz_questions: [
    {
      id: "q1",
      question: "Vad är huvudsyftet med Lekbanken?",
      options: [
        { id: "a", text: "Att sälja leksaker" },
        { id: "b", text: "Att hjälpa lekledare organisera aktiviteter" },
        { id: "c", text: "Att streama videor" },
        { id: "d", text: "Att boka lokaler" },
      ],
      correct_option: "b",
    },
    {
      id: "q2", 
      question: "Vad kan du hitta i Lekbankens bibliotek?",
      options: [
        { id: "a", text: "Böcker" },
        { id: "b", text: "Musik" },
        { id: "c", text: "Lekar och aktiviteter" },
        { id: "d", text: "Filmer" },
      ],
      correct_option: "c",
    },
    {
      id: "q3",
      question: "Vilket verktyg finns för att planera aktiviteter?",
      options: [
        { id: "a", text: "Kalender" },
        { id: "b", text: "Lekpass-planerare" },
        { id: "c", text: "E-post" },
        { id: "d", text: "Chatt" },
      ],
      correct_option: "b",
    },
  ],
  rewards: { xp: 50, coins: 10 },
};

export default function CourseRunnerPage() {
  const [step, setStep] = useState<CourseStep>("intro");
  const [currentContentIndex, setCurrentContentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState<{
    passed: boolean;
    score: number;
    correctCount: number;
    totalQuestions: number;
  } | null>(null);

  const course = mockCourse; // TODO: Fetch based on route params

  const handleStartCourse = () => {
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
    
    // Calculate score
    let correctCount = 0;
    course.quiz_questions.forEach((q) => {
      if (answers[q.id] === q.correct_option) {
        correctCount++;
      }
    });
    
    const score = Math.round((correctCount / course.quiz_questions.length) * 100);
    const passed = score >= course.pass_threshold;

    // Simulate API call
    await new Promise((r) => setTimeout(r, 1000));

    setResults({
      passed,
      score,
      correctCount,
      totalQuestions: course.quiz_questions.length,
    });
    setStep("results");
    setIsSubmitting(false);
  };

  const allQuestionsAnswered = course.quiz_questions.every((q) => answers[q.id]);
  const contentProgress = ((currentContentIndex + 1) / course.content_blocks.length) * 100;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      {/* Back link */}
      <Link
        href="/app/learning"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Tillbaka till utbildning
      </Link>

      {/* Intro Step */}
      {step === "intro" && (
        <Card>
          <CardHeader>
            <Badge variant="secondary" className="mb-2 w-fit">
              <ClockIcon className="mr-1 h-3 w-3" />
              {course.estimated_duration_minutes} min
            </Badge>
            <CardTitle className="text-2xl">{course.title}</CardTitle>
            <p className="text-muted-foreground">{course.description}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg bg-muted/50 p-4">
              <h3 className="font-medium">Kursinnehåll</h3>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li>• {course.content_blocks.length} läsavsnitt</li>
                <li>• {course.quiz_questions.length} quizfrågor</li>
                <li>• Godkäntgräns: {course.pass_threshold}%</li>
                {course.max_attempts && (
                  <li>• Max {course.max_attempts} försök</li>
                )}
              </ul>
            </div>

            <div className="flex items-center gap-4 rounded-lg border border-border p-4">
              <div className="flex items-center gap-2">
                <StarIcon className="h-5 w-5 text-amber-500" />
                <span className="font-medium">+{course.rewards.xp} XP</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">🪙</span>
                <span className="font-medium">+{course.rewards.coins} DiceCoin</span>
              </div>
            </div>

            <Button onClick={handleStartCourse} className="w-full" size="lg">
              Starta kurs
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Content Step */}
      {step === "content" && (
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
              <p className="text-lg leading-relaxed">
                {course.content_blocks[currentContentIndex].content}
              </p>
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={handlePrevContent}
                disabled={currentContentIndex === 0}
              >
                Föregående
              </Button>
              <Button onClick={handleNextContent}>
                {currentContentIndex === course.content_blocks.length - 1
                  ? "Gå till quiz"
                  : "Nästa"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quiz Step */}
      {step === "quiz" && (
        <Card>
          <CardHeader>
            <CardTitle>Quiz</CardTitle>
            <p className="text-sm text-muted-foreground">
              Besvara alla frågor för att slutföra kursen. Du behöver minst{" "}
              {course.pass_threshold}% rätt för att bli godkänd.
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
              {isSubmitting ? "Rättar..." : "Skicka in svar"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Results Step */}
      {step === "results" && results && (
        <Card>
          <CardContent className="py-12 text-center">
            {results.passed ? (
              <>
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
                  <CheckCircleSolidIcon className="h-12 w-12 text-green-500" />
                </div>
                <h2 className="mt-6 text-2xl font-bold text-green-600">Grattis! Du är godkänd!</h2>
                <p className="mt-2 text-muted-foreground">
                  Du fick {results.score}% rätt ({results.correctCount}/{results.totalQuestions} frågor)
                </p>

                <div className="mt-8 flex justify-center gap-6">
                  <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-4 py-2">
                    <StarIcon className="h-5 w-5 text-amber-500" />
                    <span className="font-bold">+{course.rewards.xp} XP</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-yellow-500/10 px-4 py-2">
                    <span className="text-xl">🪙</span>
                    <span className="font-bold">+{course.rewards.coins} DiceCoin</span>
                  </div>
                </div>

                <div className="mt-8 flex justify-center gap-4">
                  <Button href="/app/learning">Tillbaka till kurser</Button>
                </div>
              </>
            ) : (
              <>
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10">
                  <XCircleIcon className="h-12 w-12 text-red-500" />
                </div>
                <h2 className="mt-6 text-2xl font-bold text-red-600">Tyvärr, du blev inte godkänd</h2>
                <p className="mt-2 text-muted-foreground">
                  Du fick {results.score}% rätt, men behöver minst {course.pass_threshold}%.
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {results.correctCount}/{results.totalQuestions} rätta svar
                </p>

                <div className="mt-8 flex justify-center gap-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStep("intro");
                      setAnswers({});
                      setCurrentContentIndex(0);
                      setResults(null);
                    }}
                  >
                    Försök igen
                  </Button>
                  <Button variant="outline" href="/app/learning">
                    Tillbaka
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
