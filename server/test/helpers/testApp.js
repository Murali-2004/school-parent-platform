// ===========================================================================
// Test bootstrap. Import and call `startTestApp()` from a `before()` hook.
//
// It sets a throwaway MONGO_URI *before* any app module (and therefore
// config/env.js) is imported, so tests never touch your real dev database:
//
//   - If MONGO_URI is already in the environment (CI provides one via a
//     MongoDB service container), it is reused with a unique db name per file.
//   - Otherwise an in-process mongodb-memory-server is spun up.
//
// Returns { app, mongoose, models, stop }. Call `stop()` from `after()`.
// ===========================================================================
import crypto from 'node:crypto';

function withDbName(uri, dbName) {
  const [head, query] = uri.split('?');
  const base = head.replace(/\/[^/]*$/, '/'); // strip any existing db name
  return `${base}${dbName}${query ? `?${query}` : ''}`;
}

export async function startTestApp() {
  process.env.NODE_ENV = 'test';
  process.env.JWT_ACCESS_SECRET ||= 'test-secret-value-at-least-16-characters-long';
  process.env.ALLOWED_ORIGINS ||= 'http://localhost:5173';
  delete process.env.SENTRY_DSN; // never talk to Sentry from tests

  const dbName = `test_${crypto.randomUUID().slice(0, 8)}`;

  let memory;
  if (process.env.MONGO_URI) {
    process.env.MONGO_URI = withDbName(process.env.MONGO_URI, dbName);
  } else {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memory = await MongoMemoryServer.create();
    process.env.MONGO_URI = withDbName(memory.getUri(), dbName);
  }

  // Dynamic imports AFTER env is set.
  const mongoose = (await import('mongoose')).default;
  const { connectDb, disconnectDb } = await import('../../config/db.js');
  await connectDb();
  const { default: app } = await import('../../app.js');
  const models = await import('../../models/index.js');

  return {
    app,
    mongoose,
    models,
    async stop() {
      await mongoose.connection.dropDatabase().catch(() => {});
      await disconnectDb();
      if (memory) await memory.stop();
    },
  };
}
