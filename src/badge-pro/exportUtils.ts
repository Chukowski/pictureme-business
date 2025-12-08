import { BadgeTemplateConfig } from "@/components/templates/BadgeTemplateEditor";
import { BadgePrintSettings, BadgeProConfig } from "./types";
import { renderBadgeToCanvas, BadgeDynamicData } from "./BadgePrintPreview";
import { normalizePrintSettings } from "./units";

/**
 * Exports the badge as a high-resolution PNG.
 */
export async function exportBadgeAsPng(
  config: BadgeTemplateConfig,
  print: BadgePrintSettings | undefined,
  albumCode?: string,
  filename?: string,
  data?: BadgeDynamicData
): Promise<void> {
  const canvas = document.createElement("canvas");
  // Use default print settings if none provided
  const settings = normalizePrintSettings(print);
  
  await renderBadgeToCanvas({ canvas, config, print: settings, albumCode, data });
  
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("Failed to create PNG blob"));
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename || `badge-${albumCode || 'preview'}.png`;
      link.click();
      URL.revokeObjectURL(url);
      resolve();
    }, "image/png");
  });
}

/**
 * Exports the badge as a print-ready PDF with bleed marks.
 */
export async function exportBadgeAsPdf(
  config: BadgeTemplateConfig,
  print: BadgePrintSettings | undefined,
  albumCode?: string,
  filename?: string,
  data?: BadgeDynamicData
): Promise<void> {
  const blob = await generateBadgePdfBlob(config, print, albumCode, data);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || `badge-${albumCode || 'preview'}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Opens the badge PDF in a new tab for printing.
 */
export async function printBadgeAsPdf(
  config: BadgeTemplateConfig,
  print: BadgePrintSettings | undefined,
  albumCode?: string,
  data?: BadgeDynamicData
): Promise<void> {
  const blob = await generateBadgePdfBlob(config, print, albumCode, data);
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');
  
  // Clean up the URL object after a minute to allow the pdf to load
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  
  if (!printWindow) {
    throw new Error("Pop-up blocked. Please allow pop-ups for this site.");
  }
}

/**
 * Helper to generate the PDF blob
 */
async function generateBadgePdfBlob(
  config: BadgeTemplateConfig,
  print: BadgePrintSettings | undefined,
  albumCode?: string,
  data?: BadgeDynamicData
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const settings = normalizePrintSettings(print);
  
  await renderBadgeToCanvas({ canvas, config, print: settings, albumCode, data });

  const { PDFDocument, rgb } = await import("pdf-lib");
  const pdfDoc = await PDFDocument.create();
  
  const bleedInches = settings.bleedInches || 0;
  const totalWidthInches = settings.widthInches + (bleedInches * 2);
  const totalHeightInches = settings.heightInches + (bleedInches * 2);
  
  // Create page size that matches the full bleed size
  const page = pdfDoc.addPage([totalWidthInches * 72, totalHeightInches * 72]);
  
  const pngDataUrl = canvas.toDataURL("image/png");
  const pngBytes = Uint8Array.from(atob(pngDataUrl.split(",")[1]), (c) => c.charCodeAt(0));
  const pngImage = await pdfDoc.embedPng(pngBytes);

  // Draw the image covering the full page (including bleed)
  page.drawImage(pngImage, {
    x: 0,
    y: 0,
    width: totalWidthInches * 72,
    height: totalHeightInches * 72,
  });

  // Draw Trim Lines (if bleed is present)
  if (bleedInches > 0) {
    const bleedPts = bleedInches * 72;
    const { width, height } = page.getSize();
    
    page.drawRectangle({
      x: bleedPts,
      y: bleedPts,
      width: width - bleedPts * 2,
      height: height - bleedPts * 2,
      borderColor: rgb(1, 0, 0), // Red trim line
      borderWidth: 0.5,
      opacity: 0.5,
    });
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: "application/pdf" });
}
