import asyncio
import asyncpg
import os

DB_URL = "postgresql://photouser:Mc4tnqjb.@5.161.255.18:5432/photodb"

async def sync_user(email):
    print(f"Syncing user: {email}")
    try:
        conn = await asyncpg.connect(DB_URL)
        
        # Get user from legacy table
        user = await conn.fetchrow("SELECT * FROM users WHERE email = $1", email)
        if not user:
            print("User not found in legacy table!")
            return

        print(f"Found legacy user: {user['username']} (ID: {user['id']})")

        # Insert into Better Auth 'user' table
        try:
            await conn.execute("""
                INSERT INTO "user" (
                    id, email, "emailVerified", name, slug, role, 
                    tokens_remaining, is_active, "createdAt", "updatedAt", image
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                ON CONFLICT (email) DO UPDATE SET
                    name = EXCLUDED.name,
                    slug = EXCLUDED.slug,
                    role = EXCLUDED.role,
                    image = EXCLUDED.image,
                    "updatedAt" = NOW()
            """, 
            str(user['id']), 
            user['email'], 
            True, 
            user['full_name'] or user['username'], 
            user['slug'], 
            user['role'], 
            100, 
            user['is_active'], 
            user['created_at'], 
            user['created_at'], # updatedAt
            user.get('avatar_url') # image
            )
            print("✅ Synced to 'user' table")
        except Exception as e:
            print(f"❌ Error syncing 'user' table: {e}")

        # Insert into Better Auth 'account' table
        try:
            await conn.execute("""
                INSERT INTO account (
                    id, "userId", "accountId", "providerId", password, "createdAt", "updatedAt"
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT ("userId", "providerId") DO UPDATE SET
                    password = EXCLUDED.password,
                    "updatedAt" = NOW()
            """,
            f"account_{user['id']}",
            str(user['id']),
            user['email'],
            'credential',
            user['password_hash'],
            user['created_at'],
            user['created_at']
            )
            print("✅ Synced to 'account' table")
        except Exception as e:
            print(f"❌ Error syncing 'account' table: {e}")

        await conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(sync_user("jpacheco@smartech.pr"))
