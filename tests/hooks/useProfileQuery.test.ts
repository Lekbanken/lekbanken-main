/**
 * useProfileQuery Hook Unit Tests
 * 
 * Tests for the profile data fetching hook state machine.
 * Verifies error states, skip logic, and retry functionality.
 * 
 * Run: npx vitest tests/hooks/useProfileQuery.test.ts
 * 
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
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
});
