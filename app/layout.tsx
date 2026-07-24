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
    "명찰을 디자인하고 CSV 데이터를 연결해 실제 크기 인쇄용 PDF를 만드는 웹 도구";

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
      description: "디자인부터 CSV 데이터 연결, 실제 크기 PDF 출력까지 한 번에",
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
      description: "디자인부터 CSV 데이터 연결, 실제 크기 PDF 출력까지 한 번에",
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
