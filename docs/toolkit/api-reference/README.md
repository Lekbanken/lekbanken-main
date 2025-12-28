# API Reference

This document describes the public API for the Legendary Escape Room Toolkit.

## Base URL

```
https://your-domain.com/api/public/v1
```

## Authentication

All API requests require a `tenant_id` query parameter:

```
GET /api/public/v1/games?tenant_id=your-tenant-id
```

Future versions will support API key authentication.

---

## Response Format

All responses follow a consistent format:

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 100,
    "total_pages": 5
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found",
    "details": { ... }
  }
}
```

---

## Games

### List Games

```
GET /api/public/v1/games
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| tenant_id | string | Yes | Tenant identifier |
| page | number | No | Page number (default: 1) |
| per_page | number | No | Items per page (default: 20, max: 100) |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Mystery Manor",
      "description": "A thrilling escape room...",
      "duration_minutes": 60,
      "min_participants": 2,
      "max_participants": 8,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-15T00:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 5,
    "total_pages": 1
  }
}
```

### Get Game

```
GET /api/public/v1/games/{id}
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| tenant_id | string | Yes | Tenant identifier |
| include_stats | boolean | No | Include session statistics |

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Mystery Manor",
    "description": "A thrilling escape room...",
    "duration_minutes": 60,
    "min_participants": 2,
    "max_participants": 8,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-15T00:00:00Z",
    "stats": {
      "total_sessions": 150,
      "active_sessions": 3,
      "completed_sessions": 145,
      "avg_duration_minutes": 52
    }
  }
}
```

---

## Sessions

### List Sessions

```
GET /api/public/v1/sessions
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| tenant_id | string | Yes | Tenant identifier |
| page | number | No | Page number (default: 1) |
| per_page | number | No | Items per page (default: 20, max: 100) |
| game_id | string | No | Filter by game |
| status | string | No | Filter by status: pending, active, ended |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "game_id": "uuid",
      "game_name": "Mystery Manor",
      "status": "active",
      "created_at": "2024-01-15T10:00:00Z",
      "started_at": "2024-01-15T10:05:00Z",
      "ended_at": null,
      "participant_count": 4
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 50,
    "total_pages": 3
  }
}
```

### Get Session

```
GET /api/public/v1/sessions/{id}
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| tenant_id | string | Yes | Tenant identifier |
| include_participants | boolean | No | Include participant list |
| include_events | boolean | No | Include timeline events |

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "game_id": "uuid",
    "game_name": "Mystery Manor",
    "status": "active",
    "created_at": "2024-01-15T10:00:00Z",
    "started_at": "2024-01-15T10:05:00Z",
    "ended_at": null,
    "participant_count": 4,
    "duration_seconds": null,
    "participants": [
      {
        "id": "uuid",
        "display_name": "Alice",
        "joined_at": "2024-01-15T10:03:00Z"
      }
    ],
    "events": []
  }
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| MISSING_TENANT | 400 | tenant_id parameter missing |
| NOT_FOUND | 404 | Resource not found |
| UNAUTHORIZED | 401 | Invalid or missing auth |
| FORBIDDEN | 403 | Access denied |
| DB_ERROR | 500 | Database error |
| RATE_LIMITED | 429 | Too many requests |

---

## Rate Limits

| Tier | Requests/minute |
|------|-----------------|
| Free | 60 |
| Starter | 120 |
| Pro | 300 |
| Enterprise | 600 |
| Unlimited | No limit |

Rate limit headers:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1705312800
```

---

## Webhooks

### Event Types

| Event | Description |
|-------|-------------|
| session.created | New session created |
| session.started | Session began |
| session.ended | Session completed |
| participant.joined | Participant joined |
| participant.left | Participant disconnected |
| trigger.fired | Trigger executed |
| decision.created | Voting started |
| decision.closed | Voting ended |
| artifact.revealed | Artifact shown |
| phase.changed | Phase advanced |
| step.advanced | Step changed |

### Webhook Payload

```json
{
  "id": "evt_abc123",
  "event": "session.started",
  "timestamp": "2024-01-15T10:05:00Z",
  "tenant_id": "tenant_xyz",
  "data": {
    "session_id": "uuid",
    "game_id": "uuid",
    "game_name": "Mystery Manor",
    "status": "active",
    "participant_count": 4
  }
}
```

### Webhook Headers

```
Content-Type: application/json
X-Webhook-Signature: sha256=abc123...
X-Webhook-Event: session.started
X-Webhook-Id: evt_abc123
X-Webhook-Timestamp: 2024-01-15T10:05:00Z
```

### Verifying Signatures

```typescript
import crypto from 'crypto';

function verifyWebhook(payload: string, signature: string, secret: string): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return signature === expected;
}
```

---

## SDKs

Coming soon:

- JavaScript/TypeScript SDK
- Python SDK
- REST client examples

---

## Changelog

### v1.0.0 (2024-01-15)

- Initial public API release
- Games and sessions endpoints
- Webhook support
