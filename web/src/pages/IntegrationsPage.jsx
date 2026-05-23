// IntegrationsPage (P16) — admin Integrations & Settings.
//
// Source design: docs/FrontEnd Design /Integrations.html
// Extraction notes: /tmp/allpages-extraction-notes.md (P16 section).
//
// Route: /admin/integrations  (RequireAuth + RequireOnboarded + RequireRole admin).
// ERD:   EP-22 GET/PUT /api/admin/integrations (section-scoped, OQ-AP-13).
//        Mocked at GET/PUT /api/admin/integrations (web/src/api/mocks.js).
//
// Composition:
//   AppShell
//   ├── AdminTabs (active=integrations)
//   ├── page-head ("Integrations & Settings")
//   └── stack of IntegrationCards:
//         1. Jira          (workspaceUrl + scopes + health + reader hint)
//         2. Google        (Sheets + Gmail combined — spreadsheetId + scopes)
//         3. Email         (senderDisplayName + defaultCadence)
//         4. Reader        (M1 optional shared Browse-Projects account)
//
// Each card owns its own dirty/save state (independent saves per section).
// The mock's PUT merges section + body into the in-memory __INTEGRATIONS,
// and returns the merged shape — so after a save, the card's `fetched`
// for THAT section reflects the new server-truth and dirty becomes false.
//
// Security rule: the Google card's spreadsheetId input is documented as a
// COPY-of-production ID — never the real sheet during dev (.claude/rules/security.md
// + docs/SECURITY.md §5).

import { useCallback, useEffect, useMemo, useState } from 'react';

import { api } from '../api';
import AppShell from '../components/shell/AppShell';
import AdminTabs from '../components/admin/AdminTabs';
import IntegrationCard from '../components/admin/IntegrationCard';
import ScopeChip from '../components/admin/ScopeChip';
import SegmentedRadio from '../components/settings/SegmentedRadio';

import JiraGlyph from '../components/glyphs/JiraGlyph';
import SheetsGlyph from '../components/glyphs/SheetsGlyph';
import GmailGlyph from '../components/glyphs/GmailGlyph';

import '../styles/integrations.css';

// Default scope sets that the UI promises to render even if the server
// shape is empty. These mirror what the backend will request from the
// Jira / Google OAuth screens at M1 (per DevDoc §6.1 + §6.3 + §6.4).
const DEFAULT_SCOPES = {
  jira:   ['read:jira-work', 'write:jira-work'],
  google: ['sheets', 'gmail.compose'],
};

const CADENCE_OPTIONS = [
  { value: '30min',   label: 'Every 30 min' },
  { value: '1hr',     label: 'Every hour' },
  { value: 'every2h', label: 'Every 2 hours' },
  { value: 'few',     label: 'A few times a day' },
  { value: 'eod',     label: 'End of day only' },
];

// ---- Combined Sheets + Gmail glyph -----------------------------------------
// The Google card represents two scopes (sheets + gmail.compose), so the
// header stacks the two existing brand glyphs side-by-side. This is a tiny
// inline composition — not a new exported glyph component (no other page
// uses it).
function GoogleStackGlyph() {
  return (
    <span className="page-integrations__google-stack" aria-hidden="true">
      <SheetsGlyph size={20} />
      <GmailGlyph size={20} />
    </span>
  );
}

// ---- helpers ---------------------------------------------------------------

/** Shallow deep-equal sufficient for our section bodies (strings/booleans/arrays of strings). */
function eq(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    return a.every((v, i) => eq(v, b[i]));
  }
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => eq(a[k], b[k]));
}

/** Build the editable subtree for a section (what we PUT back). */
function editable(section, payload) {
  if (!payload) return null;
  switch (section) {
    case 'jira':
      return { workspaceUrl: payload.workspaceUrl || '' };
    case 'google':
      return { spreadsheetId: payload.spreadsheetId || '' };
    case 'email':
      return {
        senderDisplayName: payload.senderDisplayName || '',
        defaultCadence:    payload.defaultCadence    || 'eod',
      };
    case 'reader':
      return {
        enabled: !!payload.enabled,
        email:   payload.email || '',
      };
    default:
      return null;
  }
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState(null); // last-fetched server truth (all 4 sections)
  const [drafts, setDrafts]             = useState(null); // { jira, google, email, reader } working copies
  const [savingSection, setSavingSection] = useState(null); // string | null
  const [errors, setErrors]             = useState({});   // { [section]: 'message' } — banner text per card
  const [loading, setLoading]           = useState(true);
  const [pageError, setPageError]       = useState(null);

  // Load on mount.
  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.integrations.get()
      .then((res) => {
        if (!alive) return;
        const data = res?.integrations || {};
        setIntegrations(data);
        setDrafts({
          jira:   editable('jira',   data.jira),
          google: editable('google', data.google),
          email:  editable('email',  data.email),
          reader: editable('reader', data.reader),
        });
        setLoading(false);
      })
      .catch((e) => {
        if (!alive) return;
        setPageError(e?.message || 'Could not load integrations.');
        setLoading(false);
      });
    return () => { alive = false; };
  }, []);

  // Per-section baseline + dirty derivation.
  const baselines = useMemo(() => ({
    jira:   editable('jira',   integrations?.jira),
    google: editable('google', integrations?.google),
    email:  editable('email',  integrations?.email),
    reader: editable('reader', integrations?.reader),
  }), [integrations]);

  const isDirty = useCallback(
    (section) => !!(drafts?.[section] && baselines?.[section] && !eq(drafts[section], baselines[section])),
    [drafts, baselines]
  );

  // Patch helpers (per section).
  const patch = useCallback((section, partial) => {
    setDrafts((d) => d && ({ ...d, [section]: { ...d[section], ...partial } }));
  }, []);

  const discard = useCallback((section) => {
    setDrafts((d) => d && ({ ...d, [section]: baselines[section] }));
    setErrors((e) => ({ ...e, [section]: undefined }));
  }, [baselines]);

  const save = useCallback(async (section) => {
    if (!drafts?.[section] || savingSection) return;
    setErrors((e) => ({ ...e, [section]: undefined }));
    setSavingSection(section);
    try {
      const res = await api.integrations.update({ section, body: drafts[section] });
      const next = res?.integrations || {};
      setIntegrations(next);
      // Re-seed THIS section's draft from the server response (preserves
      // other-section drafts).
      setDrafts((d) => d && ({ ...d, [section]: editable(section, next[section]) }));
    } catch (e) {
      setErrors((cur) => ({ ...cur, [section]: e?.message || 'Save failed. Your edits are still here — try again.' }));
    } finally {
      setSavingSection(null);
    }
  }, [drafts, savingSection]);

  const retry = useCallback((section) => {
    // Best-effort: simply re-issue the GET to clear the failed state.
    setErrors((e) => ({ ...e, [section]: undefined }));
    api.integrations.get()
      .then((res) => {
        const data = res?.integrations || {};
        setIntegrations(data);
        setDrafts((d) => d && ({ ...d, [section]: editable(section, data[section]) }));
      })
      .catch(() => { /* swallow — banner stays open */ });
  }, []);

  return (
    <AppShell innerClassName="page-integrations">
      <div className="page-integrations">

        {/* ADMIN TABS — shared with P14 + P15 */}
        <AdminTabs activeTab="integrations" />

        {/* PAGE HEAD */}
        <header className="page-head">
          <div className="page-head__left">
            <div className="page-head__eyebrow">
              <span className="page-head__badge"><b>16</b>— Admin</span>
            </div>
            <h1>Integrations &amp; Settings</h1>
            <p className="page-head__sub">
              Connect AutoClock to Jira, Google Workspace, and the reader account.
              Each section saves independently.
            </p>
          </div>
        </header>

        {pageError ? (
          <div className="ac-banner ac-banner--danger" role="alert">{pageError}</div>
        ) : null}

        {loading || !drafts ? (
          <div className="page-integrations__loading" role="status" aria-live="polite">
            Loading integrations…
          </div>
        ) : (
          <div className="page-integrations__stack">

            {/* ──── 1. JIRA ──── */}
            <IntegrationCard
              title="Jira"
              glyph={<JiraGlyph size={28} />}
              health={integrations?.jira?.health || 'idle'}
              dirty={isDirty('jira')}
              saving={savingSection === 'jira'}
              error={errors.jira || integrations?.jira?.error || undefined}
              onSave={() => save('jira')}
              onDiscard={() => discard('jira')}
              onRetry={() => retry('jira')}
            >
              <FieldRow
                id="jira-workspace-url"
                label="Workspace URL"
                hint="The root of your Atlassian Cloud instance — used for OAuth redirects + worklog API base."
              >
                <input
                  id="jira-workspace-url"
                  type="url"
                  className="ac-input"
                  placeholder="https://iksula.atlassian.net"
                  value={drafts.jira?.workspaceUrl || ''}
                  onChange={(e) => patch('jira', { workspaceUrl: e.target.value })}
                />
              </FieldRow>

              <FieldRow
                label="Scopes"
                hint="Granted to AutoClock when each user signs in via Jira OAuth 3LO."
              >
                <ScopeList scopes={integrations?.jira?.scopes || DEFAULT_SCOPES.jira} />
              </FieldRow>

              <p className="page-integrations__hint">
                Worklogs sync via the calling user&apos;s own Jira token (ADR-01).
                For org-wide read access, see the <a href="#reader">reader account</a> below.
              </p>
            </IntegrationCard>

            {/* ──── 2. GOOGLE WORKSPACE (Sheets + Gmail combined) ──── */}
            <IntegrationCard
              title="Google Workspace"
              glyph={<GoogleStackGlyph />}
              health={integrations?.google?.health || 'idle'}
              dirty={isDirty('google')}
              saving={savingSection === 'google'}
              error={errors.google || undefined}
              onSave={() => save('google')}
              onDiscard={() => discard('google')}
              onRetry={() => retry('google')}
            >
              <FieldRow
                id="google-spreadsheet-id"
                label="Timesheet spreadsheet ID"
                hint="The Sheet AutoClock appends rows to. Use a verified copy in development — never the production sheet."
              >
                <input
                  id="google-spreadsheet-id"
                  type="text"
                  className="ac-input"
                  placeholder="1aBc…copy"
                  value={drafts.google?.spreadsheetId || ''}
                  onChange={(e) => patch('google', { spreadsheetId: e.target.value })}
                  spellCheck={false}
                />
              </FieldRow>

              <FieldRow
                label="Scopes"
                hint="`gmail.compose` is the narrowest scope that can create drafts — kept tight by design."
              >
                <ScopeList scopes={integrations?.google?.scopes || DEFAULT_SCOPES.google} />
              </FieldRow>
            </IntegrationCard>

            {/* ──── 3. EMAIL ──── */}
            <IntegrationCard
              title="Email"
              health="ok"
              healthText="Configured"
              dirty={isDirty('email')}
              saving={savingSection === 'email'}
              error={errors.email || undefined}
              onSave={() => save('email')}
              onDiscard={() => discard('email')}
            >
              <FieldRow
                id="email-sender-name"
                label="Sender display name"
                hint="Appears as the from-name on EOD drafts + Ops reminder emails."
              >
                <input
                  id="email-sender-name"
                  type="text"
                  className="ac-input"
                  placeholder="AutoClock @ Iksula"
                  value={drafts.email?.senderDisplayName || ''}
                  onChange={(e) => patch('email', { senderDisplayName: e.target.value })}
                />
              </FieldRow>

              <FieldRow
                label="Default reminder cadence"
                hint="Org-wide default. Each user can override this on their own /settings page."
              >
                <SegmentedRadio
                  id="email-default-cadence"
                  name="Default reminder cadence"
                  value={drafts.email?.defaultCadence || 'eod'}
                  options={CADENCE_OPTIONS}
                  onChange={(v) => patch('email', { defaultCadence: v })}
                />
              </FieldRow>
            </IntegrationCard>

            {/* ──── 4. READER ACCOUNT (M1) ──── */}
            <IntegrationCard
              title="Reader account (M1)"
              health={integrations?.reader?.health || 'idle'}
              dirty={isDirty('reader')}
              saving={savingSection === 'reader'}
              error={errors.reader || undefined}
              onSave={() => save('reader')}
              onDiscard={() => discard('reader')}
              onRetry={() => retry('reader')}
            >
              <div id="reader" />
              <FieldRow
                id="reader-enabled"
                label="Enable shared reader"
                hint="Optional Jira account with Browse Projects scope used for org-wide worklog read-sync (EP-23, M1)."
              >
                <label className="page-integrations__toggle">
                  <input
                    type="checkbox"
                    checked={!!drafts.reader?.enabled}
                    onChange={(e) => patch('reader', { enabled: e.target.checked })}
                  />
                  <span className="page-integrations__toggle-track" aria-hidden="true">
                    <span className="page-integrations__toggle-thumb" />
                  </span>
                  <span className="page-integrations__toggle-label">
                    {drafts.reader?.enabled ? 'Reader enabled' : 'Reader disabled'}
                  </span>
                </label>
              </FieldRow>

              <FieldRow
                id="reader-email"
                label="Reader account email"
                hint={drafts.reader?.enabled
                  ? 'Iksula Google account with Jira Browse Projects scope.'
                  : 'Disabled — enable to configure.'
                }
              >
                <input
                  id="reader-email"
                  type="email"
                  className="ac-input"
                  placeholder="autoclock-reader@iksula.com"
                  value={drafts.reader?.email || ''}
                  onChange={(e) => patch('reader', { email: e.target.value })}
                  disabled={!drafts.reader?.enabled}
                  aria-disabled={!drafts.reader?.enabled}
                />
              </FieldRow>
            </IntegrationCard>
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ---- inline helpers (page-scoped, not exported) ---------------------------

function FieldRow({ id, label, hint, children }) {
  return (
    <div className="page-integrations__field-row">
      <div className="page-integrations__field-label">
        <label htmlFor={id} className="page-integrations__lbl">{label}</label>
        {hint ? (
          <div className="page-integrations__hint">{hint}</div>
        ) : null}
      </div>
      <div className="page-integrations__field-ctrl">
        {children}
      </div>
    </div>
  );
}

function ScopeList({ scopes }) {
  if (!scopes || scopes.length === 0) {
    return <span className="page-integrations__hint">No scopes configured.</span>;
  }
  return (
    <div className="page-integrations__scopes">
      {scopes.map((s) => (
        <ScopeChip key={s}>{s}</ScopeChip>
      ))}
    </div>
  );
}
