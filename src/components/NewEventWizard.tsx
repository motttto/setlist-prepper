'use client';

import { useState } from 'react';
import { Modal, Button, Input } from './ui';
import { ActType } from '@/types';
import { Plus, Users, Disc3, Music, Star, Sparkles, ChevronRight, ChevronLeft, Check, Minus, Mic2, Calendar, Building } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

type EventType = 'single-band' | 'multi-band' | 'festival';

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

const EVENT_TYPES: { value: EventType; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'single-band',
    label: 'Konzert / Einzelact',
    description: 'Ein Auftritt mit einer Band, DJ oder Solokünstler',
    icon: <Mic2 className="w-8 h-8" />,
  },
  {
    value: 'multi-band',
    label: 'Mehrere Acts',
    description: 'Ein Abend mit mehreren Bands, DJs oder Acts',
    icon: <Users className="w-8 h-8" />,
  },
  {
    value: 'festival',
    label: 'Festival / Mehrtägig',
    description: 'Mehrere Stages, viele Acts, ggf. mehrere Tage',
    icon: <Calendar className="w-8 h-8" />,
  },
];

export default function NewEventWizard({ isOpen, onClose, onComplete }: NewEventWizardProps) {
  const [step, setStep] = useState(0);

  // Step 0: Event Type
  const [eventType, setEventType] = useState<EventType | null>(null);

  // Step 1: Event Basics
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [venue, setVenue] = useState('');

  // For single-band: Act type
  const [singleActType, setSingleActType] = useState<ActType>('band');

  // For multi-band: Act count
  const [actCount, setActCount] = useState(2);

  // For festival: Stage Count & Acts per Stage
  const [stageCount, setStageCount] = useState(2);
  const [actsPerStage, setActsPerStage] = useState<number[]>([3, 3]);

  // Final step: Stage & Act Names
  const [stages, setStages] = useState<StageData[]>([]);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);

  const resetWizard = () => {
    setStep(0);
    setEventType(null);
    setTitle('');
    setEventDate('');
    setStartTime('');
    setVenue('');
    setSingleActType('band');
    setActCount(2);
    setStageCount(2);
    setActsPerStage([3, 3]);
    setStages([]);
    setCurrentStageIndex(0);
  };

  const handleClose = () => {
    resetWizard();
    onClose();
  };

  // Generate stages structure based on event type
  const generateStagesStructure = () => {
    const newStages: StageData[] = [];

    if (eventType === 'single-band') {
      // Single stage, single act
      newStages.push({
        id: uuidv4(),
        name: 'Main',
        actCount: 1,
        acts: [{
          id: uuidv4(),
          name: '',
          type: singleActType,
        }],
      });
    } else if (eventType === 'multi-band') {
      // Single stage, multiple acts
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
        name: 'Main',
        actCount,
        acts,
      });
    } else if (eventType === 'festival') {
      // Multiple stages, multiple acts per stage
      for (let i = 0; i < stageCount; i++) {
        const stageActCount = actsPerStage[i] || 3;
        const acts: ActData[] = [];
        for (let j = 0; j < stageActCount; j++) {
          acts.push({
            id: uuidv4(),
            name: '',
            type: 'band' as ActType,
          });
        }
        newStages.push({
          id: uuidv4(),
          name: `Stage ${i + 1}`,
          actCount: stageActCount,
          acts,
        });
      }
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
    const newCount = Math.max(2, Math.min(10, stageCount + delta));
    setStageCount(newCount);
    // Adjust actsPerStage array
    if (newCount > actsPerStage.length) {
      setActsPerStage([...actsPerStage, ...Array(newCount - actsPerStage.length).fill(3)]);
    } else {
      setActsPerStage(actsPerStage.slice(0, newCount));
    }
  };

  const handleActCountChange = (stageIndex: number, delta: number) => {
    const newActsPerStage = [...actsPerStage];
    newActsPerStage[stageIndex] = Math.max(1, Math.min(20, (newActsPerStage[stageIndex] || 3) + delta));
    setActsPerStage(newActsPerStage);
  };

  // Calculate total steps and current step labels based on event type
  const getSteps = () => {
    if (eventType === 'single-band') {
      return ['Event-Typ', 'Details', 'Act-Typ', 'Name'];
    } else if (eventType === 'multi-band') {
      return ['Event-Typ', 'Details', 'Anzahl Acts', 'Namen'];
    } else if (eventType === 'festival') {
      return ['Event-Typ', 'Details', 'Stages', 'Acts/Stage', 'Namen'];
    }
    return ['Event-Typ', 'Details'];
  };

  const steps = getSteps();
  const totalSteps = steps.length;

  const canProceed = () => {
    switch (step) {
      case 0: return eventType !== null;
      case 1: return title.trim().length > 0;
      case 2:
        if (eventType === 'single-band') return true;
        if (eventType === 'multi-band') return actCount >= 2;
        if (eventType === 'festival') return stageCount >= 2;
        return true;
      case 3:
        if (eventType === 'festival') return actsPerStage.every(c => c >= 1);
        return true;
      default: return true;
    }
  };

  const handleNext = () => {
    // Before moving to the names step, generate structure
    const isLastConfigStep = (
      (eventType === 'single-band' && step === 2) ||
      (eventType === 'multi-band' && step === 2) ||
      (eventType === 'festival' && step === 3)
    );

    if (isLastConfigStep) {
      generateStagesStructure();
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    } else {
      handleClose();
    }
  };

  const isLastStep = step === totalSteps - 1;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Neues Event erstellen" size="lg">
      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-6">
        {steps.map((_, s) => (
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
            {s < steps.length - 1 && (
              <div
                className={`w-8 h-1 ${
                  s < step ? 'bg-green-500' : 'bg-zinc-200 dark:bg-zinc-700'
                }`}
              />
            )}
          </div>
        ))}
        <span className="ml-2 text-sm text-zinc-500">
          {steps[step]}
        </span>
      </div>

      {/* Step 0: Event Type Selection */}
      {step === 0 && (
        <div className="space-y-4">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
            Was für ein Event planst du?
          </p>

          <div className="space-y-3">
            {EVENT_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setEventType(type.value)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                  eventType === type.value
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                }`}
              >
                <div className={`p-3 rounded-lg ${
                  eventType === type.value
                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                }`}>
                  {type.icon}
                </div>
                <div>
                  <h3 className={`font-medium ${
                    eventType === type.value
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-zinc-900 dark:text-zinc-100'
                  }`}>
                    {type.label}
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {type.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 1: Event Basics */}
      {step === 1 && (
        <div className="space-y-4">
          <Input
            label="Event-Name *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              eventType === 'single-band' ? 'z.B. Konzert im Club XY' :
              eventType === 'multi-band' ? 'z.B. Rock Night 2024' :
              'z.B. Summer Festival 2024'
            }
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

      {/* Single-band: Step 2 - Act Type */}
      {step === 2 && eventType === 'single-band' && (
        <div className="space-y-4">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
            Was für ein Act ist es?
          </p>

          <div className="grid grid-cols-2 gap-3">
            {ACT_TYPE_OPTIONS.map((type) => (
              <button
                key={type.value}
                onClick={() => setSingleActType(type.value)}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  singleActType === type.value
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                }`}
              >
                <div className={`p-2 rounded-lg ${
                  singleActType === type.value
                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                }`}>
                  {type.icon}
                </div>
                <span className={`font-medium ${
                  singleActType === type.value
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-zinc-900 dark:text-zinc-100'
                }`}>
                  {type.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Multi-band: Step 2 - Act Count */}
      {step === 2 && eventType === 'multi-band' && (
        <div className="space-y-6">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Wie viele Acts spielen?
          </p>

          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActCount(Math.max(2, actCount - 1))}
                disabled={actCount <= 2}
                className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <Minus className="w-5 h-5" />
              </button>
              <div className="w-20 h-20 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <span className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">
                  {actCount}
                </span>
              </div>
              <button
                onClick={() => setActCount(Math.min(20, actCount + 1))}
                disabled={actCount >= 20}
                className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <p className="text-lg font-medium">
              {actCount} Acts
            </p>
          </div>
        </div>
      )}

      {/* Festival: Step 2 - Stage Count */}
      {step === 2 && eventType === 'festival' && (
        <div className="space-y-6">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Wie viele Bühnen/Stages hat das Festival?
          </p>

          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleStageCountChange(-1)}
                disabled={stageCount <= 2}
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
              {stageCount} Stages
            </p>
          </div>
        </div>
      )}

      {/* Festival: Step 3 - Acts per Stage */}
      {step === 3 && eventType === 'festival' && (
        <div className="space-y-6">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Wie viele Acts spielen auf jeder Stage?
          </p>

          <div className="space-y-4 max-h-64 overflow-y-auto">
            {Array.from({ length: stageCount }).map((_, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                <span className="font-medium">
                  Stage {index + 1}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleActCountChange(index, -1)}
                    disabled={(actsPerStage[index] || 3) <= 1}
                    className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center text-xl font-bold text-indigo-600 dark:text-indigo-400">
                    {actsPerStage[index] || 3}
                  </span>
                  <button
                    onClick={() => handleActCountChange(index, 1)}
                    disabled={(actsPerStage[index] || 3) >= 20}
                    className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-zinc-500 w-12">
                    {(actsPerStage[index] || 3) === 1 ? 'Act' : 'Acts'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Final Step: Names */}
      {isLastStep && (
        <div className="space-y-4">
          {/* Stage Tabs (only for festival) */}
          {eventType === 'festival' && stages.length > 1 && (
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

          {/* Stage Name (only for festival) */}
          {eventType === 'festival' && (
            <div className="mb-4">
              <Input
                label="Stage-Name"
                value={stages[currentStageIndex]?.name || ''}
                onChange={(e) => updateStageName(stages[currentStageIndex]?.id, e.target.value)}
                placeholder={`Stage ${currentStageIndex + 1}`}
              />
            </div>
          )}

          <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
            {eventType === 'single-band' ? 'Act-Name:' :
             eventType === 'multi-band' ? 'Acts:' :
             `Acts für ${stages[currentStageIndex]?.name || `Stage ${currentStageIndex + 1}`}:`}
          </p>

          <div className="space-y-3 max-h-48 overflow-y-auto">
            {stages[currentStageIndex]?.acts.map((act, actIndex) => (
              <div key={act.id} className="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                {stages[currentStageIndex]?.acts.length > 1 && (
                  <span className="w-6 text-center text-sm text-zinc-400">{actIndex + 1}.</span>
                )}
                <Input
                  value={act.name}
                  onChange={(e) => updateAct(stages[currentStageIndex].id, act.id, 'name', e.target.value)}
                  placeholder={eventType === 'single-band' ? 'Name eingeben' : `Act ${actIndex + 1}`}
                  className="flex-1"
                  autoFocus={actIndex === 0}
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

          {eventType === 'festival' && stages.length > 1 && currentStageIndex < stages.length - 1 && (
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
          onClick={handleBack}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          {step === 0 ? 'Abbrechen' : 'Zurück'}
        </Button>

        {!isLastStep ? (
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
