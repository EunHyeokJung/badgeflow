import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
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

test("server-renders the BadgeFlow editor", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>BadgeFlow \| 명찰 인쇄 스튜디오<\/title>/i);
  assert.match(html, /명찰 디자인/);
  assert.match(html, /이미지 · 로고/);
  assert.match(html, /image\/svg\+xml/);
  assert.match(html, /레이어/);
  assert.match(html, /가로 중앙/);
  assert.match(html, /세로 중앙/);
  assert.match(html, /PDF 만들기/);
  assert.doesNotMatch(html, /Your site is taking shape/);
});

test("keeps image editing, project backup, and PDF rendering connected", async () => {
  const [studio, css] = await Promise.all([
    readFile(
      new URL("../components/BadgeStudio.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(studio, /type ImageElement = CommonElement/);
  assert.match(studio, /async function readImageAsset/);
  assert.match(studio, /script, foreignObject, iframe, object, embed/);
  assert.match(studio, /function handleCanvasDrop/);
  assert.match(studio, /function moveElementLayer/);
  assert.match(studio, /function exportProject/);
  assert.match(studio, /function importProject/);
  assert.match(studio, /function undoElements/);
  assert.match(studio, /backgroundColor,\s+background,\s+backgroundFit,/);
  assert.match(studio, /for \(const element of elements\)/);
  assert.match(css, /\.badge-image-element/);
  assert.match(css, /\.layer-list/);
  assert.match(css, /\.alignment-guide/);
});
