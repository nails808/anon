import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Shield, ShieldCheck, Fingerprint, Globe2, MapPin, Smartphone, Wifi,
  BatteryFull, Power, LockKeyhole, RefreshCw, Info, Share, Download,
  PlusSquare, MoreVertical, BellRing
} from 'lucide-react';
import './style.css';

const protections = [
  { id: 'fingerprint', title: 'Fingerprint Spoofing', subtitle: 'Masks browser & device identity', Icon: Fingerprint },
  { id: 'proxy', title: 'Anonymous Proxy', subtitle: 'Routes traffic through a secure network', Icon: Globe2 },
  { id: 'location', title: 'Location Obfuscation', subtitle: 'Displays approximate location only', Icon: MapPin },
  { id: 'agent', title: 'User-Agent Rotation', subtitle: 'Randomises browser & OS signatures', Icon: RefreshCw },
  { id: 'dns', title: 'DNS Protection', subtitle: 'Visual DNS leak protection status', Icon: LockKeyhole }
];

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

function decodeBase64Url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const raw = atob(padded);
  return Uint8Array.from(raw, char => char.charCodeAt(0));
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
            <div className="install-step"><span>2</span><div><strong>Tap the Share button</strong><p>Choose the Share icon <Share className="inline-icon"/> at the bottom of Safari.</p></div></div>
            <div className="install-step"><span>3</span><div><strong>Add to Home Screen</strong><p>Scroll the share sheet, tap <b>Add to Home Screen</b>, then confirm with <b>Add</b>.</p></div></div>
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
            <div className="install-step"><span>1</span><div><strong>Open the browser menu</strong><p>Use your browser's Install App or Add to Home Screen option.</p></div></div>
            <div className="install-step"><span>2</span><div><strong>Launch Anon from your Home Screen</strong><p>Open the installed app to access the full-screen experience.</p></div></div>
          </div>
        )}
        <div className="install-foot"><PlusSquare size={17}/> The full dashboard is available only after installation.</div>
      </section>
    </main>
  );
}

function App() {
  // Deliberately initialise every visual module as inactive on every launch.
  const [active, setActive] = useState(Object.fromEntries(protections.map(p => [p.id, false])));
  const [standalone, setStandalone] = useState(isStandalone);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const update = () => setStandalone(isStandalone());
    const media = window.matchMedia('(display-mode: standalone)');
    media.addEventListener?.('change', update);
    window.addEventListener('pageshow', update);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    return () => {
      media.removeEventListener?.('change', update);
      window.removeEventListener('pageshow', update);
    };
  }, []);

  const enabledCount = Object.values(active).filter(Boolean).length;
  const isActive = enabledCount === protections.length;

  const subscribeAndActivate = async () => {
    if (isActive) {
      setActive(Object.fromEntries(protections.map(p => [p.id, false])));
      setMessage('ANONYMITY INACTIVE');
      return;
    }

    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setActive(Object.fromEntries(protections.map(p => [p.id, true])));
        setMessage('Demo mode enabled — push is not supported in this browser.');
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        if (!('Notification' in window)) throw new Error('Notifications are not supported by this browser.');
        const permission = Notification.permission === 'default'
          ? await Notification.requestPermission()
          : Notification.permission;
        if (permission !== 'granted') throw new Error('Allow notifications to subscribe to Anon alerts.');

        const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        if (!vapidKey) throw new Error('Push setup is incomplete. Configure the VAPID public key to enable subscription.');
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeBase64Url(vapidKey)
        });

        const response = await fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription)
        });
        if (!response.ok) throw new Error('The notification subscription could not be saved. Please try again.');
        setMessage('Push notifications enabled.');
      } else {
        setMessage('Existing notification subscription found — demo mode enabled.');
      }
      setActive(Object.fromEntries(protections.map(p => [p.id, true])));
    } catch (error) {
      setMessage(error?.message || 'Unable to enable notifications.');
    }
  };

  const toggle = id => setActive(old => ({ ...old, [id]: !old[id] }));

  if (!standalone) return <InstallScreen />;

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <header className="statusbar">
        <div className="status-left"><span className="signal"><i/><i/><i/><i/></span><span>Anon</span><Wifi size={17}/></div>
        <span className="clock">08:00</span>
        <div className="status-right"><span>100%</span><BatteryFull size={23}/></div>
      </header>

      <section className="brand-block">
        <div className="shield-wrap">
          <div className="shield-aura" />
          <Shield className="brand-shield" strokeWidth={1.15} />
          <span className="shield-letter">A</span>
        </div>
        <div className="wordmark">ANON</div>
        <div className="protected-pill"><ShieldCheck size={21}/><span>PROTECTED BY ANON</span></div>
      </section>

      <section className="power-section">
        <div className="map-dots" aria-hidden="true" />
        <button className={`power-orb ${isActive ? '' : 'inactive'}`} onClick={subscribeAndActivate} aria-label={`Turn anonymity ${isActive ? 'off' : 'on'}`}>
          <span className="orb-ring" /><Power size={61} strokeWidth={1.8}/>
          <span className="orb-label">ANONYMITY</span><strong>{isActive ? 'ACTIVE' : 'INACTIVE'}</strong>
        </button>
      </section>

      <section className="protection-list" aria-label="Privacy features">
        {protections.map(({id, title, subtitle, Icon}) => (
          <article className={`protection-card ${active[id] ? '' : 'off'}`} key={id}>
            <div className="feature-icon"><Icon size={31} strokeWidth={1.8}/></div>
            <div className="feature-copy"><h2>{title}</h2><p>{subtitle}</p></div>
            <div className="feature-status"><span className="status-dot"/>{active[id] ? 'Active' : 'Inactive'}</div>
            <button className={`toggle ${active[id] ? 'on' : ''}`} onClick={() => toggle(id)} aria-label={`${active[id] ? 'Disable' : 'Enable'} ${title}`} aria-pressed={active[id]}><span/></button>
          </article>
        ))}
      </section>

      <section className="telemetry-card">
        <div className="telemetry-item"><MapPin/><div><small>LOCATION</small><strong>Approx. (±50km)</strong></div></div>
        <div className="telemetry-item"><Globe2/><div><small>IP (PROXY)</small><strong>185.220.101.42</strong></div></div>
        <div className="telemetry-item"><Smartphone/><div><small>DEVICE ID</small><strong>Spoofed</strong></div></div>
      </section>
      <div className="demo-note"><Info size={13}/> Visual demo only — no traffic, GPS or device identity is modified.</div>
      {message && <button className="app-message" onClick={() => setMessage('')}><BellRing size={15}/>{message}<span>×</span></button>}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
