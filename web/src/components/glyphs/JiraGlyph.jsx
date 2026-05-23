// JiraGlyph — Atlassian Jira brand mark used on Close My Day, Sync Result,
// History sync pills, admin Project Mapping and Integrations pages.
// Lifted from docs/FrontEnd Design /Close My Day.html.

export default function JiraGlyph({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 5 5 16l11 11 4-4-7-7 7-7-4-4z" fill="#2684FF" />
      <path d="M16 5l11 11-11 11-4-4 7-7-7-7 4-4z" fill="#2684FF" opacity=".55" />
    </svg>
  );
}
