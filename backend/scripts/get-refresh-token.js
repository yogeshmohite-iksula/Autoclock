// One-shot script to capture a Google refresh token for the demo account.
// Stops after the first successful callback. Run with: node scripts/get-refresh-token.js
// Then paste the token into .env as GOOGLE_DEMO_REFRESH_TOKEN.

require('dotenv').config();
const http = require('http');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI  = process.env.GOOGLE_REDIRECT_URI; // http://localhost:4000/api/auth/google/callback

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌  GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set in .env');
  process.exit(1);
}

const oauth2 = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/gmail.compose',
];

const authUrl = oauth2.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',          // forces a refresh_token even if already consented
  scope: SCOPES,
});

console.log('\n──────────────────────────────────────────────────────');
console.log('  Open this URL in your browser and sign in:');
console.log('\n  ' + authUrl + '\n');
console.log('  Waiting for Google to redirect to localhost:4000 ...');
console.log('──────────────────────────────────────────────────────\n');

// Minimal HTTP server — only handles the OAuth callback path.
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:4000');
  if (url.pathname !== '/api/auth/google/callback') {
    res.end('waiting...');
    return;
  }

  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    res.end(`<h2>Error: ${error}</h2><p>Close this tab and check the terminal.</p>`);
    console.error('❌  Google returned error:', error);
    server.close();
    return;
  }

  if (!code) {
    res.end('<h2>No code received.</h2>');
    server.close();
    return;
  }

  try {
    const { tokens } = await oauth2.getToken(code);
    const refreshToken = tokens.refresh_token;

    if (!refreshToken) {
      res.end('<h2>No refresh_token in response.</h2><p>Revoke app access at myaccount.google.com/permissions and try again — "prompt=consent" must be shown.</p>');
      console.error('❌  No refresh_token returned. Revoke app access at https://myaccount.google.com/permissions and re-run.');
      server.close();
      return;
    }

    // Write into .env
    const envPath = path.join(__dirname, '..', '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    envContent = envContent.replace(
      /^GOOGLE_DEMO_REFRESH_TOKEN=.*$/m,
      'GOOGLE_DEMO_REFRESH_TOKEN=' + refreshToken
    );
    fs.writeFileSync(envPath, envContent);

    res.end('<h2>✅ Refresh token saved to .env</h2><p>Close this tab — restart the backend.</p>');
    console.log('\n✅  Refresh token written to .env');
    console.log('    Restart the backend now: node server.js\n');
    server.close();
  } catch (err) {
    res.end('<h2>Token exchange failed</h2><pre>' + err.message + '</pre>');
    console.error('❌  Token exchange error:', err.message);
    server.close();
  }
});

server.listen(4000, () => {});
