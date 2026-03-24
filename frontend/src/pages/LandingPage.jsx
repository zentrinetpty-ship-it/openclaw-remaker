import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { Sparkles, ArrowRight, Play, Clock, Layers, Image, Palette, Mic2, ChevronDown, ChevronUp, Wand2, Upload, Film, Zap, PenTool, Volume2, Monitor, Star, Check, ArrowUpRight, User, LogOut, Globe, FileText, Loader2, Briefcase, Copy } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { useProjectStore, CATEGORIES, CATEGORY_GROUPS } from '../store/useProjectStore';
import { useAuth } from '../context/AuthContext';
import AuthModal from '../components/AuthModal';
import React from 'react';

const DURATIONS = [
  { label: '15s', value: 15 }, { label: '30s', value: 30 }, { label: '60s', value: 60 },
  { label: '90s', value: 90 }, { label: '2 min', value: 120 }, { label: '3 min', value: 180 },
  { label: '5 min', value: 300 }, { label: '7 min', value: 420 }, { label: '10 min', value: 600 },
  { label: '15 min', value: 900 }, { label: '20 min', value: 1200 },
];

const TONES = [
  { label: 'Professional', value: 'professional' },
  { label: 'Energetic', value: 'energetic' },
  { label: 'Documentary', value: 'documentary' },
  { label: 'Storytelling', value: 'storytelling' },
  { label: 'Humorous', value: 'humorous' },
  { label: 'Bold', value: 'bold' },
  { label: 'Soft', value: 'soft' },
  { label: 'Dramatic', value: 'dramatic' },
  { label: 'Inspirational', value: 'inspirational' },
  { label: 'Casual', value: 'casual' },
  { label: 'Cinematic', value: 'cinematic' },
  { label: 'Educational', value: 'educational' },
  { label: 'Mysterious', value: 'mysterious' },
  { label: 'Witty', value: 'witty' },
  { label: 'Empathetic', value: 'empathetic' },
];

const STYLE_CATEGORIES = [
  {
    name: 'Film & Photography',
    styles: [
      { id: 'Cinematic', img: 'https://static.prod-images.emergentagent.com/jobs/2b3459fe-0785-4966-b00c-af788e8221f8/images/6b4aa5b0ddb9e7b7b1ad9b1c5ebd3fa6126d493d08d6745925783f167582b812.png' },
      { id: 'Photorealistic', img: 'https://static.prod-images.emergentagent.com/jobs/2b3459fe-0785-4966-b00c-af788e8221f8/images/047d4aa36c22ce81c042a058afa46e1134c1628474860e7240166dcb0588305d.png' },
      { id: 'Noir', img: 'https://static.prod-images.emergentagent.com/jobs/2b3459fe-0785-4966-b00c-af788e8221f8/images/b97d8d82d1d7d67473dd7dd9a12b2ea4dab3fff456ebb32f41edb63dc9f5bce1.png' },
    ]
  },
  {
    name: 'Illustration & Art',
    styles: [
      { id: 'Watercolor', img: 'https://static.prod-images.emergentagent.com/jobs/2b3459fe-0785-4966-b00c-af788e8221f8/images/824207a1f04e123cb301f594296003c88bcca99486e1f07d138b34933c9197e1.png' },
      { id: 'Oil Painting', img: 'https://static.prod-images.emergentagent.com/jobs/2b3459fe-0785-4966-b00c-af788e8221f8/images/d1cc62d094ec20a5935c97bea7289711cdb15ff48fdd7e6ef1291026e2d3948d.png' },
      { id: 'Digital Art', img: 'https://static.prod-images.emergentagent.com/jobs/2b3459fe-0785-4966-b00c-af788e8221f8/images/6b4aa5b0ddb9e7b7b1ad9b1c5ebd3fa6126d493d08d6745925783f167582b812.png' },
      { id: 'Pop Art', img: 'https://static.prod-images.emergentagent.com/jobs/2b3459fe-0785-4966-b00c-af788e8221f8/images/875212e3cc7343dfc43de1623c8a75f1604b1a1b38725d9615915a9fed453fd6.png' },
      { id: 'Surrealism', img: 'https://static.prod-images.emergentagent.com/jobs/2b3459fe-0785-4966-b00c-af788e8221f8/images/d2675e4023c78abfcc06b1dcd9a528f3196455acfd6c5132b5eba6e1ddf3e315.png' },
      { id: 'Minimalist', img: 'https://static.prod-images.emergentagent.com/jobs/2b3459fe-0785-4966-b00c-af788e8221f8/images/1744894c516b8ed8be036007f893d6dfd62e345ff57652e17116d7db2ad29272.png' },
      { id: 'Comic Book', img: 'https://static.prod-images.emergentagent.com/jobs/2b3459fe-0785-4966-b00c-af788e8221f8/images/a2a60f6d9701b3ded3984d7bf28fce44555036632ff68b68b061e559c3b98d82.png' },
    ]
  },
  {
    name: 'Anime & Animation',
    styles: [
      { id: 'Anime', img: 'https://static.prod-images.emergentagent.com/jobs/2b3459fe-0785-4966-b00c-af788e8221f8/images/da11df89d0f93ed31366c74489fa3b3c2dd4a382e80e0ab61d3854ab08b2f35a.png' },
      { id: 'Studio Ghibli', img: 'https://static.prod-images.emergentagent.com/jobs/2b3459fe-0785-4966-b00c-af788e8221f8/images/65493dfc021534a758552f60c85bbab63513ba8930b9df8be6ad91b61a1339bf.png' },
      { id: 'Animation', img: 'https://static.prod-images.emergentagent.com/jobs/2b3459fe-0785-4966-b00c-af788e8221f8/images/da11df89d0f93ed31366c74489fa3b3c2dd4a382e80e0ab61d3854ab08b2f35a.png' },
      { id: 'Dreamy Pastel', img: 'https://static.prod-images.emergentagent.com/jobs/2b3459fe-0785-4966-b00c-af788e8221f8/images/5079eefe11b2947ebde1cb8f5cefb7b5ca06f411e2e09dfa16ee5a1884af2295.png' },
    ]
  },
  {
    name: '3D & Modern',
    styles: [
      { id: '3D Render', img: 'https://static.prod-images.emergentagent.com/jobs/2b3459fe-0785-4966-b00c-af788e8221f8/images/047d4aa36c22ce81c042a058afa46e1134c1628474860e7240166dcb0588305d.png' },
      { id: 'Low Poly', img: 'https://static.prod-images.emergentagent.com/jobs/2b3459fe-0785-4966-b00c-af788e8221f8/images/8b4fc250bce0f8613b2793902dd027221d8b55569df1a63c337650d82a3a3d29.png' },
      { id: 'Isometric', img: 'https://static.prod-images.emergentagent.com/jobs/2b3459fe-0785-4966-b00c-af788e8221f8/images/8b4fc250bce0f8613b2793902dd027221d8b55569df1a63c337650d82a3a3d29.png' },
      { id: 'Pixel Art', img: 'https://static.prod-images.emergentagent.com/jobs/2b3459fe-0785-4966-b00c-af788e8221f8/images/c4f31ed181e00c7c57522e8a1b7ab47cf9bf445fc09570ff1c17d25f0ccb428e.png' },
    ]
  },
  {
    name: 'Sci-Fi & Fantasy',
    styles: [
      { id: 'Cyberpunk', img: 'https://static.prod-images.emergentagent.com/jobs/2b3459fe-0785-4966-b00c-af788e8221f8/images/a9ec4a35dcafdb7ca7cade524f3466063d00e75ddd713ee970f832e62b4d8606.png' },
      { id: 'Neon Glow', img: 'https://static.prod-images.emergentagent.com/jobs/2b3459fe-0785-4966-b00c-af788e8221f8/images/f460c30eaade59b20f4053c06984229a97972be6b8fb75d7ba5e0fa51bff6f08.png' },
      { id: 'Dark Fantasy', img: 'https://static.prod-images.emergentagent.com/jobs/2b3459fe-0785-4966-b00c-af788e8221f8/images/1943d809d673eb1356706de2f9b20d2d33a5a975d5a6490049e27a0fe248d727.png' },
      { id: 'Steampunk', img: 'https://static.prod-images.emergentagent.com/jobs/2b3459fe-0785-4966-b00c-af788e8221f8/images/b583ab9c51edf1c9679c4ae9c00ab42d41476226680b8e868c2708c208ee69f5.png' },
    ]
  },
  {
    name: 'Retro & Aesthetic',
    styles: [
      { id: 'Retro 80s', img: 'https://static.prod-images.emergentagent.com/jobs/2b3459fe-0785-4966-b00c-af788e8221f8/images/e1fff0ef6c41aa506b2cfe56ba4ced321684dee8f23e1421bd6ea214e65c2e4b.png' },
      { id: 'Vaporwave', img: 'https://static.prod-images.emergentagent.com/jobs/2b3459fe-0785-4966-b00c-af788e8221f8/images/347f912c2a42c1909a2184b7161b7e2af90dae1065b5923bff5375685c61489b.png' },
    ]
  },
];
const VISUAL_STYLES = STYLE_CATEGORIES.flatMap(c => c.styles.map(s => s.id));

const FEATURES = [
  { icon: PenTool, title: 'AI Script Writing', desc: 'Describe your idea and our AI writes a complete, engaging script with perfect pacing and structure.', span: 'col-span-1', color: '#818cf8' },
  { icon: Image, title: 'Auto Visual Generation', desc: 'Every slide gets a custom AI-generated image matched to your script content and visual style.', span: 'md:col-span-2', color: '#f472b6' },
  { icon: Volume2, title: 'Natural Voiceover', desc: 'High-quality text-to-speech in multiple voices and languages. Sounds natural, not robotic.', span: 'md:col-span-2', color: '#22d3ee' },
  { icon: Monitor, title: 'Remotion Video Engine', desc: 'Professional Ken Burns effects, animated captions, smooth transitions — all rendered in crisp 1080p.', span: 'col-span-1', color: '#fbbf24' },
];

const STEPS = [
  { num: '01', title: 'Choose a Category', desc: 'Pick from 36 video types — explainers, tutorials, business presentations, commercials, pitch decks, and more.' },
  { num: '02', title: 'Describe Your Idea', desc: 'Type a few sentences. Our AI understands your vision and writes a full storyboard.' },
  { num: '03', title: 'Customize & Edit', desc: 'Tweak scripts, swap images, adjust timing, add motion graphics — full creative control.' },
  { num: '04', title: 'Export & Share', desc: 'Render a polished MP4 with voiceover, captions, and background music. Ready to publish.' },
];

const STATS = [
  { value: '36', label: 'Video Categories' },
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
  
  const [selectedCategory, setSelectedCategory] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duration, setDuration] = useState(30);
  const [tone, setTone] = useState('professional');
  const [slideCount, setLocalSlideCount] = useState(5);
  const [localAssetType, setLocalAssetType] = useState('image');
  const [visualStyle, setVisualStyle] = useState('Cinematic');
  const [showSettings, setShowSettings] = useState(true);
  const [stylePickerOpen, setStylePickerOpen] = useState(false);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [remakerFile, setRemakerFile] = useState(null);
  const [remakerUploading, setRemakerUploading] = useState(false);
  const [bizUrl, setBizUrl] = useState('');
  const [bizFile, setBizFile] = useState(null);
  const [bizAnalysis, setBizAnalysis] = useState(null);
  const [bizAnalyzing, setBizAnalyzing] = useState(false);
  const [bizSelectedType, setBizSelectedType] = useState(null);

  const cat = useMemo(() => CATEGORIES.find(c => c.id === selectedCategory), [selectedCategory]);
  const isBusiness = cat?.isBusiness || false;

  useEffect(() => {
    if (cat) setTone(cat.tone);
    setInputValue('');
    setBizAnalysis(null);
    setBizSelectedType(null);
    setBizUrl('');
    setBizFile(null);
  }, [selectedCategory, cat]);

  const handleAnalyzeBusiness = async () => {
    if (bizAnalyzing) return;
    if (!bizUrl.trim() && !bizFile && !inputValue.trim()) return;
    setBizAnalyzing(true);
    try {
      const API = process.env.REACT_APP_BACKEND_URL + '/api';
      const formData = new FormData();
      if (bizUrl.trim()) formData.append('url', bizUrl.trim());
      if (inputValue.trim()) formData.append('description', inputValue.trim());
      if (bizFile) formData.append('file', bizFile);
      const res = await fetch(`${API}/analyze-business`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!data.success) throw new Error(data.detail || 'Analysis failed');
      setBizAnalysis(data.data);
    } catch (e) { alert('Business analysis failed: ' + (e.message || 'Unknown error')); }
    finally { setBizAnalyzing(false); }
  };

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
    if (isBusiness && bizAnalysis) {
      const bizContext = JSON.stringify({
        businessAnalysis: bizAnalysis,
        selectedVideoType: bizSelectedType || selectedCategory,
        additionalNotes: inputValue.trim(),
        businessUrl: bizUrl.trim(),
      });
      if (!isSubmitting) {
        setIsSubmitting(true);
        const targetCategory = bizSelectedType || selectedCategory;
        setRawInput(bizContext);
        setInputType('idea'); setVideoDuration(duration); setVideoTone(tone); setVideoCategory(targetCategory); setSlideCount(slideCount); setAssetType(localAssetType); setPreferredVisualStyle(visualStyle); setStep('processing');
        navigate('/create');
      }
      return;
    }
    if (!inputValue.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setRawInput(inputValue.trim()); setInputType('idea'); setVideoDuration(duration); setVideoTone(tone); setVideoCategory(selectedCategory); setSlideCount(slideCount); setAssetType(localAssetType); setPreferredVisualStyle(visualStyle); setStep('processing');
    navigate('/create');
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#030712]" data-testid="landing-page">
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

      {/* ============ NAVBAR ============ */}
      <nav className="sticky top-0 z-50 bg-[#030712]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-sm flex items-center justify-center bg-indigo-500">
              <Sparkles className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-xl font-black tracking-tight text-slate-100">
              Explaina<span className="gradient-text">Pro</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-slate-400 hover:text-indigo-400 transition">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-slate-400 hover:text-indigo-400 transition">How it Works</a>
            <a href="#categories" className="text-sm font-medium text-slate-400 hover:text-indigo-400 transition">Categories</a>
            <button onClick={() => navigate('/dashboard')} className="text-sm font-medium text-slate-400 hover:text-indigo-400 transition" data-testid="dashboard-link">Dashboard</button>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-indigo-500/10 border border-indigo-500/20">
                  <User className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm font-semibold text-indigo-300">{user?.name || user?.email?.split('@')[0]}</span>
                </div>
                <button onClick={logout} className="p-2 rounded-sm text-slate-500 hover:text-slate-300 hover:bg-white/5" data-testid="logout-btn">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <motion.button onClick={() => setShowAuthModal(true)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="px-5 py-2 rounded-none bg-indigo-500 text-white text-sm font-bold btn-sharp" data-testid="login-btn">
                Sign In
              </motion.button>
            )}
          </div>
        </div>
      </nav>

      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-[150px] opacity-10 bg-indigo-500" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-[120px] opacity-8 bg-pink-500" />
          <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] rounded-full blur-[100px] opacity-5 bg-cyan-500" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="text-5xl md:text-7xl font-black tracking-tight leading-none text-slate-100 mb-6">
            Create{' '}
            <span className="gradient-text">Stunning</span>
            <br className="hidden sm:block" />
            {' '}Videos with AI
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Describe your topic. ExplainaPro writes the script, generates visuals, adds voiceover — and delivers a publish-ready video in minutes.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="flex items-center justify-center gap-4 mb-12">
            <motion.button onClick={() => document.getElementById('creator-card')?.scrollIntoView({ behavior: 'smooth' })} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="px-8 py-3.5 rounded-none bg-indigo-500 text-white font-bold text-base btn-sharp flex items-center gap-2" data-testid="hero-cta">
              Start Creating <ArrowRight className="w-4 h-4" />
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="px-8 py-3.5 rounded-none bg-white/5 border-2 border-white/10 text-slate-300 font-bold text-base btn-sharp-pink flex items-center gap-2" onClick={() => navigate('/dashboard')}>
              <Play className="w-4 h-4" /> View Projects
            </motion.button>
          </motion.div>

          {/* Stats Bar */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }} className="flex items-center justify-center gap-8 md:gap-16 flex-wrap">
            {STATS.map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-2xl md:text-3xl font-black text-indigo-400">{s.value}</p>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============ CREATOR CARD ============ */}
      <section id="creator-card" className="relative z-10 max-w-3xl mx-auto px-4 py-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#0a0f1a] rounded-md border-2 border-white/[0.08] shadow-[0_8px_40px_-12px_rgba(129,140,248,0.12)] overflow-hidden">
            
            {/* Card Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.06]" style={{ background: cat ? `${cat.color}08` : 'transparent' }}>
              <div className="w-8 h-8 rounded-sm flex items-center justify-center" style={{ background: cat?.color || '#64748b' }}>
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-200">{cat ? cat.label : 'Please select video category'}</span>
                {cat?.badge && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-none text-white" style={{ background: cat?.color }}>{cat.badge}</span>}
              </div>
            </div>

            {/* Video Category Picker */}
            <div className="px-6 pt-5 pb-3">
              <div className="flex items-center gap-1.5 mb-2"><Film className="w-3 h-3 text-indigo-400" /><span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Video Category</span></div>
              <button onClick={() => setCategoryPickerOpen(!categoryPickerOpen)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md border-2 border-white/[0.08] hover:border-indigo-500/40 bg-[#0d1117] transition" data-testid="category-picker-trigger">
                {cat ? (
                  <div className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0" style={{ background: cat.color }}>
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0 bg-slate-800">
                    <Film className="w-5 h-5 text-slate-500" />
                  </div>
                )}
                <div className="flex-1 text-left min-w-0">
                  {cat ? (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-200">{cat.label}</span>
                        {cat.badge && <span className="text-[8px] font-black px-1.5 py-0.5 rounded-none text-white" style={{ background: cat.color }}>{cat.badge}</span>}
                      </div>
                      <span className="text-[10px] text-slate-500 truncate block">{cat.desc}</span>
                    </>
                  ) : (
                    <span className="text-sm font-semibold text-slate-500">Please select video category</span>
                  )}
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-500 transition flex-shrink-0 ${categoryPickerOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {categoryPickerOpen && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="mt-2 rounded-md border-2 border-white/[0.08] bg-[#0d1117] max-h-[420px] overflow-y-auto" data-testid="category-picker-dropdown">
                      {CATEGORY_GROUPS.map(group => {
                        const groupCats = CATEGORIES.filter(c => c.group === group.name);
                        if (groupCats.length === 0) return null;
                        return (
                          <div key={group.name} className="border-b border-white/[0.04] last:border-0">
                            <div className="px-3 py-2 bg-white/[0.02] sticky top-0 z-10">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{group.name}</span>
                            </div>
                            <div className="p-2 grid grid-cols-1 gap-1">
                              {groupCats.map(c => (
                                <button
                                  key={c.id}
                                  onClick={() => { setSelectedCategory(c.id); setCategoryPickerOpen(false); }}
                                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-left transition-all ${selectedCategory === c.id ? 'bg-indigo-500/10 border-2 border-indigo-500 ring-1 ring-indigo-500/20' : 'border-2 border-transparent hover:bg-white/[0.03] hover:border-white/[0.08]'}`}
                                  data-testid={`category-${c.id}`}
                                >
                                  <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0" style={{ background: c.color }}>
                                    <Sparkles className="w-4 h-4 text-white" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-slate-200">{c.label}</span>
                                      {c.badge && <span className="text-[7px] font-black px-1 py-0.5 rounded-none text-white" style={{ background: c.color }}>{c.badge}</span>}
                                    </div>
                                    <span className="text-[10px] text-slate-500 truncate block">{c.desc}</span>
                                  </div>
                                  {selectedCategory === c.id && (
                                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: c.color }}>
                                      <Check className="w-3 h-3 text-white" />
                                    </div>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="px-6 pt-5 pb-3">
              {selectedCategory === 'remaker' ? (
                <div className="space-y-3">
                  <label className="flex flex-col items-center justify-center min-h-[120px] rounded-sm border-2 border-dashed border-slate-700 hover:border-indigo-500/40 cursor-pointer transition bg-[#0d1117] hover:bg-indigo-500/5" data-testid="remaker-upload">
                    <input type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setRemakerFile(f); }} />
                    {remakerFile ? (
                      <div className="flex items-center gap-3 p-4">
                        <Film className="w-8 h-8 text-indigo-400" />
                        <div>
                          <p className="text-sm text-slate-200 font-bold">{remakerFile.name}</p>
                          <p className="text-xs text-slate-500">{(remakerFile.size / (1024 * 1024)).toFixed(1)} MB</p>
                        </div>
                        <button onClick={(e) => { e.preventDefault(); setRemakerFile(null); }} className="ml-auto text-xs text-slate-500 hover:text-red-400 font-semibold">Remove</button>
                      </div>
                    ) : (
                      <div className="text-center p-4">
                        <Upload className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <p className="text-sm text-slate-400 font-semibold">Upload a video to remake</p>
                        <p className="text-xs text-slate-600 mt-1">MP4, MOV, AVI up to 100MB</p>
                      </div>
                    )}
                  </label>
                  <Textarea value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Optional: Add notes about style changes..." className="min-h-[60px] resize-none bg-[#0d1117] text-slate-200 text-sm placeholder:text-slate-600 rounded-sm border-white/[0.08] focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0f1a]" data-testid="remaker-notes" />
                </div>
              ) : isBusiness ? (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5"><Globe className="w-3 h-3 text-blue-400" /><span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Website URL</span></div>
                    <input type="url" value={bizUrl} onChange={(e) => setBizUrl(e.target.value)} placeholder="https://yourcompany.com" className="w-full bg-[#0d1117] border-2 border-white/[0.08] rounded-sm px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-[#0a0f1a]" data-testid="biz-url-input" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5"><FileText className="w-3 h-3 text-blue-400" /><span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Upload Company Files</span></div>
                    <label className="flex items-center justify-center min-h-[64px] rounded-sm border-2 border-dashed border-slate-700 hover:border-indigo-500/40 cursor-pointer transition bg-[#0d1117] hover:bg-indigo-500/5" data-testid="biz-file-upload">
                      <input type="file" accept=".pdf,.docx,.doc,.txt,.md,.csv,.png,.jpg,.jpeg,.webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setBizFile(f); }} />
                      {bizFile ? (
                        <div className="flex items-center gap-3 p-3 w-full">
                          <FileText className="w-6 h-6 text-indigo-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-200 font-bold truncate">{bizFile.name}</p>
                            <p className="text-[10px] text-slate-500">{(bizFile.size / 1024).toFixed(0)} KB</p>
                          </div>
                          <button onClick={(e) => { e.preventDefault(); setBizFile(null); }} className="text-[10px] text-slate-500 hover:text-red-400 font-semibold flex-shrink-0">Remove</button>
                        </div>
                      ) : (
                        <div className="text-center p-3">
                          <Upload className="w-5 h-5 text-slate-600 mx-auto mb-1" />
                          <p className="text-[10px] text-slate-500 font-semibold">PDF, DOCX, TXT, Images</p>
                        </div>
                      )}
                    </label>
                  </div>
                  <Textarea value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder={cat?.placeholder || 'Describe your business, products, and goals...'} className="min-h-[80px] resize-none bg-[#0d1117] text-slate-200 text-sm placeholder:text-slate-600 rounded-sm border-white/[0.08] focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0f1a]" data-testid="biz-description" />
                  {!bizAnalysis && (
                    <motion.button onClick={handleAnalyzeBusiness} disabled={bizAnalyzing || (!bizUrl.trim() && !bizFile && !inputValue.trim())} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-sm text-sm font-bold text-white disabled:opacity-40 transition-all bg-gradient-to-r from-blue-600 to-indigo-600" data-testid="biz-analyze-btn">
                      {bizAnalyzing ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing Business...</> : <><Briefcase className="w-4 h-4" /> Analyze Business</>}
                    </motion.button>
                  )}
                  {bizAnalysis && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                      <div className="p-3 rounded-md bg-blue-500/10 border-2 border-blue-500/20">
                        <div className="flex items-center gap-2 mb-1">
                          <Briefcase className="w-4 h-4 text-blue-400" />
                          <span className="text-sm font-bold text-blue-300">{bizAnalysis.businessName}</span>
                        </div>
                        <p className="text-[11px] text-blue-300/80 leading-relaxed">{bizAnalysis.businessSummary}</p>
                        {bizAnalysis.competitiveEdge && <p className="text-[10px] text-blue-400/60 mt-1 italic">{bizAnalysis.competitiveEdge}</p>}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 mb-2"><Film className="w-3 h-3 text-indigo-400" /><span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Recommended Videos for Your Business</span></div>
                        <div className="grid grid-cols-1 gap-1.5 max-h-[280px] overflow-y-auto">
                          {(bizAnalysis.suggestedVideos || []).map((sv, i) => {
                            const matchCat = CATEGORIES.find(c => c.id === sv.categoryId);
                            const isSelected = (bizSelectedType || selectedCategory) === sv.categoryId;
                            return (
                              <button key={i} onClick={() => { setBizSelectedType(sv.categoryId); if (matchCat) setSelectedCategory(sv.categoryId); }} className={`flex items-start gap-3 w-full px-3 py-2.5 rounded-md text-left transition-all ${isSelected ? 'bg-indigo-500/10 border-2 border-indigo-500' : 'border-2 border-white/[0.08] hover:border-indigo-500/30 hover:bg-white/[0.02]'}`} data-testid={`biz-video-type-${sv.categoryId}`}>
                                <div className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: matchCat?.color || '#818cf8' }}>
                                  <Sparkles className="w-3.5 h-3.5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-200">{sv.label}</span>
                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-none text-white ${sv.priority === 'high' ? 'bg-red-500' : sv.priority === 'medium' ? 'bg-amber-500' : 'bg-slate-600'}`}>{sv.priority?.toUpperCase()}</span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 mt-0.5">{sv.reason}</p>
                                  {sv.suggestedTopic && <p className="text-[10px] text-indigo-400 mt-0.5 italic">Topic: {sv.suggestedTopic}</p>}
                                </div>
                                {isSelected && <Check className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-1" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <button onClick={() => { setBizAnalysis(null); setBizSelectedType(null); }} className="text-[10px] text-slate-500 hover:text-indigo-400 font-semibold">Re-analyze</button>
                    </motion.div>
                  )}
                </div>
              ) : (
                <Textarea value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder={cat?.placeholder} className="min-h-[120px] resize-none bg-[#0d1117] text-slate-200 text-sm placeholder:text-slate-600 rounded-sm border-white/[0.08] focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0f1a]" onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(); }} data-testid="input-textarea" />
              )}
            </div>

            {/* Visual Style */}
            <div className="px-6 pb-4">
              <div className="flex items-center gap-1.5 mb-2"><Palette className="w-3 h-3 text-indigo-400" /><span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Image Style</span></div>
              <button onClick={() => setStylePickerOpen(!stylePickerOpen)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md border-2 border-white/[0.08] hover:border-indigo-500/40 bg-[#0d1117] transition" data-testid="style-picker-trigger">
                {(() => { const found = STYLE_CATEGORIES.flatMap(c => c.styles).find(s => s.id === visualStyle); return found ? <img src={found.img} className="w-10 h-10 rounded object-cover" alt="" /> : null; })()}
                <div className="flex-1 text-left">
                  <span className="text-sm font-bold text-slate-200">{visualStyle}</span>
                  <span className="text-[10px] text-slate-500 ml-2">{STYLE_CATEGORIES.find(c => c.styles.some(s => s.id === visualStyle))?.name}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-500 transition ${stylePickerOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {stylePickerOpen && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="mt-2 rounded-md border-2 border-white/[0.08] bg-[#0d1117] max-h-[420px] overflow-y-auto" data-testid="style-picker-dropdown">
                      {STYLE_CATEGORIES.map(cat => (
                        <div key={cat.name} className="border-b border-white/[0.04] last:border-0">
                          <div className="px-3 py-2 bg-white/[0.02] sticky top-0 z-10">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{cat.name}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-1.5 p-2">
                            {cat.styles.map(style => (
                              <button key={style.id} onClick={() => { setVisualStyle(style.id); setStylePickerOpen(false); }} className={`group relative rounded-md overflow-hidden border-2 transition-all ${visualStyle === style.id ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-transparent hover:border-white/[0.15]'}`} data-testid={`style-${style.id}`}>
                                <img src={style.img} alt={style.id} className="w-full aspect-square object-cover" loading="lazy" />
                                <div className={`absolute inset-x-0 bottom-0 px-1.5 py-1 text-center ${visualStyle === style.id ? 'bg-indigo-600' : 'bg-black/70 group-hover:bg-black/90'} transition`}>
                                  <span className="text-[9px] font-bold text-white leading-none">{style.id}</span>
                                </div>
                                {visualStyle === style.id && (
                                  <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center">
                                    <Check className="w-3 h-3 text-white" />
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Settings Toggle */}
            <div className="px-6 pb-3">
              <button onClick={() => setShowSettings(v => !v)} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-400 font-semibold transition">
                <Mic2 className="w-3 h-3" /> Advanced Settings {showSettings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              <AnimatePresence>
                {showSettings && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><Clock className="w-3 h-3" /> Duration</span>
                        <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full bg-[#0d1117] border-2 border-white/[0.08] rounded-sm px-3 py-2 text-xs font-semibold text-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-[#0a0f1a]" data-testid="duration-select">
                          {DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><Layers className="w-3 h-3" /> Slides ({slideCount})</span>
                        <input type="range" min="1" max="50" value={slideCount} onChange={(e) => setLocalSlideCount(Number(e.target.value))} className="w-full accent-indigo-500" data-testid="slide-count" />
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><Image className="w-3 h-3" /> Media</span>
                        <div className="flex bg-[#0d1117] p-1 rounded-sm border-2 border-white/[0.08]">
                          <button onClick={() => setLocalAssetType('image')} className={`flex-1 text-xs font-bold py-1.5 rounded-sm ${localAssetType === 'image' ? 'bg-indigo-500 text-white' : 'text-slate-500'}`} data-testid="media-image">Images</button>
                          <button onClick={() => setLocalAssetType('video')} className={`flex-1 text-xs font-bold py-1.5 rounded-sm ${localAssetType === 'video' ? 'bg-indigo-500 text-white' : 'text-slate-500'}`} data-testid="media-video">Videos</button>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-wrap pt-4">
                      {TONES.map(t => (
                        <button key={t.value} onClick={() => setTone(t.value)} className={`px-3 py-1.5 rounded-none text-xs font-bold border-2 transition-all ${tone === t.value ? 'border-pink-500 bg-pink-500/10 text-pink-400' : 'border-white/[0.08] bg-transparent text-slate-500 hover:border-white/[0.15]'}`}>{t.label}</button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/[0.06] flex items-center justify-between bg-white/[0.02]">
              <span className="text-xs text-slate-600 font-mono">{selectedCategory === 'remaker' ? (remakerFile ? remakerFile.name : 'No file') : isBusiness ? (bizAnalysis ? bizAnalysis.businessName : 'Business') : `${inputValue.length} chars`}</span>
              <motion.button onClick={handleSubmit} disabled={!selectedCategory || (selectedCategory === 'remaker' ? !remakerFile || isSubmitting : isBusiness ? (!bizAnalysis || isSubmitting) : !inputValue.trim() || isSubmitting)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex items-center gap-2 px-6 py-2.5 rounded-none text-sm font-bold text-white disabled:opacity-40 btn-sharp transition-all" style={{ background: cat?.color || '#6366f1' }} data-testid="generate-btn">
                {isSubmitting ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating...</> : <><Wand2 className="w-3.5 h-3.5" /> {selectedCategory === 'remaker' ? 'Analyze & Remake' : isBusiness && bizAnalysis ? 'Generate Business Video' : cat ? `Generate ${cat.label}` : 'Generate Video'}</>}
              </motion.button>
            </div>
          </motion.div>
      </section>

      {/* ============ FEATURES BENTO GRID ============ */}
      <section id="features" className="relative z-10 py-20 bg-[#060a14]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-14">
            <span className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-none border-2 border-pink-500/20 bg-pink-500/10 text-xs font-bold text-pink-400 uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5" /> Powerful Features
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-slate-100 tracking-tight">Everything you need to create</h2>
            <p className="text-lg text-slate-400 mt-4 max-w-xl mx-auto">From script to screen in minutes. No editing skills required.</p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <AnimatedSection key={i} delay={i * 0.1} className={f.span}>
                <motion.div whileHover={{ y: -5 }} className="h-full p-8 rounded-md border-2 border-white/[0.06] bg-[#0a0f1a] card-lift group">
                  <div className="w-12 h-12 rounded-sm flex items-center justify-center mb-5" style={{ background: `${f.color}15` }}>
                    <f.icon className="w-6 h-6" style={{ color: f.color }} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-100 mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section id="how-it-works" className="relative z-10 py-20 bg-[#030712]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-14">
            <span className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-none border-2 border-cyan-500/20 bg-cyan-500/10 text-xs font-bold text-cyan-400 uppercase tracking-wider">
              <ArrowRight className="w-3.5 h-3.5" /> Simple Process
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-slate-100 tracking-tight">How it works</h2>
            <p className="text-lg text-slate-400 mt-4 max-w-xl mx-auto">Four simple steps from idea to finished video.</p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step, i) => (
              <AnimatedSection key={i} delay={i * 0.12}>
                <div className="relative p-6 rounded-md border-2 border-white/[0.06] bg-[#0a0f1a] group hover:border-indigo-500/30 transition-all card-lift">
                  <span className="text-5xl font-black text-white/[0.04] group-hover:text-indigo-500/10 transition-colors absolute top-4 right-4">{step.num}</span>
                  <div className="relative z-10">
                    <h3 className="text-lg font-bold text-slate-100 mb-2 mt-8">{step.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CATEGORY SHOWCASE ============ */}
      <section className="relative z-10 py-20 bg-[#060a14]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-14">
            <span className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-none border-2 border-amber-500/20 bg-amber-500/10 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> 21 Categories
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-slate-100 tracking-tight">Every video format you need</h2>
            <p className="text-lg text-slate-400 mt-4 max-w-xl mx-auto">From explainers to ads, tutorials to cinematic trailers.</p>
          </AnimatedSection>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {CATEGORIES.map((c, i) => (
              <AnimatedSection key={c.id} delay={i * 0.04}>
                <motion.button
                  onClick={() => { setSelectedCategory(c.id); document.getElementById('creator-card')?.scrollIntoView({ behavior: 'smooth' }); }}
                  whileHover={{ y: -4 }}
                  className="w-full text-left p-5 rounded-md border-2 border-white/[0.06] bg-[#0a0f1a] group hover:border-transparent transition-all card-lift"
                  style={{ '--lift-color': c.color }}
                >
                  <div className="w-10 h-10 rounded-sm flex items-center justify-center mb-3 transition-all" style={{ background: `${c.color}15` }}>
                    <Sparkles className="w-5 h-5" style={{ color: c.color }} />
                  </div>
                  <p className="font-bold text-slate-200 text-sm mb-1">{c.label}</p>
                  {c.badge && <span className="text-[8px] font-black px-1.5 py-0.5 rounded-none text-white" style={{ background: c.color }}>{c.badge}</span>}
                  <p className="text-xs text-slate-600 flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: c.color }}>
                    <Play className="w-3 h-3" /> Try this <ArrowRight className="w-3 h-3" />
                  </p>
                </motion.button>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ============ SOCIAL PROOF ============ */}
      <section className="relative z-10 py-20 bg-indigo-600/10 border-y border-indigo-500/20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection>
            <h2 className="text-4xl md:text-5xl font-black text-slate-100 tracking-tight mb-4">Trusted by creators worldwide</h2>
            <p className="text-lg text-indigo-300/60 max-w-xl mx-auto mb-12">Join thousands of content creators, marketers, and educators making videos with AI.</p>
          </AnimatedSection>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {[
              { quote: "ExplainaPro turned my 2-hour video editing process into 10 minutes. The AI captions and voiceover are incredible.", name: "Sarah Chen", role: "Content Creator" },
              { quote: "The motion graphics feature alone is worth it. I can create professional-looking explainers without any design skills.", name: "Marcus Rodriguez", role: "Marketing Manager" },
              { quote: "We use it for all our product demos and tutorials. The quality rivals expensive video production agencies.", name: "Priya Sharma", role: "Tech Educator" },
            ].map((t, i) => (
              <AnimatedSection key={i} delay={i * 0.1}>
                <div className="p-6 rounded-md bg-white/[0.03] backdrop-blur-sm border border-white/[0.08] text-left">
                  <div className="flex gap-1 mb-3">
                    {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
                  </div>
                  <p className="text-sm text-slate-300/90 leading-relaxed mb-4">"{t.quote}"</p>
                  <div>
                    <p className="text-sm font-bold text-slate-200">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.role}</p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ============ BOTTOM CTA ============ */}
      <section className="relative z-10 py-20 bg-[#030712]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection>
            <h2 className="text-4xl md:text-5xl font-black text-slate-100 tracking-tight mb-4">Ready to create your first video?</h2>
            <p className="text-lg text-slate-400 max-w-xl mx-auto mb-8">Start with any of our {CATEGORIES.length} categories. No credit card required.</p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <motion.button onClick={() => { setShowAuthModal(true); }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="px-8 py-3.5 rounded-none bg-indigo-500 text-white font-bold text-base btn-sharp flex items-center gap-2" data-testid="bottom-cta">
                Get Started Free <ArrowUpRight className="w-4 h-4" />
              </motion.button>
            </div>
            <div className="flex items-center justify-center gap-6 mt-8 flex-wrap">
              {['No credit card', 'Free to start', `${CATEGORIES.length} video categories`, 'AI-powered'].map((item, i) => (
                <span key={i} className="flex items-center gap-1.5 text-sm text-slate-500">
                  <Check className="w-4 h-4 text-emerald-500" /> {item}
                </span>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="relative z-10 border-t border-white/[0.06] bg-[#030712] py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-sm flex items-center justify-center bg-indigo-500">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-black text-slate-200">Explaina<span className="gradient-text">Pro</span></span>
            </div>
            <div className="flex items-center gap-8 text-sm text-slate-500">
              <a href="#features" className="hover:text-indigo-400 transition">Features</a>
              <a href="#how-it-works" className="hover:text-indigo-400 transition">How it Works</a>
              <a href="#categories" className="hover:text-indigo-400 transition">Categories</a>
              <button onClick={() => navigate('/dashboard')} className="hover:text-indigo-400 transition">Dashboard</button>
            </div>
            <p className="text-xs text-slate-600">© 2026 ExplainaPro. Powered by Gemini AI.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
