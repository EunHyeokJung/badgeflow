# LanyardStudio PWA

LanyardStudio is distributed as an installable Progressive Web App.

## App surface

- `app/manifest.ts` defines identity, theme, icons, start URL, and standalone display.
- `components/AppControls.tsx` handles the browser install prompt and service-worker registration.
- `public/sw.js` provides navigation fallback and same-origin runtime caching.
- `public/icons/` contains the 192 px, 512 px, Apple touch, and source-size icons.
- `lib/site.ts` scopes those URLs to `/` on the primary deployment and
  `/badgeflow/` on GitHub Pages.

## Cache policy

The service worker uses a versioned cache. Navigation uses network-first behavior so published updates win when online and the cached shell is used when offline. Same-origin scripts, styles, fonts, and images are cached after a successful response.

LanyardStudio does not cache cross-origin requests or server data. User projects remain in IndexedDB or the localStorage fallback and are not placed in the service-worker cache.

## Release checklist

1. Bump the cache name in `public/sw.js` when the offline shell changes materially.
2. Run `npm run check` and `npm audit`.
3. Confirm `/manifest.webmanifest`, `/sw.js`, and both required icon sizes return successfully over HTTPS.
4. Verify install and upgrade behavior in Chromium and add-to-home-screen behavior in Safari.
