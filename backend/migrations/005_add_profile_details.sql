-- Add profile details columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;

-- Add profile details columns to Better Auth user table if they don't exist
-- Note: Better Auth might need these to be added via its own schema config if we want strict typing there,
-- but for now we'll add them to the DB so we can sync if needed.
-- However, Better Auth schema is managed by Better Auth. 
-- We will primarily store these in the legacy 'users' table for now as the 'source of truth' for our app's profile view,
-- and sync what we can. Better Auth 'user' table has 'image' (avatar) and 'name'.
-- We can add 'bio' and 'cover_image' to Better Auth 'user' table as well for consistency.

ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS "coverImage" TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS "socialLinks" JSONB DEFAULT '{}'::jsonb;
