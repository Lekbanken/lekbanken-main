import { describe, test, expect } from 'vitest'
import { mapTriggers } from '@/lib/game-display/mappers'

/**
 * F7 contract tests — Triggers API sanitization (Option B)
 *
 * Verifies that the route-level sanitization pattern (strip content strings
 * from actions, strip outcome from decision_resolved conditions) produces
 * the expected output when followed by mapTriggers().
 */

// Helper: simulate the route's sanitization logic
const STRIP_ACTION_KEYS = new Set(['message', 'customScript', 'reason', 'label'])

function sanitizeTrigger(t: {
  condition: Record<string, unknown>
  actions: Record<string, unknown>[]
  [key: string]: unknown
}) {
  const condition =
    t.condition?.type === 'decision_resolved'
      ? (() => {
          const { outcome: _outcome, ...safe } = t.condition
          return safe
        })()
      : t.condition

  const actions = t.actions.map((action) => {
    const cleaned: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(action)) {
      if (!STRIP_ACTION_KEYS.has(k)) cleaned[k] = v
    }
    return cleaned
  })

  return { ...t, condition, actions }
}

describe('Triggers API contract (F7)', () => {
  test('strips message from send_message actions', () => {
    const trigger = sanitizeTrigger({
      id: 't1',
      name: 'Greet',
      description: 'Send greeting',
      enabled: true,
      condition: { type: 'step_started', stepId: 's1' },
      actions: [
        { type: 'send_message', message: 'Secret story text', style: 'dramatic' },
      ],
      execute_once: false,
      delay_seconds: 0,
      sort_order: 1,
    })

    const result = mapTriggers([trigger] as Parameters<typeof mapTriggers>[0])
    const action = (result[0].actions as Record<string, unknown>[])[0]
    expect(action).toHaveProperty('type', 'send_message')
    expect(action).toHaveProperty('style', 'dramatic')
    expect(action).not.toHaveProperty('message')
  })

  test('strips customScript from show_leader_script actions', () => {
    const trigger = sanitizeTrigger({
      id: 't2',
      name: 'Show Script',
      description: 'Show facilitator instructions',
      enabled: true,
      condition: { type: 'manual' },
      actions: [
        {
          type: 'show_leader_script',
          stepId: 's1',
          customScript: 'Tell the group the secret password is DRAGON',
          autoDismissSeconds: 10,
        },
      ],
      execute_once: true,
      delay_seconds: 0,
      sort_order: 2,
    })

    const result = mapTriggers([trigger] as Parameters<typeof mapTriggers>[0])
    const action = (result[0].actions as Record<string, unknown>[])[0]
    expect(action).toHaveProperty('type', 'show_leader_script')
    expect(action).toHaveProperty('stepId', 's1')
    expect(action).toHaveProperty('autoDismissSeconds', 10)
    expect(action).not.toHaveProperty('customScript')
  })

  test('strips outcome from decision_resolved conditions', () => {
    const trigger = sanitizeTrigger({
      id: 't3',
      name: 'Decision handler',
      description: 'When vote resolves',
      enabled: true,
      condition: {
        type: 'decision_resolved',
        decisionId: 'd1',
        outcome: 'secret_option_B',
      },
      actions: [{ type: 'advance_step' }],
      execute_once: false,
      delay_seconds: 0,
      sort_order: 3,
    })

    const result = mapTriggers([trigger] as Parameters<typeof mapTriggers>[0])
    const condition = result[0].condition as Record<string, unknown>
    expect(condition).toHaveProperty('type', 'decision_resolved')
    expect(condition).toHaveProperty('decisionId', 'd1')
    expect(condition).not.toHaveProperty('outcome')
  })

  test('preserves non-sensitive condition fields (keypad_correct)', () => {
    const trigger = sanitizeTrigger({
      id: 't4',
      name: 'Keypad solved',
      description: 'When keypad is correct',
      enabled: true,
      condition: { type: 'keypad_correct', keypadId: 'kp1' },
      actions: [{ type: 'reveal_artifact', artifactId: 'a1' }],
      execute_once: true,
      delay_seconds: 0,
      sort_order: 4,
    })

    const result = mapTriggers([trigger] as Parameters<typeof mapTriggers>[0])
    const condition = result[0].condition as Record<string, unknown>
    expect(condition).toHaveProperty('type', 'keypad_correct')
    expect(condition).toHaveProperty('keypadId', 'kp1')
    // Action structural fields preserved
    const action = (result[0].actions as Record<string, unknown>[])[0]
    expect(action).toHaveProperty('type', 'reveal_artifact')
    expect(action).toHaveProperty('artifactId', 'a1')
  })

  test('strips reason and label from respective action types', () => {
    const trigger = sanitizeTrigger({
      id: 't5',
      name: 'Multi actions',
      description: 'Complex trigger',
      enabled: true,
      condition: { type: 'step_completed', stepId: 's2' },
      actions: [
        { type: 'time_bank_apply_delta', deltaSeconds: -30, reason: 'Penalty for wrong answer' },
        { type: 'add_replay_marker', markerType: 'event', label: 'Secret revealed' },
      ],
      execute_once: false,
      delay_seconds: 5,
      sort_order: 5,
    })

    const result = mapTriggers([trigger] as Parameters<typeof mapTriggers>[0])
    const actions = result[0].actions as Record<string, unknown>[]
    // time_bank_apply_delta: keeps deltaSeconds, strips reason
    expect(actions[0]).toHaveProperty('type', 'time_bank_apply_delta')
    expect(actions[0]).toHaveProperty('deltaSeconds', -30)
    expect(actions[0]).not.toHaveProperty('reason')
    // add_replay_marker: keeps markerType, strips label
    expect(actions[1]).toHaveProperty('type', 'add_replay_marker')
    expect(actions[1]).toHaveProperty('markerType', 'event')
    expect(actions[1]).not.toHaveProperty('label')
  })
})
