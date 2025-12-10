import { type NextRequest, NextResponse } from 'next/server';
import { stripe, isStripeError, getStripeErrorMessage } from '@/lib/stripe/config';
import { createServerRlsClient } from '@/lib/supabase/server';
import type Stripe from 'stripe';

/**
 * POST /api/billing/create-subscription
 * 
 * Creates a Stripe subscription for a tenant with automatic tax calculation.
 * Returns a client_secret for Payment Element to complete payment.
 * 
 * Request body:
 * {
 *   tenantId: string;           // UUID of tenant
 *   priceId: string;            // Stripe price ID (price_xxx)
 *   quantity?: number;          // Number of seats (default: 1)
 *   customerId?: string;        // Existing Stripe customer ID (optional)
 *   paymentMethodId?: string;   // Existing payment method (optional)
 * }
 * 
 * Response:
 * {
 *   subscriptionId: string;     // Stripe subscription ID (sub_xxx)
 *   clientSecret: string;       // For Payment Element
 *   status: string;             // Subscription status
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerRlsClient();
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { tenantId, priceId, quantity = 1, customerId, paymentMethodId } = body;

    if (!tenantId || !priceId) {
      return NextResponse.json(
        { error: 'Missing required fields: tenantId, priceId' },
        { status: 400 }
      );
    }

    // Verify user has permission to create subscription for this tenant
    const { data: membership } = await supabase
      .from('tenant_memberships')
      .select('role')
      .eq('tenant_id', tenantId)
      .eq('user_id', user.id)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Only tenant owners/admins can create subscriptions' },
        { status: 403 }
      );
    }

    // Get tenant details for customer creation
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', tenantId)
      .single();

    let stripeCustomerId = customerId;

    // Create or retrieve Stripe customer
    if (!stripeCustomerId) {
      // Check if customer already exists in billing_accounts
      const { data: billingAccount } = await supabase
        .from('billing_accounts')
        .select('provider_customer_id')
        .eq('tenant_id', tenantId)
        .eq('provider', 'stripe')
        .maybeSingle();

      if (billingAccount) {
        stripeCustomerId = billingAccount.provider_customer_id;
      } else {
        // Create new Stripe customer
        const customer = await stripe.customers.create({
          name: tenant?.name || 'Unknown Tenant',
          metadata: {
            tenant_id: tenantId,
          },
        });

        stripeCustomerId = customer.id;

        // Save to billing_accounts
        await supabase
          .from('billing_accounts')
          .insert({
            tenant_id: tenantId,
            provider: 'stripe',
            provider_customer_id: stripeCustomerId,
            metadata: {},
          });
      }
    }

    // Create subscription with automatic tax
    const subscriptionParams: Stripe.SubscriptionCreateParams = {
      customer: stripeCustomerId,
      items: [
        {
          price: priceId,
          quantity,
        },
      ],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        payment_method_types: ['card'],
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
      automatic_tax: {
        enabled: true,
      },
      metadata: {
        tenant_id: tenantId,
        created_by_user_id: user.id,
      },
    };

    // Attach payment method if provided
    if (paymentMethodId) {
      subscriptionParams.default_payment_method = paymentMethodId;
    }

    const subscription = await stripe.subscriptions.create(subscriptionParams);

    // Extract client secret from payment intent
    const invoice = subscription.latest_invoice as Stripe.Invoice | undefined;
    const paymentIntent = invoice?.payment_intent as Stripe.PaymentIntent | undefined;
    const clientSecret = paymentIntent?.client_secret || null;

    if (!clientSecret) {
      throw new Error('Failed to create payment intent for subscription');
    }

    // Save subscription to database
    const { data: billingProduct } = await supabase
      .from('billing_products')
      .select('id')
      .eq('stripe_price_id', priceId)
      .maybeSingle();

    if (billingProduct) {
      await supabase
        .from('tenant_subscriptions')
        .insert({
          tenant_id: tenantId,
          billing_product_id: billingProduct.id,
          stripe_subscription_id: subscription.id,
          status: subscription.status as 'trial' | 'active' | 'canceled' | 'paused',
          seats_purchased: quantity,
          start_date: new Date().toISOString().split('T')[0],
          renewal_date: subscription.current_period_end 
            ? new Date(subscription.current_period_end * 1000).toISOString().split('T')[0]
            : null,
        });
    }

    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret,
      status: subscription.status,
      customerId: stripeCustomerId,
    });

  } catch (error: unknown) {
    console.error('Error creating subscription:', error);

    if (isStripeError(error)) {
      return NextResponse.json(
        { 
          error: 'Stripe error', 
          message: getStripeErrorMessage(error),
          code: error.code 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}
