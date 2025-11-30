import { notFound } from 'next/navigation'

export default function SandboxLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Dölj sandbox i produktion
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  )
}
