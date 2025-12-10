'use client'

import { useState } from 'react'
import { SubscriptionCheckout } from '@/components/billing/SubscriptionCheckout'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

/**
 * Stripe Payment Testing Sandbox
 * 
 * Test the complete subscription checkout flow with Stripe Payment Element.
 * Uses test mode with test cards.
 */
export default function StripeTestPage() {
  const [showCheckout, setShowCheckout] = useState(false)
  const [result, setResult] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  // Test configuration - replace with actual values
  const testConfig = {
    tenantId: '00000000-0000-0000-0000-000000000001', // Demo tenant
    priceId: 'price_1234567890', // Replace with real Stripe price ID
    quantity: 1,
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Stripe Payment Test</h1>
        <p className="text-gray-600">
          Test the complete Stripe subscription checkout flow with Payment Element
        </p>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-3">📋 Test Instructions</h2>
        <ol className="space-y-2 text-sm text-blue-800">
          <li>1. Update <code className="bg-blue-100 px-2 py-1 rounded">tenantId</code> and <code className="bg-blue-100 px-2 py-1 rounded">priceId</code> in the code below</li>
          <li>2. Click &quot;Start Checkout&quot; to initialize payment</li>
          <li>3. Use test card: <strong>4242 4242 4242 4242</strong></li>
          <li>4. Any future expiry date and any 3-digit CVC</li>
          <li>5. Click &quot;Subscribe&quot; to complete payment</li>
        </ol>
      </div>

      {/* Test Cards Reference */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">🃏 Test Cards</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="font-mono">4242 4242 4242 4242</span>
            <span className="text-green-600">✓ Successful payment</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-mono">4000 0025 0000 3155</span>
            <span className="text-yellow-600">⚠ 3D Secure required</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-mono">4000 0000 0000 9995</span>
            <span className="text-red-600">✗ Declined (insufficient funds)</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-mono">4000 0000 0000 0002</span>
            <span className="text-red-600">✗ Declined (generic)</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-4">
          Use any future expiry date (e.g., 12/34) and any 3-digit CVC (e.g., 123)
        </p>
      </div>

      {/* Current Configuration */}
      <div className="bg-gray-50 border rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">⚙️ Current Configuration</h2>
        <div className="space-y-2 text-sm font-mono">
          <div>
            <span className="text-gray-600">Tenant ID:</span>{' '}
            <span className="text-gray-900">{testConfig.tenantId}</span>
          </div>
          <div>
            <span className="text-gray-600">Price ID:</span>{' '}
            <span className="text-gray-900">{testConfig.priceId}</span>
          </div>
          <div>
            <span className="text-gray-600">Quantity:</span>{' '}
            <span className="text-gray-900">{testConfig.quantity}</span>
          </div>
          <div>
            <span className="text-gray-600">Environment:</span>{' '}
            <span className="text-blue-600">Test Mode</span>
          </div>
        </div>
        <Alert variant="warning" className="mt-4">
          ⚠️ Remember to update the <code>tenantId</code> and <code>priceId</code> values in the component code!
        </Alert>
      </div>

      {/* Result Display */}
      {result && (
        <Alert 
          variant={result.type === 'success' ? 'success' : 'error'} 
          className="mb-6"
        >
          <div className="font-semibold mb-1">
            {result.type === 'success' ? '✓ Success!' : '✗ Error'}
          </div>
          {result.message}
        </Alert>
      )}

      {/* Checkout Area */}
      {!showCheckout ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <Button
            onClick={() => {
              setShowCheckout(true)
              setResult(null)
            }}
            size="lg"
            className="mb-4"
          >
            Start Checkout
          </Button>
          <p className="text-sm text-gray-600">
            Click to initialize Stripe Payment Element
          </p>
        </div>
      ) : (
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Payment Details</h2>
            <Button
              onClick={() => {
                setShowCheckout(false)
                setResult(null)
              }}
              variant="outline"
              size="sm"
            >
              Cancel
            </Button>
          </div>

          <SubscriptionCheckout
            tenantId={testConfig.tenantId}
            priceId={testConfig.priceId}
            quantity={testConfig.quantity}
            onSuccess={(subscriptionId) => {
              setResult({
                type: 'success',
                message: `Subscription created successfully! ID: ${subscriptionId}`,
              })
              setShowCheckout(false)
            }}
            onError={(error) => {
              setResult({
                type: 'error',
                message: error,
              })
            }}
          />
        </div>
      )}

      {/* Developer Notes */}
      <div className="mt-8 bg-gray-900 text-gray-100 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4 text-white">💻 Developer Notes</h2>
        <div className="space-y-4 text-sm">
          <div>
            <h3 className="font-semibold text-white mb-2">Component Usage:</h3>
            <pre className="bg-gray-800 p-3 rounded overflow-x-auto">
{`import { SubscriptionCheckout } from '@/components/billing/SubscriptionCheckout'

<SubscriptionCheckout
  tenantId="uuid"
  priceId="price_xxx"
  quantity={1}
  onSuccess={(subId) => console.log('Success:', subId)}
  onError={(error) => console.error('Error:', error)}
/>`}
            </pre>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-2">API Endpoint:</h3>
            <pre className="bg-gray-800 p-3 rounded overflow-x-auto">
{`POST /api/billing/create-subscription
{
  "tenantId": "uuid",
  "priceId": "price_xxx",
  "quantity": 1
}`}
            </pre>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-2">Webhook Testing:</h3>
            <pre className="bg-gray-800 p-3 rounded overflow-x-auto">
{`# Start webhook forwarding
stripe listen --forward-to localhost:3000/api/billing/webhooks/stripe

# Trigger test events
stripe trigger customer.subscription.created
stripe trigger invoice.payment_succeeded`}
            </pre>
          </div>
        </div>
      </div>

      {/* Documentation Link */}
      <div className="mt-6 text-center text-sm text-gray-600">
        📚 Full documentation available in{' '}
        <code className="bg-gray-100 px-2 py-1 rounded">docs/STRIPE.md</code>
      </div>
    </div>
  )
}
