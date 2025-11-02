/**
 * Image Composition Service
 * Creates vertical composition with Siemens Healthineers branding
 * Layout: Logo (top) + AI Image (middle) + Footer (bottom)
 */

import logoSiemens from '@/assets/backgrounds/logo-siemens.png';
import footerDoLess from '@/assets/backgrounds/Footer_DoLess_Transparent.png';

const LOGO_PATH = logoSiemens;
const FOOTER_PATH = footerDoLess;

export interface CompositionOptions {
  logoHeight?: number;
  footerHeight?: number;
  spacing?: number;
  backgroundColor?: string; // Footer and tagline background color
  headerBackgroundColor?: string; // Header background color (for logo section)
  taglineText?: string;
  includeHeader?: boolean;
  campaignText?: string; // Text overlay on AI image (e.g., "Need extra hands?")
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
    taglineText = 'With Atellica systems, our goal is simple: less.',
    includeHeader = false,
    campaignText,
  } = options;

  try {
    // Load all images
    const [aiImage, logoImage, footerImage] = await Promise.all([
      loadImage(imageUrl),
      loadImage(LOGO_PATH),
      loadImage(FOOTER_PATH),
    ]);

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
    const headerHeight = includeHeader ? Math.round(aiImageHeight * 0.16) : 0;
    const footerHeightPx = footerHeight ?? Math.round(aiImageHeight * 0.20); // Reduced footer size
    const taglineHeight = Math.round(aiImageHeight * 0.05); // Smaller tagline band
    const gap = Math.round((spacing ?? aiImageHeight * 0.01)); // Smaller gap

    // Background bands for header, tagline and footer
    // Header: use headerBackgroundColor (white for glares)
    if (includeHeader && headerHeight > 0) {
      ctx.fillStyle = headerBackgroundColor;
      ctx.fillRect(0, 0, aiImageWidth, headerHeight);
    }
    
    // Tagline and footer: use backgroundColor (black)
    ctx.fillStyle = backgroundColor;
    const taglineTop = aiImageHeight - footerHeightPx - gap - taglineHeight;
    ctx.fillRect(0, taglineTop, aiImageWidth, taglineHeight);
    ctx.fillRect(0, aiImageHeight - footerHeightPx, aiImageWidth, footerHeightPx);

    // Draw Siemens logo centered in header if enabled
    if (includeHeader && headerHeight > 0) {
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

    // Render tagline text (smaller, above footer)
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

    // Draw footer graphic centered within footer band
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
 * Apply branding to a base64 image
 */
export async function applyBrandingToBase64(
  base64Image: string,
  options?: CompositionOptions
): Promise<string> {
  return applyBrandingOverlay(base64Image, options);
}

