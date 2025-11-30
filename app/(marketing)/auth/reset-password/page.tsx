'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/supabase/auth'

export const dynamic = 'force-dynamic'

export default function ResetPasswordPage() {
  const { resetPassword, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    try {
      await resetPassword(email)
      setSuccess(true)
      setEmail('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Reset your password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your email and we’ll send you a link to reset your password.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
          {success && (
            <div className="rounded-md bg-green-50 p-4">
              <p className="text-sm font-medium text-green-800">
                If an account exists with that email, you will receive a password reset link.
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Email address"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        <div className="text-center space-y-2">
          <p className="text-sm text-gray-600">
            <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
              Back to login
            </Link>
          </p>
          <p className="text-sm text-gray-600">
            Don’t have an account?{' '}
            <Link href="/auth/signup" className="font-medium text-blue-600 hover:text-blue-500">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
