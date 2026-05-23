// LeaveCalendarPage (P13) — Operations + Admin leave & holiday calendar.
// Shows the month grid, list of leave entries, upcoming entries, and a list
// of holidays. "Add leave" opens a modal that POSTs to api.leave.add().
//
// Source design: docs/FrontEnd Design /Leave Calendar.html
// Extraction notes: /tmp/allpages-extraction-notes.md (P13 section).
//
// Data:
//   api.leave.list({ month }) → EP-21 GET
//     { month, holidays:[{date,name}], leave:[{...}], summary:{...} }
//   api.leave.add(payload) → EP-21 POST
//     { ok:true, leave:{ id, ...payload } }
//
// Auth: <RequireRole roles={['operations']}>. `admin` is auto-allowed.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { api } from '../api';
import AppShell from '../components/shell/AppShell';
import MonthCalendar from '../components/leave/MonthCalendar';
import LeaveListRow from '../components/leave/LeaveListRow';
import LeaveLegend from '../components/leave/LeaveLegend';
import AddLeaveModal from '../components/leave/AddLeaveModal';
import HolidayChip from '../components/leave/HolidayChip';

import '../styles/leave-calendar.css';

const VIEW_VALUES = new Set(['calendar', 'list', 'upcoming', 'holidays']);

function currentMonthIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function shiftMonth(monthIso, delta) {
  const [y, m] = monthIso.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(monthIso) {
  const [y, m] = monthIso.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function fmtHolidayDate(iso) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

const VIEW_TABS = [
  { value: 'calendar', label: 'Calendar' },
  { value: 'list',     label: 'List' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'holidays', label: 'Holidays' },
];

export default function LeaveCalendarPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = searchParams.get('view');
  const view = VIEW_VALUES.has(viewParam) ? viewParam : 'calendar';
  const month = searchParams.get('month') || currentMonthIso();

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [addError, setAddError]   = useState(null);
  const addTriggerRef = useRef(null);

  // Mobile detection — if <=640px we default the calendar to compact mode and
  // also keep the calendar tab available but switch automatic default to list.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia('(max-width: 640px)');
    const handler = (e) => setIsMobile(e.matches);
    handler(mq);
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else mq.addListener(handler);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', handler);
      else mq.removeListener(handler);
    };
  }, []);

  // Fetch leave data on month change.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.leave.list({ month })
      .then((d) => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch((e) => { if (!cancelled) { setError(e.message || 'Failed to load'); setLoading(false); } });
    return () => { cancelled = true; };
  }, [month]);

  const setView = (next) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (next === 'calendar') params.delete('view'); else params.set('view', next);
      return params;
    }, { replace: false });
  };

  const setMonth = (nextMonth) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (nextMonth === currentMonthIso()) params.delete('month');
      else params.set('month', nextMonth);
      return params;
    }, { replace: false });
  };

  const leave = data?.leave || [];
  const holidays = data?.holidays || [];
  const summary = data?.summary || { peopleOnLeaveThisMonth: 0, daysTotal: 0 };

  const today = todayIso();
  const upcoming = useMemo(() => {
    return leave
      .filter(l => (l.start || '') > today)
      .sort((a, b) => (a.start || '').localeCompare(b.start || ''));
  }, [leave, today]);

  const openAddModal = () => { setModalOpen(true); setAddError(null); };
  const closeAddModal = () => setModalOpen(false);

  const onAddSubmit = async (payload) => {
    setAddError(null);
    try {
      const res = await api.leave.add(payload);
      // Optimistic: merge the returned leave into the current data set.
      if (res && res.leave) {
        setData((prev) => prev ? { ...prev, leave: [...(prev.leave || []), { ...res.leave, status: res.leave.status || 'pending' }] } : prev);
      }
    } catch (e) {
      setAddError(e?.message || 'Could not save leave');
      throw e;
    }
  };

  return (
    <AppShell innerClassName="page-leave">
      <div className="page-leave">

        {/* PAGE HEAD */}
        <header className="page-head">
          <div className="page-head__left">
            <div className="page-head__eyebrow">
              <span className="page-head__badge"><b>13</b>— Operations</span>
            </div>
            <h1>Leave &amp; Holidays</h1>
            <p className="page-head__sub">
              Who&apos;s out this month, plus the org holiday list. Use this to plan reminder
              runs and weekly compliance.
            </p>
          </div>

          <div className="page-head__right">
            <div className="month-chip" role="group" aria-label="Pick a month">
              <button
                type="button"
                className="month-chip__btn"
                aria-label="Previous month"
                onClick={() => setMonth(shiftMonth(month, -1))}
              >
                ◂
              </button>
              <div className="month-chip__label">{monthLabel(month)}</div>
              <button
                type="button"
                className="month-chip__btn"
                aria-label="Next month"
                onClick={() => setMonth(shiftMonth(month, 1))}
              >
                ▸
              </button>
            </div>

            <button
              ref={addTriggerRef}
              type="button"
              className="page-head__primary"
              onClick={openAddModal}
            >
              Add leave
            </button>
          </div>
        </header>

        {/* VIEW TABS */}
        <div className="view-tabs" role="tablist" aria-label="Leave view">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={view === tab.value}
              tabIndex={view === tab.value ? 0 : -1}
              className={`view-tab${view === tab.value ? ' is-active' : ''}`}
              onClick={() => setView(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="error" role="alert">Couldn&apos;t load leave data — {error}</div>
        )}

        {addError && (
          <div className="error" role="alert">{addError}</div>
        )}

        {loading && !error && (
          <div className="loading" role="status">Loading leave…</div>
        )}

        {!loading && !error && view === 'calendar' && (
          <div className="leave-body leave-body--cal">
            <div className="leave-body__main">
              <MonthCalendar
                month={month}
                todayIso={today}
                holidays={holidays}
                leave={leave}
                onSelectDay={() => { /* no-op for M0; reserve for future drill-down */ }}
                compact={isMobile}
              />
            </div>
            <div className="leave-body__rail">
              <LeaveLegend summary={summary} />
            </div>
          </div>
        )}

        {!loading && !error && view === 'list' && (
          <section className="leave-list" aria-label="All leave entries this month">
            {leave.length === 0 && (
              <div className="empty">Nobody is on leave this month.</div>
            )}
            {leave.map(l => (
              <LeaveListRow key={l.id} leave={l} />
            ))}
          </section>
        )}

        {!loading && !error && view === 'upcoming' && (
          <section className="leave-list" aria-label="Upcoming leave">
            {upcoming.length === 0 && (
              <div className="empty">No upcoming leave entries — everyone is on deck.</div>
            )}
            {upcoming.map(l => (
              <LeaveListRow key={l.id} leave={l} />
            ))}
          </section>
        )}

        {!loading && !error && view === 'holidays' && (
          <section className="leave-holidays" aria-label="Holidays this month">
            {holidays.length === 0 && (
              <div className="empty">No holidays in {monthLabel(month)}.</div>
            )}
            {holidays.length > 0 && (
              <ul className="leave-holidays__list">
                {holidays.map(h => (
                  <li key={h.date} className="leave-holidays__row">
                    <div className="leave-holidays__date">{fmtHolidayDate(h.date)}</div>
                    <div className="leave-holidays__chip"><HolidayChip name={h.name} /></div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <AddLeaveModal
          open={modalOpen}
          onClose={closeAddModal}
          onSubmit={onAddSubmit}
          returnFocusTo={addTriggerRef}
        />
      </div>
    </AppShell>
  );
}
