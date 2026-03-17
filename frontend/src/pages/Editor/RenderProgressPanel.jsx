import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Check, Layers, Mic, Settings, Film } from 'lucide-react';

const RENDER_PHASES = [
  { key: 'prepare', label: 'Preparing', range: [0, 10], icon: Layers },
  { key: 'voice', label: 'Generating Voices', range: [10, 40], icon: Mic },
  { key: 'bundle', label: 'Bundling', range: [40, 50], icon: Settings },
  { key: 'render', label: 'Rendering Frames', range: [50, 95], icon: Film },
  { key: 'finalize', label: 'Finalizing', range: [95, 100], icon: Check },
];

export function RenderProgressPanel({ progress, step }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, []);
  
  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const currentPhase = RENDER_PHASES.find(p => progress >= p.range[0] && progress < p.range[1]) || RENDER_PHASES[RENDER_PHASES.length - 1];

  return (
    <div className="p-6" data-testid="render-progress-panel">
      <div className="flex items-center gap-3 mb-6">
        <div className="relative w-14 h-14 flex items-center justify-center">
          <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="24" fill="none" stroke="#e2e8f0" strokeWidth="4" />
            <circle cx="28" cy="28" r="24" fill="none" stroke="url(#prog-grad)" strokeWidth="4" strokeLinecap="round"
              strokeDasharray={`${(progress / 100) * 150.8} 150.8`} className="transition-all duration-500" />
            <defs><linearGradient id="prog-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#4f46e5" /><stop offset="100%" stopColor="#ec4899" /></linearGradient></defs>
          </svg>
          <span className="absolute text-sm font-black text-slate-900">{progress}%</span>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-black text-slate-900">Rendering Video</h3>
          <p className="text-xs text-slate-400 font-mono">{formatTime(elapsed)} elapsed</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <span className="text-[10px] font-bold text-indigo-600 uppercase">Active</span>
        </div>
      </div>

      <div className="relative w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-6">
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, #4f46e5, #8b5cf6, #ec4899)', width: `${progress}%` }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        <div className="absolute inset-0 overflow-hidden rounded-full">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
        </div>
      </div>

      <div className="flex items-center gap-2 mb-5 px-3 py-2 rounded-sm bg-slate-50 border border-slate-200">
        <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin flex-shrink-0" />
        <p className="text-xs text-slate-600 font-semibold truncate">{step || 'Processing...'}</p>
      </div>

      <div className="space-y-1">
        {RENDER_PHASES.map((phase) => {
          const isActive = progress >= phase.range[0] && progress < phase.range[1];
          const isDone = progress >= phase.range[1];
          const PhaseIcon = phase.icon;
          return (
            <div key={phase.key} className={`flex items-center gap-3 px-3 py-2 rounded-sm transition-all ${isActive ? 'bg-indigo-50 border border-indigo-200' : isDone ? 'opacity-50' : 'opacity-30'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-emerald-500' : isActive ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                {isDone ? <Check className="w-3 h-3 text-white" /> : isActive ? <PhaseIcon className="w-3 h-3 text-white animate-pulse" /> : <PhaseIcon className="w-3 h-3 text-white" />}
              </div>
              <span className={`text-xs font-bold flex-1 ${isActive ? 'text-indigo-700' : isDone ? 'text-slate-500' : 'text-slate-400'}`}>{phase.label}</span>
              {isDone && <span className="text-[9px] text-emerald-600 font-bold">DONE</span>}
              {isActive && <span className="text-[9px] text-indigo-500 font-bold">IN PROGRESS</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
