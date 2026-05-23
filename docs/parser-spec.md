# AutoClock Parser — Frozen Public Interface (v0.2)

> Source: `backend/services/parser.js`. CommonJS. Zero runtime deps (ADR-02).
> **Stability contract:** these signatures + return shapes are FROZEN. Keval's entries API (B3) consumes them. Behavioural changes after merge require team OK.

---

## Public API

### `parseDuration(raw: string | number | null | undefined): number`
Convert any supported duration format to **integer minutes**. Returns `0` on invalid input (the validator rejects `0`, so junk never reaches Jira).

| Input | Result |
|---|---:|
| `"30m"`, `"30 min"`, `"30 mins"`, `"30 minutes"` | 30 |
| `"1h"`, `"1 hr"`, `"1 hrs"`, `"1 hour"`, `"1 hours"` | 60 |
| `"1.5h"`, `"2.25hr"` | 90, 135 |
| `"1h 30m"`, `"1h30m"`, `"1h30"`, `"1h 30"` | 90 |
| `"1:30"`, `"01:30"`, `"2:05"` | 90, 90, 125 |
| `"90"`, `"45"` | 90, 45 |
| `""`, `"abc"`, `"1.5"`, `"-30m"`, `null`, `undefined` | 0 |

**Decisions:** lowercase + whitespace-insensitive; decimal hours rounded with `Math.round`; bare integer = minutes (matches DevDoc §4.1); decimal minutes rejected; negatives rejected; ambiguous tokens (e.g. bare `"1.5"`) rejected.

### `durationFromSlot(slotStart: "HH:MM", slotEnd: "HH:MM"): number`
Minutes between two clock times. `0` if either string fails `^\d{2}:\d{2}$`, or if `slotEnd <= slotStart` (we never imply midnight-cross).

### `tidy(desc: string | null | undefined): string`
Deterministically clean a free-text description:
- Trim, collapse internal whitespace
- Expand shorthand (whole-word, case-insensitive): `scrum→Daily Scrum`, `standup→Stand-up`, `tc→test cases`, `grooming→Backlog Grooming`, `uat→UAT`, `qa→QA`, `pr→PR`
- Capitalise the first character
- Strip a trailing comma/semicolon/colon (keep `.` `!` `?`)
- Empty / null → `""`

### `groupByTicket(entries: Entry[]): Group[]`
```ts
Entry = { jira_key: string, duration_minutes: number, description: string, ... }
Group = { jira_key: string, minutes: number, lines: string[] }
```
- Stable ordering: groups appear in first-seen order.
- Each line is `tidy`-ed once on insertion.
- `null` or `undefined` elements, and entries missing `jira_key` (or with a falsy one), are silently skipped — never crashes EP-12 preview.
- A non-integer `duration_minutes` contributes `0` (matches `validateEntry`).
- Empty input (`[]`, `null`, `undefined`) → `[]`.

### `validateEntry(entry: Entry): string[]`
Returns an array of human-readable errors. Empty array = valid. Checks:
- `jira_task_id` truthy
- `description` non-empty after trim, length ≤ 1000
- `duration_minutes` is a positive integer
- `slot_start` and `slot_end` match `^\d{2}:\d{2}$` (HH 00–23, MM 00–59)
- `slot_end > slot_start`

**Defensive:** if `entry` itself is `null` or `undefined`, returns the single-element array `['entry is null/undefined']` rather than throwing. The normal flow never hits this — but a malformed payload from EP-09/10 or a sparse-array preview should produce a clear error, not a `TypeError`.

### `validateDay(entries: Entry[]): DayReport`
```ts
DayReport = {
  errors:   Array<{ entry_id: number|null, errs: string[] }>,
  warnings: Array<Warning>,
  total_minutes: number,
}
Warning =
  | { kind: 'overlap',            between: [id1, id2] }
  | { kind: 'duration_mismatch',  entry_id, slot_minutes, duration_minutes }
  | { kind: 'large_gap',          between: [id1, id2], gap_minutes }
```
- **Errors** (BLOCK Confirm): all per-entry errors + `total_minutes > 1440` (24 h).
- **Warnings** (DON'T block — surfaced in the preview UI per FR-04): overlaps; `duration_minutes ≠ slot_minutes`; gaps > 4 h between adjacent slots.
- Never silently fixes or drops data.

### `toJiraStarted(workDate: "YYYY-MM-DD", slotStart: "HH:MM"): string`
Returns `"YYYY-MM-DDThh:mm:00.000+0530"` (IST). Unchanged from v0.1.

---

## What changes vs scaffolded v0.1

1. **`parseDuration` rewritten** with anchored patterns — no silent partial matches. Adds `1h30`, `1:30`, decimal hours, rejects ambiguous decimals + negatives.
2. **`durationFromSlot` added.**
3. **`tidy`** — adds `qa`, `pr`; trims trailing punctuation safely.
4. **`validateEntry`** — adds `HH:MM` regex check and 1000-char description cap.
5. **`validateDay`** — adds `duration_mismatch` and `large_gap` warnings (NEVER errors — preview surfaces them but Confirm still allowed).

---

## Test Plan (`backend/test/parser.test.js`)

~30 tests under Node's built-in runner, zero deps. Sketch:

- **parseDuration (12):** each row of the table above + ugly inputs (negative, decimal minutes, mixed garbage, leading zeros, very large like `999h`).
- **durationFromSlot (4):** normal, midnight-cross rejected → 0, equal start/end → 0, malformed HH:MM → 0.
- **tidy (5):** trim+collapse, each shorthand expansion, capitalisation, null/empty, trailing-punctuation cleanup.
- **groupByTicket (4):** sums + lines, stable order, empty input, single entry.
- **validateEntry (6):** missing jira_task_id, empty description, oversize description, non-integer duration, HH:MM regex, end ≤ start.
- **validateDay (5):** 24 h cap blocks, overlap warning, no-overlap clean, duration_mismatch warning, large_gap warning.
- **toJiraStarted (1):** IST offset.

All tests deterministic; no fixtures, no real time.
