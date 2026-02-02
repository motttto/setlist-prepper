import Link from 'next/link';
import { Music2, ArrowLeft } from 'lucide-react';

// Server Component - kann process.env direkt nutzen
const name = process.env.LEGAL_NAME || '[Name nicht konfiguriert]';
const street = process.env.LEGAL_STREET || '[Straße nicht konfiguriert]';
const city = process.env.LEGAL_CITY || '[Stadt nicht konfiguriert]';
const email = process.env.LEGAL_EMAIL || '[E-Mail nicht konfiguriert]';

export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-indigo-600 rounded-lg">
            <Music2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Setlist Prepper
          </span>
        </div>

        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-8">
          Impressum
        </h1>

        <div className="prose dark:prose-invert max-w-none space-y-6 text-zinc-700 dark:text-zinc-300">
          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
              Angaben gemäß § 5 TMG
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              {name}<br />
              {street}<br />
              {city}<br />
              Deutschland
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
              Kontakt
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              E-Mail: {email}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
              Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              {name}<br />
              {street}<br />
              {city}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
              Haftungsausschluss
            </h2>
            <h3 className="text-lg font-medium text-zinc-800 dark:text-zinc-200 mb-2">
              Haftung für Inhalte
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit,
              Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen.
            </p>
            <h3 className="text-lg font-medium text-zinc-800 dark:text-zinc-200 mb-2">
              Haftung für Links
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              Unser Angebot enthält Links zu externen Webseiten Dritter, auf deren Inhalte wir keinen
              Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-zinc-200 dark:border-zinc-700">
          <Link
            href="/datenschutz"
            className="text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Datenschutzerklärung
          </Link>
        </div>
      </div>
    </div>
  );
}
