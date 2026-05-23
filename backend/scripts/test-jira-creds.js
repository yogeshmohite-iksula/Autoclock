// Smoke-test your Jira classic API token before the HackFest demo.
// Reads JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN from backend/.env
// then calls GET /rest/api/3/myself and prints the account info.
//
// Usage:
//   cd backend
//   node scripts/test-jira-creds.js

require('dotenv').config();

const base  = process.env.JIRA_BASE_URL;
const email = process.env.JIRA_EMAIL;
const token = process.env.JIRA_API_TOKEN;

if (!base || !email || !token) {
  console.error('\n❌  Missing env vars. Fill in backend/.env:\n');
  if (!base)  console.error('   JIRA_BASE_URL=https://iksula.atlassian.net');
  if (!email) console.error('   JIRA_EMAIL=yogesh@iksula.com');
  if (!token) console.error('   JIRA_API_TOKEN=<classic token from id.atlassian.com>');
  console.error('\nHow to get a classic token:');
  console.error('  1. Go to https://id.atlassian.com/manage-profile/security/api-tokens');
  console.error('  2. Click "Create API token" → give it a name → copy the token');
  console.error('  3. Paste it as JIRA_API_TOKEN in backend/.env\n');
  process.exit(1);
}

const auth = `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`;

(async () => {
  console.log(`\n🔍  Testing Jira credentials against ${base} ...\n`);

  // 1. Check identity
  const meRes = await fetch(`${base}/rest/api/3/myself`, {
    headers: { Authorization: auth, Accept: 'application/json' },
  });

  if (meRes.status === 401) {
    console.error('❌  401 Unauthorized — JIRA_EMAIL or JIRA_API_TOKEN is wrong.\n');
    process.exit(1);
  }
  if (!meRes.ok) {
    console.error(`❌  Unexpected status ${meRes.status} from /myself\n`);
    process.exit(1);
  }

  const me = await meRes.json();
  console.log('✅  Identity OK:');
  console.log(`    accountId   : ${me.accountId}`);
  console.log(`    displayName : ${me.displayName}`);
  console.log(`    email       : ${me.emailAddress}\n`);

  // 2. Try to read the first active project (sanity check permissions)
  const projRes = await fetch(`${base}/rest/api/3/project/search?maxResults=3&orderBy=name`, {
    headers: { Authorization: auth, Accept: 'application/json' },
  });

  if (!projRes.ok) {
    console.warn(`⚠️   Could not list projects (status ${projRes.status}) — token may lack Browse Projects permission.`);
  } else {
    const { values } = await projRes.json();
    if (values && values.length) {
      console.log('✅  Projects visible:');
      values.forEach(p => console.log(`    ${p.key.padEnd(10)} ${p.name}`));
      console.log();
    } else {
      console.warn('⚠️   No projects returned — check Browse Projects permission.\n');
    }
  }

  // 3. Verify JIRA_CLOUD_ID hint (optional)
  const tenantRes = await fetch(`${base}/_edge/tenant_info`);
  if (tenantRes.ok) {
    const info = await tenantRes.json();
    console.log(`ℹ️   Cloud ID (JIRA_CLOUD_ID) : ${info.cloudId}`);
    console.log(`    Set it in .env if you need scoped tokens (ADR-11).\n`);
  }

  console.log('🎉  Jira credentials look good! You can proceed with the E2E test.\n');
})();
