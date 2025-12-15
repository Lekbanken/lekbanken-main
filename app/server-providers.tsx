import type { ReactNode } from 'react'
import { getServerAuthContext } from '@/lib/auth/server-context'
import { Providers } from './providers'

export default async function ServerProviders({ children }: { children: ReactNode }) {
  const authContext = await getServerAuthContext()

  return (
    <Providers
      initialUser={authContext.user}
      initialProfile={authContext.profile}
      initialMemberships={authContext.memberships}
    >
      {children}
    </Providers>
  )
}
