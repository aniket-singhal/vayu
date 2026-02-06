'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as PIXI from 'pixi.js';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

type BreathingTechnique = 'box' | '478';

interface BreathingPhase {
  name: 'inhale' | 'hold' | 'exhale' | 'holdAfterExhale';
  duration: number;
  instruction: string;
}

interface BreathingConfig {
  name: string;
  phases: BreathingPhase[];
}

// ============================================================================
// BREATHING CONFIGURATIONS
// ============================================================================

const BREATHING_TECHNIQUES: Record<BreathingTechnique, BreathingConfig> = {
  box: {
    name: 'Box Breathing',
    phases: [
      { name: 'inhale', duration: 4000, instruction: 'Inhale through the nose' },
      { name: 'hold', duration: 4000, instruction: 'Hold the breath' },
      { name: 'exhale', duration: 4000, instruction: 'Exhale slowly' },
      { name: 'holdAfterExhale', duration: 4000, instruction: 'Hold empty' },
    ],
  },
  '478': {
    name: '4-7-8 Technique',
    phases: [
      { name: 'inhale', duration: 4000, instruction: 'Inhale deeply' },
      { name: 'hold', duration: 7000, instruction: 'Hold the breath' },
      { name: 'exhale', duration: 8000, instruction: 'Exhale completely' },
    ],
  },
};

// ============================================================================
// CUSTOM HOOK: useBreathing
// ============================================================================

interface UseBreathingReturn {
  isActive: boolean;
  currentPhase: BreathingPhase | null;
  progress: number; // 0 to 1 for current phase
  timeRemaining: number; // milliseconds
  totalDuration: number; // milliseconds
  start: () => void;
  stop: () => void;
  reset: () => void;
}

function useBreathing(
  technique: BreathingTechnique,
  durationMinutes: number
): UseBreathingReturn {
  const [isActive, setIsActive] = useState(false);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);

  const config = BREATHING_TECHNIQUES[technique];
  const totalDuration = durationMinutes * 60 * 1000;
  const startTimeRef = useRef<number>(0);
  const phaseStartTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);

  const currentPhase = config.phases[currentPhaseIndex];

  const tick = useCallback(() => {
    const now = Date.now();
    const elapsed = now - startTimeRef.current;
    const phaseElapsed = now - phaseStartTimeRef.current;

    // Update time remaining
    setTimeRemaining(Math.max(0, totalDuration - elapsed));

    // Check if session is complete
    if (elapsed >= totalDuration) {
      setIsActive(false);
      setProgress(1);
      return;
    }

    // Update phase progress
    const phaseProgress = Math.min(phaseElapsed / currentPhase.duration, 1);
    setProgress(phaseProgress);

    // Move to next phase if current is complete
    if (phaseElapsed >= currentPhase.duration) {
      const nextIndex = (currentPhaseIndex + 1) % config.phases.length;
      setCurrentPhaseIndex(nextIndex);
      phaseStartTimeRef.current = now;
      setProgress(0);
    }

    animationFrameRef.current = requestAnimationFrame(tick);
  }, [currentPhaseIndex, currentPhase, totalDuration, config.phases.length]);

  useEffect(() => {
    if (isActive) {
      animationFrameRef.current = requestAnimationFrame(tick);
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [isActive, tick]);

  const start = useCallback(() => {
    const now = Date.now();
    startTimeRef.current = now;
    phaseStartTimeRef.current = now;
    setTimeRemaining(totalDuration);
    setIsActive(true);
    setCurrentPhaseIndex(0);
    setProgress(0);
  }, [totalDuration]);

  const stop = useCallback(() => {
    setIsActive(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  const reset = useCallback(() => {
    stop();
    setCurrentPhaseIndex(0);
    setProgress(0);
    setTimeRemaining(totalDuration);
  }, [stop, totalDuration]);

  return {
    isActive,
    currentPhase,
    progress,
    timeRemaining,
    totalDuration,
    start,
    stop,
    reset,
  };
}

// ============================================================================
// PIXI ORB COMPONENT
// ============================================================================

interface PixiOrbProps {
  phase: BreathingPhase | null;
  progress: number;
  isActive: boolean;
}

const PixiOrb: React.FC<PixiOrbProps> = ({ phase, progress, isActive }) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const orbRef = useRef<PIXI.Graphics | null>(null);
  const currentScaleRef = useRef(1.0);
  const targetScaleRef = useRef(1.0);

  // Easing function (ease-in-out cubic)
  const easeInOutCubic = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  // Initialize PixiJS
  useEffect(() => {
    if (!canvasRef.current) return;

    const app = new PIXI.Application({
      width: 400,
      height: 400,
      backgroundColor: 0x0f172a,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    canvasRef.current.appendChild(app.view as HTMLCanvasElement);
    appRef.current = app;

    // Create the orb
    const orb = new PIXI.Graphics();
    orbRef.current = orb;

    orb.x = 200;
    orb.y = 200;
    app.stage.addChild(orb);

    // Animation loop
    app.ticker.add(() => {
      if (!orbRef.current) return;

      // Smooth interpolation towards target scale
      const lerpFactor = 0.05;
      currentScaleRef.current += (targetScaleRef.current - currentScaleRef.current) * lerpFactor;

      // Redraw orb
      orbRef.current.clear();

      // Outer glow
      orbRef.current.beginFill(0x06b6d4, 0.1);
      orbRef.current.drawCircle(0, 0, 80 * currentScaleRef.current + 30);
      orbRef.current.endFill();

      // Middle glow
      orbRef.current.beginFill(0x06b6d4, 0.2);
      orbRef.current.drawCircle(0, 0, 80 * currentScaleRef.current + 15);
      orbRef.current.endFill();

      // Main orb with gradient effect
      orbRef.current.beginFill(0x0ea5e9, 0.8);
      orbRef.current.drawCircle(0, 0, 80 * currentScaleRef.current);
      orbRef.current.endFill();

      // Inner highlight
      orbRef.current.beginFill(0x38bdf8, 0.4);
      orbRef.current.drawCircle(-10, -10, 40 * currentScaleRef.current);
      orbRef.current.endFill();
    });

    return () => {
      app.destroy(true, { children: true });
    };
  }, []);

  // Update target scale based on breathing phase
  useEffect(() => {
    if (!phase || !isActive) {
      targetScaleRef.current = 1.0;
      return;
    }

    const easedProgress = easeInOutCubic(progress);

    switch (phase.name) {
      case 'inhale':
        targetScaleRef.current = 1.0 + easedProgress * 0.6; // 1.0 → 1.6
        break;
      case 'hold':
        // Subtle pulse at max scale
        targetScaleRef.current = 1.6 + Math.sin(Date.now() / 500) * 0.05;
        break;
      case 'exhale':
        targetScaleRef.current = 1.6 - easedProgress * 0.6; // 1.6 → 1.0
        break;
      case 'holdAfterExhale':
        targetScaleRef.current = 1.0;
        break;
    }
  }, [phase, progress, isActive]);

  return (
    <div ref={canvasRef} className="flex items-center justify-center" />
  );
};

// ============================================================================
// CIRCULAR PROGRESS RING
// ============================================================================

interface CircularProgressProps {
  progress: number; // 0 to 1
  size: number;
  strokeWidth: number;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  progress,
  size,
  strokeWidth
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - progress * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#1e293b"
        strokeWidth={strokeWidth}
        fill="none"
      />
      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#06b6d4"
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-300 ease-out"
      />
    </svg>
  );
};

// ============================================================================
// VOICE GUIDANCE
// ============================================================================

function useVoiceGuidance(phase: BreathingPhase | null, isActive: boolean) {
  const lastPhaseRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isActive || !phase || !window.speechSynthesis) return;

    // Only speak when phase changes
    if (lastPhaseRef.current === phase.name) return;
    lastPhaseRef.current = phase.name;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Speak instruction
    const utterance = new SpeechSynthesisUtterance(phase.instruction);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;

    window.speechSynthesis.speak(utterance);
  }, [phase, isActive]);
}

// ============================================================================
// BACKGROUND MUSIC
// ============================================================================

function useBackgroundMusic(
  isActive: boolean,
  enabled: boolean,
  volume: number
): React.RefObject<HTMLAudioElement> {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!audioRef.current) return;

    if (isActive && enabled) {
      audioRef.current.volume = volume;
      audioRef.current.play().catch(err => {
        console.log('Audio play prevented:', err);
      });
    } else {
      audioRef.current.pause();
    }
  }, [isActive, enabled, volume]);

  // Fade out when stopping
  useEffect(() => {
    if (!audioRef.current || !enabled) return;

    const audio = audioRef.current;
    if (!isActive && audio.volume > 0) {
      const fadeOut = setInterval(() => {
        if (audio.volume > 0.05) {
          audio.volume = Math.max(0, audio.volume - 0.05);
        } else {
          audio.volume = 0;
          audio.pause();
          clearInterval(fadeOut);
        }
      }, 100);

      return () => clearInterval(fadeOut);
    }
  }, [isActive, enabled]);

  return audioRef;
}

// ============================================================================
// LOCAL STORAGE UTILS
// ============================================================================

const STORAGE_KEY = 'vayu_daily_minutes';

function getTodayKey(): string {
  const today = new Date();
  return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
}

function getDailyMinutes(): number {
  if (typeof window === 'undefined') return 0;

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return 0;

  try {
    const data = JSON.parse(stored);
    const todayKey = getTodayKey();
    return data[todayKey] || 0;
  } catch {
    return 0;
  }
}

function addDailyMinutes(minutes: number): void {
  if (typeof window === 'undefined') return;

  const stored = localStorage.getItem(STORAGE_KEY);
  let data: Record<string, number> = {};

  if (stored) {
    try {
      data = JSON.parse(stored);
    } catch {
      data = {};
    }
  }

  const todayKey = getTodayKey();
  data[todayKey] = (data[todayKey] || 0) + minutes;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function VayuApp() {
  const [screen, setScreen] = useState<'setup' | 'practice'>('setup');
  const [technique, setTechnique] = useState<BreathingTechnique>('box');
  const [duration, setDuration] = useState(5);
  const [dailyMinutes, setDailyMinutes] = useState(0);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [musicVolume, setMusicVolume] = useState(0.3);

  const breathing = useBreathing(technique, duration);
  useVoiceGuidance(breathing.currentPhase, breathing.isActive);
  const audioRef = useBackgroundMusic(breathing.isActive, musicEnabled, musicVolume);

  // Load daily minutes on mount
  useEffect(() => {
    setDailyMinutes(getDailyMinutes());
  }, []);

  // Update daily minutes when session completes
  useEffect(() => {
    if (!breathing.isActive && breathing.timeRemaining === 0 && screen === 'practice') {
      addDailyMinutes(duration);
      setDailyMinutes(getDailyMinutes());
    }
  }, [breathing.isActive, breathing.timeRemaining, duration, screen]);

  const handleStart = () => {
    setScreen('practice');
    breathing.start();
  };

  const handleBack = () => {
    breathing.stop();
    setScreen('setup');
  };

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 font-['Crimson_Pro'] overflow-hidden">
      {/* Ambient background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: '10s', animationDelay: '2s' }} />
      </div>

      <div className="relative z-10">
        {screen === 'setup' ? (
          // ============================================================================
          // SETUP SCREEN
          // ============================================================================
          <div className="min-h-screen flex items-center justify-center p-8">
            <div className="max-w-2xl w-full space-y-12 animate-fade-in">
              {/* Header */}
              <div className="text-center space-y-4">
                <h1 className="text-7xl font-light tracking-wider text-cyan-400"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  Vayu
                </h1>
                <p className="text-slate-400 text-lg tracking-wide">
                  Journey into stillness through breath
                </p>

                {/* Daily progress */}
                <div className="inline-flex items-center gap-3 bg-slate-800/30 px-6 py-3 rounded-full border border-slate-700/50">
                  <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" />
                  <span className="text-sm text-slate-300">
                    Today: <span className="font-semibold text-cyan-300">{dailyMinutes}</span> minutes
                  </span>
                </div>
              </div>

              {/* Technique Selection */}
              <div className="space-y-4">
                <label className="block text-sm uppercase tracking-widest text-slate-400 mb-4">
                  Choose Your Practice
                </label>
                <div className="grid gap-4">
                  {Object.entries(BREATHING_TECHNIQUES).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => setTechnique(key as BreathingTechnique)}
                      className={`
                        p-6 rounded-2xl border-2 transition-all duration-300 text-left
                        ${technique === key
                          ? 'border-cyan-400 bg-cyan-950/30 shadow-lg shadow-cyan-500/20'
                          : 'border-slate-700/50 bg-slate-800/20 hover:border-slate-600'
                        }
                      `}
                    >
                      <h3 className="text-xl font-medium mb-2">{config.name}</h3>
                      <p className="text-sm text-slate-400">
                        {config.phases.map(p => `${p.duration / 1000}s ${p.name}`).join(' • ')}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration Slider */}
              <div className="space-y-6">
                <label className="block text-sm uppercase tracking-widest text-slate-400">
                  Duration: {duration} minutes
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-full appearance-none cursor-pointer
                           [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 
                           [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-cyan-400 
                           [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg
                           [&::-webkit-slider-thumb]:shadow-cyan-500/50
                           [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 
                           [&::-moz-range-thumb]:bg-cyan-400 [&::-moz-range-thumb]:border-0
                           [&::-moz-range-thumb]:rounded-full"
                />
                <div className="flex justify-between text-xs text-slate-500 uppercase tracking-wider">
                  <span>1 min</span>
                  <span>20 min</span>
                </div>
              </div>

              {/* Background Music Controls */}
              <div className="space-y-4 p-6 bg-slate-800/20 rounded-2xl border border-slate-700/50">
                <div className="flex items-center justify-between">
                  <label className="text-sm uppercase tracking-widest text-slate-400">
                    Background Music
                  </label>
                  <button
                    onClick={() => setMusicEnabled(!musicEnabled)}
                    className={`
                      relative w-14 h-7 rounded-full transition-all duration-300
                      ${musicEnabled ? 'bg-cyan-500' : 'bg-slate-700'}
                    `}
                  >
                    <div className={`
                      absolute top-1 w-5 h-5 bg-white rounded-full transition-all duration-300
                      ${musicEnabled ? 'left-8' : 'left-1'}
                    `} />
                  </button>
                </div>

                {musicEnabled && (
                  <div className="space-y-2 animate-fade-in">
                    <label className="block text-xs text-slate-400">
                      Volume: {Math.round(musicVolume * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={musicVolume}
                      onChange={(e) => setMusicVolume(Number(e.target.value))}
                      className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer
                               [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 
                               [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-cyan-400 
                               [&::-webkit-slider-thumb]:rounded-full
                               [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 
                               [&::-moz-range-thumb]:bg-cyan-400 [&::-moz-range-thumb]:border-0
                               [&::-moz-range-thumb]:rounded-full"
                    />
                  </div>
                )}
              </div>

              {/* Start Button */}
              <button
                onClick={handleStart}
                className="w-full py-5 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-2xl
                         font-medium text-lg tracking-wide transition-all duration-300
                         hover:shadow-2xl hover:shadow-cyan-500/30 hover:scale-[1.02]
                         active:scale-[0.98]"
              >
                Begin Practice
              </button>
            </div>
          </div>
        ) : (
          // ============================================================================
          // PRACTICE SCREEN
          // ============================================================================
          <div className="min-h-screen flex items-center justify-center p-8">
            <div className="text-center space-y-12 animate-fade-in">
              {/* Progress Ring with Orb */}
              <div className="relative inline-flex items-center justify-center">
                <div className="absolute">
                  <CircularProgress
                    progress={1 - breathing.timeRemaining / breathing.totalDuration}
                    size={520}
                    strokeWidth={4}
                  />
                </div>
                <PixiOrb
                  phase={breathing.currentPhase}
                  progress={breathing.progress}
                  isActive={breathing.isActive}
                />
              </div>

              {/* Phase Instruction */}
              <div className="space-y-4">
                <p className="text-4xl font-light tracking-wide text-cyan-300 min-h-[3rem]"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  {breathing.currentPhase?.instruction || 'Prepare yourself'}
                </p>
                <p className="text-slate-400 text-lg">
                  {formatTime(breathing.timeRemaining)} remaining
                </p>
              </div>

              {/* Controls */}
              <div className="flex gap-4 justify-center items-center flex-wrap">
                {breathing.isActive ? (
                  <button
                    onClick={breathing.stop}
                    className="px-8 py-3 bg-slate-800/50 border border-slate-700 rounded-xl
                             hover:bg-slate-700/50 transition-all duration-200"
                  >
                    Pause
                  </button>
                ) : (
                  <button
                    onClick={breathing.start}
                    className="px-8 py-3 bg-cyan-500/20 border border-cyan-500/50 rounded-xl
                             hover:bg-cyan-500/30 transition-all duration-200"
                  >
                    Resume
                  </button>
                )}
                <button
                  onClick={handleBack}
                  className="px-8 py-3 bg-slate-800/50 border border-slate-700 rounded-xl
                           hover:bg-slate-700/50 transition-all duration-200"
                >
                  End Session
                </button>

                {/* Music Toggle */}
                <button
                  onClick={() => setMusicEnabled(!musicEnabled)}
                  className={`
                    px-6 py-3 rounded-xl border transition-all duration-200
                    ${musicEnabled
                      ? 'bg-cyan-500/20 border-cyan-500/50 hover:bg-cyan-500/30'
                      : 'bg-slate-800/50 border-slate-700 hover:bg-slate-700/50'
                    }
                  `}
                  title={musicEnabled ? 'Music On' : 'Music Off'}
                >
                  {musicEnabled ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden Audio Element for Background Music */}
      <audio ref={audioRef} loop>
        <source src="/music.mp3" type="audio/mpeg" />
      </audio>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=Crimson+Pro:wght@300;400;500&display=swap');
        
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }
      `}</style>
    </div>
  );
}
