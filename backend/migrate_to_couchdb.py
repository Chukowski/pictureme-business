"""
Migration script to move events from PostgreSQL to CouchDB
Run this once to migrate existing data
"""
import asyncio
import asyncpg
import os
from dotenv import load_dotenv
from couchdb_service import get_couch_service

load_dotenv()

async def migrate_events():
    """Migrate all events from PostgreSQL to CouchDB"""
    couch = get_couch_service()
    
    # Connect to PostgreSQL
    DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("VITE_POSTGRES_URL")
    if not DATABASE_URL:
        print("❌ No DATABASE_URL found in environment")
        return
    
    try:
        conn = await asyncpg.connect(DATABASE_URL)
        print("✅ Connected to PostgreSQL")
        
        # Fetch all events
        events = await conn.fetch("""
            SELECT e.id, e.user_id, e.slug, e.title, e.description, e.start_date, e.end_date,
                   e.is_active, e.theme, e.templates, e.branding, e.settings,
                   e.created_at, e.updated_at,
                   u.username, u.full_name, u.slug AS user_slug
            FROM events e
            JOIN users u ON e.user_id = u.id
            ORDER BY e.created_at DESC
        """)
        
        print(f"\n📦 Found {len(events)} events in PostgreSQL")
        
        if len(events) == 0:
            print("✅ No events to migrate")
            await conn.close()
            return
        
        migrated = 0
        skipped = 0
        
        for event in events:
            try:
                # Check if already exists in CouchDB by slug
                existing = couch.get_event_by_slug(str(event["user_id"]), event["slug"])
                if existing:
                    # Update legacy docs missing new fields
                    patches = {}
                    if not existing.get("user_slug") and event["user_slug"]:
                        patches["user_slug"] = event["user_slug"]
                    if not existing.get("username") and event["username"]:
                        patches["username"] = event["username"]
                    if not existing.get("user_full_name") and event["full_name"]:
                        patches["user_full_name"] = event["full_name"]
                    if not existing.get("postgres_event_id"):
                        patches["postgres_event_id"] = event["id"]
                    if patches:
                        updated_payload = {**existing, **patches}
                        couch.update_event(existing["_id"], updated_payload)
                        print(f"🛠️  Patched legacy event '{event['title']}' with user metadata")
                    else:
                        print(f"⏭️  Skipping '{event['title']}' (already exists in CouchDB)")
                    skipped += 1
                    continue
                
                # Prepare event data for CouchDB
                event_data = {
                    "user_id": str(event["user_id"]),
                    "user_slug": event["user_slug"],
                    "username": event["username"],
                    "user_full_name": event["full_name"],
                    "slug": event["slug"],
                    "title": event["title"],
                    "description": event["description"],
                    "start_date": event["start_date"].isoformat() if event["start_date"] else None,
                    "end_date": event["end_date"].isoformat() if event["end_date"] else None,
                    "is_active": event["is_active"],
                    "theme": event["theme"] or {},
                    "templates": event["templates"] or [],
                    "branding": event["branding"] or {},
                    "settings": event["settings"] or {},
                    "created_at": event["created_at"].isoformat() if event["created_at"] else None,
                    "updated_at": event["updated_at"].isoformat() if event["updated_at"] else None,
                    "migrated_from_postgres": True,
                    "postgres_event_id": event["id"]
                }
                
                # Save to CouchDB
                new_event = couch.create_event(event_data)
                print(f"✅ Migrated: '{event['title']}' (PostgreSQL ID: {event['id']} → CouchDB ID: {new_event['_id']})")
                migrated += 1
                
            except Exception as e:
                print(f"❌ Error migrating event '{event['title']}': {e}")
        
        await conn.close()
        
        print(f"\n{'='*60}")
        print(f"📊 Migration Summary:")
        print(f"   • Total events in PostgreSQL: {len(events)}")
        print(f"   • Successfully migrated: {migrated}")
        print(f"   • Skipped (already exist): {skipped}")
        print(f"   • Failed: {len(events) - migrated - skipped}")
        print(f"{'='*60}\n")
        
        if migrated > 0:
            print("✅ Migration complete! Your events should now appear in the dashboard.")
            print("   Refresh the page to see them.")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("🚀 Starting PostgreSQL → CouchDB migration...\n")
    asyncio.run(migrate_events())

