'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { AchievementNotificationData } from '../components/AchievementNotification';

const STORAGE_KEY_PREFIX = 'lekbanken_seen_achievements';

/**
 * Build namespaced storage key for user+tenant
 * This prevents cross-tenant or cross-user notification suppression
 */
function getStorageKey(userId?: string | null, tenantId?: string | null): string {
  const userPart = userId || 'anon';
  const tenantPart = tenantId || 'global';
  return `${STORAGE_KEY_PREFIX}:${userPart}:${tenantPart}`;
}

interface UseAchievementNotificationsOptions {
  /** Current user ID for namespacing localStorage */
  userId?: string | null;
  /** Current tenant ID for namespacing localStorage */
  tenantId?: string | null;
}

/**
 * Hook to manage achievement notification queue.
 * Tracks which achievements have been shown to avoid duplicate notifications.
 * 
 * @param options.userId - User ID for localStorage namespace
 * @param options.tenantId - Tenant ID for localStorage namespace
 */
export function useAchievementNotifications(options: UseAchievementNotificationsOptions = {}) {
  const { userId, tenantId } = options;
  const [queue, setQueue] = useState<AchievementNotificationData[]>([]);
  const [current, setCurrent] = useState<AchievementNotificationData | null>(null);
  const seenRef = useRef<Set<string>>(new Set());
  const isProcessingRef = useRef(false);
  const storageKeyRef = useRef<string>(getStorageKey(userId, tenantId));

  // Update storage key when user/tenant changes
  useEffect(() => {
    storageKeyRef.current = getStorageKey(userId, tenantId);
    // Reload seen achievements for new namespace
    seenRef.current = new Set();
    try {
      const stored = localStorage.getItem(storageKeyRef.current);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        seenRef.current = new Set(parsed);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [userId, tenantId]);

  // Process queue - use callback pattern to avoid setState in effect
  const processQueue = useCallback(() => {
    if (isProcessingRef.current) return;
    
    setQueue((prevQueue) => {
      if (prevQueue.length === 0) return prevQueue;
      
      isProcessingRef.current = true;
      const [next, ...rest] = prevQueue;
      
      // Schedule current update outside of this setState
      queueMicrotask(() => {
        setCurrent(next);
        isProcessingRef.current = false;
      });
      
      return rest;
    });
  }, []);

  // Check queue when current becomes null
  useEffect(() => {
    if (!current && queue.length > 0) {
      processQueue();
    }
  }, [current, queue.length, processQueue]);

  const markAsSeen = useCallback((achievementId: string) => {
    seenRef.current.add(achievementId);
    try {
      localStorage.setItem(storageKeyRef.current, JSON.stringify([...seenRef.current]));
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const dismiss = useCallback(() => {
    if (current) {
      markAsSeen(current.id);
    }
    setCurrent(null);
  }, [current, markAsSeen]);

  /**
   * Queue new achievements for notification.
   * Filters out achievements that have already been seen.
   */
  const queueAchievements = useCallback((achievements: AchievementNotificationData[]) => {
    const newAchievements = achievements.filter((a) => !seenRef.current.has(a.id));
    if (newAchievements.length > 0) {
      setQueue((prev) => [...prev, ...newAchievements]);
    }
  }, []);

  /**
   * Queue a single achievement for notification.
   */
  const queueAchievement = useCallback((achievement: AchievementNotificationData) => {
    if (!seenRef.current.has(achievement.id)) {
      setQueue((prev) => [...prev, achievement]);
    }
  }, []);

  /**
   * Clear all notifications (seen tracking persists).
   */
  const clearQueue = useCallback(() => {
    setQueue([]);
    setCurrent(null);
  }, []);

  /**
   * Check if an achievement has been seen.
   */
  const hasBeenSeen = useCallback((achievementId: string) => {
    return seenRef.current.has(achievementId);
  }, []);

  return {
    current,
    dismiss,
    queueAchievements,
    queueAchievement,
    clearQueue,
    hasBeenSeen,
    pendingCount: queue.length,
  };
}

export default useAchievementNotifications;
