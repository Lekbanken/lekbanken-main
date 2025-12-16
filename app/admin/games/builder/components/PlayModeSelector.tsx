'use client';

import { cn } from '@/lib/utils';

type PlayMode = 'basic' | 'facilitated' | 'participants';

type PlayModeOption = {
  id: PlayMode;
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  features: string[];
};

const modes: PlayModeOption[] = [
  {
    id: 'basic',
    icon: '🎯',
    title: 'Enkel lek',
    subtitle: 'Klassisk lek med steg',
    description: 'Perfekt för snabba lekar. Lägg till steg, material och säkerhetstips.',
    features: ['Steg', 'Material', 'Säkerhet'],
  },
  {
    id: 'facilitated',
    icon: '👨‍🏫',
    title: 'Ledd aktivitet',
    subtitle: 'Med faser och tidsstyrning',
    description: 'För strukturerade workshops. Inkluderar timer, teleprompter och fasstyrning.',
    features: ['+ Faser', '+ Timer', '+ Teleprompter'],
  },
  {
    id: 'participants',
    icon: '🎭',
    title: 'Deltagarlek',
    subtitle: 'Med roller och digital tavla',
    description: 'För mordmysterier och rollspel. Deltagare får hemliga kort via sina mobiler.',
    features: ['+ Allt i Ledd', '+ Roller', '+ Privat kort', '+ Publik tavla'],
  },
];

type PlayModeSelectorProps = {
  value: PlayMode;
  onChange: (mode: PlayMode) => void;
};

export function PlayModeSelector({ value, onChange }: PlayModeSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-1">Välj spelläge</h3>
        <p className="text-sm text-muted-foreground">
          Välj vilken typ av lek du vill skapa. Du kan uppgradera senare.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {modes.map((mode) => {
          const isSelected = value === mode.id;
          
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => onChange(mode.id)}
              className={cn(
                'relative flex flex-col rounded-xl border-2 p-4 text-left transition-all',
                isSelected
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              )}
            >
              {/* Icon */}
              <span className="text-3xl mb-3">{mode.icon}</span>
              
              {/* Title */}
              <h4 className="text-base font-semibold text-foreground">{mode.title}</h4>
              <p className="text-xs text-muted-foreground mb-2">{mode.subtitle}</p>
              
              {/* Description */}
              <p className="text-sm text-muted-foreground flex-1 mb-3">
                {mode.description}
              </p>
              
              {/* Features */}
              <div className="flex flex-wrap gap-1">
                {mode.features.map((feature, idx) => (
                  <span
                    key={idx}
                    className={cn(
                      'inline-block rounded-full px-2 py-0.5 text-xs',
                      feature.startsWith('+')
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {feature}
                  </span>
                ))}
              </div>

              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute -top-px -right-px h-6 w-6 rounded-bl-lg rounded-tr-xl bg-primary flex items-center justify-center">
                  <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <span>💡</span>
        <span>Osäker? Börja enkelt – du kan uppgradera senare.</span>
      </p>
    </div>
  );
}
