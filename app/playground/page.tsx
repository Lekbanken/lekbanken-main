// app/playground/page.tsx
export default function PlaygroundPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <header className="mb-8 border-b border-slate-800 pb-6">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
            Lekbanken · UI Playground
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Design playground
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Här kan du klistra in TailwindPLUS-komponenter, justera färger och
            layout, och sedan flytta färdiga komponenter till
            <code className="ml-1 rounded bg-slate-900 px-1.5 py-0.5 text-[0.7rem]">
              components/ui
            </code>
            .
          </p>
        </header>

        <section className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-lg font-medium tracking-tight">
              Sandlåda 1 – klistra in komponent här
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              Byt ut denna box mot en komponent från TailwindPLUS. Testa
              spacing, färger, responsivitet mm.
            </p>

            <div className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-6 text-sm text-slate-400">
              {/* Klistra in TailwindPLUS-komponenter här */}
              Placeholder för första komponenten.
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-lg font-medium tracking-tight">
              Sandlåda 2 – alternativ layout
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              Använd den här sektionen för att testa varianter av samma
              komponent eller helt andra komponenttyper.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
