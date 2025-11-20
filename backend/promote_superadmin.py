import asyncio
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("VITE_POSTGRES_URL")

if not DATABASE_URL:
    print("❌ Error: DATABASE_URL not set")
    exit(1)

async def promote_to_superadmin():
    print(f"Connecting to database...")
    conn = await asyncpg.connect(DATABASE_URL)
    
    try:
        username = "pacheco"
        role = "superadmin"

        print(f"Promoting user '{username}' to '{role}'...")
        
        result = await conn.execute(
            """
            UPDATE users 
            SET role = $1 
            WHERE username = $2
            """,
            role, username
        )
        
        if result == "UPDATE 1":
            print(f"✅ User '{username}' promoted to '{role}' successfully!")
        else:
            print(f"⚠️ User '{username}' not found.")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(promote_to_superadmin())
