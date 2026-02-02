'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { Music2, LogOut } from 'lucide-react';

export default function Header() {
  const { data: session } = useSession();

  return (
    <header className="flex-shrink-0 h-12 bg-white dark:bg-zinc-900 border-b border-zinc-300 dark:border-zinc-800 px-4 flex items-center justify-between">
      <Link href="/dashboard" className="flex items-center gap-2">
        <div className="p-1.5 bg-indigo-600 rounded-md">
          <Music2 className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
          Setlist Prepper
        </span>
      </Link>

      <div className="flex items-center gap-3">
        <span className="text-xs text-zinc-600 dark:text-zinc-400 hidden sm:block">
          {session?.user?.email}
        </span>
        <button
          onClick={() => signOut()}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Abmelden</span>
        </button>
      </div>
    </header>
  );
}
