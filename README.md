# ANON — Android profile management

ANON is an Android-focused product concept for organising distinct device profiles and the settings associated with each working environment.

The website presents the product direction and provides a place for Android build information. Product capabilities should only be treated as available when they are present in a published app release.

## Product direction

ANON is being shaped around:

- **Profile workspaces** — organise separate working environments instead of keeping every activity in one undifferentiated setup.
- **Device configuration** — keep environment-specific settings organised and easy to review.
- **Network settings** — manage the network configuration associated with a working profile.
- **Session organisation** — keep profile context and related sessions clearly separated.
- **Privacy controls** — make configuration choices visible and understandable.

These are product goals, not a guarantee that every capability is implemented in every build. Check the release notes for the functionality included in a particular version.

## Website

The marketing site is a static single-page application built with Vite, React, TypeScript and React Router.

### Requirements

- Node.js (current LTS recommended)
- npm

### Development

```bash
npm install
npm run dev
```

### Production build

```bash
npm run build
npm run preview
```

The production output is written to `dist/`. Deploy that directory to a static hosting provider such as Cloudflare Pages, Vercel or nginx.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Product overview and feature direction |
| `/install` | Android installation guidance |
| `/privacy` | Website and product privacy information |
| `/terms` | Terms of use |

## Android builds

When an Android build is published, it will be listed on the [GitHub Releases page](https://github.com/nails808/anon/releases). Review the release notes, version information and published checksums before installing.

## Repository scope

This repository contains the ANON marketing website. The legacy `worker/` directory and its associated backend/operator-panel code have been removed. The website does not require that legacy Worker to build.

## Project status

ANON's product direction is Android profile and environment management. Do not assume a feature is available solely because it appears in marketing material; use the documentation and release notes for the installed version as the source of truth.
