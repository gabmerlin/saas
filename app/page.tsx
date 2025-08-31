export default function Page() {
  return (
    <main className="min-h-dvh grid place-items-center bg-gray-50">
      <div className="rounded-xl border p-6 shadow-sm bg-white">
        <h1 className="text-2xl font-bold">Setup OK ✅</h1>
        <p className="text-sm text-gray-500 mt-1">Tailwind v4 + Next.js + shadcn sont opérationnels.</p>
        <button className="mt-4 inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-gray-100">
          Bouton simple (shadcn viendra ensuite)
        </button>
      </div>
    </main>
  );
}
