// MemberStatusPill — thin wrapper around the unified <StatusPill> that maps
// the team-member status enum to its visual tone + label.
//
// Status → tone map (per task spec §components):
//   logging  → info     ("In progress")
//   closed   → success  ("Closed")
//   partial  → partial  ("Partial")
//   missing  → failed   ("Not logged")
//   leave    → skipped  ("On leave")

import StatusPill from '../pills/StatusPill';

const MAP = {
  logging: { tone: 'info',    label: 'In progress' },
  closed:  { tone: 'success', label: 'Closed' },
  partial: { tone: 'partial', label: 'Partial' },
  missing: { tone: 'failed',  label: 'Not logged' },
  leave:   { tone: 'skipped', label: 'On leave' },
};

export default function MemberStatusPill({ status, size = 'md' }) {
  const m = MAP[status] || MAP.logging;
  return (
    <StatusPill tone={m.tone} size={size}>
      {m.label}
    </StatusPill>
  );
}
