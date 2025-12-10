# Task 9: Live Progress Tracking

Real-time game progress synchronization, achievement unlocking, and live statistics dashboard for participant sessions.

## Features

### 1. Game Progress Tracking
Track participant progress in real-time with granular metrics:
- Game status (not_started, in_progress, completed, failed)
- Score tracking with optional max score
- Progress percentage (0-100%)
- Time spent tracking
- Current level and checkpoint
- Flexible game-specific data storage (JSONB)

### 2. Achievement System
Unlock and track achievements during sessions:
- Unique unlock per participant per achievement
- Points and rarity tracking
- Context metadata (how achievement was unlocked)
- Automatic broadcast to all session participants
- Integration with game progress

### 3. Live Statistics Dashboard
Real-time host dashboard showing:
- Total session score
- Total achievements unlocked
- Games completed/in progress count
- Individual participant progress with progress bars
- Recent achievement unlocks with timestamps
- Auto-updates via Supabase Realtime

## Database Schema

### Tables Created
1. **participant_game_progress** - Tracks individual game sessions
2. **participant_achievement_unlocks** - Records achievement unlocks
3. **session_statistics** - Aggregated session stats (for future use)

### Indexes
- Optimized queries by session_id, participant_id, game_id
- Fast lookups for achievement unlocks
- Tenant isolation support

### RLS Policies
- Hosts can view all progress/unlocks in their sessions
- System admin can manage all data
- Service role client used for API endpoints

## API Endpoints

### POST /api/participants/progress/update
Update or create game progress for a participant.

**Request:**
```json
{
  "participant_token": "uuid",
  "game_id": "uuid",
  "status": "in_progress",
  "score": 100,
  "progress_percentage": 45.5,
  "time_spent_seconds": 300,
  "current_level": 3,
  "game_data": { "custom": "data" }
}
```

**Response:**
```json
{
  "success": true,
  "progress": { ... },
  "message": "Progress updated successfully"
}
```

**Broadcast Event:** `progress_updated`

### POST /api/participants/progress/unlock-achievement
Record achievement unlock for a participant.

**Request:**
```json
{
  "participant_token": "uuid",
  "achievement_id": "uuid",
  "game_id": "uuid",  // optional
  "unlock_context": { "trigger": "score_milestone", "value": 1000 }
}
```

**Response:**
```json
{
  "success": true,
  "unlock": { ... },
  "achievement": {
    "id": "uuid",
    "name": "First Victory",
    "points": 100,
    "rarity": "rare"
  }
}
```

**Broadcast Event:** `achievement_unlocked`

**Error Cases:**
- 401: Invalid participant token
- 403: Participant blocked/kicked
- 404: Achievement/game not found
- 409: Achievement already unlocked (not treated as error)

## React Hooks

### useParticipantProgress
Manages game progress updates with convenience functions.

```typescript
import { useParticipantProgress } from '@/features/participants/hooks/useParticipantProgress';

const { 
  loading, 
  error,
  updateProgress,
  startGame,
  updateScore,
  updateProgressPercentage,
  completeGame,
  failGame
} = useParticipantProgress({
  participantToken: 'uuid',
  onSuccess: (progress) => console.log('Updated:', progress),
  onError: (error) => console.error('Error:', error),
});

// Examples
await startGame('game-uuid'); // Sets status to in_progress, 0% progress
await updateScore('game-uuid', 150, 200); // Updates score (current/max)
await updateProgressPercentage('game-uuid', 75); // Sets progress to 75%
await completeGame('game-uuid', 200, 450); // Marks complete with final score & time
await failGame('game-uuid'); // Marks as failed
```

### useAchievementUnlock
Handles achievement unlocking for participants.

```typescript
import { useAchievementUnlock } from '@/features/participants/hooks/useAchievementUnlock';

const { 
  loading, 
  error,
  unlockAchievement 
} = useAchievementUnlock({
  participantToken: 'uuid',
  onSuccess: (achievement) => console.log('Unlocked:', achievement),
  onError: (error) => console.error('Error:', error),
});

// Example
await unlockAchievement({
  achievement_id: 'achievement-uuid',
  game_id: 'game-uuid',
  unlock_context: {
    trigger: 'level_complete',
    level: 10,
    time_taken: 120
  }
});
```

## Components

### LiveProgressDashboard
Real-time progress and achievement tracking for hosts.

```tsx
import { LiveProgressDashboard } from '@/features/participants/components/LiveProgressDashboard';

<LiveProgressDashboard sessionId="session-uuid" />
```

**Features:**
- 4 stat cards: Total Score, Achievements, Completed Games, Active Games
- Participant progress list with progress bars
- Recent achievement unlocks feed
- Real-time updates via broadcast events
- Auto-refreshes on progress_updated and achievement_unlocked events

**Display:**
- Participants sorted by score (descending)
- Progress percentage as visual bar
- Achievement count per participant
- Recent unlocks limited to 10 (most recent first)

## Integration

### Host Dashboard
The LiveProgressDashboard is automatically integrated into the host dashboard at `/participants/host/[sessionId]`:

```tsx
<LiveProgressDashboard sessionId={session.id} />
```

Located between Session Control Panel and Participant List for optimal workflow.

### Participant View
Achievement unlock notifications appear in the broadcast message feed:
```
🏆 Utmärkelse upplåst: First Victory!
```

Progress updates are broadcast but not shown as messages (too noisy).

## Broadcast Events

### New Event Types
- **progress_updated** - When participant updates game progress
- **achievement_unlocked** - When participant unlocks achievement

### Event Payloads

**progress_updated:**
```json
{
  "participant_id": "uuid",
  "game_id": "uuid",
  "status": "in_progress",
  "score": 100,
  "progress_percentage": 45.5,
  "timestamp": "ISO-8601"
}
```

**achievement_unlocked:**
```json
{
  "participant_id": "uuid",
  "achievement_id": "uuid",
  "achievement_name": "First Victory",
  "points": 100,
  "rarity": "rare",
  "timestamp": "ISO-8601"
}
```

## Usage Example: Game Integration

```typescript
// In a game component
import { useParticipantProgress } from '@/features/participants/hooks/useParticipantProgress';
import { useAchievementUnlock } from '@/features/participants/hooks/useAchievementUnlock';

function GameComponent() {
  const participantToken = localStorage.getItem('participant_token');
  
  const progress = useParticipantProgress({
    participantToken,
    onSuccess: () => console.log('Progress saved'),
  });
  
  const achievements = useAchievementUnlock({
    participantToken,
    onSuccess: (ach) => showNotification(`Unlocked: ${ach.name}!`),
  });
  
  // Start game
  useEffect(() => {
    progress.startGame(gameId);
  }, []);
  
  // Update score
  const handleScoreChange = (newScore: number) => {
    progress.updateScore(gameId, newScore, maxScore);
    
    // Check achievement trigger
    if (newScore >= 1000) {
      achievements.unlockAchievement({
        achievement_id: 'score-master-achievement-id',
        game_id: gameId,
        unlock_context: { score: newScore }
      });
    }
  };
  
  // Complete game
  const handleGameComplete = (finalScore: number, timeSpent: number) => {
    progress.completeGame(gameId, finalScore, timeSpent);
  };
  
  return (
    <div>
      {/* Game UI */}
    </div>
  );
}
```

## Performance Considerations

- **Debounce progress updates** - Don't update on every frame/tick
- **Batch score updates** - Update score at milestones, not continuously
- **Check before unlocking** - Achievement unlock returns null if already unlocked
- **RLS bypass** - Service role client used for write operations (no auth overhead)
- **Indexed queries** - Fast lookups by session/participant/game
- **Limited broadcast payload** - Only essential data in real-time events

## Future Enhancements (Not in Task 9)

- Session statistics calculation job
- Leaderboards across multiple sessions
- Progress export (CSV)
- Historical progress charts
- Achievement rarity calculation
- Participant comparison views

## Migration

Migration file: `20241211_participants_live_progress.sql`

Run migration:
```bash
npx supabase db push --include-all
```

Regenerate types:
```bash
npx supabase gen types typescript --linked > types/supabase.ts
```

## Testing

1. Create a session via `/participants/create`
2. Join as participant via `/participants/join?code=XXXXXX`
3. From another window, view host dashboard `/participants/host/[sessionId]`
4. Call progress/achievement APIs from participant view
5. Observe real-time updates in host dashboard

## Files Created

### Database
- `supabase/migrations/20241211_participants_live_progress.sql`

### API Routes
- `app/api/participants/progress/update/route.ts`
- `app/api/participants/progress/unlock-achievement/route.ts`

### Hooks
- `features/participants/hooks/useParticipantProgress.ts`
- `features/participants/hooks/useAchievementUnlock.ts`

### Components
- `features/participants/components/LiveProgressDashboard.tsx`

### Updates
- `features/participants/hooks/useParticipantBroadcast.ts` - Added event types
- `app/participants/view/page.tsx` - Added achievement notification
- `app/participants/host/[sessionId]/page.tsx` - Integrated LiveProgressDashboard

## Lines Added: ~800
