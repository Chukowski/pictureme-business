import asyncio
import asyncpg

DB_URL = "postgresql://photouser:Mc4tnqjb.@5.161.255.18:5432/photodb"

async def fix_user_email():
    print("Fixing email for User ID 6...")
    try:
        conn = await asyncpg.connect(DB_URL)
        
        # Update 'user' table
        print("Updating 'user' table...")
        await conn.execute("""
            UPDATE "user" 
            SET email = $1, name = $2, "updatedAt" = NOW()
            WHERE id = $3
        """, 'jpacheco@smartech.pr', 'Juan Pacheco', '6')
        print("✅ Updated 'user' table")

        # Update 'account' table
        print("Updating 'account' table...")
        await conn.execute("""
            UPDATE account 
            SET "accountId" = $1, "updatedAt" = NOW()
            WHERE "userId" = $2 AND "providerId" = 'credential'
        """, 'jpacheco@smartech.pr', '6')
        print("✅ Updated 'account' table")

        await conn.close()
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(fix_user_email())
