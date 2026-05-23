// SettingsPage (P06) — user-scope preferences: profile, reminders, appearance,
// connections, danger zone. Server endpoints are mocked at GET/PUT
// /api/me/settings (OQ-AP-04). Read on mount; write on Save. Edits never
// leave the browser until the user clicks Save — Discard rolls back to the
// last server response.
//
// Source design: docs/FrontEnd Design /Settings.html (prototype scaffolding —
// useTweaks/TWEAK_DEFAULTS/EDITMODE/data-comment-anchor — stripped).
//
// Auth + role:
// - The route guard wraps RequireAuth/RequireOnboarded only — every authed
//   user can view + edit their own settings (no admin gating).
// - Profile fields are read-only and sourced from useAuth().user; if the
//   /api/me/settings response includes a profile block we display that, but
//   the auth context wins as the source of truth for name/email/role.

import { useCallback, useEffect, useMemo, useState } from 'react';

import { api } from '../api';
import { useAuth } from '../auth/AuthContext';
import AppShell from '../components/shell/AppShell';
import Icon from '../components/Icon';
import SettingsSection from '../components/settings/SettingsSection';
import SegmentedRadio from '../components/settings/SegmentedRadio';
import ConnRow from '../components/settings/ConnRow';
import SaveBar from '../components/settings/SaveBar';

import '../styles/settings.css';

const CADENCE_OPTIONS = [
  { value: '30min',   label: 'Every 30 min' },
  { value: '1hr',     label: 'Every hour' },
  { value: 'every2h', label: 'Every 2 hours' },
  { value: 'few',     label: 'A few times a day' },
  { value: 'eod',     label: 'End of day only' },
];

const DENSITY_OPTIONS = [
  { value: 'compact',     label: 'Compact' },
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'spacious',    label: 'Spacious' },
];

const FONT_OPTIONS = [
  { value: 'small',  label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large',  label: 'Large' },
];

// Three preset swatches — Signal Red (default), Sky Blue, Emerald.
// Picked so they all hit WCAG AA on white text (white #fff).
const SWATCHES = [
  { value: '#DC2626', name: 'Signal Red' },
  { value: '#2563EB', name: 'Sky Blue' },
  { value: '#10B981', name: 'Emerald' },
];

const ROLE_LABELS = {
  employee:   'Employee',
  pm_lead:    'PM / Lead',
  pm:         'PM / Lead',           // mock uses 'pm'
  management: 'Management',
  operations: 'Operations',
  admin:      'Admin',
};

const DEFAULTS = {
  reminders:  { cadence: 'eod', quietStart: '20:00', quietEnd: '09:00' },
  appearance: { density: 'comfortable', fontSize: 'medium', dark: false, primaryColor: '#DC2626' },
};

/** Shallow deep-equal sufficient for our payload shape. */
function eq(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => eq(a[k], b[k]));
}

/** Pull the editable subtree we PUT back to the server. */
function editable(settings) {
  if (!settings) return null;
  return {
    reminders:  { ...DEFAULTS.reminders,  ...(settings.reminders  || {}) },
    appearance: { ...DEFAULTS.appearance, ...(settings.appearance || {}) },
  };
}

export default function SettingsPage() {
  const { user } = useAuth();

  const [settings, setSettings]   = useState(null);   // last-fetched (server truth)
  const [draft, setDraft]         = useState(null);   // local edits
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState(null);
  const [savedAt, setSavedAt]     = useState(null);

  // Load on mount
  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.settings.me.get()
      .then((res) => {
        if (!alive) return;
        setSettings(res);
        setDraft(editable(res));
        setLoading(false);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e?.message || 'Could not load your settings.');
        setLoading(false);
      });
    return () => { alive = false; };
  }, []);

  const baseline = useMemo(() => editable(settings), [settings]);
  const isDirty = !!(draft && baseline && !eq(draft, baseline));
  const saveState = saving ? 'saving' : (isDirty ? 'dirty' : 'saved');

  // Patch helpers
  const patchReminders  = useCallback((partial) => {
    setDraft((d) => d && ({ ...d, reminders:  { ...d.reminders,  ...partial } }));
  }, []);
  const patchAppearance = useCallback((partial) => {
    setDraft((d) => d && ({ ...d, appearance: { ...d.appearance, ...partial } }));
  }, []);

  const onDiscard = useCallback(() => {
    setDraft(baseline);
    setError(null);
  }, [baseline]);

  const onSave = useCallback(async () => {
    if (!draft || saving) return;
    setError(null);
    setSaving(true);
    try {
      const res = await api.settings.me.update(draft);
      // The mock returns the merged settings; use the server response as the
      // new baseline so subsequent diffs are accurate.
      setSettings(res);
      setDraft(editable(res));
      setSavedAt(new Date());
    } catch (e) {
      setError(e?.message || 'Save failed. Your edits are still here — try again.');
    } finally {
      setSaving(false);
    }
  }, [draft, saving]);

  const onResetPrefs = useCallback(() => {
    setDraft({
      reminders:  { ...DEFAULTS.reminders },
      appearance: { ...DEFAULTS.appearance },
    });
  }, []);

  // Profile values — auth context wins, then settings.profile, then defaults.
  const profile = useMemo(() => {
    const fromSettings = settings?.profile || {};
    return {
      name:  user?.name  || fromSettings.name  || 'Signed-in user',
      email: user?.email || fromSettings.email || '—',
      role:  user?.role  || fromSettings.role  || 'employee',
      team:  fromSettings.team || user?.team   || 'Unassigned',
    };
  }, [user, settings]);

  const connections = settings?.connections || { jira: { status: 'connected' }, google: { status: 'connected' } };

  // Show a skeleton while loading — keeps overflow checks happy.
  return (
    <AppShell>
      <div className="page-settings">

        {error ? (
          <div className="ac-banner ac-banner--danger" role="alert">
            {error}
          </div>
        ) : null}

        <header className="page-settings__head">
          <h1 className="page-settings__title">Settings</h1>
          <p className="page-settings__sub">
            Control reminders, connected accounts, and how AutoClock looks for you.
            These only apply to your account.
          </p>
        </header>

        {loading || !draft ? (
          <div className="page-settings__loading" role="status" aria-live="polite">
            Loading your settings…
          </div>
        ) : (
          <>
            {/* ---- Profile (read-only) ---- */}
            <SettingsSection
              id="settings-profile"
              title="Profile"
              desc="Synced from your Iksula directory. Read-only here — ask IT to change."
              badge="Read-only"
            >
              <div className="page-settings__profile-grid">
                <ReadOnlyField label="Name" value={profile.name} lockNote="Managed by HR" />
                <ReadOnlyField label="Email" value={profile.email} lockNote="Tied to Google SSO" />
                <ReadOnlyField
                  label="Role"
                  value={<span className="page-settings__role-chip">{ROLE_LABELS[profile.role] || profile.role}</span>}
                  lockNote="Assigned by Admin"
                />
                <ReadOnlyField label="Team" value={profile.team} lockNote="Managed by Admin" />
              </div>
            </SettingsSection>

            {/* ---- Reminders ---- */}
            <SettingsSection
              id="settings-reminders"
              title="Reminders"
              desc="When AutoClock nudges you to log your day. Quiet hours pause all notifications."
              badge="Personal"
            >
              <div className="ac-field-row">
                <div className="ac-field-row__label">
                  <div className="ac-field-row__lbl">Frequency</div>
                  <div className="ac-field-row__hint">How often you want a nudge.</div>
                </div>
                <SegmentedRadio
                  id="reminder-cadence"
                  name="Reminder frequency"
                  value={draft.reminders.cadence}
                  options={CADENCE_OPTIONS}
                  onChange={(v) => patchReminders({ cadence: v })}
                />
              </div>

              <div className="ac-field-row">
                <div className="ac-field-row__label">
                  <div className="ac-field-row__lbl">Quiet hours</div>
                  <div className="ac-field-row__hint">No nudges in this window. IST.</div>
                </div>
                <div className="page-settings__time-pair">
                  <label className="page-settings__time-input">
                    <span className="page-settings__time-lbl">From</span>
                    <input
                      type="time"
                      aria-label="Quiet hours start"
                      value={draft.reminders.quietStart}
                      onChange={(e) => patchReminders({ quietStart: e.target.value })}
                    />
                  </label>
                  <span className="page-settings__time-arrow" aria-hidden="true">→</span>
                  <label className="page-settings__time-input">
                    <span className="page-settings__time-lbl">To</span>
                    <input
                      type="time"
                      aria-label="Quiet hours end"
                      value={draft.reminders.quietEnd}
                      onChange={(e) => patchReminders({ quietEnd: e.target.value })}
                    />
                  </label>
                </div>
              </div>
            </SettingsSection>

            {/* ---- Appearance ---- */}
            <SettingsSection
              id="settings-appearance"
              title="Appearance"
              desc="Tune the density, type-size, and accent colour for your own view."
              badge="Personal"
            >
              <div className="ac-field-row">
                <div className="ac-field-row__label">
                  <div className="ac-field-row__lbl">Density</div>
                  <div className="ac-field-row__hint">How tightly rows are packed.</div>
                </div>
                <SegmentedRadio
                  id="appearance-density"
                  name="UI density"
                  value={draft.appearance.density}
                  options={DENSITY_OPTIONS}
                  onChange={(v) => patchAppearance({ density: v })}
                />
              </div>

              <div className="ac-field-row">
                <div className="ac-field-row__label">
                  <div className="ac-field-row__lbl">Font size</div>
                  <div className="ac-field-row__hint">Base size for body text.</div>
                </div>
                <SegmentedRadio
                  id="appearance-font"
                  name="Font size"
                  value={draft.appearance.fontSize}
                  options={FONT_OPTIONS}
                  onChange={(v) => patchAppearance({ fontSize: v })}
                />
              </div>

              <div className="ac-field-row">
                <div className="ac-field-row__label">
                  <div className="ac-field-row__lbl">Dark mode</div>
                  <div className="ac-field-row__hint">Switch the whole app to a dark palette.</div>
                </div>
                <label className="page-settings__toggle">
                  <input
                    type="checkbox"
                    checked={!!draft.appearance.dark}
                    onChange={(e) => patchAppearance({ dark: e.target.checked })}
                  />
                  <span className="page-settings__toggle-track" aria-hidden="true">
                    <span className="page-settings__toggle-thumb" />
                  </span>
                  <span className="page-settings__toggle-label">
                    {draft.appearance.dark ? 'Dark mode on' : 'Dark mode off'}
                  </span>
                </label>
              </div>

              <div className="ac-field-row">
                <div className="ac-field-row__label">
                  <div className="ac-field-row__lbl">Accent colour</div>
                  <div className="ac-field-row__hint">Used for highlights + primary buttons.</div>
                </div>
                <div
                  className="page-settings__swatches"
                  role="radiogroup"
                  aria-label="Accent colour"
                >
                  {SWATCHES.map((s) => {
                    const on = draft.appearance.primaryColor === s.value;
                    return (
                      <button
                        key={s.value}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        aria-label={s.name}
                        title={s.name}
                        className={`page-settings__swatch${on ? ' is-on' : ''}`}
                        style={{ background: s.value }}
                        onClick={() => patchAppearance({ primaryColor: s.value })}
                      >
                        {on ? <Icon name="check" /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </SettingsSection>

            {/* ---- Connections ---- */}
            <SettingsSection
              id="settings-connections"
              title="Connected accounts"
              desc="AutoClock posts on your behalf using these tokens. They stay encrypted on Iksula servers."
              badge="2 of 2"
            >
              <ConnRow
                provider="jira"
                status={connections.jira?.status || 'connected'}
                account={profile.email}
                expiresAt={connections.jira?.expiresAt}
                onReconnect={() => { /* M1 — opens OAuth window */ }}
                onDisconnect={() => { /* M1 — calls disconnect endpoint */ }}
              />
              <ConnRow
                provider="google"
                status={connections.google?.status || 'connected'}
                account={profile.email}
                expiresAt={connections.google?.expiresAt}
                onReconnect={() => { /* M1 */ }}
                onDisconnect={() => { /* M1 */ }}
              />
            </SettingsSection>

            {/* ---- Danger zone ---- */}
            <SettingsSection
              id="settings-danger"
              title="Reset preferences"
              desc="Restore reminders + appearance to their defaults. Connected accounts and history aren't touched."
              badge="Danger"
            >
              <div className="page-settings__danger-row">
                <p className="page-settings__danger-copy">
                  This rewrites your reminder cadence, quiet hours, density, font size, dark mode and accent colour to factory defaults.
                  Click <strong>Save</strong> after to commit.
                </p>
                <button
                  type="button"
                  className="ac-btn ac-btn--danger"
                  onClick={onResetPrefs}
                >
                  Reset to defaults
                </button>
              </div>
            </SettingsSection>
          </>
        )}

        <SaveBar
          state={saveState}
          onSave={onSave}
          onDiscard={onDiscard}
          savedHint={savedAt ? `Last saved · ${savedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })} IST` : undefined}
          primaryLabel="Save changes"
        />
      </div>
    </AppShell>
  );
}

function ReadOnlyField({ label, value, lockNote }) {
  return (
    <div className="page-settings__ro-field">
      <div className="page-settings__ro-label">{label}</div>
      <div className="page-settings__ro-value">{value}</div>
      {lockNote ? (
        <div className="page-settings__ro-note">
          <Icon name="lock" /> {lockNote}
        </div>
      ) : null}
    </div>
  );
}
