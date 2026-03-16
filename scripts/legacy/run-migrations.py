#!/usr/bin/env python3
"""
Supabase Migration Executor via psql
Executes all migration files against your Supabase database

Usage:
    python scripts/run-migrations.py --db-url "postgresql://user:pass@host:5432/postgres"

Or set environment variable:
    $env:DATABASE_URL="postgresql://user:pass@host:5432/postgres"
    python scripts/run-migrations.py
"""

import os
import sys
import subprocess
import argparse
from pathlib import Path

def get_connection_string():
    """Get Supabase connection string from environment or user input"""
    # Try environment variable first
    db_url = os.getenv('DATABASE_URL')
    if db_url:
        return db_url
    
    print("❌ Database URL not found")
    print("\n📋 To get your connection string:")
    print("1. Go to: https://supabase.com/dashboard → your project → Settings → Database")
    print("2. Copy the connection string (use Session mode for migrations)")
    print("3. Set environment variable or pass as argument\n")
    
    url = input("Enter your Supabase connection string: ").strip()
    if not url:
        sys.exit(1)
    return url

def run_migrations(db_url):
    """Execute all migration files"""
    migrations_dir = Path(__file__).parent.parent / "supabase" / "migrations"
    
    if not migrations_dir.exists():
        print(f"❌ Migrations directory not found: {migrations_dir}")
        sys.exit(1)
    
    # Get all SQL files sorted
    migration_files = sorted([f for f in migrations_dir.glob("*.sql")])
    
    if not migration_files:
        print("❌ No migration files found")
        sys.exit(1)
    
    print(f"🔄 Supabase Migration Executor")
    print(f"📍 Database: {db_url.split('@')[1] if '@' in db_url else 'unknown'}")
    print(f"📄 Found {len(migration_files)} migration files\n")
    
    # List migrations
    print("📋 Migration files to execute:")
    for i, f in enumerate(migration_files, 1):
        print(f"   {i}. {f.name}")
    print()
    
    # Execute each migration
    failed = []
    for i, migration_file in enumerate(migration_files, 1):
        print(f"⏳ [{i}/{len(migration_files)}] Executing: {migration_file.name}")
        
        try:
            # Use psql to execute the migration
            result = subprocess.run(
                ['psql', db_url, '-f', str(migration_file)],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                print(f"   ✅ Success")
            else:
                print(f"   ❌ Error:")
                print(f"   {result.stderr}")
                failed.append((migration_file.name, result.stderr))
        
        except FileNotFoundError:
            print(f"   ⚠️  psql not found. Install PostgreSQL client tools.")
            print(f"      https://www.postgresql.org/download/windows/")
            sys.exit(1)
        except subprocess.TimeoutExpired:
            print(f"   ❌ Timeout (30s)")
            failed.append((migration_file.name, "Timeout"))
        except Exception as e:
            print(f"   ❌ Error: {e}")
            failed.append((migration_file.name, str(e)))
        
        print()
    
    # Summary
    print("\n" + "="*60)
    print(f"✅ Executed {len(migration_files) - len(failed)}/{len(migration_files)} migrations")
    
    if failed:
        print(f"❌ Failed: {len(failed)}")
        for name, error in failed:
            print(f"   - {name}: {error[:100]}")
        sys.exit(1)
    else:
        print("🎉 All migrations executed successfully!")
        print("\n📝 Next steps:")
        print("1. Verify tables in Supabase Dashboard → Table Editor")
        print("2. Regenerate types: npm run db:types:remote (or scripts/regenerate-types.ps1)")
        print("3. Run: npm run type-check")

def main():
    parser = argparse.ArgumentParser(description="Execute Supabase migrations")
    parser.add_argument(
        '--db-url',
        help='Database connection string (or set DATABASE_URL env var)'
    )
    args = parser.parse_args()
    
    db_url = args.db_url or get_connection_string()
    
    if not db_url:
        print("❌ No database URL provided")
        sys.exit(1)
    
    run_migrations(db_url)

if __name__ == '__main__':
    main()
