// TodayPage (P05) — the Today / Log-a-Slot screen.
// Refactored on feat/frontend-allpages: the topbar + sidebar JSX moved into
// the shared <AppShell> (web/src/components/shell). The page now owns only
// its body content (hero, reminder banner, form, slot list, close bar).
// All today.css selectors are retained — the shell + body share the same
// stylesheet (today.css) plus the new app-shell.css (drawer additions).

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { api } from '../api';
import { useAuth } from '../auth/AuthContext';
import AppShell from '../components/shell/AppShell';
import Dropdown from '../components/today/Dropdown';
import Icon from '../components/Icon';
import {
  fmtTime, fmtDur, minsBetween, addMinsToClock,
  parseDurText, greeting, todayIso,
} from '../lib/format';

// ---------------------------------------------------------------------------
// Local subcomponents (page-body only — shell pieces live in components/shell)
// ---------------------------------------------------------------------------

function SlotRow({ entry, projectColor }) {
  return (
    <div className="tdy-slot" style={{ '--proj-color': projectColor || 'var(--ac-secondary)' }}>
      <div className="time">
        <span className="t-start">{fmtTime(entry.slot_start)}</span>
        <span className="t-end">{fmtTime(entry.slot_end)}</span>
      </div>
      <div className="body">
        <div className="top-line">
          <span className="proj"><span className="sw" />{entry.project_name}</span>
          <a className="ticket" href="#" onClick={(e) => e.preventDefault()}>
            {entry.jira_key} <span className="ext"><Icon name="ext" /></span>
          </a>
        </div>
        <div className="desc">{entry.description}</div>
      </div>
      <div className="dur">{fmtDur(entry.duration_minutes)}</div>
      <div className="actions">
        <button type="button" className="tdy-row-btn" aria-label="Edit"><Icon name="edit" /></button>
        <button type="button" className="tdy-row-btn del" aria-label="Delete"><Icon name="trash" /></button>
      </div>
    </div>
  );
}

function GapRow({ from, to }) {
  return (
    <div className="tdy-gap-row">
      <div className="gap-time">{fmtTime(from)} → {fmtTime(to)}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="tdy-gap-line" />
        <span className="tdy-gap-lbl">Untracked</span>
        <span className="tdy-gap-line" />
      </div>
      <div />
    </div>
  );
}

function ReminderBanner({ lastEnd, untrackedMins, onLog, onDismiss }) {
  return (
    <div className="tdy-reminder" role="status">
      <div className="ico-r"><Icon name="reminder" /></div>
      <div className="copy">
        <strong>You haven&apos;t logged anything since {fmtTime(lastEnd)}.</strong>
        <span className="sub">That&apos;s about {fmtDur(untrackedMins)} of work to capture. The form below is ready to go.</span>
      </div>
      <div className="actions">
        <button type="button" className="ac-btn ac-btn--outline ac-btn--sm" onClick={onLog}>Log it now</button>
        <button type="button" className="tdy-dismiss" aria-label="Dismiss" onClick={onDismiss}>×</button>
      </div>
    </div>
  );
}

// ===========================================================================
// Page
// ===========================================================================
export default function TodayPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const today = todayIso();

  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [entries, setEntries] = useState([]);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState(null);

  // Form state
  const [projectId, setProjectId] = useState(null);
  const [jiraTaskId, setJiraTaskId] = useState(null);
  const [desc, setDesc] = useState('');
  const [start, setStart] = useState('14:00');
  const [end, setEnd] = useState('15:30');
  const [durText, setDurText] = useState('1h 30m');
  const [timeMode, setTimeMode] = useState('range');
  const [overlap, setOverlap] = useState(null);

  // Load projects + entries on mount
  useEffect(() => {
    api.projects.list()
      .then(d => { setProjects(d.projects); if (d.projects[0]) setProjectId(d.projects[0].id); })
      .catch(e => setError(e.message));
    api.entries.list(today)
      .then(d => setEntries(d.entries || []))
      .catch(e => setError(e.message));
  }, [today]);

  // Reload tasks when project changes; pick first task
  useEffect(() => {
    if (!projectId) { setTasks([]); setJiraTaskId(null); return; }
    api.projects.tasks(projectId)
      .then(d => { setTasks(d.tasks || []); setJiraTaskId(d.tasks?.[0]?.id || null); })
      .catch(e => setError(e.message));
  }, [projectId]);

  const totalMins = entries.reduce((a, e) => a + (e.duration_minutes || 0), 0);
  const lastEnd = entries.length ? entries[entries.length - 1].slot_end : null;

  // Compute display rows = slots interleaved with gap markers
  const rows = useMemo(() => {
    const out = [];
    for (let i = 0; i < entries.length; i++) {
      const s = entries[i];
      if (i > 0) {
        const prev = entries[i - 1];
        if (prev.slot_end !== s.slot_start) {
          out.push({ kind: 'gap', from: prev.slot_end, to: s.slot_start });
        }
      }
      out.push({ kind: 'slot', slot: s });
    }
    return out;
  }, [entries]);

  // Derived duration for the form
  const formDur = useMemo(() => {
    if (timeMode === 'range') return Math.max(0, minsBetween(start, end));
    return parseDurText(durText);
  }, [timeMode, start, end, durText]);

  // Untracked-since-last-slot — drives the reminder banner
  const untrackedMins = useMemo(() => {
    if (!lastEnd) return 0;
    const nowHm = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(new Date());
    return Math.max(0, minsBetween(lastEnd, nowHm));
  }, [lastEnd]);

  const showReminder = !dismissed && totalMins > 0 && untrackedMins > 60;

  // Overlap check (range mode only)
  useEffect(() => {
    if (timeMode !== 'range') { setOverlap(null); return; }
    const s = minsBetween('00:00', start), e = minsBetween('00:00', end);
    if (e <= s) { setOverlap(null); return; }
    const clash = entries.find(en => {
      const a = minsBetween('00:00', en.slot_start), b = minsBetween('00:00', en.slot_end);
      return s < b && e > a;
    });
    setOverlap(clash ? { withId: clash.id, label: `${fmtTime(clash.slot_start)} → ${fmtTime(clash.slot_end)} · ${clash.jira_key}` } : null);
  }, [start, end, timeMode, entries]);

  const onSaveSlot = useCallback(async (e) => {
    e?.preventDefault();
    setError(null);
    if (overlap) return;
    try {
      await api.entries.create({
        project_id: projectId,
        jira_task_id: jiraTaskId,
        description: desc,
        duration_minutes: formDur,
        slot_start: start,
        slot_end: end,
        work_date: today,
      });
      const refreshed = await api.entries.list(today);
      setEntries(refreshed.entries || []);
      setDesc('');
    } catch (err) { setError(err.message); }
  }, [overlap, projectId, jiraTaskId, desc, formDur, start, end, today]);

  const onCloseDay = useCallback(() => {
    if (totalMins === 0) return;
    navigate('/close');
  }, [totalMins, navigate]);

  const dateLong = new Date().toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata', weekday: 'long', month: 'long', day: 'numeric',
  });
  const istClock = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date());

  return (
    <AppShell>
      {error && <div className="ac-banner ac-banner--danger" role="alert">{error}</div>}

      {/* HERO */}
      <section className="tdy-hero">
        <div className="left">
          <div className="tdy-eyebrow">
            <span className="dash" />
            <span>Today · {dateLong}</span>
          </div>
          <h1>Good {greeting()}, {(user?.name || '').split(' ')[0] || 'there'}.</h1>
          <div className="tdy-total-line">
            {totalMins > 0 ? (
              <>
                <span className="tdy-total-chip">
                  <span className="num">{fmtDur(totalMins)}</span>
                  <span className="lbl">logged today</span>
                </span>
                <span className="tdy-since">
                  <span className="dot" />
                  across {entries.length} slot{entries.length === 1 ? '' : 's'} · last at {fmtTime(lastEnd)}
                </span>
              </>
            ) : (
              <span className="tdy-since">
                <span className="dot" />
                Nothing logged yet — your day starts whenever you do.
              </span>
            )}
          </div>
        </div>
        <div className="right">
          <button
            type="button"
            className="ac-btn ac-btn--accent ac-btn--lg"
            disabled={totalMins === 0}
            onClick={onCloseDay}
          >
            Close My Day
            <span className="kbd">⌘↵</span>
          </button>
        </div>
      </section>

      {/* REMINDER */}
      {showReminder && (
        <ReminderBanner
          lastEnd={lastEnd}
          untrackedMins={untrackedMins}
          onLog={() => document.querySelector('.tdy-desc-area')?.focus()}
          onDismiss={() => setDismissed(true)}
        />
      )}

      {/* FORM */}
      <form className="ac-card tdy-form-card" onSubmit={onSaveSlot}>
        <div className="tdy-form-head">
          <div className="title"><span className="dot" /><span>Add a work slot</span></div>
          <div className="meta">
            <span>Press</span><span className="kbd">N</span><span>to focus</span>
          </div>
        </div>
        <div className="tdy-form-body">
          <div className="tdy-row-2">
            <div className="tdy-field">
              <label className="tdy-field-lbl">Project <span className="req">*</span></label>
              <Dropdown kind="project" value={projectId} options={projects} onChange={setProjectId} placeholder="Choose a project" />
            </div>
            <div className="tdy-field">
              <label className="tdy-field-lbl">Jira task <span className="req">*</span></label>
              <Dropdown kind="task" value={jiraTaskId} options={tasks} onChange={setJiraTaskId} placeholder="Pick a task from this project" disabled={!tasks.length} />
            </div>
          </div>

          <div className="tdy-field">
            <label className="tdy-field-lbl">What did you work on?</label>
            <textarea
              className="ac-textarea tdy-desc-area"
              placeholder="A sentence or two — enough that future-you can read it next week and remember what happened."
              value={desc}
              onChange={e => setDesc(e.target.value)}
            />
            <div className="tdy-desc-foot">
              <span>Plain text. Mentions, links, and ticket keys auto-format.</span>
              <div className="chips">
                <button type="button" className="tdy-chip" onClick={() => setDesc(d => (d ? d + ' ' : '') + '#bug')}>+ #bug</button>
                <button type="button" className="tdy-chip" onClick={() => setDesc(d => (d ? d + ' ' : '') + '#review')}>+ #review</button>
                <button type="button" className="tdy-chip" onClick={() => setDesc(d => (d ? d + ' ' : '') + '#standup')}>+ #standup</button>
              </div>
            </div>
          </div>

          <div className="tdy-field">
            <label className="tdy-field-lbl">Time</label>
            <div className="tdy-time-mode" role="radiogroup">
              <button type="button" aria-pressed={timeMode === 'range'}    onClick={() => setTimeMode('range')}><span className="dotk" />Range</button>
              <button type="button" aria-pressed={timeMode === 'duration'} onClick={() => setTimeMode('duration')}><span className="dotk" />Duration</button>
            </div>
            <div className={'tdy-time-controls ' + (overlap ? 'has-error' : '')}>
              {timeMode === 'range' ? (
                <>
                  <div className="tdy-time-input">
                    <span className="mini">Start</span>
                    <input type="time" value={start} onChange={e => setStart(e.target.value)} />
                  </div>
                  <span className="tdy-time-arrow">→</span>
                  <div className="tdy-time-input">
                    <span className="mini">End</span>
                    <input type="time" value={end} onChange={e => setEnd(e.target.value)} />
                  </div>
                  <span className="tdy-dur-tag">= {fmtDur(formDur)}</span>
                </>
              ) : (
                <>
                  <div className="tdy-time-input">
                    <span className="mini">Duration</span>
                    <input type="text" value={durText} onChange={e => setDurText(e.target.value)} placeholder="e.g. 1h 30m" />
                  </div>
                  <span className="tdy-dur-tag">= {fmtDur(formDur)}</span>
                  <span style={{ fontFamily: 'var(--ac-font-mono)', fontSize: 11, color: 'var(--ac-text-subtle)' }}>
                    ends at {fmtTime(addMinsToClock(istClock, formDur))}
                  </span>
                </>
              )}
            </div>
            {overlap && (
              <div className="tdy-form-err">
                <span className="ico-e">!</span>
                <div className="body">
                  <strong>Two slots can&apos;t overlap.</strong>{' '}
                  This window collides with
                  <span className="ticket">{overlap.label}</span>.
                </div>
              </div>
            )}
          </div>

          <div className="tdy-save-row">
            <span className="hint">
              <span className="kbd">⌘</span> + <span className="kbd">↵</span> to save and start the next one.
            </span>
            <button
              type="submit"
              className="ac-btn ac-btn--primary"
              disabled={!!overlap || !projectId || !jiraTaskId || !desc.trim() || formDur <= 0}
            >
              <Icon name="plus" /><span>Save slot</span>
            </button>
          </div>
        </div>
      </form>

      {/* TODAY LIST */}
      <div className="tdy-list-head">
        <h2>
          Today&apos;s log
          <span className="count">{entries.length} slot{entries.length === 1 ? '' : 's'} · {fmtDur(totalMins)}</span>
        </h2>
        <div className="tdy-filters">
          <button type="button" className="tdy-filter" aria-pressed="true">All</button>
          <button type="button" className="tdy-filter">Client</button>
          <button type="button" className="tdy-filter">Internal</button>
        </div>
      </div>

      {entries.length > 0 ? (
        <div className="tdy-slots">
          {rows.map((r, i) =>
            r.kind === 'slot'
              ? <SlotRow
                  key={r.slot.id}
                  entry={r.slot}
                  projectColor={projects.find(p => p.id === r.slot.project_id)?.color}
                />
              : <GapRow key={'gap' + i} from={r.from} to={r.to} />
          )}
        </div>
      ) : (
        <div className="tdy-empty">
          <div className="mark" aria-hidden="true">
            <div className="ring"><div className="hand" /></div>
          </div>
          <h3>Your day starts here.</h3>
          <p>Nothing logged yet. Pick a project + task above, type a sentence about what you did, save the slot. Repeat. Close out at the end of the day.</p>
          <div className="hint-line">Tip: press <span className="kbd">N</span> to jump to the description field.</div>
        </div>
      )}

      {/* CLOSE BAR (sticky bottom) */}
      {entries.length > 0 && (
        <div className="tdy-close-bar">
          <div className="tdy-close-bar-inner">
            <div className="tdy-close-summary">
              <div className="top">
                <span className="num">{fmtDur(totalMins)}</span>
                logged across {entries.length} slot{entries.length === 1 ? '' : 's'} — ready to post.
              </div>
              <div className="sub">
                <span className="dotty" />
                Will sync to Jira, Google Sheet &amp; draft Gmail to your lead
              </div>
            </div>
            <button type="button" className="ac-btn ac-btn--accent" onClick={onCloseDay}>
              Close My Day
              <span className="kbd">⌘↵</span>
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
