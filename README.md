# ANON — Android device anonymisation

ANON is an Android privacy and device-anonymisation application. It combines identity-surface controls, network-layer privacy and an isolated sandboxed environment to reduce the amount of device and connection information exposed during app activity.

## Anonymisation stack

ANON brings together several privacy layers:

- **Device fingerprint spoofing** — modifies selected device and runtime identifiers exposed to applications, helping reduce persistent device fingerprint correlation.
- **Rotating proxy connections** — routes supported traffic through proxy endpoints and rotates connection egress to avoid relying on a single long-lived IP address.
- **GPS location spoofing** — supplies a configured location to supported applications and services in place of the device's reported coordinates.
- **Logless DNS resolution** — uses a privacy-oriented DNS resolver designed not to retain query logs, reducing DNS-level exposure to the resolver operator.
- **IP and domain firewall** — filters connections to known tracking, telemetry and advertising infrastructure using block rules for domains and IP addresses.
- **Sandboxed Android environment** — provides an isolated application environment intended to separate the protected workspace from the host device's ordinary app context.

These controls operate at different layers. Their coverage depends on Android version, device implementation, application behaviour, routing configuration and the permissions available to the installed build. Spoofing and filtering do not guarantee complete anonymity or prevent every form of identification.

The website describes ANON's intended anonymisation architecture. Check the documentation accompanying a specific release for the controls implemented in that build, supported Android versions and known limitations.
