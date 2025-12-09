'use client';

import { SandboxShell as SandboxShellV2 } from '../components/shell/SandboxShellV2';
import { SpacingControls } from '../components/controls';
import { useSpacing } from '../store/sandbox-store';

function SpacingPreview() {
  const { spacingBase, borderRadius } = useSpacing();

  return (
    <div className="space-y-8">
      {/* Spacing scale */}
      <div className="space-y-4">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Spacing Scale
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Size</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Preview</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5, 6, 8, 10, 12, 16].map((mult) => (
                <tr key={mult} className="border-b border-border">
                  <td className="px-4 py-2 font-mono text-xs">{mult}</td>
                  <td className="px-4 py-2 tabular-nums">{spacingBase * mult}px</td>
                  <td className="px-4 py-2">
                    <div
                      className="bg-primary"
                      style={{ width: spacingBase * mult, height: 16 }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Border radius */}
      <div className="space-y-4 border-t border-border pt-6">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Border Radius Scale
        </div>
        <div className="flex flex-wrap gap-6">
          {[0, 2, 4, 6, 8, 12, 16, 24, 9999].map((r) => (
            <div key={r} className="text-center">
              <div
                className="mb-2 h-16 w-16 border-2 border-primary bg-primary/10"
                style={{ borderRadius: r === 9999 ? '50%' : r }}
              />
              <span className="text-xs tabular-nums text-muted-foreground">
                {r === 9999 ? 'full' : `${r}px`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Gap examples */}
      <div className="space-y-4 border-t border-border pt-6">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Gap Examples
        </div>
        <div className="space-y-4">
          {[2, 4, 6, 8].map((mult) => (
            <div key={mult}>
              <div className="mb-1 text-xs text-muted-foreground">gap-{mult} ({spacingBase * mult}px)</div>
              <div className="flex" style={{ gap: spacingBase * mult }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-8 w-8 bg-primary"
                    style={{ borderRadius }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Padding examples */}
      <div className="space-y-4 border-t border-border pt-6">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Padding Examples
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[2, 4, 6].map((mult) => (
            <div key={mult} className="border border-border">
              <div
                className="bg-primary/10"
                style={{ padding: spacingBase * mult }}
              >
                <div
                  className="bg-primary p-4 text-center text-sm text-primary-foreground"
                  style={{ borderRadius }}
                >
                  p-{mult}
                  <br />
                  <span className="text-xs opacity-80">{spacingBase * mult}px</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SpacingModuleControls() {
  return <SpacingControls />;
}

export default function SpacingPage() {
  return (
    <SandboxShellV2
      moduleId="spacing"
      title="Spacing"
      description="Define spacing scale, border radius, and layout consistency."
      controls={<SpacingModuleControls />}
    >
      <div className="space-y-8">
        <div className="rounded-xl border border-border bg-card p-6">
          <SpacingPreview />
        </div>
      </div>
    </SandboxShellV2>
  );
}
