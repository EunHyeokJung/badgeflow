const DEFAULT_SITE_URL = "https://lanyard-studio.com/";

function normalizeBasePath(value: string | undefined) {
  const trimmed = value?.trim().replace(/^\/+|\/+$/g, "") ?? "";
  return trimmed ? `/${trimmed}` : "";
}

export const BASE_PATH = normalizeBasePath(
  process.env.NEXT_PUBLIC_BASE_PATH,
);

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL
).replace(/\/?$/, "/");

export function withBasePath(pathname = "/") {
  const normalizedPath = `/${pathname.replace(/^\/+/, "")}`;
  return normalizedPath === "/"
    ? `${BASE_PATH}/`
    : `${BASE_PATH}${normalizedPath}`;
}

export function absoluteSiteUrl(pathname = "/") {
  const origin = new URL(SITE_URL).origin;
  return new URL(withBasePath(pathname), `${origin}/`).toString();
}
