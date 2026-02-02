'use client';

import { Stage } from '@/types';
import { Plus, X, Edit2 } from 'lucide-react';
import { useState } from 'react';

interface StageTabsProps {
  stages: Stage[];
  activeStageId: string | null;
  onSelectStage: (stageId: string | null) => void;
  onAddStage?: () => void;
  onUpdateStage?: (stageId: string, updates: Partial<Stage>) => void;
  onDeleteStage?: (stageId: string) => void;
  readonly?: boolean;
}

export default function StageTabs({
  stages,
  activeStageId,
  onSelectStage,
  onAddStage,
  onUpdateStage,
  onDeleteStage,
  readonly = false,
}: StageTabsProps) {
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleStartEdit = (stage: Stage) => {
    if (readonly || !onUpdateStage) return;
    setEditingStageId(stage.id);
    setEditName(stage.name);
  };

  const handleFinishEdit = () => {
    if (editingStageId && editName.trim() && onUpdateStage) {
      onUpdateStage(editingStageId, { name: editName.trim() });
    }
    setEditingStageId(null);
    setEditName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFinishEdit();
    } else if (e.key === 'Escape') {
      setEditingStageId(null);
      setEditName('');
    }
  };

  // Wenn nur eine Stage und readonly, zeige keine Tabs
  if (stages.length <= 1 && readonly) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-2 overflow-x-auto">
      {stages.map((stage) => {
        const isSelected = activeStageId === stage.id;
        const isEditing = editingStageId === stage.id;

        return (
          <div
            key={stage.id}
            className={`group relative flex items-center gap-1 px-3 py-2 text-sm font-medium border-b-2 transition-all cursor-pointer ${
              isSelected
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-zinc-800'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/50'
            }`}
            onClick={() => !isEditing && onSelectStage(stage.id)}
          >
            {/* Stage color indicator */}
            {stage.color && (
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: stage.color }}
              />
            )}

            {/* Name or Edit Input */}
            {isEditing ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleFinishEdit}
                onKeyDown={handleKeyDown}
                className="w-24 px-1 py-0.5 text-sm bg-white dark:bg-zinc-700 border border-indigo-500 rounded focus:outline-none"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="truncate max-w-[100px]">{stage.name}</span>
            )}

            {/* Edit/Delete buttons (only on hover and when not readonly) */}
            {!readonly && isSelected && !isEditing && (
              <div className="flex items-center gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {onUpdateStage && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartEdit(stage);
                    }}
                    className="p-0.5 text-zinc-400 hover:text-indigo-500"
                    title="Umbenennen"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                )}
                {onDeleteStage && stages.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteStage(stage.id);
                    }}
                    className="p-0.5 text-zinc-400 hover:text-red-500"
                    title="Stage löschen"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Add Stage button */}
      {!readonly && onAddStage && (
        <button
          onClick={onAddStage}
          className="flex items-center gap-1 px-2 py-2 text-sm text-zinc-400 hover:text-indigo-500 transition-colors"
          title="Stage hinzufügen"
        >
          <Plus className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
