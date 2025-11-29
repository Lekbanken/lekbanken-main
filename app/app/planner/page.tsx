const steps = [
  "Mål och progress tracking",
  "GoalCard för individuella mål",
  "DragHandle för mobilvänlig sortering",
];

export default function PlannerPage() {
  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">PlannerScreen</h2>
        <span className="text-xs text-indigo-200">Organism: ProgressTracker</span>
      </header>
      <p className="text-sm text-slate-200">
        Samlar planeringsvyn för lekledare. Fokus på mobila gester, drag and drop och snabb överblick.
      </p>
      <ol className="mt-3 space-y-2 text-sm text-slate-100">
        {steps.map((step, index) => (
          <li key={step} className="flex items-start gap-2">
            <span className="mt-0.5 rounded-full bg-indigo-400 px-2 py-0.5 text-[10px] font-semibold">{index + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
