import { useState } from 'react';
import { useData } from '../context/DataContext';
import { saveGithubConfig } from '../services/storage';
import { validateConfig, parseRepoUrl } from '../services/githubSync';

function Section({ title, children }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="text-xs text-slate-500 uppercase tracking-wider mb-4">{title}</div>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="mb-3">
      <label className="block text-xs text-slate-500 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, ...props }) {
  return (
    <input
      value={value}
      onChange={onChange}
      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
      {...props}
    />
  );
}

export default function SettingsScreen({ nav }) {
  const { drivers, brokers, addDriver, updateDriver, addBroker, deleteBroker,
          logout, saveConfig, githubConfig, pullFromGitHub, currentUser } = useData();

  // GitHub settings
  const [repoUrl, setRepoUrl] = useState(githubConfig?.repoUrl || '');
  const [token, setToken] = useState(githubConfig?.token || '');
  const [showToken, setShowToken] = useState(false);
  const [configMsg, setConfigMsg] = useState('');
  const [configLoading, setConfigLoading] = useState(false);

  // Driver management
  const [addingDriver, setAddingDriver] = useState(false);
  const [newDriver, setNewDriver] = useState({ name: '', email: '', phone: '', role: 'driver' });

  // Broker management
  const [addingBroker, setAddingBroker] = useState(false);
  const [newBroker, setNewBroker] = useState({ companyName: '', contactName: '', email: '', phone: '', paymentTerms: 'Net 30', address: '' });

  async function handleSaveConfig() {
    setConfigMsg('');
    if (!repoUrl || !token) { setConfigMsg('Both fields required'); return; }
    const parsed = parseRepoUrl(repoUrl);
    if (!parsed) { setConfigMsg('Invalid repo URL'); return; }
    setConfigLoading(true);
    const result = await validateConfig(repoUrl, token);
    setConfigLoading(false);
    if (!result.valid) { setConfigMsg(result.error); return; }
    const config = { repoUrl, token, owner: parsed.owner, repo: parsed.repo };
    saveGithubConfig(config);
    saveConfig(config);
    setConfigMsg('Saved! Syncing...');
    pullFromGitHub();
  }

  async function handleAddDriver() {
    if (!newDriver.name) return;
    await addDriver(newDriver);
    setNewDriver({ name: '', email: '', phone: '', role: 'driver' });
    setAddingDriver(false);
  }

  async function handleToggleDriver(id, current) {
    await updateDriver(id, { isActive: !current });
  }

  async function handleAddBroker() {
    if (!newBroker.companyName) return;
    await addBroker(newBroker);
    setNewBroker({ companyName: '', contactName: '', email: '', phone: '', paymentTerms: 'Net 30', address: '' });
    setAddingBroker(false);
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-slate-950/95 backdrop-blur border-b border-slate-800 px-4 py-3 z-40">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => nav('dashboard')} className="text-slate-400 hover:text-white text-xl leading-none">
            &#8592;
          </button>
          <span className="font-bold text-white">Settings</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* User info */}
        <Section title="Current User">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold">
              {currentUser?.name?.charAt(0)}
            </div>
            <div>
              <div className="text-white font-semibold text-sm">{currentUser?.name}</div>
              <div className="text-slate-500 text-xs capitalize">{currentUser?.role}</div>
            </div>
            <button
              onClick={() => { logout(); nav('dashboard'); }}
              className="ml-auto text-xs text-red-400 hover:text-red-300 bg-red-900/20 px-3 py-1.5 rounded-lg"
            >
              Sign Out
            </button>
          </div>
        </Section>

        {/* GitHub Config */}
        <Section title="GitHub Repository">
          <Field label="Repository URL">
            <Input
              type="url"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
            />
          </Field>
          <Field label="Personal Access Token">
            <div className="relative">
              <Input
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxx"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs"
              >
                {showToken ? 'Hide' : 'Show'}
              </button>
            </div>
          </Field>
          {configMsg && (
            <div className={`text-xs px-3 py-2 rounded-lg mb-3 ${configMsg.includes('Saved') ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400'}`}>
              {configMsg}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleSaveConfig}
              disabled={configLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold py-2.5 rounded-xl"
            >
              {configLoading ? 'Testing...' : 'Save & Connect'}
            </button>
            <button
              onClick={pullFromGitHub}
              className="bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl"
            >
              Pull Now
            </button>
          </div>
        </Section>

        {/* Drivers */}
        <Section title="Drivers">
          {drivers.map((d) => (
            <div key={d.id} className="flex items-center justify-between py-2.5 border-b border-slate-800 last:border-0">
              <div>
                <div className="text-sm font-medium text-white">{d.name}</div>
                <div className="text-xs text-slate-500">{d.email} {d.role === 'admin' ? '· Admin' : ''}</div>
              </div>
              <button
                onClick={() => handleToggleDriver(d.id, d.isActive)}
                className={`text-xs px-3 py-1 rounded-full font-semibold ${d.isActive ? 'bg-emerald-900/30 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}
              >
                {d.isActive ? 'Active' : 'Inactive'}
              </button>
            </div>
          ))}

          {addingDriver ? (
            <div className="mt-3 space-y-2">
              <Input value={newDriver.name} onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })} placeholder="Full name *" />
              <Input type="email" value={newDriver.email} onChange={(e) => setNewDriver({ ...newDriver, email: e.target.value })} placeholder="Email" />
              <Input type="tel" value={newDriver.phone} onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })} placeholder="Phone" />
              <select
                value={newDriver.role}
                onChange={(e) => setNewDriver({ ...newDriver, role: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
              >
                <option value="driver">Driver</option>
                <option value="admin">Admin</option>
              </select>
              <div className="flex gap-2">
                <button onClick={handleAddDriver} className="flex-1 bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-xl">Add</button>
                <button onClick={() => setAddingDriver(false)} className="flex-1 bg-slate-700 text-white text-sm font-semibold py-2.5 rounded-xl">Cancel</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingDriver(true)}
              className="w-full mt-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold py-2.5 rounded-xl transition-colors"
            >
              + Add Driver
            </button>
          )}
        </Section>

        {/* Brokers */}
        <Section title="Brokers">
          {brokers.map((b) => (
            <div key={b.id} className="flex items-center justify-between py-2.5 border-b border-slate-800 last:border-0">
              <div>
                <div className="text-sm font-medium text-white">{b.companyName}</div>
                <div className="text-xs text-slate-500">{b.contactName} · {b.paymentTerms}</div>
              </div>
              <button
                onClick={() => deleteBroker(b.id)}
                className="text-xs text-red-400 hover:text-red-300 px-2 py-1"
              >
                Remove
              </button>
            </div>
          ))}

          {addingBroker ? (
            <div className="mt-3 space-y-2">
              <Input value={newBroker.companyName} onChange={(e) => setNewBroker({ ...newBroker, companyName: e.target.value })} placeholder="Company name *" />
              <Input value={newBroker.contactName} onChange={(e) => setNewBroker({ ...newBroker, contactName: e.target.value })} placeholder="Contact name" />
              <Input type="email" value={newBroker.email} onChange={(e) => setNewBroker({ ...newBroker, email: e.target.value })} placeholder="Email" />
              <Input type="tel" value={newBroker.phone} onChange={(e) => setNewBroker({ ...newBroker, phone: e.target.value })} placeholder="Phone" />
              <Input value={newBroker.paymentTerms} onChange={(e) => setNewBroker({ ...newBroker, paymentTerms: e.target.value })} placeholder="Payment terms" />
              <Input value={newBroker.address} onChange={(e) => setNewBroker({ ...newBroker, address: e.target.value })} placeholder="Address" />
              <div className="flex gap-2">
                <button onClick={handleAddBroker} className="flex-1 bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-xl">Add</button>
                <button onClick={() => setAddingBroker(false)} className="flex-1 bg-slate-700 text-white text-sm font-semibold py-2.5 rounded-xl">Cancel</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingBroker(true)}
              className="w-full mt-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold py-2.5 rounded-xl transition-colors"
            >
              + Add Broker
            </button>
          )}
        </Section>

        {/* About */}
        <Section title="About">
          <div className="text-sm text-slate-400">
            <div className="flex justify-between py-1.5"><span>Version</span><span className="text-white">1.0.0</span></div>
            <div className="flex justify-between py-1.5"><span>App</span><span className="text-white">ETTR Load Management</span></div>
            <div className="flex justify-between py-1.5"><span>Data Storage</span><span className="text-white">GitHub + localStorage</span></div>
          </div>
        </Section>
      </div>
    </div>
  );
}
