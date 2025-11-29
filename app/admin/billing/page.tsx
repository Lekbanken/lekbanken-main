'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/supabase/auth';
import { useTenant } from '@/lib/context/TenantContext';
import { getBillingStats } from '@/lib/services/billingService';

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-6xl mx-auto pt-20">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Billing Administration</h1>
            <p className="text-slate-600">Du måste vara admin i en organisation för att komma åt denna sidan.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Billing Administration</h1>
          <p className="text-slate-600">Hantera prenumerationer, fakturor och betalningar</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {isLoading ? (
            <>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-20 mb-3"></div>
                  <div className="h-8 bg-slate-200 rounded w-24"></div>
                </div>
              ))}
            </>
          ) : stats ? (
            <>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-slate-500 font-medium mb-2">Active Subscriptions</p>
                <p className="text-3xl font-bold text-blue-600">{stats.activeSubscriptions}</p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-slate-500 font-medium mb-2">Monthly Recurring Revenue</p>
                <p className="text-3xl font-bold text-green-600">${stats.monthlyRecurringRevenue.toFixed(2)}</p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-slate-500 font-medium mb-2">Total Revenue</p>
                <p className="text-3xl font-bold text-purple-600">${stats.totalRevenue.toFixed(2)}</p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-slate-500 font-medium mb-2">Paid Invoices</p>
                <p className="text-3xl font-bold text-emerald-600">{stats.paidInvoices}</p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-slate-500 font-medium mb-2">Outstanding Invoices</p>
                <p className="text-3xl font-bold text-orange-600">{stats.outstandingInvoices}</p>
              </div>
            </>
          ) : null}
        </div>

        {/* Sections */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Subscriptions Section */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
              <h2 className="text-lg font-bold text-white">Subscriptions</h2>
            </div>
            <div className="p-6">
              <p className="text-slate-600 mb-4">Manage customer subscriptions and plans.</p>
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                View Subscriptions
              </button>
            </div>
          </div>

          {/* Invoices Section */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-4">
              <h2 className="text-lg font-bold text-white">Invoices</h2>
            </div>
            <div className="p-6">
              <p className="text-slate-600 mb-4">View and manage customer invoices and payments.</p>
              <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors">
                View Invoices
              </button>
            </div>
          </div>

          {/* Plans Section */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4">
              <h2 className="text-lg font-bold text-white">Billing Plans</h2>
            </div>
            <div className="p-6">
              <p className="text-slate-600 mb-4">Manage subscription tiers and pricing.</p>
              <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors">
                View Plans
              </button>
            </div>
          </div>

          {/* Payment Methods Section */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 p-4">
              <h2 className="text-lg font-bold text-white">Payment Methods</h2>
            </div>
            <div className="p-6">
              <p className="text-slate-600 mb-4">View customer payment methods and preferences.</p>
              <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors">
                View Payment Methods
              </button>
            </div>
          </div>
        </div>

        {/* Billing Information */}
        <div className="bg-white rounded-lg shadow p-6 mt-8">
          <h2 className="text-lg font-bold text-slate-900 mb-4">About Billing</h2>
          <div className="space-y-3 text-slate-600">
            <p>
              This billing administration dashboard provides an overview of all subscription and payment activities
              across your organization.
            </p>
            <p>
              You can manage customer subscriptions, view invoices, configure billing plans, and monitor payment methods.
            </p>
            <p className="text-sm text-slate-500">
              Note: Stripe integration will be enabled in production. Currently, billing data is stored in Supabase.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
