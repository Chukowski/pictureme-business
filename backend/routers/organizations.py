from fastapi import APIRouter, HTTPException, Depends, Request
from typing import List, Optional, Dict, Any
from uuid import UUID
from schemas import (
    Organization, OrganizationCreate, OrganizationMember, OrganizationMemberInvite
)

router = APIRouter(prefix="/api/organizations", tags=["Organizations"])

db_pool = None

def set_db_pool(pool):
    global db_pool
    db_pool = pool

async def get_current_user_from_request(request: Request) -> dict:
    # Import inside function to avoid circular imports
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

@router.get("/me", response_model=List[Organization])
async def get_my_organizations(request: Request):
    """Get organizations where the current user is an owner or member"""
    user = await get_current_user_from_request(request)
    user_id = user["id"]
    
    async with db_pool.acquire() as conn:
        # Get organizations where user is owner or member
        # Using UNION to combine owned and member organizations efficiently
        rows = await conn.fetch("""
            SELECT o.* 
            FROM organizations o
            WHERE o.owner_user_id = $1
            
            UNION
            
            SELECT o.* 
            FROM organizations o
            JOIN organization_members om ON o.id = om.organization_id
            WHERE om.user_id = $1 AND om.status = 'active'
        """, user_id)
        
        return [dict(row) for row in rows]

@router.get("/{org_id}/members", response_model=List[OrganizationMember])
async def get_members(org_id: UUID, request: Request):
    """Get all members of an organization"""
    user = await get_current_user_from_request(request)
    
    async with db_pool.acquire() as conn:
        # Verify user is member or owner
        is_owner = await conn.fetchval(
            "SELECT 1 FROM organizations WHERE id = $1 AND owner_user_id = $2", 
            org_id, user["id"]
        )
        
        is_member = False
        if not is_owner:
            is_member = await conn.fetchval("""
                SELECT 1 FROM organization_members 
                WHERE organization_id = $1 AND user_id = $2 AND status = 'active'
            """, org_id, user["id"])
        
        if not is_member and not is_owner:
            raise HTTPException(status_code=403, detail="Not a member of this organization")
            
        rows = await conn.fetch("SELECT * FROM organization_members WHERE organization_id = $1", org_id)
        return [dict(row) for row in rows]

@router.post("/{org_id}/invite")
async def invite_member(org_id: UUID, invite: OrganizationMemberInvite, request: Request):
    """Invite a user to the organization by email (must exist)"""
    user = await get_current_user_from_request(request)
    
    async with db_pool.acquire() as conn:
        # Verify user is owner or admin
        is_owner = await conn.fetchval(
            "SELECT 1 FROM organizations WHERE id = $1 AND owner_user_id = $2", 
            org_id, user["id"]
        )
        
        if not is_owner:
            role = await conn.fetchval("""
                SELECT role FROM organization_members 
                WHERE organization_id = $1 AND user_id = $2 AND status = 'active'
            """, org_id, user["id"])
            
            if role != 'admin':
                 raise HTTPException(status_code=403, detail="Only admins can invite members")

        # Find user by email
        target_user = await conn.fetchrow("SELECT id FROM users WHERE email = $1", invite.email)
        if not target_user:
            # For MVP, we require user to exist. In future, we could create invited users.
            raise HTTPException(status_code=404, detail="User with this email not found. They must register first.")
        
        if target_user["id"] == user["id"]:
             raise HTTPException(status_code=400, detail="Cannot invite yourself")

        # Check if already member
        existing = await conn.fetchval("""
            SELECT 1 FROM organization_members 
            WHERE organization_id = $1 AND user_id = $2
        """, org_id, target_user["id"])
        
        if existing:
             raise HTTPException(status_code=400, detail="User is already a member of this organization")

        # Add member
        try:
            await conn.execute("""
                INSERT INTO organization_members (organization_id, user_id, role, status)
                VALUES ($1, $2, $3, 'active')
            """, org_id, target_user["id"], invite.role)
        except Exception as e:
            print(f"Error adding member: {e}")
            raise HTTPException(status_code=500, detail="Failed to add member")
            
        return {"status": "success", "message": "User added to organization"}

@router.put("/{org_id}/members/{user_id}")
async def update_member(org_id: UUID, user_id: int, data: Dict[str, Any], request: Request):
    """Update member role or status"""
    current_user = await get_current_user_from_request(request)
    
    async with db_pool.acquire() as conn:
        # Owner or admin can update members
        is_owner = await conn.fetchval(
            "SELECT 1 FROM organizations WHERE id = $1 AND owner_user_id = $2", 
            org_id, current_user["id"]
        )
        
        is_admin = False
        if not is_owner:
            role = await conn.fetchval("""
                SELECT role FROM organization_members 
                WHERE organization_id = $1 AND user_id = $2 AND status = 'active'
            """, org_id, current_user["id"])
            is_admin = role == 'admin'
        
        if not is_owner and not is_admin:
            raise HTTPException(status_code=403, detail="Only owner or admin can manage members")
            
        if "role" in data:
            await conn.execute("""
                UPDATE organization_members SET role = $1 
                WHERE organization_id = $2 AND user_id = $3
            """, data["role"], org_id, user_id)
            
        if "status" in data:
            await conn.execute("""
                UPDATE organization_members SET status = $1 
                WHERE organization_id = $2 AND user_id = $3
            """, data["status"], org_id, user_id)
            
        return {"status": "success"}


@router.delete("/{org_id}/members/{user_id}")
async def remove_member(org_id: UUID, user_id: int, request: Request):
    """Remove a member from the organization"""
    current_user = await get_current_user_from_request(request)
    
    async with db_pool.acquire() as conn:
        # Only owner or admin can remove members
        is_owner = await conn.fetchval(
            "SELECT 1 FROM organizations WHERE id = $1 AND owner_user_id = $2", 
            org_id, current_user["id"]
        )
        
        is_admin = False
        if not is_owner:
            role = await conn.fetchval("""
                SELECT role FROM organization_members 
                WHERE organization_id = $1 AND user_id = $2 AND status = 'active'
            """, org_id, current_user["id"])
            is_admin = role == 'admin'
        
        if not is_owner and not is_admin:
            raise HTTPException(status_code=403, detail="Only owner or admin can remove members")
        
        # Check target is not the owner
        owner_id = await conn.fetchval(
            "SELECT owner_user_id FROM organizations WHERE id = $1", org_id
        )
        if user_id == owner_id:
            raise HTTPException(status_code=400, detail="Cannot remove the organization owner")
        
        # Remove member (or set status to 'removed')
        await conn.execute("""
            DELETE FROM organization_members 
            WHERE organization_id = $1 AND user_id = $2
        """, org_id, user_id)
        
        return {"status": "success", "message": "Member removed"}


@router.put("/{org_id}")
async def update_organization(org_id: UUID, data: Dict[str, Any], request: Request):
    """Update organization details (name, settings)"""
    current_user = await get_current_user_from_request(request)
    
    async with db_pool.acquire() as conn:
        # Only owner can update organization details
        is_owner = await conn.fetchval(
            "SELECT 1 FROM organizations WHERE id = $1 AND owner_user_id = $2", 
            org_id, current_user["id"]
        )
        
        if not is_owner:
            raise HTTPException(status_code=403, detail="Only owner can update organization")
        
        if "name" in data:
            await conn.execute(
                "UPDATE organizations SET name = $1 WHERE id = $2",
                data["name"], org_id
            )
        
        if "settings" in data:
            import json
            await conn.execute(
                "UPDATE organizations SET settings = $1 WHERE id = $2",
                json.dumps(data["settings"]), org_id
            )
        
        return {"status": "success"}


@router.put("/events/{event_id}/assign")
async def assign_event_to_member(event_id: int, data: Dict[str, Any], request: Request):
    """Assign an event to a specific team member"""
    current_user = await get_current_user_from_request(request)
    assigned_user_id = data.get("user_id")
    
    if not assigned_user_id:
        raise HTTPException(status_code=400, detail="user_id is required")
    
    async with db_pool.acquire() as conn:
        # Get event and its organization
        event = await conn.fetchrow(
            "SELECT organization_id, user_id FROM events WHERE id = $1", event_id
        )
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        org_id = event["organization_id"]
        if not org_id:
            raise HTTPException(status_code=400, detail="Event is not part of an organization")
        
        # Verify current user is owner or admin
        is_owner = await conn.fetchval(
            "SELECT 1 FROM organizations WHERE id = $1 AND owner_user_id = $2", 
            org_id, current_user["id"]
        )
        
        is_admin = False
        if not is_owner:
            role = await conn.fetchval("""
                SELECT role FROM organization_members 
                WHERE organization_id = $1 AND user_id = $2 AND status = 'active'
            """, org_id, current_user["id"])
            is_admin = role == 'admin'
        
        if not is_owner and not is_admin:
            raise HTTPException(status_code=403, detail="Only owner or admin can assign events")
        
        # Verify target user is a member
        is_member = await conn.fetchval("""
            SELECT 1 FROM organization_members 
            WHERE organization_id = $1 AND user_id = $2 AND status = 'active'
        """, org_id, assigned_user_id)
        
        # Also allow assigning to owner
        if not is_member:
            owner_id = await conn.fetchval(
                "SELECT owner_user_id FROM organizations WHERE id = $1", org_id
            )
            if assigned_user_id != owner_id:
                raise HTTPException(status_code=400, detail="User is not a member of this organization")
        
        # Update event assignment
        await conn.execute(
            "UPDATE events SET assigned_user_id = $1 WHERE id = $2",
            assigned_user_id, event_id
        )
        
        return {"status": "success", "message": "Event assigned"}

