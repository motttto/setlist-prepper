'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { Music2, ListMusic, Sparkles, ArrowRight } from 'lucide-react';

export default function Home() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [status, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-indigo-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-indigo-950">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <Music2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              Setlist Prepper
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost">Anmelden</Button>
            </Link>
            <Link href="/register">
              <Button>Registrieren</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">
            Plane deine Konzert-Visuals
          </h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-400 mb-8 max-w-2xl mx-auto">
            Organisiere Setlists mit detaillierten Visual-Beschreibungen, Beleuchtungsnotizen
            und Bühnenanweisungen. Alles verschlüsselt und sicher.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto">
                Kostenlos starten
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                Anmelden
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-24 max-w-5xl mx-auto">
          <div className="text-center p-6">
            <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ListMusic className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Detaillierte Setlists
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              Erfasse jeden Song mit Visual-Beschreibungen, Timing, Beleuchtung und Bühnenanweisungen.
            </p>
          </div>

          <div className="text-center p-6">
            <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Eigene Felder
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              Erstelle benutzerdefinierte Felder für deine spezifischen Workflow-Anforderungen.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Music2 className="w-5 h-5 text-zinc-400" />
            <span className="text-zinc-500 dark:text-zinc-500">
              Setlist Prepper
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-500">
            <Link href="/impressum" className="hover:text-zinc-700 dark:hover:text-zinc-300">
              Impressum
            </Link>
            <Link href="/datenschutz" className="hover:text-zinc-700 dark:hover:text-zinc-300">
              Datenschutz
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
