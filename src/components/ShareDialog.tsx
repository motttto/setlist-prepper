'use client';

import { useState, useEffect } from 'react';
import { Button, Input, Card, ConfirmModal } from './ui';
import { Share2, Copy, Check, X, Link2, Loader2, Users, Shield } from 'lucide-react';
import { Stage, Act } from '@/types';

interface ShareDialogProps {
  setlistId: string;
  setlistTitle: string;
  isOpen: boolean;
  onClose: () => void;
  stages?: Stage[];  // For act selection dropdown
  preselectedActId?: string;  // When opened from act share button
}

export default function ShareDialog({
  setlistId,
  setlistTitle,
  isOpen,
  onClose,
  stages = [],
  preselectedActId,
}: ShareDialogProps) {
  const [isShared, setIsShared] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [selectedActId, setSelectedActId] = useState<string>(preselectedActId || '');
  const [selectedRole, setSelectedRole] = useState<'band' | 'orga'>('band');
  const [sharedActId, setSharedActId] = useState<string | null>(null);
  const [sharedActName, setSharedActName] = useState<string | null>(null);
  const [sharedRole, setSharedRole] = useState<'band' | 'orga'>('band');

  // Flatten all acts from all stages for the dropdown
  const allActs: Act[] = stages.flatMap(stage => stage.acts || []);

  useEffect(() => {
    if (isOpen) {
      loadShareStatus();
      // Set preselected act when dialog opens
      if (preselectedActId) {
        setSelectedActId(preselectedActId);
      }
    }
  }, [isOpen, setlistId, preselectedActId]);

  const loadShareStatus = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/setlists/${setlistId}/share`);
      const data = await response.json();

      if (data.data) {
        setIsShared(data.data.isShared);
        setShareUrl(data.data.shareUrl || '');
        setSharedActId(data.data.sharedActId || null);
        setSharedActName(data.data.sharedActName || null);
        setSharedRole(data.data.shareRole || 'band');
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
        body: JSON.stringify({
          password,
          actId: selectedActId || null,  // null = full event
          role: selectedRole,  // 'band' or 'orga'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Aktivieren');
      }

      setIsShared(true);
      setShareUrl(data.data.shareUrl);
      setSharedActId(data.data.sharedActId || null);
      setSharedRole(data.data.shareRole || 'band');
      // Get act name from local data
      if (selectedActId) {
        const act = allActs.find(a => a.id === selectedActId);
        setSharedActName(act?.name || null);
      } else {
        setSharedActName(null);
      }
      setPassword('');
      setSelectedActId('');
      setSelectedRole('band');
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
      setSharedActId(null);
      setSharedActName(null);
      setSharedRole('band');
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
              <p className="text-sm text-green-700 dark:text-green-300 font-medium mb-1 flex items-center gap-2">
                <Users className="w-4 h-4" />
                {sharedActId ? `"${sharedActName}" wird geteilt` : 'Ganzes Event wird geteilt'}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Rolle: {sharedRole === 'orga' ? 'Orga (kann alles bearbeiten)' : 'Band (nur Songs & Visuals)'}
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

            {/* Scope Selection - only show if there are acts */}
            {allActs.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Was teilen?
                </label>
                <select
                  value={selectedActId}
                  onChange={(e) => setSelectedActId(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg text-zinc-900 dark:text-zinc-100 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Ganzes Event (Orga)</option>
                  {allActs.map(act => (
                    <option key={act.id} value={act.id}>
                      {act.name} ({act.type})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {selectedActId
                    ? 'Nur dieser Act wird im Share-Link sichtbar sein'
                    : 'Alle Acts und Songs werden im Share-Link sichtbar sein'}
                </p>
              </div>
            )}

            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Berechtigungen
              </label>
              <div className="space-y-2">
                <label className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg cursor-pointer border-2 transition-colors hover:border-indigo-300 dark:hover:border-indigo-700"
                  style={{ borderColor: selectedRole === 'band' ? 'rgb(99 102 241)' : 'transparent' }}
                >
                  <input
                    type="radio"
                    name="role"
                    value="band"
                    checked={selectedRole === 'band'}
                    onChange={() => setSelectedRole('band')}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Band</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Kann Songs bearbeiten & Visual-Abfragen ausfüllen. Keine Event-Details.
                    </p>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg cursor-pointer border-2 transition-colors hover:border-indigo-300 dark:hover:border-indigo-700"
                  style={{ borderColor: selectedRole === 'orga' ? 'rgb(99 102 241)' : 'transparent' }}
                >
                  <input
                    type="radio"
                    name="role"
                    value="orga"
                    checked={selectedRole === 'orga'}
                    onChange={() => setSelectedRole('orga')}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Orga</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Kann alles bearbeiten inkl. Titel, Datum, Venue und Startzeit.
                    </p>
                  </div>
                </label>
              </div>
            </div>

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
