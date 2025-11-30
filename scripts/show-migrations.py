#!/usr/bin/env python3
"""
Migration SQL Extractor
Reads all migration files and displays them in order for manual execution
"""

import sys
from pathlib import Path

def main():
    print("\n" + "="*70)
    print("🔄 SUPABASE MIGRATION SQL - READY TO COPY & PASTE")
    print("="*70)
    print("\nInstructions:")
    print("1. Go to: https://supabase.com/dashboard/project/qohhnufxididbmzqnjwg/sql/new")
    print("2. For each migration below:")
    print("   - Copy all the SQL")
    print("   - Paste into SQL Editor")
    print("   - Click 'Run'")
    print("3. Continue with next migration\n")
    print("="*70 + "\n")
    
    migrations_dir = Path(__file__).parent.parent / "supabase" / "migrations"
    migration_files = sorted(migrations_dir.glob("*.sql"))
    
    if not migration_files:
        print("❌ No migration files found")
        sys.exit(1)
    
    for i, migration_file in enumerate(migration_files, 1):
        print(f"\n{'='*70}")
        print(f"MIGRATION {i}/{len(migration_files)}: {migration_file.name}")
        print(f"{'='*70}\n")
        
        with open(migration_file, 'r', encoding='utf-8') as f:
            sql = f.read()
            print(sql)
        
        print(f"\n{'─'*70}")
        input(f"✅ Press Enter after running this migration in Supabase Dashboard...")

if __name__ == "__main__":
    main()
