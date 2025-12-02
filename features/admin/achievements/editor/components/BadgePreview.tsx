'use client';

type BadgePreviewProps = {
  layers: { base?: string; background?: string; foreground?: string; symbol?: string };
  colors: { base: string; background: string; foreground: string; symbol: string };
};

export function BadgePreview({ layers, colors }: BadgePreviewProps) {
  return (
    <div className="relative h-40 w-40">
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-background to-muted border border-border" />
      <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
        <div className="space-y-1 text-center">
          <p className="text-foreground">Preview</p>
          <p>Base: {layers.base || "none"}</p>
          <p>Back: {layers.background || "none"}</p>
          <p>Front: {layers.foreground || "none"}</p>
          <p>Symbol: {layers.symbol || "none"}</p>
          <div className="mt-1 text-[10px] text-muted-foreground">
            Colors: base {colors.base}, bg {colors.background}, fg {colors.foreground}, sym {colors.symbol}
          </div>
        </div>
      </div>
    </div>
  );
}
