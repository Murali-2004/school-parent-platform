// ---------------------------------------------------------------------------
// MongoDB connection helper.
// ---------------------------------------------------------------------------
import mongoose from 'mongoose';
import { env, isProd } from './env.js';

// Fail fast on queries that reference an unknown field, and (in dev) surface
// slow/loose queries early.
mongoose.set('strictQuery', true);
if (!isProd) mongoose.set('debug', false); // flip to true to log every query

export async function connectDb() {
  mongoose.connection.on('connected', () => {
    // eslint-disable-next-line no-console
    console.log(`[db] connected: ${mongoose.connection.name}`);
  });
  mongoose.connection.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error('[db] connection error:', err.message);
  });
  mongoose.connection.on('disconnected', () => {
    // eslint-disable-next-line no-console
    console.warn('[db] disconnected');
  });

  await mongoose.connect(env.MONGO_URI, {
    autoIndex: !isProd, // build indexes automatically in dev; do it explicitly in prod
    serverSelectionTimeoutMS: 10_000,
  });

  return mongoose.connection;
}

export async function disconnectDb() {
  await mongoose.disconnect();
}
