// Example: Using Stripe Subscription Checkout in Your App
// ========================================================

import { SubscriptionCheckout } from '@/components/billing/SubscriptionCheckout'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function SubscribePage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  
  // Your tenant and price IDs
  const tenantId = 'your-tenant-uuid'
  const priceId = 'price_xxx' // From Stripe Dashboard

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Subscribe to Premium</h1>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-2">Premium Plan</h2>
        <p className="text-gray-600 mb-4">5 seats • NOK 999/month</p>
        
        <ul className="text-sm text-gray-600 space-y-2 mb-6">
          <li>✓ Unlimited games</li>
          <li>✓ Priority support</li>
          <li>✓ Advanced analytics</li>
        </ul>
      </div>

      {/* Stripe Checkout Component */}
      <SubscriptionCheckout
        tenantId={tenantId}
        priceId={priceId}
        quantity={5}
        onSuccess={(subscriptionId) => {
          console.log('Subscription created:', subscriptionId)
          router.push('/billing/success')
        }}
        onError={(errorMessage) => {
          console.error('Payment failed:', errorMessage)
          setError(errorMessage)
        }}
      />

      {error && (
        <div className="mt-4 p-4 bg-red-50 text-red-800 rounded">
          {error}
        </div>
      )}
    </div>
  )
}

// That's it! The component handles:
// ✓ Creating Stripe customer
// ✓ Creating subscription with tax
// ✓ Payment Element UI
// ✓ Card validation
// ✓ 3D Secure
// ✓ Error handling
// ✓ Success redirect
