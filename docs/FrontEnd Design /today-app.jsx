/* global React, ReactDOM, useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakSelect, TweakToggle, TweakText, TweakSlider */
const { useState, useEffect, useMemo, useRef } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "view": "with-logs",
  "showReminder": true,
  "timeMode": "range",
  "role": "employee",
  "collapsed": false
}/*EDITMODE-END*/;

/* ====================== DATA ====================== */
const PROJECTS = [
  { id: 'pim',  name: 'SiteOne PIM',     color: '#2563EB', tag: 'CLIENT' },
  { id: 'ops',  name: 'Sprint Ops',      color: '#10B981', tag: 'INTERNAL' },
  { id: 'rd',   name: 'Internal R&D',    color: '#F59E0B', tag: 'INTERNAL' },
  { id: 'aca',  name: 'Iksula Academy',  color: '#8B5CF6', tag: 'INTERNAL' },
];

const TASKS = {
  pim: [
    { key: 'PIM-3066', title: 'Reviewed PR for supplier import script' },
    { key: 'PIM-3068', title: 'SKU variant mapping — test coverage' },
    { key: 'PIM-3072', title: 'Catalog import escalation (yesterday)' },
    { key: 'PIM-3073', title: 'Catalog import bug — CSV parser crash on quoted rows' },
    { key: 'PIM-3081', title: 'Image CDN failover smoke tests' },
  ],
  ops: [
    { key: 'OPS-412', title: 'Daily QA standup' },
    { key: 'OPS-415', title: 'Sprint retro prep' },
  ],
  rd: [
    { key: 'RD-201', title: 'Playwright fixture pairing session' },
    { key: 'RD-208', title: 'Investigate flaky Selenium runner' },
  ],
  aca: [
    { key: 'ACA-71', title: 'Mentor session — new QA hires' },
  ],
};

/* sample QA-team day, totals 5h 30m */
const TODAY_SLOTS = [
  { id:'s1', start:'07:30', end:'08:30', proj:'pim', task:'PIM-3066',
    desc:"Reviewed Riya's PR for the supplier import script — left 4 comments on schema edge cases, approved after a tiny rebase.",
    mins: 60 },
  { id:'s2', start:'08:30', end:'10:00', proj:'pim', task:'PIM-3068',
    desc:"Wrote 15 test cases for SKU-variant mapping. Two edge cases (parent-only variants without children) flagged to dev — likely a separate ticket.",
    mins: 90 },
  { id:'s3', start:'10:00', end:'10:30', proj:'ops', task:'OPS-412',
    desc:"Daily QA standup. Flagged the catalog import regression from yesterday — dev pulled it into the active sprint.",
    mins: 30 },
  { id:'s4', start:'10:30', end:'12:00', proj:'pim', task:'PIM-3072',
    desc:"Triaged 14 catalog import tickets from yesterday's escalation. Grouped them into 3 root causes; root cause #1 already has a fix on staging.",
    mins: 90 },
  { id:'s5', start:'12:00', end:'13:00', proj:'rd', task:'RD-201',
    desc:"Paired with Anuja on the new Playwright fixture — got the auth helper working, but the parallel runner config is still flaky.",
    mins: 60 },
];

/* ====================== UI HELPERS ====================== */
const ROLE_LABELS = { employee:"Employee", pm:"PM / Lead", management:"Management", operations:"Operations", admin:"Admin" };
const USER = { name: "Yogesh Mohite" };

function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0,2).map(s => s[0].toUpperCase()).join('');
}
function fmtTime(hhmm) {
  if (!hhmm) return '—';
  const [h, m] = hhmm.split(':').map(Number);
  const am = h < 12;
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${m.toString().padStart(2,'0')} ${am ? 'AM' : 'PM'}`;
}
function fmtDur(mins) {
  if (mins == null) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}
function minsBetween(start, end) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}
function projOf(id) { return PROJECTS.find(p => p.id === id); }
function taskOf(projId, key) { return (TASKS[projId] || []).find(t => t.key === key); }

/* ====================== ICONS ====================== */
function Icon({ name }) {
  const s = { fill:'none', stroke:'currentColor', strokeWidth:1.6, strokeLinecap:'round', strokeLinejoin:'round' };
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
    case 'clock':    return <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" {...s}/><path d="M12 7v5l3 2" {...s}/></svg>;
    case 'arr':      return <svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" {...s}/></svg>;
    case 'check':    return <svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" {...s}/></svg>;
    case 'ext':      return <svg viewBox="0 0 24 24"><path d="M9 5h10v10M19 5L9 15M5 9v10h10" {...s}/></svg>;
    case 'bolt':     return <svg viewBox="0 0 24 24"><path d="M13 3L4 14h7l-1 7 9-11h-7l1-7z" {...s}/></svg>;
    case 'reminder': return <svg viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2H4.5L6 16z" {...s}/><path d="M10 20a2 2 0 0 0 4 0" {...s}/></svg>;
    default: return null;
  }
}

/* ====================== DROPDOWN ====================== */
function Dropdown({ kind, value, options, onChange, placeholder, disabled }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const filtered = useMemo(() => {
    if (!q.trim()) return options;
    const needle = q.toLowerCase();
    return options.filter(o => {
      const hay = (kind === 'project' ? o.name : (o.key + ' ' + o.title)).toLowerCase();
      return hay.includes(needle);
    });
  }, [options, q, kind]);

  const selected = options.find(o => (kind === 'project' ? o.id : o.key) === value);

  return (
    <div className={"ddown " + (open ? 'open' : '')} ref={ref}>
      <button
        type="button"
        className="ddown-btn"
        onClick={() => !disabled && setOpen(v => !v)}
        disabled={disabled}
      >
        {kind === 'project' ? (
          <React.Fragment>
            <span className={"swatch " + (selected ? '' : 'x')} style={selected ? { background: selected.color } : null}></span>
            {selected
              ? <span>{selected.name}</span>
              : <span className="placeholder">{placeholder}</span>}
            <span className="arr">▾</span>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <span className={"swatch " + (selected ? '' : 'x')} style={{ background: 'transparent' }}></span>
            {selected
              ? <span className="ticket-line">
                  <span className="key">{selected.key}</span>
                  <span className="ticket-desc">{selected.title}</span>
                </span>
              : <span className="placeholder">{placeholder}</span>}
            <span className="arr">▾</span>
          </React.Fragment>
        )}
      </button>

      {open && (
        <div className="ddown-panel" role="listbox">
          <div className="ddown-search">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={kind === 'project' ? 'Search projects…' : 'Search Jira tasks…'}
            />
          </div>
          {filtered.length === 0 && <div className="ddown-empty">No matches</div>}
          {filtered.map(o => (
            <div
              key={kind === 'project' ? o.id : o.key}
              className="ddown-opt"
              onClick={() => { onChange(kind === 'project' ? o.id : o.key); setOpen(false); setQ(''); }}
            >
              {kind === 'project' ? (
                <React.Fragment>
                  <span className="swatch" style={{ background: o.color }}></span>
                  <span className="opt-title"><span className="name">{o.name}</span></span>
                  <span className="opt-meta">{o.tag}</span>
                </React.Fragment>
              ) : (
                <React.Fragment>
                  <span className="swatch" style={{ background: 'transparent' }}></span>
                  <span className="opt-title">
                    <span className="key">{o.key}</span>
                    <span className="name">{o.title}</span>
                  </span>
                  <span></span>
                </React.Fragment>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ====================== SLOT ROW ====================== */
function SlotRow({ slot }) {
  const proj = projOf(slot.proj);
  const task = taskOf(slot.proj, slot.task);
  return (
    <div className="slot" style={{ ['--proj-color']: proj.color }} data-comment-anchor={"slot-" + slot.id}>
      <div className="time">
        <span className="t-start">{fmtTime(slot.start)}</span>
        <span className="t-end">{fmtTime(slot.end)}</span>
      </div>
      <div className="body">
        <div className="top-line">
          <span className="proj"><span className="sw"></span>{proj.name}</span>
          <a className="ticket" href="#" onClick={(e) => e.preventDefault()}>
            {slot.task} <span className="ext"><Icon name="ext"/></span>
          </a>
        </div>
        <div className="desc">{slot.desc}</div>
      </div>
      <div className="dur">{fmtDur(slot.mins)}</div>
      <div className="actions">
        <button className="row-btn" aria-label="Edit"><Icon name="edit"/></button>
        <button className="row-btn del" aria-label="Delete"><Icon name="trash"/></button>
      </div>
    </div>
  );
}

function GapRow({ from, to, label }) {
  return (
    <div className="gap-row">
      <div className="gap-time">{fmtTime(from)} → {fmtTime(to)}</div>
      <div style={{display:'flex', alignItems:'center', gap:10}}>
        <span className="gap-line"></span>
        <span className="gap-lbl">{label}</span>
        <span className="gap-line"></span>
      </div>
      <div></div>
    </div>
  );
}

/* ====================== APP ====================== */
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  useEffect(() => { document.body.dataset.collapsed = String(t.collapsed); }, [t.collapsed]);

  const now = useNow();

  // form state
  const [project, setProject] = useState('pim');
  const [task, setTask] = useState('PIM-3073');
  const [desc, setDesc] = useState("Repro'd the CSV parser crash on rows with embedded quotes. Filed a minimal repro with 3 sample rows; handed off to dev.");
  const [start, setStart] = useState('14:00');
  const [end, setEnd] = useState('15:30');
  const [durText, setDurText] = useState('1h 30m');
  const [dismissed, setDismissed] = useState(false);

  // when project changes, reset task to first option
  useEffect(() => {
    const tasks = TASKS[project] || [];
    if (!tasks.find(x => x.key === task)) {
      setTask(tasks[0]?.key || '');
    }
  }, [project]);

  const view = t.view; // 'with-logs' | 'empty' | 'overlap-error' | 'just-saved'
  const slots = view === 'empty' ? [] : TODAY_SLOTS;
  const totalMins = slots.reduce((a, s) => a + s.mins, 0);
  const lastEnd = slots.length ? slots[slots.length - 1].end : null;

  // build display rows with gaps
  const rows = useMemo(() => {
    const out = [];
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      if (i > 0) {
        const prev = slots[i - 1];
        if (prev.end !== s.start) {
          out.push({ kind: 'gap', from: prev.end, to: s.start, label: 'Untracked' });
        }
      }
      out.push({ kind: 'slot', slot: s });
    }
    return out;
  }, [slots]);

  const dateLong = now.toLocaleDateString('en-IN', { timeZone:'Asia/Kolkata', weekday:'long', month:'long', day:'numeric' });
  const yr = now.getFullYear();
  const istClock = new Intl.DateTimeFormat('en-IN', { timeZone:'Asia/Kolkata', hour:'2-digit', minute:'2-digit', hour12:false }).format(now);

  // duration derived
  const formDur = useMemo(() => {
    if (t.timeMode === 'range') {
      const m = minsBetween(start, end);
      return m > 0 ? m : 0;
    }
    // parse "1h 30m"
    const tx = durText.trim();
    const h = parseInt((tx.match(/(\d+)\s*h/i)||[])[1] || '0', 10);
    const mm = parseInt((tx.match(/(\d+)\s*m/i)||[])[1] || '0', 10);
    return h * 60 + mm;
  }, [t.timeMode, start, end, durText]);

  const overlap = view === 'overlap-error';

  const onSaveSlot = (e) => {
    e?.preventDefault();
    // visual demo: clear description after save
    if (overlap) return;
    setDesc('');
  };

  return (
    <React.Fragment>
      {/* TOP BAR */}
      <div className="topbar">
        <div className="brand">
          <a href="App%20Shell.html" className="logomark" aria-hidden="true" style={{textDecoration:'none'}}>
            <div className="face"><div className="hand"></div></div>
          </a>
          <div className="wordmark">AutoClock</div>
        </div>
        <div className="topbar-center">
          <div className="date-pill">
            <span className="day">{dateLong}, {yr}</span>
            <span className="sep"></span>
            <span className="clock">{istClock} IST</span>
            <span className="sep"></span>
            <span className="week">W21</span>
          </div>
        </div>
        <div className="topbar-right">
          <button className="icon-btn" aria-label="Search"><Icon name="search"/></button>
          <button className="icon-btn" aria-label="Help"><Icon name="help"/></button>
          <button className="icon-btn" aria-label="Notifications">
            <Icon name="bell"/><span className="badge">2</span>
          </button>
          <div className="user-menu" role="button" tabIndex="0">
            <div className="avatar">{initials(USER.name)}</div>
            <div className="meta">
              <div className="name">{USER.name}</div>
              <div className="role">{ROLE_LABELS[t.role]}</div>
            </div>
            <span className="caret">▾</span>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="body-grid">
        <aside className="sidebar">
          <div className="nav-section">
            <div className="nav-header"><span>Workspace</span><span className="hr"></span></div>
            <a className="nav-item active">
              <span className="nav-icon"><Icon name="today"/></span>
              <span className="label">Today</span>
              <span className="meta">T</span>
            </a>
            <a className="nav-item">
              <span className="nav-icon"><Icon name="history"/></span>
              <span className="label">My History</span>
            </a>
          </div>
          <div className="nav-section">
            <div className="nav-header"><span>You</span><span className="hr"></span></div>
            <a className="nav-item" href="Settings.html">
              <span className="nav-icon"><Icon name="settings"/></span>
              <span className="label">Settings</span>
            </a>
          </div>
          <div className="sidebar-spacer"></div>
          <button className="collapse-btn" onClick={() => setTweak('collapsed', !t.collapsed)}>
            <span className="arr">«</span>
            <span className="label">Collapse</span>
            <span></span>
          </button>
        </aside>

        <main className="main" data-screen-label="today-page">
          <div className="main-inner">

            {/* HERO */}
            <div className="hero">
              <div className="left">
                <div className="eyebrow">
                  <span className="dash"></span>
                  <span>Today · {dateLong}</span>
                </div>
                <h1>Good {greeting(now)}, {USER.name.split(' ')[0]}.</h1>
                <div className="total-line">
                  {totalMins > 0 ? (
                    <React.Fragment>
                      <span className="total-chip">
                        <span className="num">{fmtDur(totalMins)}</span>
                        <span className="lbl">logged today</span>
                      </span>
                      <span className="since">
                        <span className="dot"></span>
                        across {slots.length} slot{slots.length === 1 ? '' : 's'} · last at {fmtTime(lastEnd)}
                      </span>
                    </React.Fragment>
                  ) : (
                    <span className="since">
                      <span className="dot"></span>
                      Nothing logged yet — your day starts whenever you do.
                    </span>
                  )}
                </div>
              </div>
              <div className="right">
                <button
                  className="btn btn--accent"
                  disabled={totalMins === 0}
                  data-comment-anchor="close-my-day"
                >
                  Close My Day
                  <span className="kbd">⌘↵</span>
                </button>
              </div>
            </div>

            {/* REMINDER */}
            {t.showReminder && !dismissed && totalMins > 0 && (
              <div className="reminder" role="status">
                <div className="ico-r"><Icon name="reminder"/></div>
                <div className="copy">
                  <strong>You haven't logged anything since {fmtTime(lastEnd)}.</strong>
                  <span className="sub">That's about 2h 30m of work to capture. The form below is ready to go.</span>
                </div>
                <div className="actions">
                  <button className="btn btn--ghost" onClick={() => {
                    const el = document.querySelector('.desc-area');
                    if (el) el.focus();
                  }}>Log it now</button>
                  <button className="dismiss" aria-label="Dismiss" onClick={() => setDismissed(true)}>×</button>
                </div>
              </div>
            )}

            {/* FORM */}
            <form className="form-card" onSubmit={onSaveSlot} data-comment-anchor="log-form">
              <div className="form-head">
                <div className="title">
                  <span className="dot"></span>
                  <span>Add a work slot</span>
                </div>
                <div className="meta">
                  <span>Press</span>
                  <span className="kbd">N</span>
                  <span>to focus</span>
                </div>
              </div>
              <div className="form-body">
                <div className="row-2">
                  <div className="field">
                    <label className="field-lbl">Project <span className="req">*</span></label>
                    <Dropdown
                      kind="project"
                      value={project}
                      options={PROJECTS}
                      onChange={setProject}
                      placeholder="Choose a project"
                    />
                  </div>
                  <div className="field">
                    <label className="field-lbl">Jira task <span className="req">*</span></label>
                    <Dropdown
                      kind="task"
                      value={task}
                      options={TASKS[project] || []}
                      onChange={setTask}
                      placeholder="Pick a task from this project"
                    />
                  </div>
                </div>

                <div className="field">
                  <label className="field-lbl">What did you work on?</label>
                  <textarea
                    className="desc-area"
                    placeholder="A sentence or two — enough that future-you can read it next week and remember what happened."
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                  />
                  <div className="desc-foot">
                    <span>Plain text. Mentions, links, and ticket keys auto-format.</span>
                    <div className="chips">
                      <span className="chip" onClick={() => setDesc(d => (d ? d + ' ' : '') + '#bug')}>+ #bug</span>
                      <span className="chip" onClick={() => setDesc(d => (d ? d + ' ' : '') + '#review')}>+ #review</span>
                      <span className="chip" onClick={() => setDesc(d => (d ? d + ' ' : '') + '#standup')}>+ #standup</span>
                    </div>
                  </div>
                </div>

                <div className="field">
                  <label className="field-lbl">Time</label>
                  <div>
                    <div className="time-mode" role="radiogroup">
                      <button type="button" aria-pressed={t.timeMode === 'range'} onClick={() => setTweak('timeMode','range')}>
                        <span className="dotk"></span>Range
                      </button>
                      <button type="button" aria-pressed={t.timeMode === 'duration'} onClick={() => setTweak('timeMode','duration')}>
                        <span className="dotk"></span>Duration
                      </button>
                    </div>
                    <div className={"time-controls " + (overlap ? 'has-error' : '')}>
                      {t.timeMode === 'range' ? (
                        <React.Fragment>
                          <div className="time-input">
                            <span className="mini">Start</span>
                            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
                          </div>
                          <span className="time-arrow">→</span>
                          <div className="time-input">
                            <span className="mini">End</span>
                            <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
                          </div>
                          <span className="dur-tag">= {fmtDur(formDur)}</span>
                        </React.Fragment>
                      ) : (
                        <React.Fragment>
                          <div className="time-input">
                            <span className="mini">Duration</span>
                            <input type="text" value={durText} onChange={(e) => setDurText(e.target.value)} placeholder="e.g. 1h 30m" />
                          </div>
                          <span className="dur-tag">= {fmtDur(formDur)}</span>
                          <span style={{fontFamily:'var(--ac-font-mono)', fontSize:11, color:'var(--ac-text-subtle)'}}>
                            ends at {fmtTime(addMinsToClock(istClock, formDur))}
                          </span>
                        </React.Fragment>
                      )}
                    </div>
                    {overlap && (
                      <div className="form-err">
                        <span className="ico-e">!</span>
                        <div className="body">
                          <strong>Two slots can't overlap.</strong>{' '}
                          This window collides with
                          <span className="ticket">10:30 AM → 12:00 PM · PIM-3072</span>.
                          <div className="links">
                            <a href="#" onClick={(e)=>e.preventDefault()}>Shift this slot to 12:00 PM</a>
                            <a href="#" onClick={(e)=>e.preventDefault()}>Replace the existing slot</a>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="save-row">
                  <span className="hint">
                    <span className="kbd">⌘</span> + <span className="kbd">↵</span> to save and start the next one.
                  </span>
                  <button type="submit" className="btn btn--primary" disabled={overlap}>
                    <Icon name="plus"/>
                    <span>Save slot</span>
                  </button>
                </div>
              </div>
            </form>

            {/* TODAY LIST */}
            <div className="list-head">
              <h2>
                Today's log
                <span className="count">{slots.length} slot{slots.length === 1 ? '' : 's'} · {fmtDur(totalMins)}</span>
              </h2>
              <div className="filters">
                <button className="filter" aria-pressed="true">All</button>
                <button className="filter">Client</button>
                <button className="filter">Internal</button>
              </div>
            </div>

            {slots.length > 0 ? (
              <div className="slots">
                {rows.map((r, i) => r.kind === 'slot'
                  ? <SlotRow key={r.slot.id} slot={r.slot} />
                  : <GapRow key={'gap'+i} from={r.from} to={r.to} label={r.label} />
                )}
              </div>
            ) : (
              <div className="empty" data-comment-anchor="today-empty">
                <div className="mark" aria-hidden="true">
                  <div className="ring"><div className="hand"></div></div>
                </div>
                <h3>Your day starts here.</h3>
                <p>Nothing logged yet. Pick a project + task above, type a sentence about what you did, save the slot. Repeat. Close out at the end of the day.</p>
                <div className="hint-line">
                  Tip: press <span className="kbd">N</span> to jump to the description field.
                </div>
              </div>
            )}
          </div>

          {/* CLOSE BAR */}
          {slots.length > 0 && (
            <div className="close-bar">
              <div className="close-bar-inner">
                <div className="summary">
                  <div className="top">
                    <span className="num">{fmtDur(totalMins)}</span> logged across {slots.length} slot{slots.length === 1 ? '' : 's'} — ready to post.
                  </div>
                  <div className="sub">
                    <span className="dotty"></span>
                    Will sync to Jira, Google Sheet · row 47 · and draft Gmail to your lead
                  </div>
                </div>
                <button className="btn btn--accent">
                  Close My Day
                  <span className="kbd">⌘↵</span>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* TWEAKS */}
      <TweaksPanel title="Tweaks">
        <TweakSection title="View">
          <TweakSelect
            label="State"
            value={t.view}
            options={[
              { value: 'with-logs',     label: 'With logs (default)' },
              { value: 'empty',         label: 'Empty state — nothing logged' },
              { value: 'overlap-error', label: 'Validation error — overlap' },
            ]}
            onChange={(v) => setTweak('view', v)}
          />
          <TweakToggle
            label="Show reminder banner"
            value={t.showReminder}
            onChange={(v) => setTweak('showReminder', v)}
          />
        </TweakSection>

        <TweakSection title="Form">
          <TweakRadio
            label="Time entry"
            value={t.timeMode}
            options={[
              { value: 'range',    label: 'Range' },
              { value: 'duration', label: 'Duration' },
            ]}
            onChange={(v) => setTweak('timeMode', v)}
          />
        </TweakSection>

        <TweakSection title="Shell">
          <TweakToggle
            label="Collapsed sidebar"
            value={t.collapsed}
            onChange={(v) => setTweak('collapsed', v)}
          />
          <TweakSelect
            label="Role"
            value={t.role}
            options={[
              { value:'employee',label:'Employee' },
              { value:'pm',label:'PM / Lead' },
              { value:'management',label:'Management' },
              { value:'operations',label:'Operations' },
              { value:'admin',label:'Admin' },
            ]}
            onChange={(v) => setTweak('role', v)}
          />
        </TweakSection>
      </TweaksPanel>
    </React.Fragment>
  );
}

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(id); }, []);
  return now;
}

function greeting(d) {
  const h = parseInt(new Intl.DateTimeFormat('en-IN', { timeZone:'Asia/Kolkata', hour:'2-digit', hour12:false }).format(d), 10);
  if (h < 5) return 'night';
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function addMinsToClock(hhmm, mins) {
  const [h, m] = hhmm.split(':').map(Number);
  let total = h * 60 + m + mins;
  total = ((total % 1440) + 1440) % 1440;
  const oh = Math.floor(total / 60), om = total % 60;
  return `${String(oh).padStart(2,'0')}:${String(om).padStart(2,'0')}`;
}

ReactDOM.createRoot(document.getElementById('app')).render(<App />);
