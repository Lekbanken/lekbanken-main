#!/usr/bin/env python3
"""
Run all Supabase migrations using psql
"""
import subprocess
import os
from pathlib import Path
import sys
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
    # Configuration
    project_ref = _resolve_project_ref()
    host = os.getenv("SUPABASE_DB_HOST")
    if not host:
        if not project_ref:
            project_ref = input("Enter Supabase project ref (e.g. abcdefghijklmnop): ").strip() or None
        if not project_ref:
            print("❌ Missing project ref. Set SUPABASE_PROJECT_REF or link via: supabase link --project-ref YOUR_PROJECT_REF")
            sys.exit(1)
        host = f"db.{project_ref}.supabase.co"
    port = "5432"
    database = "postgres"
    user = "postgres"
    
    # Get password from user
    import getpass
    password = getpass.getpass("Enter PostgreSQL password: ")
    
    # Set environment variable for password
    env = os.environ.copy()
    env["PGPASSWORD"] = password
    
    # Get migration files
    migrations_dir = Path(__file__).parent.parent / "supabase" / "migrations"
    migration_files = sorted(migrations_dir.glob("*.sql"))
    
    if not migration_files:
        print("No migration files found!")
        sys.exit(1)
    
    print(f"\nFound {len(migration_files)} migration files")
    print("=" * 60)
    
    failed_count = 0
    success_count = 0
    
    for migration_file in migration_files:
        print(f"\n▶ Executing: {migration_file.name}")
        
        try:
            result = subprocess.run(
                [
                    "psql",
                    f"-h", host,
                    f"-p", port,
                    f"-d", database,
                    f"-U", user,
                    f"-f", str(migration_file)
                ],
                env=env,
                capture_output=True,
                text=True,
                timeout=300
            )
            
            if result.returncode == 0:
                print(f"✅ SUCCESS")
                success_count += 1
            else:
                print(f"❌ FAILED")
                print(f"Error: {result.stderr}")
                failed_count += 1
                # Continue to next migration instead of stopping
        
        except subprocess.TimeoutExpired:
            print(f"❌ TIMEOUT (300s)")
            failed_count += 1
        except Exception as e:
            print(f"❌ ERROR: {str(e)}")
            failed_count += 1
    
    # Summary
    print("\n" + "=" * 60)
    print(f"\n📊 SUMMARY:")
    print(f"   ✅ Success: {success_count}/{len(migration_files)}")
    print(f"   ❌ Failed:  {failed_count}/{len(migration_files)}")
    
    if failed_count == 0:
        print("\n🎉 All migrations executed successfully!")
        print("\n📝 Next steps:")
        print("   1. Verify tables in Supabase Dashboard → Table Editor")
        print("   2. Check that 60+ tables were created")
        print("   3. Ready for testing and deployment!")
    else:
        print(f"\n⚠️  {failed_count} migration(s) failed. Review errors above.")
        sys.exit(1)

if __name__ == "__main__":
    run_migrations()
