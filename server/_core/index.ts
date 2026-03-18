import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import rateLimit from "express-rate-limit";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { startScheduledPostsEnqueuer } from "../scheduled-posts";
import { registerAutoEngagementJob } from "../auto-engagement";
import { getSetting } from "../db";
import uploadRouter from "../upload";
import { startInteractionEnqueuer } from "../interaction-scheduler";
import { registerQueueProcessors } from "../queue-processors";
import { closeQueues, registerGrowthLoopRepeatableJob } from "../queue-manager";
import { registerAgentSchedulerJob } from "../agent-scheduler";
import { attachWebSocketServer } from "../playwright/ws-preview";
import { attachEventBus } from "../utils/event-bus";
import { logger } from "../utils/logger";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  logger.info('Loading API keys from database...');

  // Wait for database connection to be ready
  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
    const openaiApiKey = await getSetting('OPENAI_API_KEY');

    if (openaiApiKey) {
      process.env.OPENAI_API_KEY = openaiApiKey;
      logger.info('Loaded OPENAI_API_KEY from database');
    } else {
      logger.info('No OPENAI_API_KEY found in database, using environment variable');
    }

    const anthropicApiKey = await getSetting('ANTHROPIC_API_KEY');
    if (anthropicApiKey) {
      process.env.ANTHROPIC_API_KEY = anthropicApiKey;
      logger.info('Loaded ANTHROPIC_API_KEY from database');
    }

    const llmProvider = await getSetting('LLM_PROVIDER');
    if (llmProvider) {
      process.env.LLM_PROVIDER = llmProvider;
      logger.info({ provider: llmProvider }, 'Loaded LLM_PROVIDER from database');
    }
  } catch (error: any) {
    logger.error({ err: error }, 'Failed to load API keys from database');
  }

  const app = express();

  // Gzip compression is handled by Nginx reverse proxy (nginx/nginx.conf)
  // No Express-level compression needed — avoids stream conflicts and 504 errors

  // -----------------------------------------------------------------------
  // Security hardening
  // -----------------------------------------------------------------------

  // Remove X-Powered-By header to avoid exposing Express
  app.disable('x-powered-by');

  // Security headers (complement Nginx – avoid duplicating headers already set there)
  // Nginx already sets: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy
  // We add HSTS and CSP at the application level for defense-in-depth
  app.use((_req, res, next) => {
    // HSTS – enforce HTTPS for 1 year including subdomains
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    // Basic CSP – allow self-origin resources; inline styles needed for UI libraries
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' wss: ws:;"
    );
    next();
  });

  const server = createServer(app);

  // Attach WebSocket server for Playwright live preview
  attachWebSocketServer(server);

  // Attach real-time event bus WebSocket
  attachEventBus(server);

  // Rate limiting
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // 300 requests per 15 minutes
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  });
  const authLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 15, // 15 requests per minute for auth endpoints
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login attempts, please try again later.' },
  });
  app.use('/api/trpc', generalLimiter);
  app.use('/api/oauth', authLimiter);
  app.use('/api/dev-login', authLimiter);
  app.use('/api/admin-login', authLimiter);
  app.use('/api/admin/set-password', authLimiter);

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // File upload API
  app.use("/api", uploadRouter);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    logger.info({ preferredPort, port }, 'Port busy, using alternative');
  }

  server.listen(port, () => {
    logger.info({ port }, `Server running on http://localhost:${port}/`);

    // Register queue processors (Bull)
    registerQueueProcessors();
    logger.info('Queue processors registered');

    // Start scheduled posts enqueuer (adds pending posts to queue)
    startScheduledPostsEnqueuer();

    // Register auto-engagement as a BullMQ repeatable job (every 300s)
    registerAutoEngagementJob().catch((err) => {
      logger.error({ err }, 'Failed to register auto-engagement repeatable job');
    });

    // Start interaction enqueuer (adds pending interactions to queue)
    startInteractionEnqueuer();

    // Register agent scheduler as a BullMQ repeatable job (every 60s)
    registerAgentSchedulerJob().catch((err) => {
      logger.error({ err }, 'Failed to register agent scheduler repeatable job');
    });
    logger.info('Agent scheduler repeatable job registration initiated');

    // Register growth loop as a Bull repeatable job (every 6 hours)
    registerGrowthLoopRepeatableJob().catch((err) => {
      logger.error({ err }, 'Failed to register growth loop repeatable job');
    });
    logger.info('Growth loop repeatable job registration initiated');

    logger.info('All background executors started');
  });

  // Graceful shutdown
  const gracefulShutdown = async (signal: string) => {
    logger.info({ signal }, 'Starting graceful shutdown...');

    // Stop accepting new connections
    server.close(async () => {
      logger.info('HTTP server closed');

      // Close queue connections
      await closeQueues();

      logger.info('Graceful shutdown complete');
      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

// Global error handlers to prevent server crashes
process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught Exception');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.fatal({ reason }, 'Unhandled Rejection');
});

startServer().catch((error) => {
  logger.fatal({ err: error }, 'Failed to start server');
  process.exit(1);
});
