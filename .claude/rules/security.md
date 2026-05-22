---
paths:
  - "backend/**"
  - "extension/**"
  - "web/**"
  - ".env*"
---
# Security Rules (OWASP-aligned, sized for an internal 60-user tool)

- **NEVER** commit a populated `.env`, real API token, OAuth secret, refresh token, or `*.db` file. `.gitignore` and `.gitleaks.toml` are configured to catch them — do not relax the rules.
- **NEVER** log a token body, full Authorization header, or full OAuth response. Log claims/IDs/status only.
- **NEVER** expose `JIRA_API_TOKEN`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_DEMO_REFRESH_TOKEN`, `TOKEN_ENC_KEY`, `SESSION_SECRET` in client code, build output, browser bundles, or error messages.
- **NEVER** write to a real Google Sheet during development — test against a copy (OQ-3). Verified copies only.
- **ALWAYS** encrypt OAuth tokens at rest in `user_connections` using AES-256-GCM (`services/crypto.js`).
- **ALWAYS** atomic-overwrite the stored Jira `refresh_token` on every refresh — rotating refresh tokens invalidate the previous one (DevDoc §6.5).
- **ALWAYS** enforce RBAC server-side; client role claims are advisory only.
- **ALWAYS** validate input at the trust boundary: every route handler that touches the DB or an external API.
- **ALWAYS** keep `gmail.compose` in the OAuth scope — anything broader is needless surface.
- HTTPS only in pilot / production. HSTS + restrictive CSP + same-origin cookies.
- See `docs/SECURITY.md` for the full policy.
