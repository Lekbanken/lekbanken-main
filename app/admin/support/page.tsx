'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTenant } from '@/lib/context/TenantContext';
import { useAuth } from '@/lib/supabase/auth';
import { getTicketStats, type SupportStats } from '@/lib/services/supportService';
import {
  AdminPageHeader,
  AdminPageLayout,
  AdminStatCard,
  AdminStatGrid,
} from '@/components/admin/shared';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import {
  LifebuoyIcon,
  TicketIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  BookOpenIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';

interface QuickLink {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  color: string;
}

const quickLinks: QuickLink[] = [
  {
    id: 'tickets',
    title: 'Support-ärenden',
    description: 'Hantera och besvara support-ärenden',
    href: '/admin/tickets',
    icon: <TicketIcon className="h-5 w-5" />,
    color: 'from-blue-500/20 to-blue-500/5 text-blue-600 ring-blue-500/10',
  },
  {
    id: 'moderation',
    title: 'Moderering',
    description: 'Granska rapporter och moderera innehåll',
    href: '/admin/moderation',
    icon: <ExclamationTriangleIcon className="h-5 w-5" />,
    color: 'from-amber-500/20 to-amber-500/5 text-amber-600 ring-amber-500/10',
  },
  {
    id: 'notifications',
    title: 'Notifikationer',
    description: 'Skicka meddelanden till användare',
    href: '/admin/notifications',
    icon: <ChatBubbleLeftRightIcon className="h-5 w-5" />,
    color: 'from-purple-500/20 to-purple-500/5 text-purple-600 ring-purple-500/10',
  },
  {
    id: 'docs',
    title: 'Dokumentation',
    description: 'Hjälpcenter och användarguider',
    href: '#',
    icon: <BookOpenIcon className="h-5 w-5" />,
    color: 'from-emerald-500/20 to-emerald-500/5 text-emerald-600 ring-emerald-500/10',
  },
];

interface RecentTicket {
  id: string;
  subject: string;
  status: 'open' | 'pending' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  userEmail: string;
}

export default function SupportPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentTenant } = useTenant();

  const [stats, setStats] = useState<SupportStats | null>(null);
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!currentTenant) return;
      setIsLoading(true);

      try {
        const ticketStats = await getTicketStats(currentTenant.id);
        if (ticketStats) {
          setStats(ticketStats);
        }

        // Mock recent tickets for now
        setRecentTickets([
          {
            id: '1',
            subject: 'Kan inte logga in på kontot',
            status: 'open',
            priority: 'high',
            createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
            userEmail: 'user1@example.com',
          },
          {
            id: '2',
            subject: 'Fråga om fakturering',
            status: 'pending',
            priority: 'medium',
            createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
            userEmail: 'user2@example.com',
          },
          {
            id: '3',
            subject: 'Tekniskt problem med spel',
            status: 'open',
            priority: 'low',
            createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
            userEmail: 'user3@example.com',
          },
        ]);
      } catch (err) {
        console.error('Error loading support data:', err);
      }

      setIsLoading(false);
    };

    loadData();
  }, [currentTenant]);

  const formatTimeAgo = (dateStr: string) => {
    const now = new Date();
    const diff = now.getTime() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 60) return `${minutes} min sedan`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} tim sedan`;
    const days = Math.floor(hours / 24);
    return `${days} dagar sedan`;
  };

  const priorityColors: Record<string, string> = {
    low: 'bg-slate-100 text-slate-700',
    medium: 'bg-amber-100 text-amber-700',
    high: 'bg-red-100 text-red-700',
  };

  const statusColors: Record<string, string> = {
    open: 'bg-blue-100 text-blue-700',
    pending: 'bg-amber-100 text-amber-700',
    resolved: 'bg-emerald-100 text-emerald-700',
  };

  if (!user) {
    return (
      <AdminPageLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <p className="text-muted-foreground">Du måste vara inloggad för att se denna sida.</p>
        </div>
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Support"
        description="Översikt över support-aktivitet och snabblänkar"
        icon={<LifebuoyIcon className="h-6 w-6" />}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Support' },
        ]}
        actions={
          <Button onClick={() => router.push('/admin/tickets')} className="gap-2">
            <TicketIcon className="h-4 w-4" />
            Alla ärenden
          </Button>
        }
      />

      {/* Stats */}
      <AdminStatGrid cols={4} className="mb-8">
        <AdminStatCard
          label="Öppna ärenden"
          value={stats?.openTickets ?? 0}
          icon={<TicketIcon className="h-5 w-5" />}
          iconColor="blue"
          isLoading={isLoading}
        />
        <AdminStatCard
          label="Väntande"
          value={stats?.pendingTickets ?? 0}
          icon={<ClockIcon className="h-5 w-5" />}
          iconColor="amber"
          isLoading={isLoading}
        />
        <AdminStatCard
          label="Lösta (30 dagar)"
          value={stats?.resolvedLast30Days ?? 0}
          icon={<CheckCircleIcon className="h-5 w-5" />}
          iconColor="green"
          isLoading={isLoading}
        />
        <AdminStatCard
          label="Snitt svarstid"
          value={stats?.avgResponseTime ? `${Math.round(stats.avgResponseTime)} tim` : '-'}
          icon={<ClockIcon className="h-5 w-5" />}
          iconColor="purple"
          isLoading={isLoading}
        />
      </AdminStatGrid>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Links */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QuestionMarkCircleIcon className="h-5 w-5 text-muted-foreground" />
                Snabblänkar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {quickLinks.map((link) => (
                  <button
                    key={link.id}
                    onClick={() => router.push(link.href)}
                    className="flex items-start gap-3 rounded-lg border border-border p-4 text-left transition-all hover:border-primary/50 hover:bg-muted/50"
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${link.color} shadow-sm ring-1`}>
                      {link.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{link.title}</p>
                      <p className="text-sm text-muted-foreground">{link.description}</p>
                    </div>
                    <ArrowRightIcon className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Tickets */}
        <div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TicketIcon className="h-5 w-5 text-muted-foreground" />
                Senaste ärenden
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => router.push('/admin/tickets')}>
                Visa alla
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse space-y-2 rounded-lg border border-border p-3">
                      <div className="h-4 w-3/4 rounded bg-muted" />
                      <div className="h-3 w-1/2 rounded bg-muted" />
                    </div>
                  ))}
                </div>
              ) : recentTickets.length > 0 ? (
                <div className="space-y-3">
                  {recentTickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      onClick={() => router.push(`/admin/tickets?id=${ticket.id}`)}
                      className="w-full rounded-lg border border-border p-3 text-left transition-all hover:border-primary/50 hover:bg-muted/50"
                    >
                      <p className="font-medium text-foreground line-clamp-1">{ticket.subject}</p>
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <span className={`rounded-full px-2 py-0.5 ${statusColors[ticket.status]}`}>
                          {ticket.status === 'open' ? 'Öppen' : ticket.status === 'pending' ? 'Väntande' : 'Löst'}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 ${priorityColors[ticket.priority]}`}>
                          {ticket.priority === 'high' ? 'Hög' : ticket.priority === 'medium' ? 'Medium' : 'Låg'}
                        </span>
                        <span className="text-muted-foreground">{formatTimeAgo(ticket.createdAt)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <TicketIcon className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Inga öppna ärenden</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Resources Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DocumentTextIcon className="h-5 w-5 text-muted-foreground" />
            Resurser
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border p-4">
              <h3 className="font-medium text-foreground">Vanliga frågor (FAQ)</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Svara snabbare med färdiga svar på vanliga frågor.
              </p>
              <Button variant="link" className="mt-2 h-auto p-0 text-sm">
                Visa FAQ →
              </Button>
            </div>
            <div className="rounded-lg border border-border p-4">
              <h3 className="font-medium text-foreground">Svarsmallar</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Använd fördefinierade mallar för snabbare svar.
              </p>
              <Button variant="link" className="mt-2 h-auto p-0 text-sm">
                Hantera mallar →
              </Button>
            </div>
            <div className="rounded-lg border border-border p-4">
              <h3 className="font-medium text-foreground">Eskaleringsguide</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                När och hur du eskalerar ärenden till nästa nivå.
              </p>
              <Button variant="link" className="mt-2 h-auto p-0 text-sm">
                Läs guide →
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </AdminPageLayout>
  );
}
