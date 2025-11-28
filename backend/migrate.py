"""
Database Migration Script for FastAPI Backend
Run this to create the multi-user tables in PostgreSQL
"""
import asyncio
import os
from dotenv import load_dotenv
import asyncpg

# Load environment variables
load_dotenv()

# Get database URL from environment (same as main.py)
DATABASE_URL = os.getenv('DATABASE_URL') or os.getenv('VITE_POSTGRES_URL')

if not DATABASE_URL:
    raise Exception("DATABASE_URL or VITE_POSTGRES_URL environment variable not set")

print(f"🔗 Connecting to database...")
if '@' in DATABASE_URL:
    # Hide password in display
    parts = DATABASE_URL.split('@')
    masked_url = f"{parts[0].split(':')[0]}:***@{parts[1]}"
    print(f"   URL: {masked_url}")
else:
    print(f"   URL: {DATABASE_URL}")

async def run_migrations():
    """Run database migrations"""
    conn = await asyncpg.connect(DATABASE_URL)
    
    try:
        print("\n📦 Creating tables...")
        
        # Read migration SQL files - check multiple locations
        migration_paths = [
            '../server/migrations/001_multiuser_schema.sql',
            '../server/migrations/002_add_roles_and_applications.sql',
            'migrations/003_add_billing_and_tokens.sql',
            'migrations/004_add_profile_fields.sql',
            'migrations/005_add_profile_details.sql',
            'migrations/005_enterprise_custom_pricing.sql',
            'migrations/006_fix_duplicate_models.sql',
            'migrations/007_add_public_profile_fields.sql',
            'migrations/008_business_plans_and_contracts.sql',
            'migrations/009_create_pachecodes_user.sql',
            'migrations/010_create_pachecodes_better_auth.sql',
            'migrations/011_stripe_connect.sql',
            'migrations/012_marketplace_templates_structure.sql',
            'migrations/013_user_library_couchdb.sql',
            'migrations/014_organizations_and_albums.sql',
        ]

        for migration_file in migration_paths:
            print(f"\n📄 Running migration: {migration_file}")
            
            # Try multiple locations
            possible_paths = [
                migration_file,
                f"../{migration_file}",
                migration_file.replace('../', '')
            ]
            
            found_path = None
            for path in possible_paths:
                if os.path.exists(path):
                    found_path = path
                    break
            
            if not found_path:
                print(f"   ⚠️  File not found, skipping...")
                continue

            print(f"   ✅ Found at: {found_path}")
            
            with open(found_path, 'r') as f:
                migration_sql = f.read()
            
            # Split by statement (simple approach)
            statements = [s.strip() for s in migration_sql.split(';') if s.strip()]
            
            for i, statement in enumerate(statements, 1):
                if not statement:
                    continue
                
                try:
                    print(f"   Executing statement {i}/{len(statements)}...")
                    await conn.execute(statement)
                except Exception as e:
                    # Skip if table already exists
                    if 'already exists' in str(e).lower():
                        print(f"   ⚠️  Skipped (already exists)")
                    else:
                        print(f"   ❌ Error: {e}")
                        # Continue with other statements
        
        print("\n✅ Migration completed successfully!")
        
        # Check what tables exist
        tables = await conn.fetch("""
            SELECT tablename FROM pg_tables 
            WHERE schemaname = 'public'
            ORDER BY tablename
        """)
        
        print(f"\n📋 Tables in database ({len(tables)}):")
        for table in tables:
            print(f"   - {table['tablename']}")
        
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(run_migrations())

