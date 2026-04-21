import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Loader2,
  Image,
  Film,
  Upload,
  RefreshCcw,
  Play,
  X
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const CATEGORIES = [
  { id: "explainer", label: "Explainer", color: "#818cf8" },
  { id: "marketing", label: "Marketing", color: "#f472b6" },
  { id: "social", label: "Social Media", color: "#10b981" },
  { id: "education", label: "Education", color: "#f59e0b" },
  { id: "newsletter", label: "Newsletter", color: "#3b82f6" }
];

const VISUAL_STYLES = [
  { id: "Cinematic", label: "Cinematic" },
  { id: "Modern", label: "Modern" },
  { id: "Minimal", label: "Minimal" },
  { id: "Professional", label: "Professional" },
  { id: "Creative", label: "Creative" }
];

export default function CreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(1);
  const [input, setInput] = useState('');
  const [category, setCategory] = useState('explainer');
  const [slideCount, setSlideCount] = useState(5);
  const [duration, setDuration] = useState(30);
  const [visualStyle, setVisualStyle] = useState('Cinematic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [projectData, setProjectData] = useState(null);

  // Check if we came from landing page with pre-generated data
  useEffect(() => {
    if (location.state?.projectData) {
      console.log('Received project data from landing:', location.state.projectData);
      const data = location.state.projectData;
      setInput(location.state.input || '');
      setCategory(location.state.category || 'explainer');
      setDuration(location.state.duration || 30);
      setSlideCount(location.state.slideCount || 5);
      
      if (data.slides) {
        setProjectData({
          title: (location.state.input || 'Video').slice(0, 60),
          slides: data.slides.map((s, i) => ({
            id: i + 1,
            title: s.text || s.title || `Slide ${i + 1}`,
            text: s.text || s.title || '',
            duration: s.duration || 6,
            imagePrompt: s.visualDescription || s.imagePrompt || '',
            videoPrompt: s.videoPrompt || '',
            voiceScript: s.voiceScript || s.narration || '',
            narration: s.narration || s.voiceScript || '',
            assetType: 'none',
            assetUrl: null,
            assetGenerating: false
          })),
          category: location.state.category || 'explainer',
          style: 'Cinematic',
          duration: location.state.duration || 30
        });
        setStep(2); // Go straight to storyboard view
      }
    }
  }, [location.state]);

  const cat = CATEGORIES.find(c => c.id === category) || CATEGORIES[0];

  const handleGenerate = async () => {
    if (!input.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Sending request to API...');
      console.log('Payload:', { input, type: "idea", duration, tone: "professional", category, slideCount, preferredVisualStyle: visualStyle });
      
      const res = await axios.post(`${API}/restructure-script`, {
        input: input,
        type: "idea",
        duration: duration,
        tone: "professional",
        category: category,
        slideCount: slideCount,
        preferredVisualStyle: visualStyle
      }, { timeout: 180000 });
      
      console.log('Response received:', res.data);
      
      if (res.data.success && res.data.data?.slides) {
        console.log('Success! Setting project data with', res.data.data.slides.length, 'slides');
        setProjectData({
          title: input.slice(0, 60),
          slides: res.data.data.slides.map((s, i) => ({
            id: i + 1,
            title: s.text || s.title || `Slide ${i + 1}`,
            text: s.text || s.title || '',
            duration: s.duration || 6,
            imagePrompt: s.visualDescription || s.imagePrompt || '',
            videoPrompt: s.videoPrompt || '',
            voiceScript: s.voiceScript || s.narration || '',
            narration: s.narration || s.voiceScript || '',
            assetType: 'none',
            assetUrl: null,
            assetGenerating: false
          })),
          category,
          style: visualStyle,
          duration
        });
        setStep(2);
      } else {
        console.log('API returned success=false or no slides:', res.data);
        setError(res.data.error || 'Failed to generate storyboard');
      }
    } catch (err) {
      console.error('API Error:', err);
      console.error('Error response:', err.response?.data);
      const msg = err.response?.data?.detail || err.response?.data?.error || err.message;
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    // Navigate to editor with the project data
    navigate('/editor/new', { state: { project: projectData } });
  };

  return (
    <div className="min-h-screen bg-[#030712] text-white">
      {/* Header */}
      <nav className="sticky top-0 z-40 border-b border-white/[0.06] px-6 py-4 bg-[#030712]/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold">SundayRemaker</span>
            </button>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400">Create</span>
          </div>
          <button 
            onClick={() => { setInput(''); setStep(1); setError(null); }}
            className="text-sm text-slate-400 hover:text-white flex items-center gap-1"
          >
            <RefreshCcw className="w-4 h-4" /> Reset
          </button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">
        {step === 1 && (
          <div>
            <h1 className="text-3xl font-black mb-2">Create your video</h1>
            <p className="text-slate-400 mb-8">Describe your video idea and let AI generate a complete storyboard</p>

            {/* Input Section */}
            <div className="mb-8">
              <label className="text-sm font-semibold text-slate-300 mb-2 block">What is your video about?</label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g., The history of the Iranian revolution in 60 seconds..."
                className="w-full h-32 bg-[#0d1117] border border-white/[0.08] rounded-xl p-4 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 resize-none"
              />
            </div>

            {/* Options Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div>
                <label className="text-xs text-slate-500 mb-2 block">Category</label>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#0d1117] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-2 block">Duration</label>
                <select 
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full bg-[#0d1117] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                >
                  <option value={15}>15 sec</option>
                  <option value={30}>30 sec</option>
                  <option value={60}>60 sec</option>
                  <option value={120}>2 min</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-2 block">Slides</label>
                <select 
                  value={slideCount}
                  onChange={(e) => setSlideCount(Number(e.target.value))}
                  className="w-full bg-[#0d1117] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                >
                  {[3, 5, 8, 10, 12].map(n => (
                    <option key={n} value={n}>{n} slides</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-2 block">Visual Style</label>
                <select 
                  value={visualStyle}
                  onChange={(e) => setVisualStyle(e.target.value)}
                  className="w-full bg-[#0d1117] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                >
                  {VISUAL_STYLES.map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-red-400 text-sm">{error}</p>
                <button 
                  onClick={() => setError(null)}
                  className="mt-2 text-xs text-red-400/60 hover:text-red-400"
                >
                  Dismiss
                </button>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={loading || !input.trim()}
              className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating storyboard...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Storyboard
                </>
              )}
            </button>
          </div>
        )}

        {step === 2 && projectData && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-black mb-2">Your storyboard</h1>
                <p className="text-slate-400">{projectData.slides.length} slides generated • {projectData.duration}s duration</p>
              </div>
              <button 
                onClick={() => setStep(1)}
                className="flex items-center gap-2 px-4 py-2 border border-white/[0.08] rounded-lg text-sm text-slate-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" /> Regenerate
              </button>
            </div>

            {/* Slides Preview */}
            <div className="space-y-4 mb-8">
              {projectData.slides.map((slide, idx) => (
                <div 
                  key={slide.id}
                  className="bg-[#0d1117] border border-white/[0.08] rounded-xl p-5"
                >
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0"
                      style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                    >
                      {slide.id}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-2">{slide.title}</h3>
                      <p className="text-sm text-slate-400 mb-3">{slide.voiceScript}</p>
                      <div className="bg-[#161b22] rounded-lg p-3">
                        <span className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">Image Prompt</span>
                        <p className="text-xs text-slate-400 mt-1">{slide.imagePrompt}</p>
                      </div>
                    </div>
                    <div className="text-sm text-slate-500 flex-shrink-0">
                      {slide.duration}s
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleExport}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition"
            >
              <Play className="w-5 h-5" />
              Open in Editor
            </button>
          </div>
        )}
      </div>
    </div>
  );
}