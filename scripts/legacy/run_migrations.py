#!/usr/bin/env python3
"""
Run all Supabase migrations in order
Uses psql directly with subprocess
"""

import os
import subprocess
import sys
from pathlib import Path
from getpass import getpass
import re


def _resolve_project_ref() -> str | None:
    project_ref = os.getenv("SUPABASE_PROJECT_REF") or os.getenv("SUPABASE_PROJECT_ID")
    if project_ref:
        return project_ref.strip()

    config_path = Path(__file__).parent.parent / ".supabase" / "config.toml"
    if config_path.exists():
        content = config_path.read_text(encoding="utf-8")
        match = re.search(r'^\\s*project_id\\s*=\\s*"([^"]+)"', content, re.MULTILINE)
        if match:
            return match.group(1).strip()

    return None

def run_migrations():
    # Supabase connection details
    project_ref = _resolve_project_ref()
    host = os.getenv("SUPABASE_DB_HOST")
    if not host:
        if not project_ref:
            project_ref = input("Enter Supabase project ref (e.g. abcdefghijklmnop): ").strip() or None
        if not project_ref:
            print("❌ Missing project ref. Set SUPABASE_PROJECT_REF or link via: supabase link --project-ref YOUR_PROJECT_REF")
            return False
        host = f"db.{project_ref}.supabase.co"
    port = "5432"
    database = "postgres"
    user = "postgres"
    
    # Get password
    password = getpass("Enter PostgreSQL password: ")
    
    # Get migration files
    migrations_dir = Path("supabase/migrations")
    migration_files = sorted(migrations_dir.glob("*.sql"))
    
    if not migration_files:
        print("❌ No migration files found in supabase/migrations/")
        return False
    
    print(f"\n📋 Found {len(migration_files)} migrations")
    print("=" * 60)
    
    # Execute each migration
    for i, migration_file in enumerate(migration_files, 1):
        print(f"\n[{i}/{len(migration_files)}] Executing: {migration_file.name}")
        print("-" * 60)
        
        try:
            # Build psql command
            env = os.environ.copy()
            env["PGPASSWORD"] = password
            
            result = subprocess.run(
                [
                    "psql",
                    "-h", host,
                    "-p", port,
                    "-U", user,
                    "-d", database,
                    "-f", str(migration_file)
                ],
                env=env,
                capture_output=True,
                text=True,
                timeout=300
            )
            
            if result.returncode == 0:
                print(f"✅ Success")
                if result.stdout.strip():
                    print(result.stdout)
            else:
                print(f"❌ Failed")
                print(result.stderr)
                print(f"\n⚠️ Stopping at migration {i}. Fix the error and retry.")
                return False
                
        except subprocess.TimeoutExpired:
            print(f"❌ Timeout (5 minutes) - migration took too long")
            return False
        except Exception as e:
            print(f"❌ Error: {e}")
            return False
    
    print("\n" + "=" * 60)
    print("🎉 All migrations executed successfully!")
    print("\n📝 Next steps:")
    print("   1. Verify tables in Supabase Dashboard → Table Editor")
    print("   2. Check that 60+ tables were created")
    print("   3. Ready for testing and deployment!")
    return True

if __name__ == "__main__":
    success = run_migrations()
    sys.exit(0 if success else 1)
