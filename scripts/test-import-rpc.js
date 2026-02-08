/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('crypto');
require('dotenv').config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const client = createClient(url, key);

async function testImport() {
  // First, get the game ID for "Arkivets sista signal"
  const { data: games, error: gameError } = await client
    .from('games')
    .select('id, game_key, name')
    .eq('game_key', 'arkivets-sista-signal-001')
    .single();

  if (gameError || !games) {
    console.log('Game not found:', gameError?.message);
    return;
  }

  console.log('Found game:', games.name, 'ID:', games.id);

  // Try to insert phases directly to test
  const phaseId = randomUUID();
  const payload = {
    game_id: games.id,
    is_update: true,
    import_run_id: randomUUID(),
    steps: [
      {
        id: randomUUID(),
        step_order: 1,
        title: 'Test Step',
        body: 'Test body',
        duration_seconds: 300,
        leader_script: null,
        participant_prompt: null,
        board_text: null,
        optional: false,
        locale: null,
        phase_id: null,
        conditional: null,
        media_ref: null,
        display_mode: null,
      }
    ],
    phases: [
      {
        id: phaseId,
        phase_order: 1,
        name: 'Test Phase',
        phase_type: 'intro',
        duration_seconds: 300,
        timer_visible: true,
        timer_style: 'countdown',
        description: 'Test description',
        board_message: null,
        auto_advance: false,
        locale: null,
      }
    ],
    roles: [
      {
        id: randomUUID(),
        role_order: 1,
        name: 'Test Role',
        icon: null,
        color: null,
        public_description: 'Test desc',
        private_instructions: '',
        private_hints: null,
        min_count: 1,
        max_count: null,
        assignment_strategy: 'random',
        scaling_rules: null,
        conflicts_with: null,
        locale: null,
      }
    ],
    materials: null,
    board_config: null,
    secondary_purpose_ids: [],
    artifacts: [],
    artifact_variants: [],
    triggers: [],
  };

  console.log('Calling RPC with payload...');
  const { data, error } = await client.rpc('upsert_game_content_v1', {
    p_payload: payload
  });

  if (error) {
    console.log('RPC Error:', error.code, error.message);
    console.log('Full error:', JSON.stringify(error, null, 2));
  } else {
    console.log('RPC result:', JSON.stringify(data, null, 2));
    
    // Verify data was inserted
    const { count: phases } = await client.from('game_phases').select('*', { count: 'exact', head: true }).eq('game_id', games.id);
    const { count: steps } = await client.from('game_steps').select('*', { count: 'exact', head: true }).eq('game_id', games.id);
    const { count: roles } = await client.from('game_roles').select('*', { count: 'exact', head: true }).eq('game_id', games.id);
    console.log(`After RPC: phases=${phases} steps=${steps} roles=${roles}`);
  }
}

testImport();
