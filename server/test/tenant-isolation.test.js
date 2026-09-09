import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp } from './helpers/testApp.js';

let ctx;
let Student;
let makeSchool;
let makeClassWithSection;

before(async () => {
  ctx = await startTestApp();
  ({ Student } = ctx.models);
  ({ makeSchool, makeClassWithSection } = await import('./helpers/factory.js'));
});

after(async () => {
  await ctx.stop();
});

describe('tenantPlugin query guard', () => {
  test('a query without a schoolId filter throws', async () => {
    await assert.rejects(
      () => Student.find({ name: 'anything' }),
      /\[tenantPlugin\]/,
    );
  });

  test('a query WITH a schoolId filter is allowed and is scoped', async () => {
    const schoolA = await makeSchool();
    const schoolB = await makeSchool();
    const { klass: classA, section: sectionA } = await makeClassWithSection(schoolA._id);
    const { klass: classB, section: sectionB } = await makeClassWithSection(schoolB._id);

    await Student.create({
      schoolId: schoolA._id,
      name: 'A-student',
      classId: classA._id,
      sectionId: sectionA._id,
      rollNo: '1',
    });
    await Student.create({
      schoolId: schoolB._id,
      name: 'B-student',
      classId: classB._id,
      sectionId: sectionB._id,
      rollNo: '1',
    });

    const aResults = await Student.find({ schoolId: schoolA._id });
    assert.equal(aResults.length, 1);
    assert.equal(aResults[0].name, 'A-student');
  });

  test('.skipTenantGuard() is the explicit escape hatch', async () => {
    const all = await Student.find().skipTenantGuard();
    assert.ok(all.length >= 2);
  });

  test('countDocuments is guarded too', async () => {
    await assert.rejects(() => Student.countDocuments({}), /\[tenantPlugin\]/);
  });
});
