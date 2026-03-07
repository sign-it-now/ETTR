// ─────────────────────────────────────────────────────────────────────────────
// GitHub API sync service
// Reads/writes JSON data files in the ettr-data/ folder of the configured repo
// ─────────────────────────────────────────────────────────────────────────────

import {
  queueSync,
  getSyncQueue,
  removeSyncQueueItem,
  saveLastSynced,
} from './storage';

const DATA_FILES = ['loads.json', 'drivers.json', 'brokers.json', 'invoices.json'];
const DATA_DIR = 'ettr-data';

// ── GitHub REST API helpers ───────────────────────────────────────────────────

function apiBase(owner, repo) {
  return `https://api.github.com/repos/${owner}/${repo}`;
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };
}

/**
 * Parse a GitHub repo URL into { owner, repo }.
 * Accepts: https://github.com/owner/repo  or  owner/repo
 */
export function parseRepoUrl(repoUrl) {
  const cleaned = repoUrl.trim().replace(/\.git$/, '');
  const match = cleaned.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (match) return { owner: match[1], repo: match[2] };
  const parts = cleaned.split('/').filter(Boolean);
  if (parts.length >= 2) return { owner: parts[parts.length - 2], repo: parts[parts.length - 1] };
  return null;
}

/**
 * Fetch a single file from GitHub and return { content (parsed JSON), sha }.
 * Returns null if file not found.
 */
async function fetchFile(owner, repo, token, filePath) {
  const url = `${apiBase(owner, repo)}/contents/${filePath}`;
  const res = await fetch(url, { headers: authHeaders(token) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub fetch failed: ${res.status} ${res.statusText}`);
  const data = await res.json();
  const decoded = atob(data.content.replace(/\n/g, ''));
  return { content: JSON.parse(decoded), sha: data.sha };
}

/**
 * Write a JSON file to GitHub (create or update).
 * Requires the current SHA if updating an existing file.
 */
async function writeFile(owner, repo, token, filePath, content, sha, message) {
  const url = `${apiBase(owner, repo)}/contents/${filePath}`;
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2))));
  const body = { message, content: encoded };
  if (sha) body.sha = sha;
  const res = await fetch(url, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`GitHub write failed: ${res.status} - ${err.message || res.statusText}`);
  }
  return res.json();
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Validate GitHub credentials and repo access.
 * Returns { valid: true } or { valid: false, error: string }
 */
export async function validateConfig(repoUrl, token) {
  const parsed = parseRepoUrl(repoUrl);
  if (!parsed) return { valid: false, error: 'Invalid repo URL format' };
  const { owner, repo } = parsed;
  try {
    const url = `${apiBase(owner, repo)}`;
    const res = await fetch(url, { headers: authHeaders(token) });
    if (res.status === 401) return { valid: false, error: 'Invalid token - check your GitHub PAT' };
    if (res.status === 404) return { valid: false, error: 'Repository not found or no access' };
    if (!res.ok) return { valid: false, error: `GitHub error: ${res.status}` };
    return { valid: true };
  } catch (e) {
    return { valid: false, error: 'Network error - check connection' };
  }
}

/**
 * Pull all data files from GitHub.
 * Returns { loads, drivers, brokers, invoices } or throws on error.
 */
export async function pullAll(config) {
  const { owner, repo } = parseRepoUrl(config.repoUrl);
  const token = config.token;
  const result = {};

  await Promise.all(
    DATA_FILES.map(async (file) => {
      const key = file.replace('.json', '');
      try {
        const fetched = await fetchFile(owner, repo, token, `${DATA_DIR}/${file}`);
        if (fetched) {
          result[key] = fetched.content[key] || [];
          result[`${key}_sha`] = fetched.sha;
        }
      } catch (e) {
        console.warn(`Failed to pull ${file}:`, e.message);
      }
    })
  );

  saveLastSynced();
  return result;
}

/**
 * Push a single data file to GitHub.
 * fileName: e.g. 'loads.json'
 * data: the full array (e.g. loads array)
 * sha: current SHA of the file on GitHub (or null to create)
 */
export async function pushFile(config, fileName, data, sha) {
  const { owner, repo } = parseRepoUrl(config.repoUrl);
  const token = config.token;
  const key = fileName.replace('.json', '');
  const filePath = `${DATA_DIR}/${fileName}`;
  const content = { [key]: data };
  const message = `ETTR: Update ${fileName} - ${new Date().toISOString()}`;

  // Get current SHA if not provided
  let currentSha = sha;
  if (!currentSha) {
    try {
      const current = await fetchFile(owner, repo, token, filePath);
      currentSha = current?.sha || null;
    } catch {}
  }

  return writeFile(owner, repo, token, filePath, content, currentSha, message);
}

/**
 * Process the offline sync queue - push all queued changes.
 * Returns { pushed: number, failed: number }
 */
export async function processQueue(config) {
  if (!config) return { pushed: 0, failed: 0 };
  const queue = getSyncQueue();
  if (!queue.length) return { pushed: 0, failed: 0 };

  let pushed = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      await pushFile(config, item.file, item.content, null);
      removeSyncQueueItem(item.file);
      pushed++;
    } catch (e) {
      console.warn(`Failed to push queued ${item.file}:`, e.message);
      failed++;
    }
  }

  return { pushed, failed };
}

/**
 * Check if the app is online.
 */
export function isOnline() {
  return navigator.onLine;
}

/**
 * Run full diagnostics: auth check, pull each file, test write.
 * Returns an array of result lines: { ok: bool, msg: string }
 */
export async function runDiagnostics(config) {
  const results = [];
  const log = (ok, msg) => results.push({ ok, msg });

  if (!config) { log(false, 'No GitHub config saved'); return results; }

  const parsed = parseRepoUrl(config.repoUrl);
  if (!parsed) { log(false, 'Invalid repo URL'); return results; }
  const { owner, repo } = parsed;
  const token = config.token;

  // 1. Auth
  try {
    const res = await fetch(`${apiBase(owner, repo)}`, { headers: authHeaders(token) });
    if (res.status === 401) { log(false, 'Auth failed — invalid token'); return results; }
    if (res.status === 404) { log(false, 'Repo not found or no access'); return results; }
    if (!res.ok) { log(false, `GitHub error: ${res.status}`); return results; }
    const data = await res.json();
    log(true, `Connected to ${data.full_name} (${data.private ? 'private' : 'public'})`);
  } catch (e) {
    log(false, `Network error: ${e.message}`);
    return results;
  }

  // 2. Pull each data file
  for (const file of DATA_FILES) {
    try {
      const fetched = await fetchFile(owner, repo, token, `${DATA_DIR}/${file}`);
      if (fetched) {
        const key = file.replace('.json', '');
        const count = Array.isArray(fetched.content[key]) ? fetched.content[key].length : '?';
        log(true, `Pull ${file} — ${count} record(s)`);
      } else {
        log(true, `Pull ${file} — not found (will be created on first save)`);
      }
    } catch (e) {
      log(false, `Pull ${file} failed: ${e.message}`);
    }
  }

  // 3. Test write (write then delete a marker file)
  const testPath = `${DATA_DIR}/.sync-test`;
  const testContent = { _ettr_sync_test: true, timestamp: new Date().toISOString() };
  try {
    // get existing sha if any
    let sha = null;
    try { sha = (await fetchFile(owner, repo, token, testPath))?.sha || null; } catch {}
    const written = await writeFile(owner, repo, token, testPath, testContent, sha, 'ETTR sync test');
    log(true, `Push test — wrote ${testPath} (SHA: ${written.content.sha.slice(0, 8)}…)`);
    // clean up: delete the test file
    try {
      const delRes = await fetch(`${apiBase(owner, repo)}/contents/${testPath}`, {
        method: 'DELETE',
        headers: authHeaders(token),
        body: JSON.stringify({ message: 'ETTR sync test cleanup', sha: written.content.sha }),
      });
      if (delRes.ok) log(true, 'Push test — cleaned up test file');
    } catch {}
  } catch (e) {
    log(false, `Push test failed: ${e.message}`);
  }

  return results;
}

/**
 * Push data immediately if online, otherwise queue for later.
 * fileName: e.g. 'loads.json'
 * data: the array to store
 * config: github config object
 * sha: current file SHA (optional)
 */
export async function syncOrQueue(config, fileName, data, sha) {
  if (!config) return { status: 'no_config' };

  if (!isOnline()) {
    queueSync(fileName, data);
    return { status: 'queued' };
  }

  try {
    await pushFile(config, fileName, data, sha);
    return { status: 'synced' };
  } catch (e) {
    queueSync(fileName, data);
    return { status: 'queued', error: e.message };
  }
}
