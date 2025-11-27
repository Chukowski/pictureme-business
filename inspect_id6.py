import asyncio
import asyncpg

DB_URL = "postgresql://photouser:Mc4tnqjb.@5.161.255.18:5432/photodb"

async def inspect_user():
    print("Inspecting User ID 6...")
    try:
        conn = await asyncpg.connect(DB_URL)
        
        # Check 'user' table by ID
        print("\n--- Table: user (ID 6) ---")
        row_user_id = await conn.fetchrow('SELECT * FROM "user" WHERE id = $1', '6')
        if row_user_id:
            print(f"Found by ID: {dict(row_user_id)}")
        else:
            print("NOT FOUND by ID")

        # Check 'user' table by Email
        print("\n--- Table: user (Email jpacheco@smartech.pr) ---")
        row_user_email = await conn.fetchrow('SELECT * FROM "user" WHERE email = $1', 'jpacheco@smartech.pr')
        if row_user_email:
            print(f"Found by Email: {dict(row_user_email)}")
        else:
            print("NOT FOUND by Email")

        # Check 'account' table
        print("\n--- Table: account (UserId 6) ---")
        row_account = await conn.fetchrow('SELECT * FROM account WHERE "userId" = $1', '6')
        if row_account:
            print(f"Found: {dict(row_account)}")
        else:
            print("NOT FOUND")

        await conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(inspect_user())
