import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Save, Download, Layers, Loader2, Check, X, Film, FileText, Monitor } from 'lucide-react';
import { useProjectStore, useBrandKitStore, useCaptionStore, CATEGORIES } from '../../store/useProjectStore';
import { useAuth } from '../../context/AuthContext';
import EditorChatBox from '../../components/Editor/EditorChatBox';
import TimelinePanel from '../../components/Editor/TimelinePanel';
import { LeftSidebar } from './LeftSidebar';
import { CanvasPreview } from './CanvasPreview';
import { RightSidebar } from './RightSidebar';
import { RenderProgressPanel } from './RenderProgressPanel';
import { API } from './editorConstants';
import axios from 'axios';

export default function EditorPage() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { user } = useAuth();
  const { project, setProject, updateSlide, videoCategory } = useProjectStore();
  const { primaryColor, setPrimaryColor, selectedFont, setSelectedFont } = useBrandKitStore();
  const { activeCaptionStyleId, setActiveCaptionStyleId, captionMode, setCaptionMode, captionFont, captionColor, captionBgColor, captionPosition, captionSize } = useCaptionStore();
  const [activeTab, setActiveTab] = useState('script');
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderStatus, setRenderStatus] = useState(null);
  const [renderStep, setRenderStep] = useState('');
  const [renderUrl, setRenderUrl] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingHtml, setExportingHtml] = useState(false);
  const [selectedSlideId, setSelectedSlideId] = useState(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('en-US-Journey-D');
  const [saving, setSaving] = useState(false);
  const cat = CATEGORIES.find(c => c.id === videoCategory);

  useEffect(() => {
    const loadProject = async () => {
      if (projectId && projectId !== 'new' && !project) {
        try {
          const res = await axios.get(`${API}/projects/${projectId}`);
          if (res.data.success && res.data.project?.projectData) setProject(res.data.project.projectData);
        } catch (e) { console.error('Failed to load project:', e); }
      }
      setLoading(false);
    };
    loadProject();
  }, [projectId]);

  useEffect(() => {
    if (project?.slides?.length && !selectedSlideId) setSelectedSlideId(project.slides[0].id);
  }, [project, selectedSlideId]);

  const saveProject = async () => {
    if (!project) return;
    setSaving(true);
    try {
      const userId = user?.id || 'guest';
      if (projectId && projectId !== 'new') {
        await axios.put(`${API}/projects/${projectId}`, { project });
      } else {
        await axios.post(`${API}/projects`, { title: project.title, project, userId });
      }
    } catch (e) { console.error('Save failed:', e); }
    setSaving(false);
  };

  const exportAs = async (format) => {
    if (!project?.slides?.length) { alert('No slides to export.'); return; }
    const setter = format === 'pdf' ? setExportingPdf : setExportingHtml;
    setter(true);
    try {
      const res = await axios.post(`${API}/export/${format}`, {
        title: project.title || 'Video Storyboard',
        slides: project.slides,
        format,
      });
      if (res.data.success && res.data.url) {
        const link = document.createElement('a');
        link.href = `${process.env.REACT_APP_BACKEND_URL}${res.data.url}`;
        link.download = res.data.filename;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (e) { alert(`Export failed: ${e.response?.data?.detail || e.message}`); }
    finally { setter(false); }
  };

  const startRender = async () => {
    if (!project || rendering) return;
    const totalSlides = project.slides?.length || 0;
    if (totalSlides === 0) { alert('No slides to render.'); return; }
    const slidesWithImages = project.slides.filter(s => s.assetUrl);
    if (slidesWithImages.length < totalSlides) {
      const msg = slidesWithImages.length === 0
        ? `None of your ${totalSlides} slides have images. They will use gradient placeholders. Continue rendering?`
        : `Only ${slidesWithImages.length}/${totalSlides} slides have images. Slides without images will use gradient placeholders. Continue rendering?`;
      if (!window.confirm(msg)) return;
    }
    setRendering(true); setRenderProgress(0); setRenderStatus('starting'); setRenderStep('Initializing...'); setShowExportModal(true);
    try {
      const res = await axios.post(`${API}/render`, { projectId: projectId || 'new', slides: project.slides, title: project.title, duration: project.duration || totalSlides * 6, generateVoice: true, voiceId: selectedVoice, captionStyleId: activeCaptionStyleId || null, captionMode: captionMode || 'words', captionFont: captionFont || null, captionColor: captionColor || null, captionBgColor: captionBgColor || null, captionPosition: captionPosition || 'bottom', captionSize: captionSize || 44, bgmUrl: project.bgmUrl || null, bgmVolume: project.bgmVolume || 0.4, musicTracks: project.musicTracks || [] });
      const jobId = res.data.jobId;
      if (jobId) {
        setRenderStatus('processing');
        const maxPolls = 600;
        let pollCount = 0;
        const pollInterval = setInterval(async () => {
          pollCount++;
          if (pollCount > maxPolls) {
            clearInterval(pollInterval);
            setRenderStatus('timeout');
            setRendering(false);
            return;
          }
          try {
            const statusRes = await axios.get(`${API}/render/${jobId}`);
            setRenderProgress(statusRes.data.progress || 0);
            if (statusRes.data.step) setRenderStep(statusRes.data.step);
            if (statusRes.data.status === 'completed') { clearInterval(pollInterval); setRenderStatus('completed'); setRenderUrl(statusRes.data.videoUrl); setRendering(false); }
            else if (statusRes.data.status === 'failed') { clearInterval(pollInterval); setRenderStatus('failed'); setRenderStep(statusRes.data.error || 'Render failed'); setRendering(false); }
          } catch (pollErr) { console.error('Poll error:', pollErr); }
        }, 2000);
      } else {
        setRenderStatus('failed');
        setRenderStep('Server returned an error');
        setRendering(false);
      }
    } catch (e) { 
      console.error('Render error:', e); 
      setRenderStatus('failed'); 
      setRenderStep(e.response?.data?.detail || e.message || 'Failed to start render');
      setRendering(false); 
    }
  };

  const handleChatAction = (action) => {
    if (!action || !project) return;
    const slides = project.slides || [];
    switch (action.type) {
      case 'update_slide': { const slide = slides.find(s => s.id === action.slideId); if (slide && action.updates) updateSlide(slide.id, action.updates); break; }
      case 'delete_slide': { const newSlides = slides.filter(s => s.id !== action.slideId); if (newSlides.length > 0) setProject({ ...project, slides: newSlides }); break; }
      case 'add_graphic': { const slide = slides.find(s => s.id === action.slideId); if (slide && action.graphic) updateSlide(slide.id, { graphics: [...(slide.graphics || []), action.graphic] }); break; }
      case 'remove_graphics': { const slide = slides.find(s => s.id === action.slideId); if (slide) updateSlide(slide.id, { graphics: [] }); break; }
      case 'set_caption_style': if (action.styleId) setActiveCaptionStyleId(action.styleId); break;
      case 'set_caption_mode': if (action.mode) setCaptionMode(action.mode); break;
      case 'open_tab': if (action.tabId) setActiveTab(action.tabId); break;
      case 'batch_update': if (action.updates) slides.forEach(s => updateSlide(s.id, action.updates)); break;
      case 'info': break;
      default: break;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="w-8 h-8 text-indigo-500 animate-pulse mx-auto mb-2" />
          <p className="text-sm text-slate-400">Loading editor...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 mb-4">No project loaded</p>
          <motion.button whileHover={{ scale: 1.02 }} onClick={() => navigate('/')} className="px-6 py-2 rounded-none bg-indigo-600 text-white font-bold text-sm btn-sharp">Go Home</motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#F8FAFC] overflow-hidden" data-testid="editor-page">
      {/* Export Modal */}
      <AnimatePresence>
        {showExportModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => !rendering && setShowExportModal(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-lg bg-white border-2 border-slate-200 rounded-md overflow-hidden shadow-[0_20px_60px_-12px_rgba(79,70,229,0.2)]">
              {renderStatus === 'completed' ? (
                <div className="p-8 text-center">
                  <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center mx-auto mb-5">
                    <Check className="w-10 h-10 text-emerald-500" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2">Video Ready!</h3>
                  <p className="text-sm text-slate-500 mb-6">Your video has been rendered successfully. Download in your preferred format.</p>
                  <div className="flex flex-col gap-3 items-center">
                    <a href={`${process.env.REACT_APP_BACKEND_URL}${renderUrl}`} download={`${project?.title || 'video'}.mp4`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-2.5 w-64 justify-center rounded-none bg-emerald-600 text-white font-bold text-sm btn-sharp hover:bg-emerald-700 transition" data-testid="download-video-btn">
                      <Film className="w-4 h-4" /> Download MP4
                    </a>
                    <button onClick={() => exportAs('pdf')} disabled={exportingPdf} className="inline-flex items-center gap-2 px-6 py-2.5 w-64 justify-center rounded-none bg-blue-600 text-white font-bold text-sm btn-sharp hover:bg-blue-700 transition disabled:opacity-50" data-testid="download-pdf-btn">
                      {exportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} Download PDF
                    </button>
                    <button onClick={() => exportAs('html')} disabled={exportingHtml} className="inline-flex items-center gap-2 px-6 py-2.5 w-64 justify-center rounded-none bg-purple-600 text-white font-bold text-sm btn-sharp hover:bg-purple-700 transition disabled:opacity-50" data-testid="download-html-btn">
                      {exportingHtml ? <Loader2 className="w-4 h-4 animate-spin" /> : <Monitor className="w-4 h-4" />} Download HTML
                    </button>
                    <button onClick={() => setShowExportModal(false)} className="px-5 py-2 text-slate-400 font-bold text-xs hover:text-slate-600 transition">Close</button>
                  </div>
                </div>
              ) : renderStatus === 'failed' || renderStatus === 'timeout' ? (
                <div className="p-8 text-center">
                  <div className="w-20 h-20 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center mx-auto mb-5">
                    <X className="w-10 h-10 text-red-500" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2">{renderStatus === 'timeout' ? 'Render Timed Out' : 'Render Failed'}</h3>
                  <p className="text-sm text-slate-500 mb-3">{renderStatus === 'timeout' ? 'The render took too long. Please try with fewer slides.' : 'Something went wrong during rendering.'}</p>
                  {renderStep && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-sm p-3 mb-5 text-left break-words max-h-24 overflow-y-auto font-mono">{renderStep}</p>}
                  <div className="flex gap-3 justify-center">
                    <button onClick={() => setShowExportModal(false)} className="px-5 py-2.5 rounded-none border-2 border-slate-200 text-slate-600 font-bold text-sm">Close</button>
                    <button onClick={() => { setShowExportModal(false); startRender(); }} className="px-5 py-2.5 rounded-none bg-indigo-600 text-white font-bold text-sm btn-sharp">Retry</button>
                  </div>
                </div>
              ) : (
                <RenderProgressPanel progress={renderProgress} step={renderStep} />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Nav */}
      <nav className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-sm flex items-center justify-center bg-indigo-600"><Sparkles className="w-3.5 h-3.5 text-white" /></div>
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-sm font-bold text-slate-900">{project.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowTimeline(t => !t)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-none border-2 text-sm font-bold transition ${showTimeline ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50'}`} data-testid="timeline-toggle-btn">
            <Layers className="w-4 h-4" /> Timeline
          </button>
          <button onClick={saveProject} disabled={saving} className="flex items-center gap-1.5 px-4 py-1.5 rounded-none border-2 border-slate-200 text-sm font-bold text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 transition disabled:opacity-50" data-testid="save-btn">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {saving ? 'Saving...' : 'Save'}
          </button>
          <button onClick={() => exportAs('pdf')} disabled={exportingPdf} className="flex items-center gap-1.5 px-3 py-1.5 rounded-none border-2 border-blue-200 text-sm font-bold text-blue-600 hover:bg-blue-50 transition disabled:opacity-50" data-testid="export-pdf-btn">
            {exportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} PDF
          </button>
          <button onClick={() => exportAs('html')} disabled={exportingHtml} className="flex items-center gap-1.5 px-3 py-1.5 rounded-none border-2 border-purple-200 text-sm font-bold text-purple-600 hover:bg-purple-50 transition disabled:opacity-50" data-testid="export-html-btn">
            {exportingHtml ? <Loader2 className="w-4 h-4 animate-spin" /> : <Monitor className="w-4 h-4" />} HTML
          </button>
          <button onClick={startRender} disabled={rendering} className="flex items-center gap-1.5 px-4 py-1.5 rounded-none text-sm font-bold text-white btn-sharp disabled:opacity-50" style={{ background: `linear-gradient(135deg, ${cat?.color || primaryColor}, #10b981)` }} data-testid="export-btn">
            {rendering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {rendering ? 'Rendering...' : 'Export MP4'}
          </button>
        </div>
      </nav>

      {/* Main Editor */}
      <div className="flex-1 flex overflow-hidden">
        <LeftSidebar activeTab={activeTab} setActiveTab={setActiveTab} project={project} updateSlide={updateSlide} videoCategory={videoCategory} primaryColor={primaryColor} selectedSlideId={selectedSlideId} setSelectedSlideId={setSelectedSlideId} selectedVoice={selectedVoice} setSelectedVoice={setSelectedVoice} />
        <CanvasPreview project={project} videoCategory={videoCategory} selectedSlideId={selectedSlideId} setSelectedSlideId={setSelectedSlideId} />
        <RightSidebar project={project} primaryColor={primaryColor} setPrimaryColor={setPrimaryColor} selectedFont={selectedFont} setSelectedFont={setSelectedFont} selectedSlideId={selectedSlideId} updateSlide={updateSlide} />
      </div>

      {/* Timeline Panel */}
      <AnimatePresence>
        {showTimeline && (
          <TimelinePanel
            project={project}
            updateSlide={updateSlide}
            selectedSlideId={selectedSlideId}
            setSelectedSlideId={setSelectedSlideId}
            isOpen={showTimeline}
            onToggle={() => setShowTimeline(false)}
            onAutoSync={(result) => { console.log('Auto-sync complete:', result); }}
          />
        )}
      </AnimatePresence>

      {/* AI Chat Box */}
      <EditorChatBox project={project} updateSlide={updateSlide} onAction={handleChatAction} />
    </div>
  );
}
