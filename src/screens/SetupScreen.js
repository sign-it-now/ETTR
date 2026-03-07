import { useState } from 'react';
import { saveGithubConfig } from '../services/storage';
import { validateConfig, parseRepoUrl } from '../services/githubSync';
import { useData } from '../context/DataContext';

export default function SetupScreen({ onComplete }) {
  const { saveConfig } = useData();
  const [repoUrl, setRepoUrl] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showToken, setShowToken] = useState(false);

  async function handleSave() {
    setError('');
    if (!repoUrl.trim()) { setError('Repository URL is required'); return; }
    if (!token.trim()) { setError('GitHub token is required'); return; }

    const parsed = parseRepoUrl(repoUrl);
    if (!parsed) { setError('Invalid repo URL. Use: https://github.com/owner/repo'); return; }

    setLoading(true);
    const result = await validateConfig(repoUrl, token);
    setLoading(false);

    if (!result.valid) {
      setError(result.error);
      return;
    }

    const config = { repoUrl: repoUrl.trim(), token: token.trim(), owner: parsed.owner, repo: parsed.repo };
    saveGithubConfig(config);
    saveConfig(config);
    onComplete();
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-4xl font-black text-white tracking-tight">ETTR</div>
          <div className="text-slate-400 text-sm mt-1">Load Management</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-1">First-Time Setup</h2>
          <p className="text-slate-400 text-sm mb-6">
            Connect your GitHub repository to store load data. This is a one-time setup.
          </p>

          {/* Repo URL */}
          <div className="mb-4">
            <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">
              GitHub Repository URL
            </label>
            <input
              type="url"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/your-org/ettr-data"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
              autoComplete="off"
            />
          </div>

          {/* Token */}
          <div className="mb-2">
            <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">
              Personal Access Token
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 pr-12 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs"
              >
                {showToken ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-500 mb-6">
            Token needs <strong className="text-slate-400">repo</strong> scope.
            Create at: GitHub → Settings → Developer settings → Personal access tokens
          </p>

          {error && (
            <div className="bg-red-900/30 border border-red-700/50 text-red-400 text-sm rounded-xl px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors"
          >
            {loading ? 'Connecting...' : 'Connect Repository'}
          </button>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          Your token is stored only on this device, never sent to any server.
        </p>
      </div>
    </div>
  );
}
