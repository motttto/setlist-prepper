'use client';

import { useState } from 'react';
import { Modal, Button, Input } from './ui';
import { ActType } from '@/types';
import { Plus, Trash2, Users, Disc3, Music, Star, Sparkles, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface StageData {
  id: string;
  name: string;
  acts: ActData[];
}

interface ActData {
  id: string;
  name: string;
  type: ActType;
}

interface NewEventWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: {
    title: string;
    eventDate: string | null;
    startTime: string | null;
    venue: string | null;
    stages: { name: string; acts: { name: string; type: ActType }[] }[];
  }) => void;
}

const ACT_TYPE_OPTIONS: { value: ActType; label: string; icon: React.ReactNode }[] = [
  { value: 'band', label: 'Band', icon: <Users className="w-4 h-4" /> },
  { value: 'dj', label: 'DJ', icon: <Disc3 className="w-4 h-4" /> },
  { value: 'solo', label: 'Solo', icon: <Music className="w-4 h-4" /> },
  { value: 'workshop', label: 'Workshop', icon: <Sparkles className="w-4 h-4" /> },
  { value: 'performance', label: 'Performance', icon: <Star className="w-4 h-4" /> },
  { value: 'other', label: 'Andere', icon: <Music className="w-4 h-4" /> },
];

export default function NewEventWizard({ isOpen, onClose, onComplete }: NewEventWizardProps) {
  const [step, setStep] = useState(0);

  // Step 1: Event Basics
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [venue, setVenue] = useState('');

  // Step 2: Stages
  const [stages, setStages] = useState<StageData[]>([
    { id: uuidv4(), name: 'Main', acts: [] }
  ]);

  // Step 3: Current stage index for act setup
  const [currentStageIndex, setCurrentStageIndex] = useState(0);

  const resetWizard = () => {
    setStep(0);
    setTitle('');
    setEventDate('');
    setStartTime('');
    setVenue('');
    setStages([{ id: uuidv4(), name: 'Main', acts: [] }]);
    setCurrentStageIndex(0);
  };

  const handleClose = () => {
    resetWizard();
    onClose();
  };

  const addStage = () => {
    setStages([...stages, { id: uuidv4(), name: `Stage ${stages.length + 1}`, acts: [] }]);
  };

  const removeStage = (id: string) => {
    if (stages.length <= 1) return;
    setStages(stages.filter(s => s.id !== id));
  };

  const updateStageName = (id: string, name: string) => {
    setStages(stages.map(s => s.id === id ? { ...s, name } : s));
  };

  const addAct = (stageId: string) => {
    setStages(stages.map(s => {
      if (s.id !== stageId) return s;
      return {
        ...s,
        acts: [...s.acts, { id: uuidv4(), name: '', type: 'band' as ActType }]
      };
    }));
  };

  const removeAct = (stageId: string, actId: string) => {
    setStages(stages.map(s => {
      if (s.id !== stageId) return s;
      return {
        ...s,
        acts: s.acts.filter(a => a.id !== actId)
      };
    }));
  };

  const updateAct = (stageId: string, actId: string, field: 'name' | 'type', value: string) => {
    setStages(stages.map(s => {
      if (s.id !== stageId) return s;
      return {
        ...s,
        acts: s.acts.map(a => a.id === actId ? { ...a, [field]: value } : a)
      };
    }));
  };

  const handleComplete = () => {
    // Filtere leere Acts und Stages
    const filteredStages = stages
      .filter(s => s.name.trim())
      .map(s => ({
        name: s.name,
        acts: s.acts
          .filter(a => a.name.trim())
          .map(a => ({ name: a.name, type: a.type }))
      }));

    // Mindestens eine Stage mit einem Act
    if (filteredStages.length === 0) {
      filteredStages.push({
        name: 'Main',
        acts: [{ name: 'Programm', type: 'band' }]
      });
    } else {
      // Jede Stage braucht mindestens einen Act
      filteredStages.forEach(s => {
        if (s.acts.length === 0) {
          s.acts.push({ name: 'Programm', type: 'band' });
        }
      });
    }

    onComplete({
      title: title.trim() || 'Neues Event',
      eventDate: eventDate || null,
      startTime: startTime || null,
      venue: venue.trim() || null,
      stages: filteredStages
    });

    handleClose();
  };

  const canProceed = () => {
    switch (step) {
      case 0: return title.trim().length > 0;
      case 1: return stages.some(s => s.name.trim().length > 0);
      case 2: return true; // Acts are optional, we add defaults
      default: return true;
    }
  };

  const totalSteps = 3;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Neues Event erstellen" size="lg">
      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[0, 1, 2].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                s < step
                  ? 'bg-green-500 text-white'
                  : s === step
                  ? 'bg-indigo-600 text-white'
                  : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'
              }`}
            >
              {s < step ? <Check className="w-4 h-4" /> : s + 1}
            </div>
            {s < 2 && (
              <div
                className={`w-12 h-1 ${
                  s < step ? 'bg-green-500' : 'bg-zinc-200 dark:bg-zinc-700'
                }`}
              />
            )}
          </div>
        ))}
        <span className="ml-2 text-sm text-zinc-500">
          {step === 0 && 'Event-Details'}
          {step === 1 && 'Stages'}
          {step === 2 && 'Acts'}
        </span>
      </div>

      {/* Step 0: Event Basics */}
      {step === 0 && (
        <div className="space-y-4">
          <Input
            label="Event-Name *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="z.B. Sommerfest 2024, Clubnacht, etc."
            autoFocus
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Datum"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
            <Input
              label="Startzeit"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <Input
            label="Veranstaltungsort"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="z.B. Club XY, Open Air Gelände"
          />
        </div>
      )}

      {/* Step 1: Stages */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
            Füge die Bühnen/Areas deines Events hinzu. Bei einfachen Events reicht eine Stage.
          </p>

          <div className="space-y-3 max-h-64 overflow-y-auto">
            {stages.map((stage, index) => (
              <div key={stage.id} className="flex items-center gap-2">
                <Input
                  value={stage.name}
                  onChange={(e) => updateStageName(stage.id, e.target.value)}
                  placeholder={`Stage ${index + 1}`}
                  className="flex-1"
                />
                {stages.length > 1 && (
                  <button
                    onClick={() => removeStage(stage.id)}
                    className="p-2 text-zinc-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <Button variant="secondary" size="sm" onClick={addStage}>
            <Plus className="w-4 h-4 mr-1" />
            Stage hinzufügen
          </Button>
        </div>
      )}

      {/* Step 2: Acts per Stage */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Stage Tabs */}
          {stages.length > 1 && (
            <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-700 mb-4">
              {stages.map((stage, index) => (
                <button
                  key={stage.id}
                  onClick={() => setCurrentStageIndex(index)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    currentStageIndex === index
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                  }`}
                >
                  {stage.name || `Stage ${index + 1}`}
                </button>
              ))}
            </div>
          )}

          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Füge Acts für <strong>{stages[currentStageIndex]?.name || 'diese Stage'}</strong> hinzu.
            Du kannst später noch weitere hinzufügen.
          </p>

          <div className="space-y-3 max-h-48 overflow-y-auto">
            {stages[currentStageIndex]?.acts.map((act) => (
              <div key={act.id} className="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                <Input
                  value={act.name}
                  onChange={(e) => updateAct(stages[currentStageIndex].id, act.id, 'name', e.target.value)}
                  placeholder="Act-Name"
                  className="flex-1"
                />
                <select
                  value={act.type}
                  onChange={(e) => updateAct(stages[currentStageIndex].id, act.id, 'type', e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm"
                >
                  {ACT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => removeAct(stages[currentStageIndex].id, act.id)}
                  className="p-2 text-zinc-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => addAct(stages[currentStageIndex].id)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Act hinzufügen
          </Button>

          {stages[currentStageIndex]?.acts.length === 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Keine Acts? Es wird automatisch ein Standard-Act erstellt.
            </p>
          )}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-700">
        <Button
          variant="secondary"
          onClick={() => step > 0 ? setStep(step - 1) : handleClose()}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          {step === 0 ? 'Abbrechen' : 'Zurück'}
        </Button>

        {step < totalSteps - 1 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
            Weiter
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleComplete}>
            <Check className="w-4 h-4 mr-1" />
            Event erstellen
          </Button>
        )}
      </div>
    </Modal>
  );
}
