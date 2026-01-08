import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'

type AutomationRuleRow = Database['public']['Tables']['gamification_automation_rules']['Row']

// Default rules to seed - matches GLOBAL_REWARD_RULES in reward-engine
const DEFAULT_RULES = [
  // Play domain
  {
    name: 'Session påbörjad',
    event_type: 'session_started',
    reward_amount: 1,
    xp_amount: 10,
    cooldown_type: 'none',
    base_multiplier: 1.0,
    is_active: true,
    conditions: [],
  },
  {
    name: 'Session avslutad',
    event_type: 'session_completed',
    reward_amount: 2,
    xp_amount: 25,
    cooldown_type: 'none',
    base_multiplier: 1.0,
    is_active: true,
    conditions: [],
  },
  {
    name: 'Run avslutad',
    event_type: 'run_completed',
    reward_amount: 1,
    xp_amount: 15,
    cooldown_type: 'none',
    base_multiplier: 1.0,
    is_active: true,
    conditions: [],
  },
  {
    name: 'Första sessionen',
    event_type: 'first_session',
    reward_amount: 50,
    xp_amount: 500,
    cooldown_type: 'once',
    base_multiplier: 1.0,
    is_active: true,
    conditions: [],
  },
  {
    name: 'Perfekt session',
    event_type: 'perfect_session',
    reward_amount: 5,
    xp_amount: 50,
    cooldown_type: 'daily',
    base_multiplier: 1.0,
    is_active: true,
    conditions: [],
  },
  {
    name: 'Stor grupp värd',
    event_type: 'large_group_hosted',
    reward_amount: 10,
    xp_amount: 100,
    cooldown_type: 'weekly',
    base_multiplier: 1.0,
    is_active: true,
    conditions: [],
  },
  // Planner domain
  {
    name: 'Plan skapad',
    event_type: 'plan_created',
    reward_amount: 5,
    xp_amount: 20,
    cooldown_type: 'none',
    base_multiplier: 1.0,
    is_active: true,
    conditions: [],
  },
  {
    name: 'Plan publicerad',
    event_type: 'plan_published',
    reward_amount: 10,
    xp_amount: 50,
    cooldown_type: 'none',
    base_multiplier: 1.0,
    is_active: true,
    conditions: [],
  },
  {
    name: 'Första planen',
    event_type: 'first_plan',
    reward_amount: 25,
    xp_amount: 200,
    cooldown_type: 'once',
    base_multiplier: 1.0,
    is_active: true,
    conditions: [],
  },
  // Engagement domain
  {
    name: 'Daglig inloggning',
    event_type: 'daily_login',
    reward_amount: 1,
    xp_amount: 10,
    cooldown_type: 'daily',
    base_multiplier: 1.0,
    is_active: true,
    conditions: [],
  },
  {
    name: 'Streak 3 dagar',
    event_type: 'streak_3_days',
    reward_amount: 5,
    xp_amount: 30,
    cooldown_type: 'once_per_streak',
    base_multiplier: 1.0,
    is_active: true,
    conditions: [],
  },
  {
    name: 'Streak 7 dagar',
    event_type: 'streak_7_days',
    reward_amount: 15,
    xp_amount: 75,
    cooldown_type: 'once_per_streak',
    base_multiplier: 1.0,
    is_active: true,
    conditions: [],
  },
  {
    name: 'Streak 30 dagar',
    event_type: 'streak_30_days',
    reward_amount: 50,
    xp_amount: 300,
    cooldown_type: 'once_per_streak',
    base_multiplier: 1.0,
    is_active: true,
    conditions: [],
  },
  // Content domain
  {
    name: 'Spel skapat',
    event_type: 'game_created',
    reward_amount: 8,
    xp_amount: 40,
    cooldown_type: 'none',
    base_multiplier: 1.0,
    is_active: true,
    conditions: [],
  },
  {
    name: 'Spel publicerat',
    event_type: 'game_published',
    reward_amount: 15,
    xp_amount: 100,
    cooldown_type: 'none',
    base_multiplier: 1.0,
    is_active: true,
    conditions: [],
  },
  // Social domain
  {
    name: 'Inbjudan accepterad',
    event_type: 'invite_accepted',
    reward_amount: 20,
    xp_amount: 100,
    cooldown_type: 'none',
    base_multiplier: 1.0,
    is_active: true,
    conditions: [],
  },
  // Learning domain
  {
    name: 'Tutorial avslutad',
    event_type: 'tutorial_completed',
    reward_amount: 15,
    xp_amount: 100,
    cooldown_type: 'once',
    base_multiplier: 1.0,
    is_active: true,
    conditions: [],
  },
]

// GET: Fetch existing rules and compare with defaults
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    
    const admin = createServiceRoleClient()
    
    // Fetch existing rules
    let query = admin
      .from('gamification_automation_rules')
      .select('*')
    
    if (tenantId) {
      query = query.eq('tenant_id', tenantId)
    } else {
      query = query.is('tenant_id', null)
    }
    
    const { data: existingRules, error } = await query
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // Map existing rules by event_type for quick lookup
    const existingByType = new Map<string, AutomationRuleRow>(
      (existingRules || []).map((r: AutomationRuleRow) => [r.event_type, r])
    )
    
    // Combine default rules with DB status
    const rules = DEFAULT_RULES.map(defaultRule => {
      const existing = existingByType.get(defaultRule.event_type)
      return {
        ...defaultRule,
        id: existing?.id || null,
        inDatabase: !!existing,
        dbValues: existing ? {
          reward_amount: existing.reward_amount,
          xp_amount: existing.xp_amount,
          cooldown_type: existing.cooldown_type,
          base_multiplier: existing.base_multiplier,
          is_active: existing.is_active,
        } : null,
      }
    })
    
    // Find any custom rules (in DB but not in defaults)
    const defaultEventTypes = new Set(DEFAULT_RULES.map(r => r.event_type))
    const customRules = (existingRules || [])
      .filter((r: AutomationRuleRow) => !defaultEventTypes.has(r.event_type))
      .map((r: AutomationRuleRow) => ({
        ...r,
        inDatabase: true,
        isCustom: true,
      }))
    
    return NextResponse.json({
      rules,
      customRules,
      stats: {
        total: DEFAULT_RULES.length,
        inDatabase: rules.filter(r => r.inDatabase).length,
        missing: rules.filter(r => !r.inDatabase).length,
        custom: customRules.length,
      }
    })
  } catch (err) {
    console.error('Error fetching rules:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: Seed missing rules or update existing
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { tenantId, mode = 'missing', userId } = body as {
      tenantId?: string | null
      mode: 'missing' | 'all' | 'reset'
      userId?: string
    }
    
    const admin = createServiceRoleClient()
    
    // If reset mode, delete existing rules first
    if (mode === 'reset') {
      let deleteQuery = admin
        .from('gamification_automation_rules')
        .delete()
      
      if (tenantId) {
        deleteQuery = deleteQuery.eq('tenant_id', tenantId)
      } else {
        deleteQuery = deleteQuery.is('tenant_id', null)
      }
      
      // Only delete default event types, preserve custom rules
      const defaultEventTypes = DEFAULT_RULES.map(r => r.event_type)
      deleteQuery = deleteQuery.in('event_type', defaultEventTypes)
      
      const { error: deleteError } = await deleteQuery
      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 })
      }
    }
    
    // Fetch current state
    let existingQuery = admin
      .from('gamification_automation_rules')
      .select('event_type')
    
    if (tenantId) {
      existingQuery = existingQuery.eq('tenant_id', tenantId)
    } else {
      existingQuery = existingQuery.is('tenant_id', null)
    }
    
    const { data: existing } = await existingQuery
    const existingTypes = new Set((existing || []).map((r: { event_type: string }) => r.event_type))
    
    // Determine which rules to insert
    const rulesToInsert = DEFAULT_RULES
      .filter(r => mode === 'all' || mode === 'reset' || !existingTypes.has(r.event_type))
      .map(r => ({
        ...r,
        tenant_id: tenantId || null,
        created_by_user_id: userId || null,
      }))
    
    if (rulesToInsert.length === 0) {
      return NextResponse.json({
        success: true,
        inserted: 0,
        message: 'Alla regler finns redan i databasen',
      })
    }
    
    // Insert rules
    const { data: inserted, error: insertError } = await admin
      .from('gamification_automation_rules')
      .insert(rulesToInsert)
      .select()
    
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      inserted: inserted?.length || 0,
      rules: inserted,
      message: `${inserted?.length || 0} regler har lagts till`,
    })
  } catch (err) {
    console.error('Error seeding rules:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
