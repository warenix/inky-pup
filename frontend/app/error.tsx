"use client";

import { useEffect } from "react";
import { useT } from "../components/LocaleProvider";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-10 text-center">
      <p className="text-7xl">😰</p>
      <h1 className="text-3xl font-black">{t("errorPage.title")}</h1>
      <p className="text-lg text-slate-500">{t("errorPage.body")}</p>
      <button
        onClick={() => reset()}
        className="btn-action bg-green-500 text-white hover:bg-green-600"
      >
        {t("errorPage.retry")}
      </button>
    </main>
  );
}
