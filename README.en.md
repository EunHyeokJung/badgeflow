# BadgeFlow

BadgeFlow is an open-source, browser-based name badge designer that connects CSV data to reusable layouts and exports print-ready PDFs at true physical size.

[Open the web app](https://badgeflow-studio.silverhyeok-dev.chatgpt.site/) · [Download the latest release](https://github.com/EunHyeokJung/badgeflow/releases/latest) · [한국어 README](README.md)

![BadgeFlow preview](public/og.png)

## Features

- Popular 95 × 123 mm lanyard, A7, B7, CR80, and landscape presets
- A3, A4, Letter, and custom paper sizes
- Fixed and variable text plus PNG, JPEG, WebP, and sanitized SVG layers
- Drag and drop, keyboard movement, layer controls, locking, hiding, undo, and redo
- Horizontal and vertical center actions with magnetic snap guides
- CSV import and direct roster-table editing
- True-size PDF export with spacing, outlines, crop marks, and 150–600 DPI rendering
- Local project backup, restore, and IndexedDB autosave
- Installable offline-capable PWA
- Korean, English, Japanese, Simplified Chinese, Traditional Chinese, Spanish, French, and German UI

Uploaded images and CSV data are processed in your browser and are not sent to an application server.

## Install the app

Open the [BadgeFlow web app](https://badgeflow-studio.silverhyeok-dev.chatgpt.site/) in Chrome, Edge, or Safari. Use **Install app** in the header, or choose **Install app** / **Add to Home Screen** from the browser menu.

The locale picker changes application UI only. It never rewrites CSV headers, roster values, or text placed on the badge. New untranslated messages fall back to English.

## Local development

Requirements: Node.js 22.13 or later and npm 10 or later.

```bash
git clone https://github.com/EunHyeokJung/badgeflow.git
cd badgeflow
npm ci
npm run dev
```

Useful commands:

```bash
npm run lint
npm run typecheck
npm test
npm run check
npm run build
npm run start
```

See [CONTRIBUTING.md](CONTRIBUTING.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/I18N.md](docs/I18N.md), and [docs/PWA.md](docs/PWA.md) for contribution and implementation details.

## Security

SVG uploads are sanitized by removing scripts, external resource references, dangerous CSS, and embedded active content. Project imports accept only supported image data URLs and bounded values. Report vulnerabilities according to [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) © EunHyeokJung
