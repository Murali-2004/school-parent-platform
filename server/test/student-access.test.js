import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { startTestApp } from './helpers/testApp.js';

let ctx;
let app;
let factory;

before(async () => {
  ctx = await startTestApp();
  app = ctx.app;
  factory = await import('./helpers/factory.js');
});

after(async () => {
  await ctx.stop();
});

describe('relationshipGuard on GET /api/v1/students/:id', () => {
  test('a parent can read their own child but not another parent’s', async () => {
    const school = await factory.makeSchool();
    const { klass, section } = await factory.makeClassWithSection(school._id);

    const famA = await factory.makeParentWithChildren(school._id, { klass, section }, ['Ann']);
    const famB = await factory.makeParentWithChildren(school._id, { klass, section }, ['Bob']);

    const ownChild = famA.students[0];
    const otherChild = famB.students[0];

    const okRes = await request(app)
      .get(`/api/v1/students/${ownChild._id}`)
      .set(factory.bearer(famA.token));
    assert.equal(okRes.status, 200);
    assert.equal(okRes.body.student.name, 'Ann');

    const deniedRes = await request(app)
      .get(`/api/v1/students/${otherChild._id}`)
      .set(factory.bearer(famA.token));
    assert.ok([403, 404].includes(deniedRes.status), `expected 403/404, got ${deniedRes.status}`);
  });

  test('a parent’s student list contains only their own children', async () => {
    const school = await factory.makeSchool();
    const { klass, section } = await factory.makeClassWithSection(school._id);
    const fam = await factory.makeParentWithChildren(school._id, { klass, section }, ['One', 'Two']);
    await factory.makeParentWithChildren(school._id, { klass, section }, ['Someone else']);

    const res = await request(app).get('/api/v1/students').set(factory.bearer(fam.token));
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 2);
    const names = res.body.items.map((s) => s.name).sort();
    assert.deepEqual(names, ['One', 'Two']);
  });

  test('a school admin can read any student in their school', async () => {
    const school = await factory.makeSchool();
    const { klass, section } = await factory.makeClassWithSection(school._id);
    const fam = await factory.makeParentWithChildren(school._id, { klass, section }, ['Kid']);
    const admin = await factory.makeSchoolAdmin(school._id);

    const res = await request(app)
      .get(`/api/v1/students/${fam.students[0]._id}`)
      .set(factory.bearer(admin.token));
    assert.equal(res.status, 200);
  });

  test('a school admin from another school cannot (tenant isolation)', async () => {
    const schoolA = await factory.makeSchool();
    const schoolB = await factory.makeSchool();
    const { klass, section } = await factory.makeClassWithSection(schoolA._id);
    const fam = await factory.makeParentWithChildren(schoolA._id, { klass, section }, ['Kid']);
    const outsiderAdmin = await factory.makeSchoolAdmin(schoolB._id);

    const res = await request(app)
      .get(`/api/v1/students/${fam.students[0]._id}`)
      .set(factory.bearer(outsiderAdmin.token));
    assert.equal(res.status, 404);
  });
});
