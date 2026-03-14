import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowLeft, Save, Download, Play, Pause, SkipBack, SkipForward, Volume2, FileText, Image, Music, Volume1, Mic, Captions, Wand2, Heart, ZoomIn, ZoomOut, Settings, Layers, SlidersHorizontal, Loader2, Check, X, Film } from 'lucide-react';
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

function LeftSidebar({ activeTab, setActiveTab, project, updateSlide, videoCategory, primaryColor }) {
  const cat = CATEGORIES.find(c => c.id === videoCategory);
  const { setProject } = useProjectStore();
  const { activeCaptionStyleId, setActiveCaptionStyleId, captionMode, setCaptionMode } = useCaptionStore();
  const [generating, setGenerating] = useState({});
  const [musicSearch, setMusicSearch] = useState('');
  const [audioSearch, setAudioSearch] = useState('');
  const activeSlide = project?.slides?.[0];

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

  const generateAllMissing = async () => {
    for (const slide of project?.slides || []) {
      if (!slide.assetUrl) await generateImage(slide);
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

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {activeTab === 'script' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Slides</h3>
              <span className="text-[10px] text-slate-500">{project?.slides?.length || 0} total</span>
            </div>
            {project?.slides?.map((slide, idx) => (
              <div key={slide.id} className="p-3 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-violet-500/50 cursor-pointer group">
                <div className="flex items-start gap-3">
                  <div className="w-16 h-10 rounded-lg bg-slate-900 flex-shrink-0 overflow-hidden flex items-center justify-center">
                    {slide.assetUrl ? (
                      <img src={slide.assetUrl.startsWith('/api') ? `${process.env.REACT_APP_BACKEND_URL}${slide.assetUrl}` : slide.assetUrl} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <span className="text-xs text-slate-600">{idx + 1}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{slide.title}</p>
                    <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">{slide.narration}</p>
                    <div className="flex items-center gap-2 mt-1 text-[9px] text-slate-600">
                      <span>{slide.duration}s</span>
                      <span>·</span>
                      <span>{slide.transition}</span>
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
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Voice Settings</h3>
            <div className="grid grid-cols-2 gap-2">
              {['en-US-Journey-D', 'en-US-Journey-F', 'en-GB-Neural2-B', 'en-AU-Neural2-C'].map(voice => (
                <button key={voice} className="p-2 rounded-xl border border-slate-700 hover:border-violet-500/50 text-left" data-testid={`voice-${voice}`}>
                  <p className="text-xs font-semibold text-white">{voice.split('-')[2]}</p>
                  <p className="text-[9px] text-slate-500">{voice.split('-').slice(0, 2).join('-')}</p>
                </button>
              ))}
            </div>
            <Button size="sm" className="w-full" style={{ background: `linear-gradient(135deg, ${cat?.color}, #EC4899)` }} data-testid="gen-voice-all">
              <Mic className="w-3 h-3 mr-1" /> Generate All Voices
            </Button>
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
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">VFX Effects</h3>
            <div className="grid grid-cols-2 gap-2">
              {VFX_OPTIONS.map(vfx => (
                <button key={vfx} onClick={() => updateSlide(activeSlide.id, { vfx })} className={`p-3 rounded-xl border text-xs font-semibold capitalize ${activeSlide.vfx === vfx ? 'border-violet-500 bg-violet-500/10 text-white' : 'border-slate-700 text-slate-400'}`} data-testid={`vfx-${vfx}`}>{vfx}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CanvasPreview({ project, videoCategory }) {
  const cat = CATEGORIES.find(c => c.id === videoCategory);
  const [playing, setPlaying] = useState(false);
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
  const currentSlide = project?.slides?.[currentSlideIdx];

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
            <button onClick={() => setCurrentSlideIdx(Math.max(0, currentSlideIdx - 1))} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"><SkipBack className="w-5 h-5" /></button>
            <button onClick={() => setPlaying(!playing)} className="w-12 h-12 rounded-full flex items-center justify-center text-white" style={{ background: `linear-gradient(135deg, ${cat?.color}, #EC4899)` }} data-testid="play-btn">
              {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 translate-x-0.5" />}
            </button>
            <button onClick={() => setCurrentSlideIdx(Math.min((project?.slides?.length || 1) - 1, currentSlideIdx + 1))} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"><SkipForward className="w-5 h-5" /></button>
          </div>
          {/* Timeline */}
          <div className="flex gap-1">
            {project?.slides?.map((s, i) => (
              <button key={s.id} onClick={() => setCurrentSlideIdx(i)} className="flex-1 h-2 rounded-full" style={{ background: i === currentSlideIdx ? `linear-gradient(90deg, ${cat?.color}, #EC4899)` : i < currentSlideIdx ? '#10b981' : '#1e293b' }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RightSidebar({ project, primaryColor, setPrimaryColor, selectedFont, setSelectedFont }) {
  const currentSlide = project?.slides?.[0];

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
              <label className="text-[10px] text-slate-500 uppercase">Duration</label>
              <div className="flex items-center gap-2 mt-1">
                <Slider defaultValue={[currentSlide.duration]} max={30} step={1} className="flex-1" />
                <span className="text-xs text-slate-400 w-8">{currentSlide.duration}s</span>
              </div>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase">Transition</label>
              <select value={currentSlide.transition} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                {['fade', 'slide', 'zoom', 'none'].map(t => <option key={t}>{t}</option>)}
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
        <LeftSidebar activeTab={activeTab} setActiveTab={setActiveTab} project={project} updateSlide={updateSlide} videoCategory={videoCategory} primaryColor={primaryColor} />
        <CanvasPreview project={project} videoCategory={videoCategory} />
        <RightSidebar project={project} primaryColor={primaryColor} setPrimaryColor={setPrimaryColor} selectedFont={selectedFont} setSelectedFont={setSelectedFont} />
      </div>
    </div>
  );
}
