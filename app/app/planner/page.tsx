'use client'

import { useState } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Input } from '@/components/ui'
import {
  CalendarDaysIcon,
  ClockIcon,
  PlusIcon,
  CheckCircleIcon,
  TrashIcon,
  PlayIcon,
  PencilIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid'

// Types
interface Goal {
  id: string
  title: string
  description?: string
  dueDate?: string
  priority: 'low' | 'medium' | 'high'
  completed: boolean
  progress: number
  category: string
}

interface PlannedActivity {
  id: string
  name: string
  time: string
  duration: number
  status: 'pending' | 'active' | 'completed'
}

// Mock data
const mockGoals: Goal[] = [
  {
    id: '1',
    title: 'Genomför 5 utomhusaktiviteter',
    description: 'Ta gruppen utomhus minst 5 gånger denna vecka',
    dueDate: '2025-02-07',
    priority: 'high',
    completed: false,
    progress: 60,
    category: 'Aktiviteter',
  },
  {
    id: '2',
    title: 'Prova 3 nya lekar',
    description: 'Introducera nya aktiviteter för barnen',
    dueDate: '2025-02-05',
    priority: 'medium',
    completed: false,
    progress: 33,
    category: 'Utforskning',
  },
  {
    id: '3',
    title: 'Samarbetsövningar',
    description: 'Fokusera på teambuilding-aktiviteter',
    priority: 'low',
    completed: true,
    progress: 100,
    category: 'Samarbete',
  },
]

const mockSchedule: PlannedActivity[] = [
  { id: '1', name: 'Morgonsamling', time: '09:00', duration: 15, status: 'completed' },
  { id: '2', name: 'Utomhuslek: Kurragömma', time: '10:00', duration: 30, status: 'active' },
  { id: '3', name: 'Kreativ stund', time: '11:00', duration: 45, status: 'pending' },
  { id: '4', name: 'Lunch & vila', time: '12:00', duration: 60, status: 'pending' },
  { id: '5', name: 'Fri lek', time: '14:00', duration: 60, status: 'pending' },
]

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'high':
      return 'destructive'
    case 'medium':
      return 'warning'
    case 'low':
      return 'success'
    default:
      return 'default'
  }
}

function getPriorityLabel(priority: string) {
  switch (priority) {
    case 'high':
      return 'Hög'
    case 'medium':
      return 'Medel'
    case 'low':
      return 'Låg'
    default:
      return priority
  }
}

export default function PlannerPage() {
  const [goals, setGoals] = useState<Goal[]>(mockGoals)
  const [schedule] = useState<PlannedActivity[]>(mockSchedule)
  const [showAddGoal, setShowAddGoal] = useState(false)
  const [newGoalTitle, setNewGoalTitle] = useState('')

  const toggleGoalComplete = (goalId: string) => {
    setGoals(
      goals.map((goal) =>
        goal.id === goalId
          ? { ...goal, completed: !goal.completed, progress: !goal.completed ? 100 : goal.progress }
          : goal
      )
    )
  }

  const handleAddGoal = () => {
    if (!newGoalTitle.trim()) return
    const newGoal: Goal = {
      id: Date.now().toString(),
      title: newGoalTitle,
      priority: 'medium',
      completed: false,
      progress: 0,
      category: 'Nytt',
    }
    setGoals([...goals, newGoal])
    setNewGoalTitle('')
    setShowAddGoal(false)
  }

  const completedGoals = goals.filter((g) => g.completed).length
  const activeActivity = schedule.find((a) => a.status === 'active')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planerare</h1>
          <p className="text-gray-600 mt-1">Planera dagen och sätt upp mål</p>
        </div>
        <Button onClick={() => setShowAddGoal(true)}>
          <PlusIcon className="h-4 w-4 mr-1" />
          Nytt mål
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{goals.length}</div>
            <div className="text-sm text-gray-600">Totalt mål</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-500">{completedGoals}</div>
            <div className="text-sm text-gray-600">Avklarade</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-accent">{schedule.length}</div>
            <div className="text-sm text-gray-600">Aktiviteter idag</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-500">
              {schedule.filter((a) => a.status === 'completed').length}
            </div>
            <div className="text-sm text-gray-600">Genomförda</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Goals Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircleIcon className="h-5 w-5 text-primary" />
              Mina mål
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Add Goal Form */}
            {showAddGoal && (
              <div className="p-3 bg-gray-50 rounded-lg space-y-2 border border-gray-200">
                <Input
                  placeholder="Skriv ditt nya mål..."
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddGoal()}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddGoal}>
                    Lägg till
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowAddGoal(false)}>
                    Avbryt
                  </Button>
                </div>
              </div>
            )}

            {/* Goals List */}
            {goals.map((goal) => (
              <div
                key={goal.id}
                className={`p-3 rounded-lg border transition-all ${
                  goal.completed
                    ? 'bg-green-50 border-green-200'
                    : 'bg-white border-gray-200 hover:border-primary/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleGoalComplete(goal.id)}
                    className="mt-0.5 flex-shrink-0"
                  >
                    {goal.completed ? (
                      <CheckCircleSolidIcon className="h-5 w-5 text-green-500" />
                    ) : (
                      <CheckCircleIcon className="h-5 w-5 text-gray-400 hover:text-primary" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`font-medium ${
                          goal.completed ? 'text-gray-500 line-through' : 'text-gray-900'
                        }`}
                      >
                        {goal.title}
                      </span>
                      <Badge
                        variant={getPriorityColor(goal.priority) as 'destructive' | 'warning' | 'success' | 'default'}
                        size="sm"
                      >
                        {getPriorityLabel(goal.priority)}
                      </Badge>
                    </div>
                    {goal.description && (
                      <p className="text-sm text-gray-500 mt-1">{goal.description}</p>
                    )}
                    {!goal.completed && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-500">Progress</span>
                          <span className="text-primary font-medium">{goal.progress}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${goal.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {goal.dueDate && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                        <CalendarDaysIcon className="h-3 w-3" />
                        {new Date(goal.dueDate).toLocaleDateString('sv-SE')}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button className="p-1 text-gray-400 hover:text-primary">
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button className="p-1 text-gray-400 hover:text-red-500">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Schedule Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ClockIcon className="h-5 w-5 text-accent" />
                Dagens schema
              </CardTitle>
              <Badge variant="primary">
                {new Date().toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'short' })}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {schedule.map((activity, index) => {
              const isActive = activity.status === 'active'
              const isCompleted = activity.status === 'completed'

              return (
                <div
                  key={activity.id}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20'
                      : isCompleted
                      ? 'bg-gray-50 opacity-60'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  {/* Time */}
                  <div className="text-sm font-medium text-gray-600 w-12">
                    {activity.time}
                  </div>

                  {/* Timeline Dot */}
                  <div className="relative flex flex-col items-center">
                    <div
                      className={`h-3 w-3 rounded-full ${
                        isActive
                          ? 'bg-primary animate-pulse'
                          : isCompleted
                          ? 'bg-green-500'
                          : 'bg-gray-300'
                      }`}
                    />
                    {index < schedule.length - 1 && (
                      <div className="w-0.5 h-6 bg-gray-200 absolute top-4" />
                    )}
                  </div>

                  {/* Activity Info */}
                  <div className="flex-1">
                    <div className={`font-medium ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                      {activity.name}
                    </div>
                    <div className="text-xs text-gray-500">{activity.duration} min</div>
                  </div>

                  {/* Status/Action */}
                  {isActive ? (
                    <Badge variant="primary" className="flex items-center gap-1">
                      <PlayIcon className="h-3 w-3" />
                      Pågår
                    </Badge>
                  ) : isCompleted ? (
                    <CheckCircleSolidIcon className="h-5 w-5 text-green-500" />
                  ) : (
                    <div className="flex gap-1">
                      <button className="p-1 text-gray-400 hover:text-gray-600">
                        <ChevronUpIcon className="h-4 w-4" />
                      </button>
                      <button className="p-1 text-gray-400 hover:text-gray-600">
                        <ChevronDownIcon className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Add Activity Button */}
            <button className="w-full p-3 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2">
              <PlusIcon className="h-5 w-5" />
              Lägg till aktivitet
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Currently Active Banner */}
      {activeActivity && (
        <Card className="bg-gradient-to-r from-primary to-accent text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                  <PlayIcon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm text-white/80">Pågående aktivitet</div>
                  <div className="font-semibold text-lg">{activeActivity.name}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-white/80">Tid kvar</div>
                <div className="font-semibold">{activeActivity.duration} min</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
