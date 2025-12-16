'use client';

import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Switch,
} from '@/components/ui';
import { Label } from '@/components/ui/label';
import {
  ArrowDownTrayIcon,
  DocumentTextIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

type ExportFormat = 'csv' | 'json';

type GameExportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  totalCount: number;
  tenantId?: string | null;
};

type ExportOptions = {
  format: ExportFormat;
  includeSteps: boolean;
  includeMaterials: boolean;
  includePhases: boolean;
  includeRoles: boolean;
  includeBoardConfig: boolean;
  scope: 'selected' | 'all';
};

const defaultOptions: ExportOptions = {
  format: 'csv',
  includeSteps: true,
  includeMaterials: true,
  includePhases: true,
  includeRoles: true,
  includeBoardConfig: true,
  scope: 'all',
};

export function GameExportDialog({
  open,
  onOpenChange,
  selectedIds,
  totalCount,
  tenantId,
}: GameExportDialogProps) {
  const [options, setOptions] = useState<ExportOptions>(defaultOptions);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasSelection = selectedIds.length > 0;
  const exportCount = options.scope === 'selected' ? selectedIds.length : totalCount;

  const handleExport = async () => {
    setError(null);
    setIsExporting(true);

    try {
      // Build query params
      const params = new URLSearchParams();
      params.set('format', options.format);
      params.set('includeSteps', String(options.includeSteps));
      params.set('includeMaterials', String(options.includeMaterials));
      params.set('includePhases', String(options.includePhases));
      params.set('includeRoles', String(options.includeRoles));
      params.set('includeBoardConfig', String(options.includeBoardConfig));

      if (options.scope === 'selected' && selectedIds.length > 0) {
        params.set('ids', selectedIds.join(','));
      }

      if (tenantId) {
        params.set('tenantId', tenantId);
      }

      // Fetch export
      const response = await fetch(`/api/games/csv-export?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Export misslyckades');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || `games-export.${options.format}`;

      // Download the file
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Close dialog on success
      onOpenChange(false);
    } catch (err) {
      console.error('Export failed:', err);
      setError(err instanceof Error ? err.message : 'Ett oväntat fel uppstod');
    } finally {
      setIsExporting(false);
    }
  };

  const updateOption = <K extends keyof ExportOptions>(key: K, value: ExportOptions[K]) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
            <ArrowDownTrayIcon className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle>Exportera lekar</DialogTitle>
          <DialogDescription>
            Välj format och innehåll för exporten. CSV-format fungerar bra i Excel och Google Sheets.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Välj exportformat</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => updateOption('format', 'csv')}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all',
                  options.format === 'csv'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/50'
                )}
              >
                <TableCellsIcon className="h-8 w-8 text-muted-foreground" />
                <div className="text-center">
                  <div className="font-medium">CSV</div>
                  <div className="text-xs text-muted-foreground">Excel / Sheets</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => updateOption('format', 'json')}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all',
                  options.format === 'json'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/50'
                )}
              >
                <DocumentTextIcon className="h-8 w-8 text-muted-foreground" />
                <div className="text-center">
                  <div className="font-medium">JSON</div>
                  <div className="text-xs text-muted-foreground">Fullständig backup</div>
                </div>
              </button>
            </div>
          </div>

          {/* Content selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Inkludera</label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="includeSteps" className="text-sm cursor-pointer">
                  Steg / instruktioner
                </Label>
                <Switch
                  id="includeSteps"
                  checked={options.includeSteps}
                  onCheckedChange={(checked: boolean) => updateOption('includeSteps', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="includeMaterials" className="text-sm cursor-pointer">
                  Material och förberedelser
                </Label>
                <Switch
                  id="includeMaterials"
                  checked={options.includeMaterials}
                  onCheckedChange={(checked: boolean) => updateOption('includeMaterials', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="includePhases" className="text-sm cursor-pointer">
                  Faser (om tillämpligt)
                </Label>
                <Switch
                  id="includePhases"
                  checked={options.includePhases}
                  onCheckedChange={(checked: boolean) => updateOption('includePhases', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="includeRoles" className="text-sm cursor-pointer">
                  Roller (om tillämpligt)
                </Label>
                <Switch
                  id="includeRoles"
                  checked={options.includeRoles}
                  onCheckedChange={(checked: boolean) => updateOption('includeRoles', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="includeBoardConfig" className="text-sm cursor-pointer">
                  Tavla-inställningar (om tillämpligt)
                </Label>
                <Switch
                  id="includeBoardConfig"
                  checked={options.includeBoardConfig}
                  onCheckedChange={(checked: boolean) => updateOption('includeBoardConfig', checked)}
                />
              </div>
            </div>
          </div>

          {/* Scope selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Lekar att exportera</label>
            <div className="space-y-2">
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="scope"
                  checked={options.scope === 'all'}
                  onChange={() => updateOption('scope', 'all')}
                  className="h-4 w-4 text-primary focus:ring-primary"
                />
                <span className="text-sm">
                  Alla synliga lekar <span className="text-muted-foreground">({totalCount} st)</span>
                </span>
              </label>
              <label className={cn('flex items-center gap-3', !hasSelection && 'opacity-50')}>
                <input
                  type="radio"
                  name="scope"
                  checked={options.scope === 'selected'}
                  onChange={() => updateOption('scope', 'selected')}
                  disabled={!hasSelection}
                  className="h-4 w-4 text-primary focus:ring-primary"
                />
                <span className="text-sm">
                  Markerade lekar{' '}
                  <span className="text-muted-foreground">
                    ({hasSelection ? `${selectedIds.length} st` : 'ingen markerad'})
                  </span>
                </span>
              </label>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
          <Button onClick={handleExport} disabled={isExporting || exportCount === 0}>
            <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
            {isExporting ? 'Exporterar...' : `Ladda ner (${exportCount} lekar)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
