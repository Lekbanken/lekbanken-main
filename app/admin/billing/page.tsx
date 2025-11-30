'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/supabase/auth';
import { useTenant } from '@/lib/context/TenantContext';
import { getBillingStats } from '@/lib/services/billingService';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { CreditCardIcon } from '@heroicons/react/24/outline';

interface Stats {
  activeSubscriptions: number;
  monthlyRecurringRevenue: number;
  totalRevenue: number;
  paidInvoices: number;
  outstandingInvoices: number;
}

export default function BillingAdminPage() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();

  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !currentTenant) return;

    const loadStats = async () => {
      setIsLoading(true);
      try {
        const [billingStats] = await Promise.all([getBillingStats(currentTenant.id)]);

        setStats(billingStats);
      } catch (err) {
        console.error('Error loading billing stats:', err);
      }
      setIsLoading(false);
    };

    loadStats();
  }, [user, currentTenant]);

  if (!user || !currentTenant) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto pt-20">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground mb-4">Billing Administration</h1>
            <p className="text-muted-foreground">Du måste vara admin i en organisation för att komma åt denna sidan.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <CreditCardIcon className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">Billing Administration</h1>
          </div>
          <p className="text-muted-foreground">Hantera prenumerationer, fakturor och betalningar</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {isLoading ? (
            <>
              {[...Array(5)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-muted rounded w-20 mb-3"></div>
                    <div className="h-8 bg-muted rounded w-24"></div>
                  </CardContent>
                </Card>
              ))}
            </>
          ) : stats ? (
            <>
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground font-medium mb-2">Active Subscriptions</p>
                  <p className="text-3xl font-bold text-primary">{stats.activeSubscriptions}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground font-medium mb-2">Monthly Recurring Revenue</p>
                  <p className="text-3xl font-bold text-green-600">${stats.monthlyRecurringRevenue.toFixed(2)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground font-medium mb-2">Total Revenue</p>
                  <p className="text-3xl font-bold text-purple-600">${stats.totalRevenue.toFixed(2)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground font-medium mb-2">Paid Invoices</p>
                  <p className="text-3xl font-bold text-emerald-600">{stats.paidInvoices}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground font-medium mb-2">Outstanding Invoices</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.outstandingInvoices}</p>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>

        {/* Sections */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Subscriptions Section */}
          <Card>
            <CardHeader className="bg-primary p-4">
              <CardTitle className="text-white">Subscriptions</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-muted-foreground mb-4">Manage customer subscriptions and plans.</p>
              <Button>View Subscriptions</Button>
            </CardContent>
          </Card>

          {/* Invoices Section */}
          <Card>
            <CardHeader className="bg-green-600 p-4">
              <CardTitle className="text-white">Invoices</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-muted-foreground mb-4">View and manage customer invoices and payments.</p>
              <Button className="bg-green-600 hover:bg-green-700">View Invoices</Button>
            </CardContent>
          </Card>

          {/* Plans Section */}
          <Card>
            <CardHeader className="bg-purple-600 p-4">
              <CardTitle className="text-white">Billing Plans</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-muted-foreground mb-4">Manage subscription tiers and pricing.</p>
              <Button className="bg-purple-600 hover:bg-purple-700">View Plans</Button>
            </CardContent>
          </Card>

          {/* Payment Methods Section */}
          <Card>
            <CardHeader className="bg-indigo-600 p-4">
              <CardTitle className="text-white">Payment Methods</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-muted-foreground mb-4">View customer payment methods and preferences.</p>
              <Button className="bg-indigo-600 hover:bg-indigo-700">View Payment Methods</Button>
            </CardContent>
          </Card>
        </div>

        {/* Billing Information */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>About Billing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-muted-foreground">
              <p>
                This billing administration dashboard provides an overview of all subscription and payment activities
                across your organization.
              </p>
              <p>
                You can manage customer subscriptions, view invoices, configure billing plans, and monitor payment methods.
              </p>
              <p className="text-sm">
                Note: Stripe integration will be enabled in production. Currently, billing data is stored in Supabase.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
