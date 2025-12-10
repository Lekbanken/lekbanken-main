'use client'

import { useState } from 'react'
import { SubscriptionCheckout } from '@/components/billing/SubscriptionCheckout'
import { SandboxShell } from '../components/shell/SandboxShellV2'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/**
 * Stripe Payment Testing Sandbox
 * 
 * Test the complete subscription checkout flow with Stripe Payment Element.
 * Uses test mode with test cards.
 */

function StripeTestControls({
  config,
  setConfig,
}: {
  config: {
    tenantId: string
    priceId: string
    quantity: number
  }
  setConfig: (config: { tenantId: string; priceId: string; quantity: number }) => void
}) {
  return (
    <div className="space-y-6">
      {/* Configuration Controls */}
      <div>
        <h3 className="text-sm font-semibold mb-4">Configuration</h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Tenant ID</label>
            <Input
              value={config.tenantId}
              onChange={(e) => setConfig({ ...config, tenantId: e.target.value })}
              className="font-mono text-sm h-8"
              placeholder="Enter tenant UUID"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Price ID</label>
            <Input
              value={config.priceId}
              onChange={(e) => setConfig({ ...config, priceId: e.target.value })}
              className="font-mono text-sm h-8"
              placeholder="price_xxx"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Quantity (Seats)</label>
            <Input
              type="number"
              min="1"
              value={config.quantity}
              onChange={(e) => setConfig({ ...config, quantity: parseInt(e.target.value) || 1 })}
              className="font-mono text-sm h-8"
            />
          </div>
        </div>
      </div>

      {/* Test Cards Quick Reference */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Test Cards</h3>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between items-start">
            <code className="text-[10px] font-mono">4242 4242 4242 4242</code>
            <span className="text-green-600 font-medium">✓ Success</span>
          </div>
          <div className="flex justify-between items-start">
            <code className="text-[10px] font-mono">4000 0025 0000 3155</code>
            <span className="text-yellow-600 font-medium">3D Secure</span>
          </div>
          <div className="flex justify-between items-start">
            <code className="text-[10px] font-mono">4000 0000 0000 9995</code>
            <span className="text-red-600 font-medium">✗ Declined</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Any future expiry (12/34) and any CVC (123)
        </p>
      </div>

      {/* Environment Info */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Environment</h3>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Mode:</span>
            <span className="text-blue-600 font-medium">Test</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">API:</span>
            <span className="font-mono text-[10px]">/api/billing</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function StripeTestPage() {
  const [showCheckout, setShowCheckout] = useState(false)
  const [result, setResult] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  // Editable configuration
  const [config, setConfig] = useState({
    tenantId: '00000000-0000-0000-0000-000000000001',
    priceId: 'price_1234567890',
    quantity: 1,
  })

  return (
    <SandboxShell
      moduleId="stripe-test"
      title="Stripe Payment Test"
      description="Test the complete Stripe subscription checkout flow with Payment Element."
      controls={<StripeTestControls config={config} setConfig={setConfig} />}
    >
      <div className="space-y-6">
        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">📋 Test Instructions</h3>
          <ol className="space-y-1 text-sm text-blue-800">
            <li>1. Configure tenant and price in the right panel</li>
            <li>2. Click &quot;Start Checkout&quot; to initialize payment</li>
            <li>3. Use test card: <code className="bg-blue-100 px-1 rounded">4242 4242 4242 4242</code></li>
            <li>4. Click &quot;Subscribe&quot; to complete payment</li>
          </ol>
        </div>

        {/* Result Display */}
        {result && (
          <Alert variant={result.type === 'success' ? 'success' : 'error'}>
            <div className="font-semibold mb-1">
              {result.type === 'success' ? '✓ Success!' : '✗ Error'}
            </div>
            {result.message}
          </Alert>
        )}

        {/* Checkout Area */}
        {!showCheckout ? (
          <div className="text-center py-16 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
            <Button
              onClick={() => {
                setShowCheckout(true)
                setResult(null)
              }}
              size="lg"
              className="mb-2"
            >
              Start Checkout
            </Button>
            <p className="text-sm text-gray-600">
              Initialize Stripe Payment Element
            </p>
          </div>
        ) : (
          <div className="bg-white border rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold">Payment Details</h3>
                <p className="text-sm text-gray-600">
                  {config.quantity} seat{config.quantity > 1 ? 's' : ''}
                </p>
              </div>
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
              tenantId={config.tenantId}
              priceId={config.priceId}
              quantity={config.quantity}
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

        {/* Developer Code Example */}
        <div className="bg-gray-900 text-gray-100 rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-3 text-white">Component Usage</h3>
          <pre className="text-xs overflow-x-auto">
{`<SubscriptionCheckout
  tenantId="${config.tenantId}"
  priceId="${config.priceId}"
  quantity={${config.quantity}}
  onSuccess={(subId) => console.log('Success:', subId)}
  onError={(error) => console.error('Error:', error)}
/>`}
          </pre>
        </div>
      </div>
    </SandboxShell>
  )
}
