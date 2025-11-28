"""
Email Service for PictureMe.Now
Supports AWS SES via SMTP for sending album shares, notifications, etc.
"""

import os
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from typing import Optional, List
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# Email configuration - using functions to get fresh values after dotenv loads
def get_smtp_config():
    """Get SMTP configuration from environment"""
    return {
        "host": os.getenv("SMTP_HOST", "email-smtp.us-east-1.amazonaws.com"),
        "port": int(os.getenv("SMTP_PORT", "587")),
        "username": os.getenv("SMTP_USERNAME", ""),
        "password": os.getenv("SMTP_PASSWORD", ""),
        "from_email": os.getenv("SMTP_FROM_EMAIL", "share@pictureme.now"),
        "from_name": os.getenv("SMTP_FROM_NAME", "PictureMe.Now"),
        "use_tls": os.getenv("SMTP_USE_TLS", "true").lower() == "true",
    }

# Legacy variables for backward compatibility
SMTP_HOST = os.getenv("SMTP_HOST", "email-smtp.us-east-1.amazonaws.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", "share@pictureme.now")
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "PictureMe.Now")
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() == "true"


def is_email_configured() -> bool:
    """Check if email service is properly configured"""
    config = get_smtp_config()
    configured = bool(config['host'] and config['username'] and config['password'] and config['from_email'])
    if not configured:
        logger.warning(f"📧 Email config check - HOST: {'✅' if config['host'] else '❌'}, USER: {'✅' if config['username'] else '❌'}, PASS: {'✅' if config['password'] else '❌'}, FROM: {'✅' if config['from_email'] else '❌'}")
    return configured


def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: Optional[str] = None,
    reply_to: Optional[str] = None,
) -> bool:
    """
    Send an email via SMTP (AWS SES)
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        html_content: HTML body of the email
        text_content: Plain text fallback (optional)
        reply_to: Reply-to email address (optional)
    
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    # Get fresh config values
    config = get_smtp_config()
    
    if not is_email_configured():
        logger.error("Email service not configured. Please set SMTP environment variables.")
        return False
    
    try:
        # Create message
        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = f"{config['from_name']} <{config['from_email']}>"
        message["To"] = to_email
        
        if reply_to:
            message["Reply-To"] = reply_to
        
        # Add plain text version
        if text_content:
            part1 = MIMEText(text_content, "plain")
            message.attach(part1)
        
        # Add HTML version
        part2 = MIMEText(html_content, "html")
        message.attach(part2)
        
        # Connect and send
        logger.info(f"📧 Connecting to SMTP: {config['host']}:{config['port']}")
        context = ssl.create_default_context()
        
        with smtplib.SMTP(config['host'], config['port']) as server:
            if config['use_tls']:
                logger.info("📧 Starting TLS...")
                server.starttls(context=context)
            logger.info(f"📧 Logging in as {config['username'][:4]}...{config['username'][-4:] if len(config['username']) > 8 else ''}...")
            server.login(config['username'], config['password'])
            logger.info(f"📧 Sending from {config['from_email']} to {to_email}...")
            server.sendmail(config['from_email'], to_email, message.as_string())
        
        logger.info(f"✅ Email sent successfully to {to_email}")
        return True
        
    except smtplib.SMTPAuthenticationError as e:
        logger.error(f"❌ SMTP authentication failed: {e}")
        return False
    except smtplib.SMTPException as e:
        logger.error(f"❌ SMTP error sending email: {e}")
        return False
    except Exception as e:
        logger.error(f"❌ Unexpected error sending email: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False


def send_album_share_email(
    to_email: str,
    visitor_name: Optional[str],
    event_name: str,
    album_url: str,
    brand_name: Optional[str] = None,
    primary_color: str = "#06B6D4",
    photos_count: int = 0,
    event_logo_url: Optional[str] = None,
) -> bool:
    """
    Send album share email to visitor
    
    Args:
        to_email: Recipient email
        visitor_name: Name of the visitor (optional)
        event_name: Name of the event
        album_url: Full URL to the album
        brand_name: Custom brand name (optional, defaults to PictureMe.Now)
        primary_color: Brand primary color for email styling
        photos_count: Number of photos in the album
        event_logo_url: URL to the event logo (optional)
    """
    
    greeting = f"Hi {visitor_name}," if visitor_name else "Hi there,"
    brand = brand_name or "PictureMe.Now"
    
    # Akito mascot SVG (inline for email compatibility)
    akito_svg = '''<svg width="60" height="60" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="45" fill="#06B6D4"/>
        <circle cx="35" cy="40" r="8" fill="white"/>
        <circle cx="65" cy="40" r="8" fill="white"/>
        <circle cx="35" cy="40" r="4" fill="#1a1a1a"/>
        <circle cx="65" cy="40" r="4" fill="#1a1a1a"/>
        <path d="M 30 60 Q 50 80 70 60" stroke="white" stroke-width="4" fill="none" stroke-linecap="round"/>
        <ellipse cx="25" cy="55" rx="6" ry="4" fill="#f472b6" opacity="0.6"/>
        <ellipse cx="75" cy="55" rx="6" ry="4" fill="#f472b6" opacity="0.6"/>
    </svg>'''
    
    # Event logo section
    logo_section = ""
    if event_logo_url:
        logo_section = f'''
        <tr>
            <td align="center" style="padding: 20px 0 0 0;">
                <img src="{event_logo_url}" alt="{event_name}" style="max-width: 150px; max-height: 80px; object-fit: contain;" />
            </td>
        </tr>
        '''
    
    subject = f"Your photos from {event_name} are ready! 📸"
    
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Photos Are Ready!</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">
                    {logo_section}
                    <!-- Header with Akito -->
                    <tr>
                        <td style="background: linear-gradient(135deg, {primary_color} 0%, #7c3aed 100%); border-radius: 16px 16px 0 0; padding: 30px 30px 40px 30px; text-align: center;">
                            <div style="margin-bottom: 15px;">
                                {akito_svg}
                            </div>
                            <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700;">
                                Your Photos Are Ready! 📸
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Body -->
                    <tr>
                        <td style="background-color: #18181b; padding: 40px 30px;">
                            <p style="margin: 0 0 20px; color: #fafafa; font-size: 16px; line-height: 1.6;">
                                {greeting}
                            </p>
                            <p style="margin: 0 0 30px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                                Your photos from <strong style="color: #fafafa;">{event_name}</strong> are ready to view and download!
                                {f' You have <strong style="color: {primary_color};">{photos_count} photos</strong> waiting for you.' if photos_count > 0 else ''}
                            </p>
                            
                            <!-- CTA Button -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="{album_url}" 
                                           style="display: inline-block; background: linear-gradient(135deg, {primary_color} 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px 0 rgba(6, 182, 212, 0.3);">
                                            View My Photos
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 30px 0 0; color: #71717a; font-size: 14px; line-height: 1.6;">
                                Or copy this link:<br>
                                <a href="{album_url}" style="color: {primary_color}; word-break: break-all;">{album_url}</a>
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #0f0f0f; border-radius: 0 0 16px 16px; padding: 30px; text-align: center;">
                            <p style="margin: 0 0 10px; color: #71717a; font-size: 14px;">
                                Powered by <strong style="color: #a1a1aa;">{brand}</strong>
                            </p>
                            <p style="margin: 0; color: #52525b; font-size: 12px;">
                                © {datetime.now().year} {brand}. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""
    
    text_content = f"""
{greeting}

Your photos from {event_name} are ready to view and download!

View your photos here: {album_url}

Powered by {brand}
"""
    
    return send_email(to_email, subject, html_content, text_content)


def send_photo_share_email(
    to_email: str,
    photo_url: str,
    share_url: str,
    event_name: Optional[str] = None,
    brand_name: Optional[str] = None,
    primary_color: str = "#06B6D4",
) -> bool:
    """
    Send single photo share email
    """
    brand = brand_name or "PictureMe.Now"
    event_text = f" from {event_name}" if event_name else ""
    
    subject = f"Check out this photo{event_text}! 📸"
    
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, {primary_color} 0%, #7c3aed 100%); border-radius: 16px 16px 0 0; padding: 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                                📸 Someone shared a photo with you!
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Photo Preview -->
                    <tr>
                        <td style="background-color: #18181b; padding: 30px; text-align: center;">
                            <img src="{photo_url}" alt="Shared photo" style="max-width: 100%; height: auto; border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.5);">
                        </td>
                    </tr>
                    
                    <!-- CTA -->
                    <tr>
                        <td style="background-color: #18181b; padding: 0 30px 30px; text-align: center;">
                            <a href="{share_url}" 
                               style="display: inline-block; background: linear-gradient(135deg, {primary_color} 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 12px; font-size: 16px; font-weight: 600;">
                                View & Download
                            </a>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #0f0f0f; border-radius: 0 0 16px 16px; padding: 20px; text-align: center;">
                            <p style="margin: 0; color: #71717a; font-size: 12px;">
                                Powered by <strong style="color: #a1a1aa;">{brand}</strong>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""
    
    text_content = f"""
Someone shared a photo with you{event_text}!

View and download it here: {share_url}

Powered by {brand}
"""
    
    return send_email(to_email, subject, html_content, text_content)


def send_bulk_album_emails(
    albums: List[dict],
    event_name: str,
    base_url: str,
    brand_name: Optional[str] = None,
    primary_color: str = "#06B6D4",
) -> dict:
    """
    Send emails to multiple album owners
    
    Args:
        albums: List of album dicts with 'code', 'owner_email', 'owner_name'
        event_name: Name of the event
        base_url: Base URL for album links (e.g., https://pictureme.now/user/event)
        brand_name: Optional custom brand name
        primary_color: Brand color
    
    Returns:
        dict with 'sent', 'failed', 'skipped' counts
    """
    results = {"sent": 0, "failed": 0, "skipped": 0, "errors": []}
    
    for album in albums:
        email = album.get("owner_email")
        if not email:
            results["skipped"] += 1
            continue
        
        album_url = f"{base_url}/album/{album.get('code')}"
        photos_count = album.get("photo_count", 0)
        
        success = send_album_share_email(
            to_email=email,
            visitor_name=album.get("owner_name"),
            event_name=event_name,
            album_url=album_url,
            brand_name=brand_name,
            primary_color=primary_color,
            photos_count=photos_count,
        )
        
        if success:
            results["sent"] += 1
        else:
            results["failed"] += 1
            results["errors"].append(email)
    
    return results

