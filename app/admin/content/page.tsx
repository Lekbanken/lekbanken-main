const assets = ["MediaPage", "ImageUploader", "MediaCard"];

export default function ContentPage() {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Innehåll</h2>
        <span className="text-xs text-slate-500">Media & komponenter</span>
      </header>
      <p className="text-sm text-slate-700">Assethantering som återanvänder delade modaler och bekräftelsedialoger.</p>
      <div className="flex flex-wrap gap-2 text-xs text-slate-700">
        {assets.map((asset) => (
          <span key={asset} className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-800">
            {asset}
          </span>
        ))}
      </div>
    </section>
  );
}
