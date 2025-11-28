from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID

# ===== Organization Schemas =====

class OrganizationBase(BaseModel):
    name: str
    settings: Optional[Dict[str, Any]] = {}

class OrganizationCreate(OrganizationBase):
    slug: Optional[str] = None

class Organization(OrganizationBase):
    id: UUID
    slug: str
    owner_user_id: int
    plan: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True # Pydantic v2 compatibility (orm_mode in v1)

class OrganizationMemberBase(BaseModel):
    role: str
    status: str

class OrganizationMemberInvite(BaseModel):
    email: EmailStr
    role: str = "staff"

class OrganizationMember(OrganizationMemberBase):
    id: UUID
    organization_id: UUID
    user_id: int
    invite_token: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ===== Album Schemas =====

class AlbumBase(BaseModel):
    code: Optional[str] = None # Optional on create, generated if missing
    owner_name: Optional[str] = None
    owner_email: Optional[EmailStr] = None

class AlbumCreate(AlbumBase):
    event_id: int
    organization_id: Optional[UUID] = None

class Album(AlbumBase):
    id: UUID
    event_id: int
    organization_id: Optional[UUID]
    code: str
    status: str
    payment_status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class AlbumPhotoCreate(BaseModel):
    photo_id: str
    station_type: str
    station_id: Optional[str] = None  # For analytics tracking

class AlbumPhoto(AlbumPhotoCreate):
    id: UUID
    album_id: UUID
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True

