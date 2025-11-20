import asyncio
import os
import asyncpg
import bcrypt
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("VITE_POSTGRES_URL")

if not DATABASE_URL:
    print("❌ Error: DATABASE_URL not set")
    exit(1)

def hash_password(password: str) -> str:
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

async def create_user():
    print(f"Connecting to {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else DATABASE_URL}...")
    conn = await asyncpg.connect(DATABASE_URL)
    
    try:
        username = "pacheco"
        password = "Mc4tnqjb."
        email = "pacheco@example.com" # Dummy email
        role = "business_masters"
        full_name = "Pacheco Master"
        slug = "pacheco"

        print(f"Creating user '{username}' with role '{role}'...")
        
        hashed_pw = hash_password(password)
        
        # Check if user exists
        existing = await conn.fetchrow("SELECT id FROM users WHERE username = $1", username)
        
        if existing:
            print(f"User '{username}' already exists. Updating role and password...")
            await conn.execute(
                """
                UPDATE users 
                SET password_hash = $1, role = $2, is_active = TRUE 
                WHERE username = $3
                """,
                hashed_pw, role, username
            )
        else:
            await conn.execute(
                """
                INSERT INTO users (username, email, password_hash, full_name, slug, role, is_active)
                VALUES ($1, $2, $3, $4, $5, $6, TRUE)
                """,
                username, email, hashed_pw, full_name, slug, role
            )
            
        print(f"✅ User '{username}' created/updated successfully!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(create_user())
