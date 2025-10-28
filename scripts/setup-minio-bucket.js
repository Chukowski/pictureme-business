#!/usr/bin/env node

/**
 * Script to configure MinIO bucket with public read access
 * This allows images to be viewed via public URLs
 */

import * as Minio from 'minio';
import dotenv from 'dotenv';

dotenv.config();

const minioClient = new Minio.Client({
  endPoint: process.env.VITE_MINIO_ENDPOINT || 'storage.akitapr.com',
  port: parseInt(process.env.VITE_MINIO_PORT || '443'),
  useSSL: process.env.VITE_MINIO_USE_SSL !== 'false',
  accessKey: process.env.VITE_MINIO_ACCESS_KEY || 'VDVlK2645nIGwYgG6InN',
  secretKey: process.env.VITE_MINIO_SECRET_KEY || 'bMvjHpmeVK3dVEO71Wlr0Ez2rALmVSThwnkdkSmb',
});

const BUCKET_NAME = process.env.VITE_MINIO_BUCKET || 'photobooth';

// Policy to allow public read access
const publicReadPolicy = {
  Version: '2012-10-17',
  Statement: [
    {
      Effect: 'Allow',
      Principal: { AWS: ['*'] },
      Action: ['s3:GetObject'],
      Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`],
    },
  ],
};

async function setupBucket() {
  try {
    console.log(`🔍 Checking if bucket "${BUCKET_NAME}" exists...`);
    
    const exists = await minioClient.bucketExists(BUCKET_NAME);
    
    if (!exists) {
      console.log(`📦 Creating bucket "${BUCKET_NAME}"...`);
      await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
      console.log(`✅ Bucket created successfully`);
    } else {
      console.log(`✅ Bucket "${BUCKET_NAME}" already exists`);
    }
    
    console.log(`🔓 Setting public read policy...`);
    await minioClient.setBucketPolicy(BUCKET_NAME, JSON.stringify(publicReadPolicy));
    console.log(`✅ Bucket policy set successfully`);
    
    console.log(`\n🎉 MinIO bucket setup complete!`);
    console.log(`\nImages will be publicly accessible at:`);
    console.log(`${process.env.VITE_MINIO_SERVER_URL}/${BUCKET_NAME}/[filename]\n`);
    
  } catch (error) {
    console.error('❌ Error setting up bucket:', error.message);
    console.error('\nPossible causes:');
    console.error('- Invalid MinIO credentials');
    console.error('- MinIO server not accessible');
    console.error('- Insufficient permissions to modify bucket policy');
    console.error('\nPlease verify your MinIO configuration in .env file');
    process.exit(1);
  }
}

setupBucket();

