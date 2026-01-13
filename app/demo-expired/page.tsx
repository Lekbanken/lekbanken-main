/**
 * Demo Expired Page
 * Shown when demo session expires (after 2 hours)
 */

import { ClockIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function DemoExpiredPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <ClockIcon className="h-8 w-8 text-gray-400" aria-hidden="true" />
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Demo Session Expired
        </h1>

        {/* Description */}
        <p className="text-gray-600 mb-8">
          Your 2-hour demo session has ended. Create a free account to continue
          exploring Lekbanken with unlimited access and save your progress.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {/* Primary CTA: Create Account */}
          <Link
            href="/auth/signup?source=demo_expired"
            className="
              w-full
              px-6 py-3
              bg-blue-600 text-white
              hover:bg-blue-700
              font-medium text-base
              rounded-md
              transition-colors
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            "
          >
            Create Free Account
          </Link>

          {/* Secondary CTA: Start Another Demo */}
          <form action="/auth/demo" method="POST" className="w-full">
            <button
              type="submit"
              className="
                w-full
                px-6 py-3
                bg-white text-gray-700
                border border-gray-300
                hover:bg-gray-50
                font-medium text-base
                rounded-md
                transition-colors
                focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
              "
            >
              Start Another Demo
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link
            href="/auth/login"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Log in
          </Link>
        </p>

        {/* Back to Home */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Demo Session Expired | Lekbanken',
  description: 'Your demo session has expired. Create an account to continue.',
};
