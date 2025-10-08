📸 Photo Booth AI — Self-Hosted Implementation Plan (with Model Selection)

✅ Current Status

Feature	Status
Frontend UI (background selector, camera, result)	✅ Complete
iPad responsive layout	✅ Complete
fal.ai API key	✅ Ready
Backend integration	❌ Pending
Database (PostgreSQL)	❌ Pending
Image storage (S3/MinIO)	❌ Pending Lets use Local Storage first
AI processing flow	❌ Pending


⸻

⚙️ Architecture Overview

graph TB
    A[User Selects Background] --> B[Camera Captures Photo]
    B --> C[Upload to S3/MinIO Storage]
    C --> D[Process with fal.ai Model]
    D --> E[AI Combines Photo + Background]
    E --> F[Save Processed Image to S3/MinIO]
    F --> G[Generate Short URL + QR Code]
    G --> H[Display Result to User]
    H --> I{User Action}
    I -->|Download| J[Direct Download]
    I -->|Email| K[Backend Sends via Resend]
    I -->|New Photo| A


⸻

🧩 Environment Variables

Create a .env file:

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/photobooth_ai

# fal.ai credentials
FAL_KEY=your_fal_ai_api_key

# Choose which model to use
# Options:
# fal-ai/bytedance/seedream/v4/edit  (cinematic, multi-image)
# fal-ai/gemini-25-flash-image/edit  (fast, sharp blending)
FAL_MODEL=fal-ai/bytedance/seedream/v4/edit

# Email service
RESEND_API_KEY=your_resend_api_key

# Object Storage
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=admin
S3_SECRET_KEY=secret123
S3_BUCKET_ORIGINALS=photo-originals
S3_BUCKET_PROCESSED=photo-processed
S3_REGION=us-east-1

# Server
BASE_URL=https://yourdomain.com
PORT=8080


⸻

🗄️ Database Schema (PostgreSQL)

-- Processed photos
create table processed_photos (
  id uuid primary key default gen_random_uuid(),
  user_session_id text,
  original_image_url text,
  processed_image_url text,
  background_id text,
  share_code text unique,
  created_at timestamptz default now()
);

-- Email logs
create table email_deliveries (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid references processed_photos(id) on delete cascade,
  email_address text not null,
  sent_at timestamptz default now(),
  delivery_status text default 'sent'
);


⸻

🗂️ Object Storage (S3 / MinIO)

Start MinIO via Docker:

docker run -d -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=admin \
  -e MINIO_ROOT_PASSWORD=secret123 \
  -v ~/data/minio:/data \
  minio/minio server /data --console-address ":9001"

Create buckets:
	•	photo-originals
	•	photo-processed

Make photo-processed public if you want shareable QR links.

⸻

🧠 AI Processing Service

File: services/aiProcessor.ts

import { fal } from "@fal-ai/client";

fal.config({ credentials: process.env.FAL_KEY });

export async function processImage(prompt: string, imageUrls: string[]) {
  const model = process.env.FAL_MODEL || "fal-ai/bytedance/seedream/v4/edit";

  const result = await fal.subscribe(model, {
    input: {
      prompt,
      image_urls: imageUrls,
      num_images: 1,
      output_format: "jpeg",
    },
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS") {
        update.logs.map((log) => log.message).forEach(console.log);
      }
    },
  });

  return result.data?.images?.[0]?.url;
}

The model names and usage follow the official API schemas in the docs for [Gemini Image Edit] ￼ and [Seedream v4 Edit] ￼.

⸻

🌐 Backend Endpoints (Express Example)

File: server.ts

import express from "express";
import { processImage } from "./services/aiProcessor";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuid } from "uuid";
import pg from "pg";
import multer from "multer";

const upload = multer();
const app = express();
app.use(express.json({ limit: "10mb" }));

const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
});

app.post("/api/process-photo", upload.single("photo"), async (req, res) => {
  try {
    const { backgroundPrompt, backgroundId } = req.body;
    const imageBase64 = req.file?.buffer.toString("base64");
    const originalKey = `${uuid()}.jpg`;

    await s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_ORIGINALS!,
      Key: originalKey,
      Body: Buffer.from(imageBase64, "base64"),
      ContentType: "image/jpeg",
    }));

    const originalUrl = `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET_ORIGINALS}/${originalKey}`;

    const processedUrl = await processImage(backgroundPrompt, [originalUrl]);

    const processedKey = `${uuid()}.jpg`;
    await s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_PROCESSED!,
      Key: processedKey,
      Body: await fetch(processedUrl!).then(r => r.arrayBuffer()),
      ContentType: "image/jpeg",
    }));

    const shareCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    await db.query(
      `insert into processed_photos (original_image_url, processed_image_url, background_id, share_code)
       values ($1, $2, $3, $4)`,
      [originalUrl, processedUrl, backgroundId, shareCode]
    );

    res.json({
      processedImageUrl: processedUrl,
      shareUrl: `${process.env.BASE_URL}/share/${shareCode}`,
      shareCode,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Processing failed" });
  }
});


⸻

✉️ Email Sending (Optional)

File: services/sendEmail.ts

import fetch from "node-fetch";

export async function sendPhotoEmail(email: string, imageUrl: string) {
  const apiKey = process.env.RESEND_API_KEY;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Photo Booth <noreply@yourdomain.com>",
      to: email,
      subject: "Your AI Photo Booth Image",
      html: `<p>Here’s your photo!</p><img src="${imageUrl}" width="400" />`,
    }),
  });
}


⸻

🧱 Docker Compose (Full Stack)

version: '3.8'
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: photobooth_ai
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - ./data/db:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  minio:
    image: minio/minio
    environment:
      MINIO_ROOT_USER: admin
      MINIO_ROOT_PASSWORD: secret123
    command: server /data
    volumes:
      - ./data/minio:/data
    ports:
      - "9000:9000"

  app:
    build: .
    environment:
      DATABASE_URL: postgresql://user:pass@db:5432/photobooth_ai
      FAL_KEY: ${FAL_KEY}
      FAL_MODEL: ${FAL_MODEL}
      S3_ENDPOINT: http://minio:9000
      RESEND_API_KEY: ${RESEND_API_KEY}
      BASE_URL: http://localhost:8080
    depends_on:
      - db
      - minio
    ports:
      - "8080:8080"


⸻

🧪 Testing Checklist
	•	Capture photo & select background
	•	Uploads original image to S3/MinIO
	•	Calls fal.ai model (Seedream or Gemini)
	•	Displays processed image + QR code
	•	Optional email delivery works
	•	Works on iPad Safari
	•	Works offline in LAN mode

⸻

🧠 Model Reference Summary

Model	Env Var	Use Case	Output
fal-ai/bytedance/seedream/v4/edit	FAL_MODEL	Multi-image, cinematic, fashion shots	JPG
fal-ai/gemini-25-flash-image/edit	FAL_MODEL	Fast, lightweight photo blending	JPG

Docs:/Users/zerker/ai-photo-booth-hub/docs
	•	Gemini Image Edit (Google model) ￼
	•	Bytedance Seedream v4 Edit (Bytedance model) ￼

⸻
