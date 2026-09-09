// ===========================================================================
// Sentry error tracking — fully optional.
// ===========================================================================
//
// - If `SENTRY_DSN` is NOT set (local dev, CI, tests): this module does
//   nothing. `sentryEnabled` is false and every Sentry hook elsewhere is a
//   no-op. Nothing about local development changes.
//
// - If `SENTRY_DSN` IS set: Sentry is initialised here, as early as possible.
//   `server.js` imports this file BEFORE `./app.js` so init runs before
//   Express is loaded. `app.js` then registers `Sentry.setupExpressErrorHandler`
//   just ahead of the app's own error handler.
//
// TO ENABLE: put your DSN in `.env`
//     SENTRY_DSN=https://xxxxxxxx@oXXXXXX.ingest.sentry.io/XXXXXXX
//     SENTRY_TRACES_SAMPLE_RATE=0.1   # optional, 0..1, performance tracing
//     SENTRY_RELEASE=school-api@0.1.0 # optional, for release health
//
// For full auto-instrumentation (DB spans, etc.) Sentry recommends loading
// this before anything else via:  node --import ./config/sentry.js server.js
// The plain `import` in server.js is enough for error capture.
// ===========================================================================
import * as Sentry from '@sentry/node';
import { env } from './env.js';

export const sentryEnabled = Boolean(env.SENTRY_DSN);

if (sentryEnabled) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    release: env.SENTRY_RELEASE,
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
    // Don't send events while running tests even if a DSN leaks into the env.
    enabled: env.NODE_ENV !== 'test',
  });
  console.log(`[sentry] error tracking enabled (environment: ${env.NODE_ENV})`);
} else if (env.NODE_ENV === 'production') {
  console.warn('[sentry] SENTRY_DSN is not set — running WITHOUT error tracking.');
}

export { Sentry };
