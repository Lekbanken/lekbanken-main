'use client'

import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
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

// Stats data
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

// Recent activity
const recentActivity = [
  { id: 1, type: 'user', message: 'Anna Svensson registrerade sig', time: '2 min sedan' },
  { id: 2, type: 'payment', message: 'Pro-uppgradering: Förskola Björken', time: '15 min sedan' },
  { id: 3, type: 'content', message: 'Ny aktivitet "Vinter-kurragömma" publicerad', time: '1 tim sedan' },
  { id: 4, type: 'support', message: 'Supportärende #1234 löst', time: '2 tim sedan' },
  { id: 5, type: 'alert', message: 'Serverbelastning över 80%', time: '3 tim sedan' },
]

// Alerts
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
      return <BellIcon className="h-4 w-4 text-muted-foreground" />
  }
}

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Välkommen tillbaka! Här är en översikt.</p>
      </div>

      {/* Stats Cards */}
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
                  <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.name}</div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts Placeholder */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Användartillväxt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg flex items-center justify-center border-2 border-dashed border-border">
              <div className="text-center text-muted-foreground">
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
            <div className="h-64 bg-gradient-to-br from-accent/5 to-yellow-50 rounded-lg flex items-center justify-center border-2 border-dashed border-border">
              <div className="text-center text-muted-foreground">
                <ChartBarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Pie Chart - Kategorier</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-muted-foreground" />
              Senaste aktivitet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted"
                >
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="ghost" className="w-full mt-4">
              Visa all aktivitet
            </Button>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BellIcon className="h-5 w-5 text-muted-foreground" />
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
                    <span className="text-sm text-foreground">{alert.message}</span>
                  </div>
                  <Button size="sm" variant="ghost">
                    {alert.action}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Snabbåtgärder</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  )
}
