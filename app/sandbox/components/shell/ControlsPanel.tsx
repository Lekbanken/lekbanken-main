'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ControlsPanelProps {
  children: ReactNode;
  title?: string;
  className?: string;
}

export function ControlsPanel({ children, title, className }: ControlsPanelProps) {
  return (
    <aside className={cn('flex h-full flex-col border-l border-border bg-card', className)}>
      {title && (
        <div className="flex h-14 shrink-0 items-center border-b border-border px-4">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-4">{children}</div>
    </aside>
  );
}

/* ───────────────────────────────────────────────────────────
   Reusable control components for the sidebar
   ─────────────────────────────────────────────────────────── */

interface ControlGroupProps {
  label: string;
  children: ReactNode;
  description?: string;
}

export function ControlGroup({ label, description, children }: ControlGroupProps) {
  return (
    <div className="mb-6 last:mb-0">
      <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      {description && <p className="mb-2 text-xs text-muted-foreground">{description}</p>}
      {children}
    </div>
  );
}

interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}

export function SliderControl({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
}: SliderControlProps) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">{label}</span>
        <span className="text-xs tabular-nums text-muted-foreground">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
      />
    </div>
  );
}

interface SelectControlProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

export function SelectControl({ label, value, options, onChange }: SelectControlProps) {
  return (
    <div className="mb-4 last:mb-0">
      <label className="mb-1.5 block text-xs font-medium text-foreground">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface ColorPickerControlProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function ColorPickerControl({ label, value, onChange }: ColorPickerControlProps) {
  return (
    <div className="mb-4 last:mb-0">
      <label className="mb-1.5 block text-xs font-medium text-foreground">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-8 cursor-pointer overflow-hidden rounded border border-input"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 font-mono text-xs text-foreground"
        />
      </div>
    </div>
  );
}

interface ToggleControlProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function ToggleControl({ label, checked, onChange }: ToggleControlProps) {
  return (
    <label className="mb-4 flex cursor-pointer items-center justify-between last:mb-0">
      <span className="text-xs font-medium text-foreground">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
          checked ? 'bg-primary' : 'bg-muted'
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0.5'
          )}
        />
      </button>
    </label>
  );
}

interface ButtonGroupControlProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

export function ButtonGroupControl({ label, value, options, onChange }: ButtonGroupControlProps) {
  return (
    <div className="mb-4 last:mb-0">
      <label className="mb-1.5 block text-xs font-medium text-foreground">{label}</label>
      <div className="flex rounded-md border border-input bg-background">
        {options.map((opt, idx) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex-1 px-3 py-1.5 text-xs font-medium transition-colors',
              idx === 0 && 'rounded-l-md',
              idx === options.length - 1 && 'rounded-r-md',
              value === opt.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
