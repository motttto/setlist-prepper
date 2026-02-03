'use client';

import { useState } from 'react';
import { Modal, Button, Input } from './ui';
import { ActType } from '@/types';
import { Plus, Trash2, Users, Disc3, Music, Star, Sparkles, ChevronRight, ChevronLeft, Check, Minus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface StageData {
  id: string;
  name: string;
  actCount: number;
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

  // Step 0: Event Basics
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [venue, setVenue] = useState('');

  // Step 1: Stage Count
  const [stageCount, setStageCount] = useState(1);

  // Step 2: Acts per Stage (array of counts)
  const [actsPerStage, setActsPerStage] = useState<number[]>([1]);

  // Step 3: Stage & Act Names
  const [stages, setStages] = useState<StageData[]>([]);

  // Step 4: Current stage index for act setup
  const [currentStageIndex, setCurrentStageIndex] = useState(0);

  const resetWizard = () => {
    setStep(0);
    setTitle('');
    setEventDate('');
    setStartTime('');
    setVenue('');
    setStageCount(1);
    setActsPerStage([1]);
    setStages([]);
    setCurrentStageIndex(0);
  };

  const handleClose = () => {
    resetWizard();
    onClose();
  };

  // Generate stages structure when moving to step 3
  const generateStagesStructure = () => {
    const newStages: StageData[] = [];
    for (let i = 0; i < stageCount; i++) {
      const actCount = actsPerStage[i] || 1;
      const acts: ActData[] = [];
      for (let j = 0; j < actCount; j++) {
        acts.push({
          id: uuidv4(),
          name: '',
          type: 'band' as ActType,
        });
      }
      newStages.push({
        id: uuidv4(),
        name: stageCount === 1 ? 'Main' : `Stage ${i + 1}`,
        actCount,
        acts,
      });
    }
    setStages(newStages);
  };

  const updateStageName = (id: string, name: string) => {
    setStages(stages.map(s => s.id === id ? { ...s, name } : s));
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
    // Convert to final format with defaults
    const filteredStages = stages.map((s, sIndex) => ({
      name: s.name.trim() || `Stage ${sIndex + 1}`,
      acts: s.acts.map((a, aIndex) => ({
        name: a.name.trim() || `Act ${aIndex + 1}`,
        type: a.type
      }))
    }));

    // Ensure at least one stage with one act
    if (filteredStages.length === 0) {
      filteredStages.push({
        name: 'Main',
        acts: [{ name: 'Programm', type: 'band' }]
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

  const handleStageCountChange = (delta: number) => {
    const newCount = Math.max(1, Math.min(10, stageCount + delta));
    setStageCount(newCount);
    // Adjust actsPerStage array
    if (newCount > actsPerStage.length) {
      setActsPerStage([...actsPerStage, ...Array(newCount - actsPerStage.length).fill(1)]);
    } else {
      setActsPerStage(actsPerStage.slice(0, newCount));
    }
  };

  const handleActCountChange = (stageIndex: number, delta: number) => {
    const newActsPerStage = [...actsPerStage];
    newActsPerStage[stageIndex] = Math.max(1, Math.min(20, (newActsPerStage[stageIndex] || 1) + delta));
    setActsPerStage(newActsPerStage);
  };

  const canProceed = () => {
    switch (step) {
      case 0: return title.trim().length > 0;
      case 1: return stageCount >= 1;
      case 2: return actsPerStage.every(c => c >= 1);
      case 3: return true;
      default: return true;
    }
  };

  const handleNext = () => {
    if (step === 2) {
      // Generate stages structure before moving to step 3
      generateStagesStructure();
    }
    setStep(step + 1);
  };

  const totalSteps = 4;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Neues Event erstellen" size="lg">
      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[0, 1, 2, 3].map((s) => (
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
            {s < 3 && (
              <div
                className={`w-8 h-1 ${
                  s < step ? 'bg-green-500' : 'bg-zinc-200 dark:bg-zinc-700'
                }`}
              />
            )}
          </div>
        ))}
        <span className="ml-2 text-sm text-zinc-500">
          {step === 0 && 'Event-Details'}
          {step === 1 && 'Stages'}
          {step === 2 && 'Acts pro Stage'}
          {step === 3 && 'Namen'}
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

      {/* Step 1: Stage Count */}
      {step === 1 && (
        <div className="space-y-6">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Wie viele Bühnen/Stages hat dein Event?
          </p>

          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleStageCountChange(-1)}
                disabled={stageCount <= 1}
                className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <Minus className="w-5 h-5" />
              </button>
              <div className="w-20 h-20 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <span className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">
                  {stageCount}
                </span>
              </div>
              <button
                onClick={() => handleStageCountChange(1)}
                disabled={stageCount >= 10}
                className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <p className="text-lg font-medium">
              {stageCount === 1 ? '1 Stage' : `${stageCount} Stages`}
            </p>
          </div>

          <p className="text-xs text-zinc-400 text-center">
            Bei einfachen Events (Konzert, Club) reicht 1 Stage. Festivals haben oft mehrere.
          </p>
        </div>
      )}

      {/* Step 2: Acts per Stage */}
      {step === 2 && (
        <div className="space-y-6">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Wie viele Acts spielen auf jeder Stage?
          </p>

          <div className="space-y-4 max-h-64 overflow-y-auto">
            {Array.from({ length: stageCount }).map((_, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                <span className="font-medium">
                  {stageCount === 1 ? 'Main Stage' : `Stage ${index + 1}`}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleActCountChange(index, -1)}
                    disabled={(actsPerStage[index] || 1) <= 1}
                    className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center text-xl font-bold text-indigo-600 dark:text-indigo-400">
                    {actsPerStage[index] || 1}
                  </span>
                  <button
                    onClick={() => handleActCountChange(index, 1)}
                    disabled={(actsPerStage[index] || 1) >= 20}
                    className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-zinc-500 w-12">
                    {(actsPerStage[index] || 1) === 1 ? 'Act' : 'Acts'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-zinc-400 text-center">
            Acts sind z.B. Bands, DJs, Solo-Künstler oder Workshops.
          </p>
        </div>
      )}

      {/* Step 3: Stage & Act Names */}
      {step === 3 && (
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

          {/* Stage Name */}
          <div className="mb-4">
            <Input
              label="Stage-Name"
              value={stages[currentStageIndex]?.name || ''}
              onChange={(e) => updateStageName(stages[currentStageIndex]?.id, e.target.value)}
              placeholder={`Stage ${currentStageIndex + 1}`}
            />
          </div>

          <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
            Acts für {stages[currentStageIndex]?.name || `Stage ${currentStageIndex + 1}`}:
          </p>

          <div className="space-y-3 max-h-48 overflow-y-auto">
            {stages[currentStageIndex]?.acts.map((act, actIndex) => (
              <div key={act.id} className="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                <span className="w-6 text-center text-sm text-zinc-400">{actIndex + 1}.</span>
                <Input
                  value={act.name}
                  onChange={(e) => updateAct(stages[currentStageIndex].id, act.id, 'name', e.target.value)}
                  placeholder={`Act ${actIndex + 1}`}
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
              </div>
            ))}
          </div>

          {stages.length > 1 && currentStageIndex < stages.length - 1 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Vergiss nicht, auch die anderen Stages zu benennen!
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
          <Button onClick={handleNext} disabled={!canProceed()}>
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
