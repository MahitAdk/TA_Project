import cors from "cors";
import express from "express";
import authRoutes from "./routes/auth.routes.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import paymentRoutes from "./routes/payment.routes.js";
import userRoutes from "./routes/user.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/user", userRoutes);
app.use(errorHandler);

export default app;
