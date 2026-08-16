import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(new URL(pathname, "http://localhost/"), {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the BadgeFlow size-first landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(
    response.headers.get("cross-origin-opener-policy"),
    "same-origin",
  );
  assert.match(
    response.headers.get("content-security-policy") ?? "",
    /frame-ancestors 'none'/,
  );

  const html = await response.text();
  assert.match(html, /<title>BadgeFlow \| 명찰 인쇄 스튜디오<\/title>/i);
  assert.match(html, /어떤 명찰을/);
  assert.match(html, /바로 시작하기/);
  assert.match(html, /디자인, 명단 연결, 인쇄물 생성까지 한번에/);
  assert.match(html, /명단을 한 번에 연결/);
  assert.match(html, /인쇄까지 정확하게/);
  assert.match(html, /드래그 앤 드롭과 중앙 자석 정렬/);
  assert.match(html, /UTF-8 CSV 업로드와 최대 500명 처리/);
  assert.match(html, /반접이 테이블 명패도 양면으로 자동 배치/);
  assert.match(html, /feature-demo-editor/);
  assert.match(html, /feature-demo-data/);
  assert.match(html, /feature-demo-print/);
  assert.match(html, /대표 명찰 규격/);
  assert.match(html, /목걸이 명찰 · 대형 95 × 123 mm 선택/);
  assert.match(html, /A7 행사 명찰/);
  assert.match(html, /A4 반접이 테이블 명패/);
  assert.match(html, /앞뒤 양쪽에서 같은 이름/);
  assert.match(html, /A4 1장당 1명/);
  assert.match(html, /B7 컨퍼런스 패스/);
  assert.match(html, /CR80 · ID-1/);
  assert.match(html, /규격 직접 입력/);
  assert.match(html, /이 규격으로 만들기/);
  assert.doesNotMatch(html, /이 규격으로 시작/);
  assert.doesNotMatch(html, /POPULAR SIZES|BADGEFLOW가 하는 일/);
  assert.doesNotMatch(html, /크기부터 인쇄까지 한 번에/);
  assert.doesNotMatch(html, /Your site is taking shape/);
});

test("keeps image editing, project backup, and PDF rendering connected", async () => {
  const [studio, storage, css] = await Promise.all([
    readFile(
      new URL("../components/BadgeStudio.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../lib/badgeflow/storage.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(studio, /type ImageElement = CommonElement/);
  assert.match(studio, /const BADGE_PRESETS: BadgePreset\[\]/);
  assert.match(studio, /id: "a4-table-tent"/);
  assert.match(studio, /outputMode: "table-tent"/);
  assert.match(studio, /function createTableTentElements/);
  assert.match(studio, /async function rotateBadgeImage180/);
  assert.match(studio, /doc\.setLineDashPattern\(\[2, 2\], 0\)/);
  assert.match(studio, /function LandingPage/);
  assert.match(studio, /setSelectedPresetId\(preset\.id\)/);
  assert.match(studio, /aria-pressed={isSelected}/);
  assert.match(studio, /disabled={!selectedPreset}/);
  assert.doesNotMatch(studio, /onClick=\{\(\) => onSelectPreset\(preset\)\}/);
  assert.match(studio, /className="feature-story"/);
  assert.match(studio, /className="feature-story is-reversed"/);
  assert.match(studio, /aria-label={t\("featureDesignVisualLabel"\)}/);
  assert.match(studio, /aria-label={t\("featureDataVisualLabel"\)}/);
  assert.match(studio, /aria-label={t\("featurePrintVisualLabel"\)}/);
  assert.match(studio, /aria-controls="landing-start-menu"/);
  assert.match(studio, /disabled={!hasSavedDraft}/);
  assert.match(studio, /document\.addEventListener\("keydown", closeOnEscape\)/);
  assert.match(studio, /function startWithPreset/);
  assert.match(studio, /async function readImageAsset/);
  assert.match(studio, /script, foreignObject, iframe, object, embed/);
  assert.match(studio, /function handleCanvasDrop/);
  assert.match(studio, /function moveElementLayer/);
  assert.match(studio, /function exportProject/);
  assert.match(studio, /function importProject/);
  assert.match(studio, /function normalizeProject/);
  assert.match(studio, /MAX_ROWS = 500/);
  assert.match(studio, /const undoElements = useCallback/);
  assert.match(studio, /backgroundColor,\s+background,\s+backgroundFit,/);
  assert.match(studio, /for \(const element of elements\)/);
  assert.doesNotMatch(
    studio,
    /SETUP|INSPECTOR|DATA SOURCE|SCHEMA|PRINT PREVIEW|REFERENCE READY/,
  );
  assert.doesNotMatch(studio, /className="eyebrow"/);
  assert.match(css, /\.badge-image-element/);
  assert.match(css, /\.preset-grid/);
  assert.match(css, /\.preset-card\.is-selected/);
  assert.match(css, /\.preset-actions/);
  assert.match(css, /\.create-selected-preset-button/);
  assert.match(css, /\.service-overview/);
  assert.match(css, /\.feature-story/);
  assert.match(css, /\.feature-editor-layout/);
  assert.match(css, /\.feature-data-layout/);
  assert.match(css, /\.feature-print-layout/);
  assert.match(css, /\.landing-start-menu/);
  assert.match(css, /\.preset-mini-sheet/);
  assert.match(css, /\.fold-guide/);
  assert.match(css, /\.table-tent-panel\.is-reversed/);
  assert.doesNotMatch(css, /\.eyebrow|\.landing-kicker|\.reference-kicker/);
  assert.match(css, /\.layer-list/);
  assert.match(css, /\.alignment-guide/);
  assert.match(storage, /indexedDB\.open/);
  assert.match(storage, /LEGACY_LOCAL_STORAGE_KEY/);
});

test("ships an installable multilingual PWA contract", async () => {
  const [manifestResponse, i18n, controls, serviceWorker] = await Promise.all([
    render("/manifest.webmanifest"),
    readFile(new URL("../lib/i18n.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/AppControls.tsx", import.meta.url), "utf8"),
    readFile(new URL("../public/sw.js", import.meta.url), "utf8"),
  ]);

  assert.equal(manifestResponse.status, 200);
  assert.match(
    manifestResponse.headers.get("content-type") ?? "",
    /^application\/manifest\+json\b/i,
  );
  const manifest = await manifestResponse.json();
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/");
  assert.deepEqual(
    manifest.icons.map(({ sizes }) => sizes),
    ["192x192", "512x512"],
  );

  for (const locale of ["ko", "en", "ja", "zh-CN", "zh-TW", "es", "fr", "de"]) {
    assert.match(i18n, new RegExp(`code: "${locale.replace("-", "\\-")}"`));
  }
  assert.match(i18n, /DICTIONARIES\[locale\]\[key\] \?\? en\[key\]/);
  assert.match(controls, /beforeinstallprompt/);
  assert.match(
    controls,
    /navigator\.serviceWorker\.register\(withBasePath\("\/sw\.js"\)/,
  );
  assert.match(serviceWorker, /badgeflow-app-v2/);
  assert.match(serviceWorker, /self\.registration\.scope/);
  assert.match(serviceWorker, /cache\.put\(SCOPE_PATH, copy\)/);
  assert.match(serviceWorker, /request\.mode === "navigate"/);
});

test("keeps the desktop editor inside the dynamic viewport", async () => {
  const css = await readFile(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );

  assert.match(css, /@media \(min-width: 981px\)/);
  assert.match(css, /\.app-shell\s*{[^}]*height: 100dvh/s);
  assert.match(css, /\.main-content\s*{[^}]*overflow: hidden/s);
  assert.match(css, /\.canvas-stage\s*{[^}]*overflow: auto/s);
  assert.match(
    css,
    /@media \(max-width: 980px\)[\s\S]*?\.topbar\s*{[^}]*backdrop-filter: none/,
  );
});

test("defines a GitHub Pages static-export contract", async () => {
  const [nextConfig, packageJson, workflow, sitePaths] = await Promise.all([
    readFile(new URL("../next.config.ts", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(
      new URL("../.github/workflows/pages.yml", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../lib/site.ts", import.meta.url), "utf8"),
  ]);

  assert.match(nextConfig, /output: "export"/);
  assert.match(nextConfig, /basePath: "\/badgeflow"/);
  assert.match(packageJson, /"build:pages"/);
  assert.match(workflow, /actions\/upload-pages-artifact@v4/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
  assert.match(sitePaths, /NEXT_PUBLIC_BASE_PATH/);
});

test("renders a recoverable not-found page", async () => {
  const response = await render("/missing-page");
  assert.equal(response.status, 404);
  assert.match(await response.text(), /요청한 페이지를 찾을 수 없습니다/);
});
