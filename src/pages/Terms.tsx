export function Terms() {
  return (
    <main className="container" style={{ padding: '48px 0 64px', maxWidth: 760 }}>
      <div className="eyebrow">// terms</div>
      <h1>Terms of use</h1>
      <p className="muted">Last updated: 28 November 2026</p>

      <p>
        By accessing this website or using an ANON release, you agree to use the software only on devices
        you own or are authorised to manage, and to comply with the laws and obligations that apply to you.
      </p>

      <h2>Product functionality</h2>
      <p>
        ANON is an Android device-anonymisation application. Its privacy architecture is described as
        including device fingerprint spoofing, rotating proxy connections, GPS location spoofing,
        logless DNS resolution, IP and domain firewall filtering, and sandbox isolation. The precise
        controls, supported applications and platform compatibility may vary by release.
      </p>

      <h2>No guarantee of anonymity</h2>
      <p>
        Privacy controls can reduce selected device and network signals, but no software can guarantee
        complete anonymity or prevent every form of tracking, correlation, identification or data
        disclosure. Results depend on device configuration, Android behaviour, application design,
        network providers and third-party services.
      </p>

      <h2>Third-party services</h2>
      <p>
        Proxy operators, DNS resolver operators, Android, device manufacturers and other third-party
        services are independent providers. Their availability, logging practices, terms and privacy
        policies are outside ANON’s control.
      </p>

      <h2>Availability and changes</h2>
      <p>
        Builds, features and documentation may change or be withdrawn. Software is provided on an
        “as available” basis to the extent permitted by applicable law. Nothing in these terms excludes
        rights or guarantees that cannot lawfully be excluded.
      </p>
    </main>
  )
}
