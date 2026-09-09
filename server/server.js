// ---------------------------------------------------------------------------
// Entry point: connect to MongoDB, then start the HTTP listener.
// ---------------------------------------------------------------------------

// Sentry MUST be imported before ./app.js so init() runs before Express loads.
// This is a no-op unless SENTRY_DSN is set — see config/sentry.js.
import { Sentry, sentryEnabled } from './config/sentry.js';

import app from './app.js';
import { env } from './config/env.js';
import { connectDb, disconnectDb } from './config/db.js';

async function start() {
  await connectDb();

  const server = app.listen(env.PORT, () => {
    console.log(`[server] listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = async (signal) => {
    console.log(`\n[server] ${signal} received, shutting down...`);
    server.close(async () => {
      await disconnectDb();
      if (sentryEnabled) await Sentry.close(2000);
      process.exit(0);
    });
    // Force-exit if graceful shutdown stalls.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Last-resort safety net: report a crash before the process dies.
  process.on('unhandledRejection', (reason) => {
    console.error('[server] unhandledRejection:', reason);
    if (sentryEnabled) Sentry.captureException(reason);
  });
}

start().catch((err) => {
  console.error('[server] failed to start:', err);
  if (sentryEnabled) Sentry.captureException(err);
  process.exit(1);
});
