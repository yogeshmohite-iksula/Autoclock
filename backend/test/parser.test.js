// Parser unit tests — run with `npm test` (Node built-in test runner, free).
// Covers the durations from DevDoc §11.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseDuration, tidy, groupByTicket, validateEntry, validateDay } = require('../services/parser');

test('parseDuration — basic forms', () => {
  assert.equal(parseDuration('30m'), 30);
  assert.equal(parseDuration('1h'), 60);
  assert.equal(parseDuration('1.5h'), 90);
  assert.equal(parseDuration('1h 30m'), 90);
  assert.equal(parseDuration('90'), 90);
  assert.equal(parseDuration('90 min'), 90);
  assert.equal(parseDuration('2 hrs'), 120);
});

test('parseDuration — rejects junk to zero (validator blocks zero)', () => {
  assert.equal(parseDuration('abc'), 0);
  assert.equal(parseDuration(''), 0);
});

test('tidy — expands shorthand and Capitalises', () => {
  assert.equal(tidy('  scrum  '), 'Daily Scrum');
  assert.equal(tidy('write tc'), 'Write test cases');
  assert.equal(tidy('uat run'), 'UAT run');
});

test('groupByTicket — sums minutes and concatenates lines', () => {
  const groups = groupByTicket([
    { jira_key: 'PIM-3073', duration_minutes: 60, description: 'wrote tc' },
    { jira_key: 'PIM-3073', duration_minutes: 30, description: 'reran failing tc' },
    { jira_key: 'ML-1045', duration_minutes: 45, description: 'cart pricing' },
  ]);
  const pim = groups.find(g => g.jira_key === 'PIM-3073');
  const ml = groups.find(g => g.jira_key === 'ML-1045');
  assert.equal(pim.minutes, 90);
  assert.equal(pim.lines.length, 2);
  assert.equal(ml.minutes, 45);
});

test('validateEntry — zero duration is rejected (DevDoc §4.4)', () => {
  const errs = validateEntry({ duration_minutes: 0, slot_start: '10:00', slot_end: '10:30', jira_task_id: 1, description: 'x' });
  assert.ok(errs.some(e => e.includes('duration_minutes')));
});

test('validateEntry — slot_end before slot_start is rejected', () => {
  const errs = validateEntry({ duration_minutes: 30, slot_start: '11:00', slot_end: '10:30', jira_task_id: 1, description: 'x' });
  assert.ok(errs.some(e => e.includes('slot_end')));
});

test('validateDay — flags > 24h total', () => {
  const day = [
    { id: 1, duration_minutes: 1000, slot_start: '08:00', slot_end: '14:00', jira_task_id: 1, description: 'a' },
    { id: 2, duration_minutes: 500,  slot_start: '14:00', slot_end: '20:00', jira_task_id: 2, description: 'b' },
  ];
  const r = validateDay(day);
  assert.ok(r.errors.some(e => e.errs.some(x => x.includes('24h'))));
});

test('validateDay — overlap surfaces a warning (not an error)', () => {
  const day = [
    { id: 1, duration_minutes: 60, slot_start: '10:00', slot_end: '11:00', jira_task_id: 1, description: 'a' },
    { id: 2, duration_minutes: 60, slot_start: '10:30', slot_end: '11:30', jira_task_id: 2, description: 'b' },
  ];
  const r = validateDay(day);
  assert.ok(r.warnings.some(w => w.kind === 'overlap'));
});
