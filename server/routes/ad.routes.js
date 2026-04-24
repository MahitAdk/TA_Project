import express from "express";
import multer from "multer";
import {
  generateAd,
  getAdHistory,
  getVideoLibrary,
} from "../controllers/ad.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      cb(new Error("Only JPEG, PNG, and WebP images are accepted."));
      return;
    }

    cb(null, true);
  },
});

router.use(verifyToken);

router.post("/generate", upload.single("productImage"), generateAd);
router.get("/history", getAdHistory);
router.get("/videos", getVideoLibrary);

router.use((err, _req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res
      .status(413)
      .json({ error: "Image is too large. Maximum allowed size is 5 MB." });
  }

  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({
      error: 'Unexpected file field. Use "productImage" as the field name.',
    });
  }

  if (err.message && err.message.includes("Only JPEG")) {
    return res.status(400).json({ error: err.message });
  }

  next(err);
});

export default router;
