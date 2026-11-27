export function Privacy() {
  return (
    <main className="container" style={{ padding: '48px 0 64px', maxWidth: 760 }}>
      <div className="eyebrow">// privacy &amp; data handling</div>
      <h1>Privacy information</h1>
      <p className="muted">Last updated: 28 November 2026</p>

      <h2>Website</h2>
      <p>
        This repository’s marketing website is a static site. The current site code does not include
        account registration, contact forms, advertising pixels or an analytics integration. Your browser
        still makes standard requests to the hosting provider and to the font service referenced by the site.
      </p>

      <h2>ANON application</h2>
      <p>
        ANON is designed to reduce the device, location and network metadata exposed during supported
        application activity. Its privacy stack includes device fingerprint spoofing, rotating proxy
        connections, GPS location spoofing, a logless DNS service, IP and domain firewall filtering,
        and a sandboxed application environment.
      </p>
      <p>
        The DNS service is described as logless; users should consult the resolver operator’s current
        privacy policy and technical documentation for its retention practices. Proxy providers can
        observe traffic metadata that passes through their infrastructure. The app’s own data handling,
        diagnostics, update checks and any optional remote services are governed by the implementation
        and disclosures for the installed release.
      </p>
      <p>
        Anonymisation controls reduce particular exposure surfaces but cannot guarantee that a device
        or user is unidentifiable. Applications may use account identifiers, behavioural signals,
        application-layer telemetry or other techniques outside the coverage of a given control.
      </p>

      <h2>Release-specific information</h2>
      <p>
        Permissions, local storage, network requests, third-party providers and retention behaviour may
        change between versions. Review the permission prompts and privacy documentation supplied with
        the exact build you install.
      </p>

      <h2>Changes</h2>
      <p>
        This information may be updated as the website and Android application evolve. Check this page
        and the documentation accompanying your installed release for current details.
      </p>
    </main>
  )
}
