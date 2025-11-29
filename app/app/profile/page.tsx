const preferences = ["Avatar", "TagChip", "Modal för sessioner"];

export default function ProfilePage() {
  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">ProfileScreen</h2>
        <span className="text-xs text-indigo-200">Delad Modal</span>
      </header>
      <p className="text-sm text-slate-200">
        Profilvyn visar användaruppgifter, sessioner och inställningar. Återanvänder delade atomer och molekyler.
      </p>
      <ul className="mt-3 space-y-2 text-sm text-slate-100">
        {preferences.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span className="mt-1 h-2 w-2 rounded-full bg-indigo-400" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
