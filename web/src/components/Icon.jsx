// Icon — single SVG icon set used across the app.
// Pure JSX, no external deps. Uses currentColor so consumers can style
// via `color:`. Add new icons here and reference by name.

export default function Icon({ name, size = 18 }) {
  const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const wh = { width: size, height: size };
  switch (name) {
    // Shell + form icons (existed in TodayPage's inline set)
    case 'today':    return <svg viewBox="0 0 24 24" {...wh}><circle cx="12" cy="12" r="8.5" {...s}/><path d="M12 7.5V12l3 2.2" {...s}/></svg>;
    case 'history':  return <svg viewBox="0 0 24 24" {...wh}><path d="M4 12a8 8 0 1 0 2.5-5.8" {...s}/><path d="M4 4v3.5H7.5" {...s}/><path d="M12 8v4l3 2" {...s}/></svg>;
    case 'settings': return <svg viewBox="0 0 24 24" {...wh}><circle cx="12" cy="12" r="2.6" {...s}/><path d="M19.4 13.3a7.6 7.6 0 0 0 0-2.6l1.7-1.3-1.7-3-2 .7a7.6 7.6 0 0 0-2.3-1.3L14.6 4h-5.2l-.5 1.8a7.6 7.6 0 0 0-2.3 1.3l-2-.7-1.7 3 1.7 1.3a7.6 7.6 0 0 0 0 2.6L2.9 14.6l1.7 3 2-.7a7.6 7.6 0 0 0 2.3 1.3l.5 1.8h5.2l.5-1.8a7.6 7.6 0 0 0 2.3-1.3l2 .7 1.7-3-1.7-1.3z" {...s}/></svg>;
    case 'bell':     return <svg viewBox="0 0 24 24" {...wh}><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2H4.5L6 16z" {...s}/><path d="M10 20a2 2 0 0 0 4 0" {...s}/></svg>;
    case 'search':   return <svg viewBox="0 0 24 24" {...wh}><circle cx="11" cy="11" r="6.5" {...s}/><path d="M16 16l4 4" {...s}/></svg>;
    case 'help':     return <svg viewBox="0 0 24 24" {...wh}><circle cx="12" cy="12" r="8.5" {...s}/><path d="M9.5 9.5c.3-1.4 1.4-2 2.5-2 1.4 0 2.5.8 2.5 2.2 0 1.5-2.5 1.8-2.5 3.3" {...s}/><circle cx="12" cy="16.5" r=".5" fill="currentColor" stroke="none"/></svg>;
    case 'plus':     return <svg viewBox="0 0 24 24" {...wh}><path d="M12 5v14M5 12h14" {...s}/></svg>;
    case 'edit':     return <svg viewBox="0 0 24 24" {...wh}><path d="M14.5 5.5l4 4L8 20H4v-4L14.5 5.5z" {...s}/></svg>;
    case 'trash':    return <svg viewBox="0 0 24 24" {...wh}><path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" {...s}/></svg>;
    case 'ext':      return <svg viewBox="0 0 24 24" {...wh}><path d="M9 5h10v10M19 5L9 15M5 9v10h10" {...s}/></svg>;
    case 'reminder': return <svg viewBox="0 0 24 24" {...wh}><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2H4.5L6 16z" {...s}/><path d="M10 20a2 2 0 0 0 4 0" {...s}/></svg>;
    // Sidebar role-extras
    case 'team':     return <svg viewBox="0 0 24 24" {...wh}><circle cx="9" cy="9" r="3.2" {...s}/><circle cx="16.5" cy="11" r="2.4" {...s}/><path d="M3 19c0-3 2.7-5 6-5s6 2 6 5" {...s}/><path d="M14 19c0-2 1.5-3.5 4-3.5s3 1.5 3 3.5" {...s}/></svg>;
    case 'org':      return <svg viewBox="0 0 24 24" {...wh}><path d="M3 21V8l9-5 9 5v13" {...s}/><path d="M9 21V12h6v9" {...s}/></svg>;
    case 'comp':     return <svg viewBox="0 0 24 24" {...wh}><path d="M9 12.5l2 2 4-5" {...s}/><path d="M12 3l8 3v6c0 4.5-3 8-8 9-5-1-8-4.5-8-9V6l8-3z" {...s}/></svg>;
    case 'console':  return <svg viewBox="0 0 24 24" {...wh}><rect x="3" y="4" width="18" height="16" rx="2" {...s}/><path d="M7 9l3 3-3 3M13 15h5" {...s}/></svg>;
    case 'leave':    return <svg viewBox="0 0 24 24" {...wh}><rect x="3.5" y="5" width="17" height="15" rx="2" {...s}/><path d="M3.5 9.5h17M8 3.5V6M16 3.5V6" {...s}/></svg>;
    case 'mapping':  return <svg viewBox="0 0 24 24" {...wh}><rect x="3" y="5" width="7" height="5" rx="1" {...s}/><rect x="14" y="5" width="7" height="5" rx="1" {...s}/><rect x="3" y="14" width="7" height="5" rx="1" {...s}/><rect x="14" y="14" width="7" height="5" rx="1" {...s}/><path d="M10 7.5h4M10 16.5h4" {...s}/></svg>;
    case 'plug':     return <svg viewBox="0 0 24 24" {...wh}><path d="M9 7V3M15 7V3" {...s}/><rect x="6.5" y="7" width="11" height="6" rx="2" {...s}/><path d="M12 13v4a3 3 0 0 1-3 3" {...s}/></svg>;
    case 'users':    return <svg viewBox="0 0 24 24" {...wh}><circle cx="9" cy="8" r="3.2" {...s}/><path d="M3 20c0-3.5 2.7-5.5 6-5.5s6 2 6 5.5" {...s}/><circle cx="17" cy="9.5" r="2.6" {...s}/><path d="M14.5 20c0-2.5 1.5-4 4-4s3 1.5 3 4" {...s}/></svg>;
    // Drawer + UI affordances (new)
    case 'menu':     return <svg viewBox="0 0 24 24" {...wh}><path d="M4 7h16M4 12h16M4 17h16" {...s}/></svg>;
    case 'x':        return <svg viewBox="0 0 24 24" {...wh}><path d="M6 6l12 12M18 6L6 18" {...s}/></svg>;
    case 'chevron-down': return <svg viewBox="0 0 24 24" {...wh}><path d="M6 9l6 6 6-6" {...s}/></svg>;
    case 'chevron-right': return <svg viewBox="0 0 24 24" {...wh}><path d="M9 6l6 6-6 6" {...s}/></svg>;
    case 'arrow-left':   return <svg viewBox="0 0 24 24" {...wh}><path d="M14 6l-6 6 6 6M5 12h14" {...s}/></svg>;
    case 'check':    return <svg viewBox="0 0 24 24" {...wh}><path d="M5 12.5l4.5 4.5L19 7.5" {...s}/></svg>;
    case 'lock':     return <svg viewBox="0 0 24 24" {...wh}><rect x="5" y="11" width="14" height="9" rx="2" {...s}/><path d="M8 11V8a4 4 0 0 1 8 0v3" {...s}/></svg>;
    default: return null;
  }
}
