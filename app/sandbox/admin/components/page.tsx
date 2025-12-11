'use client'

import { useState } from 'react'
import { ChartBarIcon, UsersIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline'
import { AdminCard, AdminEmptyState, AdminErrorState, AdminFilterSelect } from '@/components/admin/shared/AdminStates'
import { AdminStatCard, AdminStatGrid } from '@/components/admin/shared/AdminStatCard'

export default function AdminComponentsSandbox() {
  const [filter, setFilter] = useState('')

  return (
    <div className="space-y-8 p-6 md:p-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Admin Components</h1>
        <p className="text-muted-foreground">Stat cards, tom-/felvyer och kortlayout för admin.</p>
      </div>

      <AdminStatGrid cols={3}>
        <AdminStatCard
          label="Aktiva användare"
          value="2 847"
          change="+12%"
          trend="up"
          icon={<UsersIcon className="h-5 w-5" />}
          iconColor="blue"
          subtitle="Senaste 30 dagarna"
        />
        <AdminStatCard
          label="MRR"
          value="124 500 kr"
          change="+3.4%"
          trend="up"
          icon={<CurrencyDollarIcon className="h-5 w-5" />}
          iconColor="green"
          subtitle="Senaste månaden"
        />
        <AdminStatCard
          label="Churn"
          value="1.8%"
          change="+0.2%"
          trend="down"
          icon={<ChartBarIcon className="h-5 w-5" />}
          iconColor="amber"
          subtitle="Övervakad"
        />
      </AdminStatGrid>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminCard
          title="Filter + tomvy"
          description="Så här ser filter + tom state ut."
          actions={
            <AdminFilterSelect
              label="Status"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'active', label: 'Aktiv' },
                { value: 'inactive', label: 'Inaktiv' },
              ]}
              placeholder="Alla"
            />
          }
        >
          <AdminEmptyState
            title="Inga poster"
            description="Bjud in användare eller skapa en post för att komma igång."
            action={{ label: 'Skapa', onClick: () => alert('Skapa post') }}
            secondaryAction={{ label: 'Lär mer', onClick: () => alert('Läs mer') }}
          />
        </AdminCard>

        <AdminCard
          title="Felstate"
          description="Standard felkomponent för admin."
        >
          <AdminErrorState
            title="Kunde inte ladda data"
            description="Testa att ladda om sidan eller kontrollera anslutning."
            onRetry={() => alert('Försök igen')}
          />
        </AdminCard>
      </div>
    </div>
  )
}
