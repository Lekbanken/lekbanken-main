# Lekbanken Partitioned Inventory System

## Metadata

- Owner: -
- Status: active
- Date: 2026-01-27
- Last updated: 2026-03-21
- Last validated: -

> Intern verktygsreferens för inventory-systemet. Detta är inte en domänkälla för produktbeteende.

## Overview

This directory contains a **partitioned inventory system** that replaces the monolithic `inventory.json`. 
The new structure allows for **incremental updates** - you can update only the domain you've been working on.

## Structure

```
.inventory/
├── README.md           # This file
├── manifest.json       # Master index with versions, timestamps per partition
├── domains/
│   ├── marketing.json  # Routes, components for marketing domain
│   ├── app.json        # App domain (authenticated user pages)
│   ├── admin.json      # Admin dashboard and APIs
│   ├── sandbox.json    # Sandbox/playground code
│   ├── demo.json       # Demo domain
│   └── shared.json     # Shared components, hooks, services
├── database/
│   ├── tables.json     # DB tables with usage, RLS info
│   ├── policies.json   # RLS policies (largest partition)
│   ├── triggers.json   # DB triggers
│   └── functions.json  # DB functions (RPC)
├── edges/
│   ├── routes.json     # Route → layout, component edges
│   └── db-usage.json   # Code → DB edges (.from/.rpc)
└── findings.json       # Security gaps, orphans, etc.
```

## Benefits

1. **Faster partial updates**: Update only the domain you changed
2. **Better diffing**: Smaller files make git diffs readable
3. **Parallel generation**: Partitions can be generated independently
4. **Reduced conflicts**: Less merge conflicts in team workflows
5. **Caching**: Atlas can cache unchanged partitions

## Usage

### Full inventory rebuild
```powershell
npm run inventory:generate
```

### Update specific domain
```powershell
npm run inventory:update -- --domain=app
npm run inventory:update -- --domain=db
npm run inventory:update -- --domain=admin
```

### Quick database-only update
```powershell
npm run inventory:db
```

### Validate inventory
```powershell
npm run inventory:validate
```

## Partition Update Guidelines

| Changed Area | Partitions to Update |
|--------------|---------------------|
| `app/(marketing)/**` | `domains/marketing.json` |
| `app/admin/**` | `domains/admin.json` |
| `app/app/**` | `domains/app.json` |
| `app/sandbox/**` | `domains/sandbox.json` |
| `components/**` | `domains/shared.json` |
| `supabase/migrations/**` | `database/*.json` |
| `lib/services/**` | `domains/shared.json`, `edges/db-usage.json` |

## Manifest Format

```json
{
  "version": "2.0.0",
  "generatedAt": "2026-01-27T12:00:00Z",
  "partitions": {
    "domains/marketing": { "updatedAt": "...", "nodeCount": 11 },
    "domains/app": { "updatedAt": "...", "nodeCount": 62 },
    ...
  },
  "totals": {
    "nodeCount": 1648,
    "edgeCount": 1033,
    "findingCount": 4
  }
}
```

## Migration from inventory.json

The legacy `inventory.json` is still supported for backwards compatibility.
Atlas will preferentially load from `.inventory/manifest.json` if present.
