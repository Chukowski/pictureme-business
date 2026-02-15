/**
 * Backend API for PostgreSQL operations
 * Handles photo metadata storage and retrieval
 */

import express from 'express';
import cors from 'cors';
import pg from 'pg';
import * as Minio from 'minio';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// MinIO Configuration
const minioClient = new Minio.Client({
  endPoint: process.env.VITE_MINIO_ENDPOINT || 'storage.akitapr.com',
  port: parseInt(process.env.VITE_MINIO_PORT || '443'),
  useSSL: process.env.VITE_MINIO_USE_SSL !== 'false',
  accessKey: process.env.VITE_MINIO_ACCESS_KEY || 'YOUR_MINIO_ACCESS_KEY',
  secretKey: process.env.VITE_MINIO_SECRET_KEY || 'YOUR_MINIO_SECRET_KEY',
});

const BUCKET_NAME = process.env.VITE_MINIO_BUCKET || 'photobooth';
const MINIO_SERVER_URL = process.env.VITE_MINIO_SERVER_URL || 'https://storage.akitapr.com';

// PostgreSQL connection
const pool = new pg.Pool({
  connectionString: process.env.VITE_POSTGRES_URL || 'postgresql://user:password@localhost:5432/photodb',
  ssl: false, // Set to true if your PostgreSQL requires SSL
});

// Initialize database table
async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS photos (
        id VARCHAR(255) PRIMARY KEY,
        original_image_url TEXT NOT NULL,
        processed_image_url TEXT NOT NULL,
        background_id VARCHAR(255) NOT NULL,
        background_name VARCHAR(255) NOT NULL,
        share_code VARCHAR(6) UNIQUE NOT NULL,
        created_at BIGINT NOT NULL,
        prompt TEXT NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_share_code ON photos(share_code);
      CREATE INDEX IF NOT EXISTS idx_created_at ON photos(created_at DESC);
    `);
    console.log('✅ Database initialized');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
  } finally {
    client.release();
  }
}

initDatabase();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Config endpoint - expose public configuration to frontend
app.get('/api/config', (req, res) => {
  res.json({
    falKey: process.env.VITE_FAL_KEY,
    falModel: process.env.VITE_FAL_MODEL || 'fal-ai/bytedance/seedream/v4/edit',
    baseUrl: process.env.VITE_BASE_URL || 'https://photo.akitapr.com',
  });
});

// Get all photos
app.get('/api/photos', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM photos ORDER BY created_at DESC LIMIT 100'
    );
    
    const photos = result.rows.map(row => ({
      id: row.id,
      originalImageUrl: row.original_image_url,
      processedImageUrl: row.processed_image_url,
      backgroundId: row.background_id,
      backgroundName: row.background_name,
      shareCode: row.share_code,
      createdAt: parseInt(row.created_at),
      prompt: row.prompt,
    }));
    
    res.json(photos);
  } catch (error) {
    console.error('Error fetching photos:', error);
    res.status(500).json({ error: 'Failed to fetch photos' });
  }
});

// Get photo by share code
app.get('/api/photos/:shareCode', async (req, res) => {
  try {
    const { shareCode } = req.params;
    const result = await pool.query(
      'SELECT * FROM photos WHERE share_code = $1',
      [shareCode]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    const row = result.rows[0];
    const photo = {
      id: row.id,
      originalImageUrl: row.original_image_url,
      processedImageUrl: row.processed_image_url,
      backgroundId: row.background_id,
      backgroundName: row.background_name,
      shareCode: row.share_code,
      createdAt: parseInt(row.created_at),
      prompt: row.prompt,
    };
    
    res.json(photo);
  } catch (error) {
    console.error('Error fetching photo:', error);
    res.status(500).json({ error: 'Failed to fetch photo' });
  }
});

// Upload photo with base64 images (handles MinIO upload + PostgreSQL save)
app.post('/api/photos/upload', async (req, res) => {
  try {
    const {
      originalImageBase64,
      processedImageBase64,
      backgroundId,
      backgroundName,
      prompt,
    } = req.body;
    
    // Generate IDs
    const photoId = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const shareCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const createdAt = Date.now();
    
    // Convert base64 to buffers
    const originalBuffer = Buffer.from(originalImageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const processedBuffer = Buffer.from(processedImageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    
    // Upload to MinIO
    const originalFileName = `${photoId}_original.jpg`;
    const processedFileName = `${photoId}_processed.jpg`;
    
    await Promise.all([
      minioClient.putObject(BUCKET_NAME, originalFileName, originalBuffer, originalBuffer.length, {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000',
      }),
      minioClient.putObject(BUCKET_NAME, processedFileName, processedBuffer, processedBuffer.length, {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000',
      }),
    ]);
    
    // Generate URLs
    const originalImageUrl = `${MINIO_SERVER_URL}/${BUCKET_NAME}/${originalFileName}`;
    const processedImageUrl = `${MINIO_SERVER_URL}/${BUCKET_NAME}/${processedFileName}`;
    
    // Save metadata to PostgreSQL
    await pool.query(
      `INSERT INTO photos (id, original_image_url, processed_image_url, background_id, background_name, share_code, created_at, prompt)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [photoId, originalImageUrl, processedImageUrl, backgroundId, backgroundName, shareCode, createdAt, prompt]
    );
    
    const cloudPhoto = {
      id: photoId,
      originalImageUrl,
      processedImageUrl,
      backgroundId,
      backgroundName,
      shareCode,
      createdAt,
      prompt,
    };
    
    res.status(201).json(cloudPhoto);
  } catch (error) {
    console.error('Error uploading photo:', error);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

// Create new photo (legacy endpoint for direct metadata save)
app.post('/api/photos', async (req, res) => {
  try {
    const {
      id,
      originalImageUrl,
      processedImageUrl,
      backgroundId,
      backgroundName,
      shareCode,
      createdAt,
      prompt,
    } = req.body;
    
    await pool.query(
      `INSERT INTO photos (id, original_image_url, processed_image_url, background_id, background_name, share_code, created_at, prompt)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, originalImageUrl, processedImageUrl, backgroundId, backgroundName, shareCode, createdAt, prompt]
    );
    
    res.status(201).json({ success: true, id });
  } catch (error) {
    console.error('Error creating photo:', error);
    res.status(500).json({ error: 'Failed to create photo' });
  }
});

// Delete photo
app.delete('/api/photos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM photos WHERE id = $1',
      [id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting photo:', error);
    res.status(500).json({ error: 'Failed to delete photo' });
  }
});

app.listen(port, () => {
  console.log(`🚀 API server running on http://localhost:${port}`);
});

