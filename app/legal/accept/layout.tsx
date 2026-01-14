export default function LegalAcceptLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 sm:py-12 max-w-4xl">
        {children}
      </div>
    </div>
  )
}
