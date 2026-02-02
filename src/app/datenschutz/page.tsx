import Link from 'next/link';
import { Music2, ArrowLeft } from 'lucide-react';

// Server Component - kann process.env direkt nutzen
const name = process.env.LEGAL_NAME || '[Name nicht konfiguriert]';
const street = process.env.LEGAL_STREET || '[Straße nicht konfiguriert]';
const city = process.env.LEGAL_CITY || '[Stadt nicht konfiguriert]';
const email = process.env.LEGAL_EMAIL || '[E-Mail nicht konfiguriert]';

export default function DatenschutzPage() {
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
          Datenschutzerklärung
        </h1>

        <div className="prose dark:prose-invert max-w-none space-y-6 text-zinc-700 dark:text-zinc-300">
          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
              1. Datenschutz auf einen Blick
            </h2>
            <h3 className="text-lg font-medium text-zinc-800 dark:text-zinc-200 mb-2">
              Allgemeine Hinweise
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren
              personenbezogenen Daten passiert, wenn Sie diese Website besuchen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
              2. Verantwortliche Stelle
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              {name}<br />
              {street}<br />
              {city}<br />
              E-Mail: {email}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
              3. Datenerfassung auf dieser Website
            </h2>
            <h3 className="text-lg font-medium text-zinc-800 dark:text-zinc-200 mb-2">
              Welche Daten werden erfasst?
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              Wir erfassen folgende Daten bei der Nutzung dieser Anwendung:
            </p>
            <ul className="list-disc list-inside text-zinc-600 dark:text-zinc-400 mb-4 space-y-1">
              <li>E-Mail-Adresse (für die Registrierung und Anmeldung)</li>
              <li>Name (optional, bei der Registrierung)</li>
              <li>Setlist-Daten (Song-Titel, Notizen, Visual-Beschreibungen)</li>
            </ul>
            <h3 className="text-lg font-medium text-zinc-800 dark:text-zinc-200 mb-2">
              Wie erfassen wir Ihre Daten?
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen (z.B. bei
              der Registrierung). Andere Daten werden automatisch beim Besuch der Website durch
              unsere IT-Systeme erfasst.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
              4. Hosting
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              Diese Website wird bei einem externen Dienstleister gehostet (Hoster). Die
              personenbezogenen Daten, die auf dieser Website erfasst werden, werden auf den
              Servern des Hosters gespeichert.
            </p>
            <p className="text-zinc-600 dark:text-zinc-400 mt-2">
              <strong>Vercel:</strong> Hosting der Webanwendung<br />
              <strong>Supabase:</strong> Datenbankspeicherung (EU-Server)
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
              5. Datensicherheit
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              Die Übertragung aller Daten erfolgt verschlüsselt über HTTPS. Geteilte Setlists
              sind zusätzlich durch ein Passwort geschützt, das als Hash gespeichert wird.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
              6. Ihre Rechte
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              Sie haben jederzeit das Recht:
            </p>
            <ul className="list-disc list-inside text-zinc-600 dark:text-zinc-400 space-y-1">
              <li>Auskunft über Ihre gespeicherten Daten zu erhalten</li>
              <li>Berichtigung unrichtiger Daten zu verlangen</li>
              <li>Löschung Ihrer Daten zu verlangen</li>
              <li>Die Einschränkung der Verarbeitung zu verlangen</li>
              <li>Der Verarbeitung zu widersprechen</li>
              <li>Datenübertragbarkeit zu verlangen</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
              7. Cookies
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              Diese Website verwendet nur technisch notwendige Cookies für die Authentifizierung
              (Session-Cookies). Es werden keine Tracking- oder Marketing-Cookies verwendet.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
              8. Kontakt bei Datenschutzfragen
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              Bei Fragen zum Datenschutz wenden Sie sich bitte an: {email}
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-zinc-200 dark:border-zinc-700">
          <Link
            href="/impressum"
            className="text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Impressum
          </Link>
        </div>
      </div>
    </div>
  );
}
