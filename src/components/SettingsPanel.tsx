'use client';

import { useState } from 'react';
import { CustomField } from '@/types';
import { Button, Input } from './ui';
import { Plus, Trash2, Settings, X } from 'lucide-react';

interface SettingsPanelProps {
  customFields: CustomField[];
  onAddField: (name: string, type: 'text' | 'textarea') => Promise<void>;
  onDeleteField: (id: string) => Promise<void>;
  isLoading: boolean;
}

export default function SettingsPanel({
  customFields,
  onAddField,
  onDeleteField,
  isLoading,
}: SettingsPanelProps) {
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'textarea'>('text');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleAddField = async () => {
    if (!newFieldName.trim()) return;

    setIsSaving(true);
    setError('');

    try {
      await onAddField(newFieldName.trim(), newFieldType);
      setNewFieldName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Erstellen');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteField = async (id: string) => {
    if (!confirm('Möchtest du dieses Feld wirklich löschen?')) return;

    try {
      await onDeleteField(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen');
    }
  };

  if (isLoading) {
    return (
      <div className="h-full">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-zinc-200 dark:bg-zinc-700 rounded w-1/2 mb-4" />
          <div className="h-10 bg-zinc-200 dark:bg-zinc-700 rounded" />
          <div className="h-10 bg-zinc-200 dark:bg-zinc-700 rounded" />
          <div className="h-10 bg-zinc-200 dark:bg-zinc-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
            <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Einstellungen
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Eigene Felder für jeden Song
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex-shrink-0 mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Add New Field */}
      <div className="flex-shrink-0 mb-4 p-3 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
        <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
          Neues Feld hinzufügen
        </h3>
        <div className="space-y-2">
          <Input
            value={newFieldName}
            onChange={(e) => setNewFieldName(e.target.value)}
            placeholder="Feldname eingeben..."
            onKeyDown={(e) => e.key === 'Enter' && handleAddField()}
          />
          <div className="flex gap-2">
            <select
              value={newFieldType}
              onChange={(e) => setNewFieldType(e.target.value as 'text' | 'textarea')}
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            >
              <option value="text">Textfeld</option>
              <option value="textarea">Textbereich</option>
            </select>
            <Button onClick={handleAddField} isLoading={isSaving} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Hinzufügen
            </Button>
          </div>
        </div>
      </div>

      {/* Existing Fields */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          Eigene Felder ({customFields.length})
        </h3>

        {customFields.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Noch keine eigenen Felder
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
              Füge Felder hinzu, die bei jedem Song erscheinen
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {customFields.map((field) => (
              <div
                key={field.id}
                className="flex items-center justify-between p-3 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700"
              >
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate block">
                    {field.fieldName}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {field.fieldType === 'textarea' ? 'Textbereich' : 'Textfeld'}
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteField(field.id)}
                  className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
