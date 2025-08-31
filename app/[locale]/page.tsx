'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function LocaleHome() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? 'fr';

  return (
    <main className="min-h-dvh grid place-items-center p-6">
      <div className="rounded-xl border p-6 shadow-sm bg-white max-w-lg w-full">
        <h1 className="text-2xl font-bold">Setup OK ✅</h1>
        <p className="text-sm text-gray-500 mt-1">
          Locale active : <span className="font-mono">{locale}</span>
        </p>

        <div className="mt-4 space-x-2">
         import Link from next/link;
            <Link
            className="inline-flex rounded-md border px-3 py-2 text-sm hover:bg-gray-100"
            href="/fr"
            >
            /fr
            </Link>
            <Link
            className="inline-flex rounded-md border px-3 py-2 text-sm hover:bg-gray-100"
            href="/en"
            >
            /en
            </Link>
        </div>
      </div>
    </main>
  );
}
