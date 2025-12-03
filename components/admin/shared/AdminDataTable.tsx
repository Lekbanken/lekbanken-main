'use client';

import type { ReactNode, ReactElement } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface Column<T> {
  /** Column header */
  header: string;
  /** Accessor key or function to get cell value */
  accessor: keyof T | ((row: T) => ReactNode);
  /** Optional cell renderer */
  cell?: (row: T) => ReactNode;
  /** Column width class */
  width?: string;
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  /** Hide column at certain breakpoints */
  hideBelow?: 'sm' | 'md' | 'lg';
  /** Whether column is sortable */
  sortable?: boolean;
}

interface AdminDataTableProps<T> {
  /** Data to display */
  data: T[];
  /** Column definitions */
  columns: Column<T>[];
  /** Unique key accessor */
  keyAccessor: keyof T | ((row: T) => string);
  /** Loading state */
  isLoading?: boolean;
  /** Empty state component */
  emptyState?: ReactNode;
  /** Row click handler */
  onRowClick?: (row: T) => void;
  /** Additional className */
  className?: string;
  /** Number of skeleton rows to show when loading */
  skeletonRows?: number;
  /** Caption for accessibility */
  caption?: string;
}

const alignClasses = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

const hideClasses = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
};

/**
 * Shared data table component for admin pages.
 * Provides consistent table styling with loading and empty states.
 * 
 * @example
 * <AdminDataTable
 *   data={users}
 *   columns={[
 *     { header: 'Namn', accessor: 'name' },
 *     { header: 'E-post', accessor: 'email', hideBelow: 'sm' },
 *     { header: 'Status', accessor: 'status', cell: (row) => <Badge>{row.status}</Badge> },
 *   ]}
 *   keyAccessor="id"
 *   onRowClick={(user) => openUserModal(user)}
 * />
 */
export function AdminDataTable<T>({
  data,
  columns,
  keyAccessor,
  isLoading = false,
  emptyState,
  onRowClick,
  className = '',
  skeletonRows = 5,
  caption,
}: AdminDataTableProps<T>): ReactElement {
  const getKey = (row: T): string => {
    if (typeof keyAccessor === 'function') {
      return keyAccessor(row);
    }
    return String(row[keyAccessor]);
  };

  const getCellValue = (row: T, column: Column<T>): ReactNode => {
    if (column.cell) {
      return column.cell(row);
    }
    if (typeof column.accessor === 'function') {
      return column.accessor(row);
    }
    const value = row[column.accessor];
    return value !== null && value !== undefined ? String(value) : '–';
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className={`overflow-hidden rounded-xl border border-border bg-card ${className}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            {caption && <caption className="sr-only">{caption}</caption>}
            <thead className="border-b border-border bg-muted/40">
              <tr>
                {columns.map((col, i) => (
                  <th
                    key={i}
                    scope="col"
                    className={`px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground ${alignClasses[col.align || 'left']} ${col.hideBelow ? hideClasses[col.hideBelow] : ''} ${col.width || ''}`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Array.from({ length: skeletonRows }).map((_, rowIndex) => (
                <tr key={rowIndex}>
                  {columns.map((col, colIndex) => (
                    <td
                      key={colIndex}
                      className={`px-4 py-3.5 ${col.hideBelow ? hideClasses[col.hideBelow] : ''}`}
                    >
                      <div 
                        className="h-4 animate-pulse rounded bg-muted" 
                        style={{ width: `${60 + Math.random() * 30}%` }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Empty state
  if (data.length === 0 && emptyState) {
    return (
      <div className={`overflow-hidden rounded-xl border border-border bg-card ${className}`}>
        {emptyState}
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-xl border border-border bg-card ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="border-b border-border bg-muted/40">
            <tr>
              {columns.map((col, i) => (
                <th
                  key={i}
                  scope="col"
                  className={`px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground ${alignClasses[col.align || 'left']} ${col.hideBelow ? hideClasses[col.hideBelow] : ''} ${col.width || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((row) => (
              <tr
                key={getKey(row)}
                className={`transition-colors hover:bg-muted/50 ${onRowClick ? 'cursor-pointer focus-within:bg-muted/50' : ''}`}
                onClick={() => onRowClick?.(row)}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={(e) => {
                  if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onRowClick(row);
                  }
                }}
              >
                {columns.map((col, i) => (
                  <td
                    key={i}
                    className={`px-4 py-3.5 text-sm text-foreground ${alignClasses[col.align || 'left']} ${col.hideBelow ? hideClasses[col.hideBelow] : ''}`}
                  >
                    {getCellValue(row, col)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface AdminTableToolbarProps {
  /** Search input value */
  searchValue?: string;
  /** Search input change handler */
  onSearchChange?: (value: string) => void;
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Filter components to render */
  filters?: ReactNode;
  /** Actions to display on the right */
  actions?: ReactNode;
  /** Additional className */
  className?: string;
}

/**
 * Toolbar component for filtering and actions above a data table.
 */
export function AdminTableToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Sök...',
  filters,
  actions,
  className = '',
}: AdminTableToolbarProps) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {onSearchChange !== undefined && (
          <div className="relative w-full sm:w-72">
            <MagnifyingGlassIcon 
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" 
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchValue || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm placeholder:text-muted-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-label={searchPlaceholder}
            />
          </div>
        )}
        {filters}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

interface AdminPaginationProps {
  /** Current page (1-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Page change handler */
  onPageChange: (page: number) => void;
  /** Total item count */
  totalItems?: number;
  /** Items per page */
  itemsPerPage?: number;
  /** Additional className */
  className?: string;
}

/**
 * Pagination component for data tables.
 */
export function AdminPagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  className = '',
}: AdminPaginationProps) {
  if (totalPages <= 1) return null;

  const startItem = totalItems && itemsPerPage ? (currentPage - 1) * itemsPerPage + 1 : null;
  const endItem = totalItems && itemsPerPage ? Math.min(currentPage * itemsPerPage, totalItems) : null;

  return (
    <nav 
      className={`flex flex-col items-center justify-between gap-3 sm:flex-row ${className}`}
      aria-label="Paginering"
    >
      {totalItems !== undefined && startItem && endItem && (
        <p className="text-sm text-muted-foreground">
          Visar <span className="font-medium text-foreground">{startItem}</span>–<span className="font-medium text-foreground">{endItem}</span> av <span className="font-medium text-foreground">{totalItems}</span>
        </p>
      )}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Föregående sida"
        >
          <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Föregående</span>
        </button>
        <span className="px-3 text-sm text-muted-foreground" aria-current="page">
          <span className="font-medium text-foreground">{currentPage}</span> / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Nästa sida"
        >
          <span className="hidden sm:inline">Nästa</span>
          <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
