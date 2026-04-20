import { config } from "@dotenvx/dotenvx";
import pkg from "pg";

config();

const { Pool } = pkg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});
