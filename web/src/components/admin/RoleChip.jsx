// RoleChip — small chip with role-color swatch + role label.
// Used in P14 Users & Roles rows; designed to also render in P15+P16 if needed.
//
// Roles: 'employee' | 'pm_lead' | 'management' | 'operations' | 'admin'
// Each role has a distinct hue (matches the autoclock-theme palette).

import './RoleChip.css';

const ROLE_META = {
  employee:   { label: 'Employee',   hue: '#64748B' },
  pm_lead:    { label: 'PM Lead',    hue: '#10B981' },
  management: { label: 'Management', hue: '#DC2626' },
  operations: { label: 'Operations', hue: '#0EA5E9' },
  admin:      { label: 'Admin',      hue: '#8B5CF6' },
};

export default function RoleChip({ role }) {
  const meta = ROLE_META[role] || { label: role || 'Unknown', hue: '#94A3B8' };
  return (
    <span className="ac-role-chip" data-role={role || 'unknown'}>
      <span
        className="ac-role-chip__swatch"
        aria-hidden="true"
        style={{ background: meta.hue }}
      />
      <span className="ac-role-chip__label">{meta.label}</span>
    </span>
  );
}
