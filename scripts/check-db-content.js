const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.log('Missing env vars');
  console.log('URL:', url ? 'set' : 'missing');
  console.log('KEY:', key ? 'set' : 'missing');
  process.exit(1);
}

const client = createClient(url, key);

async function check() {
  const { data: games, error } = await client
    .from('games')
    .select('game_key, name, id')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (error) {
    console.log('Error:', error.message);
    return;
  }
  
  console.log('Recent games:');
  for (const g of games || []) {
    const { count: phases } = await client.from('game_phases').select('*', { count: 'exact', head: true }).eq('game_id', g.id);
    const { count: steps } = await client.from('game_steps').select('*', { count: 'exact', head: true }).eq('game_id', g.id);
    const { count: roles } = await client.from('game_roles').select('*', { count: 'exact', head: true }).eq('game_id', g.id);
    const { count: artifacts } = await client.from('game_artifacts').select('*', { count: 'exact', head: true }).eq('game_id', g.id);
    console.log(`  ${g.name || '(no name)'} (key: ${g.game_key}) - phases:${phases} steps:${steps} roles:${roles} artifacts:${artifacts}`);
  }
}

check();
