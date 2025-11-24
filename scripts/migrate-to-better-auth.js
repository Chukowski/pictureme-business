import pkg from "pg";
import { betterAuth } from "better-auth";
import dotenv from "dotenv";
import bcrypt from "bcrypt";

const { Pool } = pkg;

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_POSTGRES_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL or VITE_POSTGRES_URL not found in environment variables");
  console.error("   Please set one of these in your .env file");
  process.exit(1);
}

console.log("🔗 Connecting to database...");
console.log(`   ${DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`);

const pool = new Pool({
  connectionString: DATABASE_URL,
});

// Create Better Auth instance
const auth = betterAuth({
  database: pool,
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
  },
  user: {
    additionalFields: {
      slug: {
        type: "string",
        required: false,
        unique: true,
      },
      role: {
        type: "string",
        required: false,
        defaultValue: "individual",
      },
      tokens_remaining: {
        type: "number",
        required: false,
        defaultValue: 100,
      },
      is_active: {
        type: "boolean",
        required: false,
        defaultValue: true,
      },
    },
  },
});

async function createBetterAuthTables() {
  console.log("\n📋 Step 1: Creating Better Auth tables...");
  
  const client = await pool.connect();
  
  try {
    // Better Auth creates these tables automatically, but we'll ensure they exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS "user" (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        "emailVerified" BOOLEAN DEFAULT FALSE,
        name TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        image TEXT,
        slug TEXT UNIQUE,
        role TEXT DEFAULT 'individual',
        tokens_remaining INTEGER DEFAULT 100,
        is_active BOOLEAN DEFAULT TRUE
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS session (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        "expiresAt" TIMESTAMP NOT NULL,
        "ipAddress" TEXT,
        "userAgent" TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS account (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        "accountId" TEXT NOT NULL,
        "providerId" TEXT NOT NULL,
        "accessToken" TEXT,
        "refreshToken" TEXT,
        "idToken" TEXT,
        "expiresAt" TIMESTAMP,
        password TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("userId", "providerId")
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS verification (
        id TEXT PRIMARY KEY,
        identifier TEXT NOT NULL,
        value TEXT NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("✅ Better Auth tables created successfully");
  } catch (error) {
    console.error("❌ Error creating tables:", error.message);
    throw error;
  } finally {
    client.release();
  }
}

async function migrateUsers() {
  console.log("\n👥 Step 2: Migrating users from old system...");
  
  const client = await pool.connect();
  
  try {
    // Get all users from old table
    const result = await client.query(`
      SELECT id, username, email, password_hash, full_name, slug, role, 
             is_active, created_at
      FROM users
      WHERE is_active = TRUE
      ORDER BY created_at ASC
    `);

    const users = result.rows;
    console.log(`   Found ${users.length} users to migrate`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const user of users) {
      try {
        // Check if user already exists in Better Auth
        const existing = await client.query(
          'SELECT id FROM "user" WHERE email = $1',
          [user.email]
        );

        if (existing.rows.length > 0) {
          console.log(`   ⏭️  Skipping ${user.email} (already exists)`);
          skipped++;
          continue;
        }

        // Insert user into Better Auth user table
        await client.query(`
          INSERT INTO "user" (
            id, email, "emailVerified", name, slug, role, 
            tokens_remaining, is_active, "createdAt", "updatedAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          user.id.toString(),
          user.email,
          true, // Mark as verified since they're migrated
          user.full_name || user.username,
          user.slug,
          user.role || 'individual',
          100, // Default tokens
          user.is_active !== false,
          user.created_at,
          new Date()
        ]);

        // Insert password into account table
        await client.query(`
          INSERT INTO account (
            id, "userId", "accountId", "providerId", password, "createdAt", "updatedAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          `account_${user.id}`,
          user.id.toString(),
          user.email,
          'credential', // Better Auth uses 'credential' for email/password
          user.password_hash, // Keep the existing bcrypt hash
          user.created_at,
          new Date()
        ]);

        console.log(`   ✅ Migrated ${user.email} (${user.role})`);
        migrated++;
      } catch (error) {
        console.error(`   ❌ Error migrating ${user.email}:`, error.message);
        errors++;
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Migrated: ${migrated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📝 Total: ${users.length}`);

  } catch (error) {
    console.error("❌ Error during migration:", error.message);
    throw error;
  } finally {
    client.release();
  }
}

async function verifyMigration() {
  console.log("\n🔍 Step 3: Verifying migration...");
  
  const client = await pool.connect();
  
  try {
    const oldCount = await client.query('SELECT COUNT(*) FROM users WHERE is_active = TRUE');
    const newCount = await client.query('SELECT COUNT(*) FROM "user"');
    
    console.log(`   Old users table: ${oldCount.rows[0].count} active users`);
    console.log(`   New user table: ${newCount.rows[0].count} users`);
    
    if (parseInt(oldCount.rows[0].count) === parseInt(newCount.rows[0].count)) {
      console.log("   ✅ User counts match!");
    } else {
      console.log("   ⚠️  User counts don't match. Some users may not have been migrated.");
    }

    // Test a sample user
    const sampleUser = await client.query(`
      SELECT u.email, u.role, a.password
      FROM "user" u
      LEFT JOIN account a ON u.id = a."userId"
      LIMIT 1
    `);

    if (sampleUser.rows.length > 0) {
      console.log(`\n   Sample migrated user:`);
      console.log(`   - Email: ${sampleUser.rows[0].email}`);
      console.log(`   - Role: ${sampleUser.rows[0].role}`);
      console.log(`   - Has password: ${sampleUser.rows[0].password ? 'Yes' : 'No'}`);
    }

  } catch (error) {
    console.error("❌ Error during verification:", error.message);
  } finally {
    client.release();
  }
}

async function main() {
  console.log("🚀 Better Auth Migration Script");
  console.log("================================\n");

  try {
    await createBetterAuthTables();
    await migrateUsers();
    await verifyMigration();

    console.log("\n✅ Migration completed successfully!");
    console.log("\n📝 Next steps:");
    console.log("   1. Test login with an existing user");
    console.log("   2. Update frontend to use Better Auth client");
    console.log("   3. Update FastAPI to validate Better Auth JWT");
    console.log("   4. Once confirmed working, you can deprecate old auth endpoints");

  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

