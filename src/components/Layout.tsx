import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'

export function Layout() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <>
      <header className="nav">
        <div className="container nav-inner">
          <Link to="/" className="brand" onClick={close}>
            <span className="brand-mark">A</span>
            ANON
          </Link>
          <nav className={`nav-links ${open ? 'open' : ''}`}>
            <NavLink to="/" end onClick={close}>Overview</NavLink>
            <a href="/#features" onClick={close}>Anonymisation stack</a>
            <NavLink to="/install" onClick={close}>Install</NavLink>
            <NavLink to="/privacy" onClick={close}>Privacy</NavLink>
            <a className="btn btn-sm" href="https://github.com/nails808/anon-app/releases/latest/download/anon.apk" target="_blank" rel="noreferrer" onClick={close}>Download Now</a>
          </nav>
          <button className="nav-toggle" onClick={() => setOpen((v) => !v)} aria-label="Menu" aria-expanded={open}>☰</button>
        </div>
      </header>
      <Outlet />
      <footer className="footer">
        <div className="container footer-grid">
          <div>
            <div className="brand"><span className="brand-mark">A</span> ANON</div>
            <p className="muted" style={{ maxWidth: 360 }}>
              Layered Android anonymisation: device identity controls, network privacy and sandbox isolation.
            </p>
          </div>
          <div>
            <h4>Product</h4>
            <Link to="/">Overview</Link>
            <a href="/#features">Anonymisation stack</a>
            <Link to="/install">Install guide</Link>
            <a href="https://github.com/nails808/anon-app/releases/latest/download/anon.apk" target="_blank" rel="noreferrer">Download Now</a>
          </div>
          <div>
            <h4>Information</h4>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </div>
        </div>
        <div className="container copy">© 2026 ANON · Android device anonymisation</div>
      </footer>
    </>
  )
}
