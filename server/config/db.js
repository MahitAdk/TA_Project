import { config } from "@dotenvx/dotenvx";
import pkg from "pg";

config();

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export const initializeDatabase = async () => {
  await pool.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ad_generations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      original_image_url TEXT NOT NULL,
      generated_image_url TEXT,
      product_name TEXT,
      headline TEXT,
      ad_copy TEXT,
      cta TEXT,
      platform TEXT,
      hashtags TEXT[],
      raw_analysis JSONB,
      status TEXT DEFAULT 'completed',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
};

export { pool };
export default pool;
