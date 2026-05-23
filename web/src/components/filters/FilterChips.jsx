// FilterChips — chip group + optional search input.
// Used by:
//   • P11 Compliance Console (all/under/complete + name search)
//   • P14 Users and Roles, P15 Project Mapping (planned)
//
// a11y: chip group is `role="group"` with each chip as a button with
// `aria-pressed`. Search input is a `<label>` wrapping `<input type="search">`.

import './FilterChips.css';

/**
 * @param {object} props
 *   chips    [{ value, label, count?, tone? }]
 *   value    string                       — selected chip value
 *   onChange (next: string) => void
 *   search   string                       — controlled search value (optional)
 *   onSearch (next: string) => void       — search change handler (optional)
 *   searchPlaceholder string
 *   ariaLabel string                      — accessible name for the group
 */
export default function FilterChips({
  chips = [],
  value,
  onChange,
  search,
  onSearch,
  searchPlaceholder = 'Search…',
  ariaLabel = 'Filters',
}) {
  return (
    <div className="ac-filter-chips">
      <div className="ac-filter-chips__group" role="group" aria-label={ariaLabel}>
        {chips.map((c) => {
          const isOn = c.value === value;
          return (
            <button
              key={c.value}
              type="button"
              className={`ac-filter-chips__chip${isOn ? ' is-on' : ''}${c.tone ? ` is-${c.tone}` : ''}`}
              aria-pressed={isOn}
              onClick={() => onChange?.(c.value)}
            >
              <span className="ac-filter-chips__chip-label">{c.label}</span>
              {c.count != null && <span className="ac-filter-chips__chip-count">{c.count}</span>}
            </button>
          );
        })}
      </div>
      {typeof onSearch === 'function' && (
        <label className="ac-filter-chips__search">
          <span className="visually-hidden">Search</span>
          <input
            type="search"
            value={search ?? ''}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="ac-filter-chips__search-input"
          />
        </label>
      )}
    </div>
  );
}
