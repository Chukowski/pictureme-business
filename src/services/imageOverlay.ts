/**
 * Image Composition Service
 * Creates vertical composition with event-specific branding
 * Layout: Logo (top) + AI Image (middle) + Footer (bottom)
 */

export interface WatermarkConfig {
  enabled: boolean;
  type: "image" | "text";
  imageUrl?: string;
  text?: string;
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
  size: number; // Percentage of image width
  opacity: number; // 0-1
}

export interface CompositionOptions {
  logoHeight?: number;
  footerHeight?: number;
  spacing?: number;
  backgroundColor?: string; // Footer and tagline background color
  headerBackgroundColor?: string; // Header background color (for logo section)
  taglineText?: string;
  includeHeader?: boolean;
  campaignText?: string; // Text overlay on AI image (e.g., "Need extra hands?")
  logoUrl?: string; // Custom logo URL (overrides default)
  footerUrl?: string; // Custom footer URL (overrides default)
  watermark?: WatermarkConfig; // Watermark configuration
}

/**
 * Create vertical composition with branding
 * - Logo at the top (separate section)
 * - AI generated image in the middle (9:16 portrait)
 * - Footer at the bottom (separate section)
 */
export async function applyBrandingOverlay(
  imageUrl: string,
  options: CompositionOptions = {}
): Promise<string> {
  const {
    logoHeight,
    footerHeight,
    spacing,
    backgroundColor = '#000000',
    headerBackgroundColor = '#FFFFFF', // Default white for header
    taglineText,
    includeHeader = false,
    campaignText,
    logoUrl,
    footerUrl,
    watermark,
  } = options;

  try {
    // Determine which images to load
    // Only load if explicitly provided (not undefined or empty string)
    const shouldLoadLogo = includeHeader && logoUrl && logoUrl.trim() !== "";
    const shouldLoadFooter = footerUrl && footerUrl.trim() !== "";
    
    // Use provided URLs directly - no defaults unless explicitly set
    const finalLogoPath = shouldLoadLogo ? logoUrl : null;
    const finalFooterPath = shouldLoadFooter ? footerUrl : null;

    // Load images conditionally
    const aiImage = await loadImage(imageUrl);
    const logoImage = finalLogoPath ? await loadImage(finalLogoPath) : null;
    const footerImage = finalFooterPath ? await loadImage(finalFooterPath) : null;

    // AI image should be 9:16 portrait (1080x1920)
    const aiImageWidth = aiImage.width;
    const aiImageHeight = aiImage.height;

    // Prepare canvas (same size as AI image to preserve 9:16 ratio)
    const canvas = document.createElement('canvas');
    canvas.width = aiImageWidth;
    canvas.height = aiImageHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Draw the AI image as the base layer
    ctx.drawImage(aiImage, 0, 0, aiImageWidth, aiImageHeight);

    // Add campaign text overlay on AI image if provided
    if (campaignText) {
      const campaignFontSize = Math.max(36, Math.round(aiImageWidth * 0.055)); // Larger, bold text
      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `700 ${campaignFontSize}px "Inter", "Arial", sans-serif`; // Bold weight
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      // Strong shadow for readability
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = Math.round(campaignFontSize * 0.3);
      ctx.shadowOffsetY = 3;
      
      // Position at top of AI image
      const campaignY = Math.round(aiImageHeight * 0.08);
      ctx.fillText(campaignText, aiImageWidth / 2, campaignY);
      ctx.restore();
    }

    // Define layout proportions based on canvas height
    const headerHeight = (includeHeader && logoImage) ? Math.round(aiImageHeight * 0.16) : 0;
    const footerHeightPx = footerImage ? (footerHeight ?? Math.round(aiImageHeight * 0.20)) : 0; // Only if footer exists
    const taglineHeight = (taglineText && taglineText.trim() !== "") ? Math.round(aiImageHeight * 0.05) : 0; // Only if tagline exists and is not empty
    const gap = Math.round((spacing ?? aiImageHeight * 0.01)); // Smaller gap

    // Background bands for header, tagline and footer
    // Header: use headerBackgroundColor (white for glares)
    if (includeHeader && headerHeight > 0 && logoImage) {
      ctx.fillStyle = headerBackgroundColor;
      ctx.fillRect(0, 0, aiImageWidth, headerHeight);
    }
    
    // Tagline and footer: use backgroundColor (black) - only if they exist
    if (taglineHeight > 0 || footerHeightPx > 0) {
      ctx.fillStyle = backgroundColor;
      const taglineTop = aiImageHeight - footerHeightPx - gap - taglineHeight;
      
      if (taglineHeight > 0) {
        ctx.fillRect(0, taglineTop, aiImageWidth, taglineHeight);
      }
      
      if (footerHeightPx > 0) {
        ctx.fillRect(0, aiImageHeight - footerHeightPx, aiImageWidth, footerHeightPx);
      }
    }

    // Draw logo centered in header if enabled and exists
    if (includeHeader && headerHeight > 0 && logoImage) {
      const logoAspectRatio = logoImage.width / logoImage.height;
      let desiredLogoHeight = logoHeight ?? Math.round(headerHeight * 0.65);
      let logoDrawHeight = Math.min(desiredLogoHeight, headerHeight * 0.85);
      let logoDrawWidth = logoDrawHeight * logoAspectRatio;
      if (logoDrawWidth > aiImageWidth * 0.82) {
        logoDrawWidth = aiImageWidth * 0.82;
        logoDrawHeight = logoDrawWidth / logoAspectRatio;
      }
      const logoY = Math.max((headerHeight - logoDrawHeight) / 2, headerHeight * 0.05);
      const logoX = (aiImageWidth - logoDrawWidth) / 2;
      ctx.drawImage(logoImage, logoX, logoY, logoDrawWidth, logoDrawHeight);
    }

    // Render tagline text (smaller, above footer) - only if provided and not empty
    if (taglineText && taglineText.trim() !== "" && taglineHeight > 0) {
      const taglineTop = aiImageHeight - footerHeightPx - gap - taglineHeight;
      const fontSize = Math.max(20, Math.round(aiImageWidth * 0.028)); // Reduced font size
      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `500 ${fontSize}px "Inter", "Arial", sans-serif`; // Medium weight instead of semibold
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = Math.round(fontSize * 0.4);
      ctx.shadowOffsetY = 1;
      ctx.fillText(taglineText, aiImageWidth / 2, taglineTop + taglineHeight / 2);
      ctx.restore();
    }

    // Draw footer graphic centered within footer band - only if exists
    if (footerImage && footerHeightPx > 0) {
      const footerAspectRatio = footerImage.width / footerImage.height;
      let footerDrawWidth = aiImageWidth * 0.9;
      let footerDrawHeight = footerDrawWidth / footerAspectRatio;
      const maxFooterHeight = footerHeightPx * 0.8;
      if (footerDrawHeight > maxFooterHeight) {
        footerDrawHeight = maxFooterHeight;
        footerDrawWidth = footerDrawHeight * footerAspectRatio;
      }
      const footerX = (aiImageWidth - footerDrawWidth) / 2;
      const footerY = aiImageHeight - footerHeightPx + (footerHeightPx - footerDrawHeight) / 2;
      ctx.drawImage(footerImage, footerX, footerY, footerDrawWidth, footerDrawHeight);
    }

    // Add watermark if enabled
    if (watermark?.enabled) {
      await applyWatermark(ctx, aiImageWidth, aiImageHeight, watermark);
    }

    // Convert canvas to data URL
    return canvas.toDataURL('image/jpeg', 0.95);
  } catch (error) {
    console.error('❌ Failed to create branded composition:', error);
    // Return original image if composition fails
    return imageUrl;
  }
}

/**
 * Helper function to load an image
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));

    img.src = src;
  });
}

/**
 * Apply watermark to canvas
 */
async function applyWatermark(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  watermark: WatermarkConfig
): Promise<void> {
  const padding = 20; // Padding from edges
  
  // Calculate watermark size
  const watermarkWidth = (canvasWidth * watermark.size) / 100;
  
  // Calculate position
  let x = 0;
  let y = 0;
  
  switch (watermark.position) {
    case 'top-left':
      x = padding;
      y = padding;
      break;
    case 'top-right':
      x = canvasWidth - watermarkWidth - padding;
      y = padding;
      break;
    case 'bottom-left':
      x = padding;
      y = canvasHeight - padding;
      break;
    case 'bottom-right':
      x = canvasWidth - watermarkWidth - padding;
      y = canvasHeight - padding;
      break;
    case 'center':
      x = (canvasWidth - watermarkWidth) / 2;
      y = canvasHeight / 2;
      break;
  }
  
  // Set global alpha for opacity
  ctx.save();
  ctx.globalAlpha = watermark.opacity;
  
  if (watermark.type === 'image' && watermark.imageUrl) {
    try {
      const watermarkImage = await loadImage(watermark.imageUrl);
      const aspectRatio = watermarkImage.width / watermarkImage.height;
      const watermarkHeight = watermarkWidth / aspectRatio;
      
      // Adjust y for bottom positions (text is drawn from baseline, images from top)
      if (watermark.position === 'bottom-left' || watermark.position === 'bottom-right') {
        y = y - watermarkHeight;
      }
      
      ctx.drawImage(watermarkImage, x, y, watermarkWidth, watermarkHeight);
    } catch (error) {
      console.error('Failed to load watermark image:', error);
    }
  } else if (watermark.type === 'text' && watermark.text) {
    const fontSize = Math.max(16, Math.round(watermarkWidth * 0.15));
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `600 ${fontSize}px "Inter", "Arial", sans-serif`;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    // Adjust text alignment based on position
    if (watermark.position === 'top-right' || watermark.position === 'bottom-right') {
      ctx.textAlign = 'right';
      x = x + watermarkWidth;
    } else if (watermark.position === 'center') {
      ctx.textAlign = 'center';
      x = x + watermarkWidth / 2;
    } else {
      ctx.textAlign = 'left';
    }
    
    ctx.textBaseline = 'top';
    ctx.fillText(watermark.text, x, y);
  }
  
  ctx.restore();
}

/**
 * Apply branding to a base64 image
 */
export async function applyBrandingToBase64(
  base64Image: string,
  options?: CompositionOptions
): Promise<string> {
  return applyBrandingOverlay(base64Image, options);
}
