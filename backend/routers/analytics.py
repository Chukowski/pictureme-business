"""
Analytics API Router

Endpoints for station analytics, usage tracking, and reporting.
"""

from fastapi import APIRouter, HTTPException, Request
from typing import List, Dict, Any
from datetime import datetime, timedelta

router = APIRouter(
    prefix="/api/analytics",
    tags=["Analytics"],
)

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


async def get_user_id_for_queries(conn, user: dict) -> tuple:
    """
    Get user IDs for database queries.
    Returns (legacy_user_id, uuid_user_id) where legacy is integer and uuid is string.
    """
    user_id = user["id"]
    email = user.get("email")
    
    # Try to find legacy integer ID
    legacy_id = None
    if email:
        legacy_user = await conn.fetchrow(
            "SELECT id FROM users WHERE email = $1",
            email
        )
        if legacy_user:
            legacy_id = legacy_user["id"]
    
    # If user_id looks like an integer, use it directly
    try:
        legacy_id = legacy_id or int(user_id)
    except (ValueError, TypeError):
        pass
    
    return legacy_id, str(user_id)


@router.get("/stations")
async def get_station_analytics(request: Request, event_id: int = None, days: int = 30):
    """Get station usage analytics aggregated by station_type"""
    user = await get_current_user_from_request(request)
    
    async with db_pool.acquire() as conn:
        legacy_id, uuid_id = await get_user_id_for_queries(conn, user)
        
        # Build query based on whether event_id is provided
        since_date = datetime.utcnow() - timedelta(days=days)
        
        if event_id:
            # Verify user has access to event
            event = await conn.fetchrow(
                "SELECT user_id, organization_id FROM events WHERE id = $1", event_id
            )
            if not event:
                raise HTTPException(status_code=404, detail="Event not found")
            
            # Compare as strings to handle both integer and UUID
            has_access = str(event["user_id"]) == uuid_id or (legacy_id and event["user_id"] == legacy_id)
            if not has_access and event["organization_id"]:
                is_owner = await conn.fetchval(
                    "SELECT 1 FROM organizations WHERE id = $1 AND owner_user_id::text = $2",
                    event["organization_id"], uuid_id
                )
                is_member = await conn.fetchval("""
                    SELECT 1 FROM organization_members 
                    WHERE organization_id = $1 AND user_id::text = $2 AND status = 'active'
                """, event["organization_id"], uuid_id)
                has_access = is_owner or is_member
            
            if not has_access:
                raise HTTPException(status_code=403, detail="No access to this event")
            
            rows = await conn.fetch("""
                SELECT 
                    ap.station_type,
                    COUNT(*) as photo_count,
                    COUNT(DISTINCT ap.album_id) as album_count,
                    MIN(ap.created_at) as first_photo,
                    MAX(ap.created_at) as last_photo
                FROM album_photos ap
                JOIN albums a ON ap.album_id = a.id
                WHERE a.event_id = $1 AND ap.created_at >= $2
                GROUP BY ap.station_type
                ORDER BY photo_count DESC
            """, event_id, since_date)
        else:
            # Get all events for user - check both UUID and legacy ID
            rows = await conn.fetch("""
                SELECT 
                    ap.station_type,
                    COUNT(*) as photo_count,
                    COUNT(DISTINCT ap.album_id) as album_count,
                    MIN(ap.created_at) as first_photo,
                    MAX(ap.created_at) as last_photo
                FROM album_photos ap
                JOIN albums a ON ap.album_id = a.id
                JOIN events e ON a.event_id = e.id
                WHERE (e.user_id::text = $1 OR ($2::integer IS NOT NULL AND e.user_id = $2))
                  AND ap.created_at >= $3
                GROUP BY ap.station_type
                ORDER BY photo_count DESC
            """, uuid_id, legacy_id, since_date)
        
        return [
            {
                "station_type": row["station_type"] or "unknown",
                "photo_count": row["photo_count"],
                "album_count": row["album_count"],
                "first_photo": row["first_photo"].isoformat() if row["first_photo"] else None,
                "last_photo": row["last_photo"].isoformat() if row["last_photo"] else None,
            }
            for row in rows
        ]


@router.get("/albums/summary")
async def get_album_summary(request: Request, event_id: int = None, days: int = 30):
    """Get album summary statistics"""
    user = await get_current_user_from_request(request)
    
    async with db_pool.acquire() as conn:
        legacy_id, uuid_id = await get_user_id_for_queries(conn, user)
        since_date = datetime.utcnow() - timedelta(days=days)
        
        if event_id:
            # Verify access (same as above)
            event = await conn.fetchrow(
                "SELECT user_id, organization_id FROM events WHERE id = $1", event_id
            )
            if not event:
                raise HTTPException(status_code=404, detail="Event not found")
            
            has_access = str(event["user_id"]) == uuid_id or (legacy_id and event["user_id"] == legacy_id)
            if not has_access and event["organization_id"]:
                is_owner = await conn.fetchval(
                    "SELECT 1 FROM organizations WHERE id = $1 AND owner_user_id::text = $2",
                    event["organization_id"], uuid_id
                )
                is_member = await conn.fetchval("""
                    SELECT 1 FROM organization_members 
                    WHERE organization_id = $1 AND user_id::text = $2 AND status = 'active'
                """, event["organization_id"], uuid_id)
                has_access = is_owner or is_member
            
            if not has_access:
                raise HTTPException(status_code=403, detail="No access to this event")
            
            row = await conn.fetchrow("""
                SELECT 
                    COUNT(*) as total_albums,
                    COUNT(*) FILTER (WHERE status = 'completed') as completed_albums,
                    COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_albums,
                    COUNT(*) FILTER (WHERE payment_status = 'paid') as paid_albums,
                    (SELECT COUNT(*) FROM album_photos ap JOIN albums a ON ap.album_id = a.id 
                     WHERE a.event_id = $1) as total_photos
                FROM albums
                WHERE event_id = $1 AND created_at >= $2
            """, event_id, since_date)
        else:
            row = await conn.fetchrow("""
                SELECT 
                    COUNT(*) as total_albums,
                    COUNT(*) FILTER (WHERE a.status = 'completed') as completed_albums,
                    COUNT(*) FILTER (WHERE a.status = 'in_progress') as in_progress_albums,
                    COUNT(*) FILTER (WHERE a.payment_status = 'paid') as paid_albums,
                    (SELECT COUNT(*) FROM album_photos ap JOIN albums alb ON ap.album_id = alb.id 
                     JOIN events e ON alb.event_id = e.id 
                     WHERE e.user_id::text = $1 OR ($2::integer IS NOT NULL AND e.user_id = $2)) as total_photos
                FROM albums a
                JOIN events e ON a.event_id = e.id
                WHERE (e.user_id::text = $1 OR ($2::integer IS NOT NULL AND e.user_id = $2))
                  AND a.created_at >= $3
            """, uuid_id, legacy_id, since_date)
        
        return {
            "total_albums": row["total_albums"],
            "completed_albums": row["completed_albums"],
            "in_progress_albums": row["in_progress_albums"],
            "paid_albums": row["paid_albums"],
            "total_photos": row["total_photos"],
            "period_days": days
        }


@router.get("/tokens/usage")
async def get_token_usage_by_type(request: Request, days: int = 30):
    """Get token usage broken down by type (booth, video, badge, etc.)"""
    user = await get_current_user_from_request(request)
    
    async with db_pool.acquire() as conn:
        legacy_id, uuid_id = await get_user_id_for_queries(conn, user)
        since_date = datetime.utcnow() - timedelta(days=days)
        
        if not legacy_id:
            # No legacy user, return empty list
            return []
        
        rows = await conn.fetch("""
            SELECT 
                COALESCE(description, 'generation') as usage_type,
                SUM(ABS(amount)) as tokens_used,
                COUNT(*) as transaction_count
            FROM token_transactions
            WHERE user_id = $1 
              AND amount < 0 
              AND created_at >= $2
            GROUP BY COALESCE(description, 'generation')
            ORDER BY tokens_used DESC
        """, legacy_id, since_date)
        
        return [
            {
                "type": row["usage_type"],
                "tokens_used": row["tokens_used"],
                "transaction_count": row["transaction_count"]
            }
            for row in rows
        ]

