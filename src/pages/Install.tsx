import { Link } from 'react-router-dom'

const RELEASES_URL = 'https://github.com/nails808/anon/releases'

export function Install() {
  return (
    <main className="container">
      <section className="page-hero">
        <div className="eyebrow">// android setup</div>
        <h1>Install ANON on Android</h1>
        <p className="lede">
          Get the build from the project’s official releases page and follow the Android
          installation prompts. Available versions and device requirements are listed with each release.
        </p>
      </section>

      <div className="install-grid" style={{ paddingBottom: 48 }}>
        <article className="install-card">
          <h3>1. Check the release</h3>
          <p>
            Open the <a href={RELEASES_URL} target="_blank" rel="noreferrer">ANON GitHub Releases page</a>.
            Read the release notes, confirm the version and check the published file details before installing.
          </p>
        </article>

        <article className="install-card">
          <h3>2. Download the Android package</h3>
          <p>
            Download the APK asset attached to the release, if one is available. Use the official project
            release page rather than an unofficial mirror or a file sent to you by an unknown source.
          </p>
        </article>

        <article className="install-card">
          <h3>3. Allow installation when Android asks</h3>
          <ol>
            <li>Open the downloaded APK using your device’s Files app or browser download list.</li>
            <li>If Android displays an installation permission prompt, review which app is requesting permission.</li>
            <li>Allow installation from that source only if you trust the file and intended to install it.</li>
            <li>Complete the Android installer prompts.</li>
          </ol>
        </article>

        <article className="install-card">
          <h3>4. Review app permissions</h3>
          <p>
            Read each Android permission prompt and consider whether it is necessary for the feature you
            intend to use. You can deny permissions that are not needed and review or change app access later
            in Android Settings.
          </p>
          <p>
            ANON should not require you to grant unrelated access just to complete installation. If a
            permission request is unexpected, stop and check the documentation for that specific release.
          </p>
        </article>

        <article className="install-card">
          <h3>5. Keep Android security protections enabled</h3>
          <p>
            Do not turn off Google Play Protect or other device security features simply to install an APK.
            If Android or Play Protect warns that a package may be unsafe, take the warning seriously and
            verify the release source and file integrity before proceeding.
          </p>
        </article>

        <article className="install-card">
          <h3>6. Confirm device compatibility</h3>
          <p>
            Android versions, supported devices and any setup requirements can change between builds.
            Check the release notes for the exact requirements of the version you are installing.
          </p>
        </article>

        <article className="install-card">
          <h3>Having trouble?</h3>
          <ul>
            <li><strong>Installation blocked:</strong> read the Android message and verify the APK came from the official release.</li>
            <li><strong>App will not open:</strong> confirm your Android version meets the release requirements.</li>
            <li><strong>Permission issue:</strong> review the app’s permissions in Android Settings and consult the version-specific notes.</li>
            <li><strong>No APK listed:</strong> a downloadable Android package may not yet be published for that release.</li>
          </ul>
          <p><Link to="/">Return to the ANON overview</Link>.</p>
        </article>
      </div>
    </main>
  )
}
