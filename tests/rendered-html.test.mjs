import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) => {
        const path = `${directory}/${entry.name}`;
        return entry.isDirectory() ? collectFiles(path) : [path];
      }),
    )
  ).flat();
}

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

test("server-renders the LanyardStudio size-first landing page", async () => {
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
  assert.match(html, /<title>LanyardStudio \| 명찰 인쇄 스튜디오<\/title>/i);
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
  assert.match(html, /시중 상품 예시/);
  assert.match(html, /하나제이 미디어명찰 세로/);
  assert.match(html, /하나제이 고급 미디어명찰 세로/);
  assert.match(html, /고무나라 700 미디어 목걸이명찰 세로/);
  assert.match(html, /Bigpoint 보호형 카드 포켓 A7 세로/);
  assert.match(html, /알파 클리어케이스 B7 세로형/);
  assert.match(html, /아트사인 신분증W케이스 가로/);
  assert.match(html, /두성종이 OA팬시페이퍼 180g/);
  assert.match(html, /네임모아 스마트명찰 가로/);
  assert.match(html, /구매 전 95 × 123 mm 내지 규격을 확인/);
  assert.match(html, /규격 직접 입력/);
  assert.match(html, /이 규격으로 만들기/);
  assert.doesNotMatch(html, /이 규격으로 시작/);
  assert.doesNotMatch(html, /POPULAR SIZES/);
  assert.doesNotMatch(html, /크기부터 인쇄까지 한 번에/);
  assert.doesNotMatch(html, /Your site is taking shape/);
});

test("keeps production editing, project storage, and PDF rendering connected", async () => {
  const [studio, storage, css, logo] = await Promise.all([
    readFile(
      new URL("../components/BadgeStudio.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../lib/lanyardstudio/storage.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(
      new URL("../public/brand/lanyardstudio-mark.svg", import.meta.url),
      "utf8",
    ),
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
  assert.match(studio, /disabled={!savedProjects\.length}/);
  assert.match(studio, /className="saved-project-dialog"/);
  assert.match(studio, /savedProjects\.map\(\(project\) =>/);
  assert.match(studio, /onOpenProject={openSavedProject}/);
  assert.match(studio, /onDeleteProject={removeSavedProject}/);
  assert.match(studio, /onRenameProject={renameSavedProject}/);
  assert.match(studio, /className="saved-project-rename-form"/);
  assert.match(studio, /className="editor-project-name"/);
  assert.match(studio, /normalizeProjectName/);
  assert.match(studio, /role="dialog"/);
  assert.match(studio, /aria-modal="true"/);
  assert.match(studio, /document\.addEventListener\("keydown", closeOnEscape\)/);
  assert.match(studio, /function startWithPreset/);
  assert.match(studio, /async function readImageAsset/);
  assert.match(studio, /script, foreignObject, iframe, object, embed/);
  assert.match(studio, /function handleCanvasDrop/);
  assert.match(studio, /function moveElementLayer/);
  assert.match(studio, /function exportProject/);
  assert.match(studio, /function importProject/);
  assert.match(studio, /const PROJECT_FORMAT = "lanyardstudio"/);
  assert.match(studio, /format: PROJECT_FORMAT/);
  assert.match(studio, /\.lanyardstudio\.json/);
  assert.match(studio, /function normalizeProject/);
  assert.match(studio, /MAX_ROWS = 500/);
  assert.match(studio, /const undoElements = useCallback/);
  assert.match(studio, /const undoData = useCallback/);
  assert.match(studio, /mode === "data"/);
  assert.match(studio, /className="data-add-actions"/);
  assert.match(studio, /newColumnVariable/);
  assert.doesNotMatch(studio, /\{t\("addRow"\)\}/);
  assert.match(studio, /type ResizeState =/);
  assert.match(studio, /function handleResizePointerDown/);
  assert.match(studio, /onResizePointerDown={handleResizePointerDown}/);
  assert.match(studio, /event\.key === "Delete" \|\| event\.key === "Backspace"/);
  assert.match(studio, /deleteSelectedFromShortcut/);
  assert.match(studio, /className="panel-section variable-connections"/);
  assert.match(studio, /connectedElementCount/);
  assert.match(studio, /noLinkedElements/);
  assert.match(studio, /type InspectorSheetState =/);
  assert.match(studio, /handleInspectorSheetPointerDown/);
  assert.match(studio, /className={`panel right-panel inspector-sheet/);
  assert.match(studio, /className={`inspector-sheet-scrim/);
  assert.match(studio, /inspectorSheetState === "expanded"/);
  assert.match(
    studio,
    /inspectorSheetState === "collapsed" \? "half" : "collapsed"/,
  );
  assert.match(studio, /className="inspector-sheet-handle"/);
  assert.match(studio, /backgroundColor,\s+background,\s+backgroundFit,/);
  assert.match(studio, /for \(const element of elements\)/);
  assert.doesNotMatch(
    studio,
    /SETUP|INSPECTOR|DATA SOURCE|SCHEMA|PRINT PREVIEW|REFERENCE READY/,
  );
  assert.doesNotMatch(studio, /className="eyebrow"/);
  assert.doesNotMatch(
    studio,
    /<h2>\{t\("elementProperties"\)\}<\/h2>/,
  );
  assert.doesNotMatch(studio, /Settings2/);
  assert.match(css, /\.badge-image-element/);
  assert.match(css, /\.preset-grid/);
  assert.match(css, /\.preset-card\.is-selected/);
  assert.match(css, /\.preset-products/);
  assert.match(css, /\.preset-product-item/);
  assert.match(css, /\.preset-card\.is-selected\s*{[^}]*background: #eff6ff/s);
  assert.doesNotMatch(
    css,
    /\.preset-card\.is-featured\s*{[^}]*background: #1e3a8a/s,
  );
  assert.match(css, /\.preset-actions/);
  assert.match(css, /\.create-selected-preset-button/);
  assert.match(css, /\.service-overview/);
  assert.match(css, /\.feature-story/);
  assert.match(css, /\.feature-editor-layout/);
  assert.match(css, /\.feature-data-layout/);
  assert.match(css, /\.feature-print-layout/);
  assert.match(css, /\.landing-start-menu/);
  assert.match(css, /\.saved-project-overlay/);
  assert.match(css, /\.saved-project-list/);
  assert.match(css, /\.saved-project-delete/);
  assert.match(css, /\.saved-project-rename-form/);
  assert.match(
    css,
    /@media \(min-width: 681px\) and \(max-width: 980px\)/,
  );
  assert.match(css, /\.right-panel\.inspector-sheet\s*{[^}]*position: fixed/s);
  assert.match(css, /touch-action: none/);
  assert.match(css, /\.inspector-sheet-grip\s*{[^}]*place-items: center/s);
  assert.match(css, /\.inspector-sheet-handle\s*{[^}]*width: 40px/s);
  assert.match(css, /\.editor-project-name/);
  assert.match(css, /\.landing-shell:lang\(ko\)\s*{[^}]*word-break: keep-all/s);
  assert.match(css, /\.service-overview-heading\s*{[^}]*max-width: 900px/s);
  assert.match(css, /\.service-overview-heading h2[^{]*{[^}]*text-wrap: balance/s);
  assert.match(css, /\.service-overview-heading p[^{]*{[^}]*text-wrap: pretty/s);
  assert.match(css, /\.preset-mini-sheet/);
  assert.match(css, /\.fold-guide/);
  assert.match(css, /\.table-tent-panel\.is-reversed/);
  assert.doesNotMatch(css, /\.eyebrow|\.landing-kicker|\.reference-kicker/);
  assert.match(css, /\.layer-list/);
  assert.match(css, /\.alignment-guide/);
  assert.match(css, /\.selection-handle\s*{[^}]*width: 16px/s);
  assert.match(css, /\.variable-connection-list/);
  assert.match(css, /\.data-add-actions/);
  assert.match(storage, /indexedDB\.open/);
  assert.match(storage, /LOCAL_PROJECTS_KEY/);
  assert.match(storage, /PREVIOUS_DATABASE_TOKEN/);
  assert.match(storage, /ensureIndexedDbMigration/);
  assert.match(storage, /PROJECT_KEY_PREFIX/);
  assert.match(storage, /export async function listProjectDrafts/);
  assert.match(storage, /export async function deleteProjectDraft/);
  assert.match(storage, /makeLegacyProject/);
  assert.match(logo, /A lanyard and badge symbol/);
  assert.match(logo, /linearGradient id="bg"/);
});

test("keeps Cloudflare Pages and optional GA4 deployment configuration portable", async () => {
  const [layout, analytics, nextConfig, packageJson, cloudflareHeaders] =
    await Promise.all([
      readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
      readFile(
        new URL("../components/GoogleAnalytics.tsx", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../next.config.ts", import.meta.url), "utf8"),
      readFile(new URL("../package.json", import.meta.url), "utf8"),
      readFile(new URL("../public/_headers", import.meta.url), "utf8"),
    ]);

  assert.match(layout, /<body>[\s\S]*<GoogleAnalytics \/>[\s\S]*<\/body>/);
  assert.match(analytics, /NEXT_PUBLIC_GA_MEASUREMENT_ID/);
  assert.match(analytics, /service_name/);
  assert.match(analytics, /return null/);
  assert.doesNotMatch(analytics, /G-[A-Z0-9]{6,}/);
  assert.match(nextConfig, /STATIC_EXPORT/);
  assert.match(nextConfig, /NEXT_PUBLIC_BASE_PATH/);
  assert.match(packageJson, /build:cloudflare-pages/);
  assert.match(packageJson, /lanyardstudio\.silverhyeok\.dev/);
  assert.match(cloudflareHeaders, /Content-Security-Policy/);
  assert.match(cloudflareHeaders, /www\.googletagmanager\.com/);
  assert.match(cloudflareHeaders, /google-analytics\.com/);
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
  assert.equal(manifest.name, "LanyardStudio 명찰 인쇄 스튜디오");
  assert.equal(manifest.short_name, "LanyardStudio");
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
  assert.match(i18n, /continueDraft: "저장된 프로젝트 이어하기"/);
  assert.match(i18n, /projectName: "프로젝트 이름"/);
  assert.match(i18n, /variableConnections: "변수"/);
  assert.doesNotMatch(i18n, /저장된 작업|작업 단계|작업 순서/);
  assert.match(controls, /beforeinstallprompt/);
  assert.match(
    controls,
    /navigator\.serviceWorker\.register\(withBasePath\("\/sw\.js"\)/,
  );
  assert.match(serviceWorker, /lanyardstudio-app-v2/);
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
  const [nextConfig, packageJson, workflow, sitePaths, readme, readmeEn] =
    await Promise.all([
      readFile(new URL("../next.config.ts", import.meta.url), "utf8"),
      readFile(new URL("../package.json", import.meta.url), "utf8"),
      readFile(
        new URL("../.github/workflows/pages.yml", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../lib/site.ts", import.meta.url), "utf8"),
      readFile(new URL("../README.md", import.meta.url), "utf8"),
      readFile(new URL("../README.en.md", import.meta.url), "utf8"),
    ]);

  assert.match(nextConfig, /output: "export"/);
  assert.match(nextConfig, /basePath/);
  assert.match(nextConfig, /NEXT_PUBLIC_BASE_PATH/);
  assert.match(packageJson, /"build:pages"/);
  assert.match(packageJson, /NEXT_PUBLIC_BASE_PATH=\/lanyardstudio/);
  assert.match(packageJson, /eunhyeokjung\.github\.io\/lanyardstudio/);
  assert.match(workflow, /actions\/upload-pages-artifact@v4/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
  assert.match(sitePaths, /NEXT_PUBLIC_BASE_PATH/);
  assert.match(sitePaths, /lanyardstudio\.silverhyeok\.dev/);
  assert.match(packageJson, /EunHyeokJung\/lanyardstudio/);
  assert.match(readme, /EunHyeokJung\/lanyardstudio/);
  assert.match(readmeEn, /EunHyeokJung\/lanyardstudio/);
});

test("renders a recoverable not-found page", async () => {
  const response = await render("/missing-page");
  assert.equal(response.status, 404);
  assert.match(await response.text(), /요청한 페이지를 찾을 수 없습니다/);
});

test("keeps the retired identity out of deployable output", async () => {
  const retiredIdentity = Buffer.from("YmFkZ2VmbG93", "base64").toString(
    "utf8",
  );
  const distPath = new URL("../dist", import.meta.url).pathname;
  const files = await collectFiles(distPath);
  for (const file of files) {
    const contents = await readFile(file);
    assert.equal(
      contents.toString("utf8").toLowerCase().includes(retiredIdentity),
      false,
      `${file} contains the retired identity`,
    );
  }
});
