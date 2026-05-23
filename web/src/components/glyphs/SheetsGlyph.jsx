// SheetsGlyph — Google Sheets brand mark.
// Shared by Close My Day, Sync Result, Settings, Integrations.

export default function SheetsGlyph({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="3" width="16" height="18" rx="2" fill="#0F9D58" />
      <path d="M7 10h10M7 13.5h10M7 17h10M11 7v13" stroke="#fff" strokeWidth="1.4" />
    </svg>
  );
}
