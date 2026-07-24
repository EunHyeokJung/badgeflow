import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ||
    requestHeaders.get("host") ||
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ||
    (host.includes("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const title = "BadgeFlow | 명찰 인쇄 스튜디오";
  const description =
    "대표 명찰 규격을 선택하고 디자인과 명단을 연결해 실제 크기 PDF로 출력하는 웹 도구";

  return {
    metadataBase: new URL(origin),
    title,
    description,
    icons: {
      icon: "/favicon.png",
      shortcut: "/favicon.png",
    },
    openGraph: {
      title,
      description: "명찰 크기 선택부터 디자인, 명단 연결, 실제 크기 PDF까지",
      type: "website",
      images: [
        {
          url: `${origin}/og.png`,
          width: 1536,
          height: 1024,
          alt: "BadgeFlow 명찰 인쇄 스튜디오",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: "명찰 크기 선택부터 디자인, 명단 연결, 실제 크기 PDF까지",
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
