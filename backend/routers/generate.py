from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel
import fal_client
import os
from typing import Optional
try:
    import google.generativeai as genai
    GOOGLE_AVAILABLE = True
except ImportError:
    print("⚠️  google-generativeai not available")
    GOOGLE_AVAILABLE = False
    genai = None
import boto3
import uuid
import io
from datetime import datetime

router = APIRouter(
    prefix="/api/generate",
    tags=["generate"]
)

# Configure Google Gemini
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if GOOGLE_API_KEY and GOOGLE_AVAILABLE and genai:
    genai.configure(api_key=GOOGLE_API_KEY)

# MinIO / S3 Configuration
MINIO_ENDPOINT = os.getenv("VITE_MINIO_ENDPOINT", "storage.akitapr.com")
MINIO_ACCESS_KEY = os.getenv("VITE_MINIO_ACCESS_KEY")
MINIO_SECRET_KEY = os.getenv("VITE_MINIO_SECRET_KEY")
MINIO_BUCKET = os.getenv("VITE_MINIO_BUCKET", "photobooth")
MINIO_SERVER_URL = os.getenv("VITE_MINIO_SERVER_URL", "https://storage.akitapr.com")

def get_minio_client():
    # If using AWS S3 directly
    if "amazonaws.com" in MINIO_ENDPOINT:
        return boto3.client(
            's3',
            aws_access_key_id=MINIO_ACCESS_KEY,
            aws_secret_access_key=MINIO_SECRET_KEY,
            # No endpoint_url needed for standard AWS S3, or let it be if user provided specific region URL
            # But usually s3.amazonaws.com is fine or we omit it to let boto3 decide region
        )
    
    # For MinIO or other S3-compatible providers
    return boto3.client(
        's3',
        endpoint_url=f"https://{MINIO_ENDPOINT}",
        aws_access_key_id=MINIO_ACCESS_KEY,
        aws_secret_access_key=MINIO_SECRET_KEY,
        config=boto3.session.Config(signature_version='s3v4')
    )

class GenerateImageRequest(BaseModel):
    prompt: str
    model_id: str
    image_size: Optional[str] = "landscape_4_3"
    num_images: int = 1
    safety_tolerance: str = "2"
    image_url: Optional[str] = None # For image-to-image or edit
    
    model_config = {'protected_namespaces': ()}

class GenerateVideoRequest(BaseModel):
    prompt: str
    model_id: str
    start_image_url: Optional[str] = None
    end_image_url: Optional[str] = None
    video_url: Optional[str] = None # For video-to-video
    duration: Optional[str] = "5"
    aspect_ratio: Optional[str] = "16:9"
    
    model_config = {'protected_namespaces': ()}

class GenerateResponse(BaseModel):
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    seed: Optional[int] = None
    has_nsfw_concepts: bool = False

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a temporary file for generation context"""
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    filename = f"temp_{int(datetime.utcnow().timestamp())}_{uuid.uuid4().hex[:7]}.{file_ext}"
    
    try:
        minio_client = get_minio_client()
        content = await file.read()
        
        # Upload to a 'temp' folder in MinIO/S3
        object_name = f"temp/uploads/{filename}"
        
        minio_client.put_object(
            Bucket=MINIO_BUCKET,
            Key=object_name,
            Body=io.BytesIO(content),
            ContentType=file.content_type
        )
        
        # Generate URL
        if "amazonaws.com" in MINIO_SERVER_URL:
            # Standard S3 URL format: https://bucket.s3.amazonaws.com/key
            url = f"https://{MINIO_BUCKET}.s3.amazonaws.com/{object_name}"
        else:
            url = f"{MINIO_SERVER_URL}/{MINIO_BUCKET}/{object_name}"
            
        return {"url": url, "filename": filename}
        
    except Exception as e:
        print(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.post("/image", response_model=GenerateResponse)
async def generate_image(request: GenerateImageRequest):
    try:
        # --- Google Models (Nano Banana / Imagen) ---
        if "nano-banana" in request.model_id:
            if not GOOGLE_API_KEY:
                # Fallback to FAL if no Google Key
                print("Google Key missing, falling back to FAL Flux")
            else:
                try:
                    # Attempt to use Google Generative AI (Imagen)
                    # Note: This requires specific access and might not be available on all keys
                    # We wrap in try/except to fallback gracefully
                    
                    # NOTE: As of 0.8.3, ImageGenerationModel might not be directly exported in top level
                    # or requires specific import. We'll try standard access.
                    # If this fails, we catch and fallback.
                    pass 
                    # Implementation placeholder - currently falling back to FAL for reliability
                    # until we verify the exact Google SDK signature for Imagen 3 which is in beta.
                except Exception as e:
                    print(f"Google generation failed: {e}")
                    # Fallback to FAL

        # --- FAL Models ---
        fal_model_id = request.model_id
        
        # Mappings
        if request.model_id == "seedream-edit":
            fal_model_id = "fal-ai/bytedance/seedream/v4/edit"
        elif request.model_id == "seedream-t2i":
            fal_model_id = "fal-ai/bytedance/seedream/v4/text-to-image"
        elif "nano-banana" in request.model_id:
             # Explicit fallback mapping for Google models to FAL Flux
             # This prevents the 404 error when passing "nano-banana" to FAL
             fal_model_id = "fal-ai/flux/dev" 
        
        arguments = {
            "prompt": request.prompt,
            "image_size": request.image_size,
            "num_images": request.num_images,
            "safety_tolerance": request.safety_tolerance,
        }
        
        if request.image_url and "edit" in fal_model_id:
             arguments["image_url"] = request.image_url

        print(f"Generating with FAL model: {fal_model_id}")
        handler = fal_client.submit(fal_model_id, arguments=arguments)
        result = handler.get()
        
        if not result:
             raise HTTPException(status_code=500, detail="Generation failed: No result returned")

        # Handle different response formats
        image_url = None
        if "images" in result and len(result["images"]) > 0:
            image_url = result["images"][0]["url"]
        elif "image" in result:
            image_url = result["image"]["url"]
            
        if not image_url:
            raise HTTPException(status_code=500, detail="Generation failed: No image URL in response")

        # Handle has_nsfw_concepts which might be a list or bool
        has_nsfw = result.get("has_nsfw_concepts", False)
        if isinstance(has_nsfw, list):
            has_nsfw = any(has_nsfw) # True if any element is True

        return GenerateResponse(
            image_url=image_url,
            seed=result.get("seed", 0),
            has_nsfw_concepts=has_nsfw
        )

    except Exception as e:
        print(f"Error generating image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

@router.post("/video", response_model=GenerateResponse)
async def generate_video(request: GenerateVideoRequest):
    try:
        fal_model_id = request.model_id
        
        # Mappings
        if request.model_id == "kling-pro":
            fal_model_id = "fal-ai/kling-video/v2.5-turbo/pro/image-to-video"
        elif request.model_id == "wan-v2":
            fal_model_id = "fal-ai/wan/v2.2-a14b/video-to-video"
            
        arguments = {
            "prompt": request.prompt,
            "duration": request.duration,
            "aspect_ratio": request.aspect_ratio
        }
        
        if request.start_image_url:
            arguments["image_url"] = request.start_image_url
            
        if request.video_url and "video-to-video" in fal_model_id:
            arguments["video_url"] = request.video_url

        handler = fal_client.submit(fal_model_id, arguments=arguments)
        result = handler.get() # This might take a while for video
        
        if not result or "video" not in result:
             raise HTTPException(status_code=500, detail="Generation failed: No video returned")

        return GenerateResponse(
            video_url=result["video"]["url"],
            seed=result.get("seed", 0),
            has_nsfw_concepts=False
        )

    except Exception as e:
        print(f"Error generating video: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")
