import React, { useEffect, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Shield, ShieldCheck, Fingerprint, Globe2, MapPin, Smartphone,
  Power, LockKeyhole, RefreshCw, Share, Download,
  PlusSquare, MoreVertical, BellRing, LogOut, Mail, KeyRound
} from 'lucide-react';
import './style.css';

const protections = [
  { id: 'fingerprint', title: 'Fingerprint Spoofing', subtitle: 'Masks browser & device identity', Icon: Fingerprint },
  { id: 'proxy', title: 'Anonymous Proxy', subtitle: 'Routes traffic through a secure network', Icon: Globe2 },
  { id: 'location', title: 'Location Obfuscation', subtitle: 'Displays approximate location only', Icon: MapPin },
  { id: 'agent', title: 'User-Agent Rotation', subtitle: 'Randomises browser & OS signatures', Icon: RefreshCw },
  { id: 'dns', title: 'DNS Protection', subtitle: 'Visual DNS leak protection status', Icon: LockKeyhole }
];

const SESSION_KEY = 'anon_session_token';
const REMEMBER_KEY = 'anon_remember_email';

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

function decodeBase64Url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const raw = atob(padded);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

function getStoredToken() {
  return localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY) || null;
}

function storeToken(token, remember) {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  if (!token) return;
  if (remember) localStorage.setItem(SESSION_KEY, token);
  else sessionStorage.setItem(SESSION_KEY, token);
}

async function api(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const t = token ?? getStoredToken();
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(path, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function InstallScreen() {
  const ua = navigator.userAgent || '';
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);

  return (
    <main className="install-shell">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <div className="install-brand">
        <div className="install-shield"><Shield size={76} strokeWidth={1.15}/><span>A</span></div>
        <div className="wordmark">ANON</div>
        <div className="protected-pill"><ShieldCheck size={20}/><span>PROTECTED BY ANON</span></div>
      </div>
      <section className="install-card">
        <div className="install-kicker"><Download size={15}/> INSTALLATION REQUIRED</div>
        <h1>Take Anon with you.</h1>
        <p className="install-intro">Install Anon to your Home Screen to open the full-screen experience.</p>
        {isIOS ? (
          <div className="install-steps">
            <div className="install-step"><span>1</span><div><strong>Open in Safari</strong><p>Use Safari on your iPhone or iPad. In-app browsers may not support installation.</p></div></div>
            <div className="install-step"><span>2</span><div><strong>Tap Share</strong><p>Tap the Share button <Share className="inline-icon"/> in the browser toolbar.</p></div></div>
            <div className="install-step"><span>3</span><div><strong>Add to Home Screen</strong><p>Scroll and choose <b>Add to Home Screen</b>, then confirm.</p></div></div>
            <div className="install-step"><span>4</span><div><strong>Launch Anon from your Home Screen</strong><p>Tap the new Anon icon. The full app will appear in standalone mode.</p></div></div>
          </div>
        ) : isAndroid ? (
          <div className="install-steps">
            <div className="install-step"><span>1</span><div><strong>Open in Chrome</strong><p>Visit this page using Chrome on your Android device.</p></div></div>
            <div className="install-step"><span>2</span><div><strong>Open the browser menu</strong><p>Tap the three-dot menu <MoreVertical className="inline-icon"/> in the top-right corner.</p></div></div>
            <div className="install-step"><span>3</span><div><strong>Install the app</strong><p>Choose <b>Install app</b> or <b>Add to Home screen</b>, then confirm.</p></div></div>
            <div className="install-step"><span>4</span><div><strong>Launch Anon from your Home Screen</strong><p>Tap the Anon icon to open the full-screen app.</p></div></div>
          </div>
        ) : (
          <div className="install-steps">
            <div className="install-step"><span>1</span><div><strong>Open the browser menu</strong><p>Use your browser&apos;s Install App or Add to Home Screen option.</p></div></div>
            <div className="install-step"><span>2</span><div><strong>Launch Anon from your Home Screen</strong><p>Open the installed app to access the full-screen experience.</p></div></div>
          </div>
        )}
        <div className="install-foot"><PlusSquare size={17}/> The full dashboard is available only after installation.</div>
      </section>
    </main>
  );
}

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBER_KEY) || '');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [remember, setRemember] = useState(() => Boolean(localStorage.getItem(REMEMBER_KEY)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const switchMode = (next) => {
    setMode(next);
    setError('');
    setSuccess('');
    setPassword('');
    setPasswordConfirm('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (mode === 'register') {
      if (password.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }
      if (password !== passwordConfirm) {
        setError('Passwords do not match');
        return;
      }
    }

    setBusy(true);
    try {
      const path = mode === 'login' ? '/api/login' : '/api/register';
      const body =
        mode === 'login'
          ? { email, password, remember }
          : { email, password, passwordConfirm, remember };
      const data = await api(path, { method: 'POST', body });
      storeToken(data.token, remember);
      if (remember) localStorage.setItem(REMEMBER_KEY, email.trim().toLowerCase());
      else localStorage.removeItem(REMEMBER_KEY);
      setSuccess(mode === 'login' ? 'Signed in' : 'Account created');
      onAuthenticated(data.user);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-shell">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <section className="brand-block auth-brand">
        <div className="shield-wrap">
          <div className="shield-aura" />
          <Shield className="brand-shield" strokeWidth={1.15} />
          <span className="shield-letter">A</span>
        </div>
        <div className="wordmark">ANON</div>
        <div className="protected-pill"><ShieldCheck size={18}/><span>PROTECTED BY ANON</span></div>
      </section>

      <section className="auth-card">
        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            className={mode === 'login' ? 'active' : ''}
            onClick={() => switchMode('login')}
            disabled={busy}
          >
            Log in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            className={mode === 'register' ? 'active' : ''}
            onClick={() => switchMode('register')}
            disabled={busy}
          >
            Create account
          </button>
        </div>

        <form className="auth-form" onSubmit={submit} noValidate>
          <label className="auth-field">
            <span><Mail size={14}/> Email</span>
            <input
              type="email"
              name="email"
              autoComplete="username"
              inputMode="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={busy}
              autoCapitalize="none"
              autoCorrect="off"
            />
          </label>

          <label className="auth-field">
            <span><KeyRound size={14}/> Password</span>
            <input
              type="password"
              name="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={mode === 'register' ? 8 : 1}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'}
              disabled={busy}
            />
          </label>

          {mode === 'register' && (
            <label className="auth-field">
              <span><KeyRound size={14}/> Confirm password</span>
              <input
                type="password"
                name="passwordConfirm"
                autoComplete="new-password"
                required
                minLength={8}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="Repeat password"
                disabled={busy}
              />
            </label>
          )}

          <label className="auth-remember">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              disabled={busy}
            />
            <span>Remember me</span>
          </label>

          {error && <div className="auth-error" role="alert">{error}</div>}
          {success && <div className="auth-success" role="status">{success}</div>}

          <button type="submit" className="auth-submit" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>

        <p className="auth-hint">
          {mode === 'login'
            ? 'Your email is your username. Sessions last 1 day, or 30 days with Remember me.'
            : 'Each email can only register once. It becomes your username.'}
        </p>
      </section>
    </main>
  );
}

function Dashboard({ user, onLogout }) {
  const [active, setActive] = useState(Object.fromEntries(protections.map((p) => [p.id, false])));
  const [message, setMessage] = useState('');
  const isActive = Object.values(active).some(Boolean);

  const subscribeAndActivate = async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setActive(Object.fromEntries(protections.map((p) => [p.id, true])));
        setMessage('Push is not supported in this browser.');
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        if (!('Notification' in window)) throw new Error('Notifications are not supported.');
        const permission =
          Notification.permission === 'default'
            ? await Notification.requestPermission()
            : Notification.permission;
        if (permission !== 'granted') throw new Error('Allow notifications to enable alerts.');

        const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        if (!vapidKey) throw new Error('Push setup incomplete — configure VITE_VAPID_PUBLIC_KEY.');
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeBase64Url(vapidKey),
        });
      }

      await api('/api/subscribe', {
        method: 'POST',
        body: typeof subscription.toJSON === 'function' ? subscription.toJSON() : subscription,
      });
      setMessage('Notifications enabled.');
      setActive(Object.fromEntries(protections.map((p) => [p.id, true])));
    } catch (error) {
      setMessage(error?.message || 'Unable to enable notifications.');
    }
  };

  const toggle = (id) => setActive((old) => ({ ...old, [id]: !old[id] }));

  const logout = async () => {
    try {
      await api('/api/logout', { method: 'POST' });
    } catch {
      /* ignore network errors on logout */
    }
    storeToken(null, false);
    onLogout();
  };

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <section className="brand-block">
        <div className="shield-wrap">
          <div className="shield-aura" />
          <Shield className="brand-shield" strokeWidth={1.15} />
          <span className="shield-letter">A</span>
        </div>
        <div className="wordmark">ANON</div>
        <div className="protected-pill"><ShieldCheck size={21}/><span>PROTECTED BY ANON</span></div>
        <div className="user-bar">
          <span className="user-email">{user?.email}</span>
          <button type="button" className="logout-btn" onClick={logout} aria-label="Log out">
            <LogOut size={14}/> Log out
          </button>
        </div>
      </section>

      <section className="power-section">
        <div className="map-dots" aria-hidden="true" />
        <button
          className={`power-orb ${isActive ? '' : 'inactive'}`}
          onClick={subscribeAndActivate}
          aria-label={`Turn anonymity ${isActive ? 'off' : 'on'}`}
        >
          <span className="orb-ring" /><Power size={61} strokeWidth={1.8}/>
          <span className="orb-label">ANONYMITY</span>
          <strong>{isActive ? 'ACTIVE' : 'INACTIVE'}</strong>
        </button>
      </section>

      <section className="protection-list" aria-label="Privacy features">
        {protections.map(({ id, title, subtitle, Icon }) => (
          <article className={`protection-card ${active[id] ? '' : 'off'}`} key={id}>
            <div className="feature-icon"><Icon size={31} strokeWidth={1.8}/></div>
            <div className="feature-copy"><h2>{title}</h2><p>{subtitle}</p></div>
            <div className="feature-status">
              <span className="status-dot"/>
              {active[id] ? 'Active' : 'Inactive'}
            </div>
            <button
              className={`toggle ${active[id] ? 'on' : ''}`}
              onClick={() => toggle(id)}
              aria-label={`${active[id] ? 'Disable' : 'Enable'} ${title}`}
              aria-pressed={active[id]}
            >
              <span/>
            </button>
          </article>
        ))}
      </section>

      <section className="telemetry-card">
        <div className="telemetry-item"><MapPin/><div><small>LOCATION</small><strong>Approx. (±50km)</strong></div></div>
        <div className="telemetry-item"><Globe2/><div><small>IP (PROXY)</small><strong>185.220.101.42</strong></div></div>
        <div className="telemetry-item"><Smartphone/><div><small>DEVICE ID</small><strong>Spoofed</strong></div></div>
      </section>
      {message && (
        <button className="app-message" onClick={() => setMessage('')}>
          <BellRing size={15}/>{message}<span>×</span>
        </button>
      )}
    </main>
  );
}

function App() {
  const [standalone, setStandalone] = useState(isStandalone);
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const update = () => setStandalone(isStandalone());
    const media = window.matchMedia('(display-mode: standalone)');
    media.addEventListener?.('change', update);
    window.addEventListener('pageshow', update);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    return () => {
      media.removeEventListener?.('change', update);
      window.removeEventListener('pageshow', update);
    };
  }, []);

  const checkSession = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setAuthChecked(true);
      return;
    }
    try {
      const data = await api('/api/me');
      setUser(data.user);
    } catch {
      storeToken(null, false);
      setUser(null);
    } finally {
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  if (!standalone) return <InstallScreen />;

  if (!authChecked) {
    return (
      <main className="auth-shell loading-shell">
        <div className="ambient ambient-one" /><div className="ambient ambient-two" />
        <div className="wordmark">ANON</div>
        <p className="loading-text">Loading…</p>
      </main>
    );
  }

  if (!user) {
    return <AuthScreen onAuthenticated={(u) => setUser(u)} />;
  }

  return <Dashboard user={user} onLogout={() => setUser(null)} />;
}

createRoot(document.getElementById('root')).render(<App />);
