import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Play, Pause, SkipBack, SkipForward, ArrowLeft, Mic, Film } from 'lucide-react';
import { CATEGORIES, useCaptionStore } from '../../store/useProjectStore';
import { CAPTION_STYLES } from './editorConstants';

export function CanvasPreview({ project, videoCategory, selectedSlideId, setSelectedSlideId }) {
  const cat = CATEGORIES.find(c => c.id === videoCategory);
  const { activeCaptionStyleId, captionFont, captionColor, captionBgColor, captionPosition, captionSize } = useCaptionStore();
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [globalTime, setGlobalTime] = useState(0);
  const audioRef = React.useRef(null);
  const playIntervalRef = React.useRef(null);
  
  const currentSlideIdx = project?.slides?.findIndex(s => s.id === selectedSlideId) ?? 0;
  const currentSlide = project?.slides?.[currentSlideIdx];
  const totalDuration = project?.slides?.reduce((sum, s) => sum + (s.duration || 6), 0) || 0;

  const goToSlide = (idx) => {
    if (project?.slides?.[idx]) setSelectedSlideId(project.slides[idx].id);
  };

  const getSlideTimeOffset = (idx) => {
    let offset = 0;
    for (let i = 0; i < idx; i++) offset += project?.slides?.[i]?.duration || 6;
    return offset;
  };

  const getCaptionStyle = () => {
    const styles = {
      'bold-pop': { background: '#FBBF24', color: '#000', fontWeight: 'bold', padding: '8px 24px', borderRadius: '8px' },
      'netflix': { background: 'transparent', color: '#fff', fontWeight: 'bold', textShadow: '2px 2px 4px rgba(0,0,0,0.9), -1px -1px 3px rgba(0,0,0,0.6)', padding: '8px 16px' },
      'minimal': { background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '10px 24px', borderRadius: '12px' },
      'tiktok': { background: '#1a1a1a', color: '#FF2D55', fontWeight: 'bold', padding: '8px 24px', borderRadius: '8px' },
      'neon': { background: 'transparent', color: '#00F5FF', fontWeight: 'bold', textShadow: '0 0 10px #00F5FF, 0 0 20px #00F5FF, 0 0 40px #00F5FF', padding: '8px 16px' },
      'glass': { background: 'rgba(255,255,255,0.1)', color: '#fff', backdropFilter: 'blur(8px)', padding: '10px 24px', borderRadius: '12px' },
    };
    return styles[activeCaptionStyleId] || styles['minimal'];
  };

  React.useEffect(() => {
    if (playing && project?.slides?.length) {
      const slideDuration = currentSlide?.duration || 6;
      let elapsed = 0;
      if (currentSlide?.voiceUrl && audioRef.current) {
        audioRef.current.src = `${process.env.REACT_APP_BACKEND_URL}${currentSlide.voiceUrl}`;
        audioRef.current.play().catch(() => {});
      }
      playIntervalRef.current = setInterval(() => {
        elapsed += 0.1;
        const slideProgress = (elapsed / slideDuration) * 100;
        setProgress(slideProgress);
        const slideOffset = getSlideTimeOffset(currentSlideIdx);
        setGlobalTime(slideOffset + elapsed);
        if (elapsed >= slideDuration) {
          const nextIdx = currentSlideIdx + 1;
          if (nextIdx < project.slides.length) { goToSlide(nextIdx); elapsed = 0; }
          else { setPlaying(false); goToSlide(0); setProgress(0); setGlobalTime(0); }
        }
      }, 100);
      return () => { if (playIntervalRef.current) clearInterval(playIntervalRef.current); if (audioRef.current) audioRef.current.pause(); };
    } else {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
      if (audioRef.current) audioRef.current.pause();
    }
  }, [playing, currentSlideIdx, currentSlide]);

  React.useEffect(() => { setProgress(0); }, [selectedSlideId]);

  const togglePlay = () => {
    if (!playing) { setProgress(0); setGlobalTime(getSlideTimeOffset(currentSlideIdx)); }
    setPlaying(!playing);
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const captionCss = getCaptionStyle();

  return (
    <div className="flex-1 flex flex-col bg-[#060a14]">
      <audio ref={audioRef} className="hidden" />
      
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="relative w-full max-w-4xl aspect-video rounded-md overflow-hidden bg-black shadow-2xl" style={{ boxShadow: `0 0 80px ${cat?.color}15` }}>
          {currentSlide?.assetUrl ? (
            currentSlide.assetType === 'video' ? (
              <video
                key={currentSlide.id}
                src={currentSlide.assetUrl.startsWith('/api') ? `${process.env.REACT_APP_BACKEND_URL}${currentSlide.assetUrl}` : currentSlide.assetUrl}
                className="w-full h-full object-cover"
                autoPlay loop muted playsInline
              />
            ) : (
              <img src={currentSlide.assetUrl.startsWith('/api') ? `${process.env.REACT_APP_BACKEND_URL}${currentSlide.assetUrl}` : currentSlide.assetUrl} className="w-full h-full object-cover" alt={currentSlide.title} />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${cat?.color}20, #030712)` }}>
              <div className="text-center px-8">
                <Sparkles className="w-12 h-12 mx-auto mb-3 text-slate-700" />
                <p className="text-base font-semibold text-slate-500 mb-1">{currentSlide?.title || 'No slide selected'}</p>
                <p className="text-sm text-slate-600">Generate or upload an asset for this slide</p>
              </div>
            </div>
          )}
          
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-black/60 backdrop-blur">
              <span className="text-xs font-bold text-white">Slide {currentSlideIdx + 1}/{project?.slides?.length || 0}</span>
              {currentSlide?.voiceUrl && <Mic className="w-3 h-3 text-emerald-400" />}
            </div>
            <div className="px-3 py-1.5 rounded-sm bg-black/60 backdrop-blur">
              <span className="text-xs text-slate-300 font-mono">{currentSlide?.duration || 6}s</span>
            </div>
          </div>
          
          {currentSlide?.narration && activeCaptionStyleId && (
            <div className={`absolute left-4 right-4 flex justify-center ${captionPosition === 'top' ? 'top-14' : captionPosition === 'center' ? 'top-1/2 -translate-y-1/2' : 'bottom-14'}`}>
              <div style={{ ...captionCss, fontFamily: captionFont || captionCss.fontFamily, color: captionColor || captionCss.color, background: captionBgColor || captionCss.background, fontSize: `${Math.max(10, captionSize * 0.32)}px` }} className="max-w-[80%]">
                <p className="text-center leading-relaxed">{currentSlide.narration}</p>
              </div>
            </div>
          )}
          
          {currentSlide?.title && currentSlide?.titlePosition !== 'hidden' && (
            <div className={`absolute px-4 ${
              (currentSlide.titlePosition || 'top-left').includes('top') ? 'top-14' : 'bottom-14'
            } ${
              (currentSlide.titlePosition || 'top-left').includes('left') ? 'left-4 text-left' : 'left-1/2 -translate-x-1/2 text-center'
            }`}>
              <div className="px-4 py-1.5 rounded-sm bg-black/70 backdrop-blur">
                <p className="text-sm font-bold text-white">{currentSlide.title}</p>
              </div>
            </div>
          )}
          
          {currentSlide?.onScreenText && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-2 rounded-sm bg-black/80 backdrop-blur">
              <p className="text-lg font-bold text-white text-center">{currentSlide.onScreenText}</p>
            </div>
          )}
          
          {playing && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-pink-500 transition-all duration-100" style={{ width: `${(globalTime / totalDuration) * 100}%` }} />
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-white/[0.06] bg-[#0a0f1a]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-3">
            <p className="text-xs text-slate-500 truncate max-w-md mx-auto font-semibold">{currentSlide?.title}: {currentSlide?.narration?.slice(0, 60)}...</p>
          </div>
          
          <div className="flex items-center justify-center gap-4 mb-3">
            <button onClick={() => { setPlaying(false); goToSlide(0); }} className="p-2 rounded-sm text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition" title="Go to start">
              <SkipBack className="w-5 h-5" />
            </button>
            <button onClick={() => goToSlide(Math.max(0, currentSlideIdx - 1))} className="p-2 rounded-sm text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition" title="Previous slide">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button onClick={togglePlay} className="w-14 h-14 rounded-sm flex items-center justify-center text-white shadow-lg btn-sharp" style={{ background: cat?.color || '#6366f1' }} data-testid="play-btn" title={playing ? 'Pause' : 'Play preview'}>
              {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 translate-x-0.5" />}
            </button>
            <button onClick={() => goToSlide(Math.min((project?.slides?.length || 1) - 1, currentSlideIdx + 1))} className="p-2 rounded-sm text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition" title="Next slide">
              <ArrowLeft className="w-5 h-5 rotate-180" />
            </button>
            <button onClick={() => { setPlaying(false); goToSlide((project?.slides?.length || 1) - 1); }} className="p-2 rounded-sm text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition" title="Go to end">
              <SkipForward className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex gap-1.5">
            {project?.slides?.map((s, i) => (
              <button key={s.id} onClick={() => { setPlaying(false); goToSlide(i); }} className={`flex-1 h-12 rounded-sm overflow-hidden border-2 transition-all ${i === currentSlideIdx ? 'border-indigo-500 scale-105' : 'border-white/[0.08] opacity-60 hover:opacity-100'}`} title={`Slide ${i + 1}: ${s.title}`}>
                {s.assetUrl ? (
                  <img src={s.assetUrl.startsWith('/api') ? `${process.env.REACT_APP_BACKEND_URL}${s.assetUrl}` : s.assetUrl} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full bg-[#0d1117] flex items-center justify-center">
                    <span className="text-[10px] text-slate-600 font-bold">{i + 1}</span>
                  </div>
                )}
              </button>
            ))}
          </div>
          
          <div className="text-center mt-2">
            <span className="text-[10px] text-slate-600 font-mono">
              {playing ? `${formatTime(globalTime)} / ${formatTime(totalDuration)}` : `Total duration: ${totalDuration}s`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
