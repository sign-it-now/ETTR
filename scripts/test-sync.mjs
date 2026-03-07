#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// ETTR GitHub Sync - manual test script
//
// Usage:
//   GITHUB_REPO="https://github.com/owner/repo" GITHUB_TOKEN="ghp_xxx" node scripts/test-sync.mjs
//
// Or pass as arguments:
//   node scripts/test-sync.mjs https://github.com/owner/repo ghp_xxx
// ─────────────────────────────────────────────────────────────────────────────

const DATA_DIR = 'ettr-data';
const DATA_FILES = ['loads.json', 'drivers.json', 'brokers.json', 'invoices.json'];

// ── CLI args / env ────────────────────────────────────────────────────────────
const repoUrl = process.argv[2] || process.env.GITHUB_REPO || '';
const token   = process.argv[3] || process.env.GITHUB_TOKEN || '';

if (!repoUrl || !token) {
  console.error('Usage: GITHUB_REPO=<url> GITHUB_TOKEN=<ghp_xxx> node scripts/test-sync.mjs');
  console.error('   or: node scripts/test-sync.mjs <repo-url> <token>');
  process.exit(1);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseRepoUrl(url) {
  const cleaned = url.trim().replace(/\.git$/, '');
  const match = cleaned.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (match) return { owner: match[1], repo: match[2] };
  const parts = cleaned.split('/').filter(Boolean);
  if (parts.length >= 2) return { owner: parts[parts.length - 2], repo: parts[parts.length - 1] };
  return null;
}

const parsed = parseRepoUrl(repoUrl);
if (!parsed) {
  console.error('Invalid repo URL. Use: https://github.com/owner/repo');
  process.exit(1);
}
const { owner, repo } = parsed;
const apiBase = `https://api.github.com/repos/${owner}/${repo}`;

function authHeaders() {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };
}

function ok(msg)   { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.error(`  ✗ ${msg}`); }
function info(msg) { console.log(`  · ${msg}`); }
function head(msg) { console.log(`\n${msg}`); }

// ── API calls ─────────────────────────────────────────────────────────────────

async function fetchFile(filePath) {
  const res = await fetch(`${apiBase}/contents/${filePath}`, { headers: authHeaders() });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const data = await res.json();
  const decoded = Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf8');
  return { content: JSON.parse(decoded), sha: data.sha, size: data.size };
}

async function writeFile(filePath, content, sha, message) {
  const encoded = Buffer.from(JSON.stringify(content, null, 2), 'utf8').toString('base64');
  const body = { message, content: encoded };
  if (sha) body.sha = sha;
  const res = await fetch(`${apiBase}/contents/${filePath}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`${res.status} - ${err.message || res.statusText}`);
  }
  return res.json();
}

// ── Tests ─────────────────────────────────────────────────────────────────────

async function testAuth() {
  head('1. Testing authentication...');
  const res = await fetch(apiBase, { headers: authHeaders() });
  if (res.status === 401) { fail('Invalid token'); return false; }
  if (res.status === 404) { fail('Repository not found or no access'); return false; }
  if (!res.ok) { fail(`GitHub API error: ${res.status}`); return false; }
  const data = await res.json();
  ok(`Authenticated. Repo: ${data.full_name} (${data.private ? 'private' : 'public'})`);
  info(`Default branch: ${data.default_branch}`);
  return true;
}

async function testPull() {
  head('2. Testing pull (read all data files)...');
  const results = {};
  for (const file of DATA_FILES) {
    const path = `${DATA_DIR}/${file}`;
    try {
      const fetched = await fetchFile(path);
      if (fetched) {
        const key = file.replace('.json', '');
        const count = fetched.content[key]?.length ?? '?';
        ok(`${file} — ${count} record(s), SHA: ${fetched.sha.slice(0, 8)}…, size: ${fetched.size}B`);
        results[file] = fetched;
      } else {
        info(`${file} — not found in repo (will be created on first push)`);
        results[file] = null;
      }
    } catch (e) {
      fail(`${file} — ${e.message}`);
    }
  }
  return results;
}

async function testPush(pulledFiles) {
  head('3. Testing push (write test file)...');
  const testPath = `${DATA_DIR}/.sync-test`;
  const testContent = {
    _ettr_sync_test: true,
    timestamp: new Date().toISOString(),
    node: process.version,
  };

  // Get existing SHA if file exists
  let existingSha = null;
  try {
    const existing = await fetchFile(testPath);
    existingSha = existing?.sha || null;
    if (existingSha) info(`Test file exists (SHA: ${existingSha.slice(0, 8)}…), will update`);
  } catch {}

  try {
    const result = await writeFile(
      testPath,
      testContent,
      existingSha,
      `ETTR sync test - ${new Date().toISOString()}`
    );
    ok(`Wrote ${testPath} — new SHA: ${result.content.sha.slice(0, 8)}…`);
    return result.content.sha;
  } catch (e) {
    fail(`Push failed: ${e.message}`);
    return null;
  }
}

async function testRoundTrip(pulledFiles) {
  head('4. Testing round-trip (push loads.json, pull back, verify)...');
  const loadsFile = pulledFiles['loads.json'];
  if (!loadsFile) {
    info('loads.json not in repo yet — skipping round-trip test');
    return;
  }

  const original = loadsFile.content;
  const modified = {
    ...original,
    _sync_test_ts: new Date().toISOString(),
  };

  try {
    await writeFile(
      `${DATA_DIR}/loads.json`,
      modified,
      loadsFile.sha,
      `ETTR sync test (round-trip) - ${new Date().toISOString()}`
    );
    ok('Pushed modified loads.json');
  } catch (e) {
    fail(`Push failed: ${e.message}`);
    return;
  }

  // Pull back and verify
  try {
    const pulled = await fetchFile(`${DATA_DIR}/loads.json`);
    if (pulled?.content?._sync_test_ts === modified._sync_test_ts) {
      ok('Pull-back verified — data matches what was pushed');
    } else {
      fail('Pull-back mismatch — data differs from what was pushed');
    }
  } catch (e) {
    fail(`Pull-back failed: ${e.message}`);
    return;
  }

  // Restore original
  try {
    const current = await fetchFile(`${DATA_DIR}/loads.json`);
    const restored = { ...current.content };
    delete restored._sync_test_ts;
    await writeFile(
      `${DATA_DIR}/loads.json`,
      restored,
      current.sha,
      `ETTR sync test (restore) - ${new Date().toISOString()}`
    );
    ok('Restored loads.json to original state');
  } catch (e) {
    fail(`Restore failed: ${e.message}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nETTR GitHub Sync Test`);
  console.log(`Repo: ${owner}/${repo}`);
  console.log(`Token: ${token.slice(0, 8)}…`);

  try {
    const authOk = await testAuth();
    if (!authOk) process.exit(1);

    const pulled = await testPull();
    await testPush(pulled);
    await testRoundTrip(pulled);

    console.log('\n✓ All tests complete.\n');
  } catch (e) {
    console.error(`\nUnexpected error: ${e.message}`);
    process.exit(1);
  }
}

main();
