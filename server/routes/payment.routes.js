import express from "express";
import { createOrder, verifyPayment } from "../controllers/payment.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

// create order
router.post("/create-order", verifyToken, createOrder);

// verify payment
router.post("/verify", verifyToken, verifyPayment);

export default router;