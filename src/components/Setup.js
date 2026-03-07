import React, { useState } from 'react';
import { createGitHubSync } from '../services/githubSync';
import { saveConfig, saveCurrentUser, initializeIfEmpty } from '../services/storage';
import { SEED_DATA } from '../data/seedData';

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0f172a',
    color: '#e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px 16px 48px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  logo: {
    fontSize: '28px',
    fontWeight: '800',
    color: '#38bdf8',
    letterSpacing: '-0.5px',
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '13px',
    color: '#64748b',
    marginBottom: '32px',
  },
  card: {
    background: '#1e293b',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '16px',
    width: '100%',
    maxWidth: '440px',
    border: '1px solid #334155',
  },
  cardTitle: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    color: '#94a3b8',
    marginBottom: '6px',
    marginTop: '12px',
  },
  input: {
    width: '100%',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#e2e8f0',
    padding: '10px 12px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#e2e8f0',
    padding: '10px 12px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    appearance: 'none',
  },
  btnPrimary: {
    width: '100%',
    maxWidth: '440px',
    background: '#0284c7',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    padding: '14px',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '8px',
  },
  btnSecondary: {
    background: '#1e3a5f',
    color: '#38bdf8',
    border: '1px solid #1e40af',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '12px',
    cursor: 'pointer',
    marginTop: '8px',
  },
  guide: {
    background: '#0f172a',
    borderRadius: '8px',
    padding: '12px 14px',
    marginTop: '10px',
    fontSize: '13px',
    color: '#94a3b8',
    lineHeight: '1.6',
    border: '1px solid #1e293b',
  },
  guideStep: {
    marginBottom: '6px',
    paddingLeft: '4px',
  },
  statusMsg: (ok) => ({
    marginTop: '8px',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    background: ok ? '#14532d' : '#450a0a',
    color: ok ? '#86efac' : '#fca5a5',
    border: `1px solid ${ok ? '#166534' : '#7f1d1d'}`,
  }),
  hint: {
    fontSize: '12px',
    color: '#475569',
    marginTop: '6px',
  },
  toggleGuide: {
    background: 'none',
    border: 'none',
    color: '#38bdf8',
    fontSize: '12px',
    cursor: 'pointer',
    padding: '0',
    marginTop: '8px',
  },
};

const Setup = ({ onComplete }) => {
  const [repoUrl, setRepoUrl] = useState('');
  const [token, setToken] = useState('');
  const [claudeKey, setClaudeKey] = useState('');
  const [selectedUser, setSelectedUser] = useState('user-tim');
  const [testStatus, setTestStatus] = useState(null); // { ok, message }
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showTokenGuide, setShowTokenGuide] = useState(false);
  const [error, setError] = useState('');

  const handleTestConnection = async () => {
    if (!repoUrl.trim() || !token.trim()) {
      setTestStatus({ ok: false, message: 'Enter both the repo URL and token first' });
      return;
    }
    setTesting(true);
    setTestStatus(null);
    try {
      const sync = createGitHubSync({ repoUrl, token });
      if (!sync) {
        setTestStatus({ ok: false, message: 'Invalid repo URL format' });
        return;
      }
      const result = await sync.testConnection();
      setTestStatus(result);
    } catch (e) {
      setTestStatus({ ok: false, message: e.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!repoUrl.trim() || !token.trim()) {
      setError('GitHub repo URL and token are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const config = { repoUrl: repoUrl.trim(), token: token.trim(), branch: 'main' };
      const user = SEED_DATA.users.find((u) => u.id === selectedUser) || SEED_DATA.users[0];

      // Initialize the repo (create data files if missing)
      const sync = createGitHubSync(config);
      if (sync) {
        const initResult = await sync.initializeRepo(SEED_DATA);
        if (!initResult.ok && initResult.errors.length > 0) {
          // Non-fatal — warn but proceed
          console.warn('[Setup] Some repo files could not be initialized:', initResult.errors);
        }
      }

      // Save config + user to localStorage
      saveConfig({ ...config, claudeApiKey: claudeKey.trim() });
      saveCurrentUser(user);
      initializeIfEmpty();

      onComplete();
    } catch (e) {
      setError(`Setup failed: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const userOptions = SEED_DATA.users.map((u) => ({
    value: u.id,
    label: `${u.name} (${u.role === 'admin' ? 'Admin' : 'Driver'})`,
  }));

  return (
    <div style={styles.page}>
      {/* Logo */}
      <div style={styles.logo}>🚛 ETTR</div>
      <div style={styles.subtitle}>Fleet Management — First-time Setup</div>

      {/* ── GitHub Data Repo ── */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>
          <span>🗄️</span> GitHub Data Repo
        </div>
        <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 4px' }}>
          All your load data is stored as JSON files in a GitHub repo you own.
          No monthly fees, no third-party control.
        </p>

        <button style={styles.toggleGuide} onClick={() => setShowGuide(!showGuide)}>
          {showGuide ? '▲ Hide setup guide' : '▼ How to create your data repo'}
        </button>

        {showGuide && (
          <div style={styles.guide}>
            <div style={styles.guideStep}>1. Go to <strong>github.com</strong> and click <strong>New repository</strong></div>
            <div style={styles.guideStep}>2. Name it <code style={{ background: '#1e293b', padding: '1px 5px', borderRadius: '3px' }}>ettr-data</code> (or any name you like)</div>
            <div style={styles.guideStep}>3. Set it to <strong>Private</strong> (recommended)</div>
            <div style={styles.guideStep}>4. Check <strong>Add a README file</strong> then click Create</div>
            <div style={styles.guideStep}>5. Copy the repo URL and paste it below</div>
          </div>
        )}

        <label style={styles.label}>Repo URL</label>
        <input
          style={styles.input}
          type="text"
          placeholder="https://github.com/your-name/ettr-data"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />

        <button style={styles.toggleGuide} onClick={() => setShowTokenGuide(!showTokenGuide)}>
          {showTokenGuide ? '▲ Hide token guide' : '▼ How to get a Personal Access Token'}
        </button>

        {showTokenGuide && (
          <div style={styles.guide}>
            <div style={styles.guideStep}>1. Go to <strong>GitHub → Settings → Developer settings</strong></div>
            <div style={styles.guideStep}>2. Click <strong>Personal access tokens → Tokens (classic)</strong></div>
            <div style={styles.guideStep}>3. Click <strong>Generate new token (classic)</strong></div>
            <div style={styles.guideStep}>4. Give it a name like "ETTR App"</div>
            <div style={styles.guideStep}>5. Under <strong>Scopes</strong>, check <strong>repo</strong> (full repo access)</div>
            <div style={styles.guideStep}>6. Click <strong>Generate token</strong> and copy it below</div>
          </div>
        )}

        <label style={styles.label}>Personal Access Token</label>
        <input
          style={styles.input}
          type="password"
          placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <div style={styles.hint}>Stored locally on this device only. Never sent anywhere except GitHub.</div>

        <button
          style={{ ...styles.btnSecondary, display: 'block', marginTop: '12px' }}
          onClick={handleTestConnection}
          disabled={testing}
        >
          {testing ? 'Testing...' : '🔌 Test Connection'}
        </button>

        {testStatus && (
          <div style={styles.statusMsg(testStatus.ok)}>
            {testStatus.ok ? '✓ ' : '✗ '}{testStatus.message}
          </div>
        )}
      </div>

      {/* ── Claude API Key ── */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>
          <span>🔍</span> Claude API Key
        </div>
        <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 8px' }}>
          Used to automatically extract details from rate confirmation photos and PDFs.
          Optional — you can still enter load details manually without it.
        </p>
        <label style={styles.label}>API Key</label>
        <input
          style={styles.input}
          type="password"
          placeholder="sk-ant-xxxxxxxxxxxx"
          value={claudeKey}
          onChange={(e) => setClaudeKey(e.target.value)}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <div style={styles.hint}>
          Get a key at console.anthropic.com. Stored locally on this device only.
        </div>
      </div>

      {/* ── Your Profile ── */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>
          <span>👤</span> Your Profile
        </div>
        <label style={styles.label}>Who are you?</label>
        <select
          style={styles.select}
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
        >
          {userOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <div style={styles.hint}>
          Admins (Tim &amp; Bruce) can see all loads and manage invoices.
          Drivers see only their assigned loads.
        </div>
      </div>

      {/* ── Save button ── */}
      {error && (
        <div style={{ ...styles.statusMsg(false), maxWidth: '440px', width: '100%', marginBottom: '8px' }}>
          ✗ {error}
        </div>
      )}
      <button
        style={{
          ...styles.btnPrimary,
          opacity: saving ? 0.7 : 1,
          cursor: saving ? 'not-allowed' : 'pointer',
        }}
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Setting up...' : '🚛 Save & Start'}
      </button>

      <p style={{ fontSize: '12px', color: '#475569', marginTop: '20px', textAlign: 'center', maxWidth: '340px' }}>
        Your settings are stored on this device only. Each device (phone, computer) needs to be set up once.
      </p>
    </div>
  );
};

export default Setup;
