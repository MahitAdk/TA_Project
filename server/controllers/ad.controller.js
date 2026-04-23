import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../config/db.js";
// Ensure we are calling the Video service
import { generateAdVideo, analyzeProductImage } from "../services/ad.service.js";
import { getUserById } from "../services/user.service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT_DIRECTORY = path.join(__dirname, "..", "uploads", "ad-inputs");

const sanitizeFilename = (filename) =>
  filename.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");

const mapAdRecord = (record) => ({
  id: record.id,
  originalImageUrl: record.original_image_url,
  // This now points to the .mp4 file path in the DB
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
});

export const generateAd = async (req, res) => {
  try {
    const user = await getUserById(req.user.id);

    // 1. Plan check
    if (!user || !user.plan || user.plan === "starter") {
      return res.status(403).json({
        error: "An active subscription is required to generate video ads.",
        code: "SUBSCRIPTION_REQUIRED",
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No image file provided." });
    }

    // 2. Setup Directories
    if (!fs.existsSync(INPUT_DIRECTORY)) {
      fs.mkdirSync(INPUT_DIRECTORY, { recursive: true });
    }

    const inputFilename = `${Date.now()}_${sanitizeFilename(req.file.originalname)}`;
    fs.writeFileSync(path.join(INPUT_DIRECTORY, inputFilename), req.file.buffer);
    const originalImageUrl = `/uploads/ad-inputs/${inputFilename}`;

    // 3. Analysis (Moved inside the function where 'req' exists)
    const analysis = await analyzeProductImage(req.file.buffer, req.file.mimetype);

    if (analysis.productName === "Premium Product") {
      console.info("Note: System used fallback ad copy due to AI high demand.");
    }

    let generatedVideoUrl = null;
    let videoGenerationFailed = false;

    // 4. Video Generation (Text-to-Video via Kling)
    try {
      generatedVideoUrl = await generateAdVideo(analysis);
    } catch (error) {
      console.error("[ad.controller] video generation failed:", error.message);
      videoGenerationFailed = true;
    }

    // 5. Database Save
    const insertResult = await pool.query(
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
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
      [
        req.user.id,
        originalImageUrl,
        generatedVideoUrl,
        analysis.productName,
        analysis.headline,
        analysis.adCopy,
        analysis.cta,
        analysis.platform,
        analysis.hashtags,
        analysis,
        videoGenerationFailed ? "copy_only" : "completed",
      ]
    );

    const savedRecord = insertResult.rows[0];

    return res.status(201).json({
      ...mapAdRecord(savedRecord),
      videoGenerationFailed,
      keyFeatures: analysis.keyFeatures,
      targetAudience: analysis.targetAudience,
      tone: analysis.tone,
      usp: analysis.usp,
    });
  } catch (error) {
    console.error("[ad.controller] generateAd failed:", error);
    const status = error.status || 500;
    return res.status(status).json({
      error: status === 500 ? "Something went wrong. Please try again." : error.message,
    });
  }
};

export const getAdHistory = async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page, 10) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT * FROM ad_generations WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    return res.json({
      ads: result.rows.map(mapAdRecord),
      page,
    });
  } catch (error) {
    console.error("[ad.controller] history failed:", error);
    return res.status(500).json({ error: "Could not fetch history." });
  }
};