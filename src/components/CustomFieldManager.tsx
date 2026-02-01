'use client';

import { useState, useEffect } from 'react';
import { CustomField } from '@/types';
import { Button, Input, Card } from './ui';
import { Plus, Trash2, Settings } from 'lucide-react';

export default function CustomFieldManager() {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'textarea'>('text');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadFields();
  }, []);

  const loadFields = async () => {
    try {
      const response = await fetch('/api/custom-fields');
      const data = await response.json();
      if (data.data) {
        setFields(data.data);
      }
    } catch (err) {
      console.error('Error loading custom fields:', err);
      setError('Fehler beim Laden der Felder');
    } finally {
      setIsLoading(false);
    }
  };

  const addField = async () => {
    if (!newFieldName.trim()) return;

    setIsSaving(true);
    setError('');

    try {
      const response = await fetch('/api/custom-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fieldName: newFieldName.trim(),
          fieldType: newFieldType,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Fehler beim Erstellen');
      }

      const data = await response.json();
      setFields([...fields, data.data]);
      setNewFieldName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Erstellen');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteField = async (id: string) => {
    if (!confirm('Möchtest du dieses Feld wirklich löschen?')) return;

    try {
      const response = await fetch(`/api/custom-fields?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Fehler beim Löschen');
      }

      setFields(fields.filter((f) => f.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-zinc-200 dark:bg-zinc-700 rounded w-1/3" />
          <div className="h-10 bg-zinc-200 dark:bg-zinc-700 rounded" />
          <div className="h-10 bg-zinc-200 dark:bg-zinc-700 rounded" />
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
          <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Benutzerdefinierte Felder
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Diese Felder werden bei jedem Song angezeigt
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Existing Fields */}
      {fields.length > 0 && (
        <div className="space-y-2 mb-6">
          {fields.map((field) => (
            <div
              key={field.id}
              className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg"
            >
              <div>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {field.fieldName}
                </span>
                <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 rounded">
                  {field.fieldType === 'textarea' ? 'Textbereich' : 'Textfeld'}
                </span>
              </div>
              <button
                onClick={() => deleteField(field.id)}
                className="p-2 text-zinc-400 hover:text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add New Field */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          value={newFieldName}
          onChange={(e) => setNewFieldName(e.target.value)}
          placeholder="Feldname eingeben..."
          className="flex-1"
          onKeyDown={(e) => e.key === 'Enter' && addField()}
        />
        <select
          value={newFieldType}
          onChange={(e) => setNewFieldType(e.target.value as 'text' | 'textarea')}
          className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
        >
          <option value="text">Textfeld</option>
          <option value="textarea">Textbereich</option>
        </select>
        <Button onClick={addField} isLoading={isSaving}>
          <Plus className="w-4 h-4 mr-2" />
          Hinzufügen
        </Button>
      </div>

      {fields.length === 0 && (
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400 text-center">
          Noch keine benutzerdefinierten Felder erstellt
        </p>
      )}
    </Card>
  );
}
