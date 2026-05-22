// TodayPage (P05) — the Today / Log-a-Slot screen.
// Ported from docs/FrontEnd Design/today-app.jsx. Tweak panel, EDITMODE,
// data-comment-anchor, prototype mock data and the prototype's view /
// timeMode / collapsed / role tweaks all removed.
//
// Prototype view values become real state:
//   'empty'          → driven by entries.length === 0
//   'with-logs'      → default once entries are loaded
//   'overlap-error'  → computed when a new slot overlaps an existing one

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { api } from '../api';
import { useAuth } from '../auth/AuthContext';
import Dropdown from '../components/today/Dropdown';
import {
  initials, fmtTime, fmtDur, minsBetween, addMinsToClock,
  parseDurText, greeting, todayIso,
} from '../lib/format';

import '../styles/today.css';

const ROLE_LABELS = {
  employee: 'Employee', pm_lead: 'PM / Lead',
  management: 'Management', operations: 'Operations', admin: 'Admin',
};

// ===========================================================================
// Icons (pure SVG, no dep)
// ===========================================================================
function Icon({ name }) {
  const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'today':    return <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" {...s}/><path d="M12 7.5V12l3 2.2" {...s}/></svg>;
    case 'history':  return <svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.5-5.8" {...s}/><path d="M4 4v3.5H7.5" {...s}/><path d="M12 8v4l3 2" {...s}/></svg>;
    case 'settings': return <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="2.6" {...s}/><path d="M19.4 13.3a7.6 7.6 0 0 0 0-2.6l1.7-1.3-1.7-3-2 .7a7.6 7.6 0 0 0-2.3-1.3L14.6 4h-5.2l-.5 1.8a7.6 7.6 0 0 0-2.3 1.3l-2-.7-1.7 3 1.7 1.3a7.6 7.6 0 0 0 0 2.6L2.9 14.6l1.7 3 2-.7a7.6 7.6 0 0 0 2.3 1.3l.5 1.8h5.2l.5-1.8a7.6 7.6 0 0 0 2.3-1.3l2 .7 1.7-3-1.7-1.3z" {...s}/></svg>;
    case 'bell':     return <svg viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2H4.5L6 16z" {...s}/><path d="M10 20a2 2 0 0 0 4 0" {...s}/></svg>;
    case 'search':   return <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" {...s}/><path d="M16 16l4 4" {...s}/></svg>;
    case 'help':     return <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" {...s}/><path d="M9.5 9.5c.3-1.4 1.4-2 2.5-2 1.4 0 2.5.8 2.5 2.2 0 1.5-2.5 1.8-2.5 3.3" {...s}/><circle cx="12" cy="16.5" r=".5" fill="currentColor" stroke="none"/></svg>;
    case 'plus':     return <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" {...s}/></svg>;
    case 'edit':     return <svg viewBox="0 0 24 24"><path d="M14.5 5.5l4 4L8 20H4v-4L14.5 5.5z" {...s}/></svg>;
    case 'trash':    return <svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" {...s}/></svg>;
    case 'ext':      return <svg viewBox="0 0 24 24"><path d="M9 5h10v10M19 5L9 15M5 9v10h10" {...s}/></svg>;
    case 'reminder': return <svg viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2H4.5L6 16z" {...s}/><path d="M10 20a2 2 0 0 0 4 0" {...s}/></svg>;
    default: return null;
  }
}

function Sidebar({ collapsed, onToggle }) {
  return (
    <aside className="tdy-sidebar">
      <div className="tdy-nav-section">
        <div className="tdy-nav-header"><span>Workspace</span><span className="hr" /></div>
        <a className="tdy-nav-item active" href="/today">
          <span className="tdy-nav-icon"><Icon name="today" /></span>
          <span className="label">Today</span>
          <span className="meta">T</span>
        </a>
        <a className="tdy-nav-item">
          <span className="tdy-nav-icon"><Icon name="history" /></span>
          <span className="label">My History</span>
        </a>
      </div>
      <div className="tdy-nav-section">
        <div className="tdy-nav-header"><span>You</span><span className="hr" /></div>
        <a className="tdy-nav-item">
          <span className="tdy-nav-icon"><Icon name="settings" /></span>
          <span className="label">Settings</span>
        </a>
      </div>
      <div className="tdy-sidebar-spacer" />
      <button type="button" className="tdy-collapse-btn" onClick={onToggle}>
        <span aria-hidden="true">{collapsed ? '»' : '«'}</span>
        <span className="label">Collapse</span>
      </button>
    </aside>
  );
}

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
  const { user, signOut } = useAuth();

  const today = todayIso();

  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [entries, setEntries] = useState([]);
  const [collapsed, setCollapsed] = useState(false);
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

  // Sidebar collapse → reflect on body so CSS grid responds
  useEffect(() => {
    document.body.dataset.tdyCollapsed = String(collapsed);
    return () => { document.body.dataset.tdyCollapsed = 'false'; };
  }, [collapsed]);

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
  const lastEnd   = entries.length ? entries[entries.length - 1].slot_end : null;

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
    // Hand off to the parser's /preview screen (Yogesh's PR follow-up).
    navigate('/preview');
  }, [totalMins, navigate]);

  const onSignOut = async () => { await signOut(); navigate('/sign-in', { replace: true }); };

  const dateLong = new Date().toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata', weekday: 'long', month: 'long', day: 'numeric',
  });
  const yr = new Date().getFullYear();
  const istClock = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date());

  return (
    <div className="tdy-root">
      {/* TOP BAR */}
      <div className="tdy-topbar">
        <div className="tdy-brand">
          <span className="tdy-brand-mark" aria-hidden="true"><span className="face" /></span>
          <span className="tdy-wordmark">AutoClock</span>
        </div>
        <div className="tdy-topbar-center">
          <div className="tdy-date-pill">
            <span className="day">{dateLong}, {yr}</span>
            <span className="sep" />
            <span className="clock">{istClock} IST</span>
            <span className="sep" />
            <span className="week">W{isoWeek(new Date())}</span>
          </div>
        </div>
        <div className="tdy-topbar-right">
          <button type="button" className="tdy-icon-btn" aria-label="Search"><Icon name="search" /></button>
          <button type="button" className="tdy-icon-btn" aria-label="Help"><Icon name="help" /></button>
          <button type="button" className="tdy-icon-btn" aria-label="Notifications">
            <Icon name="bell" /><span className="badge">2</span>
          </button>
          <button type="button" className="tdy-user-menu" onClick={onSignOut} title="Sign out">
            <span className="tdy-avatar">{initials(user?.name || '')}</span>
            <div className="tdy-user-meta">
              <div className="name">{user?.name || ''}</div>
              <div className="role">{ROLE_LABELS[user?.role] || 'Employee'}</div>
            </div>
            <span className="caret">▾</span>
          </button>
        </div>
      </div>

      {/* BODY */}
      <div className="tdy-body-grid">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} />

        <main className="tdy-main">
          <div className="tdy-main-inner">

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
                      <span className="tdy-chip" onClick={() => setDesc(d => (d ? d + ' ' : '') + '#bug')}>+ #bug</span>
                      <span className="tdy-chip" onClick={() => setDesc(d => (d ? d + ' ' : '') + '#review')}>+ #review</span>
                      <span className="tdy-chip" onClick={() => setDesc(d => (d ? d + ' ' : '') + '#standup')}>+ #standup</span>
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
          </div>

          {/* CLOSE BAR */}
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
        </main>
      </div>
    </div>
  );
}

// ISO week number — used in the date pill (W21 etc.)
function isoWeek(d) {
  const target = new Date(d.valueOf());
  const dayNr = (target.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThu = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  return Math.ceil((firstThu - target) / 604800000) + 1;
}
