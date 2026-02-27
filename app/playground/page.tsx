// app/playground/page.tsx
'use client';

import { useTranslations } from 'next-intl';

export default function PlaygroundPage() {
  const t = useTranslations('playground');
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <header className="mb-8 border-b border-slate-800 pb-6">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
            {t('subtitle')}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {t('title')}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            {t('description')}
          </p>
        </header>

        <section className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-lg font-medium tracking-tight">
              {t('sandbox1Title')}
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              {t('sandbox1Description')}
            </p>

            <div className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-6 text-sm text-slate-400">
              {t('sandbox1Placeholder')}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-lg font-medium tracking-tight">
              {t('sandbox2Title')}
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              {t('sandbox2Description')}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
