import type { Metadata, Viewport } from "next";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import {
  absoluteSiteUrl,
  SITE_URL,
  withBasePath,
} from "@/lib/site";
import "./globals.css";

const title = "LanyardStudio | 명찰 인쇄 스튜디오";
const description =
  "대표 명찰 규격을 선택하고 디자인과 명단을 연결해 실제 크기 PDF로 출력하는 웹 도구";
const socialDescription =
  "명찰 크기 선택부터 디자인, 명단 연결, 실제 크기 PDF까지";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description,
  alternates: {
    canonical: SITE_URL,
  },
  icons: {
    icon: withBasePath("/icons/icon-192.png"),
    shortcut: withBasePath("/favicon.png"),
    apple: withBasePath("/icons/apple-touch-icon.png"),
  },
  openGraph: {
    title,
    description: socialDescription,
    type: "website",
    url: SITE_URL,
    images: [
      {
        url: absoluteSiteUrl("/og.png"),
        width: 1536,
        height: 1024,
        alt: "LanyardStudio 명찰 인쇄 스튜디오",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description: socialDescription,
    images: [absoluteSiteUrl("/og.png")],
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        {children}
        <GoogleAnalytics />
      </body>
    </html>
  );
}
