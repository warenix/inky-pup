"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <main className="mx-auto max-w-2xl space-y-4 px-4 py-10 text-center">
          <p className="text-7xl">⚠️</p>
          <h1 className="text-3xl font-black">Something went wrong</h1>
          <p className="text-lg text-slate-500">{error.message}</p>
          <button
            onClick={() => reset()}
            className="btn-action bg-green-500 text-white hover:bg-green-600"
          >
            🔁 Reload
          </button>
        </main>
      </body>
    </html>
  );
}