"""
Create legacy user for existing photos
"""
import asyncio
import os
from dotenv import load_dotenv
import asyncpg
import uuid

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL') or os.getenv('VITE_POSTGRES_URL')

async def create_legacy_user():
    conn = await asyncpg.connect(DATABASE_URL)
    
    try:
        # Create legacy user
        legacy_id = await conn.fetchval("""
            INSERT INTO users (username, email, password_hash, full_name, slug, is_active)
            VALUES ('legacy', 'legacy@photobooth.local', 'legacy_no_login', 'Legacy User', 'legacy', FALSE)
            ON CONFLICT (username) DO UPDATE SET username = EXCLUDED.username
            RETURNING id
        """)
        
        print(f"✅ Legacy user created/found: {legacy_id}")
        
        # Create legacy event
        event_id = await conn.fetchval("""
            INSERT INTO events (user_id, slug, title, description, is_active, theme, templates, branding, settings)
            VALUES ($1, 'akita-legacy', 'Akitá (Legacy)', 'Photos from before multiuser implementation', FALSE,
                    '{"brandName": "Akitá"}', '[]', '{}', '{}')
            ON CONFLICT DO NOTHING
            RETURNING id
        """, legacy_id)
        
        print(f"✅ Legacy event created: {event_id}")
        
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(create_legacy_user())

