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
  assert.match(html, /대표 명찰 규격/);
  assert.match(html, /목걸이 명찰 · 대형 95 × 123 mm로 시작/);
  assert.match(html, /A7 행사 명찰/);
  assert.match(html, /B7 컨퍼런스 패스/);
  assert.match(html, /CR80 · ID-1/);
  assert.match(html, /원하는 규격을 직접 입력할게요/);
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
  assert.match(studio, /function LandingPage/);
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
  assert.match(css, /\.badge-image-element/);
  assert.match(css, /\.preset-grid/);
  assert.match(css, /\.layer-list/);
  assert.match(css, /\.alignment-guide/);
  assert.match(storage, /indexedDB\.open/);
  assert.match(storage, /LEGACY_LOCAL_STORAGE_KEY/);
});

test("renders a recoverable not-found page", async () => {
  const response = await render("/missing-page");
  assert.equal(response.status, 404);
  assert.match(await response.text(), /요청한 페이지를 찾을 수 없습니다/);
});
