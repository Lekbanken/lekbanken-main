'use client'

import { useState } from 'react'
import { ChartBarIcon, UsersIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline'
import { AdminCard, AdminEmptyState, AdminErrorState, AdminFilterSelect } from '@/components/admin/shared/AdminStates'
import { AdminStatCard, AdminStatGrid } from '@/components/admin/shared/AdminStatCard'
import { SandboxShell as SandboxShellV2 } from '../../components/shell/SandboxShellV2'

export default function AdminComponentsSandbox() {
  const [filter, setFilter] = useState('')

  return (
    <SandboxShellV2
      moduleId="admin-components"
      title="Admin Components"
      description="Stat cards, tom-/felvyer och filter."
    >
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Admin Components</h1>
          <p className="text-muted-foreground">Stat cards, tom-/felvyer och kortlayout fÇôr admin.</p>
        </div>

        <AdminStatGrid cols={3}>
          <AdminStatCard
            label="Aktiva anvÇÏndare"
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
            subtitle="Senaste mÇ¾naden"
          />
          <AdminStatCard
            label="Churn"
            value="1.8%"
            change="+0.2%"
            trend="down"
            icon={<ChartBarIcon className="h-5 w-5" />}
            iconColor="amber"
            subtitle="Ç-vervakad"
          />
        </AdminStatGrid>

        <div className="grid gap-6 lg:grid-cols-2">
          <AdminCard
            title="Filter + tomvy"
            description="SÇ¾ hÇÏr ser filter + tom state ut."
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
              description="Bjud in anvÇÏndare eller skapa en post fÇôr att komma igÇ¾ng."
              action={{ label: 'Skapa', onClick: () => alert('Skapa post') }}
              secondaryAction={{ label: 'LÇÏr mer', onClick: () => alert('LÇÏs mer') }}
            />
          </AdminCard>

          <AdminCard
            title="Felstate"
            description="Standard felkomponent fÇôr admin."
          >
            <AdminErrorState
              title="Kunde inte ladda data"
              description="Testa att ladda om sidan eller kontrollera anslutning."
              onRetry={() => alert('FÇôrsÇôk igen')}
            />
          </AdminCard>
        </div>
      </div>
    </SandboxShellV2>
  )
}
