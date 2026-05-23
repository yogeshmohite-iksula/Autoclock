// HolidayChip — tiny pill showing a holiday name inside a calendar cell or list.
// Scoped under .page-leave (no separate CSS module — styled via leave-calendar.css).

export default function HolidayChip({ name, compact = false }) {
  return (
    <span className={`leave-holiday-chip${compact ? ' leave-holiday-chip--compact' : ''}`} title={name}>
      <span className="leave-holiday-chip__dot" aria-hidden="true">★</span>
      <span className="leave-holiday-chip__txt">{name}</span>
    </span>
  );
}
