'use client';

import { useState, useEffect } from 'react';
import { Button, Input, Card, ConfirmModal } from './ui';
import { Share2, Copy, Check, X, Link2, Loader2 } from 'lucide-react';

interface ShareDialogProps {
  setlistId: string;
  setlistTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareDialog({
  setlistId,
  setlistTitle,
  isOpen,
  onClose,
}: ShareDialogProps) {
  const [isShared, setIsShared] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadShareStatus();
    }
  }, [isOpen, setlistId]);

  const loadShareStatus = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/setlists/${setlistId}/share`);
      const data = await response.json();

      if (data.data) {
        setIsShared(data.data.isShared);
        setShareUrl(data.data.shareUrl || '');
      }
    } catch (err) {
      console.error('Error loading share status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnableShare = async () => {
    if (!password || password.length < 4) {
      setError('Passwort muss mindestens 4 Zeichen haben');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/setlists/${setlistId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Aktivieren');
      }

      setIsShared(true);
      setShareUrl(data.data.shareUrl);
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Aktivieren');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisableShare = async () => {
    setShowDisableConfirm(false);
    setIsSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/setlists/${setlistId}/share`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Fehler beim Deaktivieren');
      }

      setIsShared(false);
      setShareUrl('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Deaktivieren');
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
            <Share2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Gig teilen
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {setlistTitle}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        ) : isShared ? (
          <div className="space-y-4">
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-300 font-medium mb-1">
                Teilen ist aktiviert
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                Jeder mit dem Link und Passwort kann diesen Gig sehen und bearbeiten
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Share-Link
              </label>
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 overflow-hidden">
                  <Link2 className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{shareUrl}</span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={copyToClipboard}
                  className="flex-shrink-0"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Teile den Link zusammen mit dem Passwort, das du beim Aktivieren festgelegt hast.
            </p>

            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowDisableConfirm(true)}
                isLoading={isSaving}
                className="text-red-600 hover:text-red-700"
              >
                Teilen deaktivieren
              </Button>
            </div>

            <ConfirmModal
              isOpen={showDisableConfirm}
              onClose={() => setShowDisableConfirm(false)}
              onConfirm={handleDisableShare}
              title="Teilen deaktivieren"
              message="Möchtest du das Teilen wirklich deaktivieren? Der Share-Link funktioniert dann nicht mehr und andere können den Gig nicht mehr bearbeiten."
              confirmText="Ja, deaktivieren"
              cancelText="Abbrechen"
              variant="danger"
              isLoading={isSaving}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Aktiviere das Teilen, damit deine Band diesen Gig bearbeiten kann.
              Du legst ein Passwort fest, das du mit deiner Band teilst.
            </p>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <Input
              label="Passwort für den Share-Link"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="z.B. bandname2025"
            />

            <Button onClick={handleEnableShare} isLoading={isSaving} className="w-full">
              <Share2 className="w-4 h-4 mr-2" />
              Teilen aktivieren
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
