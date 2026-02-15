import asyncio
import asyncpg
import os

# Use the connection string from the user's previous request or environment
DB_URL = "postgresql://user:password@localhost:5432/photodb"

async def check_user(email):
    print(f"Checking for user with email: {email}")
    try:
        conn = await asyncpg.connect(DB_URL)
        
        # Check 'users' table (Python backend)
        print("\n--- Table: users (Legacy/Python) ---")
        row_users = await conn.fetchrow("SELECT id, username, email, role, is_active FROM users WHERE email = $1", email)
        if row_users:
            print(f"Found: {dict(row_users)}")
        else:
            print("NOT FOUND")

        # Check 'user' table (Better Auth)
        print("\n--- Table: user (Better Auth) ---")
        row_user = await conn.fetchrow('SELECT id, email, role, "emailVerified" FROM "user" WHERE email = $1', email)
        if row_user:
            print(f"Found: {dict(row_user)}")
        else:
            print("NOT FOUND")
            
        # Check 'account' table (Better Auth Password)
        if row_user:
            print("\n--- Table: account (Better Auth Auth) ---")
            row_account = await conn.fetchrow('SELECT id, "userId", "providerId" FROM account WHERE "userId" = $1', row_user['id'])
            if row_account:
                print(f"Found: {dict(row_account)}")
            else:
                print("NOT FOUND (User has no password/account linked)")

        await conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(check_user("jpacheco@smartech.pr"))
