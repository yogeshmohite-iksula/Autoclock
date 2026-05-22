// Parser unit tests — Node built-in test runner. Zero deps, deterministic.
// Run: `cd backend && npm test`
// Spec: docs/parser-spec.md  ·  Implementation: backend/services/parser.js

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const {
  parseDuration,
  durationFromSlot,
  tidy,
  groupByTicket,
  validateEntry,
  validateDay,
  toJiraStarted,
} = require('../services/parser');

// ===========================================================================
// parseDuration
// ===========================================================================
describe('parseDuration', () => {
  test('"30m" → 30', () => {
    assert.equal(parseDuration('30m'), 30);
  });

  test('minute-suffix variants all → 45', () => {
    for (const s of ['45m', '45 min', '45 mins', '45 minute', '45 minutes']) {
      assert.equal(parseDuration(s), 45, `variant: ${JSON.stringify(s)}`);
    }
  });

  test('hour-suffix variants all → 60', () => {
    for (const s of ['1h', '1 hr', '1 hrs', '1 hour', '1 hours']) {
      assert.equal(parseDuration(s), 60, `variant: ${JSON.stringify(s)}`);
    }
  });

  test('decimal hours → minutes (rounded)', () => {
    assert.equal(parseDuration('1.5h'), 90);
    assert.equal(parseDuration('2.25hr'), 135);
    assert.equal(parseDuration('0.5 hours'), 30);
  });

  test('"1h 30m" / "1h30m" / "1h30" / "1h 30" all → 90', () => {
    for (const s of ['1h 30m', '1h30m', '1h30', '1h 30']) {
      assert.equal(parseDuration(s), 90, `variant: ${JSON.stringify(s)}`);
    }
  });

  test('HH:MM duration form → minutes', () => {
    assert.equal(parseDuration('1:30'), 90);
    assert.equal(parseDuration('01:30'), 90);
    assert.equal(parseDuration('2:05'), 125);
    assert.equal(parseDuration('0:45'), 45);
  });

  test('bare integer → minutes', () => {
    assert.equal(parseDuration('90'), 90);
    assert.equal(parseDuration('45'), 45);
    assert.equal(parseDuration('1'), 1);
  });

  test('whitespace + case insensitive', () => {
    assert.equal(parseDuration('  1H 30M  '), 90);
    assert.equal(parseDuration('1.5 HOURS 30 MINUTES'), 120);
    assert.equal(parseDuration('  90  '), 90);
  });

  test('invalid / ambiguous → 0', () => {
    for (const s of ['', 'abc', '1.5', 'h30', '30x', '1h30s', '-30m', '-1h']) {
      assert.equal(parseDuration(s), 0, `invalid: ${JSON.stringify(s)}`);
    }
    assert.equal(parseDuration(null), 0);
    assert.equal(parseDuration(undefined), 0);
  });

  test('zero values → 0 (validator catches it)', () => {
    assert.equal(parseDuration('0'), 0);
    assert.equal(parseDuration('0m'), 0);
    assert.equal(parseDuration('0h'), 0);
    assert.equal(parseDuration('0:00'), 0);
  });

  test('large but valid input does not break', () => {
    assert.equal(parseDuration('100h'), 6000);
    assert.equal(parseDuration('999h'), 59940);
  });

  test('decimal minutes rejected (ambiguous)', () => {
    assert.equal(parseDuration('45.5'), 0);
    assert.equal(parseDuration('45.5m'), 0);
  });

  test('HH:MM with minutes ≥ 60 rejected', () => {
    assert.equal(parseDuration('1:60'), 0);
    assert.equal(parseDuration('2:99'), 0);
  });
});

// ===========================================================================
// durationFromSlot
// ===========================================================================
describe('durationFromSlot', () => {
  test('normal range → minutes', () => {
    assert.equal(durationFromSlot('14:30', '16:00'), 90);
    assert.equal(durationFromSlot('09:00', '09:30'), 30);
  });

  test('equal start/end → 0', () => {
    assert.equal(durationFromSlot('10:00', '10:00'), 0);
  });

  test('end before start (NO midnight cross) → 0', () => {
    assert.equal(durationFromSlot('22:00', '01:00'), 0);
    assert.equal(durationFromSlot('11:00', '10:30'), 0);
  });

  test('malformed HH:MM → 0', () => {
    assert.equal(durationFromSlot('1430', '1600'), 0);
    assert.equal(durationFromSlot('25:00', '26:00'), 0);
    assert.equal(durationFromSlot('10:99', '11:00'), 0);
    assert.equal(durationFromSlot('', ''), 0);
    assert.equal(durationFromSlot(null, '10:00'), 0);
  });
});

// ===========================================================================
// tidy
// ===========================================================================
describe('tidy', () => {
  test('trims + collapses internal whitespace', () => {
    assert.equal(tidy('  fixed   bugs  '), 'Fixed bugs');
  });

  test('expands each shorthand (whole-word, case-insensitive)', () => {
    assert.equal(tidy('scrum'), 'Daily Scrum');
    assert.equal(tidy('standup'), 'Stand-up');
    assert.equal(tidy('write tc'), 'Write test cases');
    assert.equal(tidy('grooming'), 'Backlog Grooming');
    assert.equal(tidy('uat run'), 'UAT run');
    assert.equal(tidy('qa work'), 'QA work');
    assert.equal(tidy('pr review'), 'PR review');
    // case-insensitive
    assert.equal(tidy('Scrum'), 'Daily Scrum');
    assert.equal(tidy('write TC'), 'Write test cases');
    // word-boundary respected (no replacement mid-word)
    assert.equal(tidy('matching scrums'), 'Matching scrums');
  });

  test('strips trailing , ; : but keeps . ! ?', () => {
    assert.equal(tidy('fixed bug,'), 'Fixed bug');
    assert.equal(tidy('done;'), 'Done');
    assert.equal(tidy('fyi:'), 'Fyi');
    assert.equal(tidy('done.'), 'Done.');
    assert.equal(tidy('really?'), 'Really?');
    assert.equal(tidy('great!'), 'Great!');
  });

  test('null / undefined / empty / whitespace-only → ""', () => {
    assert.equal(tidy(null), '');
    assert.equal(tidy(undefined), '');
    assert.equal(tidy(''), '');
    assert.equal(tidy('   '), '');
    assert.equal(tidy('\t\n'), '');
  });

  test('capitalises the first character', () => {
    assert.equal(tidy('lowercase start'), 'Lowercase start');
    assert.equal(tidy('already Capital'), 'Already Capital');
  });
});

// ===========================================================================
// groupByTicket
// ===========================================================================
describe('groupByTicket', () => {
  test('sums minutes and tidies lines', () => {
    const groups = groupByTicket([
      { jira_key: 'PIM-3073', duration_minutes: 60, description: 'wrote tc' },
      { jira_key: 'PIM-3073', duration_minutes: 30, description: 'reran failing tc' },
      { jira_key: 'ML-1045', duration_minutes: 45, description: 'cart pricing' },
    ]);
    const pim = groups.find(g => g.jira_key === 'PIM-3073');
    const ml = groups.find(g => g.jira_key === 'ML-1045');
    assert.equal(pim.minutes, 90);
    assert.deepEqual(pim.lines, ['Wrote test cases', 'Reran failing test cases']);
    assert.equal(ml.minutes, 45);
  });

  test('preserves first-seen order', () => {
    const groups = groupByTicket([
      { jira_key: 'B', duration_minutes: 10, description: 'b' },
      { jira_key: 'A', duration_minutes: 20, description: 'a' },
      { jira_key: 'B', duration_minutes: 30, description: 'b2' },
    ]);
    assert.deepEqual(groups.map(g => g.jira_key), ['B', 'A']);
  });

  test('empty input → empty array', () => {
    assert.deepEqual(groupByTicket([]), []);
    assert.deepEqual(groupByTicket(null), []);
    assert.deepEqual(groupByTicket(undefined), []);
  });

  test('single entry → single group', () => {
    const groups = groupByTicket([{ jira_key: 'X-1', duration_minutes: 30, description: 'x' }]);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].minutes, 30);
    assert.deepEqual(groups[0].lines, ['X']);
  });
});

// ===========================================================================
// validateEntry
// ===========================================================================
describe('validateEntry', () => {
  const ok = {
    id: 1,
    jira_task_id: 7,
    description: 'fixed regression',
    duration_minutes: 30,
    slot_start: '10:00',
    slot_end: '10:30',
  };

  test('OK input → no errors', () => {
    assert.deepEqual(validateEntry(ok), []);
  });

  test('missing jira_task_id rejected', () => {
    assert.ok(validateEntry({ ...ok, jira_task_id: null }).some(e => e.includes('jira_task_id')));
    assert.ok(validateEntry({ ...ok, jira_task_id: 0 }).some(e => e.includes('jira_task_id')));
    assert.ok(validateEntry({ ...ok, jira_task_id: undefined }).some(e => e.includes('jira_task_id')));
  });

  test('empty / whitespace-only description rejected', () => {
    assert.ok(validateEntry({ ...ok, description: '' }).some(e => e.includes('description required')));
    assert.ok(validateEntry({ ...ok, description: '   ' }).some(e => e.includes('description required')));
    assert.ok(validateEntry({ ...ok, description: null }).some(e => e.includes('description required')));
  });

  test('description longer than 1000 chars rejected', () => {
    const long = 'x'.repeat(1001);
    assert.ok(validateEntry({ ...ok, description: long }).some(e => e.includes('too long')));
    // 1000 exactly is OK
    assert.deepEqual(validateEntry({ ...ok, description: 'x'.repeat(1000) }), []);
  });

  test('non-positive or non-integer duration rejected', () => {
    assert.ok(validateEntry({ ...ok, duration_minutes: 0 }).some(e => e.includes('duration_minutes')));
    assert.ok(validateEntry({ ...ok, duration_minutes: -5 }).some(e => e.includes('duration_minutes')));
    assert.ok(validateEntry({ ...ok, duration_minutes: 30.5 }).some(e => e.includes('duration_minutes')));
    assert.ok(validateEntry({ ...ok, duration_minutes: '30' }).some(e => e.includes('duration_minutes')));
  });

  test('malformed HH:MM rejected', () => {
    assert.ok(validateEntry({ ...ok, slot_start: '9:00' }).some(e => e.includes('slot_start')));
    assert.ok(validateEntry({ ...ok, slot_end: '25:00' }).some(e => e.includes('slot_end')));
    assert.ok(validateEntry({ ...ok, slot_start: '10:99' }).some(e => e.includes('slot_start')));
    assert.ok(validateEntry({ ...ok, slot_start: '' }).some(e => e.includes('slot_start')));
  });

  test('slot_end <= slot_start rejected', () => {
    assert.ok(validateEntry({ ...ok, slot_start: '11:00', slot_end: '10:30' }).some(e => e.includes('after')));
    assert.ok(validateEntry({ ...ok, slot_start: '10:00', slot_end: '10:00' }).some(e => e.includes('after')));
  });

  test('null/undefined entry → single clear error', () => {
    assert.deepEqual(validateEntry(null), ['entry is null/undefined']);
    assert.deepEqual(validateEntry(undefined), ['entry is null/undefined']);
  });
});

// ===========================================================================
// validateDay
// ===========================================================================
describe('validateDay', () => {
  test('total > 24h → error (blocks Confirm)', () => {
    const day = [
      { id: 1, jira_task_id: 1, description: 'a', duration_minutes: 1000, slot_start: '08:00', slot_end: '14:00' },
      { id: 2, jira_task_id: 2, description: 'b', duration_minutes: 500,  slot_start: '14:00', slot_end: '20:00' },
    ];
    const r = validateDay(day);
    assert.ok(r.errors.some(e => e.errs.some(x => x.includes('24h'))));
    assert.equal(r.total_minutes, 1500);
  });

  test('overlap → warning, NEVER error', () => {
    const day = [
      { id: 1, jira_task_id: 1, description: 'a', duration_minutes: 60, slot_start: '10:00', slot_end: '11:00' },
      { id: 2, jira_task_id: 2, description: 'b', duration_minutes: 60, slot_start: '10:30', slot_end: '11:30' },
    ];
    const r = validateDay(day);
    assert.ok(r.warnings.some(w => w.kind === 'overlap'));
    // No 24h or null-entry errors
    assert.equal(r.errors.filter(e => e.entry_id === null).length, 0);
  });

  test('clean adjacent day → no overlap, no large_gap, no mismatch', () => {
    const day = [
      { id: 1, jira_task_id: 1, description: 'a', duration_minutes: 60, slot_start: '10:00', slot_end: '11:00' },
      { id: 2, jira_task_id: 2, description: 'b', duration_minutes: 60, slot_start: '11:00', slot_end: '12:00' },
    ];
    const r = validateDay(day);
    assert.deepEqual(r.errors, []);
    assert.equal(r.warnings.filter(w => w.kind === 'overlap').length, 0);
    assert.equal(r.warnings.filter(w => w.kind === 'duration_mismatch').length, 0);
    assert.equal(r.warnings.filter(w => w.kind === 'large_gap').length, 0);
    assert.equal(r.total_minutes, 120);
  });

  test('duration_minutes ≠ slot length → duration_mismatch warning', () => {
    const day = [
      { id: 1, jira_task_id: 1, description: 'a', duration_minutes: 90, slot_start: '10:00', slot_end: '11:00' },
    ];
    const r = validateDay(day);
    const w = r.warnings.find(w => w.kind === 'duration_mismatch');
    assert.ok(w);
    assert.equal(w.entry_id, 1);
    assert.equal(w.slot_minutes, 60);
    assert.equal(w.duration_minutes, 90);
  });

  test('gap > 4h between adjacent slots → large_gap warning', () => {
    const day = [
      { id: 1, jira_task_id: 1, description: 'a', duration_minutes: 60, slot_start: '08:00', slot_end: '09:00' },
      { id: 2, jira_task_id: 2, description: 'b', duration_minutes: 60, slot_start: '15:30', slot_end: '16:30' },
    ];
    const r = validateDay(day);
    const w = r.warnings.find(w => w.kind === 'large_gap');
    assert.ok(w);
    assert.equal(w.gap_minutes, 390); // 6h 30m
  });

  test('null / empty input handled gracefully', () => {
    assert.deepEqual(validateDay([]), { errors: [], warnings: [], total_minutes: 0 });
    assert.deepEqual(validateDay(null), { errors: [], warnings: [], total_minutes: 0 });
  });
});

// ===========================================================================
// toJiraStarted
// ===========================================================================
describe('toJiraStarted', () => {
  test('builds IST-offset started string', () => {
    assert.equal(toJiraStarted('2026-05-22', '14:30'), '2026-05-22T14:30:00.000+0530');
    assert.equal(toJiraStarted('2026-12-31', '00:05'), '2026-12-31T00:05:00.000+0530');
  });
});
