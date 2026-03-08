import { updateSha, getSha, saveLastSync } from './storage';

const DATA_FILES = ['loads.json', 'drivers.json', 'brokers.json', 'invoices.json'];

// Parse owner and repo from a GitHub URL
// Handles: https://github.com/owner/repo, github.com/owner/repo, owner/repo
const parseGitHubUrl = (url) => {
  const cleaned = url
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/^github\.com\//, '')
    .replace(/\.git$/, '')
    .replace(/\/$/, '');
  const parts = cleaned.split('/');
  if (parts.length < 2) return null;
  return { owner: parts[0], repo: parts[1] };
};

// Base64 encode/decode for GitHub API
const toBase64 = (str) => btoa(unescape(encodeURIComponent(str)));
const fromBase64 = (b64) => decodeURIComponent(escape(atob(b64)));

class GitHubSync {
  constructor(config) {
    const parsed = parseGitHubUrl(config.repoUrl || '');
    if (!parsed) throw new Error('Invalid GitHub repo URL');
    this.owner = parsed.owner;
    this.repo = parsed.repo;
    this.token = config.token;
    this.branch = config.branch || 'main';
    this.baseUrl = `https://api.github.com/repos/${this.owner}/${this.repo}`;
    this.headers = {
      Authorization: `token ${this.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github.v3+json',
    };
  }

  // ── Test connection ────────────────────────────────────────────────────
  async testConnection() {
    try {
      const res = await fetch(`${this.baseUrl}`, { headers: this.headers });
      if (res.status === 200) {
        const data = await res.json();
        return { ok: true, message: `Connected to ${data.full_name}` };
      }
      if (res.status === 401) {
        return { ok: false, message: 'Invalid token — check your Personal Access Token' };
      }
      if (res.status === 404) {
        return { ok: false, message: 'Repo not found — check the URL and your token has repo access' };
      }
      return { ok: false, message: `GitHub returned status ${res.status}` };
    } catch (e) {
      return { ok: false, message: `Network error: ${e.message}` };
    }
  }

  // ── Read a file from the repo ──────────────────────────────────────────
  // Returns { data: parsedObject, sha: string } or null if not found
  async readFile(filename) {
    try {
      const res = await fetch(
        `${this.baseUrl}/contents/ettr-data/${filename}?ref=${this.branch}`,
        { headers: this.headers }
      );
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`GitHub read failed: ${res.status}`);
      const file = await res.json();
      // Cache the SHA for subsequent writes
      updateSha(filename, file.sha);
      const content = fromBase64(file.content.replace(/\n/g, ''));
      return { data: JSON.parse(content), sha: file.sha };
    } catch (e) {
      console.error('[githubSync] readFile error:', filename, e);
      throw e;
    }
  }

  // ── Write (create or update) a file in the repo ────────────────────────
  async writeFile(filename, data, commitMessage) {
    const content = toBase64(JSON.stringify(data, null, 2));
    const sha = getSha(filename); // null = create new file

    const body = {
      message: commitMessage || `Update ${filename}`,
      content,
      branch: this.branch,
    };
    if (sha) body.sha = sha;

    try {
      const res = await fetch(`${this.baseUrl}/contents/ettr-data/${filename}`, {
        method: 'PUT',
        headers: this.headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `GitHub write failed: ${res.status}`);
      }
      const result = await res.json();
      // Update cached SHA to the new value
      updateSha(filename, result.content.sha);
      return { ok: true };
    } catch (e) {
      console.error('[githubSync] writeFile error:', filename, e);
      throw e;
    }
  }

  // ── Pull all data files from repo ──────────────────────────────────────
  // Returns { loads, drivers, brokers, invoices } — null values for missing files
  async pullAll(onProgress) {
    const result = {};
    for (let i = 0; i < DATA_FILES.length; i++) {
      const filename = DATA_FILES[i];
      onProgress && onProgress({ file: filename, index: i, total: DATA_FILES.length });
      try {
        const file = await this.readFile(filename);
        const key = filename.replace('.json', '');
        result[key] = file ? (Array.isArray(file.data[key]) ? file.data[key] : file.data) : null;
      } catch (e) {
        console.warn('[githubSync] Could not read', filename, e.message);
        const key = filename.replace('.json', '');
        result[key] = null;
      }
    }
    saveLastSync();
    return result;
  }

  // ── Push a single data file ────────────────────────────────────────────
  async pushFile(filename, data) {
    const key = filename.replace('.json', '');
    return this.writeFile(filename, { [key]: data }, `ETTR: update ${filename}`);
  }

  // ── Push multiple files (atomic commit via Git Trees API) ─────────────
  async pushAll(changedFiles) {
    if (changedFiles.length === 0) return { ok: true, errors: [] };

    try {
      // 1. Get HEAD commit SHA
      const refRes = await fetch(
        `${this.baseUrl}/git/refs/heads/${this.branch}`,
        { headers: this.headers }
      );
      if (!refRes.ok) throw new Error(`Get ref failed: ${refRes.status}`);
      const refData = await refRes.json();
      const headSha = refData.object.sha;

      // 2. Get base tree SHA from HEAD commit
      const commitRes = await fetch(
        `${this.baseUrl}/git/commits/${headSha}`,
        { headers: this.headers }
      );
      if (!commitRes.ok) throw new Error(`Get commit failed: ${commitRes.status}`);
      const commitData = await commitRes.json();
      const baseTreeSha = commitData.tree.sha;

      // 3. Create blobs for each file
      const treeItems = [];
      for (const { filename, data } of changedFiles) {
        const key = filename.replace('.json', '');
        const content = JSON.stringify({ [key]: data }, null, 2);
        const blobRes = await fetch(`${this.baseUrl}/git/blobs`, {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify({ content, encoding: 'utf-8' }),
        });
        if (!blobRes.ok) throw new Error(`Create blob failed for ${filename}: ${blobRes.status}`);
        const blobData = await blobRes.json();
        treeItems.push({
          path: `ettr-data/${filename}`,
          mode: '100644',
          type: 'blob',
          sha: blobData.sha,
        });
      }

      // 4. Create new tree
      const treeRes = await fetch(`${this.baseUrl}/git/trees`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems }),
      });
      if (!treeRes.ok) throw new Error(`Create tree failed: ${treeRes.status}`);
      const treeData = await treeRes.json();

      // 5. Create commit
      const fileList = changedFiles.map(f => f.filename).join(', ');
      const newCommitRes = await fetch(`${this.baseUrl}/git/commits`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          message: `ETTR: sync (${fileList})`,
          tree: treeData.sha,
          parents: [headSha],
        }),
      });
      if (!newCommitRes.ok) throw new Error(`Create commit failed: ${newCommitRes.status}`);
      const newCommitData = await newCommitRes.json();

      // 6. Update branch ref
      const patchRes = await fetch(
        `${this.baseUrl}/git/refs/heads/${this.branch}`,
        {
          method: 'PATCH',
          headers: this.headers,
          body: JSON.stringify({ sha: newCommitData.sha }),
        }
      );
      if (!patchRes.ok) throw new Error(`Update ref failed: ${patchRes.status}`);

      // Update cached SHAs by re-reading updated files
      for (const { filename } of changedFiles) {
        try { await this.readFile(filename); } catch (_) { /* ignore */ }
      }

      saveLastSync();
      return { ok: true, errors: [] };
    } catch (treeErr) {
      console.warn('[githubSync] Trees API failed, falling back to per-file push:', treeErr.message);
      // Fallback: per-file Contents API (one commit per file)
      const errors = [];
      for (const { filename, data } of changedFiles) {
        try {
          await this.pushFile(filename, data);
        } catch (e) {
          errors.push({ filename, error: e.message });
        }
      }
      if (errors.length === 0) saveLastSync();
      return { ok: errors.length === 0, errors };
    }
  }

  // ── Detect conflicts between local and remote arrays ──────────────────
  // Compares items by id and updatedAt timestamp.
  // Returns conflicts where both local and remote were modified since last sync.
  detectConflicts(localArray, remoteArray, lastSyncAt) {
    if (!localArray || !remoteArray) return { hasConflicts: false, conflicts: [] };
    const remoteMap = Object.fromEntries((remoteArray || []).map((item) => [item.id, item]));
    const conflicts = [];

    for (const localItem of localArray) {
      const remoteItem = remoteMap[localItem.id];
      if (!remoteItem) continue; // new local item, no conflict

      const localUpdated = new Date(localItem.updatedAt || 0).getTime();
      const remoteUpdated = new Date(remoteItem.updatedAt || 0).getTime();
      const lastSync = new Date(lastSyncAt || 0).getTime();

      // Conflict: both sides changed after last sync
      if (localUpdated > lastSync && remoteUpdated > lastSync && localUpdated !== remoteUpdated) {
        conflicts.push({
          id: localItem.id,
          local: localItem,
          remote: remoteItem,
          localUpdated: localItem.updatedAt,
          remoteUpdated: remoteItem.updatedAt,
        });
      }
    }

    return { hasConflicts: conflicts.length > 0, conflicts };
  }

  // ── Initialize repo with empty data files ─────────────────────────────
  // Creates the ettr-data/ files if they don't exist yet
  async initializeRepo(seedData = null) {
    const errors = [];
    for (const filename of DATA_FILES) {
      try {
        const existing = await this.readFile(filename);
        if (!existing) {
          // File doesn't exist — create it
          const key = filename.replace('.json', '');
          const initialData = seedData ? { [key]: seedData[key] || [] } : { [key]: [] };
          await this.writeFile(filename, initialData, `ETTR: initialize ${filename}`);
        }
      } catch (e) {
        errors.push({ filename, error: e.message });
      }
    }
    return { ok: errors.length === 0, errors };
  }
}

// ─── Factory ────────────────────────────────────────────────────────────────
export const createGitHubSync = (config) => {
  try {
    return new GitHubSync(config);
  } catch (e) {
    console.error('[githubSync] Failed to create sync instance:', e.message);
    return null;
  }
};

export default GitHubSync;
