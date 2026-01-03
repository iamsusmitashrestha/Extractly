// Load environment variables FIRST before any other imports
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middleware/errorHandler";
import { requestLogger } from "./middleware/requestLogger";
import { ingestRouter } from "./controllers/ingestController";
import authRouter from "./routes/authRoutes";
import logger from "./utils/logger";
import oauthRouter from "./routes/oauthRoutes";
import { ProviderFactory } from "./services/providers/ProviderFactory";

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS configuration for Chrome Extension and Web UI
const allowedOrigins = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      // Allow Chrome extensions
      if (origin.startsWith("chrome-extension://")) return callback(null, true);
      // Allow known web origins
      if (allowedOrigins.has(origin)) return callback(null, true);
      return callback(new Error(`CORS not allowed for origin: ${origin}`), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"),
  message: {
    error: "Too many requests from this IP, please try again later.",
    retryAfter: "15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// --- Body & Cookie parsers ---
// parse the incoming request body into req.body.
// For JSON payloads
app.use(express.json({ limit: process.env.MAX_BODY_SIZE || "10mb" }));
// For form submissions
app.use(
  express.urlencoded({
    extended: true,
    limit: process.env.MAX_BODY_SIZE || "10mb",
  })
);
//Reads cookies from the request headers and stores them in req.cookies. Used mainly for JWT refresh tokens or session management.
app.use(cookieParser());

// Request logging
app.use(requestLogger);

// Mount routes
app.use("/auth", authRouter);
app.use("/auth/oauth", oauthRouter);
app.use("/api", ingestRouter);

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    const providerInfo = ProviderFactory.getProviderInfo();
    const provider = ProviderFactory.getProvider();
    const providerHealthy = await provider.healthCheck();

    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "Extractly-backend",
      aiProvider: {
        name: providerInfo.name,
        type: providerInfo.type,
        healthy: providerHealthy
      }
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      timestamp: new Date().toISOString(),
      service: "Extractly-backend",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    path: req.originalUrl,
    method: req.method,
  });
});

// Global error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`Extractly Backend Server running on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
});

export default app;
