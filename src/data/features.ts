export type Feature = {
  id: string
  title: string
  blurb: string
  image: string
}

export const features: Feature[] = [
  {
    id: 'profiles',
    title: 'Separate Profile Workspaces',
    blurb: 'Keep different Android working environments organised, with a clear context for each profile.',
    image: '/features/fingerprint.jpg',
  },
  {
    id: 'device',
    title: 'Device Configuration',
    blurb: 'Bring the settings associated with an environment into one place so they are easier to review and manage.',
    image: '/features/ua.jpg',
  },
  {
    id: 'network',
    title: 'Network Settings',
    blurb: 'Keep network configuration connected to the profile it belongs to, rather than mixing settings between environments.',
    image: '/features/proxy.jpg',
  },
  {
    id: 'sessions',
    title: 'Session Organisation',
    blurb: 'Maintain a clearer separation between profile context and the sessions you use within each environment.',
    image: '/features/vault.jpg',
  },
  {
    id: 'location',
    title: 'Location Preferences',
    blurb: 'Review location-related settings as part of an environment instead of treating them as an afterthought.',
    image: '/features/location.jpg',
  },
  {
    id: 'dns',
    title: 'DNS Configuration',
    blurb: 'Keep DNS choices visible alongside the rest of a profile’s network configuration.',
    image: '/features/dns.jpg',
  },
  {
    id: 'privacy',
    title: 'Privacy Overview',
    blurb: 'Understand which configuration choices belong to each environment and make deliberate changes.',
    image: '/features/tracker.jpg',
  },
]
