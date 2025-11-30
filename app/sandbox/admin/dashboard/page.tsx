'use client'

import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import {
  UsersIcon,
  PlayIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  BellIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'

// Mock stats data
const stats = [
  {
    name: 'Totalt användare',
    value: '2,847',
    change: '+12%',
    trend: 'up',
    icon: UsersIcon,
    color: 'primary',
  },
  {
    name: 'Aktiva idag',
    value: '423',
    change: '+8%',
    trend: 'up',
    icon: PlayIcon,
    color: 'accent',
  },
  {
    name: 'Genomförda lekar',
    value: '12,453',
    change: '+23%',
    trend: 'up',
    icon: ChartBarIcon,
    color: 'green',
  },
  {
    name: 'Månadens intäkt',
    value: '45,230 kr',
    change: '-3%',
    trend: 'down',
    icon: CurrencyDollarIcon,
    color: 'yellow',
  },
]

// Mock recent activity
const recentActivity = [
  { id: 1, type: 'user', message: 'Anna Svensson registrerade sig', time: '2 min sedan' },
  { id: 2, type: 'payment', message: 'Pro-uppgradering: Förskola Björken', time: '15 min sedan' },
  { id: 3, type: 'content', message: 'Ny aktivitet "Vinter-kurragömma" publicerad', time: '1 tim sedan' },
  { id: 4, type: 'support', message: 'Supportärende #1234 löst', time: '2 tim sedan' },
  { id: 5, type: 'alert', message: 'Serverbelastning över 80%', time: '3 tim sedan' },
]

// Mock alerts
const alerts = [
  { id: 1, type: 'warning', message: '3 användare behöver verifieras', action: 'Visa' },
  { id: 2, type: 'info', message: '5 nya supportärenden', action: 'Öppna' },
  { id: 3, type: 'success', message: 'Backup slutförd', action: 'Detaljer' },
]

function getActivityIcon(type: string) {
  switch (type) {
    case 'user':
      return <UsersIcon className="h-4 w-4 text-primary" />
    case 'payment':
      return <CurrencyDollarIcon className="h-4 w-4 text-green-500" />
    case 'content':
      return <PlayIcon className="h-4 w-4 text-accent" />
    case 'support':
      return <CheckCircleIcon className="h-4 w-4 text-blue-500" />
    case 'alert':
      return <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
    default:
      return <BellIcon className="h-4 w-4 text-gray-400" />
  }
}

export default function AdminDashboardSandbox() {
  return (
    <div className="min-h-screen bg-background">
      {/* Toolbar */}
      <div className="sticky top-0 z-50 border-b border-border bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a 
              href="/sandbox/admin" 
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Tillbaka
            </a>
            <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
          </div>
          <Badge variant="success">Implementerad</Badge>
        </div>
      </div>

      <div className="p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Stats Cards */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">KPI Stats Cards</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon
              return (
                <Card key={stat.name}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div
                        className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                          stat.color === 'primary'
                            ? 'bg-primary/10 text-primary'
                            : stat.color === 'accent'
                            ? 'bg-accent/20 text-accent'
                            : stat.color === 'green'
                            ? 'bg-green-100 text-green-600'
                            : 'bg-yellow-100 text-yellow-600'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div
                        className={`flex items-center gap-1 text-sm ${
                          stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {stat.trend === 'up' ? (
                          <ArrowTrendingUpIcon className="h-4 w-4" />
                        ) : (
                          <ArrowTrendingDownIcon className="h-4 w-4" />
                        )}
                        {stat.change}
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                      <div className="text-sm text-gray-500">{stat.name}</div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>

        {/* Charts Placeholder */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Charts Area</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Användartillväxt</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-200">
                  <div className="text-center text-gray-500">
                    <ChartBarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Line Chart - Användare över tid</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Aktivitetsfördelning</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-gradient-to-br from-accent/5 to-yellow-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-200">
                  <div className="text-center text-gray-500">
                    <ChartBarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Pie Chart - Kategorier</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Activity */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Activity Feed</h2>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClockIcon className="h-5 w-5 text-gray-400" />
                  Senaste aktivitet
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50"
                    >
                      <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 truncate">{activity.message}</p>
                        <p className="text-xs text-gray-500">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="ghost" className="w-full mt-4">
                  Visa all aktivitet
                </Button>
              </CardContent>
            </Card>
          </section>

          {/* Alerts */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Alerts & Notifications</h2>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BellIcon className="h-5 w-5 text-gray-400" />
                  Varningar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        alert.type === 'warning'
                          ? 'bg-yellow-50 border border-yellow-200'
                          : alert.type === 'info'
                          ? 'bg-blue-50 border border-blue-200'
                          : 'bg-green-50 border border-green-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <ExclamationTriangleIcon
                          className={`h-5 w-5 ${
                            alert.type === 'warning'
                              ? 'text-yellow-600'
                              : alert.type === 'info'
                              ? 'text-blue-600'
                              : 'text-green-600'
                          }`}
                        />
                        <span className="text-sm text-gray-900">{alert.message}</span>
                      </div>
                      <Button size="sm" variant="ghost">
                        {alert.action}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        </div>

        {/* Quick Actions */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Quick Actions</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-auto py-4 flex-col gap-2">
              <UsersIcon className="h-6 w-6" />
              <span>Lägg till användare</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2">
              <PlayIcon className="h-6 w-6" />
              <span>Skapa aktivitet</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2">
              <ChartBarIcon className="h-6 w-6" />
              <span>Exportera rapport</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2">
              <BellIcon className="h-6 w-6" />
              <span>Skicka notis</span>
            </Button>
          </div>
        </section>

        {/* Status Badges */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Admin Status Badges</h2>
          <div className="flex flex-wrap gap-2">
            <Badge variant="success">Aktiv</Badge>
            <Badge variant="warning">Pending</Badge>
            <Badge variant="destructive">Blocked</Badge>
            <Badge variant="primary">Admin</Badge>
            <Badge variant="accent">Moderator</Badge>
            <Badge variant="outline">Member</Badge>
            <Badge variant="default">Inaktiv</Badge>
          </div>
        </section>

        {/* Notes */}
        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Implementationsnoteringar</h2>
          <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-muted-foreground">
            <li>KPI-kort med trendindikator (up/down pil)</li>
            <li>Senaste aktivitet-feed med ikoner</li>
            <li>Snabbåtgärder med ikoner</li>
            <li>System-alerts med olika severity</li>
          </ul>

          <p className="mt-6 text-xs text-muted-foreground">Senast uppdaterad: 2024-11-30</p>
        </div>
        </div>
      </div>
    </div>
  )
}
