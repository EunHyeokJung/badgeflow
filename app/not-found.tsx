"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function NotFound() {
  const { t } = useI18n();

  return (
    <main className="error-page">
      <section>
        <span className="error-code">404</span>
        <h1>{t("notFoundTitle")}</h1>
        <p>{t("notFoundHelp")}</p>
        <Link href="/">{t("goHome")}</Link>
      </section>
    </main>
  );
}
