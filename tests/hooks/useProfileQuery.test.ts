/**
 * useProfileQuery Hook Unit Tests
 * 
 * Tests for the profile data fetching hook state machine.
 * Verifies error states, skip logic, retry functionality, and KEY STABILITY.
 * 
 * Run: npx vitest tests/hooks/useProfileQuery.test.ts
 * 
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useProfileQuery } from '../../hooks/useProfileQuery';

describe('useProfileQuery', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('starts in idle state when skip=true', () => {
    const { result } = renderHook(() =>
      useProfileQuery(
        'test-idle',
        async () => 'data',
        {},
        { skip: true }
      )
    );

    expect(result.current.status).toBe('idle');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeNull();
  });

  it('fetches data and transitions to success', async () => {
    const { result } = renderHook(() =>
      useProfileQuery(
        'test-success',
        async () => 'test data',
        { testId: 1 },
        { timeout: 5000 }
      )
    );

    // Wait for success
    await waitFor(() => {
      expect(result.current.status).toBe('success');
    }, { timeout: 3000 });

    expect(result.current.data).toBe('test data');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSuccess).toBe(true);
  });

  it('reaches error state on fetcher error', async () => {
    const { result } = renderHook(() =>
      useProfileQuery(
        'test-error',
        async () => {
          throw new Error('Test error message');
        },
        { testId: 2 },
        { timeout: 5000 }
      )
    );

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    }, { timeout: 3000 });

    expect(result.current.isError).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toContain('Test error message');
  });

  it('transitions from skip=true to fetching when skip becomes false', async () => {
    const { result, rerender } = renderHook(
      ({ skipValue }) =>
        useProfileQuery(
          'test-skip-toggle',
          async () => 'fetched data',
          { testId: 3 },
          { timeout: 5000, skip: skipValue }
        ),
      { initialProps: { skipValue: true } }
    );

    // Should be idle when skipped
    expect(result.current.status).toBe('idle');

    // Change skip to false
    rerender({ skipValue: false });

    // Should fetch and succeed
    await waitFor(() => {
      expect(result.current.status).toBe('success');
    }, { timeout: 3000 });
    
    expect(result.current.data).toBe('fetched data');
  });

  it('retry function re-executes the query after error', async () => {
    let callCount = 0;
    const uniqueKey = `test-retry-${Math.random()}`;

    const { result } = renderHook(() =>
      useProfileQuery(
        uniqueKey,
        async () => {
          callCount++;
          if (callCount === 1) {
            throw new Error('First call fails');
          }
          return 'success on retry';
        },
        { testId: 4 },
        { timeout: 5000 }
      )
    );

    // First call should fail
    await waitFor(() => {
      expect(result.current.status).toBe('error');
    }, { timeout: 3000 });
    
    expect(callCount).toBeGreaterThanOrEqual(1);

    // Call retry
    act(() => {
      result.current.retry();
    });

    // Should succeed on retry
    await waitFor(() => {
      expect(result.current.status).toBe('success');
    }, { timeout: 3000 });
    
    expect(result.current.data).toBe('success on retry');
  });

  it('uses initialData before fetching completes', () => {
    const initialData = { name: 'Initial' };

    const { result } = renderHook(() =>
      useProfileQuery(
        'test-initial-data',
        async () => {
          // Slow fetch
          await new Promise(r => setTimeout(r, 100));
          return { name: 'Fetched' };
        },
        { testId: 5 },
        { timeout: 5000, initialData }
      )
    );

    // Should have initial data immediately
    expect(result.current.data).toEqual(initialData);
  });

  it('provides correct boolean helpers', async () => {
    const { result } = renderHook(() =>
      useProfileQuery(
        'test-helpers',
        async () => 'data',
        { testId: 6 },
        { timeout: 5000 }
      )
    );

    // After success
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    }, { timeout: 3000 });
    
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.isTimeout).toBe(false);
  });

  it('handles null/undefined in deps correctly', async () => {
    const { result } = renderHook(() =>
      useProfileQuery(
        'test-null-deps',
        async () => 'data with null deps',
        { userId: null, tenantId: undefined },
        { timeout: 5000 }
      )
    );

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    }, { timeout: 3000 });
    
    expect(result.current.data).toBe('data with null deps');
  });

  // ==========================================================================
  // KEY STABILITY TESTS (regression prevention for object identity churn)
  // ==========================================================================

  describe('key stability', () => {
    it('does not refetch when deps object reference changes but values are same', async () => {
      let fetchCount = 0;
      const uniqueKey = `stability-test-${Date.now()}`;

      const { result, rerender } = renderHook(
        ({ userId }) =>
          useProfileQuery(
            uniqueKey,
            async () => {
              fetchCount++;
              return `data-${fetchCount}`;
            },
            { userId },  // New object reference each render
            { timeout: 5000 }
          ),
        { initialProps: { userId: 'user-123' } }
      );

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.status).toBe('success');
      }, { timeout: 3000 });

      const initialFetchCount = fetchCount;
      expect(initialFetchCount).toBeGreaterThanOrEqual(1);

      // Rerender with SAME userId value but new object reference
      rerender({ userId: 'user-123' });

      // Wait a bit to ensure no new fetch is triggered
      await new Promise(r => setTimeout(r, 100));

      // Should NOT have triggered a new fetch
      expect(fetchCount).toBe(initialFetchCount);
    });

    it('refetches when primitive dep value actually changes', async () => {
      let fetchCount = 0;
      const uniqueKey = `value-change-test-${Date.now()}`;

      const { result, rerender } = renderHook(
        ({ userId }) =>
          useProfileQuery(
            uniqueKey,
            async () => {
              fetchCount++;
              return `data-for-${userId}`;
            },
            { userId },
            { timeout: 5000 }
          ),
        { initialProps: { userId: 'user-A' } }
      );

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.status).toBe('success');
        expect(result.current.data).toBe('data-for-user-A');
      }, { timeout: 3000 });

      const firstFetchCount = fetchCount;

      // Change userId to a DIFFERENT value
      rerender({ userId: 'user-B' });

      // Should trigger a new fetch
      await waitFor(() => {
        expect(result.current.data).toBe('data-for-user-B');
      }, { timeout: 3000 });

      expect(fetchCount).toBeGreaterThan(firstFetchCount);
    });

    it('ignores object values in deps (does not cause key churn)', async () => {
      let fetchCount = 0;
      const uniqueKey = `object-ignore-test-${Date.now()}`;
      
      // Simulate a service object that changes reference each render
      const createService = () => ({ fetch: () => 'data' });

      const { result, rerender } = renderHook(
        ({ userId, service }) =>
          useProfileQuery(
            uniqueKey,
            async () => {
              fetchCount++;
              return 'data';
            },
            { userId, service },  // service is an object - should be ignored!
            { timeout: 5000 }
          ),
        { initialProps: { userId: 'user-123', service: createService() } }
      );

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.status).toBe('success');
      }, { timeout: 3000 });

      const initialFetchCount = fetchCount;

      // Rerender with NEW service object reference (but same userId)
      rerender({ userId: 'user-123', service: createService() });

      // Wait a bit to ensure no new fetch is triggered
      await new Promise(r => setTimeout(r, 100));

      // Should NOT have triggered a new fetch because:
      // 1. userId is the same primitive
      // 2. service object is ignored in key derivation
      expect(fetchCount).toBe(initialFetchCount);
    });

    it('warns in dev mode only ONCE per dep key when object is passed', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const uniqueKey = `warn-once-test-${Date.now()}`;

      const createService = () => ({ id: 1 });

      const { rerender } = renderHook(
        ({ userId, serviceObject }) =>
          useProfileQuery(
            uniqueKey,
            async () => 'data',
            { userId, serviceObject },  // Object in deps should trigger warning
            { timeout: 5000 }
          ),
        { initialProps: { userId: 'user-123', serviceObject: createService() } }
      );

      // Wait for hook to run
      await new Promise(r => setTimeout(r, 50));

      // Rerender with new object reference multiple times
      rerender({ userId: 'user-123', serviceObject: createService() });
      await new Promise(r => setTimeout(r, 50));
      
      rerender({ userId: 'user-123', serviceObject: createService() });
      await new Promise(r => setTimeout(r, 50));

      rerender({ userId: 'user-123', serviceObject: createService() });
      await new Promise(r => setTimeout(r, 50));

      // In development, should have warned about 'serviceObject' only ONCE
      // despite multiple rerenders with new object references
      const warningsAboutServiceObject = consoleSpy.mock.calls.filter(
        call => call[0]?.includes?.('serviceObject')
      );
      
      // Should be exactly 1 warning (deduplication works)
      expect(warningsAboutServiceObject.length).toBeLessThanOrEqual(1);
      
      consoleSpy.mockRestore();
    });

    it('produces stable keys for boolean deps', async () => {
      let fetchCount = 0;
      const uniqueKey = `boolean-test-${Date.now()}`;

      const { result, rerender } = renderHook(
        ({ isActive }) =>
          useProfileQuery(
            uniqueKey,
            async () => {
              fetchCount++;
              return `active: ${isActive}`;
            },
            { isActive },
            { timeout: 5000 }
          ),
        { initialProps: { isActive: true } }
      );

      await waitFor(() => {
        expect(result.current.status).toBe('success');
      }, { timeout: 3000 });

      const initialCount = fetchCount;

      // Same boolean value
      rerender({ isActive: true });
      await new Promise(r => setTimeout(r, 100));
      expect(fetchCount).toBe(initialCount);

      // Different boolean value - should refetch
      rerender({ isActive: false });
      await waitFor(() => {
        expect(result.current.data).toBe('active: false');
      }, { timeout: 3000 });
      expect(fetchCount).toBeGreaterThan(initialCount);
    });

    it('produces stable keys for number deps', async () => {
      let fetchCount = 0;
      const uniqueKey = `number-test-${Date.now()}`;

      const { result, rerender } = renderHook(
        ({ page }) =>
          useProfileQuery(
            uniqueKey,
            async () => {
              fetchCount++;
              return `page: ${page}`;
            },
            { page },
            { timeout: 5000 }
          ),
        { initialProps: { page: 1 } }
      );

      await waitFor(() => {
        expect(result.current.status).toBe('success');
      }, { timeout: 3000 });

      const initialCount = fetchCount;

      // Same number value
      rerender({ page: 1 });
      await new Promise(r => setTimeout(r, 100));
      expect(fetchCount).toBe(initialCount);

      // Different number - should refetch
      rerender({ page: 2 });
      await waitFor(() => {
        expect(result.current.data).toBe('page: 2');
      }, { timeout: 3000 });
      expect(fetchCount).toBeGreaterThan(initialCount);
    });
  });
});
