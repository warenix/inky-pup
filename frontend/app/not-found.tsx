import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-10 text-center">
      <p className="text-7xl">🗺️</p>
      <h1 className="text-3xl font-black">Page not found</h1>
      <p className="text-lg text-slate-500">That page wandered off!</p>
      <Link
        href="/"
        className="btn-action bg-green-500 text-white hover:bg-green-600"
      >
        🏠 Home
      </Link>
    </main>
  );
}