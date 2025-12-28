'use client';

import { useState, useCallback, useRef } from 'react';
import { CheckCircleIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import type { HotspotConfig, HotspotState } from '@/types/puzzle-modules';

// ============================================================================
// HotspotImage – Interactive image with hidden hotspots to find
// ============================================================================

export interface HotspotImageProps {
  config: HotspotConfig;
  state: HotspotState;
  onHotspotFound: (hotspotId: string) => void;
  onComplete?: () => void;
  className?: string;
}

export function HotspotImage({
  config,
  state,
  onHotspotFound,
  onComplete,
  className = '',
}: HotspotImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastTap, setLastTap] = useState<{ x: number; y: number; time: number } | null>(null);
  const [feedback, setFeedback] = useState<{ x: number; y: number; found: boolean } | null>(null);

  // Calculate required count
  const requiredHotspots = config.hotspots.filter(h => h.required !== false);
  const requiredCount = config.requireAll ? requiredHotspots.length : requiredHotspots.length;

  // Get image source
  const imageSrc = config.imageUrl || `/api/artifacts/${config.imageArtifactId}`;

  // Handle tap/click on image
  const handleTap = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      
      // Calculate position in percentage (accounting for zoom and pan)
      const relX = (clientX - rect.left - position.x) / (rect.width * scale) * 100;
      const relY = (clientY - rect.top - position.y) / (rect.height * scale) * 100;

      // Check if we hit any hotspot
      for (const hotspot of config.hotspots) {
        if (state.foundHotspotIds.includes(hotspot.id)) continue;

        const distance = Math.sqrt(
          Math.pow(relX - hotspot.x, 2) + Math.pow(relY - hotspot.y, 2)
        );

        if (distance <= hotspot.radius) {
          // Found hotspot!
          if (config.hapticFeedback && navigator.vibrate) {
            navigator.vibrate(50);
          }
          
          setFeedback({ x: hotspot.x, y: hotspot.y, found: true });
          setTimeout(() => setFeedback(null), 1000);

          onHotspotFound(hotspot.id);

          // Check completion
          const newFoundCount = state.foundHotspotIds.length + 1;
          if (newFoundCount >= requiredCount && onComplete) {
            onComplete();
          }
          return;
        }
      }

      // Missed - show miss feedback
      setFeedback({ x: relX, y: relY, found: false });
      setTimeout(() => setFeedback(null), 500);
    },
    [config, state.foundHotspotIds, position, scale, onHotspotFound, onComplete, requiredCount]
  );

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!config.allowZoom) {
      handleTap(e.clientX, e.clientY);
      return;
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !config.allowZoom) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDragging && config.allowZoom) {
      // Only trigger tap if no significant movement
      const moved = Math.abs(e.clientX - dragStart.x - position.x) > 5 ||
                    Math.abs(e.clientY - dragStart.y - position.y) > 5;
      if (!moved) {
        handleTap(e.clientX, e.clientY);
      }
    } else {
      handleTap(e.clientX, e.clientY);
    }
    setIsDragging(false);
  };

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setLastTap({ x: touch.clientX, y: touch.clientY, time: Date.now() });
      if (config.allowZoom) {
        setIsDragging(true);
        setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!config.allowZoom || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleTouchEnd = (_e: React.TouchEvent) => {
    if (lastTap) {
      const timeDiff = Date.now() - lastTap.time;
      if (timeDiff < 300) {
        // It's a tap, not a drag
        handleTap(lastTap.x, lastTap.y);
      }
    }
    setIsDragging(false);
    setLastTap(null);
  };

  // Zoom controls
  const handleZoomIn = () => setScale(s => Math.min(s + 0.5, 3));
  const handleZoomOut = () => {
    setScale(s => Math.max(s - 0.5, 1));
    if (scale <= 1.5) setPosition({ x: 0, y: 0 });
  };
  const handleZoomReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Progress indicator */}
      {config.showProgress && (
        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <CheckCircleIcon className="h-5 w-5 text-green-500" />
          <span>
            {state.foundHotspotIds.length} / {requiredCount} hittade
          </span>
        </div>
      )}

      {/* Image container */}
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700 cursor-crosshair select-none"
        style={{ touchAction: config.allowZoom ? 'none' : 'auto' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => setIsDragging(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'top left',
            transition: isDragging ? 'none' : 'transform 0.2s ease-out',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt="Sök efter gömda objekt"
            className="w-full h-auto pointer-events-none"
            draggable={false}
          />

          {/* Found hotspot markers */}
          {state.foundHotspotIds.map(id => {
            const hotspot = config.hotspots.find(h => h.id === id);
            if (!hotspot) return null;
            return (
              <div
                key={id}
                className="absolute pointer-events-none animate-pulse"
                style={{
                  left: `${hotspot.x}%`,
                  top: `${hotspot.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <CheckCircleIcon className="h-8 w-8 text-green-500 drop-shadow-lg" />
                {hotspot.label && (
                  <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1 text-xs font-medium bg-white dark:bg-zinc-800 px-2 py-0.5 rounded shadow whitespace-nowrap">
                    {hotspot.label}
                  </span>
                )}
              </div>
            );
          })}

          {/* Feedback animation */}
          {feedback && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: `${feedback.x}%`,
                top: `${feedback.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div
                className={`w-12 h-12 rounded-full border-4 ${
                  feedback.found
                    ? 'border-green-500 bg-green-500/20'
                    : 'border-red-500 bg-red-500/20'
                } animate-ping`}
              />
            </div>
          )}
        </div>
      </div>

      {/* Zoom controls */}
      {config.allowZoom && (
        <div className="flex justify-center gap-2">
          <button
            onClick={handleZoomOut}
            disabled={scale <= 1}
            className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50"
          >
            <MagnifyingGlassIcon className="h-5 w-5" />
            <span className="sr-only">Zooma ut</span>
          </button>
          <button
            onClick={handleZoomReset}
            className="px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-sm"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            onClick={handleZoomIn}
            disabled={scale >= 3}
            className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50"
          >
            <MagnifyingGlassIcon className="h-5 w-5" />
            <span className="sr-only">Zooma in</span>
          </button>
        </div>
      )}

      {/* Completion message */}
      {state.isComplete && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300">
          <CheckCircleIcon className="h-6 w-6" />
          <span className="font-medium">Alla objekt hittade!</span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// useHotspotGame – Hook for managing hotspot game state
// ============================================================================

export function useHotspotGame(config: HotspotConfig) {
  const [state, setState] = useState<HotspotState>(() => {
    const requiredHotspots = config.hotspots.filter(h => h.required !== false);
    return {
      foundHotspotIds: [],
      isComplete: false,
      foundCount: 0,
      requiredCount: config.requireAll ? requiredHotspots.length : requiredHotspots.length,
    };
  });

  const handleHotspotFound = useCallback((hotspotId: string) => {
    setState(prev => {
      if (prev.foundHotspotIds.includes(hotspotId)) return prev;
      
      const newFoundIds = [...prev.foundHotspotIds, hotspotId];
      const isComplete = newFoundIds.length >= prev.requiredCount;
      
      return {
        ...prev,
        foundHotspotIds: newFoundIds,
        foundCount: newFoundIds.length,
        isComplete,
      };
    });
  }, []);

  const reset = useCallback(() => {
    const requiredHotspots = config.hotspots.filter(h => h.required !== false);
    setState({
      foundHotspotIds: [],
      isComplete: false,
      foundCount: 0,
      requiredCount: config.requireAll ? requiredHotspots.length : requiredHotspots.length,
    });
  }, [config]);

  return { state, handleHotspotFound, reset };
}
