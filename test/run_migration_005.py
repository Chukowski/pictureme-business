import asyncio
import asyncpg
import os

DB_URL = "postgresql://user:password@localhost:5432/photodb"

async def run_migration():
    print("Running migration 005_add_profile_details.sql...")
    try:
        conn = await asyncpg.connect(DB_URL)
        
        with open("backend/migrations/005_add_profile_details.sql", "r") as f:
            sql = f.read()
            
        await conn.execute(sql)
        print("✅ Migration applied successfully")
        
        await conn.close()
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(run_migration())
