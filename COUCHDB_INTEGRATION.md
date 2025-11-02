# CouchDB Integration

## 📦 Architecture Overview

The application now uses a **hybrid storage strategy**:

- **CouchDB**: Events, templates, and photo metadata (JSON documents)
- **PostgreSQL**: User accounts and authentication only
- **MinIO**: Image files (original and processed photos)

This approach leverages each database's strengths:
- CouchDB excels at storing and querying JSON documents
- PostgreSQL provides robust user authentication
- MinIO efficiently stores binary image data

## 🔧 Configuration

Add these environment variables to your `.env` file:

```bash
# CouchDB Configuration
COUCHDB_URL=https://couch.akitapr.com
COUCHDB_USER=maia94
COUCHDB_PASSWORD=hhncu6l62zvmbdaj
COUCHDB_DB_EVENTS=photobooth_events
COUCHDB_DB_PHOTOS=photobooth_photos
```

## 📁 Database Structure

### CouchDB Databases

#### `photobooth_events`
Stores event configurations with templates and branding:

```json
{
  "_id": "unique-couch-id",
  "_rev": "1-revision-hash",
  "type": "event",
  "user_id": "uuid-from-postgres",
  "slug": "my-event-2025",
  "title": "My Event 2025",
  "description": "Event description",
  "start_date": "2025-01-01T00:00:00",
  "end_date": "2025-12-31T23:59:59",
  "is_active": true,
  "theme": {},
  "templates": [
    {
      "id": "template-1",
      "name": "Ocean Depths",
      "description": "Underwater scene",
      "prompt": "AI prompt here...",
      "images": ["https://storage.akitapr.com/..."],
      "campaignText": "Need extra hands?",
      "active": true,
      "includeHeader": false
    }
  ],
  "branding": {
    "brandName": "Akitá",
    "primaryColor": "#FF6B35",
    "secondaryColor": "#004E89",
    "logoUrl": "https://storage.akitapr.com/..."
  },
  "settings": {},
  "created_at": "2025-11-02T13:00:00",
  "updated_at": "2025-11-02T13:00:00"
}
```

#### `photobooth_photos`
Stores photo metadata (images are in MinIO):

```json
{
  "_id": "unique-couch-id",
  "_rev": "1-revision-hash",
  "type": "photo",
  "event_id": "event-couch-id",
  "share_code": "ABC123",
  "original_image_url": "https://storage.akitapr.com/photobooth/original_...",
  "processed_image_url": "https://storage.akitapr.com/photobooth/processed_...",
  "template_id": "template-1",
  "created_at": "2025-11-02T13:30:00"
}
```

### CouchDB Views

The service automatically creates these views for efficient querying:

**Events Views** (`_design/events`):
- `by_user`: Get all events for a user
- `by_slug`: Get event by user_id + slug
- `active`: Get all active events

**Photos Views** (`_design/photos`):
- `by_event`: Get all photos for an event
- `by_share_code`: Get photo by share code

## 🚀 API Changes

### Event Endpoints (Now using CouchDB)

#### `POST /api/events`
Creates a new event in CouchDB.

**Request:**
```json
{
  "slug": "my-event",
  "title": "My Event",
  "description": "Description",
  "templates": [...],
  "branding": {...}
}
```

**Response:**
```json
{
  "_id": "couch-doc-id",
  "_rev": "1-hash",
  "user_id": "user-uuid",
  "slug": "my-event",
  ...
}
```

#### `GET /api/events`
Returns all events for the authenticated user from CouchDB.

#### `PUT /api/events/{event_id}`
Updates an event (event_id is now a CouchDB `_id` string, not an integer).

#### `DELETE /api/events/{event_id}`
Deletes an event from CouchDB.

### Frontend Changes Required

The frontend needs to handle CouchDB document IDs (`_id` as string) instead of PostgreSQL integer IDs:

**Before:**
```typescript
event.id  // number (1, 2, 3...)
```

**After:**
```typescript
event._id  // string ("abc123def456...")
```

## 🔄 Migration from PostgreSQL

Existing events in PostgreSQL need to be migrated to CouchDB. Here's a migration script:

```python
# backend/migrate_to_couchdb.py
import asyncpg
import asyncio
from couchdb_service import get_couch_service
import os
from dotenv import load_dotenv

load_dotenv()

async def migrate_events():
    couch = get_couch_service()
    
    # Connect to PostgreSQL
    conn = await asyncpg.connect(os.getenv("VITE_POSTGRES_URL"))
    
    # Fetch all events
    events = await conn.fetch("SELECT * FROM events")
    
    for event in events:
        event_data = {
            "user_id": str(event["user_id"]),
            "slug": event["slug"],
            "title": event["title"],
            "description": event["description"],
            "start_date": event["start_date"].isoformat() if event["start_date"] else None,
            "end_date": event["end_date"].isoformat() if event["end_date"] else None,
            "is_active": event["is_active"],
            "theme": event["theme"],
            "templates": event["templates"],
            "branding": event["branding"],
            "settings": event["settings"]
        }
        
        # Save to CouchDB
        new_event = couch.create_event(event_data)
        print(f"✅ Migrated event: {event['title']} -> {new_event['_id']}")
    
    await conn.close()
    print(f"\n✅ Migrated {len(events)} events to CouchDB")

if __name__ == "__main__":
    asyncio.run(migrate_events())
```

Run with:
```bash
cd backend
python migrate_to_couchdb.py
```

## 🧪 Testing

### Test CouchDB Connection

```bash
curl -X GET https://couch.akitapr.com/_all_dbs \
  -u maia94:hhncu6l62zvmbdaj
```

Should return:
```json
["photobooth_events", "photobooth_photos", ...]
```

### Test Event Creation

```bash
# 1. Login to get token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# 2. Create event (use token from step 1)
curl -X POST http://localhost:3001/api/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "slug": "test-event",
    "title": "Test Event",
    "templates": [],
    "branding": {}
  }'
```

## 🎯 Benefits

1. **Flexible Schema**: JSON documents can evolve without migrations
2. **Better Performance**: CouchDB is optimized for JSON document storage
3. **Simplified Queries**: Views provide efficient, indexed queries
4. **Scalability**: CouchDB's replication and clustering capabilities
5. **Reduced Complexity**: No need for JSONB type casting in PostgreSQL

## 📝 Notes

- CouchDB document IDs (`_id`) are strings, not integers
- Always include `_rev` when updating documents
- Views are automatically created on first connection
- The service handles all CouchDB operations transparently

## 🔗 Resources

- [CouchDB3 Python Client](https://github.com/N-Vlahovic/couchdb3-python)
- [CouchDB Documentation](https://docs.couchdb.org/)
- [CouchDB Views Guide](https://docs.couchdb.org/en/stable/ddocs/views/intro.html)

