"""
CouchDB Service
Handles all CouchDB operations for events, templates, and photos metadata
"""
import os
from typing import Optional, List, Dict, Any
from datetime import datetime

import requests

from couchdb3 import Server

class CouchDBService:
    def __init__(self):
        self.url = os.getenv("COUCHDB_URL", "https://couch.pictureme.now")
        self.user = os.getenv("COUCHDB_USER", "akitapr")
        self.password = os.getenv("COUCHDB_PASSWORD", "hqq1dcnaccib3rfc")
        self.events_db_name = os.getenv("COUCHDB_DB_EVENTS", "pictureme_events")
        self.photos_db_name = os.getenv("COUCHDB_DB_PHOTOS", "pictureme_photos")
        
        # Connect to CouchDB
        self.server = Server(
            self.url,
            user=self.user,
            password=self.password
        )
        self.auth = (self.user, self.password)
        
        # Initialize databases
        self._init_databases()
        self._ensure_indexes()
    
    def _init_databases(self):
        """Create databases if they don't exist"""
        try:
            # Events database
            try:
                self.events_db = self.server[self.events_db_name]
                print(f"✅ Connected to CouchDB database: {self.events_db_name}")
            except KeyError:
                # Database doesn't exist, create it
                self.server.create(self.events_db_name)
                self.events_db = self.server[self.events_db_name]
                print(f"✅ Created CouchDB database: {self.events_db_name}")
            
            # Photos database
            try:
                self.photos_db = self.server[self.photos_db_name]
                print(f"✅ Connected to CouchDB database: {self.photos_db_name}")
            except KeyError:
                # Database doesn't exist, create it
                self.server.create(self.photos_db_name)
                self.photos_db = self.server[self.photos_db_name]
                print(f"✅ Created CouchDB database: {self.photos_db_name}")
            
        except Exception as e:
            print(f"❌ Error initializing CouchDB: {e}")
            raise
    
    def _ensure_indexes(self):
        """Create Mango indexes for common queries"""
        try:
            # Events indexes
            self._create_index(self.events_db_name, ["type", "user_id"], "idx_events_user")
            self._create_index(self.events_db_name, ["type", "user_id", "slug"], "idx_events_user_slug")
            self._create_index(self.events_db_name, ["type", "created_at"], "idx_events_created")
            self._create_index(self.events_db_name, ["type", "user_id", "slug", "updated_at"], "idx_events_user_slug_updated")
            self._create_index(self.events_db_name, ["type", "postgres_event_id"], "idx_events_postgres_id")

            # Photos indexes
            self._create_index(self.photos_db_name, ["type", "event_id"], "idx_photos_event")
            self._create_index(self.photos_db_name, ["type", "event_slug"], "idx_photos_event_slug")
            self._create_index(self.photos_db_name, ["type", "share_code"], "idx_photos_share")
            self._create_index(self.photos_db_name, ["type", "event_id", "created_at"], "idx_photos_event_created")
        except Exception as e:
            print(f"⚠️ Warning creating CouchDB indexes: {e}")

    def _create_index(self, db_name: str, fields: List[str], name: str):
        """Create a Mango index if it doesn't exist"""
        url = f"{self.url}/{db_name}/_index"
        payload = {
            "index": {"fields": fields},
            "name": name,
            "type": "json"
        }
        try:
            response = requests.post(url, json=payload, auth=self.auth, timeout=10)
            if response.status_code not in [200, 201]:
                # Ignore index already exists errors
                if response.status_code not in (200, 201, 400, 409):
                    print(f"⚠️ Warning creating index {name}: {response.text}")
        except Exception as e:
            print(f"⚠️ Error creating index {name}: {e}")

    def _find_documents(
        self,
        db_name: str,
        selector: Dict[str, Any],
        limit: int = 100,
        sort: Optional[List[Dict[str, str]]] = None,
        skip: int = 0
    ) -> List[Dict[str, Any]]:
        """Run a Mango query and return matching documents"""
        url = f"{self.url}/{db_name}/_find"
        payload: Dict[str, Any] = {
            "selector": selector,
            "limit": limit,
        }
        if sort:
            payload["sort"] = sort
        if skip:
            payload["skip"] = skip

        try:
            response = requests.post(url, json=payload, auth=self.auth, timeout=10)
            response.raise_for_status()
            data = response.json()
            return data.get("docs", [])
        except Exception as e:
            print(f"⚠️ CouchDB query error ({db_name}): {e}")
            return []
    
    # ==================== EVENTS ====================
    
    def create_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new event in CouchDB"""
        import uuid
        
        event_data["created_at"] = datetime.utcnow().isoformat()
        event_data["updated_at"] = datetime.utcnow().isoformat()
        event_data["type"] = "event"
        
        # Generate a unique ID if not provided
        if "_id" not in event_data:
            event_data["_id"] = str(uuid.uuid4())
        
        # Use create() method
        try:
            result = self.events_db.create(event_data)
            print(f"CouchDB create result: {result}, type: {type(result)}")
            
            # Handle different return types
            if isinstance(result, tuple):
                if len(result) == 2:
                    doc_id, doc_rev = result
                elif len(result) == 3:
                    # Format: (doc_id, success_bool, doc_rev)
                    doc_id, _, doc_rev = result
                else:
                    doc_id = result[0]
                    doc_rev = result[-1]  # Last element is usually the rev
            elif isinstance(result, dict):
                doc_id = result.get("id", event_data["_id"])
                doc_rev = result.get("rev")
            else:
                raise ValueError(f"Unexpected result type from CouchDB: {type(result)}")
            
            event_data["_id"] = doc_id
            event_data["_rev"] = doc_rev
            return event_data
        except Exception as e:
            print(f"Error creating event: {e}")
            raise
    
    def get_event_by_id(self, event_id: str) -> Optional[Dict[str, Any]]:
        """Get an event by its CouchDB _id"""
        try:
            return self.events_db[event_id]
        except:
            return None
    
    def get_events_by_user(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all events for a user"""
        selector = {
            "type": "event",
            "user_id": user_id
        }
        docs = self._find_documents(
            self.events_db_name,
            selector,
            limit=500
        )
        # Deduplicate by slug, keeping the most recently updated event
        deduped: Dict[str, Dict[str, Any]] = {}
        for doc in docs:
            slug = doc.get("slug") or doc.get("_id")
            existing_doc = deduped.get(slug)
            if not existing_doc:
                deduped[slug] = doc
            else:
                current_ts = doc.get("updated_at") or ""
                existing_ts = existing_doc.get("updated_at") or ""
                if current_ts >= existing_ts:
                    deduped[slug] = doc

        deduped_docs = list(deduped.values())
        deduped_docs.sort(key=lambda doc: doc.get("created_at", ""), reverse=True)
        return deduped_docs
    
    def get_event_by_slug(self, user_id: str, slug: str) -> Optional[Dict[str, Any]]:
        """Get an event by user_id and slug"""
        selector = {
            "type": "event",
            "user_id": user_id,
            "slug": slug
        }
        docs = self._find_documents(
            self.events_db_name,
            selector,
            limit=5,
            sort=[{"updated_at": "desc"}]
        )
        return docs[0] if docs else None

    def get_event_by_postgres_id(self, postgres_event_id: int) -> Optional[Dict[str, Any]]:
        selector = {
            "type": "event",
            "postgres_event_id": postgres_event_id
        }
        docs = self._find_documents(
            self.events_db_name,
            selector,
            limit=1
        )
        return docs[0] if docs else None
    
    def update_event(self, event_id: str, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update an existing event"""
        existing = self.events_db[event_id]
        
        # Preserve _id and _rev
        event_data["_id"] = existing["_id"]
        event_data["_rev"] = existing["_rev"]
        event_data["updated_at"] = datetime.utcnow().isoformat()
        event_data["type"] = existing.get("type", "event")
        event_data["user_id"] = existing.get("user_id")
        if existing.get("user_slug") and "user_slug" not in event_data:
            event_data["user_slug"] = existing.get("user_slug")
        if existing.get("username") and "username" not in event_data:
            event_data["username"] = existing.get("username")
        if existing.get("user_full_name") and "user_full_name" not in event_data:
            event_data["user_full_name"] = existing.get("user_full_name")
        
        # Update the document using save() method
        result = self.events_db.save(event_data)
        if isinstance(result, tuple) and len(result) >= 2:
            event_data["_rev"] = result[-1]  # Last element is the rev
        elif isinstance(result, dict) and "_rev" in result:
            event_data["_rev"] = result["_rev"]
        
        return event_data
    
    def delete_event(self, event_id: str) -> bool:
        """Delete an event"""
        try:
            doc = self.events_db[event_id]
            self.events_db.delete(doc["_id"], rev=doc.get("_rev"))
            return True
        except Exception as e:
            print(f"⚠️ Error deleting event {event_id}: {e}")
            return False
    
    # ==================== PHOTOS ====================
    
    def create_photo(self, photo_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new photo record in CouchDB"""
        import uuid
        
        photo_data.setdefault("created_at", int(datetime.utcnow().timestamp() * 1000))
        photo_data.setdefault("type", "photo")
        photo_data.setdefault("share_code", uuid.uuid4().hex[:6].upper())
        
        # Generate a unique ID if not provided
        if "_id" not in photo_data:
            photo_data["_id"] = str(uuid.uuid4())
        
        # Use create() method - returns tuple (doc_id, success, doc_rev)
        try:
            result = self.photos_db.create(photo_data)
            if isinstance(result, tuple):
                doc_id = result[0]
                doc_rev = result[-1]  # Last element is the rev
            else:
                doc_id = photo_data["_id"]
                doc_rev = result.get("rev")
            
            photo_data["_id"] = doc_id
            if doc_rev:
                photo_data["_rev"] = doc_rev
            return photo_data
        except Exception as e:
            print(f"Error creating photo: {e}")
            raise
    
    def get_photo_by_share_code(self, share_code: str) -> Optional[Dict[str, Any]]:
        """Get a photo by its share code"""
        selector = {
            "type": "photo",
            "share_code": share_code
        }
        docs = self._find_documents(
            self.photos_db_name,
            selector,
            limit=1
        )
        return docs[0] if docs else None
    
    def get_photos_by_event(self, event_id: str, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        """Get all photos for an event"""
        selector = {
            "type": "photo",
            "event_id": event_id
        }
        docs = self._find_documents(
            self.photos_db_name,
            selector,
            limit=limit,
            sort=[{"created_at": "desc"}],
            skip=offset
        )
        return docs
    
    def delete_photo(self, photo_id: str) -> bool:
        """Delete a photo record"""
        try:
            doc = self.photos_db[photo_id]
            self.photos_db.delete(doc)
            return True
        except:
            return False

# Global instance
couch_service = None

def get_couch_service() -> CouchDBService:
    """Get or create CouchDB service instance"""
    global couch_service
    if couch_service is None:
        couch_service = CouchDBService()
    return couch_service

