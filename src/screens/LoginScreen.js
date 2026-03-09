import { useState, useCallback } from 'react';
import { getDrivers, saveCurrentUser, getConfig } from '../services/storage';

// ── Load Google Identity Services script dynamically ─────────────────────────
function loadGIS() {
  return new Promise((resolve) => {
    if (window.google?.accounts) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = resolve;
    s.onerror = () => resolve(); // resolve anyway so caller can handle
    document.head.appendChild(s);
  });
}

// ── Load Apple Sign-In SDK dynamically ───────────────────────────────────────
function loadAppleSDK() {
  return new Promise((resolve) => {
    if (window.AppleID) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
    s.async = true;
    s.defer = true;
    s.onload = resolve;
    s.onerror = () => resolve();
    document.head.appendChild(s);
  });
}

// ── Decode a JWT payload (for Google credential) ─────────────────────────────
function decodeJWT(token) {
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export default function LoginScreen({ onLogin }) {
  const config        = getConfig() || {};
  const allDrivers    = getDrivers();
  const googleClientId = config.googleClientId || '';
  const appleServiceId = config.appleServiceId || '';
  const hasOAuth      = googleClientId || appleServiceId;

  const [role, setRole]               = useState('admin');
  const [selectedId, setSelectedId]   = useState('');
  const [error, setError]             = useState('');
  const [oauthLoading, setOauthLoading] = useState(''); // '' | 'google' | 'apple'

  const active   = allDrivers.filter((d) => d.isActive);
  const admins   = active.filter((d) => d.role === 'admin');
  const drivers  = active.filter((d) => d.role !== 'admin');
  const shown    = role === 'admin' ? admins : drivers;

  // ── Find driver by email and log them in ─────────────────────────────────
  const loginByEmail = useCallback((email) => {
    const norm = (email || '').toLowerCase().trim();
    const match = active.find((d) => (d.email || '').toLowerCase().trim() === norm);
    if (!match) {
      setError(
        `No account found for ${email}.\n` +
        `Ask your admin to add this email address to your driver profile in Settings.`
      );
      setOauthLoading('');
      return;
    }
    saveCurrentUser(match);
    onLogin();
  }, [active, onLogin]);

  // ── Google Sign-In ────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    if (!googleClientId) {
      setError('Google Sign-In is not configured. Ask your admin to add a Google Client ID in Settings → Sign-In.');
      return;
    }
    setError('');
    setOauthLoading('google');
    try {
      await loadGIS();
      if (!window.google?.accounts?.id) {
        setError('Google Sign-In failed to load. Check your connection and try again.');
        setOauthLoading('');
        return;
      }
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response) => {
          const payload = decodeJWT(response.credential);
          if (!payload?.email) {
            setError('No email returned from Google. Try again.');
            setOauthLoading('');
            return;
          }
          loginByEmail(payload.email);
        },
        cancel_on_tap_outside: false,
      });
      // Try One Tap first; fall back to popup if One Tap is suppressed
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // Render a popup button instead
          const container = document.getElementById('gis-fallback');
          if (container) {
            container.style.display = 'flex';
            container.style.justifyContent = 'center';
            window.google.accounts.id.renderButton(container, {
              theme: 'filled_black',
              size: 'large',
              width: 320,
              text: 'continue_with',
            });
          }
          setOauthLoading('');
        }
      });
    } catch {
      setError('Google Sign-In failed. Try again or sign in manually below.');
      setOauthLoading('');
    }
  };

  // ── Apple Sign-In ─────────────────────────────────────────────────────────
  const handleApple = async () => {
    if (!appleServiceId) {
      setError('Apple Sign-In is not configured. Ask your admin to add an Apple Service ID in Settings → Sign-In.');
      return;
    }
    setError('');
    setOauthLoading('apple');
    try {
      await loadAppleSDK();
      if (!window.AppleID) {
        setError('Apple Sign-In failed to load. Check your connection and try again.');
        setOauthLoading('');
        return;
      }
      window.AppleID.auth.init({
        clientId: appleServiceId,
        scope: 'name email',
        redirectURI: window.location.origin + window.location.pathname,
        usePopup: true,
      });
      const response = await window.AppleID.auth.signIn();
      setOauthLoading('');
      // Email is only returned on first sign-in; subsequent uses return no email
      const idToken   = response?.authorization?.id_token;
      const payload   = idToken ? decodeJWT(idToken) : null;
      const email     = payload?.email || response?.user?.email;
      if (!email) {
        setError(
          'Apple did not return an email address.\n' +
          'This happens on repeat sign-ins — sign in manually below or ask your admin.'
        );
        return;
      }
      loginByEmail(email);
    } catch (e) {
      setOauthLoading('');
      if (e?.error !== 'popup_closed_by_user') {
        setError('Apple Sign-In failed. Try again or sign in manually below.');
      }
    }
  };

  // ── Manual sign-in ────────────────────────────────────────────────────────
  const handleManual = () => {
    setError('');
    if (!selectedId) { setError('Select your name to continue.'); return; }
    const user = allDrivers.find((d) => d.id === selectedId);
    if (!user) { setError('User not found.'); return; }
    saveCurrentUser(user);
    onLogin();
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f172a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px 16px 48px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: '360px' }}>

        {/* ── ETTR branding ── */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            fontSize: '44px', fontWeight: '900', color: '#fff',
            letterSpacing: '-0.04em', lineHeight: 1,
          }}>
            ETTR
          </div>
          <div style={{ fontSize: '13px', color: '#475569', marginTop: '6px', letterSpacing: '0.04em' }}>
            FLEET MANAGEMENT
          </div>
        </div>

        {/* ── OAuth buttons ── */}
        {hasOAuth && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>

            {googleClientId && (
              <button
                onClick={handleGoogle}
                disabled={oauthLoading !== ''}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  background: '#fff', border: 'none', borderRadius: '12px', padding: '14px 20px',
                  color: '#1e293b', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                  width: '100%', transition: 'opacity 0.15s',
                  opacity: oauthLoading !== '' ? 0.6 : 1,
                }}
              >
                {oauthLoading === 'google' ? (
                  <span style={{ color: '#64748b', fontSize: '13px' }}>Connecting…</span>
                ) : (
                  <>
                    {/* Google logo */}
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.074 17.64 11.767 17.64 9.2z"/>
                      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>
            )}

            {/* GIS fallback container (shown only when One Tap is suppressed) */}
            <div id="gis-fallback" style={{ display: 'none', marginTop: '-4px' }} />

            {appleServiceId && (
              <button
                onClick={handleApple}
                disabled={oauthLoading !== ''}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  background: '#000', border: '1px solid #1e293b', borderRadius: '12px',
                  padding: '14px 20px', color: '#fff', fontSize: '14px', fontWeight: '600',
                  cursor: 'pointer', width: '100%', transition: 'opacity 0.15s',
                  opacity: oauthLoading !== '' ? 0.6 : 1,
                }}
              >
                {oauthLoading === 'apple' ? (
                  <span style={{ color: '#94a3b8', fontSize: '13px' }}>Connecting…</span>
                ) : (
                  <>
                    {/* Apple logo */}
                    <svg width="15" height="18" viewBox="0 0 14 17" fill="white">
                      <path d="M13.4 13.1c-.3.7-.6 1.3-1 1.9-.5.8-.9 1.3-1.2 1.6-.5.5-1 .7-1.6.7-.4 0-.9-.1-1.4-.4-.5-.2-1-.4-1.4-.4-.5 0-1 .1-1.4.4-.5.2-.9.4-1.3.4-.6 0-1.1-.2-1.6-.7-.4-.3-.8-.9-1.3-1.6C1 14 .6 13.3.3 12.4 0 11.4 0 10.5 0 9.6c0-1 .2-1.9.7-2.7.4-.6.9-1.1 1.5-1.5.6-.3 1.3-.5 2-.5.4 0 .9.1 1.5.4.6.2 1 .4 1.2.4.2 0 .6-.1 1.3-.4.7-.3 1.2-.4 1.7-.3 1.3.1 2.2.6 2.8 1.6-.4.3-.8.6-1.1 1.1-.3.5-.4 1-.4 1.6 0 .7.2 1.3.6 1.8.4.5.8.8 1.3 1l-.1.5zM9.9 0c0 .5-.2 1-.5 1.5-.4.5-.8.9-1.4 1.2-.5.3-1.1.4-1.5.4V2.7c0-.5.1-1 .4-1.5.3-.5.7-.9 1.2-1.2C8.6.5 9.1.3 9.7.2l.2-.2z"/>
                    </svg>
                    Continue with Apple
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* ── Login card ── */}
        <div style={{
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '16px',
          padding: '20px',
        }}>
          {/* Divider */}
          {hasOAuth && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ flex: 1, height: '1px', background: '#334155' }} />
              <span style={{ fontSize: '11px', color: '#475569', fontWeight: '500', whiteSpace: 'nowrap' }}>
                or sign in manually
              </span>
              <div style={{ flex: 1, height: '1px', background: '#334155' }} />
            </div>
          )}

          {/* Role tabs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '14px' }}>
            {[
              { key: 'admin',  label: '🔑 Admin'  },
              { key: 'driver', label: '🚛 Driver' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => { setRole(key); setSelectedId(''); setError(''); }}
                style={{
                  padding: '10px 6px', borderRadius: '10px', border: 'none',
                  background: role === key ? '#0284c7' : '#0f172a',
                  color: role === key ? '#fff' : '#64748b',
                  fontWeight: '600', fontSize: '13px', cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* User list */}
          <div style={{
            maxHeight: '220px', overflowY: 'auto',
            display: 'flex', flexDirection: 'column', gap: '6px',
            marginBottom: '14px',
          }}>
            {shown.map((d) => (
              <button
                key={d.id}
                onClick={() => { setSelectedId(d.id); setError(''); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 12px', borderRadius: '10px',
                  border: selectedId === d.id ? '1px solid #38bdf8' : '1px solid transparent',
                  background: selectedId === d.id ? 'rgba(56,189,248,0.08)' : '#0f172a',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <div style={{
                  width: '34px', height: '34px', borderRadius: '50%',
                  background: '#334155', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '13px', fontWeight: '700',
                  color: '#38bdf8', flexShrink: 0,
                }}>
                  {(d.name || '?').charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0' }}>{d.name}</div>
                  {d.email && (
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.email}
                    </div>
                  )}
                </div>
                {selectedId === d.id && (
                  <span style={{ color: '#38bdf8', fontSize: '16px', flexShrink: 0 }}>✓</span>
                )}
              </button>
            ))}

            {shown.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', fontSize: '13px', color: '#475569' }}>
                {role === 'admin'
                  ? 'No admins configured yet.'
                  : 'No drivers found. An admin needs to add drivers in Settings.'}
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: '10px',
              padding: '10px 12px',
              color: '#fca5a5',
              fontSize: '12px',
              marginBottom: '12px',
              lineHeight: 1.6,
              whiteSpace: 'pre-line',
            }}>
              {error}
            </div>
          )}

          {/* Sign In button */}
          <button
            onClick={handleManual}
            disabled={!selectedId}
            style={{
              width: '100%', padding: '14px', borderRadius: '10px', border: 'none',
              background: selectedId ? '#0284c7' : '#0f172a',
              color: selectedId ? '#fff' : '#334155',
              fontWeight: '700', fontSize: '14px',
              cursor: selectedId ? 'pointer' : 'not-allowed',
            }}
          >
            Sign In
          </button>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '11px', color: '#1e293b' }}>
          ETTR · Carrier Operations
        </div>

      </div>
    </div>
  );
}
