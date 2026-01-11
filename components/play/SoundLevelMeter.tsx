'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  MicrophoneIcon,
  SpeakerWaveIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/solid';
import { Button } from '@/components/ui/button';
import type { SoundLevelConfig, SoundLevelState } from '@/types/puzzle-modules';

// ============================================================================
// SoundLevelMeter – Microphone-based sound level detection
// ============================================================================

export interface SoundLevelMeterProps {
  config: SoundLevelConfig;
  state: SoundLevelState;
  onLevelChange: (level: number) => void;
  onTriggered: () => void;
  className?: string;
}

export function SoundLevelMeter({
  config,
  state,
  onLevelChange,
  onTriggered,
  className = '',
}: SoundLevelMeterProps) {
  const t = useTranslations('play.soundLevelMeter');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);

  // Start listening
  const startListening = async () => {
    try {
      setError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setHasPermission(true);

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      setIsListening(true);

      // Start analyzing
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const analyze = () => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate RMS level
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / dataArray.length);
        const level = Math.min(100, Math.round((rms / 128) * 100));
        
        onLevelChange(level);
        
        animationRef.current = requestAnimationFrame(analyze);
      };
      
      analyze();
    } catch (err) {
      console.error('Microphone access failed:', err);
      setError(t('microphoneAccessError'));
      setHasPermission(false);
    }
  };

  // Stop listening
  const stopListening = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsListening(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  // Check for trigger
  useEffect(() => {
    if (state.isTriggered) return;

    const isAboveThreshold = state.currentLevel >= config.thresholdLevel;

    if (config.triggerMode === 'threshold' && isAboveThreshold) {
      onTriggered();
    } else if (config.triggerMode === 'peak' && state.peakLevel >= config.thresholdLevel) {
      onTriggered();
    } else if (
      config.triggerMode === 'sustained' &&
      state.sustainedSeconds >= (config.sustainDuration ?? 3)
    ) {
      onTriggered();
    }
  }, [state, config, onTriggered]);

  // Calculate progress for sustained mode
  const sustainProgress = config.triggerMode === 'sustained' && config.sustainDuration
    ? Math.min(100, (state.sustainedSeconds / config.sustainDuration) * 100)
    : 0;

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold">{config.activityLabel}</h3>
        {config.instructions && (
          <p className="text-sm text-zinc-500 mt-1">{config.instructions}</p>
        )}
      </div>

      {/* Triggered state */}
      {state.isTriggered ? (
        <div className="flex flex-col items-center gap-4 p-6 rounded-lg bg-green-50 dark:bg-green-900/20">
          <CheckCircleIcon className="h-16 w-16 text-green-500" />
          <p className="font-medium text-green-700 dark:text-green-300">
            {t('goalAchieved')}
          </p>
        </div>
      ) : (
        <>
          {/* Sound meter */}
          {config.showMeter && (
            <div className="flex flex-col items-center gap-2">
              <div className="w-full h-8 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-75 ${
                    state.currentLevel >= config.thresholdLevel
                      ? 'bg-green-500'
                      : state.currentLevel >= config.thresholdLevel * 0.7
                      ? 'bg-amber-500'
                      : 'bg-blue-500'
                  }`}
                  style={{ width: `${state.currentLevel}%` }}
                />
              </div>
              
              {/* Threshold marker */}
              <div className="w-full relative h-1">
                <div
                  className="absolute top-0 w-0.5 h-3 -mt-1 bg-red-500"
                  style={{ left: `${config.thresholdLevel}%` }}
                />
              </div>
              
              <div className="flex justify-between w-full text-xs text-zinc-500">
                <span>0</span>
                <span className="text-red-500">{t('goal')}: {config.thresholdLevel}</span>
                <span>100</span>
              </div>
            </div>
          )}

          {/* Progress for sustained mode */}
          {config.showProgress && config.triggerMode === 'sustained' && (
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-sm">
                <span>{t('holdSoundLevel')}</span>
                <span>{state.sustainedSeconds.toFixed(1)}s / {config.sustainDuration}s</span>
              </div>
              <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${sustainProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Peak level display */}
          {config.triggerMode === 'peak' && (
            <div className="text-center">
              <span className="text-sm text-zinc-500">{t('peakLevel')}: </span>
              <span className="text-2xl font-bold">{state.peakLevel}</span>
            </div>
          )}

          {/* Controls */}
          <div className="flex justify-center">
            {!isListening ? (
              <Button onClick={startListening} disabled={hasPermission === false}>
                <MicrophoneIcon className="h-5 w-5 mr-2" />
                {t('startMicrophone')}
              </Button>
            ) : (
              <Button onClick={stopListening} variant="outline">
                <SpeakerWaveIcon className="h-5 w-5 mr-2 animate-pulse" />
                {t('stop')}
              </Button>
            )}
          </div>

          {/* Listening indicator */}
          {isListening && (
            <div className="flex items-center justify-center gap-2 text-sm text-zinc-500">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {t('listening')}
            </div>
          )}
        </>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          <ExclamationTriangleIcon className="h-5 w-5" />
          {error}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// useSoundLevel – Hook for managing sound level state
// ============================================================================

export function useSoundLevel(config: SoundLevelConfig) {
  const [state, setState] = useState<SoundLevelState>({
    currentLevel: 0,
    peakLevel: 0,
    isTriggered: false,
    sustainedSeconds: 0,
  });

  const sustainStartRef = useRef<number | null>(null);

  const updateLevel = useCallback(
    (level: number) => {
      setState(prev => {
        const newPeak = Math.max(prev.peakLevel, level);
        const isAboveThreshold = level >= config.thresholdLevel;

        // Track sustained time
        let sustainedSeconds = prev.sustainedSeconds;
        if (config.triggerMode === 'sustained') {
          if (isAboveThreshold) {
            if (sustainStartRef.current === null) {
              sustainStartRef.current = Date.now();
            }
            sustainedSeconds = (Date.now() - sustainStartRef.current) / 1000;
          } else {
            sustainStartRef.current = null;
            sustainedSeconds = 0;
          }
        }

        return {
          ...prev,
          currentLevel: level,
          peakLevel: newPeak,
          sustainedSeconds,
        };
      });
    },
    [config.thresholdLevel, config.triggerMode]
  );

  const trigger = useCallback(() => {
    setState(prev => ({
      ...prev,
      isTriggered: true,
      triggeredAt: new Date().toISOString(),
    }));
  }, []);

  const reset = useCallback(() => {
    sustainStartRef.current = null;
    setState({
      currentLevel: 0,
      peakLevel: 0,
      isTriggered: false,
      sustainedSeconds: 0,
    });
  }, []);

  return { state, updateLevel, trigger, reset };
}
