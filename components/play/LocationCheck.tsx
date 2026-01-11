'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  MapPinIcon,
  CheckCircleIcon,
  ArrowUpIcon,
  SignalIcon,
  QrCodeIcon,
} from '@heroicons/react/24/solid';
import { Button } from '@/components/ui/button';
import type {
  LocationCheckConfig,
  LocationCheckState,
  GeoCoordinate,
} from '@/types/puzzle-modules';
import {
  calculateDistance,
  calculateBearing,
  bearingToDirection,
  isWithinRadius,
} from '@/types/puzzle-modules';

// ============================================================================
// LocationCheck – GPS/beacon/QR location verification
// ============================================================================

export interface LocationCheckProps {
  config: LocationCheckConfig;
  state: LocationCheckState;
  onLocationUpdate: (coords: GeoCoordinate) => void;
  onVerified: () => void;
  onQrScanned?: (value: string) => void;
  className?: string;
}

export function LocationCheck({
  config,
  state,
  onLocationUpdate,
  onVerified,
  onQrScanned,
  className = '',
}: LocationCheckProps) {
  const t = useTranslations('play.locationCheck');
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  // Start GPS tracking
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError(t('errors.notSupported'));
      return;
    }

    setIsTracking(true);
    setError(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      position => {
        const coords: GeoCoordinate = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        onLocationUpdate(coords);

        // Check if within radius
        if (
          config.targetCoordinates &&
          config.radiusMeters &&
          isWithinRadius(coords, config.targetCoordinates, config.radiusMeters)
        ) {
          onVerified();
        }
      },
      err => {
        setError(
          err.code === 1
            ? t('errors.accessDenied')
            : err.code === 2
            ? t('errors.notAvailable')
            : t('errors.timeout')
        );
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [config.targetCoordinates, config.radiusMeters, onLocationUpdate, onVerified, t]);

  // Stop tracking on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Calculate distance and bearing
  const distance = state.currentCoordinates && config.targetCoordinates
    ? calculateDistance(state.currentCoordinates, config.targetCoordinates)
    : null;

  const bearing = state.currentCoordinates && config.targetCoordinates
    ? calculateBearing(state.currentCoordinates, config.targetCoordinates)
    : null;

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Location info */}
      <div className="p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center gap-2 mb-2">
          <MapPinIcon className="h-5 w-5 text-blue-500" />
          <h3 className="font-semibold">{config.locationName}</h3>
        </div>
        {config.hint && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {config.hint}
          </p>
        )}
      </div>

      {/* Verified state */}
      {state.isVerified ? (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300">
          <CheckCircleIcon className="h-6 w-6" />
          <div>
            <p className="font-medium">{t('verified.title')}</p>
            <p className="text-sm opacity-80">
              {t('verified.description', { location: config.locationName })}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* GPS Check UI */}
          {config.checkType === 'gps' && (
            <div className="flex flex-col gap-4">
              {/* Distance indicator */}
              {config.showDistance && distance !== null && (
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                    {distance < 1000
                      ? `${Math.round(distance)} m`
                      : `${(distance / 1000).toFixed(1)} km`}
                  </div>
                  <p className="text-sm text-zinc-500">{t('gps.distanceToTarget')}</p>
                </div>
              )}

              {/* Compass indicator */}
              {config.showCompass && bearing !== null && (
                <div className="flex items-center justify-center gap-2">
                  <div
                    className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30"
                    style={{ transform: `rotate(${bearing}deg)` }}
                  >
                    <ArrowUpIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-lg font-medium">
                    {bearingToDirection(bearing)}
                  </span>
                </div>
              )}

              {/* Progress ring */}
              {config.radiusMeters && distance !== null && (
                <div className="flex justify-center">
                  <DistanceRing
                    distance={distance}
                    targetRadius={config.radiusMeters}
                  />
                </div>
              )}

              {/* Start tracking button */}
              {!isTracking ? (
                <Button onClick={startTracking}>
                  <MapPinIcon className="h-5 w-5 mr-2" />
                  {t('gps.startTracking')}
                </Button>
              ) : (
                <div className="flex items-center justify-center gap-2 text-sm text-zinc-500">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  {t('gps.searching')}
                </div>
              )}
            </div>
          )}

          {/* Beacon Check UI */}
          {config.checkType === 'beacon' && (
            <div className="flex flex-col items-center gap-4 p-6">
              <SignalIcon className="h-16 w-16 text-blue-500 animate-pulse" />
              <p className="text-center text-zinc-600 dark:text-zinc-400">
                {t('beacon.searchFor')} <code className="font-mono">{config.beaconId}</code>
              </p>
              <p className="text-sm text-zinc-500">
                {t('beacon.getCloser')}
              </p>
            </div>
          )}

          {/* QR Check UI */}
          {config.checkType === 'qr' && (
            <div className="flex flex-col items-center gap-4 p-6">
              <QrCodeIcon className="h-16 w-16 text-blue-500" />
              <p className="text-center text-zinc-600 dark:text-zinc-400">
                {t('qr.scanCode')}
              </p>
              <Button onClick={() => onQrScanned?.(config.qrCodeValue || '')}>
                <QrCodeIcon className="h-5 w-5 mr-2" />
                {t('qr.openScanner')}
              </Button>
            </div>
          )}

          {/* Manual Check UI */}
          {config.checkType === 'manual' && (
            <div className="flex flex-col items-center gap-4 p-6">
              <MapPinIcon className="h-16 w-16 text-zinc-400" />
              <p className="text-center text-zinc-600 dark:text-zinc-400">
                {t('manual.hostWillVerify')}
              </p>
            </div>
          )}
        </>
      )}

      {/* Error message */}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// DistanceRing – Visual progress indicator
// ============================================================================

interface DistanceRingProps {
  distance: number;
  targetRadius: number;
}

function DistanceRing({ distance, targetRadius }: DistanceRingProps) {
  // Calculate progress (inverse - closer = more progress)
  const maxDistance = targetRadius * 5;
  const progress = Math.max(0, Math.min(1, 1 - distance / maxDistance));
  const isClose = distance <= targetRadius;

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="relative w-32 h-32">
      <svg className="w-full h-full -rotate-90">
        {/* Background ring */}
        <circle
          cx="64"
          cy="64"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-zinc-200 dark:text-zinc-700"
        />
        {/* Progress ring */}
        <circle
          cx="64"
          cy="64"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={isClose ? 'text-green-500' : 'text-blue-500'}
          style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-sm font-medium ${isClose ? 'text-green-600' : 'text-zinc-600'}`}>
          {isClose ? '✓' : `${Math.round(progress * 100)}%`}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// LocationConfirmControl – Host UI for manual location verification
// ============================================================================

export interface LocationConfirmControlProps {
  config: LocationCheckConfig;
  participantName?: string;
  onVerify: () => void;
  className?: string;
}

export function LocationConfirmControl({
  config,
  participantName,
  onVerify,
  className = '',
}: LocationConfirmControlProps) {
  const t = useTranslations('play.locationCheck');
  return (
    <div className={`p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-medium">{config.locationName}</h4>
          {participantName && (
            <p className="text-sm text-zinc-500">{t('participant')}: {participantName}</p>
          )}
        </div>
        <MapPinIcon className="h-5 w-5 text-blue-500" />
      </div>
      <Button onClick={onVerify} className="w-full">
        <CheckCircleIcon className="h-5 w-5 mr-2" />
        {t('verifyLocation')}
      </Button>
    </div>
  );
}

// ============================================================================
// useLocationCheck – Hook for managing location check state
// ============================================================================

export function useLocationCheck(config: LocationCheckConfig) {
  const [state, setState] = useState<LocationCheckState>({
    isVerified: false,
  });

  const updateLocation = useCallback(
    (coords: GeoCoordinate) => {
      const distance =
        config.targetCoordinates
          ? calculateDistance(coords, config.targetCoordinates)
          : undefined;

      setState(prev => ({
        ...prev,
        currentCoordinates: coords,
        distanceMeters: distance,
        lastCheckAt: new Date().toISOString(),
      }));
    },
    [config.targetCoordinates]
  );

  const verify = useCallback(() => {
    setState(prev => ({
      ...prev,
      isVerified: true,
      verifiedAt: new Date().toISOString(),
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      isVerified: false,
    });
  }, []);

  return { state, updateLocation, verify, reset };
}
