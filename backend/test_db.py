#!/usr/bin/env python3
"""
Test database connection for backend
"""

import os
import sys
from dotenv import load_dotenv
import asyncpg

# Load environment variables
load_dotenv()

# Try to build DATABASE_URL
DATABASE_URL = (
    os.getenv("DATABASE_URL") or 
    os.getenv("VITE_POSTGRES_URL") or
    f"postgresql://{os.getenv('POSTGRES_USER', 'photouser')}:{os.getenv('POSTGRES_PASSWORD', '')}@{os.getenv('POSTGRES_HOST', 'localhost')}:{os.getenv('POSTGRES_PORT', '5432')}/{os.getenv('POSTGRES_DB', 'photodb')}"
)

print(f"🔍 Testing connection to:")
print(f"   {DATABASE_URL.replace(os.getenv('POSTGRES_PASSWORD', ''), '***')}")
print()

async def test_connection():
    try:
        print("📡 Attempting to connect...")
        conn = await asyncpg.connect(DATABASE_URL)
        print("✅ Connection successful!")
        
        # Test query
        version = await conn.fetchval('SELECT version()')
        print(f"📦 PostgreSQL version: {version[:50]}...")
        
        # Check if tables exist
        tables = await conn.fetch("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        
        if tables:
            print(f"\n📋 Found {len(tables)} table(s):")
            for table in tables:
                print(f"   - {table['table_name']}")
        else:
            print("\n⚠️  No tables found. Run migrations: npm run migrate")
        
        await conn.close()
        print("\n✅ All checks passed!")
        return True
        
    except Exception as e:
        print(f"\n❌ Connection failed: {e}")
        print("\n💡 Troubleshooting:")
        print("   1. Check your .env file in backend/ directory")
        print("   2. Verify PostgreSQL credentials")
        print("   3. Ensure PostgreSQL is running and accessible")
        print("   4. Check firewall rules")
        return False

if __name__ == "__main__":
    import asyncio
    success = asyncio.run(test_connection())
    sys.exit(0 if success else 1)

