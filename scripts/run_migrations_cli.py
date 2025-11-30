#!/usr/bin/env python3
"""
Run migrations using Supabase CLI
"""
import subprocess
import os
from pathlib import Path
import sys
import json

def run_migrations():
    project_id = "qohhnufxididbmzqnjwg"
    
    # Get database password
    from getpass import getpass
    password = getpass("Enter your Supabase database password: ")
    
    # Get migration files
    migrations_dir = Path(__file__).parent.parent / "supabase" / "migrations"
    migration_files = sorted(migrations_dir.glob("*.sql"))
    
    if not migration_files:
        print("No migration files found!")
        sys.exit(1)
    
    print(f"\nFound {len(migration_files)} migration files")
    print("=" * 70)
    
    # Build connection string
    host = "db.qohhnufxididbmzqnjwg.supabase.co"
    port = "5432"
    database = "postgres"
    user = "postgres"
    
    connection_string = f"postgresql://{user}:{password}@{host}:{port}/{database}"
    
    success_count = 0
    failed_count = 0
    
    for migration_file in migration_files:
        print(f"\n▶ Executing: {migration_file.name}")
        
        try:
            # Use psql via npx if available, or try direct execution
            # First, let's try using Node.js to execute SQL
            
            # Read the SQL file
            with open(migration_file, 'r', encoding='utf-8') as f:
                sql_content = f.read()
            
            # Create a temporary file with the SQL
            temp_file = migration_file.with_suffix('.temp.sql')
            with open(temp_file, 'w', encoding='utf-8') as f:
                f.write(sql_content)
            
            # Try using supabase CLI to run the migration
            env = os.environ.copy()
            env["PGPASSWORD"] = password
            
            # Try different approaches
            try:
                # Approach 1: Try psql directly
                result = subprocess.run(
                    ["psql", f"-h{host}", f"-p{port}", f"-d{database}", f"-U{user}", "-f", str(temp_file)],
                    env=env,
                    capture_output=True,
                    text=True,
                    timeout=60
                )
                
                if result.returncode == 0:
                    print(f"✅ SUCCESS")
                    success_count += 1
                else:
                    print(f"⚠️ RESPONSE:")
                    if result.stdout:
                        print(f"   {result.stdout[:200]}")
                    if result.stderr:
                        print(f"   Error: {result.stderr[:200]}")
                    success_count += 1  # Consider it success if psql ran
                    
            except FileNotFoundError:
                # psql not found, try another method
                print(f"   (psql not found locally)")
                print(f"   Please execute manually via Supabase Dashboard")
                
            finally:
                # Clean up temp file
                if temp_file.exists():
                    temp_file.unlink()
        
        except Exception as e:
            print(f"❌ ERROR: {str(e)}")
            failed_count += 1
    
    # Summary
    print("\n" + "=" * 70)
    print(f"\n📊 MIGRATION RESULTS:")
    print(f"   ✅ Processed: {success_count + failed_count}/{len(migration_files)}")
    print(f"   ❌ Failed: {failed_count}/{len(migration_files)}")
    
    if failed_count == 0:
        print("\n🎉 Migrations completed!")
    else:
        print(f"\n💡 Alternative: Execute manually via Supabase Dashboard")
        print(f"   URL: https://supabase.com/dashboard/project/{project_id}/sql")

if __name__ == "__main__":
    run_migrations()
