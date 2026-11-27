import { Link } from 'react-router-dom'
import { features } from '../data/features'

const RELEASES_URL = 'https://github.com/nails808/anon/releases'

export function Home() {
  return (
    <main>
      <section className="container hero">
        <div>
          <div className="eyebrow">// android · profile management</div>
          <h1>
            Different profiles.<br />
            <span>Clear boundaries.</span>
          </h1>
          <p className="lede">
            ANON is an Android-focused profile management project built around a simple idea:
            keep device environments, configuration and session context organised instead of
            letting everything blur together.
          </p>
          <div className="hero-cta">
            <a className="btn" href={RELEASES_URL} target="_blank" rel="noreferrer">View Android builds</a>
            <Link className="btn btn-ghost" to="/install">Installation guide</Link>
          </div>
          <div className="trust">
            <span>Android-focused</span>
            <span>Profile-first workflow</span>
            <span>Configuration-led</span>
          </div>
        </div>
        <div className="hero-visual">
          <img src="/brand/hero.jpg" alt="ANON Android profile management visual" />
          <div className="hero-badge">PROFILE · ENVIRONMENT CONTROL</div>
        </div>
      </section>

      <section id="features" className="section">
        <div className="container">
          <div className="section-head">
            <h2>One workspace. Distinct environments.</h2>
            <p>ANON is being developed around the tools and configuration that make separate Android profiles easier to manage.</p>
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
            <h2>A more deliberate workflow</h2>
            <p>Set up an environment, review its configuration, and keep each profile’s context clear.</p>
          </div>
          <div className="steps">
            {[
              ['01', 'Create an environment', 'Start with a distinct profile for the task or account context you want to organise.'],
              ['02', 'Review its configuration', 'Keep the relevant device and network settings associated with that environment.'],
              ['03', 'Keep sessions organised', 'Use clear profile boundaries to reduce accidental overlap between workflows.'],
              ['04', 'Check the release notes', 'Confirm which capabilities are included in the Android build you install.'],
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
              <p className="muted" style={{ margin: 0 }}>Check the releases page for available builds, version details and installation notes.</p>
              <div className="meta">
                <span>Android project</span>
                <span>Release notes</span>
                <span>Build details</span>
              </div>
            </div>
            <div>
              <a className="btn" href={RELEASES_URL} target="_blank" rel="noreferrer">View releases</a>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
