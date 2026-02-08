const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const client = createClient(url, key);

async function testRpc() {
  // Test if function exists
  const { data, error } = await client.rpc('upsert_game_content_v1', {
    p_payload: {
      game_id: '00000000-0000-0000-0000-000000000000', // Fake ID just to test
      is_update: false,
      import_run_id: 'test-123',
      steps: [],
      phases: [],
      roles: [],
      materials: null,
      board_config: null,
      secondary_purpose_ids: [],
      artifacts: [],
      artifact_variants: [],
      triggers: [],
    }
  });

  if (error) {
    console.log('RPC Error:', error.code, error.message);
    console.log('Full error:', JSON.stringify(error, null, 2));
  } else {
    console.log('RPC result:', data);
  }
}

testRpc();
