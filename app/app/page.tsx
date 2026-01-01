import dynamic from 'next/dynamic'

const AppDashboardPage = dynamic(() => import('@/features/journey/AppDashboardPage'), { ssr: false })

export default function AppDashboard() {
  return <AppDashboardPage />
}
