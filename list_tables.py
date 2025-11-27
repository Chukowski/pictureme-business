import asyncio
import asyncpg

DB_URL = "postgresql://photouser:Mc4tnqjb.@5.161.255.18:5432/photodb"

async def list_tables():
    try:
        conn = await asyncpg.connect(DB_URL)
        rows = await conn.fetch("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)
        print("Tables in database:")
        for row in rows:
            print(f"- {row['table_name']}")
        await conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(list_tables())
