import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { startTestApp } from './helpers/testApp.js';

let ctx;
let app;
let School;

before(async () => {
  ctx = await startTestApp();
  app = ctx.app;
  ({ School } = ctx.models);
});

after(async () => {
  await ctx.stop();
});

async function freshSchool() {
  return School.create({ name: `Auth School ${Date.now()}${Math.random()}`, city: 'X' });
}

describe('POST /api/v1/auth/register + login', () => {
  test('registers a PARENT and returns a token pair', async () => {
    const school = await freshSchool();
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Reg Parent',
        email: 'reg.parent@example.test',
        password: 'password123',
        schoolId: String(school._id),
        role: 'PARENT',
      });

    assert.equal(res.status, 201);
    assert.equal(typeof res.body.accessToken, 'string');
    assert.equal(typeof res.body.refreshToken, 'string');
    assert.equal(res.body.user.role, 'PARENT');
    assert.equal(res.body.user.schoolId, String(school._id));
  });

  test('rejects a bad body with 422', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'not-an-email' });
    assert.equal(res.status, 422);
  });

  test('login then GET /auth/me echoes the identity', async () => {
    const school = await freshSchool();
    await request(app).post('/api/v1/auth/register').send({
      name: 'Login User',
      email: 'login.user@example.test',
      password: 'password123',
      schoolId: String(school._id),
      role: 'TEACHER',
    });

    const login = await request(app).post('/api/v1/auth/login').send({
      email: 'login.user@example.test',
      password: 'password123',
      schoolId: String(school._id),
    });
    assert.equal(login.status, 200);

    const me = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`);
    assert.equal(me.status, 200);
    assert.equal(me.body.user.email, 'login.user@example.test');
    assert.equal(me.body.user.role, 'TEACHER');
  });

  test('unauthenticated request to a protected route is 401', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    assert.equal(res.status, 401);
  });
});

describe('refresh token rotation + reuse detection', () => {
  test('rotates on refresh and revokes the whole chain on reuse', async () => {
    const school = await freshSchool();
    const reg = await request(app).post('/api/v1/auth/register').send({
      name: 'Rotate User',
      email: 'rotate.user@example.test',
      password: 'password123',
      schoolId: String(school._id),
      role: 'PARENT',
    });
    const original = reg.body.refreshToken;

    const first = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: original });
    assert.equal(first.status, 200);
    assert.notEqual(first.body.refreshToken, original);

    // Replaying the original (now-rotated) token must fail...
    const replay = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: original });
    assert.equal(replay.status, 401);

    // ...and reuse detection must also have revoked the rotated one.
    const rotated = first.body.refreshToken;
    const afterBreach = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: rotated });
    assert.equal(afterBreach.status, 401);
  });
});
