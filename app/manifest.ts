import type { MetadataRoute } from "next";
import { withBasePath } from "@/lib/site";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LanyardStudio 명찰 인쇄 스튜디오",
    short_name: "LanyardStudio",
    description:
      "명찰 크기 선택부터 디자인, 명단 연결, 실제 크기 PDF 출력까지",
    id: withBasePath("/"),
    start_url: withBasePath("/"),
    scope: withBasePath("/"),
    display: "standalone",
    background_color: "#f3f6fb",
    theme_color: "#2563eb",
    lang: "ko",
    icons: [
      {
        src: withBasePath("/icons/icon-192.png"),
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: withBasePath("/icons/icon-512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    shortcuts: [
      {
        name: "LanyardStudio",
        short_name: "LanyardStudio",
        url: withBasePath("/"),
        icons: [
          {
            src: withBasePath("/icons/icon-192.png"),
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
    ],
  };
}
