import cors from "cors";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/auth.routes.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import paymentRoutes from "./routes/payment.routes.js";
import adRoutes from "./routes/ad.routes.js";
import userRoutes from "./routes/user.routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/ads", adRoutes);
app.use("/api/user", userRoutes);
app.use(errorHandler);

export default app;
