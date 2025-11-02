# Media Library & Prompt Suggestions

## Overview
Two new features have been added to improve the event management experience:

1. **Media Library**: A centralized repository for all your uploaded images
2. **Prompt Suggestions**: Pre-built AI prompt templates for common scenarios

## Media Library

### Features
- **Centralized Storage**: All uploaded images are stored in MinIO under `users/{userSlug}/media/`
- **Reusable Assets**: Upload once, use in multiple templates and events
- **Visual Selection**: Click on any image to add it to your current template
- **Easy Management**: Delete unused media directly from the library
- **Auto-Upload**: Images uploaded via file input are automatically added to the library

### Usage
1. Open the event form and expand a template
2. Scroll to the "Background Images" section
3. The Media Library will display all your uploaded images
4. Click "Upload" to add new images to your library
5. Click any image to add it to the current template
6. Hover over an image and click the trash icon to delete it

### API Endpoints
- `GET /api/media/library` - Get all media for current user
- `POST /api/media/upload` - Upload a new file to the library
- `DELETE /api/media/{filename}` - Delete a file from the library

### Storage Structure
```
MinIO Bucket: photobooth
└── users/
    └── {userSlug}/
        ├── media/              # General media library
        │   ├── media_1762103922508_736ed9e.jpeg
        │   ├── media_1762103945123_a1b2c3d.png
        │   └── ...
        └── templates/          # Template-specific images
            ├── template_1762103922508_736ed9e.jpeg
            ├── template_1762104567890_abc123d.png
            └── ...
```

**Important**: All images are now stored in user-specific folders to:
- Prevent duplication across users
- Allow users to manage their own media
- Enable easy cleanup of user data
- Maintain privacy and organization

## Prompt Suggestions

### Features
- **8 Pre-built Templates**: Professional prompts for common scenarios
- **Category Filtering**: Filter by Corporate, Technology, Outdoor, Creative, Healthcare, Lifestyle, Travel, Events
- **Tag System**: Each prompt has descriptive tags for easy discovery
- **One-Click Apply**: Click any suggestion to instantly apply it to your template
- **Visual Feedback**: See which prompt is currently selected

### Available Categories
1. **Corporate**: Professional business environments
2. **Technology**: Modern tech workspaces and labs
3. **Outdoor**: Nature and adventure scenes
4. **Creative**: Artistic studios and creative spaces
5. **Healthcare**: Medical facilities and professional settings
6. **Lifestyle**: Urban and casual lifestyle scenes
7. **Travel**: Beach, vacation, and travel destinations
8. **Events**: Conference and speaking engagements

### Usage
1. Open the event form and expand a template
2. Scroll to the "AI Prompt" section
3. Below the prompt textarea, you'll see the Prompt Suggestions panel
4. Click "All" or a specific category to filter suggestions
5. Click any suggestion card to apply it to your template
6. The prompt will be copied to the textarea automatically

### Customization
You can modify the applied prompt after selection to fine-tune it for your specific needs.

### Adding New Suggestions
To add new prompt suggestions, edit the `PROMPT_SUGGESTIONS` array in `backend/main.py`:

```python
{
    "id": "unique_id",
    "category": "Category Name",
    "name": "Display Name",
    "prompt": "Full AI prompt text...",
    "tags": ["tag1", "tag2", "tag3"]
}
```

## Benefits

### For Event Creators
- **Faster Setup**: Reuse images and prompts across multiple events
- **Consistency**: Maintain a consistent visual style with your media library
- **Inspiration**: Use prompt suggestions as a starting point for custom prompts
- **Less Storage**: Upload once, reference many times

### For System Performance
- **Reduced Uploads**: Fewer duplicate uploads to MinIO
- **Better Organization**: All user media in one place
- **Easier Cleanup**: Delete unused media in bulk

## Technical Details

### Frontend Components
- `src/components/MediaLibrary.tsx` - Media library UI component
- `src/components/PromptSuggestions.tsx` - Prompt suggestions UI component
- `src/pages/AdminEventForm.tsx` - Integrated into event form

### Backend Endpoints
- `backend/main.py` - Media library and prompt suggestion endpoints
- Uses MinIO for file storage
- JWT authentication required for media operations

### Database
- Media metadata is not stored in PostgreSQL/CouchDB
- Media URLs are stored directly in event templates
- MinIO serves as the source of truth for available media

## Future Enhancements
- [ ] Media tagging and search
- [ ] Bulk upload support
- [ ] Image editing/cropping in the browser
- [ ] Prompt versioning and favorites
- [ ] Community prompt sharing
- [ ] AI-powered prompt generation

