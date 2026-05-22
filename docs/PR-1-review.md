# PR #1 Code Review — `feat/parser` → `main`

> Strict review against `docs/parser-spec.md` (frozen v0.2 interface) and `docs/AutoClock_PRD.md` (FR-03 + §9). **Test suite: 41/41 passing**. No code modified — review only.

---

## ✅ Interface matches the frozen spec

All 7 exports are present with the documented signatures and return shapes:
`parseDuration`, `durationFromSlot`, `tidy`, `groupByTicket`, `validateEntry`, `validateDay`, `toJiraStarted`. The `Warning` discriminated union (`overlap` / `duration_mismatch` / `large_gap`) and the `DayReport` shape both match the spec exactly.

---

## ✅ PRD §9 coverage (parser-scope rows only)

| §9 row | Handled | Where |
|---|---|---|
| `"1.5h" / "90m" / "1h30"` formats | ✅ | `parseDuration` + 13 tests |
| Overlapping time slots → flag | ✅ | `validateDay` overlap warning (non-blocking, FR-04 ✓) |
| Total > 24 h → block | ✅ | `validateDay` error |
| Parser never silently fixes / drops data | ✅ | Junk → `0`, validator rejects loudly |

Out-of-scope rows (403/429, token expiry, sheet formulas, leave, offline) are correctly NOT in the parser's responsibility.

---

## 🔴 1 blocker / 🟡 4 mediums / 🟢 4 nits

### 🔴 BLOCKER — `groupByTicket` will crash on null elements inside the array

```js
function groupByTicket(entries) {
  for (const e of entries || []) {
    const key = e.jira_key;   // TypeError if e is null
    ...
  }
}
```

`validateDay` is defensively null-safe (uses `e?.id`, `Number.isInteger(e?.duration_minutes)`), but `groupByTicket` is not. If `entries` contains a `null` (e.g. a half-saved draft, a deserialisation glitch, a `JSON.parse` of a sparse array), the EP-12 preview crashes.

**Fix:** `if (!e || !e.jira_key) continue;` at the top of the loop.
**Test:** add `groupByTicket([null, { jira_key: 'X', duration_minutes: 30, description: 'y' }])`.

### 🟡 MEDIUM — `Number.isFinite` vs `Number.isInteger` inconsistency

`groupByTicket` accepts `30.5` (`Number.isFinite`) but `validateEntry` rejects it (`Number.isInteger`). In the live flow, validation runs first, so this never bites — but the asymmetry will trip a future maintainer. Use `Number.isInteger` in both places (or document why they differ).

### 🟡 MEDIUM — Unit-normalisation regex matches digit-attached forms (intentional, but worth a test)

`(hours?|hrs?)\b` (no leading boundary) makes `"30hour"` → `"30h"` → 1800 min. This is the same trick that lets `"2.25hr"` work, so it's correct — but there's no test asserting `"30hour"`/`"1minute"`. Lock the behaviour with a test so a future tightening doesn't silently break it.

### 🟡 MEDIUM — `parseDuration` accepts `number` but no test covers it

Spec says `raw: string | number`. The body uses `String(raw)`, so a number works. **No test exercises `parseDuration(90)` or `parseDuration(1.5)`.** Add one to lock the documented signature.

### 🟡 MEDIUM — Spec doesn't document the `'entry is null/undefined'` error from `validateEntry`

Small spec-vs-implementation drift. Either remove the special case (fall through to the existing checks — `jira_task_id` would fail first), or add a line to `docs/parser-spec.md` documenting the error string.

### 🟢 NIT — Freeze `SHORTHAND`

`const SHORTHAND = Object.freeze({ ... })` guards against accidental mutation from a future contributor or a test that monkey-patches it.

### 🟢 NIT — `escapeRegex` is dead defence

All SHORTHAND keys are `[a-z]+`; `escapeRegex` is never exercised. Either drop it or add a SHORTHAND key with a meta-character to exercise it (e.g. `"q.a": "Q.A."`). Low priority.

### 🟢 NIT — `LARGE_GAP_MINUTES = 240` is hardcoded

PRD never names a threshold; 4 h is a defensible default for an Iksula workday. Either document the choice in `docs/parser-spec.md` or move to `settings` (TB-11) so the Ops admin can tune it without a deploy.

### 🟢 NIT — `parseDuration('24:00')` returns 1440

`validateEntry` doesn't cap single-entry duration at < 1440 (only day-total does). In practice no single slot can be 1440 because `slot_end > slot_start` and both are clamped 00–23, so max via slot calc is 1439. But via raw duration string a user can sneak in 1440 for a single entry. Consider clamping single-entry `duration_minutes <= 1440` (or `< 1440`).

---

## Verdict

**Merge with one change requested:** fix the `groupByTicket` null-element crash + add the test. Everything else is non-blocking — happy to merge them as follow-up commits on `feat/parser` before merge, or as a tiny follow-up PR.

Other than the one defensive bug, the implementation is clean, the regex grammar is documented and anchored, the warning/error split honours FR-04, and the test suite genuinely exercises the spec.
