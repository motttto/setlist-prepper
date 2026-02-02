'use client';

import { useState } from 'react';
import { SetlistMetadata } from '@/types';
import { Button, Card } from './ui';
import {
  Music2,
  Plus,
  Calendar,
  MapPin,
  Trash2,
  Share2,
  Users,
  Edit3,
  Play,
} from 'lucide-react';
import ShareDialog from './ShareDialog';

interface GigsListProps {
  gigs: SetlistMetadata[];
  selectedGigId: string | null;
  onSelectGig: (id: string) => void;
  onDeleteGig: (id: string, title: string) => void;
  onNewGig: () => void;
  onEditGig: (id: string) => void;
  isLoading: boolean;
}

export default function GigsList({
  gigs,
  selectedGigId,
  onSelectGig,
  onDeleteGig,
  onNewGig,
  onEditGig,
  isLoading,
}: GigsListProps) {
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareGig, setShareGig] = useState<SetlistMetadata | null>(null);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'gerade eben';
    if (diffMins < 60) return `vor ${diffMins} Min.`;
    if (diffHours < 24) return `vor ${diffHours} Std.`;
    if (diffDays === 1) return 'gestern';
    if (diffDays < 7) return `vor ${diffDays} Tagen`;
    return formatDate(dateString);
  };

  const openShareDialog = (gig: SetlistMetadata, e: React.MouseEvent) => {
    e.stopPropagation();
    setShareGig(gig);
    setShareDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse p-4 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700"
          >
            <div className="h-5 bg-zinc-200 dark:bg-zinc-700 rounded w-2/3 mb-3" />
            <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-1/2 mb-2" />
            <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
          Meine Gigs
        </h2>
        <Button onClick={onNewGig} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Neu
        </Button>
      </div>

      {/* Gig List */}
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {gigs.length === 0 ? (
          <div className="text-center py-8">
            <Music2 className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              Noch keine Gigs
            </p>
            <Button onClick={onNewGig} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Ersten Gig erstellen
            </Button>
          </div>
        ) : (
          gigs.map((gig) => (
            <div
              key={gig.id}
              onClick={() => onSelectGig(gig.id)}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                selectedGigId === gig.id
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-400 dark:border-indigo-600'
                  : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-indigo-300 dark:hover:border-indigo-600'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3
                      className={`font-medium truncate ${
                        selectedGigId === gig.id
                          ? 'text-indigo-700 dark:text-indigo-300'
                          : 'text-zinc-900 dark:text-zinc-100'
                      }`}
                    >
                      {gig.title}
                    </h3>
                    {gig.isShared && (
                      <Users className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                    )}
                  </div>

                  <div className="mt-1 space-y-0.5">
                    {(gig.eventDate || gig.startTime) && (
                      <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                        <Calendar className="w-3 h-3" />
                        {formatDate(gig.eventDate)}
                        {gig.startTime && (
                          <span className="flex items-center gap-1 ml-1">
                            <Play className="w-3 h-3" />
                            {gig.startTime} Uhr
                          </span>
                        )}
                      </div>
                    )}
                    {gig.venue && (
                      <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{gig.venue}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-500">
                      <span>{gig.songCount} {gig.songCount === 1 ? 'Song' : 'Songs'}</span>
                      <span title={`Zuletzt bearbeitet: ${new Date(gig.updatedAt).toLocaleString('de-DE')}`}>
                        {formatRelativeTime(gig.updatedAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-1 mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-700">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditGig(gig.id);
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded transition-colors"
                >
                  <Edit3 className="w-3 h-3" />
                  Bearbeiten
                </button>
                <button
                  onClick={(e) => openShareDialog(gig, e)}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded transition-colors"
                >
                  <Share2 className="w-3 h-3" />
                  Teilen
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteGig(gig.id, gig.title);
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Löschen
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Share Dialog */}
      {shareGig && (
        <ShareDialog
          setlistId={shareGig.id}
          setlistTitle={shareGig.title}
          isOpen={shareDialogOpen}
          onClose={() => {
            setShareDialogOpen(false);
            setShareGig(null);
          }}
        />
      )}
    </div>
  );
}
