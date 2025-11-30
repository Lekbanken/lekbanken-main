'use client'

import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  UsersIcon,
  CurrencyDollarIcon,
  PlayIcon,
  ClockIcon,
  GlobeAltIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { useState } from 'react'

const PERIOD_OPTIONS = [
  { value: '7d', label: 'Senaste 7 dagarna' },
  { value: '30d', label: 'Senaste 30 dagarna' },
  { value: '90d', label: 'Senaste 90 dagarna' },
  { value: '1y', label: 'Senaste året' },
]

const METRICS = [
  {
    label: 'Totala användare',
    value: '12,847',
    change: '+12.5%',
    trend: 'up',
    icon: UsersIcon,
    color: 'text-blue-600 bg-blue-100',
  },
  {
    label: 'Aktiva sessioner',
    value: '3,241',
    change: '+8.3%',
    trend: 'up',
    icon: PlayIcon,
    color: 'text-green-600 bg-green-100',
  },
  {
    label: 'Genomsnittlig speltid',
    value: '24 min',
    change: '-2.1%',
    trend: 'down',
    icon: ClockIcon,
    color: 'text-purple-600 bg-purple-100',
  },
  {
    label: 'Intäkter',
    value: '45,230 kr',
    change: '+18.7%',
    trend: 'up',
    icon: CurrencyDollarIcon,
    color: 'text-yellow-600 bg-yellow-100',
  },
]

const TRAFFIC_DATA = [
  { label: 'Mån', value: 65 },
  { label: 'Tis', value: 78 },
  { label: 'Ons', value: 82 },
  { label: 'Tor', value: 71 },
  { label: 'Fre', value: 89 },
  { label: 'Lör', value: 95 },
  { label: 'Sön', value: 88 },
]

const TOP_GAMES = [
  { name: 'Minneslek', plays: 4521, avgTime: '8 min', rating: 4.8 },
  { name: 'Ordjakten', plays: 3892, avgTime: '12 min', rating: 4.6 },
  { name: 'Pusselmania', plays: 3456, avgTime: '15 min', rating: 4.7 },
  { name: 'Matteknep', plays: 2987, avgTime: '10 min', rating: 4.5 },
  { name: 'Quiz Battle', plays: 2654, avgTime: '6 min', rating: 4.4 },
]

const DEVICE_DATA = [
  { device: 'Mobil', percentage: 58, icon: DevicePhoneMobileIcon },
  { device: 'Desktop', percentage: 32, icon: ComputerDesktopIcon },
  { device: 'Tablet', percentage: 10, icon: DevicePhoneMobileIcon },
]

const GEO_DATA = [
  { country: 'Sverige', users: 8420, percentage: 65.5 },
  { country: 'Norge', users: 2156, percentage: 16.8 },
  { country: 'Danmark', users: 1287, percentage: 10.0 },
  { country: 'Finland', users: 642, percentage: 5.0 },
  { country: 'Övriga', users: 342, percentage: 2.7 },
]

export default function AnalyticsSandboxPage() {
  const [period, setPeriod] = useState('30d')

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
            <h1 className="text-lg font-semibold text-foreground">Analytics</h1>
          </div>
          <Badge variant="success">Implementerad</Badge>
        </div>
      </div>

      <div className="p-8">
        <div className="mx-auto max-w-7xl space-y-8">
          {/* Period selector */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <Select
                options={PERIOD_OPTIONS}
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              />
              <Button variant="outline">
                <CalendarIcon className="h-4 w-4 mr-2" />
                Anpassad period
            </Button>
            <Button>
              Exportera rapport
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {METRICS.map((metric) => (
            <Card key={metric.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-lg ${metric.color}`}>
                    <metric.icon className="h-6 w-6" />
                  </div>
                  <div className={`flex items-center gap-1 text-sm font-medium ${
                    metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {metric.trend === 'up' ? (
                      <ArrowTrendingUpIcon className="h-4 w-4" />
                    ) : (
                      <ArrowTrendingDownIcon className="h-4 w-4" />
                    )}
                    {metric.change}
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                  <p className="text-sm text-gray-600">{metric.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Traffic Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">Trafik över tid</h3>
                  <p className="text-sm text-gray-600">Antal aktiva användare per dag</p>
                </div>
                <Badge variant="success">Live</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {/* Simple bar chart visualization */}
              <div className="flex items-end justify-between h-48 gap-2">
                {TRAFFIC_DATA.map((day) => (
                  <div key={day.label} className="flex flex-col items-center gap-2 flex-1">
                    <div 
                      className="w-full bg-primary/80 rounded-t-lg transition-all hover:bg-primary"
                      style={{ height: `${day.value}%` }}
                    />
                    <span className="text-xs text-gray-600">{day.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                <span>Totalt denna vecka: 5,680 sessioner</span>
                <span className="text-green-600">+12% från förra veckan</span>
              </div>
            </CardContent>
          </Card>

          {/* Device Distribution */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-lg">Enhetsfördelning</h3>
              <p className="text-sm text-gray-600">Användare per enhetstyp</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {DEVICE_DATA.map((item) => (
                  <div key={item.device} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <item.icon className="h-5 w-5 text-gray-600" />
                        <span className="text-sm font-medium">{item.device}</span>
                      </div>
                      <span className="text-sm text-gray-600">{item.percentage}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Top Games */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">Populäraste spelen</h3>
                  <p className="text-sm text-gray-600">Baserat på antal spelningar</p>
                </div>
                <Button variant="ghost" size="sm">Visa alla</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {TOP_GAMES.map((game, index) => (
                  <div 
                    key={game.name}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700' :
                        index === 1 ? 'bg-gray-100 text-gray-700' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-50 text-gray-600'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{game.name}</p>
                        <p className="text-xs text-gray-500">{game.avgTime} genomsnittlig tid</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">{game.plays.toLocaleString()}</p>
                      <div className="flex items-center gap-1 text-xs text-yellow-600">
                        ⭐ {game.rating}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Geographic Distribution */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GlobeAltIcon className="h-5 w-5 text-gray-600" />
                  <div>
                    <h3 className="font-semibold text-lg">Geografisk fördelning</h3>
                    <p className="text-sm text-gray-600">Användare per land</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {GEO_DATA.map((item) => (
                  <div key={item.country} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.country}</span>
                      <span className="text-gray-600">
                        {item.users.toLocaleString()} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-accent rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Totalt antal länder</span>
                  <span className="font-semibold">28</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Real-time Stats */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <h3 className="font-semibold text-lg">Realtidsstatistik</h3>
              </div>
              <span className="text-sm text-gray-600">Uppdateras var 30:e sekund</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">247</p>
                <p className="text-sm text-gray-600">Online just nu</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-accent">89</p>
                <p className="text-sm text-gray-600">Aktiva spel</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-yellow-500">12</p>
                <p className="text-sm text-gray-600">Nya användare (idag)</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">98.7%</p>
                <p className="text-sm text-gray-600">Tillgänglighet</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Implementationsnoteringar</h2>
          <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-muted-foreground">
            <li>KPI-kort med trendindikator</li>
            <li>Periodväljare (7d, 30d, 90d, 12m)</li>
            <li>Geografisk fördelning</li>
            <li>Realtidsdata med live-indikator</li>
          </ul>

          <p className="mt-6 text-xs text-muted-foreground">Senast uppdaterad: 2024-11-30</p>
        </div>
        </div>
      </div>
    </div>
  )
}
