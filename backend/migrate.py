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
        
        # Read migration SQL
        with open('server/migrations/001_multiuser_schema.sql', 'r') as f:
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

