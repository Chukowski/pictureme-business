import { fal } from "@fal-ai/client";
import { ENV } from "../config/env";

// FAL_KEY is loaded from backend for security
let FAL_KEY: string | undefined = undefined;
let configLoaded = false;

async function ensureConfig() {
  if (configLoaded) return;
  
  try {
    // ENV.API_URL now auto-derives production URLs if not set
    const apiUrl = ENV.API_URL;
    
    if (!apiUrl) {
      console.warn('⚠️ No API URL configured - cannot load FAL config');
      configLoaded = true;
      return;
    }
    
    const response = await fetch(`${apiUrl}/api/config`);
    const config = await response.json();
    
    if (config.falKey) {
      FAL_KEY = config.falKey;
      fal.config({ credentials: FAL_KEY });
    }
  } catch (error) {
    console.warn('⚠️ Failed to load FAL config:', error);
  }
  
  configLoaded = true;
}

export interface PromptSuggestion {
  prompt: string;
  description: string;
}

/**
 * Analyze images and suggest 3 creative prompts using Gemini Flash
 */
export async function suggestPromptsFromImages(
  imageUrls: string[]
): Promise<PromptSuggestion[]> {
  await ensureConfig();
  
  if (!FAL_KEY) {
    throw new Error("FAL_KEY not configured. Backend /api/config endpoint may be unavailable.");
  }

  if (imageUrls.length === 0) {
    throw new Error("At least one image is required for analysis");
  }

  console.log("🔍 Analyzing images to suggest prompts...");

  try {
    // Use Gemini Flash to analyze the images
    const result = await fal.subscribe("fal-ai/google/gemini-2-5-flash/vision", {
      input: {
        prompt: `Analyze these images and suggest 3 creative, diverse prompts for AI image editing. Each prompt should:
1. Transform the scene or setting dramatically
2. Be detailed and specific
3. Be suitable for creating engaging, shareable photos

Format your response as a JSON array with exactly 3 objects, each having:
- "prompt": the detailed editing instruction
- "description": a brief 1-sentence description of the transformation

Example format:
[
  {"prompt": "Place the person on a futuristic Mars colony with red sky, domes, and rovers in the background", "description": "Futuristic space explorer on Mars"},
  {"prompt": "Transform into a renaissance painting with classical architecture, golden hour lighting, and period-appropriate clothing", "description": "Renaissance art masterpiece"},
  {"prompt": "Create an underwater scene with tropical fish, coral reefs, and rays of sunlight filtering through crystal clear water", "description": "Underwater ocean adventure"}
]

Return ONLY the JSON array, no other text.`,
        image_urls: imageUrls,
      },
    });

    console.log("✅ Analysis complete:", result);

    // Parse the response
    const responseText = result.data?.output || "";
    
    // Extract JSON from the response (handle markdown code blocks)
    let jsonText = responseText.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?$/g, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```\n?/g, "").replace(/```\n?$/g, "");
    }

    const suggestions = JSON.parse(jsonText) as PromptSuggestion[];

    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      throw new Error("Invalid response format from AI");
    }

    return suggestions.slice(0, 3); // Ensure we only return 3 suggestions
  } catch (error) {
    console.error("❌ Prompt suggestion error:", error);
    
    // Fallback suggestions
    return [
      {
        prompt: "Transform the background into a tropical beach paradise with palm trees, white sand, and turquoise ocean at sunset",
        description: "Tropical beach paradise"
      },
      {
        prompt: "Place the subject in front of a futuristic city skyline with neon lights, flying cars, and holographic displays at night",
        description: "Futuristic cyberpunk city"
      },
      {
        prompt: "Create a magical forest scene with glowing mushrooms, fireflies, and ancient trees covered in moss under a starry sky",
        description: "Enchanted magical forest"
      }
    ];
  }
}
