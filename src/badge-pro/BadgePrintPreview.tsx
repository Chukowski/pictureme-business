import React, { useEffect, useMemo, useRef } from "react";
import QRCode from "qrcode";
import { BadgeTemplateConfig, DEFAULT_ELEMENT_POSITIONS } from "@/components/templates/BadgeTemplateEditor";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BadgePrintSettings } from "./types";
import { inchesToPx, normalizePrintSettings } from "./units";

export interface BadgeDynamicData {
  photoUrl?: string;
  name?: string;
  eventName?: string;
  date?: string;
  albumCode?: string;
}

interface BadgePrintPreviewProps {
  config: BadgeTemplateConfig;
  print?: BadgePrintSettings;
  albumCode?: string;
  title?: string;
  className?: string;
  visitorData?: BadgeDynamicData;
}

interface RenderOptions {
  canvas: HTMLCanvasElement;
  config: BadgeTemplateConfig;
  print: BadgePrintSettings;
  albumCode?: string;
  data?: BadgeDynamicData;
}

const QR_SIZE_MAP: Record<BadgeTemplateConfig["qrCode"]["size"], number> = {
  small: 0.14,
  medium: 0.18,
  large: 0.22,
};

const PHOTO_SIZE_MAP: Record<BadgeTemplateConfig["photoPlacement"]["size"], number> = {
  small: 0.22,
  medium: 0.3,
  large: 0.38,
};

async function loadImage(url?: string): Promise<HTMLImageElement | undefined> {
  if (!url) return undefined;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (err) => {
        console.warn("Failed to load image", url, err);
        resolve(undefined); // Resolve undefined instead of rejecting to allow rendering rest
    };
    img.src = url;
  });
}

export async function renderBadgeToCanvas({
  canvas,
  config,
  print,
  albumCode,
  data,
}: RenderOptions): Promise<void> {
  const normalizedPrint = normalizePrintSettings(print);
  const widthPx = Math.round(inchesToPx(normalizedPrint.widthInches, normalizedPrint.dpi));
  const heightPx = Math.round(inchesToPx(normalizedPrint.heightInches, normalizedPrint.dpi));
  const bleedPx = Math.round(inchesToPx(normalizedPrint.bleedInches || 0, normalizedPrint.dpi));

  canvas.width = widthPx + bleedPx * 2;
  canvas.height = heightPx + bleedPx * 2;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Base fill
  ctx.fillStyle = config.backgroundColor || "#111827";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Optional background image
  try {
    const bg = await loadImage(config.backgroundUrl);
    if (bg) {
      ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
    }
  } catch (err) {
    console.warn("BadgePro: failed to load background", err);
  }

  const positions = config.useCustomPositions ? (config.customPositions || DEFAULT_ELEMENT_POSITIONS) : DEFAULT_ELEMENT_POSITIONS;

  const toPx = (value: number, total: number) => (value / 100) * total + bleedPx;

  // Photo
  // Calculate size - prioritize custom width if available
  let photoWidth = 0;
  if (config.useCustomPositions && positions.photo?.width) {
     photoWidth = (widthPx * positions.photo.width) / 100;
  } else {
     const photoPercent = PHOTO_SIZE_MAP[config.photoPlacement?.size || "medium"];
     photoWidth = widthPx * photoPercent;
  }
  
  // Force square aspect ratio for photo to match Visual Editor
  const photoHeight = photoWidth;

  const photoX = toPx(positions.photo?.x || 50, widthPx) - photoWidth / 2;
  const photoY = toPx(positions.photo?.y || 20, heightPx) - photoHeight / 2;

  // Draw User Photo or Placeholder
  if (data?.photoUrl) {
    const img = await loadImage(data.photoUrl);
    if (img) {
       ctx.save();
       if (config.photoPlacement?.shape === "circle") {
         ctx.beginPath();
         ctx.ellipse(photoX + photoWidth / 2, photoY + photoHeight / 2, photoWidth / 2, photoHeight / 2, 0, 0, Math.PI * 2);
         ctx.clip();
       } else if (config.photoPlacement?.shape === "rounded") {
         const radius = Math.min(photoWidth, photoHeight) * 0.12;
         roundedRect(ctx, photoX, photoY, photoWidth, photoHeight, radius);
         ctx.clip();
       }
       
       // Draw image with object-fit: cover logic
       const imgAspect = img.width / img.height;
       const targetAspect = photoWidth / photoHeight; // is 1
       let drawX, drawY, drawW, drawH;
       
       if (imgAspect > targetAspect) {
         drawH = photoHeight;
         drawW = photoHeight * imgAspect;
         drawX = photoX - (drawW - photoWidth) / 2;
         drawY = photoY;
       } else {
         drawW = photoWidth;
         drawH = photoWidth / imgAspect;
         drawX = photoX;
         drawY = photoY - (drawH - photoHeight) / 2;
       }
       
       ctx.drawImage(img, drawX, drawY, drawW, drawH);
       ctx.restore();
       
       // Optional: Draw border
       ctx.save();
       ctx.strokeStyle = 'rgba(255,255,255,0.2)';
       ctx.lineWidth = widthPx * 0.005; 
       if (config.photoPlacement?.shape === "circle") {
         ctx.beginPath();
         ctx.ellipse(photoX + photoWidth / 2, photoY + photoHeight / 2, photoWidth / 2, photoHeight / 2, 0, 0, Math.PI * 2);
         ctx.stroke();
       } else if (config.photoPlacement?.shape === "rounded") {
         const radius = Math.min(photoWidth, photoHeight) * 0.12;
         roundedRect(ctx, photoX, photoY, photoWidth, photoHeight, radius);
         ctx.stroke();
       }
       ctx.restore();
    }
  } else {
    // Placeholder logic
    ctx.save();
    if (config.photoPlacement?.shape === "circle") {
      ctx.beginPath();
      ctx.ellipse(photoX + photoWidth / 2, photoY + photoHeight / 2, photoWidth / 2, photoHeight / 2, 0, 0, Math.PI * 2);
      ctx.clip();
    } else if (config.photoPlacement?.shape === "rounded") {
      const radius = Math.min(photoWidth, photoHeight) * 0.12;
      roundedRect(ctx, photoX, photoY, photoWidth, photoHeight, radius);
      ctx.clip();
    }

    // Placeholder gradient
    const photoGradient = ctx.createLinearGradient(photoX, photoY, photoX + photoWidth, photoY + photoHeight);
    photoGradient.addColorStop(0, "#0ea5e9");
    photoGradient.addColorStop(1, "#6366f1");
    ctx.fillStyle = photoGradient;
    ctx.fillRect(photoX, photoY, photoWidth, photoHeight);
    ctx.restore();
  }

  // Text styles
  const nameY = toPx(positions.name?.y || 55, heightPx);
  const eventY = toPx(positions.eventName?.y || 62, heightPx);
  const dateY = toPx(positions.dateTime?.y || 68, heightPx);
  const albumCodeY = toPx(positions.albumCode?.y || 75, heightPx);

  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 4;
  ctx.textBaseline = "middle"; 

  if (config.fields.showName) {
    const fontSize = positions.name?.fontSize 
       ? (heightPx * positions.name.fontSize / 100) // Use visual editor font size
       : config.textStyle?.nameFontSize 
         ? (heightPx * config.textStyle.nameFontSize / 100)
         : Math.max(18, heightPx * 0.06);
       
    ctx.font = `bold ${fontSize}px ${config.textStyle?.fontFamily || 'sans-serif'}`;
    ctx.fillStyle = config.textStyle?.nameColor || "#ffffff";
    ctx.fillText(data?.name || "John Doe", toPx(positions.name?.x || 50, widthPx), nameY);
  }

  if (config.fields.showEventName) {
    const fontSize = positions.eventName?.fontSize
       ? (heightPx * positions.eventName.fontSize / 100)
       : config.textStyle?.eventNameFontSize
         ? (heightPx * config.textStyle.eventNameFontSize / 100)
         : Math.max(12, heightPx * 0.035);

    ctx.font = `${fontSize}px sans-serif`;
    ctx.fillStyle = config.textStyle?.eventNameColor || "rgba(255,255,255,0.85)";
    ctx.fillText(data?.eventName || "Event Name", toPx(positions.eventName?.x || 50, widthPx), eventY);
  }

  if (config.fields.showDateTime) {
    const fontSize = positions.dateTime?.fontSize
       ? (heightPx * positions.dateTime.fontSize / 100)
       : config.textStyle?.dateTimeFontSize
         ? (heightPx * config.textStyle.dateTimeFontSize / 100)
         : Math.max(10, heightPx * 0.03);

    ctx.font = `${fontSize}px sans-serif`;
    ctx.fillStyle = config.textStyle?.dateTimeColor || "rgba(255,255,255,0.7)";
    ctx.fillText(data?.date || "Nov 28 • 2:30 PM", toPx(positions.dateTime?.x || 50, widthPx), dateY);
  }
  
  if (config.fields.showAlbumCode) {
    const fontSize = positions.albumCode?.fontSize
       ? (heightPx * positions.albumCode.fontSize / 100)
       : config.textStyle?.dateTimeFontSize // Fallback
         ? (heightPx * config.textStyle.dateTimeFontSize / 100)
         : Math.max(10, heightPx * 0.03);

    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle = config.textStyle?.dateTimeColor || "rgba(255,255,255,0.7)";
    ctx.fillText(data?.albumCode || albumCode || "CODE", toPx(positions.albumCode?.x || 50, widthPx), albumCodeY);
  }

  // QR
  if (config.qrCode.enabled) {
    let qrSize = 0;
    if (config.useCustomPositions && positions.qrCode?.width) {
       qrSize = (widthPx * positions.qrCode.width) / 100;
    } else {
       const qrPercent = QR_SIZE_MAP[config.qrCode.size || "medium"];
       qrSize = widthPx * qrPercent;
    }
    
    const qrX = toPx(positions.qrCode?.x || 50, widthPx) - qrSize / 2;
    const qrY = toPx(positions.qrCode?.y || 88, heightPx) - qrSize / 2;
    try {
      const qrValue = data?.albumCode 
        ? `${window.location.origin}/booth?album=${data.albumCode}` // Construct full URL if we have context, for now assume albumCode is just the code
        : (albumCode || "sample-code"); 
      
      // NOTE: We should ideally pass the FULL URL in 'data' or construct it. 
      // RegistrationBadgeFlow passes `albumCode`. The QR usually encodes URL.
      // Let's assume 'albumCode' parameter passed here IS the value to encode.
      
      const qrDataUrl = await QRCode.toDataURL(albumCode || "sample-code", {
        width: Math.round(qrSize * 2),
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' } // White background for QR
      });
      const qrImg = await loadImage(qrDataUrl);
      if (qrImg) {
        // Draw rounded rect background for QR to match RegistrationBadgeFlow style
        const padding = qrSize * 0.05;
        ctx.fillStyle = 'white';
        ctx.beginPath();
        roundedRect(ctx, qrX - padding, qrY - padding, qrSize + padding * 2, qrSize + padding * 2, 8);
        ctx.fill();
        
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
      }
    } catch (err) {
      console.warn("BadgePro: failed to render QR", err);
    }
  }

  // Bleed guides (visual only)
  if (bleedPx > 0) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(bleedPx, bleedPx, widthPx, heightPx);
    ctx.restore();
  }
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export function BadgePrintPreview({ config, print, albumCode, title = "Print Preview (300 DPI)", className, visitorData }: BadgePrintPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const normalizedPrint = useMemo(() => normalizePrintSettings(print), [print]);

  const displayDims = useMemo(() => {
    const widthPx = inchesToPx(normalizedPrint.widthInches, normalizedPrint.dpi);
    const heightPx = inchesToPx(normalizedPrint.heightInches, normalizedPrint.dpi);
    const bleedPx = inchesToPx(normalizedPrint.bleedInches || 0, normalizedPrint.dpi);
    const totalWidth = widthPx + bleedPx * 2;
    const totalHeight = heightPx + bleedPx * 2;
    const maxWidth = 420;
    const scale = Math.min(1, maxWidth / totalWidth);
    return {
      cssWidth: totalWidth * scale,
      cssHeight: totalHeight * scale,
      scale,
    };
  }, [normalizedPrint]);

  useEffect(() => {
    if (!canvasRef.current) return;
    let isCancelled = false;
    const run = async () => {
      if (isCancelled || !canvasRef.current) return;
      await renderBadgeToCanvas({
        canvas: canvasRef.current,
        config,
        print: normalizedPrint,
        albumCode,
        data: visitorData,
      });
    };
    void run();
    return () => {
      isCancelled = true;
    };
  }, [config, normalizedPrint, albumCode, visitorData]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm">
          <span>{title}</span>
          <Badge variant="outline" className="text-[11px]">
            {normalizedPrint.widthInches}" × {normalizedPrint.heightInches}" @ {normalizedPrint.dpi} DPI
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3">
        <div
          className="bg-slate-900 border border-slate-800 shadow-inner"
          style={{
            width: displayDims.cssWidth,
            height: displayDims.cssHeight,
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              width: displayDims.cssWidth,
              height: displayDims.cssHeight,
            }}
          />
        </div>
        <p className="text-xs text-slate-500 text-center">
          Scaled preview. Exports keep real pixel size ({Math.round(inchesToPx(normalizedPrint.widthInches, normalizedPrint.dpi))}×
          {Math.round(inchesToPx(normalizedPrint.heightInches, normalizedPrint.dpi))} px).
        </p>
      </CardContent>
    </Card>
  );
}
