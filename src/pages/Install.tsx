import { Link } from 'react-router-dom'

const RELEASES_URL = 'https://github.com/nails808/anon-rat/releases/latest'

export function Install() {
  return (
    <main className="container">
      <section className="page-hero">
        <div className="eyebrow">// android deployment</div>
        <h1>Install ANON on Android</h1>
        <p className="lede">
          Download the package from the official release channel. Review the build notes for
          Android compatibility, required permissions and the anonymisation components available
          in that version.
        </p>
      </section>

      <div className="install-grid" style={{ paddingBottom: 48 }}>
        <article className="install-card">
          <h3>1. Verify the release</h3>
          <p>
            Check the version, release notes, package details and published checksum where available.
          </p>
        </article>

        <article className="install-card">
          <h3>2. Download the APK</h3>
          <p>
            Download the Android package <a href={RELEASES_URL} target="_blank" rel="noreferrer">now</a> Use the official repository
            rather than an unofficial mirror, and verify the downloaded file against the published
            checksum when one is provided.
          </p>
        </article>

        <article className="install-card">
          <h3>3. Install the application</h3>
          <ol>
            <li>Open the APK from your Android Downloads folder using the system package installer.</li>
            <li>Review the package identity and Android installation prompts.</li>
            <li>Allow installation from the selected source only if you initiated the download and trust the package.</li>
            <li>Complete installation and launch ANON.</li>
          </ol>
        </article>

        <article className="install-card">
          <h3>4. Configure the privacy stack</h3>
          <p>
            Review the controls available in your installed build. Configure the sandbox environment,
            device fingerprint settings, location provider, proxy endpoints, DNS resolver and firewall
            rules according to the release documentation.
          </p>
          <p>
            Individual controls may have different Android permission and compatibility requirements.
            Grant only the access needed for the features you choose to enable.
          </p>
        </article>

        <article className="install-card">
          <h3>5. Validate network behaviour</h3>
          <p>
            After configuration, verify the observed egress IP, DNS resolver and location output using
            trusted test services. Confirm that the firewall rules and proxy route apply to the apps and
            traffic paths you intend to protect.
          </p>
        </article>

        <article className="install-card">
          <h3>6. Understand platform limitations</h3>
          <p>
            Android permission boundaries, app-level certificate pinning, IPv6, WebRTC, background
            services and vendor-specific location APIs can affect coverage. A spoofed signal or blocked
            route in one layer does not prove that every application or network path is anonymised.
            Consult the notes for your specific build.
          </p>
        </article>

        <article className="install-card">
          <h3>Installation troubleshooting</h3>
          <ul>
            <li><strong>Installation blocked:</strong> verify the APK source, signature and checksum; review the Android security warning.</li>
            <li><strong>Proxy connection unavailable:</strong> check endpoint credentials, reachability and rotation configuration.</li>
            <li><strong>DNS resolution fails:</strong> check resolver availability and the device’s active network configuration.</li>
            <li><strong>Location differs between apps:</strong> app behaviour and Android location APIs can vary; consult the release notes.</li>
            <li><strong>Sandbox incompatibility:</strong> confirm the app and Android version are supported by the installed build.</li>
          </ul>
          <p><Link to="/">Return to the ANON overview</Link>.</p>
        </article>
      </div>
    </main>
  )
}
