import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { Sparkles, ArrowRight, Play, Clock, Layers, Image, Palette, Mic2, ChevronDown, ChevronUp, Wand2, Upload, Film, Zap, PenTool, Volume2, Monitor, Star, Check, ArrowUpRight, User, LogOut } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { useProjectStore, CATEGORIES } from '../store/useProjectStore';
import { useAuth } from '../context/AuthContext';
import AuthModal from '../components/AuthModal';
import React from 'react';

const DURATIONS = [
  { label: '15s', value: 15 }, { label: '30s', value: 30 }, { label: '60s', value: 60 },
  { label: '90s', value: 90 }, { label: '2 min', value: 120 }, { label: '5 min', value: 300 },
];

const TONES = [
  { label: 'Professional', value: 'professional' },
  { label: 'Energetic', value: 'energetic' },
  { label: 'Documentary', value: 'documentary' },
  { label: 'Storytelling', value: 'storytelling' },
  { label: 'Humorous', value: 'humorous' },
];

const VISUAL_STYLES = ['Cinematic', 'Animation', '3D Render', 'Anime', 'Photorealistic', 'Digital Art', 'Cyberpunk'];

const FEATURES = [
  { icon: PenTool, title: 'AI Script Writing', desc: 'Describe your idea and our AI writes a complete, engaging script with perfect pacing and structure.', span: 'col-span-1', color: '#4F46E5' },
  { icon: Image, title: 'Auto Visual Generation', desc: 'Every slide gets a custom AI-generated image matched to your script content and visual style.', span: 'md:col-span-2', color: '#DB2777' },
  { icon: Volume2, title: 'Natural Voiceover', desc: 'High-quality text-to-speech in multiple voices and languages. Sounds natural, not robotic.', span: 'md:col-span-2', color: '#06B6D4' },
  { icon: Monitor, title: 'Remotion Video Engine', desc: 'Professional Ken Burns effects, animated captions, smooth transitions — all rendered in crisp 1080p.', span: 'col-span-1', color: '#F59E0B' },
];

const STEPS = [
  { num: '01', title: 'Choose a Category', desc: 'Pick from 13 video types — explainers, tutorials, motion graphics, ads, and more.' },
  { num: '02', title: 'Describe Your Idea', desc: 'Type a few sentences. Our AI understands your vision and writes a full storyboard.' },
  { num: '03', title: 'Customize & Edit', desc: 'Tweak scripts, swap images, adjust timing, add motion graphics — full creative control.' },
  { num: '04', title: 'Export & Share', desc: 'Render a polished MP4 with voiceover, captions, and background music. Ready to publish.' },
];

const STATS = [
  { value: '13', label: 'Video Categories' },
  { value: '6', label: 'Caption Styles' },
  { value: '78+', label: 'Music & SFX Tracks' },
  { value: '1080p', label: 'Export Quality' },
];

function AnimatedSection({ children, className = '', delay = 0 }) {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }} className={className}>
      {children}
    </motion.div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const { setRawInput, setInputType, setVideoDuration, setVideoTone, setVideoCategory, setSlideCount, setAssetType, setPreferredVisualStyle, setStep, setProject } = useProjectStore();
  
  const [selectedCategory, setSelectedCategory] = useState('explainer');
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duration, setDuration] = useState(30);
  const [tone, setTone] = useState('professional');
  const [slideCount, setLocalSlideCount] = useState(5);
  const [localAssetType, setLocalAssetType] = useState('image');
  const [visualStyle, setVisualStyle] = useState('Cinematic');
  const [showSettings, setShowSettings] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [remakerFile, setRemakerFile] = useState(null);
  const [remakerUploading, setRemakerUploading] = useState(false);

  const cat = useMemo(() => CATEGORIES.find(c => c.id === selectedCategory), [selectedCategory]);

  useEffect(() => {
    if (cat) setTone(cat.tone);
    setInputValue('');
  }, [selectedCategory, cat]);

  const handleSubmit = async () => {
    if (selectedCategory === 'remaker') {
      if (!remakerFile || remakerUploading) return;
      setRemakerUploading(true);
      setIsSubmitting(true);
      try {
        const formData = new FormData();
        formData.append('file', remakerFile);
        const API = process.env.REACT_APP_BACKEND_URL + '/api';
        const res = await fetch(`${API}/analyze-video?slideCount=${slideCount}&duration=${duration}&tone=${tone}&visualStyle=${visualStyle}`, { method: 'POST', body: formData });
        const data = await res.json();
        if (!data.success) throw new Error(data.detail || 'Analysis failed');
        const project = { ...data.data, slides: (data.data.slides || []).map(s => ({ ...s, assetType: 'none', assetUrl: null, assetGenerating: false, graphics: (s.graphics || []).map(g => ({ ...g, url: null, assetGenerating: false })) })) };
        setRawInput(data.data.originalVideoAnalysis || remakerFile.name);
        setInputType('idea'); setVideoDuration(duration); setVideoTone(tone); setVideoCategory(selectedCategory); setSlideCount(slideCount); setAssetType(localAssetType); setPreferredVisualStyle(visualStyle); setProject(project); setStep('storyboard');
        navigate('/create');
      } catch (e) { alert('Video analysis failed: ' + (e.message || 'Unknown error')); }
      finally { setRemakerUploading(false); setIsSubmitting(false); }
      return;
    }
    if (!inputValue.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setRawInput(inputValue.trim()); setInputType('idea'); setVideoDuration(duration); setVideoTone(tone); setVideoCategory(selectedCategory); setSlideCount(slideCount); setAssetType(localAssetType); setPreferredVisualStyle(visualStyle); setStep('processing');
    navigate('/create');
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#F8FAFC]" data-testid="landing-page">
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

      {/* ============ NAVBAR ============ */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-sm flex items-center justify-center bg-indigo-600">
              <Sparkles className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-xl font-black tracking-tight text-slate-900">
              Explaina<span className="gradient-text">Pro</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition">How it Works</a>
            <a href="#categories" className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition">Categories</a>
            <button onClick={() => navigate('/dashboard')} className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition" data-testid="dashboard-link">Dashboard</button>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-indigo-50 border border-indigo-100">
                  <User className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm font-semibold text-indigo-900">{user?.name || user?.email?.split('@')[0]}</span>
                </div>
                <button onClick={logout} className="p-2 rounded-sm text-slate-400 hover:text-slate-600 hover:bg-slate-100" data-testid="logout-btn">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <motion.button onClick={() => setShowAuthModal(true)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="px-5 py-2 rounded-none bg-indigo-600 text-white text-sm font-bold btn-sharp" data-testid="login-btn">
                Sign In
              </motion.button>
            )}
          </div>
        </div>
      </nav>

      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-[150px] opacity-20 bg-indigo-400" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-[120px] opacity-15 bg-pink-400" />
          <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] rounded-full blur-[100px] opacity-10 bg-cyan-400" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="text-5xl md:text-7xl font-black tracking-tight leading-none text-slate-900 mb-6">
            Create{' '}
            <span className="gradient-text">Stunning</span>
            <br className="hidden sm:block" />
            {' '}Videos with AI
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Describe your topic. ExplainaPro writes the script, generates visuals, adds voiceover — and delivers a publish-ready video in minutes.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="flex items-center justify-center gap-4 mb-12">
            <motion.button onClick={() => document.getElementById('creator-card')?.scrollIntoView({ behavior: 'smooth' })} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="px-8 py-3.5 rounded-none bg-indigo-600 text-white font-bold text-base btn-sharp flex items-center gap-2" data-testid="hero-cta">
              Start Creating <ArrowRight className="w-4 h-4" />
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="px-8 py-3.5 rounded-none bg-white border-2 border-slate-200 text-slate-700 font-bold text-base btn-sharp-pink flex items-center gap-2" onClick={() => navigate('/dashboard')}>
              <Play className="w-4 h-4" /> View Projects
            </motion.button>
          </motion.div>

          {/* Stats Bar */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }} className="flex items-center justify-center gap-8 md:gap-16 flex-wrap">
            {STATS.map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-2xl md:text-3xl font-black text-indigo-600">{s.value}</p>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============ CATEGORIES ============ */}
      <section id="categories" className="relative z-10 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex overflow-x-auto scrollbar-hide py-1">
            {CATEGORIES.map((c, i) => {
              const active = c.id === selectedCategory;
              return (
                <motion.button key={c.id} onClick={() => setSelectedCategory(c.id)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="relative flex items-center gap-2 py-4 px-4 min-w-fit flex-shrink-0" data-testid={`category-${c.id}`}>
                  {active && <motion.div layoutId="cat-underline" className="absolute bottom-0 left-2 right-2 h-[3px] rounded-full" style={{ background: c.color }} />}
                  <div className="w-7 h-7 rounded-sm flex items-center justify-center transition-all" style={{ background: active ? c.color : '#F1F5F9' }}>
                    <Sparkles className="w-3.5 h-3.5" style={{ color: active ? '#fff' : '#94a3b8' }} />
                  </div>
                  <span className="text-xs font-bold whitespace-nowrap transition-all" style={{ color: active ? c.color : '#64748b' }}>{c.label}</span>
                  {c.badge && <span className="text-[8px] font-black px-1.5 py-0.5 rounded-none text-white" style={{ background: c.color }}>{c.badge}</span>}
                </motion.button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ CREATOR CARD ============ */}
      <section id="creator-card" className="relative z-10 max-w-3xl mx-auto px-4 py-12">
        <AnimatePresence mode="wait">
          <motion.div key={selectedCategory} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white rounded-md border-2 border-slate-200 shadow-[0_8px_40px_-12px_rgba(79,70,229,0.12)] overflow-hidden">
            
            {/* Card Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100" style={{ background: `${cat?.color}08` }}>
              <div className="w-8 h-8 rounded-sm flex items-center justify-center" style={{ background: cat?.color }}>
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">{cat?.label}</span>
                {cat?.badge && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-none text-white" style={{ background: cat?.color }}>{cat?.badge}</span>}
              </div>
            </div>

            {/* Input Area */}
            <div className="px-6 pt-5 pb-3">
              {selectedCategory === 'remaker' ? (
                <div className="space-y-3">
                  <label className="flex flex-col items-center justify-center min-h-[120px] rounded-sm border-2 border-dashed border-slate-300 hover:border-indigo-400 cursor-pointer transition bg-slate-50 hover:bg-indigo-50/50" data-testid="remaker-upload">
                    <input type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setRemakerFile(f); }} />
                    {remakerFile ? (
                      <div className="flex items-center gap-3 p-4">
                        <Film className="w-8 h-8 text-indigo-500" />
                        <div>
                          <p className="text-sm text-slate-900 font-bold">{remakerFile.name}</p>
                          <p className="text-xs text-slate-400">{(remakerFile.size / (1024 * 1024)).toFixed(1)} MB</p>
                        </div>
                        <button onClick={(e) => { e.preventDefault(); setRemakerFile(null); }} className="ml-auto text-xs text-slate-400 hover:text-red-500 font-semibold">Remove</button>
                      </div>
                    ) : (
                      <div className="text-center p-4">
                        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-sm text-slate-600 font-semibold">Upload a video to remake</p>
                        <p className="text-xs text-slate-400 mt-1">MP4, MOV, AVI up to 100MB</p>
                      </div>
                    )}
                  </label>
                  <Textarea value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Optional: Add notes about style changes..." className="min-h-[60px] resize-none bg-slate-50 text-slate-800 text-sm placeholder:text-slate-400 rounded-sm border-slate-200 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2" data-testid="remaker-notes" />
                </div>
              ) : (
                <Textarea value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder={cat?.placeholder} className="min-h-[120px] resize-none bg-slate-50 text-slate-800 text-sm placeholder:text-slate-400 rounded-sm border-slate-200 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2" onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(); }} data-testid="input-textarea" />
              )}
            </div>

            {/* Visual Style */}
            <div className="px-6 pb-4">
              <div className="flex items-center gap-1.5 mb-2"><Palette className="w-3 h-3 text-indigo-500" /><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Image Style</span></div>
              <div className="flex gap-1.5 flex-wrap">
                {VISUAL_STYLES.map(style => (
                  <button key={style} onClick={() => setVisualStyle(style)} className={`px-3 py-1.5 rounded-none text-xs font-bold border-2 transition-all ${visualStyle === style ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`} data-testid={`style-${style}`}>{style}</button>
                ))}
              </div>
            </div>

            {/* Settings Toggle */}
            <div className="px-6 pb-3">
              <button onClick={() => setShowSettings(v => !v)} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-600 font-semibold transition">
                <Mic2 className="w-3 h-3" /> Advanced Settings {showSettings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              <AnimatePresence>
                {showSettings && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Clock className="w-3 h-3" /> Duration</span>
                        <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full bg-slate-50 border-2 border-slate-200 rounded-sm px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2" data-testid="duration-select">
                          {DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Layers className="w-3 h-3" /> Slides ({slideCount})</span>
                        <input type="range" min="1" max="20" value={slideCount} onChange={(e) => setLocalSlideCount(Number(e.target.value))} className="w-full accent-indigo-600" data-testid="slide-count" />
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Image className="w-3 h-3" /> Media</span>
                        <div className="flex bg-slate-50 p-1 rounded-sm border-2 border-slate-200">
                          <button onClick={() => setLocalAssetType('image')} className={`flex-1 text-xs font-bold py-1.5 rounded-sm ${localAssetType === 'image' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`} data-testid="media-image">Images</button>
                          <button onClick={() => setLocalAssetType('video')} className={`flex-1 text-xs font-bold py-1.5 rounded-sm ${localAssetType === 'video' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`} data-testid="media-video">Videos</button>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-wrap pt-4">
                      {TONES.map(t => (
                        <button key={t.value} onClick={() => setTone(t.value)} className={`px-3 py-1.5 rounded-none text-xs font-bold border-2 transition-all ${tone === t.value ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>{t.label}</button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
              <span className="text-xs text-slate-400 font-mono">{selectedCategory === 'remaker' ? (remakerFile ? remakerFile.name : 'No file') : `${inputValue.length} chars`}</span>
              <motion.button onClick={handleSubmit} disabled={(selectedCategory === 'remaker' ? !remakerFile : !inputValue.trim()) || isSubmitting} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex items-center gap-2 px-6 py-2.5 rounded-none text-sm font-bold text-white disabled:opacity-40 btn-sharp transition-all" style={{ background: cat?.color || '#4F46E5' }} data-testid="generate-btn">
                {isSubmitting ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {selectedCategory === 'remaker' ? 'Analyzing...' : 'Generating...'}</> : <><Wand2 className="w-3.5 h-3.5" /> {selectedCategory === 'remaker' ? 'Analyze & Remake' : `Generate ${cat?.label}`}</>}
              </motion.button>
            </div>
          </motion.div>
        </AnimatePresence>
      </section>

      {/* ============ FEATURES BENTO GRID ============ */}
      <section id="features" className="relative z-10 py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-14">
            <span className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-none border-2 border-pink-200 bg-pink-50 text-xs font-bold text-pink-700 uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5" /> Powerful Features
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">Everything you need to create</h2>
            <p className="text-lg text-slate-500 mt-4 max-w-xl mx-auto">From script to screen in minutes. No editing skills required.</p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <AnimatedSection key={i} delay={i * 0.1} className={f.span}>
                <motion.div whileHover={{ y: -5 }} className="h-full p-8 rounded-md border-2 border-slate-200 bg-white card-lift group">
                  <div className="w-12 h-12 rounded-sm flex items-center justify-center mb-5" style={{ background: `${f.color}15` }}>
                    <f.icon className="w-6 h-6" style={{ color: f.color }} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section id="how-it-works" className="relative z-10 py-20 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-14">
            <span className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-none border-2 border-cyan-200 bg-cyan-50 text-xs font-bold text-cyan-700 uppercase tracking-wider">
              <ArrowRight className="w-3.5 h-3.5" /> Simple Process
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">How it works</h2>
            <p className="text-lg text-slate-500 mt-4 max-w-xl mx-auto">Four simple steps from idea to finished video.</p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step, i) => (
              <AnimatedSection key={i} delay={i * 0.12}>
                <div className="relative p-6 rounded-md border-2 border-slate-200 bg-white group hover:border-indigo-300 transition-all card-lift">
                  <span className="text-5xl font-black text-indigo-100 group-hover:text-indigo-200 transition-colors absolute top-4 right-4">{step.num}</span>
                  <div className="relative z-10">
                    <h3 className="text-lg font-bold text-slate-900 mb-2 mt-8">{step.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CATEGORY SHOWCASE ============ */}
      <section className="relative z-10 py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-14">
            <span className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-none border-2 border-amber-200 bg-amber-50 text-xs font-bold text-amber-700 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> 13 Categories
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">Every video format you need</h2>
            <p className="text-lg text-slate-500 mt-4 max-w-xl mx-auto">From explainers to ads, tutorials to cinematic trailers.</p>
          </AnimatedSection>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {CATEGORIES.map((c, i) => (
              <AnimatedSection key={c.id} delay={i * 0.04}>
                <motion.button
                  onClick={() => { setSelectedCategory(c.id); document.getElementById('creator-card')?.scrollIntoView({ behavior: 'smooth' }); }}
                  whileHover={{ y: -4 }}
                  className="w-full text-left p-5 rounded-md border-2 border-slate-200 bg-white group hover:border-transparent transition-all card-lift"
                  style={{ '--lift-color': c.color }}
                >
                  <div className="w-10 h-10 rounded-sm flex items-center justify-center mb-3 transition-all" style={{ background: `${c.color}15` }}>
                    <Sparkles className="w-5 h-5" style={{ color: c.color }} />
                  </div>
                  <p className="font-bold text-slate-900 text-sm mb-1">{c.label}</p>
                  {c.badge && <span className="text-[8px] font-black px-1.5 py-0.5 rounded-none text-white" style={{ background: c.color }}>{c.badge}</span>}
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: c.color }}>
                    <Play className="w-3 h-3" /> Try this <ArrowRight className="w-3 h-3" />
                  </p>
                </motion.button>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ============ SOCIAL PROOF ============ */}
      <section className="relative z-10 py-20 bg-indigo-600 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">Trusted by creators worldwide</h2>
            <p className="text-lg text-indigo-200 max-w-xl mx-auto mb-12">Join thousands of content creators, marketers, and educators making videos with AI.</p>
          </AnimatedSection>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {[
              { quote: "ExplainaPro turned my 2-hour video editing process into 10 minutes. The AI captions and voiceover are incredible.", name: "Sarah Chen", role: "Content Creator" },
              { quote: "The motion graphics feature alone is worth it. I can create professional-looking explainers without any design skills.", name: "Marcus Rodriguez", role: "Marketing Manager" },
              { quote: "We use it for all our product demos and tutorials. The quality rivals expensive video production agencies.", name: "Priya Sharma", role: "Tech Educator" },
            ].map((t, i) => (
              <AnimatedSection key={i} delay={i * 0.1}>
                <div className="p-6 rounded-md bg-white/10 backdrop-blur-sm border border-white/20 text-left">
                  <div className="flex gap-1 mb-3">
                    {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
                  </div>
                  <p className="text-sm text-white/90 leading-relaxed mb-4">"{t.quote}"</p>
                  <div>
                    <p className="text-sm font-bold text-white">{t.name}</p>
                    <p className="text-xs text-indigo-200">{t.role}</p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ============ BOTTOM CTA ============ */}
      <section className="relative z-10 py-20 bg-[#F8FAFC]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">Ready to create your first video?</h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto mb-8">Start with any of our 13 categories. No credit card required.</p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <motion.button onClick={() => { setShowAuthModal(true); }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="px-8 py-3.5 rounded-none bg-indigo-600 text-white font-bold text-base btn-sharp flex items-center gap-2" data-testid="bottom-cta">
                Get Started Free <ArrowUpRight className="w-4 h-4" />
              </motion.button>
            </div>
            <div className="flex items-center justify-center gap-6 mt-8 flex-wrap">
              {['No credit card', 'Free to start', '13 video categories', 'AI-powered'].map((item, i) => (
                <span key={i} className="flex items-center gap-1.5 text-sm text-slate-500">
                  <Check className="w-4 h-4 text-emerald-500" /> {item}
                </span>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="relative z-10 border-t border-slate-200 bg-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-sm flex items-center justify-center bg-indigo-600">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-black text-slate-900">Explaina<span className="gradient-text">Pro</span></span>
            </div>
            <div className="flex items-center gap-8 text-sm text-slate-400">
              <a href="#features" className="hover:text-indigo-600 transition">Features</a>
              <a href="#how-it-works" className="hover:text-indigo-600 transition">How it Works</a>
              <a href="#categories" className="hover:text-indigo-600 transition">Categories</a>
              <button onClick={() => navigate('/dashboard')} className="hover:text-indigo-600 transition">Dashboard</button>
            </div>
            <p className="text-xs text-slate-400">© 2026 ExplainaPro. Powered by Gemini AI.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
