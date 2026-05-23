// SettingsSection — a card with a title row + optional desc + optional badge,
// and a body slot for fields. Used on /settings and /admin/integrations.
//
// Body-class agnostic — selectors live under .ac-settings-section so the
// component can render inside .page-settings AND .page-integrations.
//
// Source design: docs/FrontEnd Design /Settings.html (.section block).

import '../../styles/settings-components.css';

export default function SettingsSection({ title, desc, badge, children, id }) {
  // The title gets a heading role so axe/AT and Playwright can find it.
  return (
    <section className="ac-settings-section" id={id}>
      <div className="ac-settings-section__head">
        <div className="ac-settings-section__title-block">
          <h2 className="ac-settings-section__title">{title}</h2>
          {desc ? <p className="ac-settings-section__desc">{desc}</p> : null}
        </div>
        {badge ? <span className="ac-settings-section__badge">{badge}</span> : null}
      </div>
      <div className="ac-settings-section__body">
        {children}
      </div>
    </section>
  );
}
