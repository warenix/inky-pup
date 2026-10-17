"use client";

import Link from "next/link";
import { useT } from "../components/LocaleProvider";

export default function NotFound() {
  const t = useT();

  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-10 text-center">
      <p className="text-7xl">{t("notFound.icon")}</p>
      <h1 className="text-3xl font-black">{t("notFound.title")}</h1>
      <p className="text-lg text-slate-500">{t("notFound.body")}</p>
      <Link
        href="/"
        className="btn-action inline-block"
      >
        {t("notFound.home")}
      </Link>
    </main>
  );
}
