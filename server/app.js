// ---------------------------------------------------------------------------
// Express app assembly (no network binding here — see server.js).
// Kept separate so tests can import `app` without starting a listener.
// ---------------------------------------------------------------------------
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';

import { env, isProd, isTest } from './config/env.js';
import { Sentry, sentryEnabled } from './config/sentry.js';
import { globalLimiter } from './common/middleware/rateLimiters.js';
import { notFound, errorHandler } from './common/middleware/errorHandler.js';
import apiRoutes from './routes/index.js';

// Registering all models up front so refs/indexes resolve regardless of which
// route is hit first.
import './models/index.js';

const app = express();

// Behind a reverse proxy (Nginx / a PaaS) so req.ip and rate-limiting work.
app.set('trust proxy', 1);

// --- security headers ---------------------------------------------------
app.use(helmet());

// --- CORS: only the origins listed in ALLOWED_ORIGINS -------------------
app.use(
  cors({
    origin(origin, callback) {
      // Non-browser clients (mobile app, curl, server-to-server) send no Origin.
      if (!origin) return callback(null, true);
      if (env.ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      return callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
    credentials: true,
  }),
);

// --- body parsing ---------------------------------------------------- - -
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false }));

// --- request logging ------------------------------------------------- - -
if (!isTest) app.use(morgan(isProd ? 'combined' : 'dev'));

// --- global rate limit --------------------------------------------- - - -
app.use('/api', globalLimiter);

// --- routes -------------------------------------------------------- - - -
app.use('/api/v1', apiRoutes);

// --- Sentry error capture (no-op unless SENTRY_DSN is set) ---------- - - -
// Registered after the routes but before our own handlers. Sentry's default
// filter only reports 5xx / non-HTTP errors, so 4xx ApiErrors and 404s are
// not sent as issues.
if (sentryEnabled) Sentry.setupExpressErrorHandler(app);

// --- 404 + error handler (must be last) --------------------------- - - -
app.use(notFound);
app.use(errorHandler);

export default app;
