'use client';

import type { TriggerActionContext } from './useTriggerEngine';
import { sendSessionSignal } from '@/features/play/api/signals-api';
import { applySessionTimeBankDelta } from '@/features/play/api/time-bank-api';

/**
 * Convenience wrapper to add Signal + Time Bank primitives to an existing TriggerActionContext.
 * This keeps the engine decoupled from HTTP concerns.
 */
export function withSignalAndTimeBank(base: TriggerActionContext): TriggerActionContext {
  return {
    ...base,
    sendSignal: async (channel: string, payload: unknown) => {
      await sendSessionSignal(base.sessionId, { channel, payload });
    },
    applyTimeBankDelta: async (
      deltaSeconds: number,
      reason: string,
      options?: {
        minBalanceSeconds?: number;
        maxBalanceSeconds?: number;
        metadata?: Record<string, unknown> | null;
      }
    ) => {
      await applySessionTimeBankDelta(base.sessionId, {
        deltaSeconds,
        reason,
        minBalanceSeconds: options?.minBalanceSeconds,
        maxBalanceSeconds: options?.maxBalanceSeconds,
        metadata: options?.metadata ?? undefined,
      });
    },
  };
}
