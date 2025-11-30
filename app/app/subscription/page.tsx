'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/supabase/auth';
import { useTenant } from '@/lib/context/TenantContext';
import {
  getSubscription,
  getAvailablePlans,
  getInvoices,
  getPaymentMethods,
  BillingPlan,
  SubscriptionWithPlan,
  Invoice,
  PaymentMethod,
} from '@/lib/services/billingService';

export default function SubscriptionPage() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();

  const [subscription, setSubscription] = useState<SubscriptionWithPlan | null>(null);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'invoices' | 'payment'>('overview');

  useEffect(() => {
    if (!user || !currentTenant) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [sub, availablePlans, invoiceList, paymentList] = await Promise.all([
          getSubscription(currentTenant.id),
          getAvailablePlans(),
          getInvoices(currentTenant.id),
          getPaymentMethods(currentTenant.id),
        ]);

        setSubscription(sub);
        setPlans(availablePlans || []);
        setInvoices(invoiceList || []);
        setPaymentMethods(paymentList || []);
      } catch (err) {
        console.error('Error loading subscription data:', err);
      }
      setIsLoading(false);
    };

    loadData();
  }, [user, currentTenant]);

  if (!user || !currentTenant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-4xl mx-auto pt-20">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Subscription</h1>
            <p className="text-slate-600">Du måste vara inloggad för att komma åt denna sidan.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Din Prenumeration</h1>
          <p className="text-slate-600">Hantera din prenumeration, fakturor och betalningsmetoder</p>
        </div>

        {/* Current Plan */}
        {isLoading ? (
          <div className="bg-white rounded-lg shadow p-6 mb-6 animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-48 mb-4"></div>
            <div className="h-4 bg-slate-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow p-8 mb-8 border border-blue-200">
            {subscription ? (
              <>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="text-sm text-slate-600 font-medium mb-1">Current Plan</p>
                    <h2 className="text-3xl font-bold text-slate-900">{subscription.plan?.name || 'Loading...'}</h2>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      subscription.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : subscription.status === 'trialing'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {subscription.status === 'active'
                      ? 'Active'
                      : subscription.status === 'trialing'
                        ? 'Trial'
                        : 'Inactive'}
                  </span>
                </div>

                {subscription.plan && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div>
                      <p className="text-xs text-slate-600 font-medium mb-1">Monthly Price</p>
                      <p className="text-2xl font-bold text-slate-900">${subscription.plan.price_monthly}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 font-medium mb-1">Billing Cycle</p>
                      <p className="text-lg font-semibold text-slate-900 capitalize">{subscription.billing_cycle}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 font-medium mb-1">Period Start</p>
                      <p className="text-sm text-slate-900">
                        {subscription.current_period_start
                          ? new Date(subscription.current_period_start).toLocaleDateString('sv-SE')
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 font-medium mb-1">Period End</p>
                      <p className="text-sm text-slate-900">
                        {subscription.current_period_end
                          ? new Date(subscription.current_period_end).toLocaleDateString('sv-SE')
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                )}

                <button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                  Change Plan
                </button>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-600 mb-4">Du har ingen aktiv prenumeration.</p>
                <button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                  Choose a Plan
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white rounded-lg p-2 shadow">
          {(['overview', 'invoices', 'payment'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`flex-1 px-4 py-2 rounded font-medium transition-colors ${
                selectedTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab === 'overview' && 'Overview'}
              {tab === 'invoices' && 'Invoices'}
              {tab === 'payment' && 'Payment Methods'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {selectedTab === 'overview' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Available Plans</h2>
            {plans.length === 0 ? (
              <p className="text-slate-600">No plans available.</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {plans.map((plan) => (
                  <div key={plan.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="mb-3">
                      <h3 className="font-bold text-slate-900">{plan.name}</h3>
                      <p className="text-sm text-slate-600">{plan.description}</p>
                    </div>
                    <div className="mb-3">
                      <p className="text-2xl font-bold text-slate-900">
                        ${plan.price_monthly}
                        <span className="text-sm text-slate-600 font-normal">/month</span>
                      </p>
                    </div>
                    <div className="space-y-1 mb-4 text-sm text-slate-600">
                      {plan.user_limit && <p>• Up to {plan.user_limit} users</p>}
                      {plan.storage_gb && <p>• {plan.storage_gb}GB storage</p>}
                      {plan.support_level && <p>• {plan.support_level} support</p>}
                    </div>
                    <button
                      disabled={subscription?.billing_plan_id === plan.id}
                      className={`w-full px-4 py-2 rounded font-medium transition-colors ${
                        subscription?.billing_plan_id === plan.id
                          ? 'bg-slate-100 text-slate-600 cursor-default'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {subscription?.billing_plan_id === plan.id ? 'Current Plan' : 'Choose Plan'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedTab === 'invoices' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Invoices</h2>
            </div>
            {invoices.length === 0 ? (
              <div className="p-6 text-center text-slate-600">No invoices found.</div>
            ) : (
              <div className="divide-y">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center">
                    <div>
                      <p className="font-medium text-slate-900">{invoice.invoice_number}</p>
                      <p className="text-sm text-slate-600">
                        {new Date(invoice.created_at).toLocaleDateString('sv-SE')}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-slate-900">${invoice.amount_total}</p>
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded ${
                            invoice.status === 'paid'
                              ? 'bg-green-100 text-green-700'
                              : invoice.status === 'draft' || invoice.status === 'issued'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {invoice.status}
                        </span>
                      </div>
                      {invoice.pdf_url && (
                        <a
                          href={invoice.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                        >
                          Download
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedTab === 'payment' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-900">Payment Methods</h2>
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors">
                  Add Payment Method
                </button>
              </div>
            </div>
            {paymentMethods.length === 0 ? (
              <div className="p-6 text-center text-slate-600">No payment methods found.</div>
            ) : (
              <div className="divide-y">
                {paymentMethods.map((method) => (
                  <div key={method.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-slate-900">
                          {method.type === 'card' ? `${method.card_brand} ending in ${method.card_last_four}` : method.type}
                        </p>
                        {method.card_exp_month && method.card_exp_year && (
                          <p className="text-sm text-slate-600">
                            Expires {method.card_exp_month}/{method.card_exp_year}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {method.is_default && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">Default</span>
                        )}
                        <button className="text-red-600 hover:text-red-700 text-sm font-medium">Remove</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
