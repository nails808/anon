import { Link } from 'react-router-dom'
import { features } from '../data/features'

const RELEASES_URL = 'https://github.com/nails808/anon-rat/releases/latest'

export function Home() {
  return (
    <main>
      <section className="container hero">
        <div>
          <div className="eyebrow">// android · device anonymisation</div>
          <h1>
            Reduce your footprint.<br />
            <span>Control your exposure.</span>
          </h1>
          <p className="lede">
            ANON is a layered Android anonymisation environment. It combines device fingerprint
            spoofing, rotating proxy egress, GPS location spoofing, logless DNS resolution,
            tracker-focused IP and domain filtering, and sandbox isolation in one privacy stack.
          </p>
          <div className="hero-cta">
            <a className="btn" href={RELEASES_URL} target="_blank" rel="noreferrer">Get ANON for Android</a>
            <Link className="btn btn-ghost" to="/install">Installation guide</Link>
          </div>
          <div className="trust">
            <span>Fingerprint controls</span>
            <span>Rotating proxy egress</span>
            <span>Sandbox isolation</span>
          </div>
        </div>
        <div className="hero-visual">
          <img src="/brand/hero.jpg" alt="ANON Android anonymisation interface artwork" />
          <div className="hero-badge">ANON · PRIVACY STACK ACTIVE</div>
        </div>
      </section>

      <section id="features" className="section">
        <div className="container">
          <div className="section-head">
            <h2>Privacy at multiple layers</h2>
            <p>Device identity, network metadata, location signals and application execution are separate exposure surfaces. ANON brings controls for each into one Android privacy stack.</p>
          </div>
          <div className="feature-grid">
            {features.map((f) => (
              <article className="feature-card" key={f.id}>
                <img src={f.image} alt="" loading="lazy" />
                <div className="body">
                  <h3>{f.title}</h3>
                  <p>{f.blurb}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-head">
            <h2>A layered anonymisation workflow</h2>
            <p>Coordinate the main identity and network controls from a dedicated Android environment.</p>
          </div>
          <div className="steps">
            {[
              ['01', 'Isolate the environment', 'Use the sandboxed workspace to separate supported app data and execution context.'],
              ['02', 'Configure identity signals', 'Apply the available fingerprint and GPS spoofing controls for the environment.'],
              ['03', 'Route and filter traffic', 'Configure proxy rotation, privacy DNS and IP/domain firewall rules.'],
              ['04', 'Review your exposure', 'Check the active configuration and the limitations documented for your app version.'],
            ].map(([n, t, d]) => (
              <div className="step" key={n}>
                <div className="step-num">{n}</div>
                <div>
                  <strong>{t}</strong>
                  <p className="muted" style={{ margin: '4px 0 0' }}>{d}</p>
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 22 }}>
            <Link className="btn btn-ghost" to="/install">Read the Android install guide</Link>
          </div>
        </div>
      </section>

      <section id="download" className="section">
        <div className="container">
          <div className="download-box">
            <div>
              <h2 style={{ margin: '0 0 6px' }}>ANON for Android</h2>
              <p className="muted" style={{ margin: 0 }}>Get the current package and review version-specific capabilities and requirements.</p>
              <div className="meta">
                <span>Android application</span>
                <span>Release notes</span>
                <span>Build details</span>
              </div>
            </div>
            <div>
              <a className="btn" href={RELEASES_URL} target="_blank" rel="noreferrer">Download Now</a>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
