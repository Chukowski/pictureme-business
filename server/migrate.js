#!/usr/bin/env node

/**
 * Database Migration Runner
 * Executes SQL migrations in order
 */

import pg from 'pg';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pool = new pg.Pool({
  connectionString: process.env.VITE_POSTGRES_URL || process.env.DATABASE_URL,
  ssl: false,
});

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting database migrations...\n');
    
    // Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        version VARCHAR(50) UNIQUE NOT NULL,
        filename VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Get executed migrations
    const { rows: executed } = await client.query(
      'SELECT version FROM schema_migrations ORDER BY version'
    );
    const executedVersions = new Set(executed.map(r => r.version));
    
    // Read migration files
    const migrationsDir = join(__dirname, 'migrations');
    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    if (files.length === 0) {
      console.log('⚠️  No migration files found in', migrationsDir);
      return;
    }
    
    console.log(`📁 Found ${files.length} migration file(s)\n`);
    
    let executed_count = 0;
    let skipped_count = 0;
    
    for (const file of files) {
      // Extract version from filename (e.g., "001_multiuser_schema.sql" -> "001")
      const version = file.split('_')[0];
      
      if (executedVersions.has(version)) {
        console.log(`⏭️  Skipping ${file} (already executed)`);
        skipped_count++;
        continue;
      }
      
      console.log(`▶️  Executing ${file}...`);
      
      try {
        const sql = readFileSync(join(migrationsDir, file), 'utf-8');
        
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (version, filename) VALUES ($1, $2)',
          [version, file]
        );
        await client.query('COMMIT');
        
        console.log(`✅ ${file} executed successfully\n`);
        executed_count++;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ Error executing ${file}:`, error.message);
        throw error;
      }
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✨ Migration Summary:`);
    console.log(`   Executed: ${executed_count}`);
    console.log(`   Skipped:  ${skipped_count}`);
    console.log(`   Total:    ${files.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (executed_count > 0) {
      console.log('🎉 Database is up to date!\n');
    } else {
      console.log('✓ Database was already up to date\n');
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default runMigrations;

