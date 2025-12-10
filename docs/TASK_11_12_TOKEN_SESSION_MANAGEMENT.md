# Task 11 & 12: Token Management and Session Archiving

Implementation of token expiry management and session cleanup/archiving system.

## Task 11: Token Expiry Management (6h)

### Overview
Complete token lifecycle management with expiry, extension, revocation, and cleanup.

### Components

#### 1. Token Cleanup API
**Endpoint:** `POST /api/participants/tokens/cleanup`

Background job for automatic token and session maintenance:
- Finds participants with expired tokens (token_expires_at < now, status: active/idle)
- Disconnects expired participants
- Logs token_expired events
- Auto-archives old sessions (ended/cancelled >90 days)
- Returns cleanup statistics

**Response:**
```json
{
  "disconnected_participants": 5,
  "archived_sessions": 2,
  "cleaned_at": "2024-12-11T10:00:00Z"
}
```

**Usage:**
```bash
# Schedule with Vercel Cron (vercel.json)
{
  "crons": [{
    "path": "/api/participants/tokens/cleanup",
    "schedule": "0 * * * *"  # Every hour
  }]
}

# Or Edge Function scheduled task
```

#### 2. Token Extension API
**Endpoint:** `POST /api/participants/tokens/extend`

Allows extending token expiry for active participants:
- Default extension: 24 hours
- Maximum extension: 168 hours (7 days)
- Validates participant status (no extend for blocked/kicked)
- Logs extension events

**Request:**
```json
{
  "participant_token": "abc123...",
  "extension_hours": 48
}
```

**Response:**
```json
{
  "success": true,
  "new_expiry": "2024-12-13T10:00:00Z",
  "message": "Token extended by 48 hours"
}
```

#### 3. Token Revocation API
**Endpoint:** `POST /api/participants/tokens/revoke`

Immediately revokes a token (sets expiry to now):
- Can revoke by participant_token or participant_id
- Sets status to 'disconnected'
- Logs revocation event with reason
- Useful for manual disconnection

**Request:**
```json
{
  "participant_token": "abc123...",
  "reason": "Manual disconnect by host"
}
```

**Response:**
```json
{
  "success": true,
  "revoked_at": "2024-12-11T10:00:00Z",
  "message": "Token revoked successfully"
}
```

#### 4. React Hook - useTokenManagement
**File:** `features/gamification/hooks/useTokenManagement.ts`

**Methods:**
- `extendToken({ participant_token, extension_hours })` - Extend token expiry
- `revokeToken({ participant_token, reason })` - Revoke token immediately
- `isExtending` - Loading state for extend operation
- `isRevoking` - Loading state for revoke operation

**Example:**
```tsx
const { extendToken, revokeToken, isExtending } = useTokenManagement();

// Extend token by 24 hours
await extendToken({
  participant_token: token,
  extension_hours: 24,
});

// Revoke token
await revokeToken({
  participant_token: token,
  reason: 'Participant requested disconnect',
});
```

### Database Schema
Uses existing tables:
- `participants.token_expires_at` - Timestamp for expiry check
- `participant_activity_log` - Logs token_extended, token_expired, token_revoked events
- `participant_token_quotas` - (Future) Quota enforcement

### Activity Events
- `token_extended` - Token expiry extended
- `token_expired` - Token automatically expired
- `token_revoked` - Token manually revoked

---

## Task 12: Session Cleanup & Archiving (6h)

### Overview
Complete session lifecycle management with archiving, restore, and permanent deletion.

### Components

#### 1. Session Archive API
**Endpoint:** `POST /api/participants/sessions/[sessionId]/archive`

Manually archive ended or cancelled sessions:
- Only ended/cancelled sessions can be archived
- Sets status to 'archived', sets archived_at timestamp
- Logs session_archived event
- Useful for decluttering active session list

**Response:**
```json
{
  "success": true,
  "archived_at": "2024-12-11T10:00:00Z",
  "message": "Session archived successfully"
}
```

#### 2. Session Restore API
**Endpoint:** `POST /api/participants/sessions/[sessionId]/restore`

Restore archived session back to original status:
- Only archived sessions can be restored
- Restores to 'ended' or 'cancelled' based on ended_at
- Clears archived_at timestamp
- Logs session_restored event

**Response:**
```json
{
  "success": true,
  "restored_status": "ended",
  "message": "Session restored successfully"
}
```

#### 3. Session Delete API
**Endpoint:** `DELETE /api/participants/sessions/[sessionId]`

Permanently delete archived session:
- Only archived sessions can be deleted
- Requires minimum archive period (default: 7 days)
- Deletes session, participants, game_progress, achievements
- Preserves activity logs for audit trail
- **WARNING: Cannot be undone!**

**Response:**
```json
{
  "success": true,
  "deleted_at": "2024-12-11T10:00:00Z",
  "message": "Session permanently deleted",
  "note": "Activity logs have been preserved for audit trail"
}
```

**Error if too recent:**
```json
{
  "error": "Session must be archived for at least 7 days before permanent deletion",
  "days_remaining": 3
}
```

#### 4. Automatic Archiving
**Included in:** Token Cleanup API

Sessions are automatically archived when:
- Status is 'ended' or 'cancelled'
- ended_at is more than 90 days ago
- Status is not already 'archived'

This happens during scheduled cleanup runs.

#### 5. React Hook - useSessionManagement
**File:** `features/gamification/hooks/useSessionManagement.ts`

**Methods:**
- `archiveSession(sessionId)` - Manually archive session
- `restoreSession(sessionId)` - Restore archived session
- `deleteSession(sessionId)` - Permanently delete archived session
- `isArchiving` - Loading state
- `isRestoring` - Loading state
- `isDeleting` - Loading state

**Example:**
```tsx
const { archiveSession, restoreSession, deleteSession } = useSessionManagement();

// Archive session
await archiveSession(sessionId);

// Restore session
await restoreSession(sessionId);

// Permanently delete (with user confirmation)
if (confirm('Are you sure? This cannot be undone!')) {
  await deleteSession(sessionId);
}
```

#### 6. SessionActions Component
**File:** `features/participants/components/SessionActions.tsx`

UI component with action buttons for session management:
- Shows archive button for ended/cancelled sessions
- Shows restore button for archived sessions
- Shows delete button for archived sessions (with confirmation)
- Displays loading states and error messages
- Auto-refreshes after actions

**Props:**
```tsx
interface SessionActionsProps {
  sessionId: string;
  sessionCode: string;
  status: string;
  onActionComplete?: () => void;
}
```

**Integration:**
```tsx
<SessionActions
  sessionId={session.id}
  sessionCode={session.session_code}
  status={session.status}
  onActionComplete={() => router.refresh()}
/>
```

### Database Schema
Uses existing tables:
- `participant_sessions.status` - 'archived' status
- `participant_sessions.archived_at` - Timestamp when archived
- `participant_activity_log` - Logs session_archived, session_restored, session_deleted events

### Activity Events
- `session_archived` - Session manually or automatically archived
- `session_restored` - Archived session restored
- `session_deleted` - Session permanently deleted (final log before deletion)

### Configuration
**Archival Thresholds:**
- Auto-archive: 90 days after ended_at (hardcoded in cleanup API)
- Delete minimum: 7 days after archived_at (hardcoded in delete API)

**To make configurable:**
```typescript
// Environment variables
ARCHIVE_THRESHOLD_DAYS=90
DELETE_MIN_ARCHIVE_DAYS=7

// Or tenant settings in database
```

---

## Implementation Notes

### Security
- All APIs use service role client (system-level operations)
- Bypass RLS for cleanup jobs (no user context)
- Activity logging for complete audit trail
- Delete confirmation required in UI

### Error Handling
- Validates session status before operations
- Checks minimum archive period before delete
- Preserves activity logs even after deletion
- Graceful error messages in UI

### Performance
- Batch queries for efficiency (Map-based lookups)
- Avoids N+1 query problems
- Indexes on session_id, tenant_id, status, ended_at, archived_at

### Data Retention
- Activity logs preserved permanently (audit trail)
- Game progress and achievements deleted with session
- Participants deleted with session
- Tokens become invalid when participants deleted

### Scheduling
Cleanup job should run periodically:

**Option 1: Vercel Cron (vercel.json)**
```json
{
  "crons": [{
    "path": "/api/participants/tokens/cleanup",
    "schedule": "0 * * * *"
  }]
}
```

**Option 2: Supabase Edge Function (deno deploy.yml)**
```typescript
// supabase/functions/cleanup/index.ts
Deno.cron("cleanup", "0 * * * *", async () => {
  const response = await fetch('https://your-domain.com/api/participants/tokens/cleanup', {
    method: 'POST',
  });
});
```

**Option 3: GitHub Actions**
```yaml
name: Cleanup
on:
  schedule:
    - cron: '0 * * * *'
jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - run: curl -X POST https://your-domain.com/api/participants/tokens/cleanup
```

---

## Testing

### Manual Testing
1. **Token Expiry:**
   - Create participant with short expiry (1 minute)
   - Wait for expiry
   - Run cleanup API
   - Verify participant disconnected
   - Check activity log for token_expired event

2. **Token Extension:**
   - Create participant
   - Call extend API
   - Verify new expiry time
   - Check activity log

3. **Token Revocation:**
   - Create participant
   - Call revoke API
   - Verify token_expires_at set to now
   - Verify status = disconnected

4. **Session Archive:**
   - End a session
   - Archive session via UI
   - Verify status = archived
   - Verify archived_at timestamp

5. **Session Restore:**
   - Archive a session
   - Restore via UI
   - Verify status back to ended/cancelled
   - Verify archived_at cleared

6. **Session Delete:**
   - Archive session
   - Wait 7+ days (or modify code for testing)
   - Delete via UI with confirmation
   - Verify session and related data deleted
   - Verify activity logs preserved

### Automated Tests
```typescript
// Token expiry test
test('expired tokens are cleaned up', async () => {
  // Create participant with expired token
  const participant = await createParticipant({
    token_expires_at: new Date(Date.now() - 1000),
  });

  // Run cleanup
  const response = await fetch('/api/participants/tokens/cleanup', {
    method: 'POST',
  });

  const result = await response.json();
  expect(result.disconnected_participants).toBeGreaterThan(0);

  // Verify participant disconnected
  const updated = await getParticipant(participant.id);
  expect(updated.status).toBe('disconnected');
});

// Archive/restore/delete flow test
test('session archive lifecycle', async () => {
  const session = await createSession({ status: 'ended' });

  // Archive
  await archiveSession(session.id);
  let updated = await getSession(session.id);
  expect(updated.status).toBe('archived');

  // Restore
  await restoreSession(session.id);
  updated = await getSession(session.id);
  expect(updated.status).toBe('ended');

  // Archive again
  await archiveSession(session.id);
  
  // Delete (bypass time check for testing)
  await deleteSession(session.id);
  const deleted = await getSession(session.id);
  expect(deleted).toBeNull();
});
```

---

## UI Integration

### Analytics Page
Session management actions shown on analytics detail page:
- Archive button for ended/cancelled sessions
- Restore button for archived sessions
- Delete button for archived sessions (with confirmation dialog)

### History Page
Filter by archived status:
- "Archived" filter shows only archived sessions
- Status badges show archived state clearly
- Click to view analytics with management actions

---

## Future Enhancements

1. **Quota Enforcement:**
   - Check participant_token_quotas before extending
   - Limit total extensions per session
   - Daily/weekly quota limits

2. **Configurable Thresholds:**
   - Environment variables for archive/delete periods
   - Tenant-specific retention policies
   - Per-game retention rules

3. **Bulk Operations:**
   - Archive all ended sessions older than X days
   - Delete all archived sessions older than Y days
   - Batch token extensions for all participants

4. **Analytics:**
   - Token extension usage stats
   - Session archival trends
   - Cleanup job execution history

5. **Notifications:**
   - Email host before auto-archival
   - Warning before permanent deletion
   - Token expiry reminders for participants

---

## Completion Checklist

### Task 11: Token Expiry Management
- ✅ Token cleanup API endpoint
- ✅ Token extension API endpoint
- ✅ Token revocation API endpoint
- ✅ useTokenManagement React hook
- ✅ Activity logging (extended, expired, revoked events)
- ✅ Auto-disconnect expired participants
- ⏳ Quota enforcement system (future)
- ⏳ Scheduled cleanup job setup (deployment)

### Task 12: Session Cleanup & Archiving
- ✅ Session archive API endpoint
- ✅ Session restore API endpoint
- ✅ Session delete API endpoint
- ✅ useSessionManagement React hook
- ✅ SessionActions component
- ✅ Auto-archive old sessions (in cleanup API)
- ✅ Activity logging (archived, restored, deleted events)
- ✅ Integration with analytics page
- ⏳ Configurable retention policies (future)

---

## Summary

Tasks 11 and 12 complete the Participants Domain with robust token and session lifecycle management:

**Token Management:**
- Automatic expiry and cleanup
- Manual extension and revocation
- Full audit trail
- Ready for quota system

**Session Management:**
- Manual and automatic archiving
- Restore capability
- Permanent deletion with safeguards
- Activity logs preserved for compliance

**Next Steps:**
1. Deploy cleanup job scheduling (Vercel Cron recommended)
2. Test in production with real sessions
3. Monitor cleanup job execution
4. Implement quota system (Task 11 enhancement)
5. Add configurable retention policies (Task 12 enhancement)

**Total Implementation:** 12 hours (6h each task)
**Participants Domain:** 100% Complete (12/12 tasks) 🎉
