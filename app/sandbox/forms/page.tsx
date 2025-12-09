'use client'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { MagnifyingGlassIcon, EnvelopeIcon, LockClosedIcon } from '@heroicons/react/20/solid'
import { SimpleModulePage } from '../components/shell/SimpleModulePage'

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
    <SimpleModulePage
      moduleId="forms"
      title="Forms"
      description="Input, textarea, and select form components."
    >
      <div className="space-y-12">
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
    </SimpleModulePage>
  )
}
