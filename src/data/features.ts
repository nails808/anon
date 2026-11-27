export type Feature = {
  id: string
  title: string
  blurb: string
  image: string
}

export const features: Feature[] = [
  {
    id: 'fingerprint',
    title: 'Device Fingerprint Spoofing',
    blurb: 'Spoofs selected device and runtime attributes to reduce stable fingerprint signals and cross-session device correlation.',
    image: '/features/fingerprint.jpg',
  },
  {
    id: 'proxy',
    title: 'Rotating Proxy Egress',
    blurb: 'Routes supported traffic through proxy endpoints and rotates egress IPs, reducing dependence on a persistent network address.',
    image: '/features/proxy.jpg',
  },
  {
    id: 'location',
    title: 'GPS Location Spoofing',
    blurb: 'Overrides reported coordinates for supported apps with a configured location, limiting exposure of the device’s actual position.',
    image: '/features/location.jpg',
  },
  {
    id: 'dns',
    title: 'Logless DNS Resolution',
    blurb: 'Uses a privacy-oriented DNS resolver designed not to retain query logs, reducing the DNS metadata held by the resolver.',
    image: '/features/dns.jpg',
  },
  {
    id: 'tracker',
    title: 'IP & Domain Firewall',
    blurb: 'Filters known tracking, telemetry and advertising infrastructure with domain- and IP-based block rules.',
    image: '/features/tracker.jpg',
  },
  {
    id: 'vault',
    title: 'Sandboxed App Environment',
    blurb: 'Runs supported app activity inside an isolated environment, separating its data and execution context from the host workspace.',
    image: '/features/vault.jpg',
  },
  {
    id: 'ua',
    title: 'Layered Identity Controls',
    blurb: 'Combines device-signal, location and network controls to reduce the number of consistent identifiers exposed across sessions.',
    image: '/features/ua.jpg',
  },
]
