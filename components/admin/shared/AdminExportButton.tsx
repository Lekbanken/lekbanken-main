'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  ArrowDownTrayIcon,
  DocumentTextIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';
import { 
  exportToCSV, 
  exportToJSON, 
  getExportFilename,
  type ExportColumn,
} from '@/lib/utils/export';

interface AdminExportButtonProps<T> {
  /** Data to export */
  data: T[];
  /** Column definitions for export */
  columns: ExportColumn<T>[];
  /** Base filename (date will be appended) */
  filename: string;
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Button variant */
  variant?: 'default' | 'outline' | 'ghost';
  /** Whether to show dropdown with format options */
  showFormatOptions?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * Export button component for admin tables.
 * Supports CSV and JSON export formats.
 */
export function AdminExportButton<T>({
  data,
  columns,
  filename,
  size = 'sm',
  variant = 'outline',
  showFormatOptions = false,
  disabled = false,
  className = '',
}: AdminExportButtonProps<T>) {
  const [isOpen, setIsOpen] = useState(false);

  const handleExportCSV = () => {
    exportToCSV({
      data,
      columns,
      filename: getExportFilename(filename),
    });
    setIsOpen(false);
  };

  const handleExportJSON = () => {
    exportToJSON({
      data,
      filename: getExportFilename(filename),
    });
    setIsOpen(false);
  };

  if (!showFormatOptions) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={handleExportCSV}
        disabled={disabled || data.length === 0}
        className={className}
      >
        <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
        Exportera
      </Button>
    );
  }

  return (
    <div className="relative">
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || data.length === 0}
        className={className}
      >
        <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
        Exportera
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          
          {/* Dropdown menu */}
          <div 
            className="absolute right-0 top-full z-20 mt-1 min-w-[160px] overflow-hidden rounded-lg border border-border bg-card shadow-lg"
            role="menu"
          >
            <button
              onClick={handleExportCSV}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
              role="menuitem"
            >
              <TableCellsIcon className="h-4 w-4 text-muted-foreground" />
              Exportera som CSV
            </button>
            <button
              onClick={handleExportJSON}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
              role="menuitem"
            >
              <DocumentTextIcon className="h-4 w-4 text-muted-foreground" />
              Exportera som JSON
            </button>
          </div>
        </>
      )}
    </div>
  );
}
