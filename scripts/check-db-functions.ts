/**
 * Check DB Functions
 * 
 * Query the remote database to see what functions exist.
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  console.log('Checking database functions...');
  console.log(`URL: ${SUPABASE_URL}`);
  console.log();

  // Query pg_proc for upsert_game functions
  const { data, error } = await supabase.rpc('get_functions_like', {
    pattern: '%upsert_game%'
  });

  if (error) {
    console.log('RPC get_functions_like not available, trying direct query...');
    
    // Try a simpler test - just check if we can connect
    const { data: tables, error: tableError } = await supabase
      .from('games')
      .select('id')
      .limit(1);
    
    if (tableError) {
      console.error('Cannot connect to database:', tableError.message);
    } else {
      console.log('Database connection OK. Games table accessible.');
      console.log('Sample game:', tables?.[0]?.id ?? 'no games');
    }
    return;
  }

  console.log('Found functions:', data);
}

main().catch(console.error);
