import { config } from "@dotenvx/dotenvx";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import app from "./app.js";
import { initializeDatabase } from "./config/db.js";

config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "JWT_SECRET",
  "GEMINI_API_KEY",
  "HF_TOKEN",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
];

const missingVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

if (missingVars.length > 0) {
  console.error(
    `\nServer cannot start. Missing required environment variables:\n${missingVars
      .map((value) => `  - ${value}`)
      .join("\n")}\n`
  );
  process.exit(1);
}

[
  path.join(__dirname, "uploads", "ad-inputs"),
  path.join(__dirname, "uploads", "ad-outputs"),
].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

await initializeDatabase();

const requestedPort = Number(process.env.PORT);
const PORT =
  Number.isInteger(requestedPort) && requestedPort > 0 && requestedPort !== 5173
    ? requestedPort
    : 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
