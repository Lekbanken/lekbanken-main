/**
 * SectionDivider — subtle accent-gradient line between journey sections.
 * Uses the faction CSS var so it auto-themes with JourneyScene.
 */
export function SectionDivider({ label }: { label?: string }) {
  if (label) {
    return (
      <div className="flex items-center gap-3 py-2">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[var(--journey-accent)]/30 to-transparent" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
          {label}
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[var(--journey-accent)]/30 to-transparent" />
      </div>
    );
  }

  return (
    <div className="py-2">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-[var(--journey-accent)]/20 to-transparent" />
    </div>
  );
}
