import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../config/db.js";
import {
  analyzeProductImage,
  generateVideoFromImage,
} from "../services/ad.service.js";
import { getUserById } from "../services/user.service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT_DIR = path.join(__dirname, "..", "uploads", "ad-inputs");
const OUTPUT_DIR = path.join(__dirname, "..", "uploads", "ad-outputs");

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const sanitizeFilename = (name) =>
  name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");

// ✅ Clean text before DB insert (NEW)
const safeText = (t) =>
  (t || "")
    .replace(/'/g, "")
    .replace(/\n/g, " ")
    .trim();

const mapAdRecord = (record) => ({
  id: record.id,
  originalImageUrl: record.original_image_url,
  generatedVideoUrl: record.generated_image_url,
  productName: record.product_name,
  headline: record.headline,
  adCopy: record.ad_copy,
  cta: record.cta,
  platform: record.platform,
  hashtags: record.hashtags || [],
  rawAnalysis: record.raw_analysis,
  status: record.status,
  createdAt: record.created_at,

  // legacy aliases
  original_image_url: record.original_image_url,
  generated_image_url: record.generated_image_url,
  product_name: record.product_name,
  ad_copy: record.ad_copy,
  created_at: record.created_at,
});

const buildPagination = (page, defaultLimit = 10, maxLimit = 50) => {
  const resolvedPage = Number.parseInt(page, 10) || 1;
  const requestedLimit = Number.parseInt(defaultLimit, 10) || defaultLimit;
  const limit = Math.min(Math.max(requestedLimit, 1), maxLimit);
  const offset = (resolvedPage - 1) * limit;

  return {
    page: resolvedPage,
    limit,
    offset,
  };
};

export const generateAd = async (req, res) => {
  try {
    const user = await getUserById(req.user.id);

    if (!user || !user.plan || user.plan === "starter") {
      return res.status(403).json({
        error: "Upgrade required",
        code: "SUBSCRIPTION_REQUIRED",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: "No image uploaded",
      });
    }

    ensureDir(INPUT_DIR);
    ensureDir(OUTPUT_DIR);

    const inputFilename = `${Date.now()}_${sanitizeFilename(
      req.file.originalname
    )}`;

    const inputPath = path.join(INPUT_DIR, inputFilename);
    const originalImageUrl = `/uploads/ad-inputs/${inputFilename}`;

    fs.writeFileSync(inputPath, req.file.buffer);

    // ===============================
    // AI ANALYSIS
    // ===============================
    let analysis;

    try {
      analysis = await analyzeProductImage(
        req.file.buffer,
        req.file.mimetype
      );
    } catch (err) {
      console.error("[ad.controller] AI failed:", err.message);
      return res.status(500).json({
        error: "AI analysis failed",
      });
    }

    // ✅ Ensure structure safety
    if (!analysis || typeof analysis !== "object") {
      return res.status(500).json({
        error: "Invalid AI response",
      });
    }

    // ===============================
    // VIDEO GENERATION
    // ===============================
    const outputFile = `ad_${Date.now()}.mp4`;
    const outputPath = path.join(OUTPUT_DIR, outputFile);

    let generatedVideoUrl = `/uploads/ad-outputs/${outputFile}`;
    let videoGenerationFailed = false;

    try {
      await generateVideoFromImage(inputPath, outputPath, analysis);
    } catch (err) {
      console.error("[ad.controller] video generation failed:", err.message);
      generatedVideoUrl = null;
      videoGenerationFailed = true;
    }

    // ===============================
    // DATABASE INSERT
    // ===============================
    const result = await pool.query(
      `INSERT INTO ad_generations
        (
          user_id,
          original_image_url,
          generated_image_url,
          product_name,
          headline,
          ad_copy,
          cta,
          platform,
          hashtags,
          raw_analysis,
          status
        )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        req.user.id,
        originalImageUrl,
        generatedVideoUrl,

        // ✅ Clean text before storing
        safeText(analysis.productName),
        safeText(analysis.headline),
        safeText(analysis.adCopy),
        safeText(analysis.cta),

        analysis.platform || "Instagram",
        analysis.hashtags || [],

        JSON.stringify(analysis),

        // ✅ clearer status
        videoGenerationFailed ? "failed_video" : "completed",
      ]
    );

    const ad = result.rows[0];

    return res.status(201).json({
      ...mapAdRecord(ad),
      videoGenerationFailed,

      // expose useful AI fields
      keyFeatures: analysis.keyFeatures,
      targetAudience: analysis.targetAudience,
      tone: analysis.tone,
      usp: analysis.usp,
    });

  } catch (err) {
    console.error("Generate Ad Error:", err);
    return res.status(500).json({
      error: "Ad generation failed",
    });
  }
};

export const getAdHistory = async (req, res) => {
  try {
    const { page, limit, offset } = buildPagination(req.query.page, 10);

    const result = await pool.query(
      `SELECT *
       FROM ad_generations
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    return res.json({
      ads: result.rows.map(mapAdRecord),
      page,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Failed to fetch history",
    });
  }
};

export const getVideoLibrary = async (req, res) => {
  try {
    const { page, limit, offset } = buildPagination(
      req.query.page,
      req.query.limit || 12
    );

    const result = await pool.query(
      `SELECT *
       FROM ad_generations
       WHERE user_id = $1
         AND generated_image_url IS NOT NULL
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    return res.json({
      videos: result.rows.map(mapAdRecord),
      page,
      limit,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Failed to fetch video library",
    });
  }
};
