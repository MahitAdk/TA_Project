import express from "express";
import { getHomeData } from "../controllers/user.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/home", verifyToken, getHomeData);

export default router;
