"""
Email Router for PictureMe.Now
Endpoints for sending emails via AWS SES
"""

from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import logging

from services.email_service import (
    is_email_configured,
    send_email,
    send_album_share_email,
    send_photo_share_email,
    send_bulk_album_emails,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/email", tags=["Email"])

# Store reference to DB pool (set by main.py)
db_pool = None


def set_db_pool(pool):
    global db_pool
    db_pool = pool


# Request Models
class SendPhotoEmailRequest(BaseModel):
    to_email: EmailStr
    photo_url: str
    share_url: str
    event_name: Optional[str] = None
    brand_name: Optional[str] = None
    primary_color: Optional[str] = "#06B6D4"


class SendAlbumEmailRequest(BaseModel):
    to_email: EmailStr
    album_url: str
    visitor_name: Optional[str] = None
    event_name: str
    brand_name: Optional[str] = None
    primary_color: Optional[str] = "#06B6D4"
    photos_count: Optional[int] = 0


class SendBulkAlbumEmailsRequest(BaseModel):
    event_id: int
    base_url: str
    brand_name: Optional[str] = None
    primary_color: Optional[str] = "#06B6D4"


class GenericEmailRequest(BaseModel):
    to_email: EmailStr
    subject: str
    html_content: str
    text_content: Optional[str] = None
    reply_to: Optional[str] = None


# Endpoints
@router.get("/status")
async def get_email_status():
    """Check if email service is configured"""
    return {
        "configured": is_email_configured(),
        "message": "Email service is ready" if is_email_configured() else "Email service not configured. Please set SMTP environment variables."
    }


@router.post("/send/photo")
async def send_photo_email(request: SendPhotoEmailRequest):
    """Send a single photo share email"""
    if not is_email_configured():
        raise HTTPException(status_code=503, detail="Email service not configured")
    
    success = send_photo_share_email(
        to_email=request.to_email,
        photo_url=request.photo_url,
        share_url=request.share_url,
        event_name=request.event_name,
        brand_name=request.brand_name,
        primary_color=request.primary_color or "#06B6D4",
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send email")
    
    return {"success": True, "message": f"Email sent to {request.to_email}"}


@router.post("/send/album")
async def send_album_email(request: SendAlbumEmailRequest):
    """Send album share email to a visitor"""
    if not is_email_configured():
        raise HTTPException(status_code=503, detail="Email service not configured")
    
    success = send_album_share_email(
        to_email=request.to_email,
        visitor_name=request.visitor_name,
        event_name=request.event_name,
        album_url=request.album_url,
        brand_name=request.brand_name,
        primary_color=request.primary_color or "#06B6D4",
        photos_count=request.photos_count or 0,
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send email")
    
    return {"success": True, "message": f"Album email sent to {request.to_email}"}


@router.post("/send/album/{album_code}")
async def send_album_email_by_code(album_code: str, event_name: str, base_url: str, brand_name: Optional[str] = None, primary_color: Optional[str] = "#06B6D4"):
    """Send album share email by album code (looks up email from album record)"""
    if not is_email_configured():
        raise HTTPException(status_code=503, detail="Email service not configured")
    
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")
    
    # Get album details
    async with db_pool.acquire() as conn:
        album = await conn.fetchrow(
            """SELECT a.*, (SELECT COUNT(*) FROM album_photos WHERE album_id = a.id) as photo_count 
               FROM albums a WHERE a.code = $1""", 
            album_code
        )
        
        if not album:
            raise HTTPException(status_code=404, detail="Album not found")
        
        if not album["owner_email"]:
            raise HTTPException(status_code=400, detail="Album has no email address")
        
        album_url = f"{base_url}/album/{album_code}"
        
        success = send_album_share_email(
            to_email=album["owner_email"],
            visitor_name=album["owner_name"],
            event_name=event_name,
            album_url=album_url,
            brand_name=brand_name,
            primary_color=primary_color or "#06B6D4",
            photos_count=album["photo_count"],
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to send email")
        
        return {"success": True, "message": f"Album email sent to {album['owner_email']}"}


@router.post("/send/bulk-albums")
async def send_bulk_album_emails_endpoint(request: SendBulkAlbumEmailsRequest):
    """Send emails to all albums with emails in an event"""
    if not is_email_configured():
        raise HTTPException(status_code=503, detail="Email service not configured")
    
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")
    
    async with db_pool.acquire() as conn:
        # Get event name
        event = await conn.fetchrow("SELECT title FROM events WHERE id = $1", request.event_id)
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        # Get all albums with emails
        albums_rows = await conn.fetch("""
            SELECT a.code, a.owner_email, a.owner_name,
                   (SELECT COUNT(*) FROM album_photos WHERE album_id = a.id) as photo_count
            FROM albums a 
            WHERE a.event_id = $1 AND a.owner_email IS NOT NULL
        """, request.event_id)
        
        albums = [dict(row) for row in albums_rows]
        
        if not albums:
            return {"sent": 0, "failed": 0, "skipped": 0, "message": "No albums with email addresses found"}
        
        results = send_bulk_album_emails(
            albums=albums,
            event_name=event["title"],
            base_url=request.base_url,
            brand_name=request.brand_name,
            primary_color=request.primary_color or "#06B6D4",
        )
        
        return {
            **results,
            "message": f"Sent {results['sent']} emails, {results['failed']} failed, {results['skipped']} skipped"
        }


@router.post("/send/generic")
async def send_generic_email(request: GenericEmailRequest):
    """Send a generic email (for admin use)"""
    if not is_email_configured():
        raise HTTPException(status_code=503, detail="Email service not configured")
    
    success = send_email(
        to_email=request.to_email,
        subject=request.subject,
        html_content=request.html_content,
        text_content=request.text_content,
        reply_to=request.reply_to,
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send email")
    
    return {"success": True, "message": f"Email sent to {request.to_email}"}


@router.post("/test")
async def test_email(to_email: EmailStr):
    """Send a test email to verify configuration"""
    if not is_email_configured():
        raise HTTPException(status_code=503, detail="Email service not configured")
    
    html_content = """
    <div style="font-family: Arial, sans-serif; padding: 20px; background: #0a0a0a; color: #fff;">
        <h1 style="color: #06B6D4;">✅ Email Test Successful!</h1>
        <p>Your PictureMe.Now email configuration is working correctly.</p>
        <p style="color: #71717a; font-size: 12px;">This is a test email from your photo booth platform.</p>
    </div>
    """
    
    success = send_email(
        to_email=to_email,
        subject="PictureMe.Now - Email Test ✅",
        html_content=html_content,
        text_content="Email Test Successful! Your PictureMe.Now email configuration is working correctly.",
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send test email. Check SMTP configuration.")
    
    return {"success": True, "message": f"Test email sent to {to_email}"}

