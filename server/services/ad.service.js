import fs from "fs";
import path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const GEMINI_PROMPT = `Analyze this product image and return ONLY a valid JSON object for a video ad:
{
  "productName": "string",
  "usp": "string",
  "visualDescription": "detailed scene description for AI video generation",
  "headline": "string",
  "adCopy": "string",
  "cta": "string",
  "platform": "string",
  "hashtags": []
}`.trim();

const DEFAULT_ANALYSIS = {
  productName: "Premium Product",
  usp: "Innovation meets excellence.",
  visualDescription:
    "A high-end cinematic product commercial, dramatic studio lighting, 4k, professional advertising style, smooth camera motion.",
  headline: "Elevate Your Style",
  adCopy: "Discover perfection in every detail.",
  cta: "Shop Now",
  platform: "Instagram",
  hashtags: ["premium", "innovation"],
};

// Ordered from most-preferred to least-preferred fallback
const  GEMINI_MODELS = [
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];

const KLING_API_BASE = "https://api.klingai.com";
const KLING_POLL_INTERVAL_MS = 10_000; // 10 s
const KLING_POLL_MAX_ATTEMPTS = 30;    // 30 × 10 s = 5 min max

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const createError = (msg, status = 500) => {
  const err = new Error(msg);
  err.status = status;
  return err;
};

function getKlingToken() {
  if (!process.env.KLING_ACCESS_KEY || !process.env.KLING_SECRET_KEY) {
    throw createError("Kling API credentials are not configured.", 500);
  }
  const payload = {
    iss: process.env.KLING_ACCESS_KEY,
    exp: Math.floor(Date.now() / 1000) + 1800,
    nbf: Math.floor(Date.now() / 1000) - 5,
  };
  return jwt.sign(payload, process.env.KLING_SECRET_KEY, { algorithm: "HS256" });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─────────────────────────────────────────────
// 1. ANALYZE IMAGE WITH GEMINI
// ─────────────────────────────────────────────

/**
 * Sends the product image to Gemini and returns structured ad analysis.
 * Tries each model in GEMINI_MODELS in order; falls back to DEFAULT_ANALYSIS
 * if all models fail.
 *
 * @param {Buffer} imageBuffer
 * @param {string} mimeType  e.g. "image/jpeg"
 * @returns {Promise<object>}
 */
export async function analyzeProductImage(imageBuffer, mimeType) {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("[Gemini] GEMINI_API_KEY not set. Using default analysis.");
    return DEFAULT_ANALYSIS;
  }

  let lastError;

  for (const modelName of GEMINI_MODELS) {
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: modelName });

      const result = await model.generateContent([
        GEMINI_PROMPT,
        {
          inlineData: {
            data: imageBuffer.toString("base64"),
            mimeType,
          },
        },
      ]);

      const raw = result.response.text().replace(/```json|```/gi, "").trim();
      const parsed = JSON.parse(raw);
      console.log(`[Gemini] Success with model: ${modelName}`);
      return parsed;
    } catch (error) {
      lastError = error;
      console.warn(`[Gemini] ${modelName} failed. Error: ${error.message}`);
    }
  }

  console.warn(
    "!!! GEMINI CRITICAL: All models failed. Falling back to default template.",
    lastError?.message
  );
  return DEFAULT_ANALYSIS;
}

// ─────────────────────────────────────────────
// 2. GENERATE VIDEO WITH KLING AI
// ─────────────────────────────────────────────

/**
 * Submits a text-to-video task to Kling AI, polls until completion,
 * downloads the result, saves it locally, and returns the relative file path.
 *
 * @param {object} analysis  Output of analyzeProductImage()
 * @returns {Promise<string>} Relative URL path to the saved .mp4 file
 */
export async function generateAdVideo(analysis) {
  // ── STEP 1: Submit task ──────────────────────────────────────────────────
  const submitToken = getKlingToken();

  const submitBody = {
    model_name: "kling-v1",
    prompt: `Cinematic advertisement for ${analysis.productName}: ${analysis.visualDescription}`,
    negative_prompt: "blurry, low quality, distorted, watermark, text overlay",
    duration: "5",        // FIX: top-level field, NOT inside "arguments"
    aspect_ratio: "16:9", // FIX: top-level field, NOT inside "arguments"
    mode: "std",          // "std" (cheaper) | "pro" (higher quality, more credits)
    cfg_scale: 0.5,       // creativity vs. prompt adherence (0–1)
  };

  console.log("[Kling] Submitting text2video task...");

  const submitRes = await fetch(`${KLING_API_BASE}/v1/videos/text2video`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${submitToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(submitBody),
  });

  const taskData = await submitRes.json();
  console.log("[Kling] Submit response:", JSON.stringify(taskData, null, 2));

  // Surface the real rejection reason instead of swallowing it
  if (taskData.code !== 0 || !taskData.data?.task_id) {
    throw createError(
      `Kling API Rejection (code ${taskData.code}): ${taskData.message || "Unknown error"}`,
      500
    );
  }

  const taskId = taskData.data.task_id;
  console.log(`[Kling] Task submitted. ID: ${taskId}`);

  // ── STEP 2: Poll for completion ──────────────────────────────────────────
  // FIX: correct polling endpoint is /v1/videos/text2video/{task_id}
  //      NOT the generic /v1/tasks/{task_id}
  let videoUrl = null;

  for (let attempt = 1; attempt <= KLING_POLL_MAX_ATTEMPTS; attempt++) {
    await sleep(KLING_POLL_INTERVAL_MS);

    const pollToken = getKlingToken(); // refresh token each poll to avoid expiry
    const statusRes = await fetch(
      `${KLING_API_BASE}/v1/videos/text2video/${taskId}`,
      {
        headers: { Authorization: `Bearer ${pollToken}` },
      }
    );

    const statusData = await statusRes.json();
    const status = statusData.data?.task_status;

    console.log(`[Kling] Attempt ${attempt}/${KLING_POLL_MAX_ATTEMPTS} — status: ${status}`);

    if (status === "succeed") {
      videoUrl = statusData.data?.task_result?.videos?.[0]?.url;
      if (!videoUrl) {
        throw createError("Kling task succeeded but no video URL was returned.", 500);
      }
      console.log(`[Kling] Video ready: ${videoUrl}`);
      break;
    }

    if (status === "failed") {
      const reason = statusData.data?.task_status_msg || "No reason provided";
      throw createError(`Kling video processing failed: ${reason}`, 500);
    }

    // status is "submitted" or "processing" — keep polling
  }

  if (!videoUrl) {
    throw createError(
      `Video generation timed out after ${(KLING_POLL_MAX_ATTEMPTS * KLING_POLL_INTERVAL_MS) / 1000}s.`,
      504
    );
  }

  // ── STEP 3: Download and save video ─────────────────────────────────────
  console.log("[Kling] Downloading video...");
  const videoArrayBuffer = await fetch(videoUrl).then((res) => {
    if (!res.ok) throw createError(`Failed to download video: HTTP ${res.status}`, 500);
    return res.arrayBuffer();
  });

  const outputDir = path.join(__dirname, "..", "uploads", "ad-outputs");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filename = `ad_${Date.now()}.mp4`;
  const outputPath = path.join(outputDir, filename);
  fs.writeFileSync(outputPath, Buffer.from(videoArrayBuffer));
  console.log(`[Kling] Video saved to: ${outputPath}`);

  return `/uploads/ad-outputs/${filename}`;
}