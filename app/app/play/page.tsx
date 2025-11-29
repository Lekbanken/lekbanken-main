const controls = ["TimerWidget", "PlayControls", "BottomSheet"];

export default function PlayPage() {
  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">PlayScreen</h2>
        <span className="text-xs text-indigo-200">Utility: PullToRefresh</span>
      </header>
      <p className="text-sm text-slate-200">
        Operativ vy under en lek. Behöver klara offline, snabba actions och tydliga kontroller.
      </p>
      <div className="flex flex-wrap gap-2 text-xs text-slate-100">
        {controls.map((control) => (
          <span key={control} className="rounded-full bg-indigo-500/30 px-3 py-1">
            {control}
          </span>
        ))}
      </div>
    </section>
  );
}
