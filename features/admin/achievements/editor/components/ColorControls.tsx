'use client';

type ColorControlsProps = {
  value: { base: string; background: string; foreground: string; symbol: string };
  onChange: (value: { base: string; background: string; foreground: string; symbol: string }) => void;
};

export function ColorControls({ value, onChange }: ColorControlsProps) {
  const handleChange = (key: keyof typeof value, color: string) => {
    onChange({ ...value, [key]: color });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Colors</p>
        <p className="text-xs text-muted-foreground">Adjust tint for each layer</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {(["base", "background", "foreground", "symbol"] as const).map((key) => (
          <label key={key} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
            <span className="capitalize text-foreground">{key}</span>
            <input
              type="color"
              value={value[key]}
              onChange={(event) => handleChange(key, event.target.value)}
              className="h-9 w-16 cursor-pointer rounded border border-border bg-background"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
