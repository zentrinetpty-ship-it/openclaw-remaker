import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowLeft, Save, Download, Play, Pause, SkipBack, SkipForward, Volume2, FileText, Image, Music, Volume1, Mic, Captions, Wand2, Heart, ZoomIn, ZoomOut, Settings, Layers, SlidersHorizontal, Loader2, Check, X, Film, RefreshCcw } from 'lucide-react';
import { useProjectStore, useBrandKitStore, useCaptionStore, CATEGORIES } from '../store/useProjectStore';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Slider } from '../components/ui/slider';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const TABS = [
  { id: 'script', label: 'Script', icon: FileText },
  { id: 'assets', label: 'Assets', icon: Image },
  { id: 'music', label: 'Music', icon: Music },
  { id: 'voice', label: 'Voice', icon: Mic },
  { id: 'captions', label: 'Captions', icon: Captions },
  { id: 'effects', label: 'Effects', icon: Wand2 },
];

const CAPTION_STYLES = [
  { id: 'bold-pop', name: 'Bold Pop', bg: '#FBBF24', text: '#000' },
  { id: 'netflix', name: 'Netflix', bg: 'transparent', text: '#fff' },
  { id: 'minimal', name: 'Minimal', bg: 'rgba(0,0,0,0.7)', text: '#fff' },
  { id: 'tiktok', name: 'TikTok', bg: '#1a1a1a', text: '#FF2D55' },
  { id: 'neon', name: 'Neon', bg: 'transparent', text: '#00F5FF' },
  { id: 'glass', name: 'Glass', bg: 'rgba(255,255,255,0.1)', text: '#fff' },
];

const VFX_OPTIONS = ['none', 'cinematic', 'vhs', 'glitch', 'grayscale', 'blur'];
const TRANSITION_OPTIONS = ['fade', 'slide', 'zoom', 'none'];
const VOICES = [
  { id: 'en-US-Journey-D', name: 'Journey D', accent: 'American', gender: 'Male', type: 'Narrative' },
  { id: 'en-US-Journey-F', name: 'Journey F', accent: 'American', gender: 'Female', type: 'Narrative' },
  { id: 'en-US-Wavenet-D', name: 'Wavenet D', accent: 'American', gender: 'Male', type: 'Standard' },
  { id: 'en-US-Wavenet-F', name: 'Wavenet F', accent: 'American', gender: 'Female', type: 'Standard' },
  { id: 'en-GB-Neural2-B', name: 'Neural2 B', accent: 'British', gender: 'Male', type: 'Pro' },
  { id: 'en-GB-Neural2-A', name: 'Neural2 A', accent: 'British', gender: 'Female', type: 'Pro' },
  { id: 'en-AU-Neural2-B', name: 'Neural2 B', accent: 'Australian', gender: 'Male', type: 'Pro' },
  { id: 'en-AU-Neural2-C', name: 'Neural2 C', accent: 'Australian', gender: 'Female', type: 'Pro' },
];

function LeftSidebar({ activeTab, setActiveTab, project, updateSlide, videoCategory, primaryColor, selectedSlideId, setSelectedSlideId }) {
  const cat = CATEGORIES.find(c => c.id === videoCategory);
  const { setProject } = useProjectStore();
  const { activeCaptionStyleId, setActiveCaptionStyleId, captionMode, setCaptionMode } = useCaptionStore();
  const [generating, setGenerating] = useState({});
  const [selectedVoice, setSelectedVoice] = useState('en-US-Journey-D');
  const [playingAudio, setPlayingAudio] = useState(null);
  const audioRef = React.useRef(null);
  
  const activeSlide = project?.slides?.find(s => s.id === selectedSlideId) || project?.slides?.[0];

  const generateImage = async (slide) => {
    setGenerating(g => ({ ...g, [slide.id]: 'image' }));
    updateSlide(slide.id, { assetGenerating: true });
    try {
      const res = await axios.post(`${API}/generate-image`, { description: slide.imagePrompt, style: 'Cinematic', characters: project?.characters });
      if (res.data.success) updateSlide(slide.id, { assetType: 'image', assetUrl: res.data.image, assetGenerating: false });
    } catch (e) { console.error(e); }
    updateSlide(slide.id, { assetGenerating: false });
    setGenerating(g => ({ ...g, [slide.id]: null }));
  };

  const generateVoice = async (slide) => {
    if (!slide.narration) return;
    setGenerating(g => ({ ...g, [`voice_${slide.id}`]: true }));
    try {
      const res = await axios.post(`${API}/generate-voice`, { 
        text: slide.narration, 
        voiceId: selectedVoice 
      });
      if (res.data.success) {
        updateSlide(slide.id, { voiceUrl: res.data.url });
      }
    } catch (e) { 
      console.error('Voice generation error:', e); 
    }
    setGenerating(g => ({ ...g, [`voice_${slide.id}`]: false }));
  };

  const generateAllVoices = async () => {
    for (const slide of project?.slides || []) {
      if (!slide.voiceUrl && slide.narration) {
        await generateVoice(slide);
      }
    }
  };

  const generateAllMissing = async () => {
    for (const slide of project?.slides || []) {
      if (!slide.assetUrl) await generateImage(slide);
    }
  };

  const playAudio = (url) => {
    if (audioRef.current) {
      if (playingAudio === url) {
        audioRef.current.pause();
        setPlayingAudio(null);
      } else {
        audioRef.current.src = `${process.env.REACT_APP_BACKEND_URL}${url}`;
        audioRef.current.play();
        setPlayingAudio(url);
      }
    }
  };

  return (
    <div className="w-80 bg-[#0a0f1a] border-r border-slate-800 flex flex-col h-full">
      <div className="flex border-b border-slate-800 p-1 gap-0.5 overflow-x-auto scrollbar-hide">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center gap-0.5 px-2.5 py-2 rounded-lg flex-shrink-0 ${activeTab === tab.id ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`} data-testid={`tab-${tab.id}`}>
            <tab.icon className="w-4 h-4" />
            <span className="text-[9px] font-semibold">{tab.label}</span>
          </button>
        ))}
      </div>

      <audio ref={audioRef} onEnded={() => setPlayingAudio(null)} className="hidden" />
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {activeTab === 'script' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Slides</h3>
              <span className="text-[10px] text-slate-500">{project?.slides?.length || 0} total</span>
            </div>
            {project?.slides?.map((slide, idx) => (
              <div key={slide.id} onClick={() => setSelectedSlideId(slide.id)} className={`p-3 rounded-xl bg-slate-800/50 border cursor-pointer group ${selectedSlideId === slide.id ? 'border-violet-500' : 'border-slate-700 hover:border-violet-500/50'}`}>
                <div className="flex items-start gap-3">
                  <div className="w-16 h-10 rounded-lg bg-slate-900 flex-shrink-0 overflow-hidden flex items-center justify-center">
                    {slide.assetUrl ? (
                      <img src={slide.assetUrl.startsWith('/api') ? `${process.env.REACT_APP_BACKEND_URL}${slide.assetUrl}` : slide.assetUrl} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <span className="text-xs text-slate-600">{idx + 1}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-white truncate">{slide.title}</p>
                      {slide.voiceUrl && <Mic className="w-3 h-3 text-emerald-400" />}
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">{slide.narration}</p>
                    <div className="flex items-center gap-2 mt-1 text-[9px] text-slate-600">
                      <span>{slide.duration}s</span>
                      <span>·</span>
                      <span className="capitalize">{slide.transition || 'fade'}</span>
                      {slide.vfx && slide.vfx !== 'none' && <span className="text-violet-400">· {slide.vfx}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'assets' && activeSlide && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Image Prompt</h3>
              <Textarea value={activeSlide.imagePrompt} className="min-h-[80px] text-xs bg-slate-900 border-slate-700" readOnly />
              <Button onClick={() => generateImage(activeSlide)} disabled={generating[activeSlide.id]} size="sm" className="w-full mt-2" style={{ background: `linear-gradient(135deg, ${cat?.color}, #EC4899)` }} data-testid="gen-image-btn">
                <Wand2 className="w-3 h-3 mr-1" /> Generate Image
              </Button>
            </div>
            <Button variant="outline" onClick={generateAllMissing} size="sm" className="w-full" data-testid="gen-all-btn">
              <Sparkles className="w-3 h-3 mr-1" /> Generate All Missing
            </Button>
          </div>
        )}

        {activeTab === 'music' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Background Music</h3>
              {project?.bgmUrl ? (
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700">
                  <audio controls src={project.bgmUrl} className="w-full h-8" />
                  <div className="mt-2 flex items-center gap-2">
                    <Volume2 className="w-3 h-3 text-slate-500" />
                    <Slider defaultValue={[project.bgmVolume || 0.4]} max={1} step={0.1} className="flex-1" />
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 text-center p-4 border border-dashed border-slate-700 rounded-xl">No BGM assigned</div>
              )}
            </div>
            {project?.suggestedMusic?.length > 0 && (
              <div>
                <h4 className="text-[10px] font-semibold text-slate-400 uppercase mb-2">AI Suggestions</h4>
                <div className="flex flex-wrap gap-1.5">
                  {project.suggestedMusic.slice(0, 5).map((m, i) => (
                    <span key={i} className="px-2 py-1 rounded-lg text-[10px] bg-violet-500/10 border border-violet-500/30 text-violet-300 cursor-pointer hover:bg-violet-500/20">{m}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'voice' && (
          <div className="space-y-4">
            {/* Voice Selection */}
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Select Voice</h3>
              <div className="grid grid-cols-1 gap-2">
                {VOICES.map(voice => (
                  <button 
                    key={voice.id} 
                    onClick={() => setSelectedVoice(voice.id)}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between ${selectedVoice === voice.id ? 'border-violet-500 bg-violet-500/10' : 'border-slate-700 hover:border-slate-600'}`}
                    data-testid={`voice-${voice.id}`}
                  >
                    <div>
                      <p className="text-xs font-semibold text-white">{voice.name}</p>
                      <p className="text-[9px] text-slate-500">{voice.accent} · {voice.gender} · {voice.type}</p>
                    </div>
                    {selectedVoice === voice.id && <Check className="w-4 h-4 text-violet-400" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-slate-800" />

            {/* Per-Slide Voice Generation */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Slide Voices</h3>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={generateAllVoices}
                  className="text-[10px] h-7"
                  data-testid="gen-all-voices"
                >
                  <Sparkles className="w-3 h-3 mr-1" /> Generate All
                </Button>
              </div>
              
              <div className="space-y-2">
                {project?.slides?.map((slide, idx) => (
                  <div key={slide.id} className="p-3 rounded-xl bg-slate-800/50 border border-slate-700">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold text-slate-400">Slide {idx + 1}: {slide.title}</p>
                        <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5 italic">"{slide.narration}"</p>
                      </div>
                    </div>
                    
                    {slide.voiceUrl ? (
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => playAudio(slide.voiceUrl)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold"
                        >
                          {playingAudio === slide.voiceUrl ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                          {playingAudio === slide.voiceUrl ? 'Pause' : 'Play'}
                        </button>
                        <button 
                          onClick={() => generateVoice(slide)}
                          disabled={generating[`voice_${slide.id}`]}
                          className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-700 text-slate-300 text-[10px]"
                        >
                          <RefreshCcw className="w-3 h-3" /> Regen
                        </button>
                        <span className="text-[9px] text-emerald-400 flex items-center gap-1"><Check className="w-3 h-3" /> Done</span>
                      </div>
                    ) : (
                      <Button 
                        size="sm" 
                        onClick={() => generateVoice(slide)}
                        disabled={generating[`voice_${slide.id}`] || !slide.narration}
                        className="w-full h-8 text-[10px]"
                        style={{ background: `linear-gradient(135deg, ${cat?.color}, #EC4899)` }}
                        data-testid={`gen-voice-${slide.id}`}
                      >
                        {generating[`voice_${slide.id}`] ? (
                          <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Generating...</>
                        ) : (
                          <><Wand2 className="w-3 h-3 mr-1" /> Generate Voice</>
                        )}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'captions' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Caption Style</h3>
            <div className="grid grid-cols-2 gap-2">
              {CAPTION_STYLES.map(style => (
                <button key={style.id} onClick={() => setActiveCaptionStyleId(style.id)} className={`p-3 rounded-xl border text-center ${activeCaptionStyleId === style.id ? 'border-violet-500' : 'border-slate-700'}`} data-testid={`caption-${style.id}`}>
                  <div className="w-full h-6 rounded flex items-center justify-center text-[10px] font-bold" style={{ background: style.bg, color: style.text }}>{style.name}</div>
                </button>
              ))}
            </div>
            <div>
              <h4 className="text-[10px] font-semibold text-slate-400 uppercase mb-2">Mode</h4>
              <div className="flex gap-1">
                {['sentence', 'lines', 'words'].map(m => (
                  <button key={m} onClick={() => setCaptionMode(m)} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${captionMode === m ? 'bg-violet-500 text-white' : 'bg-slate-800 text-slate-400'}`}>{m}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'effects' && activeSlide && (
          <div className="space-y-4">
            {/* Transition Style */}
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Transition</h3>
              <div className="grid grid-cols-2 gap-2">
                {TRANSITION_OPTIONS.map(trans => (
                  <button 
                    key={trans} 
                    onClick={() => updateSlide(activeSlide.id, { transition: trans })} 
                    className={`p-2.5 rounded-xl border text-xs font-semibold capitalize ${activeSlide.transition === trans ? 'border-violet-500 bg-violet-500/10 text-white' : 'border-slate-700 text-slate-400'}`}
                    data-testid={`trans-${trans}`}
                  >
                    {trans}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-slate-800" />

            {/* VFX Effects */}
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Visual Effects</h3>
              <div className="grid grid-cols-2 gap-2">
                {VFX_OPTIONS.map(vfx => (
                  <button 
                    key={vfx} 
                    onClick={() => updateSlide(activeSlide.id, { vfx })} 
                    className={`p-2.5 rounded-xl border text-xs font-semibold capitalize ${activeSlide.vfx === vfx ? 'border-violet-500 bg-violet-500/10 text-white' : 'border-slate-700 text-slate-400'}`} 
                    data-testid={`vfx-${vfx}`}
                  >
                    {vfx}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-slate-800" />

            {/* Apply to All */}
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Batch Apply</h3>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => project?.slides?.forEach(s => updateSlide(s.id, { transition: activeSlide.transition }))}
                >
                  Apply transition to all slides
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => project?.slides?.forEach(s => updateSlide(s.id, { vfx: activeSlide.vfx }))}
                >
                  Apply VFX to all slides
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CanvasPreview({ project, videoCategory, selectedSlideId, setSelectedSlideId }) {
  const cat = CATEGORIES.find(c => c.id === videoCategory);
  const [playing, setPlaying] = useState(false);
  const currentSlideIdx = project?.slides?.findIndex(s => s.id === selectedSlideId) ?? 0;
  const currentSlide = project?.slides?.[currentSlideIdx];

  const goToSlide = (idx) => {
    if (project?.slides?.[idx]) {
      setSelectedSlideId(project.slides[idx].id);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#050a14]">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="relative w-full max-w-4xl aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl" style={{ boxShadow: `0 0 80px ${cat?.color}20` }}>
          {currentSlide?.assetUrl ? (
            <img src={currentSlide.assetUrl.startsWith('/api') ? `${process.env.REACT_APP_BACKEND_URL}${currentSlide.assetUrl}` : currentSlide.assetUrl} className="w-full h-full object-cover" alt="" />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${cat?.color}30, #0f172a)` }}>
              <div className="text-center">
                <Sparkles className="w-12 h-12 mx-auto mb-2 text-slate-600" />
                <p className="text-sm text-slate-500">No asset for this slide</p>
              </div>
            </div>
          )}
          {/* On-screen text overlay */}
          {currentSlide?.onScreenText && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
              <p className="text-lg font-bold text-white text-center">{currentSlide.onScreenText}</p>
            </div>
          )}
          {/* Slide indicator */}
          <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur">
            <span className="text-xs font-semibold text-white">Slide {currentSlideIdx + 1}/{project?.slides?.length || 0}</span>
          </div>
        </div>
      </div>

      {/* Playback controls */}
      <div className="p-4 border-t border-slate-800 bg-[#0a0f1a]">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-4 mb-3">
            <button onClick={() => goToSlide(Math.max(0, currentSlideIdx - 1))} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"><SkipBack className="w-5 h-5" /></button>
            <button onClick={() => setPlaying(!playing)} className="w-12 h-12 rounded-full flex items-center justify-center text-white" style={{ background: `linear-gradient(135deg, ${cat?.color}, #EC4899)` }} data-testid="play-btn">
              {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 translate-x-0.5" />}
            </button>
            <button onClick={() => goToSlide(Math.min((project?.slides?.length || 1) - 1, currentSlideIdx + 1))} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"><SkipForward className="w-5 h-5" /></button>
          </div>
          {/* Timeline */}
          <div className="flex gap-1">
            {project?.slides?.map((s, i) => (
              <button key={s.id} onClick={() => goToSlide(i)} className="flex-1 h-2 rounded-full transition-all" style={{ background: i === currentSlideIdx ? `linear-gradient(90deg, ${cat?.color}, #EC4899)` : i < currentSlideIdx ? '#10b981' : '#1e293b' }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RightSidebar({ project, primaryColor, setPrimaryColor, selectedFont, setSelectedFont, selectedSlideId, updateSlide }) {
  const currentSlide = project?.slides?.find(s => s.id === selectedSlideId) || project?.slides?.[0];

  return (
    <div className="w-72 bg-[#0a0f1a] border-l border-slate-800 p-4 space-y-6">
      <div>
        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Brand Kit</h3>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-slate-500 uppercase">Primary Color</label>
            <div className="flex gap-2 mt-1">
              {['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'].map(c => (
                <button key={c} onClick={() => setPrimaryColor(c)} className={`w-7 h-7 rounded-lg border-2 ${primaryColor === c ? 'border-white' : 'border-transparent'}`} style={{ background: c }} />
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase">Font</label>
            <select value={selectedFont} onChange={e => setSelectedFont(e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
              {['Outfit', 'Inter', 'Manrope', 'Poppins', 'Roboto'].map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
        </div>
      </div>

      {currentSlide && (
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Slide Properties</h3>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-slate-500 uppercase">Title</label>
              <input type="text" value={currentSlide.title} readOnly className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase">Duration ({currentSlide.duration}s)</label>
              <Slider 
                value={[currentSlide.duration]} 
                onValueChange={(val) => updateSlide(currentSlide.id, { duration: val[0] })}
                max={30} 
                min={2}
                step={1} 
                className="mt-2" 
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase">Transition</label>
              <select 
                value={currentSlide.transition || 'fade'} 
                onChange={(e) => updateSlide(currentSlide.id, { transition: e.target.value })}
                className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
              >
                {['fade', 'slide', 'zoom', 'none'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase">VFX Effect</label>
              <select 
                value={currentSlide.vfx || 'none'} 
                onChange={(e) => updateSlide(currentSlide.id, { vfx: e.target.value })}
                className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
              >
                {['none', 'cinematic', 'vhs', 'glitch', 'grayscale', 'blur'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EditorPage() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { user } = useAuth();
  const { project, setProject, updateSlide, videoCategory } = useProjectStore();
  const { primaryColor, setPrimaryColor, selectedFont, setSelectedFont } = useBrandKitStore();
  const [activeTab, setActiveTab] = useState('script');
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderStatus, setRenderStatus] = useState(null);
  const [renderStep, setRenderStep] = useState('');
  const [renderUrl, setRenderUrl] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedSlideId, setSelectedSlideId] = useState(null);
  const cat = CATEGORIES.find(c => c.id === videoCategory);

  useEffect(() => {
    const loadProject = async () => {
      if (projectId && projectId !== 'new' && !project) {
        try {
          const res = await axios.get(`${API}/projects/${projectId}`);
          if (res.data.success && res.data.project?.projectData) {
            setProject(res.data.project.projectData);
          }
        } catch (e) {
          console.error('Failed to load project:', e);
        }
      }
      setLoading(false);
    };
    loadProject();
  }, [projectId, project, setProject]);

  // Set initial selected slide
  useEffect(() => {
    if (project?.slides?.length && !selectedSlideId) {
      setSelectedSlideId(project.slides[0].id);
    }
  }, [project, selectedSlideId]);

  const startRender = async () => {
    if (!project || rendering) return;
    setRendering(true);
    setRenderProgress(0);
    setRenderStatus('starting');
    setRenderStep('Initializing...');
    setShowExportModal(true);
    
    try {
      const res = await axios.post(`${API}/render`, {
        projectId: projectId || 'new',
        slides: project.slides,
        title: project.title,
        duration: project.duration,
        generateVoice: true,
        voiceId: project.voiceId || 'en-US-Journey-D'
      });
      
      if (res.data.success) {
        const jobId = res.data.jobId;
        setRenderStatus('processing');
        
        // Poll for status
        const pollInterval = setInterval(async () => {
          try {
            const statusRes = await axios.get(`${API}/render/${jobId}`);
            setRenderProgress(statusRes.data.progress || 0);
            if (statusRes.data.step) setRenderStep(statusRes.data.step);
            
            if (statusRes.data.status === 'completed') {
              clearInterval(pollInterval);
              setRenderStatus('completed');
              setRenderUrl(statusRes.data.videoUrl);
              setRendering(false);
            } else if (statusRes.data.status === 'failed') {
              clearInterval(pollInterval);
              setRenderStatus('failed');
              setRendering(false);
            }
          } catch (e) {
            console.error('Poll error:', e);
          }
        }, 2000);
        
        // Timeout after 5 minutes
        setTimeout(() => {
          clearInterval(pollInterval);
          if (rendering) {
            setRenderStatus('timeout');
            setRendering(false);
          }
        }, 300000);
      }
    } catch (e) {
      console.error('Render error:', e);
      setRenderStatus('failed');
      setRendering(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="w-8 h-8 text-violet-500 animate-pulse mx-auto mb-2" />
          <p className="text-sm text-slate-400">Loading editor...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">No project loaded</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#030712] overflow-hidden" data-testid="editor-page">
      {/* Export Modal */}
      <AnimatePresence>
        {showExportModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !rendering && setShowExportModal(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-md bg-[#0a0f1a] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl p-6">
              <div className="text-center">
                {renderStatus === 'completed' ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                      <Check className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Video Ready!</h3>
                    <p className="text-sm text-slate-400 mb-6">Your video has been rendered with voice narration.</p>
                    <div className="flex gap-3 justify-center">
                      <Button variant="outline" onClick={() => setShowExportModal(false)}>Close</Button>
                      <a 
                        href={`${process.env.REACT_APP_BACKEND_URL}${renderUrl}`} 
                        download={`${project?.title || 'video'}.mp4`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700" 
                        data-testid="download-video-btn"
                      >
                        <Download className="w-4 h-4" /> Download MP4
                      </a>
                    </div>
                  </>
                ) : renderStatus === 'failed' || renderStatus === 'timeout' ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                      <X className="w-8 h-8 text-red-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Render Failed</h3>
                    <p className="text-sm text-slate-400 mb-6">Something went wrong. Please try again.</p>
                    <Button onClick={() => setShowExportModal(false)}>Close</Button>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-violet-500/20 flex items-center justify-center mx-auto mb-4">
                      <Film className="w-8 h-8 text-violet-400 animate-pulse" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Rendering Video with Audio...</h3>
                    <p className="text-sm text-slate-400 mb-4">{renderStep || 'Processing...'}</p>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-2">
                      <motion.div className="h-full bg-gradient-to-r from-violet-500 to-pink-500" style={{ width: `${renderProgress}%` }} />
                    </div>
                    <p className="text-xs text-slate-500">{renderProgress}% complete</p>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Nav */}
      <nav className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-[#0a0f1a]">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-400 hover:text-white">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${cat?.color || primaryColor}, #EC4899)` }}><Sparkles className="w-3.5 h-3.5 text-white" /></div>
          </button>
          <span className="text-slate-600">/</span>
          <span className="text-sm font-semibold text-white">{project.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" data-testid="save-btn"><Save className="w-4 h-4 mr-1" /> Save</Button>
          <Button onClick={startRender} disabled={rendering} size="sm" style={{ background: `linear-gradient(135deg, ${cat?.color || primaryColor}, #10b981)` }} data-testid="export-btn">
            {rendering ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
            {rendering ? 'Rendering...' : 'Export MP4'}
          </Button>
        </div>
      </nav>

      {/* Main Editor */}
      <div className="flex-1 flex overflow-hidden">
        <LeftSidebar activeTab={activeTab} setActiveTab={setActiveTab} project={project} updateSlide={updateSlide} videoCategory={videoCategory} primaryColor={primaryColor} selectedSlideId={selectedSlideId} setSelectedSlideId={setSelectedSlideId} />
        <CanvasPreview project={project} videoCategory={videoCategory} selectedSlideId={selectedSlideId} setSelectedSlideId={setSelectedSlideId} />
        <RightSidebar project={project} primaryColor={primaryColor} setPrimaryColor={setPrimaryColor} selectedFont={selectedFont} setSelectedFont={setSelectedFont} selectedSlideId={selectedSlideId} updateSlide={updateSlide} />
      </div>
    </div>
  );
}
