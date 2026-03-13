import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Play, Clock, Layers, Image, Palette, Mic2, ChevronDown, ChevronUp, Wand2, Globe, Flame } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { useProjectStore, CATEGORIES } from '../store/useProjectStore';

const DURATIONS = [
  { label: '15s', value: 15 }, { label: '30s', value: 30 }, { label: '60s', value: 60 },
  { label: '90s', value: 90 }, { label: '2 min', value: 120 }, { label: '5 min', value: 300 },
];

const TONES = [
  { label: 'Professional', value: 'professional', emoji: '💼' },
  { label: 'Energetic', value: 'energetic', emoji: '⚡' },
  { label: 'Documentary', value: 'documentary', emoji: '🎬' },
  { label: 'Storytelling', value: 'storytelling', emoji: '📖' },
  { label: 'Humorous', value: 'humorous', emoji: '😄' },
];

const VISUAL_STYLES = ['Cinematic', 'Animation', '3D Render', 'Anime', 'Photorealistic', 'Digital Art', 'Cyberpunk'];

function HeroBackground({ color }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-[#030712]" />
      <motion.div
        animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-[10%] -left-[10%] w-[80%] h-[70%] rounded-full blur-[120px] nebula-glow"
        style={{ background: `radial-gradient(circle, ${color}40 0%, transparent 70%)` }}
      />
      <motion.div
        animate={{ scale: [1, 1.1, 1], x: [0, -40, 0], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute bottom-0 right-0 w-[60%] h-[60%] rounded-full blur-[100px] nebula-glow"
        style={{ background: `radial-gradient(circle, #8B5CF630 0%, transparent 70%)` }}
      />
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`, backgroundSize: '60px 60px' }} />
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { setRawInput, setInputType, setVideoDuration, setVideoTone, setVideoCategory, setSlideCount, setAssetType, setPreferredVisualStyle, setStep } = useProjectStore();
  
  const [selectedCategory, setSelectedCategory] = useState('explainer');
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duration, setDuration] = useState(30);
  const [tone, setTone] = useState('professional');
  const [slideCount, setLocalSlideCount] = useState(5);
  const [localAssetType, setLocalAssetType] = useState('image');
  const [visualStyle, setVisualStyle] = useState('Cinematic');
  const [showTone, setShowTone] = useState(false);
  const [prayerStyle, setPrayerStyle] = useState('Nigerian Style');

  const cat = useMemo(() => CATEGORIES.find(c => c.id === selectedCategory), [selectedCategory]);

  useEffect(() => {
    if (cat) setTone(cat.tone);
    setInputValue('');
  }, [selectedCategory, cat]);

  const handleSubmit = () => {
    if (!inputValue.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setRawInput(inputValue.trim());
    setInputType('idea');
    setVideoDuration(duration);
    setVideoTone(tone);
    setVideoCategory(selectedCategory);
    setSlideCount(slideCount);
    setAssetType(localAssetType);
    setPreferredVisualStyle(visualStyle);
    setStep('processing');
    navigate('/create');
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#030712]" data-testid="landing-page">
      {/* Navbar */}
      <motion.nav initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="relative z-20 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg" style={{ background: `linear-gradient(135deg, ${cat?.color}, #EC4899)` }}>
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-black tracking-tight text-white font-['Outfit']">
            Explaina<span className="gradient-text">Pro</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" className="text-slate-400 hover:text-white" onClick={() => navigate('/dashboard')} data-testid="dashboard-link">Dashboard</Button>
        </div>
      </motion.nav>

      {/* Hero */}
      <section className="relative z-10">
        <HeroBackground color={cat?.color || '#3B82F6'} />
        <div className="relative z-10 max-w-5xl mx-auto px-4 pt-16 pb-12 text-center">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full border text-xs font-semibold" style={{ background: `${cat?.color}18`, borderColor: `${cat?.color}40`, color: cat?.color }}>
            <Sparkles className="w-3 h-3" />
            AI Video Creator · 13 Content Categories · Powered by Gemini
          </motion.div>
          <motion.h1 initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="text-5xl sm:text-6xl md:text-7xl font-black leading-[0.95] tracking-tighter mb-6 text-white font-['Outfit']">
            Create <span className="gradient-text">Cinematic</span>{' '}
            <AnimatePresence mode="wait">
              <motion.span key={cat?.id} initial={{ opacity: 0, filter: 'blur(10px)' }} animate={{ opacity: 1, filter: 'blur(0px)' }} exit={{ opacity: 0 }} style={{ color: cat?.color, textShadow: `0 0 40px ${cat?.color}60` }}>
                {cat?.label}
              </motion.span>
            </AnimatePresence>
          </motion.h1>
          <p className="text-base text-slate-400 max-w-2xl mx-auto mb-8">Describe your topic. ExplainaPro writes the script, generates visuals, adds voiceover — and delivers a publish-ready video in minutes.</p>
          <div className="flex items-center justify-center gap-6 flex-wrap text-xs text-slate-500">
            {['Gemini 2.5 Flash', '13 content types', 'AI-generated assets'].map(t => (
              <span key={t} className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Category Bar */}
      <section className="relative z-10 bg-[#0a0f1a] border-y border-white/[0.06] py-0">
        <div className="flex overflow-x-auto scrollbar-hide px-4 max-w-6xl mx-auto">
          {CATEGORIES.map((c, i) => {
            const active = c.id === selectedCategory;
            return (
              <motion.button key={c.id} onClick={() => setSelectedCategory(c.id)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="relative flex flex-col items-center gap-1 py-4 px-4 min-w-fit flex-shrink-0" data-testid={`category-${c.id}`}>
                {active && <motion.div layoutId="cat-underline" className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full" style={{ background: c.color }} />}
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: active ? c.color : 'rgba(255,255,255,0.06)', boxShadow: active ? `0 4px 14px ${c.color}40` : 'none' }}>
                  <Sparkles className="w-3.5 h-3.5" style={{ color: active ? '#fff' : '#94a3b8' }} />
                </div>
                <span className="text-[10px] font-semibold whitespace-nowrap" style={{ color: active ? '#fff' : '#64748b' }}>{c.label}</span>
                {c.badge && <span className="absolute top-2 right-2 text-[7px] font-black px-1 py-0.5 rounded-full text-white" style={{ background: c.color }}>{c.badge}</span>}
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* Creator Card */}
      <section id="creator-card" className="relative z-10 max-w-3xl mx-auto px-4 py-10">
        <AnimatePresence mode="wait">
          <motion.div key={selectedCategory} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="glass-panel rounded-3xl overflow-hidden" style={{ borderColor: `${cat?.color}40` }}>
            {/* Card Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b" style={{ borderColor: `${cat?.color}20`, background: `${cat?.color}0a` }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${cat?.color}, #EC4899)` }}>
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{cat?.label}</span>
                  {cat?.badge && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full text-white" style={{ background: cat?.color }}>{cat?.badge}</span>}
                </div>
              </div>
            </div>

            {/* Prayer Styles */}
            {selectedCategory === 'prayer' && (
              <div className="px-6 pt-4 pb-2">
                <div className="flex items-center gap-1.5 mb-2"><Flame className="w-3 h-3 text-amber-400" /><span className="text-[10px] font-bold text-slate-500 uppercase">Prayer Style</span></div>
                <div className="flex gap-1.5 flex-wrap">
                  {['Nigerian Style', 'Repeat After Me', 'Fire Prayer', 'Meditative'].map(ps => (
                    <button key={ps} onClick={() => setPrayerStyle(ps)} className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border ${prayerStyle === ps ? 'bg-amber-500/20 border-amber-500/50 text-white' : 'bg-white/5 border-white/10 text-slate-400'}`}>{ps}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Textarea */}
            <div className="px-6 pt-4 pb-2">
              <Textarea value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder={cat?.placeholder} className="min-h-[120px] resize-none bg-transparent text-slate-200 text-sm placeholder:text-slate-600 focus-visible:ring-0 border-0 p-0" onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(); }} data-testid="input-textarea" />
            </div>

            {/* Visual Style */}
            <div className="px-6 pb-4">
              <div className="flex items-center gap-1.5 mb-2"><Palette className="w-3 h-3 text-violet-400" /><span className="text-[10px] font-bold text-slate-500 uppercase">Image Style</span></div>
              <div className="flex gap-1.5 flex-wrap">
                {VISUAL_STYLES.map(style => (
                  <button key={style} onClick={() => setVisualStyle(style)} className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border ${visualStyle === style ? 'bg-violet-500/20 border-violet-500/50 text-white' : 'bg-white/5 border-white/10 text-slate-400'}`} data-testid={`style-${style}`}>{style}</button>
                ))}
              </div>
            </div>

            <div className="mx-6 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {/* Settings */}
            <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-1.5"><Clock className="w-3 h-3 text-slate-500" /><span className="text-[10px] font-bold text-slate-500 uppercase">Duration</span></div>
                <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 outline-none focus:border-violet-500" data-testid="duration-select">
                  {DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-1.5"><Layers className="w-3 h-3 text-slate-500" /><span className="text-[10px] font-bold text-slate-500 uppercase">Slides</span></div>
                <div className="flex items-center gap-3">
                  <input type="range" min="1" max="20" value={slideCount} onChange={(e) => setLocalSlideCount(Number(e.target.value))} className="flex-1 accent-violet-500" data-testid="slide-count" />
                  <span className="text-xs font-bold text-slate-300 w-12 text-right">{slideCount}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-1.5"><Image className="w-3 h-3 text-slate-500" /><span className="text-[10px] font-bold text-slate-500 uppercase">Media</span></div>
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                  <button onClick={() => setLocalAssetType('image')} className={`flex-1 text-xs font-semibold py-1 rounded-lg ${localAssetType === 'image' ? 'bg-white/10 text-white' : 'text-slate-500'}`} data-testid="media-image">Images</button>
                  <button onClick={() => setLocalAssetType('video')} className={`flex-1 text-xs font-semibold py-1 rounded-lg ${localAssetType === 'video' ? 'bg-white/10 text-white' : 'text-slate-500'}`} data-testid="media-video">Videos</button>
                </div>
              </div>
            </div>

            {/* Tone Toggle */}
            <div className="px-6 pb-3">
              <button onClick={() => setShowTone(v => !v)} className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300">
                <Mic2 className="w-3 h-3" /> Tone & Style {showTone ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              <AnimatePresence>
                {showTone && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="flex gap-1.5 flex-wrap pt-2.5">
                      {TONES.map(t => (
                        <button key={t.value} onClick={() => setTone(t.value)} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${tone === t.value ? 'text-white border-transparent' : 'bg-white/5 text-slate-500 border-white/10'}`} style={tone === t.value ? { background: `linear-gradient(135deg, ${cat?.color}, #EC4899)` } : {}}>{t.emoji} {t.label}</button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/[0.06] flex items-center justify-between">
              <span className="text-[10px] text-slate-600 font-mono">{inputValue.length} chars · ⌘↵</span>
              <motion.button onClick={handleSubmit} disabled={!inputValue.trim() || isSubmitting} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40" style={{ background: `linear-gradient(135deg, ${cat?.color}, #EC4899)` }} data-testid="generate-btn">
                {isSubmitting ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating...</> : <><Wand2 className="w-3.5 h-3.5" /> Generate {cat?.label}</>}
              </motion.button>
            </div>
          </motion.div>
        </AnimatePresence>
      </section>

      {/* Feature Grid */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-black text-white text-center mb-6 font-['Outfit']">Every video format you need</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {CATEGORIES.slice(0, 8).map((c, i) => (
            <motion.button key={c.id} onClick={() => { setSelectedCategory(c.id); document.getElementById('creator-card')?.scrollIntoView({ behavior: 'smooth' }); }} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} whileHover={{ y: -3 }} className="text-left p-4 rounded-2xl border border-white/[0.07] bg-white/[0.03] group">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `linear-gradient(135deg, ${c.color}, ${c.color}80)` }}>
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <p className="font-bold text-white text-sm mb-1">{c.label}</p>
              <p className="text-[11px] text-slate-500 flex items-center gap-1 opacity-0 group-hover:opacity-100" style={{ color: c.color }}><Play className="w-3 h-3" /> Try this <ArrowRight className="w-3 h-3" /></p>
            </motion.button>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.06] py-6">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${cat?.color}, #EC4899)` }}>
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-white">ExplainaPro</span>
          </div>
          <p className="text-xs text-slate-500">© 2026 ExplainaPro · Powered by Gemini</p>
        </div>
      </footer>
    </div>
  );
}
