import { useState } from 'react';
import { useData } from '../context/DataContext';

export default function LoginScreen({ onLogin }) {
  const { drivers, login } = useData();
  const [role, setRole] = useState('admin');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [error, setError] = useState('');

  const adminDrivers = drivers.filter((d) => d.role === 'admin' && d.isActive);
  const regularDrivers = drivers.filter((d) => d.role !== 'admin' && d.isActive);

  function handleLogin() {
    setError('');
    if (role === 'admin') {
      if (!selectedDriverId) { setError('Select who you are'); return; }
      const driver = drivers.find((d) => d.id === selectedDriverId);
      if (!driver) { setError('User not found'); return; }
      login({ ...driver, role: 'admin' });
      onLogin();
    } else {
      if (!selectedDriverId) { setError('Select your name'); return; }
      const driver = drivers.find((d) => d.id === selectedDriverId);
      if (!driver) { setError('Driver not found'); return; }
      login({ ...driver, role: 'driver' });
      onLogin();
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-4xl font-black text-white tracking-tight">ETTR</div>
          <div className="text-slate-400 text-sm mt-1">Load Management</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">Who's using the app?</h2>

          {/* Role selection */}
          <div className="grid grid-cols-2 gap-2 mb-5">
            <button
              onClick={() => { setRole('admin'); setSelectedDriverId(''); }}
              className={`py-3 rounded-xl font-semibold text-sm transition-colors ${
                role === 'admin'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Admin
            </button>
            <button
              onClick={() => { setRole('driver'); setSelectedDriverId(''); }}
              className={`py-3 rounded-xl font-semibold text-sm transition-colors ${
                role === 'driver'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Driver
            </button>
          </div>

          {/* User list */}
          <div className="space-y-2 mb-5">
            {(role === 'admin' ? adminDrivers : regularDrivers).map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedDriverId(d.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${
                  selectedDriverId === d.id
                    ? 'bg-blue-600/20 border border-blue-500/50'
                    : 'bg-slate-800 hover:bg-slate-700 border border-transparent'
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-white shrink-0">
                  {d.name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{d.name}</div>
                  {d.email && <div className="text-xs text-slate-400">{d.email}</div>}
                </div>
                {selectedDriverId === d.id && (
                  <div className="ml-auto text-blue-400 text-lg">✓</div>
                )}
              </button>
            ))}

            {(role === 'admin' ? adminDrivers : regularDrivers).length === 0 && (
              <div className="text-center text-slate-500 text-sm py-4">
                {role === 'admin'
                  ? 'No admins found. Pull data from GitHub first.'
                  : 'No drivers found. An admin needs to add drivers.'}
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-700/50 text-red-400 text-sm rounded-xl px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
