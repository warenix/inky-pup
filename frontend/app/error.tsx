"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-10 text-center">
      <p className="text-7xl">😰</p>
      <h1 className="text-3xl font-black">Oops! Something tripped up.</h1>
      <p className="text-lg text-slate-500">
        Don&apos;t worry — your words are safe. Try again!
      </p>
      <button
        onClick={() => reset()}
        className="btn-kid rounded-2xl bg-green-500 px-6 py-4 text-xl font-black text-white shadow-lg hover:bg-green-600"
      >
        🔁 Try again
      </button>
    </main>
  );
}