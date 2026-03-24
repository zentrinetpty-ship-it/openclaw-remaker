import React from 'react';
import { Slider } from '../../components/ui/slider';

export function RightSidebar({ project, primaryColor, setPrimaryColor, selectedFont, setSelectedFont, selectedSlideId, updateSlide }) {
  const currentSlide = project?.slides?.find(s => s.id === selectedSlideId) || project?.slides?.[0];

  return (
    <div className="w-72 bg-[#0a0f1a] border-l border-white/[0.06] p-4 space-y-6">
      <div>
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3">Brand Kit</h3>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-slate-500 uppercase font-bold">Primary Color</label>
            <div className="flex gap-2 mt-1">
              {['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'].map(c => (
                <button key={c} onClick={() => setPrimaryColor(c)} className={`w-7 h-7 rounded-sm border-2 transition ${primaryColor === c ? 'border-slate-200 scale-110' : 'border-white/[0.08] hover:border-white/[0.2]'}`} style={{ background: c }} />
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase font-bold">Font</label>
            <select value={selectedFont} onChange={e => setSelectedFont(e.target.value)} className="w-full mt-1 bg-[#0d1117] border-2 border-white/[0.08] rounded-sm px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 outline-none">
              {['Outfit', 'Inter', 'Manrope', 'Poppins', 'Roboto'].map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
        </div>
      </div>

      {currentSlide && (
        <div>
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3">Slide Properties</h3>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-slate-500 uppercase font-bold">Title</label>
              <input type="text" value={currentSlide.title} readOnly className="w-full mt-1 bg-[#0d1117] border-2 border-white/[0.08] rounded-sm px-3 py-2 text-xs text-slate-200" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase font-bold">Duration ({currentSlide.duration}s)</label>
              <Slider value={[currentSlide.duration]} onValueChange={(val) => updateSlide(currentSlide.id, { duration: val[0] })} max={30} min={2} step={1} className="mt-2" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase font-bold">Transition</label>
              <select value={currentSlide.transition || 'fade'} onChange={(e) => updateSlide(currentSlide.id, { transition: e.target.value })} className="w-full mt-1 bg-[#0d1117] border-2 border-white/[0.08] rounded-sm px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 outline-none">
                {['fade', 'slide', 'zoom', 'none'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase font-bold">VFX Effect</label>
              <select value={currentSlide.vfx || 'none'} onChange={(e) => updateSlide(currentSlide.id, { vfx: e.target.value })} className="w-full mt-1 bg-[#0d1117] border-2 border-white/[0.08] rounded-sm px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 outline-none">
                {['none', 'cinematic', 'vhs', 'glitch', 'grayscale', 'blur'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
