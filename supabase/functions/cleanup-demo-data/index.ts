// deno-lint-ignore-file
// 
// Supabase Edge Function: cleanup-demo-data
// NOTE: This file runs in Deno runtime, not Node.js. TypeScript errors in VS Code are expected
// unless you have the Deno VS Code extension installed and configured.
// 
// Denna funktion körs nattligt via Supabase cron eller extern trigger för att:
// 1. Ta bort utgångna demo-sessioner (äldre än 24h)
// 2. Ta bort demo-användardata som inte konverterats
// 3. Rensa temporär demo-data
//
// Deploy: supabase functions deploy cleanup-demo-data
// Trigger via cron: SELECT cron.schedule('cleanup-demo-data', '0 3 * * *', ...)

// Deno ambient declarations for VS Code compatibility
declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response>) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

import { createClient } from '@supabase/supabase-js';

const DEMO_SESSION_TTL_HOURS = 24;

interface CleanupResult {
  success: boolean;
  deleted: {
    sessions: number;
    users: number;
    gameSessions: number;
  };
  errors: string[];
  executedAt: string;
}

interface DemoSession {
  id: string;
  user_id: string | null;
}

interface DemoUser {
  id: string;
}

interface ActiveSession {
  user_id: string;
}

Deno.serve(async (req: Request) => {
  // Verifiera API-nyckel för säkerhet
  const authHeader = req.headers.get('Authorization');
  const expectedKey = Deno.env.get('CLEANUP_API_KEY');
  
  if (expectedKey && authHeader !== `Bearer ${expectedKey}`) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  });

  const result: CleanupResult = {
    success: false,
    deleted: {
      sessions: 0,
      users: 0,
      gameSessions: 0,
    },
    errors: [],
    executedAt: new Date().toISOString(),
  };

  try {
    // 1. Hitta utgångna demo-sessioner
    const expiryThreshold = new Date();
    expiryThreshold.setHours(expiryThreshold.getHours() - DEMO_SESSION_TTL_HOURS);

    const { data: expiredSessions, error: fetchError } = await supabase
      .from('demo_sessions')
      .select('id, user_id')
      .lt('created_at', expiryThreshold.toISOString())
      .is('converted', null);

    if (fetchError) {
      result.errors.push(`Kunde inte hämta utgångna sessioner: ${fetchError.message}`);
    }

    const expiredSessionIds = expiredSessions?.map((s: DemoSession) => s.id) ?? [];
    const expiredUserIds = expiredSessions?.map((s: DemoSession) => s.user_id).filter(Boolean) ?? [];

    // 2. Ta bort demo game_sessions för dessa användare
    if (expiredUserIds.length > 0) {
      const { data: deletedGameSessions, error: gameSessionError } = await supabase
        .from('game_sessions')
        .delete()
        .in('player_id', expiredUserIds)
        .select('id');

      if (gameSessionError) {
        result.errors.push(`Kunde inte ta bort game_sessions: ${gameSessionError.message}`);
      } else {
        result.deleted.gameSessions = deletedGameSessions?.length ?? 0;
      }
    }

    // 3. Ta bort demo-sessioner
    if (expiredSessionIds.length > 0) {
      const { data: deletedSessions, error: sessionError } = await supabase
        .from('demo_sessions')
        .delete()
        .in('id', expiredSessionIds)
        .select('id');

      if (sessionError) {
        result.errors.push(`Kunde inte ta bort demo_sessions: ${sessionError.message}`);
      } else {
        result.deleted.sessions = deletedSessions?.length ?? 0;
      }
    }

    // 4. Ta bort demo-användare (användare med is_ephemeral_demo = true och ingen aktiv session)
    const { data: orphanedDemoUsers, error: userFetchError } = await supabase
      .from('users')
      .select('id')
      .eq('is_ephemeral_demo', true)
      .lt('created_at', expiryThreshold.toISOString());

    if (userFetchError) {
      result.errors.push(`Kunde inte hämta demo-användare: ${userFetchError.message}`);
    }

    // Filtrera bort användare som har aktiva sessioner eller konverterat
    if (orphanedDemoUsers && orphanedDemoUsers.length > 0) {
      const userIds = orphanedDemoUsers.map((u: DemoUser) => u.id);
      
      // Hitta användare som INTE har aktiva demo_sessions
      const { data: activeSessionUsers } = await supabase
        .from('demo_sessions')
        .select('user_id')
        .in('user_id', userIds)
        .not('converted', 'is', null);

      const activeUserIds = new Set(activeSessionUsers?.map((s: ActiveSession) => s.user_id) ?? []);
      const usersToDelete = userIds.filter((id: string) => !activeUserIds.has(id));

      if (usersToDelete.length > 0) {
        // OBS: Beroende på RLS och foreign keys kan detta kräva service role
        const { data: deletedUsers, error: userDeleteError } = await supabase
          .from('users')
          .delete()
          .in('id', usersToDelete)
          .eq('is_ephemeral_demo', true) // Extra säkerhet
          .select('id');

        if (userDeleteError) {
          result.errors.push(`Kunde inte ta bort demo-användare: ${userDeleteError.message}`);
        } else {
          result.deleted.users = deletedUsers?.length ?? 0;
        }
      }
    }

    result.success = result.errors.length === 0;

    console.log('[cleanup-demo-data] Resultat:', JSON.stringify(result, null, 2));

    return new Response(
      JSON.stringify(result),
      { 
        status: result.success ? 200 : 207, // 207 Multi-Status om delvis framgång
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Okänt fel';
    result.errors.push(`Oväntat fel: ${errorMessage}`);
    
    console.error('[cleanup-demo-data] Fel:', error);

    return new Response(
      JSON.stringify(result),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
