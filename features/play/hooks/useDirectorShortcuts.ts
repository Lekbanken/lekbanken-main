/**
 * useDirectorShortcuts Hook
 * 
 * Keyboard shortcuts for Director Mode, enabling fast host control
 * without mouse interaction.
 * 
 * Backlog B.2: Keyboard shortcuts for Director Mode
 */

'use client';

import { useEffect, useCallback, useMemo } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface DirectorShortcut {
  /** Key combination (e.g., 'Ctrl+Space', 'D', 'Shift+N') */
  key: string;
  /** Keycode for matching */
  code: string;
  /** Modifier keys required */
  modifiers: {
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    meta?: boolean;
  };
  /** Action identifier */
  action: DirectorAction;
  /** Translation key for description (under play.directorShortcuts.actions) */
  descriptionKey: string;
  /** Category for grouping */
  category: ShortcutCategory;
  /** Whether shortcut is enabled */
  enabled?: boolean;
}

export type ShortcutCategory =
  | 'navigation'    // Step/phase navigation
  | 'playback'      // Play/pause/timer
  | 'triggers'      // Trigger operations
  | 'signals'       // Signal emission
  | 'artifacts'     // Artifact control
  | 'view'          // UI toggles
  | 'system';       // System actions

export type DirectorAction =
  // Navigation
  | 'next_step'
  | 'prev_step'
  | 'next_phase'
  | 'prev_phase'
  // Playback
  | 'toggle_pause'
  | 'start_session'
  | 'end_session'
  // Triggers
  | 'trigger_kill_switch'
  | 'trigger_rearm_all'
  // Signals
  | 'signal_attention'
  | 'signal_success'
  | 'signal_warning'
  // View
  | 'toggle_director'
  | 'toggle_story_view'
  | 'toggle_event_feed'
  | 'toggle_chat'
  // System
  | 'show_shortcuts'
  | 'quick_search';

export interface UseDirectorShortcutsOptions {
  /** Whether shortcuts are enabled */
  enabled?: boolean;
  /** Callback for navigation actions */
  onNavigate?: (action: 'next_step' | 'prev_step' | 'next_phase' | 'prev_phase') => void;
  /** Callback for playback actions */
  onPlayback?: (action: 'toggle_pause' | 'start_session' | 'end_session') => void;
  /** Callback for trigger actions */
  onTrigger?: (action: 'trigger_kill_switch' | 'trigger_rearm_all') => void;
  /** Callback for signal actions */
  onSignal?: (signal: 'attention' | 'success' | 'warning') => void;
  /** Callback for view toggles */
  onView?: (view: 'director' | 'story_view' | 'event_feed' | 'chat') => void;
  /** Callback for system actions */
  onSystem?: (action: 'show_shortcuts' | 'quick_search') => void;
  /** Custom shortcut overrides */
  customShortcuts?: Partial<Record<DirectorAction, string>>;
}

export interface UseDirectorShortcutsReturn {
  /** All available shortcuts */
  shortcuts: DirectorShortcut[];
  /** Get shortcut by action */
  getShortcut: (action: DirectorAction) => DirectorShortcut | undefined;
  /** Get shortcuts by category */
  getByCategory: (category: ShortcutCategory) => DirectorShortcut[];
  /** Format shortcut key for display */
  formatKey: (action: DirectorAction) => string;
  /** Check if a key event matches an action */
  matchesAction: (event: KeyboardEvent, action: DirectorAction) => boolean;
}

// =============================================================================
// Default Shortcuts
// =============================================================================

const DEFAULT_SHORTCUTS: DirectorShortcut[] = [
  // Navigation
  {
    key: 'ArrowRight',
    code: 'ArrowRight',
    modifiers: { ctrl: true },
    action: 'next_step',
    descriptionKey: 'next_step',
    category: 'navigation',
  },
  {
    key: 'ArrowLeft',
    code: 'ArrowLeft',
    modifiers: { ctrl: true },
    action: 'prev_step',
    descriptionKey: 'prev_step',
    category: 'navigation',
  },
  {
    key: 'ArrowDown',
    code: 'ArrowDown',
    modifiers: { ctrl: true },
    action: 'next_phase',
    descriptionKey: 'next_phase',
    category: 'navigation',
  },
  {
    key: 'ArrowUp',
    code: 'ArrowUp',
    modifiers: { ctrl: true },
    action: 'prev_phase',
    descriptionKey: 'prev_phase',
    category: 'navigation',
  },
  // Playback
  {
    key: 'Space',
    code: 'Space',
    modifiers: { ctrl: true },
    action: 'toggle_pause',
    descriptionKey: 'toggle_pause',
    category: 'playback',
  },
  {
    key: 'Enter',
    code: 'Enter',
    modifiers: { ctrl: true, shift: true },
    action: 'start_session',
    descriptionKey: 'start_session',
    category: 'playback',
  },
  {
    key: 'Escape',
    code: 'Escape',
    modifiers: { ctrl: true, shift: true },
    action: 'end_session',
    descriptionKey: 'end_session',
    category: 'playback',
  },
  // Triggers
  {
    key: 'K',
    code: 'KeyK',
    modifiers: { ctrl: true, shift: true },
    action: 'trigger_kill_switch',
    descriptionKey: 'trigger_kill_switch',
    category: 'triggers',
  },
  {
    key: 'R',
    code: 'KeyR',
    modifiers: { ctrl: true, shift: true },
    action: 'trigger_rearm_all',
    descriptionKey: 'trigger_rearm_all',
    category: 'triggers',
  },
  // Signals
  {
    key: '1',
    code: 'Digit1',
    modifiers: { alt: true },
    action: 'signal_attention',
    descriptionKey: 'signal_attention',
    category: 'signals',
  },
  {
    key: '2',
    code: 'Digit2',
    modifiers: { alt: true },
    action: 'signal_success',
    descriptionKey: 'signal_success',
    category: 'signals',
  },
  {
    key: '3',
    code: 'Digit3',
    modifiers: { alt: true },
    action: 'signal_warning',
    descriptionKey: 'signal_warning',
    category: 'signals',
  },
  // View
  {
    key: 'D',
    code: 'KeyD',
    modifiers: { ctrl: true },
    action: 'toggle_director',
    descriptionKey: 'toggle_director',
    category: 'view',
  },
  {
    key: 'S',
    code: 'KeyS',
    modifiers: { ctrl: true, shift: true },
    action: 'toggle_story_view',
    descriptionKey: 'toggle_story_view',
    category: 'view',
  },
  {
    key: 'E',
    code: 'KeyE',
    modifiers: { ctrl: true },
    action: 'toggle_event_feed',
    descriptionKey: 'toggle_event_feed',
    category: 'view',
  },
  {
    key: 'M',
    code: 'KeyM',
    modifiers: { ctrl: true },
    action: 'toggle_chat',
    descriptionKey: 'toggle_chat',
    category: 'view',
  },
  // System
  {
    key: '?',
    code: 'Slash',
    modifiers: { shift: true },
    action: 'show_shortcuts',
    descriptionKey: 'show_shortcuts',
    category: 'system',
  },
  {
    key: 'P',
    code: 'KeyP',
    modifiers: { ctrl: true },
    action: 'quick_search',
    descriptionKey: 'quick_search',
    category: 'system',
  },
];

// =============================================================================
// Helper: Check if event matches shortcut
// =============================================================================

function eventMatchesShortcut(event: KeyboardEvent, shortcut: DirectorShortcut): boolean {
  // Check modifiers
  if (shortcut.modifiers.ctrl && !event.ctrlKey) return false;
  if (shortcut.modifiers.alt && !event.altKey) return false;
  if (shortcut.modifiers.shift && !event.shiftKey) return false;
  if (shortcut.modifiers.meta && !event.metaKey) return false;
  
  // Check key code
  return event.code === shortcut.code;
}

// =============================================================================
// Helper: Format shortcut for display
// =============================================================================

function formatShortcutKey(shortcut: DirectorShortcut): string {
  const parts: string[] = [];
  
  if (shortcut.modifiers.ctrl) parts.push('Ctrl');
  if (shortcut.modifiers.alt) parts.push('Alt');
  if (shortcut.modifiers.shift) parts.push('Shift');
  if (shortcut.modifiers.meta) parts.push('⌘');
  
  // Format the key nicely
  let keyDisplay = shortcut.key;
  if (keyDisplay === 'ArrowRight') keyDisplay = '→';
  else if (keyDisplay === 'ArrowLeft') keyDisplay = '←';
  else if (keyDisplay === 'ArrowUp') keyDisplay = '↑';
  else if (keyDisplay === 'ArrowDown') keyDisplay = '↓';
  else if (keyDisplay === 'Space') keyDisplay = '␣';
  else if (keyDisplay === 'Escape') keyDisplay = 'Esc';
  else if (keyDisplay === 'Enter') keyDisplay = '↵';
  
  parts.push(keyDisplay);
  
  return parts.join('+');
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useDirectorShortcuts({
  enabled = true,
  onNavigate,
  onPlayback,
  onTrigger,
  onSignal,
  onView,
  onSystem,
  customShortcuts: _customShortcuts,
}: UseDirectorShortcutsOptions = {}): UseDirectorShortcutsReturn {
  // Apply custom shortcut overrides using useMemo instead of useRef
  // so it can be accessed during render
  const shortcuts = useMemo<DirectorShortcut[]>(() => DEFAULT_SHORTCUTS, []);
  
  // Get shortcut by action
  const getShortcut = useCallback((action: DirectorAction): DirectorShortcut | undefined => {
    return shortcuts.find((s) => s.action === action);
  }, [shortcuts]);
  
  // Get shortcuts by category
  const getByCategory = useCallback((category: ShortcutCategory): DirectorShortcut[] => {
    return shortcuts.filter((s) => s.category === category);
  }, [shortcuts]);
  
  // Format key for display
  const formatKey = useCallback((action: DirectorAction): string => {
    const shortcut = getShortcut(action);
    return shortcut ? formatShortcutKey(shortcut) : '';
  }, [getShortcut]);
  
  // Check if event matches action
  const matchesAction = useCallback((event: KeyboardEvent, action: DirectorAction): boolean => {
    const shortcut = getShortcut(action);
    return shortcut ? eventMatchesShortcut(event, shortcut) : false;
  }, [getShortcut]);
  
  // Handle keydown
  useEffect(() => {
    if (!enabled) return;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow Escape to work in inputs
        if (event.code !== 'Escape') return;
      }
      
      // Find matching shortcut
      const matchedShortcut = shortcuts.find((s) =>
        eventMatchesShortcut(event, s) && s.enabled !== false
      );
      
      if (!matchedShortcut) return;
      
      // Prevent default browser behavior
      event.preventDefault();
      event.stopPropagation();
      
      // Dispatch to appropriate handler
      switch (matchedShortcut.action) {
        // Navigation
        case 'next_step':
        case 'prev_step':
        case 'next_phase':
        case 'prev_phase':
          onNavigate?.(matchedShortcut.action);
          break;
        
        // Playback
        case 'toggle_pause':
        case 'start_session':
        case 'end_session':
          onPlayback?.(matchedShortcut.action);
          break;
        
        // Triggers
        case 'trigger_kill_switch':
        case 'trigger_rearm_all':
          onTrigger?.(matchedShortcut.action);
          break;
        
        // Signals
        case 'signal_attention':
          onSignal?.('attention');
          break;
        case 'signal_success':
          onSignal?.('success');
          break;
        case 'signal_warning':
          onSignal?.('warning');
          break;
        
        // View
        case 'toggle_director':
          onView?.('director');
          break;
        case 'toggle_story_view':
          onView?.('story_view');
          break;
        case 'toggle_event_feed':
          onView?.('event_feed');
          break;
        case 'toggle_chat':
          onView?.('chat');
          break;
        
        // System
        case 'show_shortcuts':
        case 'quick_search':
          onSystem?.(matchedShortcut.action);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onNavigate, onPlayback, onTrigger, onSignal, onView, onSystem, shortcuts]);
  
  return {
    shortcuts,
    getShortcut,
    getByCategory,
    formatKey,
    matchesAction,
  };
}

// =============================================================================
// Category Keys (for translation lookup under play.directorShortcuts.categories)
// =============================================================================

export const SHORTCUT_CATEGORY_KEYS: Record<ShortcutCategory, string> = {
  navigation: 'navigation',
  playback: 'playback',
  triggers: 'triggers',
  signals: 'signals',
  artifacts: 'artifacts',
  view: 'view',
  system: 'system',
};

/** @deprecated Use SHORTCUT_CATEGORY_KEYS with translations instead */
export const SHORTCUT_CATEGORY_LABELS = SHORTCUT_CATEGORY_KEYS;
