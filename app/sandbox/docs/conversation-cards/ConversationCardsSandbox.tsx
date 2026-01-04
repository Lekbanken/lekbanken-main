"use client";

import { useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetHeader,
  SheetTitle,
} from "@/components/ui";
import { Badge, Button } from "@/components/ui";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

type CardSample = {
  id: string;
  order: number;
  title?: string;
  prompt: string;
  followups: string[];
  leaderTip?: string;
  category: string;
  audience: string;
};

const DEFAULT_CARD_TITLE = "Utan titel";

function getCardTitle(card: CardSample) {
  return card.title?.trim() ? card.title : DEFAULT_CARD_TITLE;
}

const SAMPLE_COLLECTION = {
  title: "Tema & stämning",
  status: "Draft",
  language: "SV",
  audience: "10–12 år",
  description:
    "Samtalskort som skapar glädje, gemenskap och positiv stämning i grupper.",
  mainPurpose: "Tema & stämning",
  subPurposes: [
    "Social gemenskap",
    "Humor och glädje",
    "Inkluderande firanden",
    "Teamwork i firande",
  ],
  count: 24,
};

const SAMPLE_CARDS: CardSample[] = [
  {
    id: "1",
    order: 13,
    title: "Starta mjukt",
    prompt: "Vad är en liten sak som gjorde din dag lite bättre?",
    followups: ["Vad gjorde det meningsfullt?", "Hur kan du ge det vidare?"],
    leaderTip: "Ge alla 10 sekunder att tänka innan någon svarar.",
    category: "Check-in",
    audience: "11+",
  },
  {
    id: "2",
    order: 14,
    title: "Ögonblicket",
    prompt: "Beskriv ett ögonblick där du kände dig helt närvarande.",
    followups: ["Vad hjälpte dig att vara där?", "Vad vill du ta med dig?"],
    category: "Reflektion",
    audience: "15+",
  },
  {
    id: "3",
    order: 15,
    title: "Perspektiv",
    prompt: "Vad tror du att andra i gruppen behövde idag?",
    followups: ["Vilka tecken lade du märke till?", "Hur kan vi möta det?"],
    category: "Grupp",
    audience: "13+",
  },
  {
    id: "4",
    order: 16,
    title: "Avsluta",
    prompt: "Vad vill du tacka dig själv för just nu?",
    followups: ["Hur vill du avsluta samtalet?", "Vad tar du med dig?"],
    leaderTip: "Summera två ord du hör ofta och tacka gruppen.",
    category: "Avslut",
    audience: "11+",
  },
];

function CardPreview({
  card,
  index,
  variant,
}: {
  card: CardSample;
  index: number;
  variant: "deck" | "rail" | "focus";
}) {
  const accent =
    variant === "deck"
      ? "border-l-4 border-l-primary/30"
      : variant === "rail"
      ? "border-l-4 border-l-accent/30"
      : "border-l-4 border-l-muted-foreground/30";

  return (
    <div
      className={`relative rounded-2xl border border-border bg-card p-4 shadow-sm ${accent}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {card.category}
          </p>
          <h3 className="text-base font-semibold text-foreground">
            {getCardTitle(card)}
          </h3>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant="outline" size="sm">
            {index + 1} / {SAMPLE_COLLECTION.count}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Sortering {card.order}
          </span>
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{card.prompt}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        Syfte: {SAMPLE_COLLECTION.mainPurpose}
      </p>
      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>{SAMPLE_COLLECTION.title}</span>
        <span>{card.audience}</span>
      </div>
    </div>
  );
}

function DrawerNavigation({
  index,
  total,
}: {
  index: number;
  total: number;
}) {
  const progress = Math.round(((index + 1) / total) * 100);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Kort {index + 1} av {total}
        </span>
        <span>{progress}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-foreground/80"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <Button size="sm" variant="outline">
          <ChevronLeftIcon className="h-4 w-4" />
          Föregående
        </Button>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: total }).map((_, idx) => (
            <span
              key={idx}
              className={`h-1.5 w-1.5 rounded-full ${
                idx === index ? "bg-foreground" : "bg-muted-foreground/40"
              }`}
            />
          ))}
        </div>
        <Button size="sm">
          Nästa
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function DrawerCard({ card }: { card: CardSample }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {card.category}
          </p>
          <h3 className="text-xl font-semibold text-foreground">
            {getCardTitle(card)}
          </h3>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant="outline" size="sm">
            {card.audience}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Sortering {card.order}
          </span>
        </div>
      </div>
      <p className="mt-6 text-lg text-foreground">{card.prompt}</p>
      <div className="mt-6 space-y-2 text-sm text-muted-foreground">
        {card.followups.map((item) => (
          <div key={item} className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-muted-foreground/70" />
            <p>{item}</p>
          </div>
        ))}
      </div>
      {card.leaderTip ? (
        <div className="mt-6 rounded-2xl border border-border bg-muted/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Ledartips
          </p>
          <p className="mt-2 text-sm text-foreground">{card.leaderTip}</p>
        </div>
      ) : null}
    </div>
  );
}

function CollectionMetaRow() {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <Badge variant="outline" size="sm">
        Målgrupp: {SAMPLE_COLLECTION.audience}
      </Badge>
      <Badge variant="outline" size="sm">
        Språk: {SAMPLE_COLLECTION.language}
      </Badge>
      <Badge variant="outline" size="sm">
        Status: {SAMPLE_COLLECTION.status}
      </Badge>
      <Badge variant="outline" size="sm">
        Huvudsyfte: {SAMPLE_COLLECTION.mainPurpose}
      </Badge>
    </div>
  );
}

function CollectionPurposeRow() {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      {SAMPLE_COLLECTION.subPurposes.map((purpose) => (
        <Badge key={purpose} variant="outline" size="sm">
          {purpose}
        </Badge>
      ))}
    </div>
  );
}

function RoleSplitHint() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="rounded-2xl border border-border bg-muted/20 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Lekledare
        </p>
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          <li>- Byter kort och styr tempo</li>
          <li>- Ser index och samlingsöversikt</li>
          <li>- Kan slumpa eller hoppa</li>
          <li>- Ser ledartips och syften</li>
        </ul>
      </div>
      <div className="rounded-2xl border border-border bg-muted/20 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Deltagare
        </p>
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          <li>- Fokus på läsning och svar</li>
          <li>- Mindre kontroller</li>
          <li>- Trygg, stilla layout</li>
          <li>- Ser inte extra metadata</li>
        </ul>
      </div>
    </div>
  );
}

function VariantDeckDrawer() {
  const [open, setOpen] = useState(false);
  const card = SAMPLE_CARDS[0];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Variant A - Deck Drawer Minimal
          </h3>
          <p className="text-sm text-muted-foreground">
            Stacked deck preview + bottom drawer.
          </p>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button size="sm">Dra ett kort</Button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="rounded-t-3xl border-border bg-card"
          >
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
              <div className="flex items-center justify-between">
                <SheetHeader>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {SAMPLE_COLLECTION.title}
                  </p>
                  <SheetTitle className="text-2xl font-semibold text-foreground">
                    Samtalskort
                  </SheetTitle>
                  <div className="mt-2 space-y-2">
                    <CollectionMetaRow />
                    <p className="text-sm text-muted-foreground">
                      {SAMPLE_COLLECTION.description}
                    </p>
                    <CollectionPurposeRow />
                  </div>
                </SheetHeader>
                <SheetClose asChild>
                  <Button variant="outline" size="sm">
                    <XMarkIcon className="h-4 w-4" />
                    Stäng
                  </Button>
                </SheetClose>
              </div>
              <DrawerCard card={card} />
              <DrawerNavigation index={0} total={SAMPLE_COLLECTION.count} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="grid gap-3 md:grid-cols-[1.4fr_1fr]">
        <div className="relative">
          <div className="absolute -left-3 top-3 h-full w-full rounded-2xl bg-muted/40" />
          <div className="absolute -left-6 top-6 h-full w-full rounded-2xl bg-muted/20" />
          <CardPreview card={card} index={0} variant="deck" />
        </div>
        <div className="rounded-2xl border border-border bg-muted/10 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Stängd vy</p>
          <p className="mt-2">
            En lugn kortyta med tydligt kortnummer och samlingsnamn.
          </p>
          <p className="mt-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Drag-känsla
          </p>
        </div>
      </div>
      <RoleSplitHint />
    </section>
  );
}

function VariantSideDrawer() {
  const [open, setOpen] = useState(false);
  const card = SAMPLE_CARDS[2];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Variant B - Side Drawer Library
          </h3>
          <p className="text-sm text-muted-foreground">
            Horizontal shelf + right drawer.
          </p>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button size="sm" variant="outline">
              Öppna kort
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="bg-card">
            <div className="flex h-full flex-col gap-6">
              <div className="flex items-center justify-between">
                <SheetHeader>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {SAMPLE_COLLECTION.title}
                  </p>
                  <SheetTitle className="text-xl font-semibold text-foreground">
                    Bibliotek
                  </SheetTitle>
                  <div className="mt-2 space-y-2">
                    <CollectionMetaRow />
                    <CollectionPurposeRow />
                  </div>
                </SheetHeader>
                <SheetClose asChild>
                  <Button variant="outline" size="sm">
                    <XMarkIcon className="h-4 w-4" />
                    Stäng
                  </Button>
                </SheetClose>
              </div>
              <DrawerCard card={card} />
              <DrawerNavigation index={2} total={SAMPLE_COLLECTION.count} />
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">Mini-index</p>
                <p className="mt-2">
                  Visa alla kort som lista för snabb hoppning.
                </p>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {SAMPLE_CARDS.map((cardItem, index) => (
          <div key={cardItem.id} className="min-w-[240px]">
            <CardPreview card={cardItem} index={index} variant="rail" />
          </div>
        ))}
      </div>
      <RoleSplitHint />
    </section>
  );
}

function VariantFocusDrawer() {
  const [open, setOpen] = useState(false);
  const card = SAMPLE_CARDS[1];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Variant C - Focus Drawer Full
          </h3>
          <p className="text-sm text-muted-foreground">
            Near-full height drawer with immersive card.
          </p>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button size="sm">Fokusera kort</Button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="h-[88vh] rounded-t-3xl bg-card"
          >
            <div className="mx-auto flex h-full w-full max-w-4xl flex-col gap-6">
              <div className="flex items-center justify-between">
                <SheetHeader>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Reflektion
                  </p>
                  <SheetTitle className="text-2xl font-semibold text-foreground">
                    Samtalskort
                  </SheetTitle>
                  <div className="mt-2 space-y-2">
                    <CollectionMetaRow />
                    <CollectionPurposeRow />
                  </div>
                </SheetHeader>
                <SheetClose asChild>
                  <Button variant="outline" size="sm">
                    <XMarkIcon className="h-4 w-4" />
                    Stäng
                  </Button>
                </SheetClose>
              </div>

              <div className="flex-1 overflow-auto">
                <DrawerCard card={card} />
              </div>
              <DrawerNavigation index={1} total={SAMPLE_COLLECTION.count} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Reflektion
            </p>
            <h4 className="text-lg font-semibold text-foreground">
              {getCardTitle(card)}
            </h4>
          </div>
          <Badge variant="outline" size="sm">
            {SAMPLE_COLLECTION.count} kort
          </Badge>
        </div>
        <p className="mt-4 text-base text-foreground">{card.prompt}</p>
      </div>
      <RoleSplitHint />
    </section>
  );
}

export function ConversationCardsSandbox() {
  const variants = useMemo(
    () => [<VariantDeckDrawer key="deck" />, <VariantSideDrawer key="side" />, <VariantFocusDrawer key="focus" />],
    []
  );

  return (
    <div className="space-y-10">
      <div className="rounded-3xl border border-border bg-card p-6">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            UX Sandbox
          </p>
          <h2 className="text-2xl font-semibold text-foreground">
            Samtalskort - Användarupplevelse
          </h2>
          <p className="text-sm text-muted-foreground">
            Tre skilda riktningar för kortkänsla, drawer och navigation.
          </p>
        </div>
      </div>

      <div className="space-y-12">{variants}</div>
    </div>
  );
}
