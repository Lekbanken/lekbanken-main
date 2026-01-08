/**
 * AI Assistant Types for Planner
 * 
 * Types and interfaces for AI-powered plan suggestions.
 * This provides the foundation for future AI integration.
 */

import type { PlannerBlock, PlannerPlan } from '@/types/planner'

/** Context provided to the AI for generating suggestions */
export type PlanAIContext = {
  /** Current plan being edited */
  plan: PlannerPlan
  /** Target audience age range */
  ageRange?: { min: number; max: number }
  /** Number of participants */
  participantCount?: number
  /** Available time in minutes */
  availableTime?: number
  /** Session goals or themes */
  goals?: string[]
  /** Available games/activities to choose from */
  availableGames?: Array<{
    id: string
    title: string
    durationMinutes: number
    tags: string[]
  }>
  /** User's preferences or constraints */
  preferences?: {
    preferIndoor?: boolean
    preferOutdoor?: boolean
    accessibilityNeeds?: string[]
    equipmentAvailable?: string[]
  }
}

/** Types of AI suggestions that can be requested */
export type PlanAISuggestionType =
  | 'fill_gaps'         // Suggest blocks to fill time gaps
  | 'optimize_flow'     // Suggest reordering for better flow
  | 'add_transitions'   // Suggest transition blocks between activities
  | 'balance_energy'    // Suggest high/low energy balance
  | 'complete_plan'     // Generate a complete plan from scratch
  | 'improve_block'     // Suggest improvements to a specific block

/** A single AI suggestion */
export type PlanAISuggestion = {
  id: string
  type: PlanAISuggestionType
  confidence: number // 0-1 confidence score
  title: string
  description: string
  /** The suggested change */
  change:
    | { action: 'add_block'; block: Omit<PlannerBlock, 'id' | 'planId'>; position: number }
    | { action: 'reorder'; newOrder: string[] }
    | { action: 'modify_block'; blockId: string; updates: Partial<PlannerBlock> }
    | { action: 'remove_block'; blockId: string; reason: string }
    | { action: 'replace_plan'; blocks: Array<Omit<PlannerBlock, 'id' | 'planId'>> }
  /** Explanation for why this suggestion was made */
  reasoning: string
}

/** Response from AI suggestion request */
export type PlanAISuggestionResponse = {
  suggestions: PlanAISuggestion[]
  tokensUsed?: number
  processingTimeMs?: number
}

/** Request for AI suggestions */
export type PlanAISuggestionRequest = {
  context: PlanAIContext
  suggestionTypes?: PlanAISuggestionType[]
  maxSuggestions?: number
}

/**
 * Stub AI service for plan suggestions
 * 
 * This provides a placeholder implementation that can be replaced
 * with actual AI integration (OpenAI, Anthropic, etc.) later.
 */
export async function generatePlanSuggestions(
  request: PlanAISuggestionRequest
): Promise<PlanAISuggestionResponse> {
  const { context, suggestionTypes = ['fill_gaps'], maxSuggestions = 3 } = request
  
  // Stub implementation - returns example suggestions
  const suggestions: PlanAISuggestion[] = []
  
  // Example: Suggest adding a warmup if plan starts with high-energy activity
  if (suggestionTypes.includes('optimize_flow') && context.plan.blocks.length > 0) {
    const firstBlock = context.plan.blocks[0]
    if (firstBlock.blockType === 'game') {
      suggestions.push({
        id: `suggestion-warmup-${Date.now()}`,
        type: 'optimize_flow',
        confidence: 0.8,
        title: 'Lägg till uppvärmning',
        description: 'Börja med en kort uppvärmning innan första leken',
        change: {
          action: 'add_block',
          position: 0,
          block: {
            blockType: 'preparation',
            title: 'Uppvärmning',
            durationMinutes: 5,
            notes: 'Kort fysisk aktivering innan huvudaktiviteten',
            position: 0,
            isOptional: false,
            game: null,
          },
        },
        reasoning: 'En uppvärmning hjälper deltagarna att fokusera och förbereder kroppen för aktivitet.',
      })
    }
  }
  
  // Example: Suggest adding reflection at end (using custom block type)
  if (suggestionTypes.includes('fill_gaps') && context.plan.blocks.length > 0) {
    const lastBlock = context.plan.blocks[context.plan.blocks.length - 1]
    // Check if last block is not already a reflection-type custom block
    if (lastBlock.blockType !== 'custom' || !lastBlock.title?.toLowerCase().includes('reflektion')) {
      suggestions.push({
        id: `suggestion-reflection-${Date.now()}`,
        type: 'fill_gaps',
        confidence: 0.7,
        title: 'Avsluta med reflektion',
        description: 'Lägg till en reflektionsstund i slutet av passet',
        change: {
          action: 'add_block',
          position: context.plan.blocks.length,
          block: {
            blockType: 'custom',
            title: 'Reflektion',
            durationMinutes: 5,
            notes: 'Samla gruppen och prata om vad som hände under passet',
            position: context.plan.blocks.length,
            isOptional: true,
            game: null,
          },
        },
        reasoning: 'Reflektion hjälper deltagarna att bearbeta upplevelsen och förstärker lärandet.',
      })
    }
  }
  
  // Example: Suggest adding pause if long session
  const totalMinutes = context.plan.blocks.reduce((sum, b) => sum + (b.durationMinutes ?? 0), 0)
  if (totalMinutes > 45 && !context.plan.blocks.some(b => b.blockType === 'pause')) {
    suggestions.push({
      id: `suggestion-pause-${Date.now()}`,
      type: 'optimize_flow',
      confidence: 0.9,
      title: 'Lägg till paus',
      description: 'Planen är över 45 minuter, lägg till en paus',
      change: {
        action: 'add_block',
        position: Math.floor(context.plan.blocks.length / 2),
        block: {
          blockType: 'pause',
          title: 'Paus',
          durationMinutes: 5,
          notes: 'Dricka vatten, gå på toaletten',
          position: Math.floor(context.plan.blocks.length / 2),
          isOptional: false,
          game: null,
        },
      },
      reasoning: 'Pauser är viktiga för koncentration och ork, särskilt vid längre pass.',
    })
  }
  
  return {
    suggestions: suggestions.slice(0, maxSuggestions),
    tokensUsed: 0, // Stub doesn't use tokens
    processingTimeMs: 50,
  }
}

/**
 * Apply a single AI suggestion to a plan
 * Returns the updated plan with the suggestion applied
 */
export function applySuggestion(
  plan: PlannerPlan,
  suggestion: PlanAISuggestion
): PlannerPlan {
  const change = suggestion.change
  
  switch (change.action) {
    case 'add_block': {
      const newBlock = {
        ...change.block,
        id: `temp-${Date.now()}`,
        planId: plan.id,
      } as PlannerBlock
      
      const blocks = [...plan.blocks]
      blocks.splice(change.position, 0, newBlock)
      
      // Recompute positions
      const reorderedBlocks = blocks.map((b, idx) => ({ ...b, position: idx }))
      
      return {
        ...plan,
        blocks: reorderedBlocks,
        status: plan.status === 'published' ? 'modified' : plan.status,
      }
    }
    
    case 'reorder': {
      const blockMap = new Map(plan.blocks.map((b) => [b.id, b]))
      const reorderedBlocks = change.newOrder
        .map((id, idx) => {
          const block = blockMap.get(id)
          return block ? { ...block, position: idx } : null
        })
        .filter((b): b is PlannerBlock => b !== null)
      
      return {
        ...plan,
        blocks: reorderedBlocks,
        status: plan.status === 'published' ? 'modified' : plan.status,
      }
    }
    
    case 'modify_block': {
      const blocks = plan.blocks.map((b) =>
        b.id === change.blockId ? { ...b, ...change.updates } : b
      )
      
      return {
        ...plan,
        blocks,
        status: plan.status === 'published' ? 'modified' : plan.status,
      }
    }
    
    case 'remove_block': {
      const blocks = plan.blocks
        .filter((b) => b.id !== change.blockId)
        .map((b, idx) => ({ ...b, position: idx }))
      
      return {
        ...plan,
        blocks,
        status: plan.status === 'published' ? 'modified' : plan.status,
      }
    }
    
    case 'replace_plan': {
      const blocks = change.blocks.map((b, idx) => ({
        ...b,
        id: `temp-${Date.now()}-${idx}`,
        planId: plan.id,
        position: idx,
      })) as PlannerBlock[]
      
      return {
        ...plan,
        blocks,
        status: 'draft',
      }
    }
    
    default:
      return plan
  }
}
