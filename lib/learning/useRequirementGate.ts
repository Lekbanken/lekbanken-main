'use client'

import { useState, useEffect, useCallback } from 'react'
import { checkRequirements, type RequirementCheckResult, type GatingTarget } from '@/app/actions/learning-requirements'

export type UseRequirementGateOptions = {
  target: GatingTarget
  tenantId: string
  enabled?: boolean
  onBlocked?: (result: RequirementCheckResult) => void
}

export type UseRequirementGateResult = {
  isLoading: boolean
  isAllowed: boolean
  result: RequirementCheckResult | null
  recheck: () => Promise<void>
}

/**
 * Hook to check if user has completed required training for an action
 * 
 * @example
 * ```tsx
 * const { isAllowed, result, isLoading } = useRequirementGate({
 *   target: { kind: 'game', id: gameId },
 *   tenantId,
 *   onBlocked: (result) => setShowTrainingModal(true),
 * })
 * 
 * if (!isAllowed && !isLoading) {
 *   return <TrainingRequiredModal courses={result?.unsatisfiedCourses} />
 * }
 * ```
 */
export function useRequirementGate({
  target,
  tenantId,
  enabled = true,
  onBlocked,
}: UseRequirementGateOptions): UseRequirementGateResult {
  const [isLoading, setIsLoading] = useState(true)
  const [result, setResult] = useState<RequirementCheckResult | null>(null)

  const check = useCallback(async () => {
    if (!enabled || !target.id || !tenantId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const checkResult = await checkRequirements(target, tenantId)
      setResult(checkResult)
      
      if (!checkResult.satisfied && onBlocked) {
        onBlocked(checkResult)
      }
    } catch (error) {
      console.error('Failed to check requirements:', error)
      // Fail open - allow action if check fails
      setResult({
        satisfied: true,
        total: 0,
        completed: 0,
        remaining: 0,
        unsatisfiedCourses: [],
      })
    } finally {
      setIsLoading(false)
    }
  }, [target.kind, target.id, tenantId, enabled, onBlocked])

  useEffect(() => {
    check()
  }, [check])

  return {
    isLoading,
    isAllowed: result?.satisfied ?? true,
    result,
    recheck: check,
  }
}

export type { RequirementCheckResult, GatingTarget }
