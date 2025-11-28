from fastapi import APIRouter, HTTPException, Depends, Request
from typing import List, Optional, Dict, Any
from uuid import UUID
import secrets
from schemas import Album, AlbumCreate, AlbumPhoto, AlbumPhotoCreate
from couchdb_service import get_couch_service

router = APIRouter(prefix="/api/albums", tags=["Albums"])

db_pool = None

def set_db_pool(pool):
    global db_pool
    db_pool = pool

async def get_current_user_from_request(request: Request) -> dict:
    from main import get_current_user
    from fastapi.security import HTTPAuthorizationCredentials
    auth_header = request.headers.get("Authorization")
    credentials = None
    if auth_header and auth_header.startswith("Bearer "):
        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer",
            credentials=auth_header.replace("Bearer ", "")
        )
    return await get_current_user(request, credentials)

@router.post("/", response_model=Album)
async def create_album(album: AlbumCreate, request: Request):
    """Create a new album for an event (e.g. at Registration station)"""
    # Generate a secure, short code for QR
    code = secrets.token_urlsafe(8).upper().replace("-", "").replace("_", "")[:8]
    
    async with db_pool.acquire() as conn:
        # Verify event exists
        event = await conn.fetchrow("SELECT id FROM events WHERE id = $1", album.event_id)
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
            
        # Create album
        row = await conn.fetchrow("""
            INSERT INTO albums (event_id, organization_id, code, status, owner_name, owner_email)
            VALUES ($1, $2, $3, 'in_progress', $4, $5)
            RETURNING *
        """, album.event_id, album.organization_id, code, album.owner_name, album.owner_email)
        
        return dict(row)

@router.get("/{code}", response_model=Album)
async def get_album(code: str):
    """Get album details by code (public/station access)"""
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM albums WHERE code = $1", code)
        if not row:
            raise HTTPException(status_code=404, detail="Album not found")
        return dict(row)

@router.get("/{code}/photos")
async def get_album_photos(code: str):
    """Get photos in an album with details"""
    import logging
    logger = logging.getLogger(__name__)
    
    couch = get_couch_service()
    async with db_pool.acquire() as conn:
        # Get album ID first
        album_id = await conn.fetchval("SELECT id FROM albums WHERE code = $1", code)
        if not album_id:
            raise HTTPException(status_code=404, detail="Album not found")
            
        rows = await conn.fetch("SELECT * FROM album_photos WHERE album_id = $1 ORDER BY created_at DESC", album_id)
        
        photos = []
        for row in rows:
            photo_data = dict(row)
            # Format UUIDs as strings
            photo_data["id"] = str(photo_data["id"])
            photo_data["album_id"] = str(photo_data["album_id"])
            photo_data["created_at"] = photo_data["created_at"].isoformat() if photo_data["created_at"] else None
            
            share_code = photo_data["photo_id"] # stored shareCode
            logger.info(f"📸 Looking for photo with share_code: {share_code}")
            
            # Try CouchDB first
            photo_doc = couch.get_photo_by_share_code(share_code)
            if photo_doc:
                logger.info(f"✅ Found photo in CouchDB: {photo_doc.get('_id')}")
                processed_url = photo_doc.get("processed_image_url") or photo_doc.get("processedImageUrl")
                original_url = photo_doc.get("original_image_url") or photo_doc.get("originalImageUrl")
                # Use processed image for both main and thumbnail (preview should show AI result)
                photo_data["url"] = processed_url
                photo_data["thumbnail_url"] = processed_url or original_url  # Prefer processed for preview
                photo_data["photo_url"] = processed_url  # Alias for frontend compatibility
                photo_data["original_url"] = original_url  # Keep original available if needed
                photo_data["meta"] = photo_doc.get("meta")
            else:
                logger.info(f"⚠️ Photo not found in CouchDB, trying Postgres...")
                # Try Postgres
                pg_photo = await conn.fetchrow(
                    "SELECT processed_image_url, original_image_url FROM processed_photos WHERE share_code = $1", 
                    share_code
                )
                if pg_photo:
                    logger.info(f"✅ Found photo in Postgres")
                    processed_url = pg_photo["processed_image_url"]
                    original_url = pg_photo["original_image_url"]
                    # Use processed image for both main and thumbnail
                    photo_data["url"] = processed_url
                    photo_data["thumbnail_url"] = processed_url or original_url  # Prefer processed for preview
                    photo_data["photo_url"] = processed_url  # Alias for frontend compatibility
                    photo_data["original_url"] = original_url  # Keep original available if needed
                else:
                    logger.warning(f"❌ Photo not found anywhere for share_code: {share_code}")
                    # Use the share_code as a fallback URL if it looks like a URL
                    if share_code and (share_code.startswith('http') or share_code.startswith('data:')):
                        photo_data["url"] = share_code
                        photo_data["photo_url"] = share_code
            
            photos.append(photo_data)
            
        return photos

@router.post("/{code}/photos")
async def add_photo(code: str, photo: AlbumPhotoCreate):
    """Add a photo to an album (from a station)"""
    import json
    async with db_pool.acquire() as conn:
        # Get album details
        album = await conn.fetchrow("SELECT id, status, event_id FROM albums WHERE code = $1", code)
        if not album:
            raise HTTPException(status_code=404, detail="Album not found")
            
        if album["status"] == "archived":
             raise HTTPException(status_code=400, detail="Album is archived")
        
        if album["status"] == "completed":
             raise HTTPException(status_code=400, detail="Album is already completed")

        # Validate max photos based on event config
        event = await conn.fetchrow(
            "SELECT settings FROM events WHERE id = $1", album["event_id"]
        )
        max_photos = 5  # Default
        if event and event["settings"]:
            try:
                settings = json.loads(event["settings"]) if isinstance(event["settings"], str) else event["settings"]
                album_tracking = settings.get("albumTracking", {})
                rules = album_tracking.get("rules", {})
                max_photos = rules.get("maxPhotosPerAlbum", 5)
            except:
                pass
        
        # Count current photos
        current_count = await conn.fetchval(
            "SELECT COUNT(*) FROM album_photos WHERE album_id = $1", album["id"]
        )
        
        if current_count >= max_photos:
            raise HTTPException(
                status_code=400, 
                detail=f"Album has reached maximum photos ({max_photos})"
            )
        
        # Insert photo with station metadata
        row = await conn.fetchrow("""
            INSERT INTO album_photos (album_id, photo_id, station_type, metadata)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        """, album["id"], photo.photo_id, photo.station_type, 
            json.dumps({"station_id": photo.station_id}) if hasattr(photo, 'station_id') and photo.station_id else None)
        
        # Auto-complete album if max reached
        if current_count + 1 >= max_photos:
            await conn.execute(
                "UPDATE albums SET status = 'completed' WHERE id = $1", album["id"]
            )
        
        result = dict(row)
        result["id"] = str(result["id"])
        result["album_id"] = str(result["album_id"])
        result["created_at"] = result["created_at"].isoformat() if result["created_at"] else None
        return result

@router.delete("/{code}/photos/{photo_id}")
async def delete_album_photo(code: str, photo_id: str):
    """Delete a photo from an album (staff action for retakes)"""
    async with db_pool.acquire() as conn:
        # Get album details
        album = await conn.fetchrow("SELECT id, status FROM albums WHERE code = $1", code)
        if not album:
            raise HTTPException(status_code=404, detail="Album not found")
        
        # Find the photo in the album
        photo = await conn.fetchrow(
            "SELECT id FROM album_photos WHERE album_id = $1 AND photo_id = $2",
            album["id"], photo_id
        )
        if not photo:
            raise HTTPException(status_code=404, detail="Photo not found in album")
        
        # Delete the photo from album
        await conn.execute(
            "DELETE FROM album_photos WHERE album_id = $1 AND photo_id = $2",
            album["id"], photo_id
        )
        
        # If album was completed, set it back to in_progress
        if album["status"] == "completed":
            await conn.execute(
                "UPDATE albums SET status = 'in_progress' WHERE id = $1",
                album["id"]
            )
        
        return {"status": "success", "message": "Photo deleted from album"}

@router.put("/{album_code}/status")
async def update_album_status(album_code: str, status: str, request: Request):
    """Update album status (e.g. mark complete, paid)"""
    user = await get_current_user_from_request(request)
    
    if status not in ['in_progress', 'completed', 'paid', 'archived']:
        raise HTTPException(status_code=400, detail="Invalid status")

    async with db_pool.acquire() as conn:
        # Find album by code
        album = await conn.fetchrow("SELECT id FROM albums WHERE code = $1", album_code)
        if not album:
            raise HTTPException(status_code=404, detail="Album not found")
        
        # Update status and payment_status if marking as paid
        if status == 'paid':
            await conn.execute(
                "UPDATE albums SET status = $1, payment_status = 'paid' WHERE id = $2", 
                status, album["id"]
            )
        else:
            await conn.execute("UPDATE albums SET status = $1 WHERE id = $2", status, album["id"])
        
        return {"status": "success"}

@router.post("/{album_code}/request-payment")
async def request_album_payment(album_code: str):
    """Visitor requests to pay for album - notifies staff"""
    from datetime import datetime
    
    async with db_pool.acquire() as conn:
        # Find album
        album = await conn.fetchrow(
            "SELECT id, event_id, owner_name, owner_email, payment_status FROM albums WHERE code = $1", 
            album_code
        )
        if not album:
            raise HTTPException(status_code=404, detail="Album not found")
        
        if album["payment_status"] == "paid":
            raise HTTPException(status_code=400, detail="Album already paid")
        
        # Update payment_status to 'requested'
        await conn.execute(
            "UPDATE albums SET payment_status = 'requested', updated_at = $1 WHERE id = $2",
            datetime.utcnow(), album["id"]
        )
        
        return {
            "status": "success",
            "message": "Payment request sent to staff",
            "album_code": album_code
        }

@router.get("/event/{event_id}/payment-requests")
async def get_payment_requests(event_id: int, request: Request):
    """Get albums with pending payment requests for an event"""
    user = await get_current_user_from_request(request)
    
    async with db_pool.acquire() as conn:
        # Verify user has access
        event = await conn.fetchrow(
            "SELECT user_id FROM events WHERE id = $1", event_id
        )
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        if str(event["user_id"]) != str(user["id"]):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get albums with payment_status = 'requested'
        rows = await conn.fetch("""
            SELECT id, code, owner_name, owner_email, status, payment_status, created_at,
                   (SELECT COUNT(*) FROM album_photos WHERE album_id = albums.id) as photo_count
            FROM albums 
            WHERE event_id = $1 AND payment_status = 'requested'
            ORDER BY updated_at DESC
        """, event_id)
        
        return [dict(row) for row in rows]

@router.get("/event/{event_id}", response_model=List[Album])
async def list_event_albums(event_id: int, request: Request):
    """List all albums for an event (Staff Dashboard)"""
    user = await get_current_user_from_request(request)
    
    async with db_pool.acquire() as conn:
        # Verify user has access to event
        event = await conn.fetchrow(
            "SELECT user_id, organization_id FROM events WHERE id = $1", event_id
        )
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        has_access = str(event["user_id"]) == str(user["id"])
        
        # Check organization membership
        if not has_access and event["organization_id"]:
            is_owner = await conn.fetchval(
                "SELECT 1 FROM organizations WHERE id = $1 AND owner_user_id = $2",
                event["organization_id"], user["id"]
            )
            is_member = await conn.fetchval("""
                SELECT 1 FROM organization_members 
                WHERE organization_id = $1 AND user_id = $2 AND status = 'active'
            """, event["organization_id"], user["id"])
            has_access = is_owner or is_member
        
        if not has_access:
            raise HTTPException(status_code=403, detail="No access to this event")
        
        rows = await conn.fetch("""
            SELECT a.*, 
                   (SELECT COUNT(*) FROM album_photos WHERE album_id = a.id) as photo_count
            FROM albums a 
            WHERE a.event_id = $1 
            ORDER BY a.created_at DESC
        """, event_id)
        
        result = []
        for row in rows:
            album = dict(row)
            album["id"] = str(album["id"])
            album["created_at"] = album["created_at"].isoformat() if album["created_at"] else None
            album["updated_at"] = album["updated_at"].isoformat() if album.get("updated_at") else None
            result.append(album)
        
        return result


@router.get("/{code}/status")
async def get_album_status(code: str):
    """Get album status for polling (lightweight endpoint)"""
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow("""
            SELECT a.id, a.status, a.payment_status, 
                   (SELECT COUNT(*) FROM album_photos WHERE album_id = a.id) as photo_count
            FROM albums a 
            WHERE a.code = $1
        """, code)
        
        if not row:
            raise HTTPException(status_code=404, detail="Album not found")
        
        return {
            "id": str(row["id"]),
            "status": row["status"],
            "payment_status": row["payment_status"],
            "photo_count": row["photo_count"]
        }


@router.get("/event/{event_id}/stats")
async def get_event_album_stats(event_id: int, request: Request):
    """Get album statistics for an event (for dashboard)"""
    user = await get_current_user_from_request(request)
    
    async with db_pool.acquire() as conn:
        # Verify user has access to event
        event = await conn.fetchrow(
            "SELECT user_id, organization_id FROM events WHERE id = $1", event_id
        )
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        has_access = str(event["user_id"]) == str(user["id"])
        
        # Check organization membership
        if not has_access and event["organization_id"]:
            is_owner = await conn.fetchval(
                "SELECT 1 FROM organizations WHERE id = $1 AND owner_user_id = $2",
                event["organization_id"], user["id"]
            )
            is_member = await conn.fetchval("""
                SELECT 1 FROM organization_members 
                WHERE organization_id = $1 AND user_id = $2 AND status = 'active'
            """, event["organization_id"], user["id"])
            has_access = is_owner or is_member
        
        if not has_access:
            raise HTTPException(status_code=403, detail="No access to this event")
        
        # Get album statistics
        stats = await conn.fetchrow("""
            SELECT 
                COUNT(*) as total_albums,
                COUNT(*) FILTER (WHERE status = 'completed') as completed_albums,
                COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_albums,
                COUNT(*) FILTER (WHERE payment_status = 'paid') as paid_albums,
                (SELECT COUNT(*) FROM album_photos ap 
                 JOIN albums al ON ap.album_id = al.id 
                 WHERE al.event_id = $1) as total_photos
            FROM albums a
            WHERE a.event_id = $1
        """, event_id)
        
        return {
            "totalAlbums": stats["total_albums"] or 0,
            "completedAlbums": stats["completed_albums"] or 0,
            "inProgressAlbums": stats["in_progress_albums"] or 0,
            "paidAlbums": stats["paid_albums"] or 0,
            "totalPhotos": stats["total_photos"] or 0,
            "pendingApproval": 0  # TODO: Add approval tracking when column exists
        }

