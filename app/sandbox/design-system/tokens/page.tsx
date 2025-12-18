import { notFound } from 'next/navigation'
import { SandboxShell } from '../../components/shell/SandboxShellV2'

export const dynamic = 'force-dynamic'

const semanticTokens = [
  { name: 'text-foreground', description: 'Primär textfärg' },
  { name: 'text-muted-foreground', description: 'Sekundär/dämpad textfärg' },
  { name: 'bg-background', description: 'Sidans bakgrundsfärg' },
  { name: 'bg-card', description: 'Kortets bakgrundsfärg' },
  { name: 'border-border', description: 'Standard kantfärg' },
  { name: 'text-primary', description: 'Primär accentfärg (text)' },
  { name: 'bg-primary', description: 'Primär accentfärg (bakgrund)' },
  { name: 'text-accent', description: 'Sekundär accentfärg (text)' },
  { name: 'bg-accent', description: 'Sekundär accentfärg (bakgrund)' },
]

const colorTokens = [
  { name: 'Primary', value: '#8661ff', class: 'bg-primary' },
  { name: 'Accent', value: '#00c7b0', class: 'bg-accent' },
  { name: 'Yellow', value: '#ffd166', class: 'bg-yellow' },
  { name: 'Success', value: '#22c55e', class: 'bg-green-500' },
  { name: 'Warning', value: '#f59e0b', class: 'bg-yellow-500' },
  { name: 'Destructive', value: '#ef4444', class: 'bg-red-500' },
]

const spacingTokens = [
  { name: 'spacing-1', value: '0.25rem', pixels: '4px' },
  { name: 'spacing-2', value: '0.5rem', pixels: '8px' },
  { name: 'spacing-3', value: '0.75rem', pixels: '12px' },
  { name: 'spacing-4', value: '1rem', pixels: '16px' },
  { name: 'spacing-6', value: '1.5rem', pixels: '24px' },
  { name: 'spacing-8', value: '2rem', pixels: '32px' },
  { name: 'spacing-12', value: '3rem', pixels: '48px' },
  { name: 'spacing-16', value: '4rem', pixels: '64px' },
]

const radiusTokens = [
  { name: 'rounded-sm', value: '0.125rem', pixels: '2px' },
  { name: 'rounded', value: '0.25rem', pixels: '4px' },
  { name: 'rounded-md', value: '0.375rem', pixels: '6px' },
  { name: 'rounded-lg', value: '0.5rem', pixels: '8px' },
  { name: 'rounded-xl', value: '0.75rem', pixels: '12px' },
  { name: 'rounded-2xl', value: '1rem', pixels: '16px' },
  { name: 'rounded-3xl', value: '1.5rem', pixels: '24px' },
  { name: 'rounded-full', value: '9999px', pixels: 'full' },
]

export default function DesignTokensPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return (
    <SandboxShell
      moduleId="tokens"
      title="Design Tokens"
      description="CSS-variabler och semantiska tokens för konsekvent design."
    >
      <div className="space-y-12">
        {/* Color Tokens */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Färgpalett</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {colorTokens.map((token) => (
              <div key={token.name} className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg ${token.class}`} />
                <div>
                  <p className="font-medium text-foreground">{token.name}</p>
                  <p className="text-xs text-muted-foreground">{token.value}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Semantic Tokens */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Semantiska Tokens</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Använd dessa klasser istället för hårdkodade färger för att stödja tema-switching.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {semanticTokens.map((token) => (
              <div
                key={token.name}
                className="rounded-lg border border-border bg-background px-3 py-2"
              >
                <code className="text-sm text-foreground">{token.name}</code>
                <p className="text-xs text-muted-foreground">{token.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Spacing Tokens */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Spacing Scale</h2>
          <div className="space-y-3">
            {spacingTokens.map((token) => (
              <div key={token.name} className="flex items-center gap-4">
                <div
                  className="h-4 bg-primary/50"
                  style={{ width: token.pixels === '4px' ? '16px' : token.pixels }}
                />
                <div className="flex items-center gap-2">
                  <code className="text-sm text-foreground">{token.name}</code>
                  <span className="text-xs text-muted-foreground">
                    ({token.value} / {token.pixels})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Border Radius Tokens */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Border Radius</h2>
          <div className="flex flex-wrap gap-4">
            {radiusTokens.map((token) => (
              <div key={token.name} className="text-center">
                <div
                  className={`h-16 w-16 border-2 border-primary bg-primary/10 ${token.name}`}
                />
                <code className="mt-2 block text-xs text-foreground">{token.name}</code>
                <span className="text-[10px] text-muted-foreground">{token.pixels}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Usage Example */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Användning</h2>
          <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
{`// Använd semantiska tokens i JSX
<div className="bg-background text-foreground">
  <p className="text-muted-foreground">Sekundär text</p>
  <button className="bg-primary text-white">
    Primär knapp
  </button>
</div>

// Spacing
<div className="p-4 mt-8 gap-6">
  ...
</div>

// Border radius
<div className="rounded-2xl border border-border">
  ...
</div>`}
          </pre>
        </section>
      </div>
    </SandboxShell>
  )
}
