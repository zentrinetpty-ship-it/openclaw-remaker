import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, ArrowLeft, Check, Loader2, Wand2, Image, Film, Upload, RefreshCcw, Play } from 'lucide-react';
import { useProjectStore, CATEGORIES } from '../store/useProjectStore';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

function StepIndicator({ step }) {
  const steps = ['Processing', 'Storyboard', 'Assets', 'Ready'];
  return (
    <div className="flex items-center gap-3 justify-center">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-3">
          <div className="flex flex-col items-center gap-1">
            <motion.div animate={step > i ? { backgroundColor: '#10b981' } : step === i ? { scale: [1, 1.08, 1] } : {}} transition={{ duration: 1.5, repeat: step === i ? Infinity : 0 }} className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold" style={{ borderColor: step >= i ? '#10b981' : '#475569', backgroundColor: step > i ? '#10b981' : step === i ? 'rgba(16,185,129,0.15)' : 'transparent', color: step >= i ? (step > i ? '#fff' : '#10b981') : '#64748b' }}>
              {step > i ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </motion.div>
            <span className="text-[9px] text-slate-500">{label}</span>
          </div>
          {i < steps.length - 1 && <div className="w-10 h-px mt-[-16px]" style={{ backgroundColor: step > i ? '#10b981' : '#334155' }} />}
        </div>
      ))}
    </div>
  );
}

function ProcessingStep({ onDone, onError }) {
  const { rawInput, inputType, videoDuration, videoTone, videoCategory, slideCount, preferredVisualStyle, setProject } = useProjectStore();
  const [status, setStatus] = useState('Sending to Gemini AI...');
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const run = async () => {
      try {
        setStatus(`Building ${slideCount}-slide ${videoCategory} storyboard...`);
        const res = await axios.post(`${API}/restructure-script`, {
          input: rawInput, type: inputType, duration: videoDuration, tone: videoTone,
          category: videoCategory, slideCount, preferredVisualStyle
        });
        
        if (!res.data.success) throw new Error(res.data.error || 'Failed');
        
        setStatus('Preparing slides...');
        const project = {
          ...res.data.data,
          slides: (res.data.data.slides || []).map(s => ({
            ...s, assetType: 'none', assetUrl: null, assetGenerating: false,
            graphics: (s.graphics || []).map(g => ({ ...g, url: null, assetGenerating: false }))
          }))
        };
        
        await new Promise(r => setTimeout(r, 500));
        setProject(project);
        onDone();
      } catch (e) {
        onError(e.response?.data?.detail || e.message || 'Unknown error');
      }
    };
    run();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <div className="relative">
        <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 2, repeat: Infinity }} className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, #3B82F6, transparent)', filter: 'blur(20px)' }} />
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }} className="w-20 h-20 rounded-full border-4" style={{ borderColor: '#1e293b', borderTopColor: '#3B82F6', borderRightColor: '#8B5CF6' }} />
        <div className="absolute inset-0 flex items-center justify-center"><Sparkles className="w-8 h-8 text-blue-500" /></div>
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white font-['Outfit']">Gemini is working...</h2>
        <motion.p key={status} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-slate-400">{status}</motion.p>
      </div>
      <div className="flex gap-2">
        {[0, 1, 2, 3].map(i => (
          <motion.div key={i} animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1, 0.8] }} transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2 }} className="w-2 h-2 rounded-full bg-blue-500" />
        ))}
      </div>
    </div>
  );
}

function StoryboardStep({ onNext, onBack }) {
  const { project, videoCategory } = useProjectStore();
  const cat = CATEGORIES.find(c => c.id === videoCategory);
  if (!project) return null;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: cat?.color }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: cat?.color }}>Storyboard Ready</span>
          </div>
          <h2 className="text-2xl font-black text-white font-['Outfit']">{project.title}</h2>
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
            <span>🎬 {project.slides.length} Slides</span>
            <span>⏱ {project.duration}s</span>
            <span>🎨 {project.style}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onBack} className="flex items-center gap-1.5 px-4 py-2 border border-slate-700 rounded-xl text-sm text-slate-400 hover:text-white"><ArrowLeft className="w-4 h-4" /> Back</button>
          <motion.button whileHover={{ scale: 1.02 }} onClick={onNext} className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: `linear-gradient(135deg, ${cat?.color}, #EC4899)` }}>
            Assign Assets <ArrowRight className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {project.characters?.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><Wand2 className="w-4 h-4 text-violet-400" /> Characters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {project.characters.map((char, i) => (
              <div key={i} className="p-3 bg-slate-800/50 border border-slate-700 rounded-xl flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-600/20 flex items-center justify-center flex-shrink-0 border border-violet-600/30">
                  <span className="text-lg font-bold text-violet-400">{char.name[0]}</span>
                </div>
                <div><p className="text-sm font-bold text-white">{char.name}</p><p className="text-[10px] text-slate-400 italic">"{char.description}"</p></div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {project.slides.map((slide, idx) => (
          <motion.div key={slide.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="rounded-2xl border border-slate-700 bg-slate-800/50 overflow-hidden">
            <div className="aspect-video relative flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${cat?.color}20, #0f172a)` }}>
              <div className="text-center px-3">
                <span className="text-xs font-mono px-2 py-1 rounded-full border inline-block mb-1" style={{ borderColor: `${cat?.color}60`, color: cat?.color, backgroundColor: `${cat?.color}20` }}>Slide {slide.id}</span>
                <p className="text-xs text-slate-400 line-clamp-2">{slide.title}</p>
              </div>
              <div className="absolute bottom-2 right-2 text-[9px] font-mono text-slate-600">{slide.duration}s</div>
            </div>
            <div className="p-3 space-y-2">
              <p className="text-xs font-semibold text-slate-200 line-clamp-1">{slide.title}</p>
              <p className="text-[10px] text-slate-500 line-clamp-2">{slide.narration}</p>
              <details className="group">
                <summary className="text-[9px] text-violet-400 cursor-pointer list-none">Image Prompt</summary>
                <p className="text-[9px] text-slate-500 mt-1 italic line-clamp-2">{slide.imagePrompt}</p>
              </details>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function SlideAssetCard({ slide, index, cat }) {
  const { updateSlide, project } = useProjectStore();
  const [generating, setGenerating] = useState(null);
  const fileInputRef = useRef(null);

  const generateImage = async () => {
    setGenerating('image');
    updateSlide(slide.id, { assetGenerating: true });
    try {
      const res = await axios.post(`${API}/generate-image`, { description: slide.imagePrompt, style: 'Cinematic', characters: project?.characters });
      if (res.data.success && res.data.image) {
        updateSlide(slide.id, { assetType: 'image', assetUrl: res.data.image, assetGenerating: false });
      } else throw new Error('No image');
    } catch (e) {
      console.error(e);
      updateSlide(slide.id, { assetGenerating: false });
    }
    setGenerating(null);
  };

  const generateVideo = async () => {
    setGenerating('video');
    updateSlide(slide.id, { assetGenerating: true });
    try {
      const res = await axios.post(`${API}/generate-video`, { description: slide.videoPrompt || slide.imagePrompt });
      if (res.data.success && res.data.video) {
        updateSlide(slide.id, { assetType: 'video', assetUrl: res.data.video, assetGenerating: false });
      } else throw new Error('No video');
    } catch (e) {
      console.error(e);
      updateSlide(slide.id, { assetGenerating: false });
    }
    setGenerating(null);
  };

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const type = file.type.startsWith('video/') ? 'video' : 'image';
    updateSlide(slide.id, { assetType: type, assetUrl: url });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="rounded-2xl border bg-slate-800/50 overflow-hidden" style={{ borderColor: slide.assetUrl ? `${cat?.color}80` : '#334155' }}>
      <div className="aspect-video relative bg-slate-900 flex items-center justify-center overflow-hidden">
        {slide.assetUrl ? (
          <img src={slide.assetUrl.startsWith('/api') ? `${process.env.REACT_APP_BACKEND_URL}${slide.assetUrl}` : slide.assetUrl} alt={slide.title} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-center px-4">
            {slide.assetGenerating ? (
              <><Loader2 className="w-6 h-6 animate-spin text-violet-500" /><p className="text-xs text-slate-500">Generating...</p></>
            ) : (
              <><Image className="w-8 h-8 text-slate-600" /><p className="text-xs text-slate-600">No asset</p></>
            )}
          </div>
        )}
        {slide.assetUrl && <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/80"><Check className="w-2.5 h-2.5 text-white" /><span className="text-[9px] text-white font-semibold">Done</span></div>}
        <div className="absolute bottom-2 left-2 text-[9px] font-mono text-slate-600 bg-black/50 px-1.5 py-0.5 rounded">Slide {slide.id}</div>
      </div>
      <div className="p-3 space-y-2">
        <p className="text-xs font-semibold text-slate-200 line-clamp-1">{slide.title}</p>
        <div className="flex gap-1.5">
          <button onClick={generateImage} disabled={generating} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-semibold text-white disabled:opacity-50" style={{ background: `linear-gradient(135deg, ${cat?.color}, #EC4899)` }}>
            {generating === 'image' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />} Image
          </button>
          <button onClick={generateVideo} disabled={generating} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-semibold text-white disabled:opacity-50 bg-blue-600">
            {generating === 'video' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Film className="w-3 h-3" />} Video
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center px-3 py-2 rounded-xl border border-slate-600 text-slate-300 hover:border-slate-500"><Upload className="w-3 h-3" /></button>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" hidden onChange={handleUpload} />
        </div>
      </div>
    </motion.div>
  );
}

function AssetStep({ onNext, onBack }) {
  const { project, updateSlide, assetType, videoCategory } = useProjectStore();
  const cat = CATEGORIES.find(c => c.id === videoCategory);
  if (!project) return null;

  const doneCount = project.slides.filter(s => s.assetUrl).length;
  const allDone = doneCount === project.slides.length;

  const generateAll = async () => {
    for (const slide of project.slides) {
      if (slide.assetUrl) continue;
      updateSlide(slide.id, { assetGenerating: true });
      try {
        const endpoint = assetType === 'video' ? '/generate-video' : '/generate-image';
        const res = await axios.post(`${API}${endpoint}`, { description: slide.imagePrompt, style: 'Cinematic', characters: project?.characters });
        if (res.data.success) {
          updateSlide(slide.id, { assetType: assetType, assetUrl: res.data.image || res.data.video, assetGenerating: false });
        } else throw new Error('Failed');
      } catch (e) {
        updateSlide(slide.id, { assetGenerating: false });
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-white font-['Outfit']">Assign Slide Assets</h2>
          <p className="text-sm text-slate-500 mt-1">{doneCount}/{project.slides.length} slides have assets</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onBack} className="flex items-center gap-1.5 px-4 py-2 border border-slate-700 rounded-xl text-sm text-slate-400"><ArrowLeft className="w-4 h-4" /> Back</button>
          <button onClick={generateAll} className="flex items-center gap-2 px-4 py-2 border rounded-xl text-sm text-violet-300 hover:bg-violet-900/20" style={{ borderColor: cat?.color }}><Sparkles className="w-3.5 h-3.5" /> Generate All</button>
          <motion.button whileHover={{ scale: 1.02 }} onClick={onNext} className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: allDone ? 'linear-gradient(135deg, #10b981, #059669)' : `linear-gradient(135deg, ${cat?.color}, #EC4899)` }}>
            {allDone ? <><Check className="w-4 h-4" /> Open Editor</> : <>Skip to Editor <ArrowRight className="w-4 h-4" /></>}
          </motion.button>
        </div>
      </div>
      <div className="mb-6 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${cat?.color}, #10b981)` }} animate={{ width: `${(doneCount / project.slides.length) * 100}%` }} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {project.slides.map((slide, idx) => <SlideAssetCard key={slide.id} slide={slide} index={idx} cat={cat} />)}
      </div>
    </div>
  );
}

function ReadyStep({ onOpenEditor, onBack }) {
  const { project, videoCategory } = useProjectStore();
  const { user } = useAuth();
  const cat = CATEGORIES.find(c => c.id === videoCategory);
  const [saving, setSaving] = useState(false);
  if (!project) return null;

  const saveAndOpen = async () => {
    setSaving(true);
    try {
      const userId = user?.id || 'guest_' + Math.random().toString(36).slice(2, 10);
      const res = await axios.post(`${API}/projects`, { title: project.title, project, userId });
      if (res.data.success) {
        onOpenEditor(res.data.project.id);
      } else {
        onOpenEditor('new');
      }
    } catch (e) {
      onOpenEditor('new');
    }
    setSaving(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 px-6">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-24 h-24 rounded-full flex items-center justify-center shadow-2xl" style={{ background: `linear-gradient(135deg, ${cat?.color}, #10b981)`, boxShadow: `0 0 60px ${cat?.color}40` }}>
        <Play className="w-10 h-10 text-white translate-x-0.5" />
      </motion.div>
      <div className="text-center">
        <h2 className="text-3xl font-black text-white font-['Outfit']">Your storyboard is ready!</h2>
        <p className="text-slate-400 mt-2">{project.slides.length} slides · {project.slides.filter(s => s.assetUrl).length} with assets · {project.duration}s total</p>
      </div>
      <div className="flex gap-3">
        <button onClick={onBack} className="px-5 py-2.5 border border-slate-700 rounded-xl text-sm text-slate-400">← Back</button>
        <motion.button whileHover={{ scale: 1.03 }} onClick={saveAndOpen} disabled={saving} className="flex items-center gap-2 px-8 py-3 rounded-xl text-base font-bold text-white disabled:opacity-50" style={{ background: `linear-gradient(135deg, ${cat?.color}, #EC4899, #10b981)` }} data-testid="open-editor-btn">
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          {saving ? 'Saving...' : 'Open in Editor'}
        </motion.button>
      </div>
    </div>
  );
}

export default function CreatePage() {
  const navigate = useNavigate();
  const { rawInput, error, setError, reset, videoCategory } = useProjectStore();
  const [localStep, setLocalStep] = useState(0);
  const cat = CATEGORIES.find(c => c.id === videoCategory);

  useEffect(() => {
    if (!rawInput) navigate('/');
  }, [rawInput, navigate]);

  const goBack = () => {
    if (localStep === 0) navigate('/');
    else setLocalStep(localStep - 1);
  };

  const openEditor = (projectId) => navigate(`/editor/${projectId}`);

  return (
    <div className="min-h-screen bg-[#030712] text-white" data-testid="create-page">
      <div className="fixed top-0 left-0 right-0 h-px z-50" style={{ background: `linear-gradient(90deg, transparent, ${cat?.color}, #EC4899, transparent)` }} />
      <nav className="sticky top-0 z-40 border-b border-slate-800 px-6 py-3 flex items-center justify-between bg-[#030712]/80 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${cat?.color}, #EC4899)` }}><Sparkles className="w-3.5 h-3.5 text-white" /></div>
            <span className="text-sm font-black text-white font-['Outfit']">ExplainaPro</span>
          </button>
          <span className="text-slate-600">/</span>
          <span className="text-sm text-slate-500">Create</span>
        </div>
        <StepIndicator step={localStep} />
        <button onClick={() => { reset(); navigate('/'); }} className="text-xs text-slate-400 hover:text-slate-300 flex items-center gap-1"><RefreshCcw className="w-3 h-3" /> Start over</button>
      </nav>

      {error && (
        <div className="max-w-lg mx-auto mt-8 p-4 rounded-2xl text-center bg-red-900/20 border border-red-500/30">
          <p className="text-sm font-medium text-red-400">Error: {error}</p>
          <button onClick={() => { setError(null); setLocalStep(0); }} className="mt-3 text-xs underline text-red-400">Try again</button>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={localStep} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
          {localStep === 0 && <ProcessingStep onDone={() => setLocalStep(1)} onError={(e) => setError(e)} />}
          {localStep === 1 && <StoryboardStep onNext={() => setLocalStep(2)} onBack={goBack} />}
          {localStep === 2 && <AssetStep onNext={() => setLocalStep(3)} onBack={goBack} />}
          {localStep === 3 && <ReadyStep onOpenEditor={openEditor} onBack={() => setLocalStep(2)} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
