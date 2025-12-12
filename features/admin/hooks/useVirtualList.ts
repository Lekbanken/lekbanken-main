'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';

interface UseVirtualListOptions<T> {
  /** All items in the list */
  items: T[];
  /** Height of each item in pixels */
  itemHeight: number;
  /** Height of the container in pixels */
  containerHeight: number;
  /** Number of extra items to render above/below visible area */
  overscan?: number;
}

interface VirtualItem<T> {
  /** The actual item data */
  data: T;
  /** Index in the original array */
  index: number;
  /** Top offset in pixels */
  offsetTop: number;
}

interface UseVirtualListResult<T> {
  /** Items currently visible (plus overscan) */
  virtualItems: VirtualItem<T>[];
  /** Total height of all items combined */
  totalHeight: number;
  /** Start index of visible items */
  startIndex: number;
  /** End index of visible items */
  endIndex: number;
  /** Current scroll position */
  scrollTop: number;
  /** Handler to update scroll position */
  onScroll: (scrollTop: number) => void;
  /** Ref callback for the container */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Scroll to a specific index */
  scrollToIndex: (index: number, align?: 'start' | 'center' | 'end') => void;
}

/**
 * Hook for virtualizing large lists.
 * Only renders items that are visible in the viewport plus overscan.
 * 
 * @example
 * const { virtualItems, totalHeight, containerRef, onScroll } = useVirtualList({
 *   items: users,
 *   itemHeight: 48,
 *   containerHeight: 400,
 * });
 * 
 * return (
 *   <div 
 *     ref={containerRef}
 *     style={{ height: containerHeight, overflow: 'auto' }}
 *     onScroll={(e) => onScroll(e.currentTarget.scrollTop)}
 *   >
 *     <div style={{ height: totalHeight, position: 'relative' }}>
 *       {virtualItems.map(({ data, index, offsetTop }) => (
 *         <div 
 *           key={index}
 *           style={{ 
 *             position: 'absolute', 
 *             top: offsetTop, 
 *             height: itemHeight,
 *             width: '100%',
 *           }}
 *         >
 *           {data.name}
 *         </div>
 *       ))}
 *     </div>
 *   </div>
 * );
 */
export function useVirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 3,
}: UseVirtualListOptions<T>): UseVirtualListResult<T> {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const totalHeight = items.length * itemHeight;

  // Calculate visible range
  const { startIndex, endIndex } = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = start + visibleCount;

    return {
      startIndex: Math.max(0, start - overscan),
      endIndex: Math.min(items.length - 1, end + overscan),
    };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  // Generate virtual items
  const virtualItems = useMemo(() => {
    const result: VirtualItem<T>[] = [];
    
    for (let i = startIndex; i <= endIndex; i++) {
      result.push({
        data: items[i],
        index: i,
        offsetTop: i * itemHeight,
      });
    }

    return result;
  }, [items, startIndex, endIndex, itemHeight]);

  const onScroll = useCallback((newScrollTop: number) => {
    setScrollTop(newScrollTop);
  }, []);

  const scrollToIndex = useCallback((index: number, align: 'start' | 'center' | 'end' = 'start') => {
    if (!containerRef.current) return;

    let targetScrollTop: number;
    
    switch (align) {
      case 'center':
        targetScrollTop = index * itemHeight - (containerHeight - itemHeight) / 2;
        break;
      case 'end':
        targetScrollTop = index * itemHeight - containerHeight + itemHeight;
        break;
      case 'start':
      default:
        targetScrollTop = index * itemHeight;
        break;
    }

    targetScrollTop = Math.max(0, Math.min(targetScrollTop, totalHeight - containerHeight));
    containerRef.current.scrollTop = targetScrollTop;
  }, [itemHeight, containerHeight, totalHeight]);

  return {
    virtualItems,
    totalHeight,
    startIndex,
    endIndex,
    scrollTop,
    onScroll,
    containerRef,
    scrollToIndex,
  };
}

interface UsePaginatedDataOptions<T> {
  /** Function to fetch data for a page */
  fetchPage: (page: number, pageSize: number) => Promise<{ data: T[]; total: number }>;
  /** Number of items per page */
  pageSize?: number;
  /** Initial page (1-indexed) */
  initialPage?: number;
}

interface UsePaginatedDataResult<T> {
  /** Current page data */
  data: T[];
  /** Total number of items across all pages */
  total: number;
  /** Total number of pages */
  totalPages: number;
  /** Current page (1-indexed) */
  currentPage: number;
  /** Whether data is loading */
  isLoading: boolean;
  /** Any error that occurred */
  error: Error | null;
  /** Go to a specific page */
  goToPage: (page: number) => void;
  /** Go to next page */
  nextPage: () => void;
  /** Go to previous page */
  prevPage: () => void;
  /** Refresh current page */
  refresh: () => void;
}

/**
 * Hook for handling paginated data fetching.
 * 
 * @example
 * const { data, currentPage, totalPages, goToPage, isLoading } = usePaginatedData({
 *   fetchPage: async (page, pageSize) => {
 *     const { data, count } = await supabase
 *       .from('users')
 *       .select('*', { count: 'exact' })
 *       .range((page - 1) * pageSize, page * pageSize - 1);
 *     return { data: data ?? [], total: count ?? 0 };
 *   },
 *   pageSize: 20,
 * });
 */
export function usePaginatedData<T>({
  fetchPage,
  pageSize = 20,
  initialPage = 1,
}: UsePaginatedDataOptions<T>): UsePaginatedDataResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const totalPages = Math.ceil(total / pageSize);

  const loadPage = useCallback(async (page: number) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await fetchPage(page, pageSize);
      setData(result.data);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch data'));
    } finally {
      setIsLoading(false);
    }
  }, [fetchPage, pageSize]);

  useEffect(() => {
    loadPage(currentPage);
  }, [currentPage, loadPage]);

  const goToPage = useCallback((page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages || 1));
    setCurrentPage(validPage);
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage((p) => p + 1);
    }
  }, [currentPage, totalPages]);

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage((p) => p - 1);
    }
  }, [currentPage]);

  const refresh = useCallback(() => {
    loadPage(currentPage);
  }, [loadPage, currentPage]);

  return {
    data,
    total,
    totalPages,
    currentPage,
    isLoading,
    error,
    goToPage,
    nextPage,
    prevPage,
    refresh,
  };
}
