'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SandboxShell } from '../../components/shell/SandboxShellV2'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { LogoControls } from '../../components/controls'
import { LogoLockup } from '../../components/previews'
import { useColors } from '../../store/sandbox-store'

type IconVariant = 'light-default' | 'dark-default' | 'light-test' | 'dark-test'
type IconState = Record<IconVariant, string>
const storageKey = 'lekbanken.icon-urls'

export default function IconGuidelinesPage() {
  const router = useRouter()
  const isProd = process.env.NODE_ENV === 'production'

  useEffect(() => {
    if (isProd) {
      router.replace('/')
    }
  }, [isProd, router])

  const [lightDefault, setLightDefault] = useState(() => {
    if (typeof window === 'undefined') return '/lekbanken-icon.png';
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as IconState;
        return parsed['light-default'] || '/lekbanken-icon.png';
      }
    } catch {}
    return '/lekbanken-icon.png';
  });

  const [darkDefault, setDarkDefault] = useState(() => {
    if (typeof window === 'undefined') return '/lekbanken-icon.png';
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as IconState;
        return parsed['dark-default'] || '/lekbanken-icon.png';
      }
    } catch {}
    return '/lekbanken-icon.png';
  });

  const [lightTest, setLightTest] = useState(() => {
    if (typeof window === 'undefined') return '/lekbanken-icon-green.png';
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as IconState;
        return parsed['light-test'] || '/lekbanken-icon-green.png';
      }
    } catch {}
    return '/lekbanken-icon-green.png';
  });

  const [darkTest, setDarkTest] = useState(() => {
    if (typeof window === 'undefined') return '/lekbanken-icon-purple.png';
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as IconState;
        return parsed['dark-test'] || '/lekbanken-icon-purple.png';
      }
    } catch {}
    return '/lekbanken-icon-purple.png';
  });
  const [savedMessage, setSavedMessage] = useState<string | null>(null)
  const { colorScheme } = useColors()

  // Autospara på förändring
  useEffect(() => {
    const payload: IconState = {
      'light-default': lightDefault,
      'dark-default': darkDefault,
      'light-test': lightTest,
      'dark-test': darkTest,
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload))
    } catch {
      console.warn('Kunde inte spara ikon-URL:er')
    }
  }, [lightDefault, darkDefault, lightTest, darkTest])

  const handleSaveClick = () => {
    const payload: IconState = {
      'light-default': lightDefault,
      'dark-default': darkDefault,
      'light-test': lightTest,
      'dark-test': darkTest,
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload))
      setSavedMessage('Sparat lokalt')
      setTimeout(() => setSavedMessage(null), 2000)
    } catch {
      setSavedMessage('Kunde inte spara')
    }
  }

  const variants: Record<IconVariant, { label: string; url: string; setter: (v: string) => void }> =
    useMemo(
      () => ({
        'light-default': { label: 'Original (ljust tema)', url: lightDefault, setter: setLightDefault },
        'dark-default': { label: 'Original (mörkt tema)', url: darkDefault, setter: setDarkDefault },
        'light-test': { label: 'Test (ljust tema)', url: lightTest, setter: setLightTest },
        'dark-test': { label: 'Test (mörkt tema)', url: darkTest, setter: setDarkTest },
      }),
      [lightDefault, darkDefault, lightTest, darkTest]
    )

  const previewPairs = [
    {
      title: 'Ljust tema',
      bgClass: 'bg-white',
      textClass: 'text-slate-900',
      primary: variants['light-default'].url,
      secondary: variants['light-test'].url,
    },
    {
      title: 'Mörkt tema',
      bgClass: 'bg-slate-900',
      textClass: 'text-white',
      primary: variants['dark-default'].url,
      secondary: variants['dark-test'].url,
    },
  ]

  const iconForLockup = colorScheme === 'dark' ? (darkTest || darkDefault) : (lightTest || lightDefault)

  if (isProd) {
    return null
  }

  return (
    <SandboxShell
      moduleId="icons"
      title="Icon & Logo Guidelines"
      description="Lekbanken-ikonen, färgtester och logolayout på en och samma sida."
      controls={<LogoControls />}
    >
      <div className="space-y-12">
        {/* Icon URL controls */}
        <section className="rounded-xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Byt ikon-URL</h2>
              <p className="text-sm text-muted-foreground">
                Testa olika färger/varianter samtidigt. Två extra filer finns uppladdade:
                <code className="mx-2 rounded bg-muted px-1 py-0.5 font-mono text-[11px]">/lekbanken-icon-green.png</code>
                och
                <code className="mx-2 rounded bg-muted px-1 py-0.5 font-mono text-[11px]">/lekbanken-icon-purple.png</code>.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {savedMessage && <span className="text-xs text-muted-foreground">{savedMessage}</span>}
              <Button size="sm" onClick={handleSaveClick}>Spara</Button>
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {(['light-default', 'dark-default', 'light-test', 'dark-test'] as IconVariant[]).map((key) => {
              const item = variants[key]
              return (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key}>{item.label}</Label>
                  <Input
                    id={key}
                    value={item.url}
                    onChange={(e) => item.setter(e.target.value)}
                    placeholder="/lekbanken-icon.png"
                  />
                </div>
              )
            })}
          </div>
        </section>

        {/* Icon previews */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-6 text-lg font-semibold text-foreground">Ikonförhandsvisningar</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            {previewPairs.map((pair) => (
              <div key={pair.title} className="space-y-4 rounded-lg border border-border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{pair.title}</h3>
                    <p className="text-xs text-muted-foreground">Original + test sida vid sida</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{pair.bgClass.includes('900') ? 'Dark' : 'Light'}</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[{ label: 'Original', src: pair.primary }, { label: 'Test', src: pair.secondary }].map((item) => (
                    <div key={item.label} className={`rounded-lg ${pair.bgClass} p-4`}>
                      <div className="flex h-32 items-center justify-center">
                        <Image
                          src={item.src || '/lekbanken-icon.png'}
                          alt={`${item.label} ikon`}
                          width={64}
                          height={64}
                          className="h-16 w-16"
                          unoptimized
                        />
                      </div>
                      <div className={`mt-3 text-xs ${pair.textClass}`}>{item.label}</div>
                      <div className="mt-1 truncate text-[11px] text-muted-foreground">{item.src}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Logo lockup (ikon i bruk) */}
        <section className="rounded-xl border border-border bg-card p-6">
          <LogoLockup iconSrc={iconForLockup} />
        </section>

        {/* Usage Guidelines */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Användningsriktlinjer</h2>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
              <span>
                <strong className="text-foreground">Minsta storlek:</strong> 32×32 pixlar.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
              <span>
                <strong className="text-foreground">Friyta:</strong> Lämna minst 8px runt ikonen.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
              <span>
                <strong className="text-foreground">Bakgrund:</strong> Anpassa färg efter ljus/mörk bakgrund för tydlig kontrast.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
              <span>
                <strong className="text-foreground">Ingen modifiering:</strong> Skala proportionerligt, undvik skuggor/rotation.
              </span>
            </li>
          </ul>
        </section>

        {/* File Info */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Filinformation</h2>
          <div className="rounded-lg bg-muted p-4">
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Sökvägar</dt>
                <dd className="font-mono text-foreground space-y-1">
                  <div>/public/lekbanken-icon.png</div>
                  <div>/public/lekbanken-icon-green.png</div>
                  <div>/public/lekbanken-icon-purple.png</div>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Format</dt>
                <dd className="font-mono text-foreground">PNG (transparent)</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Användning</dt>
                <dd className="text-foreground">Header, footer, app-ikon, favicons</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Varianter</dt>
                <dd className="text-foreground">Original + 2 testfärger</dd>
              </div>
            </dl>
          </div>
        </section>
      </div>
    </SandboxShell>
  )
}
