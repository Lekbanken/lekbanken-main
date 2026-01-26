/**
 * useAnnotations Hook
 *
 * Manages loading and saving of Atlas annotations.
 * Provides optimistic updates with localStorage backup.
 */

import { useCallback, useEffect, useState } from 'react';
import type {
  Annotation,
  AnnotationsFile,
  CleanupStatus,
  TranslationStatus,
  AtlasAnnotationReviewFlags,
} from '../lib/annotations-schema';
import {
  createDefaultAnnotation,
  createEmptyAnnotationsFile,
} from '../lib/annotations-schema';

const STORAGE_KEY = 'atlas-annotations-backup';

interface UseAnnotationsResult {
  annotations: Record<string, Annotation>;
  isLoading: boolean;
  error: string | null;
  lastSavedAt: string | null;
  hasUnsavedChanges: boolean;

  // Actions
  getAnnotation: (nodeId: string) => Annotation;
  setAnnotation: (nodeId: string, annotation: Partial<Annotation>) => void;
  toggleReviewFlag: (nodeId: string, flag: keyof AtlasAnnotationReviewFlags) => void;
  setCleanupStatus: (nodeId: string, status: CleanupStatus) => void;
  setTranslationStatus: (nodeId: string, status: TranslationStatus) => void;
  setOwner: (nodeId: string, owner: string) => void;
  setNotes: (nodeId: string, notes: string) => void;
  markAllReviewed: (nodeId: string) => void;
  save: () => Promise<boolean>;
  reload: () => Promise<void>;
}

export function useAnnotations(): UseAnnotationsResult {
  const [file, setFile] = useState<AnnotationsFile>(createEmptyAnnotationsFile());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  // Load annotations on mount
  const reload = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/atlas/annotations');
      if (!response.ok) {
        throw new Error(`Failed to load annotations: ${response.status}`);
      }

      const data: AnnotationsFile = await response.json();
      setFile(data);
      setLastSavedAt(data.lastModified);
      setHasUnsavedChanges(false);

      // Clear localStorage backup since we have fresh data
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error('Failed to load annotations:', err);

      // Try to restore from localStorage
      const backup = localStorage.getItem(STORAGE_KEY);
      if (backup) {
        try {
          const data = JSON.parse(backup) as AnnotationsFile;
          setFile(data);
          setHasUnsavedChanges(true);
          setError('Loaded from local backup - save to persist');
        } catch {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } else {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // Save annotations
  const save = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/atlas/annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(file),
      });

      if (!response.ok) {
        throw new Error(`Failed to save annotations: ${response.status}`);
      }

      const result = await response.json();
      setLastSavedAt(result.lastModified);
      setHasUnsavedChanges(false);
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (err) {
      console.error('Failed to save annotations:', err);
      setError(err instanceof Error ? err.message : 'Save failed');
      return false;
    }
  }, [file]);

  // Update annotation helper
  const updateAnnotation = useCallback(
    (nodeId: string, updates: Partial<Annotation>) => {
      setFile((prev) => {
        const existing = prev.annotations[nodeId] ?? createDefaultAnnotation();
        const updated: Annotation = {
          ...existing,
          ...updates,
          lastModifiedAt: new Date().toISOString(),
        };

        const newFile: AnnotationsFile = {
          ...prev,
          lastModified: new Date().toISOString(),
          annotations: {
            ...prev.annotations,
            [nodeId]: updated,
          },
        };

        // Backup to localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newFile));
        return newFile;
      });
      setHasUnsavedChanges(true);
    },
    []
  );

  // Get annotation with defaults
  const getAnnotation = useCallback(
    (nodeId: string): Annotation => {
      return file.annotations[nodeId] ?? createDefaultAnnotation();
    },
    [file.annotations]
  );

  // Set full annotation
  const setAnnotation = useCallback(
    (nodeId: string, annotation: Partial<Annotation>) => {
      updateAnnotation(nodeId, annotation);
    },
    [updateAnnotation]
  );

  // Toggle review flag
  const toggleReviewFlag = useCallback(
    (nodeId: string, flag: keyof AtlasAnnotationReviewFlags) => {
      const current = getAnnotation(nodeId);
      updateAnnotation(nodeId, {
        reviewFlags: {
          ...current.reviewFlags,
          [flag]: !current.reviewFlags[flag],
        },
      });
    },
    [getAnnotation, updateAnnotation]
  );

  // Set cleanup status
  const setCleanupStatus = useCallback(
    (nodeId: string, status: CleanupStatus) => {
      updateAnnotation(nodeId, { cleanup_status: status });
    },
    [updateAnnotation]
  );

  // Set translation status
  const setTranslationStatus = useCallback(
    (nodeId: string, status: TranslationStatus) => {
      updateAnnotation(nodeId, { translation_status: status });
    },
    [updateAnnotation]
  );

  // Set owner
  const setOwner = useCallback(
    (nodeId: string, owner: string) => {
      updateAnnotation(nodeId, { owner: owner || undefined });
    },
    [updateAnnotation]
  );

  // Set notes
  const setNotes = useCallback(
    (nodeId: string, notes: string) => {
      updateAnnotation(nodeId, { notes: notes || undefined });
    },
    [updateAnnotation]
  );

  // Mark all reviewed
  const markAllReviewed = useCallback(
    (nodeId: string) => {
      updateAnnotation(nodeId, {
        reviewFlags: {
          ux_reviewed: true,
          data_linked: true,
          rls_checked: true,
          tested: true,
        },
        lastReviewedAt: new Date().toISOString(),
      });
    },
    [updateAnnotation]
  );

  return {
    annotations: file.annotations,
    isLoading,
    error,
    lastSavedAt,
    hasUnsavedChanges,
    getAnnotation,
    setAnnotation,
    toggleReviewFlag,
    setCleanupStatus,
    setTranslationStatus,
    setOwner,
    setNotes,
    markAllReviewed,
    save,
    reload,
  };
}
