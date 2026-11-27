export function Privacy() {
  return (
    <main className="container" style={{ padding: '48px 0 64px', maxWidth: 760 }}>
      <div className="eyebrow">// privacy</div>
      <h1>Privacy information</h1>
      <p className="muted">Last updated: 28 November 2026</p>

      <h2>Website</h2>
      <p>
        This repository’s marketing website is a static site. The current site code does not include
        account registration, contact forms, advertising pixels or an analytics integration. Your browser
        will still make standard requests to the hosting provider and to the font service referenced by the
        site.
      </p>

      <h2>Android application</h2>
      <p>
        The Android application is a separate product from this website. The data an installed build
        accesses or stores depends on the permissions, features and network services included in that
        specific version. Review the permission prompts and release documentation before use.
      </p>
      <p>
        This page does not make a blanket claim that all application data remains on your device, nor that
        the app never communicates with external services. Any release that introduces account features,
        synchronisation, diagnostics or other network activity should document the data involved, its
        purpose, retention and any relevant third parties in version-specific privacy information.
      </p>

      <h2>Changes</h2>
      <p>
        This information may be updated as the website and Android application evolve. Check this page
        and the documentation accompanying your installed release for current details.
      </p>
    </main>
  )
}
