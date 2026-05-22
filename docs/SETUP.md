# AutoClock — Integration Setup Guide

This guide covers everything needed to configure Google (OIDC + Sheets + Gmail) and Jira for a fresh deployment. Follow the sections in order.

---

## 1. Prerequisites

- A Google Workspace org (Iksula's existing one)
- Access to [Google Cloud Console](https://console.cloud.google.com)
- Access to [Atlassian account settings](https://id.atlassian.com/manage-profile/security/api-tokens)
- Node.js 18+ on the server
- The backend `.env` file copied from `.env.example`

---

## 2. Google Cloud Project Setup

### 2.1 Create the project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Click the project dropdown → **New Project**
3. Name it `AutoClock` → **Create**
4. Note the **Project ID** (e.g. `autoclock-123456`) — used in all API URLs

### 2.2 Enable required APIs

In the Cloud Console navigate to **APIs & Services → Library** and enable all three:

| API | Search term |
|---|---|
| Google Sheets API | `sheets` |
| Gmail API | `gmail` |
| Google Identity (OIDC) | already included with Workspace — no action needed |

Or enable directly:
- Sheets: `https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=<PROJECT_ID>`
- Gmail: `https://console.developers.google.com/apis/api/gmail.googleapis.com/overview?project=<PROJECT_ID>`

### 2.3 Configure the OAuth consent screen

**This step is critical** — the `gmail.compose` scope is restricted and requires the consent screen to be Internal to skip Google's verification process.

1. Go to **APIs & Services → OAuth consent screen**
2. Set User Type to **Internal** (not External)
   - Internal = only users within your Google Workspace org — no verification needed
   - If you accidentally set External, restricted scopes (`gmail.compose`) will block you
3. Fill in:
   - **App name**: AutoClock
   - **User support email**: your admin email
   - **Developer contact**: your admin email
4. Click **Save and Continue**
5. On the Scopes screen add:
   - `https://www.googleapis.com/auth/spreadsheets`
   - `https://www.googleapis.com/auth/gmail.compose`
   - `openid`, `email`, `profile` (for OIDC sign-in)
6. Click **Save and Continue** → **Back to Dashboard**

### 2.4 Create the OAuth 2.0 client

1. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**
2. Application type: **Web application**
3. Name: `AutoClock Backend`
4. **Authorized JavaScript origins** — add:
   ```
   http://localhost:4000
   https://<your-live-domain>
   ```
5. **Authorized redirect URIs** — add all of these:
   ```
   http://localhost:4000/api/auth/google/callback
   http://localhost:4000/api/auth/login/callback
   https://<your-live-domain>/api/auth/google/callback
   https://<your-live-domain>/api/auth/login/callback
   ```
6. Click **Create**
7. Copy the **Client ID** and **Client Secret** — add both to `.env`:
   ```
   GOOGLE_OIDC_CLIENT_ID=<client-id>
   GOOGLE_OIDC_CLIENT_SECRET=<client-secret>
   GOOGLE_CLIENT_ID=<same client-id>
   GOOGLE_CLIENT_SECRET=<same client-secret>
   ```

---

## 3. Get the Google Demo Refresh Token

The refresh token lets the backend call Sheets and Gmail on behalf of the demo/admin account without user interaction. Run this once before launch.

### 3.1 Update redirect URIs

Make sure `http://localhost:4000/api/auth/google/callback` is in the **Authorized redirect URIs** list (done in step 2.4 above).

For a live server, also add `https://<your-live-domain>/api/auth/google/callback` and update `GOOGLE_REDIRECT_URI` in `.env` to match.

### 3.2 Run the capture script

Stop the backend if it is running, then:

```bash
cd backend
node scripts/get-refresh-token.js
```

The script prints an authorization URL. Open it in a browser, sign in with the **demo/admin Google account** (the one that owns the timesheet), and click Allow.

Google redirects to `localhost:4000` — the script catches the code, exchanges it for tokens, and writes `GOOGLE_DEMO_REFRESH_TOKEN` into `backend/.env` automatically.

You will see:
```
✅  Refresh token written to .env
    Restart the backend now: node server.js
```

### 3.3 If no refresh_token is returned

Google only issues a refresh token on the **first** consent or when `prompt=consent` is forced. If you get an access token but no refresh token:

1. Go to [myaccount.google.com/permissions](https://myaccount.google.com/permissions)
2. Find **AutoClock** → **Remove access**
3. Re-run `node scripts/get-refresh-token.js`

### 3.4 Live server redirect

For production, update `.env`:
```
GOOGLE_REDIRECT_URI=https://<your-live-domain>/api/auth/google/callback
GOOGLE_OIDC_REDIRECT_URI=https://<your-live-domain>/api/auth/login/callback
```

Then re-run the capture script from a machine that can reach `<your-live-domain>` for the redirect, or manually exchange the code:

```bash
# After Google redirects to your live URL with ?code=..., grab the code and run:
node -e "
require('dotenv').config();
const { google } = require('googleapis');
const oauth2 = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);
oauth2.getToken('<PASTE_CODE_HERE>').then(r => console.log(r.tokens));
"
```

Copy the `refresh_token` value into `.env`.

---

## 4. Google Sheet Setup

### 4.1 Create or identify the timesheet

Each employee needs a Google Sheet to receive worklog rows. For M0 (demo), one shared sheet is fine. For M1 (60 users), each user has their own `sheet_id`.

1. Open or create the timesheet in Google Drive
2. The **Sheet ID** is in the URL:
   ```
   https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit
   ```
3. Add to `.env`:
   ```
   GOOGLE_DEMO_SHEET_ID=<sheet-id>
   ```
4. Set it on the user row in the DB:
   ```bash
   node -e "
   const {db} = require('./db');
   db.prepare('UPDATE users SET sheet_id=?, sheet_range=? WHERE email=?')
     .run('<sheet-id>', 'Sheet1!A:G', '<user@iksula.com>');
   "
   ```

### 4.2 Sheet structure (auto-managed)

AutoClock auto-creates a **month tab** (e.g. `May 2026`) and writes headers on first use:

| Date | Employee | Project | Ticket | Slot | Duration | Description |
|---|---|---|---|---|---|---|
| 2026-05-23 | Keval Parikh | Internal | IN-3 | 09:00-09:05 | 0h 5m | Internal Meetings |

A new tab is created automatically at the start of each month. No manual sheet setup required beyond sharing the sheet with the Google account used for the refresh token.

### 4.3 Share the sheet

Share the timesheet with the Google account used in step 3.2 (the demo/admin account) with **Editor** access.

---

## 5. Jira API Token Setup

### 5.1 Generate a classic API token

1. Go to [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click **Create API token**
3. Label: `AutoClock` — note the creation date (tokens expire after ~90 days on Iksula's org)
4. Copy the token immediately — it is shown only once
5. Add to `.env`:
   ```
   JIRA_EMAIL=your.email@iksula.com
   JIRA_API_TOKEN=<token>
   JIRA_BASE_URL=https://iksula.atlassian.net
   ```

### 5.2 Validate the token

```bash
cd backend
node -e "
require('dotenv').config();
const auth = Buffer.from(process.env.JIRA_EMAIL+':'+process.env.JIRA_API_TOKEN).toString('base64');
fetch(process.env.JIRA_BASE_URL+'/rest/api/3/myself',{headers:{'Authorization':'Basic '+auth}})
  .then(r=>r.json()).then(j=>console.log(j.displayName, j.emailAddress));
"
```

Expected output: `Keval Parikh keval.p@iksula.com`

### 5.3 Classic vs scoped token

| Token type | Base URL | `JIRA_CLOUD_ID` needed? |
|---|---|---|
| **Classic** (recommended) | `https://iksula.atlassian.net` | No |
| Scoped | `https://api.atlassian.com/ex/jira/<cloudId>` | Yes |

To get `JIRA_CLOUD_ID` if using a scoped token:
```bash
curl https://iksula.atlassian.net/_edge/tenant_info
```

### 5.4 Reader account (for dashboards — EP-23)

The Operations and Management dashboards need a second token from an account that has **Browse Projects** on all Jira projects:

```
JIRA_READER_EMAIL=ops.member@iksula.com
JIRA_READER_TOKEN=<ops-member-token>
```

This account only reads — it never writes worklogs.

### 5.5 Required Jira permissions

The writing account (`JIRA_EMAIL`) needs on each project (PIM, ML, CUMI, IN, etc.):
- **Browse Projects**
- **Work on Issues** (log work)

The reader account (`JIRA_READER_EMAIL`) needs only:
- **Browse Projects** on all projects

---

## 6. Session & Encryption Keys

Generate once per deployment — never reuse across environments:

```bash
# SESSION_SECRET (64 random bytes)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# TOKEN_ENC_KEY (16 random bytes = 32 hex chars = 128-bit AES key)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

Add to `.env`:
```
SESSION_SECRET=<output of first command>
TOKEN_ENC_KEY=<output of second command>
```

If `TOKEN_ENC_KEY` is lost, users must reconnect their OAuth accounts — the encrypted tokens cannot be decrypted.

---

## 7. Live URL Deployment Checklist

When deploying to a live server (e.g. `https://autoclock.iksula.com`), update these in addition to the steps above:

### .env changes
```
NODE_ENV=production
GOOGLE_REDIRECT_URI=https://autoclock.iksula.com/api/auth/google/callback
GOOGLE_OIDC_REDIRECT_URI=https://autoclock.iksula.com/api/auth/login/callback
ATLASSIAN_REDIRECT_URI=https://autoclock.iksula.com/api/auth/jira/callback
VITE_API_BASE_URL=https://autoclock.iksula.com
```

### Google Cloud Console
In **Authorized redirect URIs**, add:
```
https://autoclock.iksula.com/api/auth/google/callback
https://autoclock.iksula.com/api/auth/login/callback
```

In **Authorized JavaScript origins**, add:
```
https://autoclock.iksula.com
```

### Re-capture the refresh token

Re-run `node scripts/get-refresh-token.js` with the live `GOOGLE_REDIRECT_URI` set, or manually exchange the code as described in §3.4.

### Re-build the frontend

```bash
cd web
VITE_API_BASE_URL=https://autoclock.iksula.com npm run build
```

---

## 8. Quick Validation Sequence

Run after any fresh setup to confirm everything works:

```bash
cd backend

# 1. Jira
node -e "
require('dotenv').config();
const auth=Buffer.from(process.env.JIRA_EMAIL+':'+process.env.JIRA_API_TOKEN).toString('base64');
fetch(process.env.JIRA_BASE_URL+'/rest/api/3/myself',{headers:{'Authorization':'Basic '+auth}})
  .then(r=>r.json()).then(j=>console.log('Jira ✅', j.displayName));
"

# 2. Google Sheets (append a test row — use a COPY of the sheet)
node -e "
require('dotenv').config();
const {google}=require('googleapis');
const auth=new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID,process.env.GOOGLE_CLIENT_SECRET,process.env.GOOGLE_REDIRECT_URI);
auth.setCredentials({refresh_token:process.env.GOOGLE_DEMO_REFRESH_TOKEN});
const sheets=google.sheets({version:'v4',auth});
sheets.spreadsheets.values.append({spreadsheetId:process.env.GOOGLE_DEMO_SHEET_ID,range:'Sheet1!A:A',valueInputOption:'USER_ENTERED',requestBody:{values:[['test']]}})
  .then(()=>console.log('Sheets ✅')).catch(e=>console.error('Sheets ❌',e.message));
"

# 3. Gmail draft
node -e "
require('dotenv').config();
const {google}=require('googleapis');
const auth=new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID,process.env.GOOGLE_CLIENT_SECRET,process.env.GOOGLE_REDIRECT_URI);
auth.setCredentials({refresh_token:process.env.GOOGLE_DEMO_REFRESH_TOKEN});
const gmail=google.gmail({version:'v1',auth});
const raw=Buffer.from('To: test@example.com\r\nSubject: test\r\n\r\ntest').toString('base64').replace(/\+/g,'-').replace(/\//g,'_');
gmail.users.drafts.create({userId:'me',requestBody:{message:{raw}}})
  .then(r=>console.log('Gmail ✅ draft',r.data.id)).catch(e=>console.error('Gmail ❌',e.message));
"

# 4. Backend health
curl -s http://localhost:4000/api/health
```

---

## 9. Token Expiry Reference

| Token | Expiry | Action on expiry |
|---|---|---|
| Jira classic API token | ~90 days (Iksula org policy) | Generate a new one at id.atlassian.com and update `JIRA_API_TOKEN` |
| Google refresh token | Never (unless revoked or inactive 6 months) | Re-run `get-refresh-token.js` |
| Google access token | 1 hour — auto-refreshed by `googleapis` library | No action needed |
| Session cookie | Configurable via `SESSION_SECRET` rotation | Users re-login |

---

*See also: `docs/AutoClock_DevDoc.md` §6 for integration how-tos · `docs/SECURITY.md` for the security policy.*
