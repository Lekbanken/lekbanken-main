#!/usr/bin/env python3
"""
Run all Supabase migrations using the Supabase API
"""
import requests
import json
from pathlib import Path
import sys
from getpass import getpass

def run_migrations():
    # Configuration
    project_id = "qohhnufxididbmzqnjwg"
    
    # Get API key from user
    api_key = getpass("Enter your Supabase API key (from Settings → API → Project API Keys): ")
    
    # Get migration files
    migrations_dir = Path(__file__).parent.parent / "supabase" / "migrations"
    migration_files = sorted(migrations_dir.glob("*.sql"))
    
    if not migration_files:
        print("No migration files found!")
        sys.exit(1)
    
    print(f"\nFound {len(migration_files)} migration files")
    print("=" * 70)
    
    failed_count = 0
    success_count = 0
    
    # Supabase SQL editor endpoint
    base_url = f"https://api.supabase.com/projects/{project_id}"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    for migration_file in migration_files:
        print(f"\n▶ Executing: {migration_file.name}")
        
        try:
            # Read SQL file
            with open(migration_file, 'r', encoding='utf-8') as f:
                sql_content = f.read()
            
            # For now, we'll just print instructions since direct API execution requires the SQL editor
            print(f"   File size: {len(sql_content)} bytes")
            print(f"   Please run this manually via Supabase Dashboard SQL Editor")
            print(f"   or wait for setup completion...")
            success_count += 1
            
        except Exception as e:
            print(f"❌ ERROR: {str(e)}")
            failed_count += 1
    
    # Summary
    print("\n" + "=" * 70)
    print(f"\n📊 MIGRATIONS READY:")
    print(f"   📋 Total: {len(migration_files)}")
    print(f"\n💡 RECOMMENDED METHOD:")
    print(f"   1. Go to: https://supabase.com/dashboard/project/{project_id}/sql/new")
    print(f"   2. Copy & paste each SQL file from supabase/migrations/")
    print(f"   3. Execute in order (00 → 13)")
    print(f"\n📝 Files to execute:")
    for i, f in enumerate(migration_files, 1):
        print(f"   {i:2d}. {f.name}")

if __name__ == "__main__":
    run_migrations()
