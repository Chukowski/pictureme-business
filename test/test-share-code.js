/**
 * Test script to verify share codes work correctly
 * Usage: node scripts/test-share-code.js GWBWXL
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const shareCode = process.argv[2];

if (!shareCode) {
  console.log('❌ Usage: node scripts/test-share-code.js <SHARE_CODE>');
  console.log('   Example: node scripts/test-share-code.js GWBWXL');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: process.env.VITE_POSTGRES_URL || 'postgresql://user:password@localhost:5432/photodb',
  ssl: false,
});

async function testShareCode() {
  try {
    console.log(`\n🔍 Looking for photo with share code: ${shareCode}\n`);
    
    const result = await pool.query(
      'SELECT * FROM photos WHERE share_code = $1',
      [shareCode.toUpperCase()]
    );
    
    if (result.rows.length === 0) {
      console.log('❌ Photo not found in database');
      console.log('\nPossible reasons:');
      console.log('  1. The photo was never created (no one took a photo with this code)');
      console.log('  2. The share code is incorrect');
      console.log('  3. The photo was deleted');
      console.log('\n💡 Try taking a photo in the app first, then use its share code');
      
      // List available photos
      const allPhotos = await pool.query(
        'SELECT share_code, background_name, created_at FROM photos ORDER BY created_at DESC LIMIT 5'
      );
      
      if (allPhotos.rows.length > 0) {
        console.log('\n📸 Recent photos in database:');
        allPhotos.rows.forEach((photo, i) => {
          const date = new Date(parseInt(photo.created_at));
          console.log(`  ${i + 1}. ${photo.share_code} - ${photo.background_name} (${date.toLocaleString()})`);
        });
        console.log(`\n   Test with: https://photo.akitapr.com/share/${allPhotos.rows[0].share_code}`);
      } else {
        console.log('\n📭 No photos in database yet. Take a photo first!');
      }
    } else {
      const photo = result.rows[0];
      console.log('✅ Photo found!\n');
      console.log('Details:');
      console.log(`  ID: ${photo.id}`);
      console.log(`  Share Code: ${photo.share_code}`);
      console.log(`  Background: ${photo.background_name}`);
      console.log(`  Created: ${new Date(parseInt(photo.created_at)).toLocaleString()}`);
      console.log(`  Original Image: ${photo.original_image_url}`);
      console.log(`  Processed Image: ${photo.processed_image_url}`);
      console.log(`\n🔗 Share URL: https://photo.akitapr.com/share/${photo.share_code}`);
      
      // Test if image is accessible
      console.log('\n🌐 Testing image accessibility...');
      try {
        const response = await fetch(photo.processed_image_url);
        if (response.ok) {
          console.log('✅ Image is publicly accessible');
        } else {
          console.log(`❌ Image returned ${response.status}: ${response.statusText}`);
          console.log('   Run: npm run setup-minio (to fix permissions)');
        }
      } catch (error) {
        console.log(`❌ Failed to fetch image: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    console.log('\nTroubleshooting:');
    console.log('  1. Is the backend running? (npm run server)');
    console.log('  2. Are PostgreSQL credentials correct in .env?');
    console.log('  3. Can you connect to the database?');
  } finally {
    await pool.end();
  }
}

testShareCode();

