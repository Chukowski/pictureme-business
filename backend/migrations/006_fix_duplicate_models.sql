-- Migration: Fix duplicate AI models
-- Date: 2025-11-25
-- Description: Remove duplicate models and add unique constraint

-- ============================================================================
-- REMOVE DUPLICATES (keep the one with lowest id)
-- ============================================================================
DELETE FROM ai_generation_costs a
USING ai_generation_costs b
WHERE a.id > b.id 
  AND a.model_name = b.model_name;

-- ============================================================================
-- ADD UNIQUE CONSTRAINT
-- ============================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ai_generation_costs_model_name_key'
    ) THEN
        ALTER TABLE ai_generation_costs 
        ADD CONSTRAINT ai_generation_costs_model_name_key UNIQUE (model_name);
    END IF;
END $$;

-- ============================================================================
-- VERIFY AND INSERT/UPDATE MODELS
-- ============================================================================
-- Now we can use ON CONFLICT properly

-- Image Models
INSERT INTO ai_generation_costs (model_name, cost_per_generation, description, is_active) VALUES
('seedream-t2i', 5, 'Seedream v4 Text-to-Image - High quality image generation', TRUE),
('seedream-edit', 10, 'Seedream v4 Edit - Image editing and enhancement', TRUE),
('nano-banana', 8, 'Nano Banana (Google Imagen 3) - Fast image generation', TRUE),
('nano-banana-pro', 15, 'Nano Banana Pro - Premium Google Imagen', TRUE),
('flux-realism', 5, 'Flux Realism - Photorealistic images', TRUE)
ON CONFLICT (model_name) DO UPDATE SET
    description = EXCLUDED.description,
    is_active = TRUE;

-- Video Models  
INSERT INTO ai_generation_costs (model_name, cost_per_generation, description, is_active) VALUES
('kling-pro', 50, 'Kling Video v2.5 Pro - Professional video generation', TRUE),
('wan-v2', 40, 'Wan v2.2 Video - Text to video', TRUE),
('google-video', 60, 'Google Gemini Video - Beta video generation', TRUE),
('veo-3.1', 100, 'Veo 3.1 - Google premium video model', TRUE)
ON CONFLICT (model_name) DO UPDATE SET
    description = EXCLUDED.description,
    is_active = TRUE;

-- Legacy FAL models (keep for backwards compatibility but mark as inactive)
INSERT INTO ai_generation_costs (model_name, cost_per_generation, description, is_active) VALUES
('fal-ai/flux/dev', 5, 'Flux Dev - High quality image generation (legacy)', FALSE),
('fal-ai/bytedance/seedream/v4/edit', 10, 'SeedDream v4 - Premium cinematic editing (legacy)', FALSE),
('fal-ai/gemini-25-flash-image/edit', 3, 'Gemini Flash - Fast lightweight editing (legacy)', FALSE),
('fal-ai/kling/v1/standard/image-to-video', 50, 'Kling - Image to video generation (legacy)', FALSE),
('fal-ai/wan/v2.2-a14b/text-to-video', 75, 'Wan - Text to video generation (legacy)', FALSE)
ON CONFLICT (model_name) DO UPDATE SET
    is_active = FALSE;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
COMMENT ON CONSTRAINT ai_generation_costs_model_name_key ON ai_generation_costs IS 'Ensures unique model names';

