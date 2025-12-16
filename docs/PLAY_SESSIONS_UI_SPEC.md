# Play Sessions MVP – UI/UX Specification

**Version:** 1.0  
**Datum:** 2025-12-15  
**Status:** Draft för implementation  

---

## Innehåll

1. [Översikt](#översikt)
2. [Design Principer](#design-principer)
3. [Deltagarytor (Participant Surfaces)](#deltagarytor-participant-surfaces)
4. [Värdytor (Host Surfaces)](#värdytor-host-surfaces)
5. [Adminytor (Admin Surfaces)](#adminytor-admin-surfaces)
6. [Delade Komponenter](#delade-komponenter)
7. [Komponentträd](#komponentträd)
8. [Copy Deck (Svenska)](#copy-deck-svenska)
9. [Design Tokens](#design-tokens)
10. [Responsiv Strategi](#responsiv-strategi)

---

## Översikt

### Målgrupper & Tonalitet

| Yta | Användare | Tonalitet | Fokus |
|-----|-----------|-----------|-------|
| `/play/*` | Anonyma deltagare | Varm, vänlig, lekfull | Enkelhet, snabb anslutning |
| `/app/play/*` | Autentiserade värdar | Professionell, tydlig | Kontroll, överblick |
| `/admin/play/*` | Systemadmins | Operationell, ren | Effektivitet, data |

### Nyckelflöden

```
Deltagare:  /play → Ange kod + namn → /play/session/[code] → Lobby → Session
Värd:       /app/play/sessions → Skapa session → /app/play/sessions/[id] → Starta → Hantera
Admin:      /admin/play/sessions → Lista → Detaljvy → Övervakning
```

---

## Design Principer

### 1. Mobile-First för Deltagare
- `/play/*` optimeras för mobil (vertikal layout, stora touch-targets)
- Min touch-target: 44×44px
- Inputfält: min-height 48px på mobil

### 2. Tydlig Statuskommunikation
- Varje session-status har distinkt färg och ikon
- Statusändringar kommuniceras med toast + visuell uppdatering
- Realtidsuppdateringar utan helsidesladdning

### 3. Konsekvens med Befintligt Design System
- Använd befintliga `Badge`, `Button`, `Card`, `Input` komponenter
- Inga nya typsnitt eller färger utanför palett
- Följa etablerade spacing-mönster (4px-grid)

### 4. Tillgänglighet
- WCAG 2.1 AA minimum
- Kontrast: 4.5:1 för text, 3:1 för UI-element
- Fokusindikatorer på alla interaktiva element
- Screen reader-stöd för statusmeddelanden

---

## Deltagarytor (Participant Surfaces)

### 1. Join-sida (`/play`)

#### Layout (Mobile-First)
```
┌─────────────────────────────────┐
│         🎮 LEKBANKEN            │  ← Logo/brand (centrerad)
│                                 │
│    ┌─────────────────────┐      │
│    │  ╔═══╗╔═══╗╔═══╗    │      │  ← Session code (6 chars)
│    │  ║ D ║║ E ║║ M ║    │      │     Stora, tydliga fält
│    │  ╚═══╝╚═══╝╚═══╝    │      │     Auto-focus, auto-advance
│    │  ╔═══╗╔═══╗╔═══╗    │      │
│    │  ║ O ║║ 1 ║║ 2 ║    │      │
│    │  ╚═══╝╚═══╝╚═══╝    │      │
│    └─────────────────────┘      │
│                                 │
│    ┌─────────────────────┐      │
│    │  Ditt visningsnamn  │      │  ← Display name input
│    │  ___________________│      │
│    └─────────────────────┘      │
│                                 │
│    ┌─────────────────────┐      │
│    │     GÅ MED NU →     │      │  ← Primary CTA
│    └─────────────────────┘      │
│                                 │
│    Har du problem att gå med?   │  ← Help link (muted)
└─────────────────────────────────┘
```

#### Specifikation

**Session Code Input:**
- 6 separata fält (1 tecken vardera)
- Auto-uppercase, endast A-Z0-9
- Auto-advance till nästa fält
- Backspace går till föregående
- Storlek: `h-14 w-12 text-2xl font-mono font-bold text-center`
- Variant: `filled` med `focus:ring-2 focus:ring-primary`

**Display Name Input:**
- Variant: `filled`, Size: `lg`
- Max 20 tecken
- Placeholder: "T.ex. Anna"
- Label: "Ditt visningsnamn"

**Join Button:**
- Variant: `primary`, Size: `lg`
- Full width på mobil
- Loading state: "Ansluter..."
- Disabled tills båda fält är ifyllda

#### Validering & Feltillstånd

| Fel | Meddelande | Styling |
|-----|------------|---------|
| Kod saknas | "Ange en sessionskod" | Input border red |
| Ogiltig kod | "Ingen session hittades med denna kod" | Input border red + shake animation |
| Session avslutad | "Denna session har avslutats" | Warning card below form |
| Session låst | "Sessionen är låst för nya deltagare" | Warning card below form |
| Namn upptaget | "Detta namn används redan i sessionen" | Name input border red |
| Namn för kort | "Minst 2 tecken" | Name input border red |

#### Loading State
- Skeleton för logo och form frame
- Inputfält disabled med pulsating background

#### Success Transition
- Kort success-animation (checkmark + "Ansluter...")
- Redirect till `/play/session/[code]`

---

### 2. Session Lobby (`/play/session/[code]`)

#### Layout
```
┌─────────────────────────────────┐
│  ← Tillbaka    [STATUS BADGE]   │  ← Header
├─────────────────────────────────┤
│                                 │
│         🎮 SESSION NAMN         │  ← Session title
│         ───────────────         │
│                                 │
│    ┌─────────────────────┐      │
│    │  👤 Du (Erik S.)    │      │  ← Your identity card
│    │  ● Ansluten         │      │     (highlighted)
│    └─────────────────────┘      │
│                                 │
│    ┌─────────────────────┐      │
│    │  VÄNTAR PÅ START    │      │  ← Status message (large)
│    │  ⏳ 12 deltagare    │      │
│    └─────────────────────┘      │
│                                 │
│    ┌───────────────────┐        │
│    │  Deltagare (12)   │        │  ← Optional participant list
│    │  ┌───────────────┐│        │     (collapsible on mobile)
│    │  │ Erik S. (du)  ││        │
│    │  │ Anna K.       ││        │
│    │  │ Johan L.      ││        │
│    │  │ ...           ││        │
│    │  └───────────────┘│        │
│    └───────────────────┘        │
│                                 │
│    ┌─────────────────────┐      │
│    │   🚪 LÄMNA SESSION  │      │  ← Leave button (outline/ghost)
│    └─────────────────────┘      │
│                                 │
└─────────────────────────────────┘
```

#### Status-specifika Vyer

**Waiting (Väntar på start):**
```tsx
<StatusMessage
  icon={<ClockIcon />}
  title="Väntar på att sessionen ska starta"
  subtitle="Värden startar snart..."
  variant="waiting"
/>
```

**Running (Pågår):**
```tsx
<StatusMessage
  icon={<PlayIcon />}
  title="Sessionen pågår"
  subtitle="Följ instruktionerna från värden"
  variant="active"
/>
```

**Paused (Pausad):**
```tsx
<StatusMessage
  icon={<PauseIcon />}
  title="Sessionen är pausad"
  subtitle="Vänta, sessionen fortsätter strax..."
  variant="paused"
/>
```

**Ended (Avslutad):**
```tsx
<StatusMessage
  icon={<CheckCircleIcon />}
  title="Sessionen har avslutats"
  subtitle="Tack för att du deltog!"
  variant="ended"
  action={{ label: "Gå med i ny session", href: "/play" }}
/>
```

#### Reconnecting Banner
```tsx
<Banner variant="warning" className="sticky top-0">
  <WifiOffIcon className="h-5 w-5" />
  <span>Ansluter igen... <Spinner /></span>
</Banner>
```

#### Participant List Styling
- Privacy-safe: Visa endast förnamn + initial (t.ex. "Erik S.")
- Nuvarande deltagare markeras med "(du)" och accentfärg
- Status-dot: Grön (ansluten), Gul (idle), Grå (frånkopplad)
- Visa max 10, sedan "+X till" med expand

---

## Värdytor (Host Surfaces)

### 3. Sessions Lista (`/app/play/sessions`)

#### Layout
```
┌─────────────────────────────────────────────────────────────┐
│  Spelsessioner                              [+ NY SESSION]  │
│  Hantera och övervaka dina aktiva sessioner                 │
├─────────────────────────────────────────────────────────────┤
│  🔍 Sök...          [Status ▾] [Datum ▾]      ≡ Filter      │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 🎮 Fredagslek med teamet              [AKTIV] ●      │   │
│  │    DEMO1234 · 5 deltagare · Startad 14:30           │   │
│  │                                        [Öppna →]     │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 🎮 Teambuilding Workshop              [PAUSAD] ●     │   │
│  │    WORK5678 · 3 deltagare · Pausad 12:45            │   │
│  │                                        [Öppna →]     │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 🎮 Morgonlek 15 dec                   [AVSLUTAD] ●   │   │
│  │    MORN9012 · 2 deltagare · Avslutad 09:45          │   │
│  │                                        [Öppna →]     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### Session Card Specifikation
```tsx
<SessionCard
  title={session.display_name}
  code={session.session_code}
  status={session.status}
  participantCount={session.participant_count}
  startedAt={session.started_at}
  href={`/app/play/sessions/${session.id}`}
/>
```

- Card variant: `default`
- Hover: Subtle lift + border highlight
- Click: Navigate to detail

---

### 4. Host Control Panel (`/app/play/sessions/[id]`)

#### Layout (Desktop)
```
┌─────────────────────────────────────────────────────────────────────────┐
│  ← Tillbaka till sessioner                                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  SESSION HEADER                                                  │   │
│  │  ┌────────────────────────────────────────────────────────────┐ │   │
│  │  │  🎮 Fredagslek med teamet                   [AKTIV] ●      │ │   │
│  │  │  ─────────────────────────────────────────────────────     │ │   │
│  │  │                                                            │ │   │
│  │  │  KOD: DEMO1234         play.lekbanken.se/DEMO1234         │ │   │
│  │  │        [📋 Kopiera]    [🔗 Kopiera länk]   [QR-kod]       │ │   │
│  │  └────────────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────┐  ┌───────────────────────────────┐   │
│  │  KONTROLLER                 │  │  DELTAGARE (5)                 │   │
│  │                             │  │                                │   │
│  │  ┌───────────┐ ┌──────────┐│  │  🟢 Erik S.    [ansluten]      │   │
│  │  │  ▶ START  │ │ ⏸ PAUSA  ││  │  🟢 Anna K.    [ansluten]      │   │
│  │  └───────────┘ └──────────┘│  │  🟡 Johan L.   [idle]          │   │
│  │  ┌───────────┐ ┌──────────┐│  │  🔴 Sara A.    [frånkopplad]   │   │
│  │  │ 🔄 ÅTERUP.│ │ ⏹ AVSLUTA││  │  🟢 Karin J.   [ansluten]      │   │
│  │  └───────────┘ └──────────┘│  │                                │   │
│  │                             │  │  ─────────────────             │   │
│  │  ⚠️ Avsluta avslutar       │  │  Väntar: 0 · Aktiva: 4         │   │
│  │     permanent.              │  │  Frånkopplade: 1               │   │
│  └─────────────────────────────┘  └───────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  SESSIONSLOGG (Senaste aktivitet)                               │   │
│  │  ────────────────────────────────────────────────────────────── │   │
│  │  14:35  Erik S. anslöt                                          │   │
│  │  14:34  Anna K. anslöt                                          │   │
│  │  14:33  Session startad                                         │   │
│  │  14:30  Session skapad                                          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Session Header Component
```tsx
<SessionHeader
  title={session.display_name}
  code={session.session_code}
  status={session.status}
  joinUrl={`${baseUrl}/play?code=${session.session_code}`}
  onCopyCode={() => copyToClipboard(session.session_code)}
  onCopyUrl={() => copyToClipboard(joinUrl)}
  onShowQR={() => setQRModalOpen(true)}
/>
```

**Join URL Display:**
- Monospace font för URL
- Copy-knapp med success feedback (checkmark 2s)
- QR-kod i modal (för projektor/skärm)

#### Control Buttons

| Status | Tillgängliga Åtgärder |
|--------|----------------------|
| `active` | Pausa, Avsluta |
| `paused` | Återuppta, Avsluta |
| `locked` | Lås upp, Avsluta |
| `ended` | (Ingen – readonly) |

**Button Styling:**
```tsx
<Button variant="primary" size="lg" className="flex-1">
  <PlayIcon className="h-5 w-5" />
  Starta
</Button>

<Button variant="outline" size="lg" className="flex-1">
  <PauseIcon className="h-5 w-5" />
  Pausa
</Button>

<Button variant="destructive" size="lg" className="flex-1">
  <StopIcon className="h-5 w-5" />
  Avsluta
</Button>
```

#### Participant List (Host View)

| Status | Ikon | Färg | Beskrivning |
|--------|------|------|-------------|
| `active` | ● | `text-success` | Ansluten och aktiv |
| `idle` | ● | `text-warning` | Ansluten men inaktiv >2min |
| `disconnected` | ● | `text-muted-foreground` | Tappat anslutning |
| `kicked` | ● | `text-destructive` | Borttagen av värd |
| `blocked` | 🚫 | `text-destructive` | Blockerad |

**Row Actions (på hover/focus):**
- "Sparka" (kick) – modal confirm
- "Blockera" – modal confirm

---

## Adminytor (Admin Surfaces)

### 5. Admin Sessions List (`/admin/play/sessions`)

#### Layout
```
┌─────────────────────────────────────────────────────────────────────────┐
│  ADMIN: Spelsessioner                                                   │
│  Övervaka alla sessioner i systemet                                     │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  Totalt: 24   Aktiva: 3   Pausade: 1   Avslutade: 20              │ │
│  └────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────┤
│  🔍 Sök...   [Status ▾] [Datum ▾] [Värd ▾] [Organisation ▾]   [Export] │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ Namn          │ Kod      │ Status  │ Delt. │ Värd     │ Org     │   │
│  ├──────────────────────────────────────────────────────────────────┤   │
│  │ Fredagslek    │ DEMO1234 │ [AKTIV] │  5    │ anna@... │ Lekbank │   │
│  │ Workshop      │ WORK5678 │ [PAUSAD]│  3    │ erik@... │ Lekbank │   │
│  │ Morgonlek     │ MORN9012 │ [AVSL.] │  2    │ anna@... │ Lekbank │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ← 1 2 3 ... 5 →   Visar 1-10 av 24                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Admin-specifika Features
- Filtrera på organisation (tenant)
- Visa värd (host email)
- Export till CSV
- Bulk-actions (avsluta flera)

---

## Delade Komponenter

### SessionStatusBadge

```tsx
// components/play/SessionStatusBadge.tsx

type SessionStatus = 'active' | 'paused' | 'locked' | 'ended' | 'archived' | 'cancelled';

const statusConfig: Record<SessionStatus, { label: string; variant: BadgeVariant; icon: ComponentType }> = {
  active: { label: 'Aktiv', variant: 'success', icon: PlayCircleIcon },
  paused: { label: 'Pausad', variant: 'warning', icon: PauseCircleIcon },
  locked: { label: 'Låst', variant: 'secondary', icon: LockClosedIcon },
  ended: { label: 'Avslutad', variant: 'default', icon: CheckCircleIcon },
  archived: { label: 'Arkiverad', variant: 'outline', icon: ArchiveBoxIcon },
  cancelled: { label: 'Avbruten', variant: 'destructive', icon: XCircleIcon },
};

export function SessionStatusBadge({ status, size = 'md', showIcon = true }: Props) {
  const config = statusConfig[status];
  return (
    <Badge variant={config.variant} size={size} dot={!showIcon}>
      {showIcon && <config.icon className="h-3.5 w-3.5" />}
      {config.label}
    </Badge>
  );
}
```

### ParticipantStatusBadge

```tsx
// components/play/ParticipantStatusBadge.tsx

type ParticipantStatus = 'active' | 'idle' | 'disconnected' | 'kicked' | 'blocked';

const statusConfig: Record<ParticipantStatus, { label: string; variant: BadgeVariant }> = {
  active: { label: 'Ansluten', variant: 'success' },
  idle: { label: 'Inaktiv', variant: 'warning' },
  disconnected: { label: 'Frånkopplad', variant: 'secondary' },
  kicked: { label: 'Sparkad', variant: 'destructive' },
  blocked: { label: 'Blockerad', variant: 'error' },
};

export function ParticipantStatusBadge({ status, size = 'sm' }: Props) {
  const config = statusConfig[status];
  return <Badge variant={config.variant} size={size} dot>{config.label}</Badge>;
}
```

### ParticipantRow

```tsx
// components/play/ParticipantRow.tsx

export function ParticipantRow({ 
  participant,
  isCurrentUser = false,
  showActions = false,
  onKick,
  onBlock,
}: Props) {
  return (
    <div className={cn(
      "flex items-center justify-between px-3 py-2 rounded-lg",
      isCurrentUser && "bg-primary/5 ring-1 ring-primary/20"
    )}>
      <div className="flex items-center gap-3">
        <StatusDot status={participant.status} />
        <span className="font-medium text-foreground">
          {participant.display_name}
          {isCurrentUser && <span className="text-muted-foreground ml-1">(du)</span>}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <ParticipantStatusBadge status={participant.status} />
        {showActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <EllipsisVerticalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onKick?.(participant.id)}>
                Sparka
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onBlock?.(participant.id)} className="text-destructive">
                Blockera
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
```

### JoinSessionForm

```tsx
// components/play/JoinSessionForm.tsx

export function JoinSessionForm({ onSubmit, isLoading, error }: Props) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [displayName, setDisplayName] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-advance logic, validation, etc.

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Session Code Inputs */}
      <div>
        <Label>Sessionskod</Label>
        <div className="flex gap-2 justify-center mt-2">
          {code.map((char, i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              type="text"
              inputMode="text"
              maxLength={1}
              value={char}
              onChange={(e) => handleCodeChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className={cn(
                "h-14 w-12 text-center text-2xl font-mono font-bold uppercase",
                "rounded-lg border-2 bg-muted transition-colors",
                "focus:border-primary focus:ring-2 focus:ring-primary/20",
                error && "border-destructive"
              )}
            />
          ))}
        </div>
        {error && <p className="text-sm text-destructive mt-2 text-center">{error}</p>}
      </div>

      {/* Display Name Input */}
      <Input
        label="Ditt visningsnamn"
        placeholder="T.ex. Anna"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        maxLength={20}
        inputSize="lg"
        variant="filled"
      />

      {/* Submit Button */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        loading={isLoading}
        loadingText="Ansluter..."
        disabled={!isValidCode || !displayName.trim()}
      >
        Gå med nu
      </Button>
    </form>
  );
}
```

---

## Komponentträd

### Participant Surfaces

```
/play
└── PlayJoinPage
    ├── Logo
    ├── JoinSessionForm
    │   ├── SessionCodeInput (6x)
    │   ├── Input (display name)
    │   └── Button (submit)
    ├── ErrorCard (conditional)
    └── HelpLink

/play/session/[code]
└── PlaySessionPage
    ├── Header
    │   ├── BackLink
    │   └── SessionStatusBadge
    ├── SessionTitle
    ├── CurrentParticipantCard
    │   ├── Avatar
    │   ├── DisplayName
    │   └── StatusDot
    ├── StatusMessage
    │   ├── Icon
    │   ├── Title
    │   └── Subtitle
    ├── ParticipantList (collapsible)
    │   └── ParticipantRow (n)
    ├── ReconnectingBanner (conditional)
    └── LeaveButton
```

### Host Surfaces

```
/app/play/sessions
└── HostSessionsPage
    ├── PageHeader
    │   └── CreateSessionButton
    ├── SearchInput
    ├── FilterDropdowns
    ├── SessionCardList
    │   └── SessionCard (n)
    │       ├── Title
    │       ├── SessionCode
    │       ├── SessionStatusBadge
    │       ├── ParticipantCount
    │       └── OpenLink
    └── EmptyState (conditional)

/app/play/sessions/[id]
└── HostControlPanelPage
    ├── BackLink
    ├── SessionHeader
    │   ├── Title
    │   ├── SessionStatusBadge
    │   ├── JoinCodeDisplay
    │   │   ├── Code
    │   │   ├── CopyCodeButton
    │   │   ├── CopyUrlButton
    │   │   └── QRButton
    │   └── JoinUrl
    ├── ControlsCard
    │   └── ControlButtons (contextual)
    ├── ParticipantsCard
    │   ├── Header (count + stats)
    │   └── ParticipantRow (n, with actions)
    ├── SessionLogCard
    │   └── LogEntry (n)
    └── QRModal (conditional)
```

### Admin Surfaces

```
/admin/play/sessions
└── AdminSessionsPage
    ├── AdminPageHeader
    ├── StatsRow
    │   └── AdminStatCard (4x)
    ├── FilterBar
    ├── SessionTable
    │   ├── TableHeader
    │   └── TableRow (n)
    ├── Pagination
    └── EmptyState (conditional)

/admin/play/sessions/[id]
└── AdminSessionDetailPage
    ├── (Same as Host, but with admin extras)
    ├── TenantInfo
    ├── HostInfo
    └── AuditLog
```

---

## Copy Deck (Svenska)

### Join Page (`/play`)

```yaml
page_title: "Gå med i session"
code_label: "Sessionskod"
code_placeholder: "6 tecken"
name_label: "Ditt visningsnamn"
name_placeholder: "T.ex. Anna"
submit_button: "Gå med nu"
submit_loading: "Ansluter..."
help_link: "Har du problem att gå med?"

# Errors
error_code_required: "Ange en sessionskod"
error_code_invalid: "Ingen session hittades med denna kod"
error_code_format: "Koden ska vara 6 tecken"
error_session_ended: "Denna session har avslutats"
error_session_locked: "Sessionen är låst för nya deltagare"
error_name_required: "Ange ett visningsnamn"
error_name_taken: "Detta namn används redan i sessionen"
error_name_too_short: "Minst 2 tecken"
error_generic: "Något gick fel. Försök igen."
```

### Session Lobby (`/play/session/[code]`)

```yaml
back_link: "Tillbaka"
your_card_label: "Du"
connected_status: "Ansluten"

# Status messages
status_waiting_title: "Väntar på att sessionen ska starta"
status_waiting_subtitle: "Värden startar snart..."
status_active_title: "Sessionen pågår"
status_active_subtitle: "Följ instruktionerna från värden"
status_paused_title: "Sessionen är pausad"
status_paused_subtitle: "Vänta, sessionen fortsätter strax..."
status_ended_title: "Sessionen har avslutats"
status_ended_subtitle: "Tack för att du deltog!"
status_ended_action: "Gå med i ny session"

# Participants
participants_title: "Deltagare"
participants_you_suffix: "(du)"
participants_more: "+{count} till"

# Reconnecting
reconnecting_message: "Ansluter igen..."

# Leave
leave_button: "Lämna session"
leave_confirm_title: "Lämna session?"
leave_confirm_message: "Du kan gå med igen med samma kod."
leave_confirm_yes: "Ja, lämna"
leave_confirm_no: "Avbryt"
```

### Host Control Panel

```yaml
page_title: "Sessionskontroll"
back_link: "Tillbaka till sessioner"

# Header
code_label: "Kod"
copy_code: "Kopiera kod"
copy_url: "Kopiera länk"
show_qr: "Visa QR-kod"
copied_toast: "Kopierat!"

# Controls
control_start: "Starta"
control_pause: "Pausa"
control_resume: "Återuppta"
control_end: "Avsluta"
control_lock: "Lås"
control_unlock: "Lås upp"

# Confirmations
end_confirm_title: "Avsluta session?"
end_confirm_message: "Detta avslutar sessionen permanent för alla deltagare."
end_confirm_yes: "Ja, avsluta"
end_confirm_no: "Avbryt"

# Participants
participants_title: "Deltagare"
participants_waiting: "Väntar"
participants_active: "Aktiva"
participants_disconnected: "Frånkopplade"
participant_kick: "Sparka"
participant_block: "Blockera"
kick_confirm_title: "Sparka deltagare?"
kick_confirm_message: "{name} kommer tas bort från sessionen."
block_confirm_title: "Blockera deltagare?"
block_confirm_message: "{name} kan inte gå med igen."

# Status badges
status_active: "Aktiv"
status_paused: "Pausad"
status_locked: "Låst"
status_ended: "Avslutad"
status_archived: "Arkiverad"
status_cancelled: "Avbruten"

# Participant statuses
participant_connected: "Ansluten"
participant_idle: "Inaktiv"
participant_disconnected: "Frånkopplad"
participant_kicked: "Sparkad"
participant_blocked: "Blockerad"

# Log
log_title: "Sessionslogg"
log_session_created: "Session skapad"
log_session_started: "Session startad"
log_session_paused: "Session pausad"
log_session_resumed: "Session återupptagen"
log_session_ended: "Session avslutad"
log_participant_joined: "{name} anslöt"
log_participant_left: "{name} lämnade"
log_participant_kicked: "{name} sparkades"
```

### Admin Sessions List

```yaml
page_title: "Spelsessioner"
page_description: "Övervaka alla sessioner i systemet"

# Stats
stat_total: "Totalt"
stat_active: "Aktiva"
stat_paused: "Pausade"
stat_ended: "Avslutade"

# Filters
filter_status: "Status"
filter_date: "Datum"
filter_host: "Värd"
filter_tenant: "Organisation"
search_placeholder: "Sök på namn eller kod..."
export_button: "Exportera"

# Table headers
table_name: "Namn"
table_code: "Kod"
table_status: "Status"
table_participants: "Delt."
table_host: "Värd"
table_tenant: "Org"
table_created: "Skapad"

# Empty state
empty_title: "Inga sessioner"
empty_description: "Det finns inga sessioner att visa."
```

---

## Design Tokens

### Session Status Colors

```css
/* Lägg till i globals.css eller design tokens */

/* Session Status */
--session-active: var(--success);
--session-paused: var(--warning);
--session-locked: var(--muted-foreground);
--session-ended: var(--muted-foreground);

/* Participant Status */
--participant-connected: var(--success);
--participant-idle: var(--warning);
--participant-disconnected: var(--muted-foreground);
--participant-kicked: var(--destructive);
--participant-blocked: var(--destructive);

/* Play Surface (warmer, friendlier) */
--play-bg: hsl(var(--background));
--play-card: hsl(var(--card));
--play-accent: hsl(var(--primary));
--play-muted: hsl(var(--muted));
```

### Spacing & Sizing

```css
/* Touch targets */
--touch-target-min: 44px;

/* Input sizes for /play */
--code-input-size: 48px;  /* 3rem */
--code-input-size-lg: 56px;  /* 3.5rem - mobile */

/* Card padding */
--card-padding-play: var(--spacing-6);  /* 24px */
--card-padding-host: var(--spacing-4);  /* 16px */
```

### Animation Timings

```css
/* Transitions */
--transition-fast: 150ms ease;
--transition-normal: 200ms ease;
--transition-slow: 300ms ease;

/* Status dot pulse */
@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.status-dot-active {
  animation: pulse-dot 2s ease-in-out infinite;
}
```

---

## Responsiv Strategi

### Breakpoints

| Breakpoint | Deltagare | Värd | Admin |
|------------|-----------|------|-------|
| `< 640px` (sm) | ✅ Primär | ⚠️ Stöd | ⚠️ Stöd |
| `640-1024px` (md) | ✅ Stöd | ✅ Primär | ✅ Stöd |
| `> 1024px` (lg) | ✅ Stöd | ✅ Stöd | ✅ Primär |

### Mobile Anpassningar

**Deltagare (`/play/*`):**
- Single column layout
- Code inputs: 2 rader om 3 (om trångt)
- Participant list: Collapsible accordion
- Full-width buttons
- Larger text (16px base)

**Värd (`/app/play/*`):**
- Controls card: Full width, stacked buttons
- Participants card: Below controls (not side-by-side)
- Session log: Collapsed by default

**Admin (`/admin/play/*`):**
- Table → Card list on mobile
- Filters: Sheet/drawer instead of inline

---

## Implementation Prioritet

### Fas 1: Core Components
1. `SessionStatusBadge`
2. `ParticipantStatusBadge`
3. `ParticipantRow`
4. `JoinSessionForm`

### Fas 2: Participant Surfaces
5. `/play` (Join page)
6. `/play/session/[code]` (Lobby)

### Fas 3: Host Surfaces
7. `/app/play/sessions` (List)
8. `/app/play/sessions/[id]` (Control panel)

### Fas 4: Admin Surfaces
9. `/admin/play/sessions` (List)
10. `/admin/play/sessions/[id]` (Detail)

---

## Nästa Steg

1. **Granska och godkänn** denna spec
2. **Skapa komponent-skelett** i `components/play/`
3. **Implementera Fas 1** (delade komponenter)
4. **Implementera Fas 2-4** i ordning
5. **Testa på mobil** (primär användaryta)
6. **Accessibility audit** (kontrast, fokus, ARIA)
