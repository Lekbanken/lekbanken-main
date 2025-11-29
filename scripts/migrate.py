#!/usr/bin/env python3
"""
Supabase Migration Executor - No psql required!
Connects directly to PostgreSQL and executes migrations
"""

import os
import sys
import glob
from pathlib import Path

def main():
    print("\n🔄 Supabase Migration Executor\n")
    
    # Check for psycopg2
    try:
        import psycopg2
    except ImportError:
        print("📦 Installing required package...")
        os.system("pip install psycopg2-binary --quiet")
        import psycopg2
    
    print("📍 Get your connection string from:")
    print("https://supabase.com/dashboard/project/qohhnufxididbmzqnjwg/settings/database")
    print("Use 'Session' mode (not 'Connection pooler')\n")
    
    conn_str = input("Enter connection string: ").strip()
    
    if not conn_str:
        print("❌ No connection string provided")
        sys.exit(1)
    
    print("\n🧪 Testing connection...")
    
    # Parse connection string and fix encoding issues
    try:
        from urllib.parse import urlparse, unquote
        parsed = urlparse(conn_str)
        
        # Reconstruct properly
        password = unquote(parsed.password) if parsed.password else ""
        user = unquote(parsed.username) if parsed.username else "postgres"
        host = parsed.hostname or "db.supabase.co"
        port = parsed.port or 5432
        database = parsed.path.lstrip('/') or "postgres"
        
        conn_params = {
            'host': host,
            'port': port,
            'database': database,
            'user': user,
            'password': password
        }
    except Exception as e:
        print(f"❌ Error parsing connection string: {e}")
        sys.exit(1)
    
    try:
        conn = psycopg2.connect(**conn_params)
        cursor = conn.cursor()
        cursor.execute("SELECT version();")
        version = cursor.fetchone()[0]
        cursor.close()
        conn.close()
        print("✅ Connection successful\n")
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        sys.exit(1)
    
    # Find migrations
    migrations_dir = Path(__file__).parent.parent / "supabase" / "migrations"
    migration_files = sorted(migrations_dir.glob("*.sql"))
    
    if not migration_files:
        print("❌ No migration files found")
        sys.exit(1)
    
    print(f"📄 Found {len(migration_files)} migrations\n")
    
    # Confirm
    confirm = input("Execute all migrations? (y/n): ").strip().lower()
    if confirm != 'y':
        print("Cancelled")
        sys.exit(0)
    
    print("\n⏳ Executing migrations...\n")
    
    success = 0
    failed = 0
    
    for i, migration_file in enumerate(migration_files, 1):
        print(f"[{i}/{len(migration_files)}] {migration_file.name}...", end=" ", flush=True)
        
        try:
            conn = psycopg2.connect(**conn_params)
            cursor = conn.cursor()
            
            # Read and execute migration
            with open(migration_file, 'r') as f:
                sql = f.read()
            
            cursor.execute(sql)
            conn.commit()
            cursor.close()
            conn.close()
            
            print("✅")
            success += 1
        except Exception as e:
            print("❌")
            print(f"   Error: {str(e)[:100]}")
            failed += 1
    
    print(f"\n✅ Done: {success} succeeded, {failed} failed\n")
    
    if failed == 0:
        print("🎉 All migrations executed successfully!\n")
    
    sys.exit(0 if failed == 0 else 1)

if __name__ == "__main__":
    main()
