'use client'

import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MagnifyingGlassIcon, EnvelopeIcon, LockClosedIcon } from '@heroicons/react/20/solid'

const categoryOptions = [
  { value: 'football', label: 'Fotboll' },
  { value: 'basketball', label: 'Basket' },
  { value: 'handball', label: 'Handboll' },
  { value: 'gymnastics', label: 'Gymnastik', disabled: true },
]

const ageOptions = [
  { value: '4-6', label: '4-6 år' },
  { value: '7-9', label: '7-9 år' },
  { value: '10-12', label: '10-12 år' },
  { value: '13-15', label: '13-15 år' },
]

export default function FormsSandbox() {
  return (
    <div className="min-h-screen bg-background">
      {/* Toolbar */}
      <div className="sticky top-0 z-50 border-b border-border bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/sandbox" 
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Tillbaka
            </Link>
            <h1 className="text-lg font-semibold text-foreground">Forms</h1>
          </div>
          <Badge variant="success">Implementerad</Badge>
        </div>
      </div>

      {/* Preview Area */}
      <div className="p-8">
        <div className="mx-auto max-w-3xl space-y-12">
          {/* Basic Inputs */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-foreground">Input varianter</h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <Input 
                label="Standard input"
                placeholder="Skriv något..."
              />
              <Input 
                label="Med hint"
                placeholder="E-postadress"
                hint="Vi delar aldrig din e-post"
              />
              <Input 
                label="Med error"
                placeholder="Lösenord"
                defaultValue="123"
                error="Lösenordet måste vara minst 8 tecken"
              />
              <Input 
                label="Disabled"
                placeholder="Kan ej redigeras"
                disabled
              />
            </div>
          </section>

          {/* Input sizes */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-foreground">Input storlekar</h2>
            <div className="space-y-4">
              <Input 
                inputSize="sm"
                placeholder="Small input"
              />
              <Input 
                inputSize="md"
                placeholder="Medium input (default)"
              />
              <Input 
                inputSize="lg"
                placeholder="Large input"
              />
            </div>
          </section>

          {/* Inputs with icons */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-foreground">Input med ikoner</h2>
            <div className="space-y-4">
              <Input 
                label="Sök aktiviteter"
                placeholder="Sök..."
                leftIcon={<MagnifyingGlassIcon className="h-5 w-5" />}
              />
              <Input 
                label="E-post"
                type="email"
                placeholder="namn@exempel.se"
                leftIcon={<EnvelopeIcon className="h-5 w-5" />}
              />
              <Input 
                label="Lösenord"
                type="password"
                placeholder="••••••••"
                leftIcon={<LockClosedIcon className="h-5 w-5" />}
              />
            </div>
          </section>

          {/* Textarea */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-foreground">Textarea</h2>
            <div className="space-y-4">
              <Textarea 
                label="Beskrivning"
                placeholder="Beskriv aktiviteten..."
                hint="Max 500 tecken"
              />
              <Textarea 
                label="Med error"
                placeholder="Feedback..."
                error="Vänligen fyll i minst 10 tecken"
              />
            </div>
          </section>

          {/* Select */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-foreground">Select</h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <Select 
                label="Kategori"
                options={categoryOptions}
                placeholder="Välj kategori"
              />
              <Select 
                label="Åldersgrupp"
                options={ageOptions}
                placeholder="Välj åldersgrupp"
                hint="Filtrera på lämplig ålder"
              />
              <Select 
                label="Med error"
                options={categoryOptions}
                error="Du måste välja en kategori"
              />
              <Select 
                label="Disabled"
                options={categoryOptions}
                disabled
              />
            </div>
          </section>

          {/* Example form */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-foreground">Exempelformulär</h2>
            <form className="space-y-6 rounded-2xl border border-border bg-card p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input 
                  label="Förnamn"
                  placeholder="Anna"
                  required
                />
                <Input 
                  label="Efternamn"
                  placeholder="Andersson"
                  required
                />
              </div>
              <Input 
                label="E-post"
                type="email"
                placeholder="anna@exempel.se"
                leftIcon={<EnvelopeIcon className="h-5 w-5" />}
                required
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Select 
                  label="Sport"
                  options={categoryOptions}
                  required
                />
                <Select 
                  label="Åldersgrupp"
                  options={ageOptions}
                  required
                />
              </div>
              <Textarea 
                label="Meddelande"
                placeholder="Skriv ditt meddelande här..."
              />
              <div className="flex justify-end gap-3">
                <Button variant="outline">Avbryt</Button>
                <Button type="submit">Skicka</Button>
              </div>
            </form>
          </section>
        </div>
      </div>

      {/* Notes */}
      <div className="mx-auto max-w-4xl border-t border-border p-8">
        <h2 className="text-lg font-semibold text-foreground">Implementationsnoteringar</h2>
        <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-muted-foreground">
          <li>Input: 3 storlekar (sm, md, lg)</li>
          <li>Input: Stöd för <code className="rounded bg-muted px-1">leftIcon</code> för ikoner</li>
          <li>Input/Textarea/Select: <code className="rounded bg-muted px-1">label</code>, <code className="rounded bg-muted px-1">hint</code>, <code className="rounded bg-muted px-1">error</code> props</li>
          <li>Select: options array med <code className="rounded bg-muted px-1">{'{value, label, disabled?}'}</code></li>
          <li>Alla formfält stödjer <code className="rounded bg-muted px-1">disabled</code> state</li>
          <li>Validering via error prop för röd border och felmeddelande</li>
        </ul>
        
        <h3 className="mt-8 text-md font-semibold text-foreground">Användning</h3>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-4 text-sm">
{`import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'

<Input 
  label="E-post"
  placeholder="namn@exempel.se"
  leftIcon={<EnvelopeIcon />}
  error="Ogiltig e-post"
/>

<Select 
  label="Kategori"
  options={[{ value: 'a', label: 'Alt A' }]}
  onChange={(e) => setValue(e.target.value)}
/>`}
        </pre>

        <p className="mt-8 text-xs text-muted-foreground">Senast uppdaterad: 2024-11-30</p>
      </div>
    </div>
  )
}
