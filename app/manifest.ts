import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BadgeFlow 명찰 인쇄 스튜디오",
    short_name: "BadgeFlow",
    description:
      "명찰 크기 선택부터 디자인, 명단 연결, 실제 크기 PDF 출력까지",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f6fb",
    theme_color: "#2563eb",
    lang: "ko",
    icons: [
      {
        src: "/favicon.png",
        sizes: "64x64",
        type: "image/png",
      },
    ],
  };
}
