import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowLeft, Save, Download, Play, Pause, Square, SkipBack, SkipForward, Volume2, FileText, Image, Music, Volume1, Mic, Captions, Wand2, Heart, ZoomIn, ZoomOut, Settings, Layers, SlidersHorizontal, Loader2, Check, X, Film, RefreshCcw, Upload, Type, MessageCircle } from 'lucide-react';
import { useProjectStore, useBrandKitStore, useCaptionStore, CATEGORIES } from '../store/useProjectStore';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Slider } from '../components/ui/slider';
import EditorChatBox from '../components/Editor/EditorChatBox';
import TimelinePanel from '../components/Editor/TimelinePanel';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const TABS = [
  { id: 'script', label: 'Script', icon: FileText },
  { id: 'assets', label: 'Assets', icon: Image },
  { id: 'graphics', label: 'Graphics', icon: Type },
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

function LeftSidebar({ activeTab, setActiveTab, project, updateSlide, videoCategory, primaryColor, selectedSlideId, setSelectedSlideId, selectedVoice, setSelectedVoice }) {
  const cat = CATEGORIES.find(c => c.id === videoCategory);
  const { setProject } = useProjectStore();
  const { activeCaptionStyleId, setActiveCaptionStyleId, captionMode, setCaptionMode, captionFont, setCaptionFont, captionColor, setCaptionColor, captionBgColor, setCaptionBgColor, captionPosition, setCaptionPosition, captionSize, setCaptionSize } = useCaptionStore();
  const [generating, setGenerating] = useState({});
  const [playingAudio, setPlayingAudio] = useState(null);
  const [editingPrompts, setEditingPrompts] = useState({});
  const [uploadedAssets, setUploadedAssets] = useState([]);
  const [musicLibrary, setMusicLibrary] = useState({ tracks: [], categories: [] });
  const [sfxLibrary, setSfxLibrary] = useState({ sounds: [], categories: [] });
  const [musicFilter, setMusicFilter] = useState('all');
  const [sfxFilter, setSfxFilter] = useState('all');
  const [previewingTrack, setPreviewingTrack] = useState(null);
  const [userLibrary, setUserLibrary] = useState([]);
  const [libraryFilter, setLibraryFilter] = useState('all');
  const [libraryLoading, setLibraryLoading] = useState(false);
  const audioRef = React.useRef(null);
  const previewAudioRef = React.useRef(null);
  
  React.useEffect(() => {
    axios.get(`${API}/library/music`).then(r => setMusicLibrary(r.data)).catch(() => {});
    axios.get(`${API}/library/sfx`).then(r => setSfxLibrary(r.data)).catch(() => {});
  }, []);

  const loadUserLibrary = React.useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLibraryLoading(true);
    try {
      const catParam = libraryFilter !== 'all' ? `?category=${libraryFilter}` : '';
      const res = await axios.get(`${API}/user/library${catParam}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) setUserLibrary(res.data.assets || []);
    } catch (e) { console.log('Library load failed'); }
    setLibraryLoading(false);
  }, [libraryFilter]);

  React.useEffect(() => {
    loadUserLibrary();
  }, [loadUserLibrary]);

  const suggestedAssets = React.useMemo(() => {
    const slide = project?.slides?.find(s => s.id === selectedSlideId) || project?.slides?.[0];
    if (!slide || userLibrary.length === 0) return [];
    const slideText = `${slide.narration || ''} ${slide.imagePrompt || ''} ${slide.title || ''}`.toLowerCase();
    const slideWords = slideText.split(/\s+/).filter(w => w.length > 3);
    if (slideWords.length === 0) return [];
    const scored = userLibrary
      .filter(a => a.type === 'image' || a.type === 'video')
      .map(asset => {
        const assetText = (asset.prompt || '').toLowerCase();
        const matchCount = slideWords.filter(w => assetText.includes(w)).length;
        return { ...asset, score: matchCount };
      })
      .filter(a => a.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
    return scored;
  }, [selectedSlideId, userLibrary, project?.slides]);

  const activeSlide = project?.slides?.find(s => s.id === selectedSlideId) || project?.slides?.[0];

  const generateImage = async (slide) => {
    const prompt = editingPrompts[slide.id] ?? slide.imagePrompt;
    setGenerating(g => ({ ...g, [slide.id]: true }));
    updateSlide(slide.id, { assetGenerating: true, imagePrompt: prompt });
    try {
      const res = await axios.post(`${API}/generate-image`, { description: prompt, style: 'Cinematic', characters: project?.characters });
      if (res.data.success) updateSlide(slide.id, { assetType: 'image', assetUrl: res.data.image, assetGenerating: false });
    } catch (e) { console.error(e); }
    updateSlide(slide.id, { assetGenerating: false });
    setGenerating(g => ({ ...g, [slide.id]: false }));
  };

  const generateVoice = async (slide) => {
    if (!slide.narration) return;
    setGenerating(g => ({ ...g, [`voice_${slide.id}`]: true }));
    try {
      const res = await axios.post(`${API}/generate-voice`, { text: slide.narration, voiceId: selectedVoice });
      if (res.data.success) updateSlide(slide.id, { voiceUrl: res.data.url });
    } catch (e) { console.error('Voice generation error:', e); }
    setGenerating(g => ({ ...g, [`voice_${slide.id}`]: false }));
  };

  const generateAllVoices = async () => {
    setGenerating(g => ({ ...g, allVoices: true }));
    for (const slide of project?.slides || []) {
      if (slide.narration) await generateVoice(slide);
    }
    setGenerating(g => ({ ...g, allVoices: false }));
  };

  const generateAllMissing = async () => {
    for (const slide of project?.slides || []) {
      if (!slide.assetUrl) await generateImage(slide);
    }
  };

  const handleUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post(`${API}/upload`, formData);
      if (res.data.success) setUploadedAssets(prev => [...prev, { type, url: res.data.url, name: file.name }]);
    } catch (err) { console.error('Upload failed:', err); }
  };

  const handleSlideUpload = async (e, slideId) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const type = file.type.startsWith('video/') ? 'video' : 'image';
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post(`${API}/upload`, formData);
      if (res.data.success) updateSlide(slideId, { assetType: type, assetUrl: res.data.url });
    } catch (err) {
      console.error('Upload failed:', err);
      updateSlide(slideId, { assetType: type, assetUrl: URL.createObjectURL(file) });
    }
  };

  const playAudio = (url) => {
    if (audioRef.current) {
      if (playingAudio === url) { audioRef.current.pause(); setPlayingAudio(null); }
      else { audioRef.current.src = `${process.env.REACT_APP_BACKEND_URL}${url}`; audioRef.current.play(); setPlayingAudio(url); }
    }
  };

  const voicesGenerated = project?.slides?.filter(s => s.voiceUrl).length || 0;
  const totalSlides = project?.slides?.length || 0;

  return (
    <div className="w-80 bg-white border-r border-slate-200 flex flex-col h-full">
      <div className="flex border-b border-slate-200 p-1 gap-0.5 overflow-x-auto scrollbar-hide bg-slate-50">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center gap-0.5 px-2.5 py-2 rounded-sm flex-shrink-0 transition ${activeTab === tab.id ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`} data-testid={`tab-${tab.id}`}>
            <tab.icon className="w-4 h-4" />
            <span className="text-[9px] font-bold">{tab.label}</span>
          </button>
        ))}
      </div>

      <audio ref={audioRef} onEnded={() => setPlayingAudio(null)} className="hidden" />
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {activeTab === 'script' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Slides</h3>
              <span className="text-[10px] text-slate-400">{project?.slides?.length || 0} total</span>
            </div>
            {project?.slides?.map((slide, idx) => (
              <div key={slide.id} onClick={() => setSelectedSlideId(slide.id)} className={`p-3 rounded-md border-2 cursor-pointer group transition ${selectedSlideId === slide.id ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 bg-white hover:border-indigo-300'}`}>
                <div className="flex items-start gap-3">
                  <div className="w-16 h-10 rounded-sm bg-slate-100 flex-shrink-0 overflow-hidden flex items-center justify-center border border-slate-200">
                    {slide.assetUrl ? (
                      slide.assetType === 'video' ? (
                        <video src={slide.assetUrl.startsWith('/api') ? `${process.env.REACT_APP_BACKEND_URL}${slide.assetUrl}` : slide.assetUrl} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={slide.assetUrl.startsWith('/api') ? `${process.env.REACT_APP_BACKEND_URL}${slide.assetUrl}` : slide.assetUrl} className="w-full h-full object-cover" alt="" />
                      )
                    ) : (
                      <span className="text-xs text-slate-400 font-bold">{idx + 1}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-900 truncate">{slide.title}</p>
                      {slide.assetType === 'video' && <Film className="w-3 h-3 text-blue-500" />}
                      {slide.voiceUrl && <Mic className="w-3 h-3 text-emerald-500" />}
                      {slide.sfxUrl && <Volume1 className="w-3 h-3 text-pink-500" />}
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">{slide.narration}</p>
                    <div className="flex items-center gap-2 mt-1 text-[9px] text-slate-400 font-semibold">
                      <span>{slide.duration}s</span>
                      <span>·</span>
                      <span className="capitalize">{slide.transition || 'fade'}</span>
                      {slide.vfx && slide.vfx !== 'none' && <span className="text-indigo-500">· {slide.vfx}</span>}
                      {slide.titlePosition && slide.titlePosition !== 'hidden' && <span className="text-amber-500">· Title: {slide.titlePosition}</span>}
                    </div>
                  </div>
                </div>
                {selectedSlideId === slide.id && (
                  <div className="mt-3 pt-3 border-t border-slate-200 space-y-2" onClick={(e) => e.stopPropagation()}>
                    <div>
                      <label className="text-[9px] text-slate-500 font-bold uppercase">Title Text</label>
                      <input type="text" value={slide.title || ''} onChange={(e) => updateSlide(slide.id, { title: e.target.value })} className="w-full bg-white border-2 border-slate-200 rounded-sm px-2 py-1.5 text-xs text-slate-900 focus:border-indigo-500 outline-none mt-0.5" data-testid={`slide-title-input-${idx}`} />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-500 font-bold uppercase">Title Position</label>
                      <div className="grid grid-cols-4 gap-1 mt-1">
                        {[
                          { id: 'top-left', label: 'Top L' },
                          { id: 'top-center', label: 'Top C' },
                          { id: 'bottom-left', label: 'Bot L' },
                          { id: 'bottom-center', label: 'Bot C' },
                        ].map(pos => (
                          <button key={pos.id} onClick={() => updateSlide(slide.id, { titlePosition: pos.id })} className={`py-1 rounded-none text-[8px] font-bold border-2 transition ${(slide.titlePosition || 'top-left') === pos.id ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-400 border-slate-200'}`} data-testid={`title-pos-${pos.id}-${idx}`}>{pos.label}</button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[9px] text-slate-500 font-bold uppercase">Show Title</label>
                      <button onClick={() => updateSlide(slide.id, { titlePosition: slide.titlePosition === 'hidden' ? 'top-left' : 'hidden' })} className={`px-2 py-0.5 rounded-none text-[9px] font-bold border-2 transition ${slide.titlePosition === 'hidden' ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-emerald-50 text-emerald-600 border-emerald-300'}`} data-testid={`title-toggle-${idx}`}>{slide.titlePosition === 'hidden' ? 'Hidden' : 'Visible'}</button>
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-500 font-bold uppercase">Narration</label>
                      <textarea value={slide.narration || ''} onChange={(e) => updateSlide(slide.id, { narration: e.target.value })} rows={2} className="w-full bg-white border-2 border-slate-200 rounded-sm px-2 py-1.5 text-[10px] text-slate-900 focus:border-indigo-500 outline-none mt-0.5 resize-none" />
                    </div>
                    <div className="flex gap-2">
                      <label className="flex-1">
                        <span className="text-[9px] text-slate-500 font-bold">Duration (s)</span>
                        <input type="number" min={1} max={30} step={1} value={slide.duration || 6} onChange={(e) => updateSlide(slide.id, { duration: parseInt(e.target.value) || 6 })} className="w-full bg-white border-2 border-slate-200 rounded-sm px-2 py-1 text-xs text-slate-900 focus:border-indigo-500 outline-none" />
                      </label>
                      <label className="flex-1">
                        <span className="text-[9px] text-slate-500 font-bold">Transition</span>
                        <select value={slide.transition || 'fade'} onChange={(e) => updateSlide(slide.id, { transition: e.target.value })} className="w-full bg-white border-2 border-slate-200 rounded-sm px-2 py-1 text-xs text-slate-900 focus:border-indigo-500 outline-none">
                          {TRANSITION_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Upload Assets</h3>
              <div className="grid grid-cols-3 gap-2">
                <label className="flex flex-col items-center gap-1 p-3 rounded-md border-2 border-dashed border-slate-200 hover:border-indigo-400 cursor-pointer hover:bg-indigo-50/50 transition">
                  <Image className="w-5 h-5 text-slate-400" />
                  <span className="text-[9px] text-slate-500 font-bold">Image</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e, 'image')} />
                </label>
                <label className="flex flex-col items-center gap-1 p-3 rounded-md border-2 border-dashed border-slate-200 hover:border-indigo-400 cursor-pointer hover:bg-indigo-50/50 transition">
                  <Film className="w-5 h-5 text-slate-400" />
                  <span className="text-[9px] text-slate-500 font-bold">Video</span>
                  <input type="file" accept="video/*" className="hidden" onChange={(e) => handleUpload(e, 'video')} />
                </label>
                <label className="flex flex-col items-center gap-1 p-3 rounded-md border-2 border-dashed border-slate-200 hover:border-indigo-400 cursor-pointer hover:bg-indigo-50/50 transition">
                  <Music className="w-5 h-5 text-slate-400" />
                  <span className="text-[9px] text-slate-500 font-bold">Music</span>
                  <input type="file" accept="audio/*" className="hidden" onChange={(e) => handleUpload(e, 'music')} />
                </label>
              </div>
            </div>

            <div className="h-px bg-slate-200" />

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Slide Assets</h3>
                <button onClick={generateAllMissing} className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 px-2 py-1 rounded-sm border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition">
                  <Sparkles className="w-3 h-3" /> Gen All
                </button>
              </div>
              
              <div className="space-y-3">
                {project?.slides?.map((slide, idx) => (
                  <div key={slide.id} className={`p-3 rounded-md border-2 ${selectedSlideId === slide.id ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-200 bg-white'}`}>
                    <div className="flex gap-3">
                      <div className="w-20 h-14 rounded-sm bg-slate-100 flex-shrink-0 overflow-hidden flex items-center justify-center border border-slate-200">
                        {slide.assetUrl ? (
                          <img src={slide.assetUrl.startsWith('/api') ? `${process.env.REACT_APP_BACKEND_URL}${slide.assetUrl}` : slide.assetUrl} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <span className="text-[10px] text-slate-400">No asset</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-slate-900 mb-1">Slide {idx + 1}: {slide.title}</p>
                        <textarea
                          value={editingPrompts[slide.id] ?? slide.imagePrompt}
                          onChange={(e) => setEditingPrompts(p => ({ ...p, [slide.id]: e.target.value }))}
                          onBlur={() => { if (editingPrompts[slide.id] !== undefined) updateSlide(slide.id, { imagePrompt: editingPrompts[slide.id] }); }}
                          className="w-full text-[9px] text-slate-600 bg-slate-50 border-2 border-slate-200 rounded-sm p-1.5 resize-none h-12 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                          placeholder="Image prompt..."
                        />
                        <div className="flex gap-1.5 mt-1.5">
                          <button onClick={() => generateImage(slide)} disabled={generating[slide.id]} className="flex items-center gap-1 px-2 py-1 rounded-none text-[9px] font-bold text-white btn-sharp" style={{ background: cat?.color || '#4F46E5' }}>
                            {generating[slide.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                            {slide.assetUrl ? 'Regen' : 'Generate'}
                          </button>
                          <label className="flex items-center gap-1 px-2 py-1 rounded-none text-[9px] font-bold border-2 border-slate-200 text-slate-600 cursor-pointer hover:bg-slate-50">
                            <Upload className="w-3 h-3" /> Upload
                            <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => handleSlideUpload(e, slide.id)} />
                          </label>
                          {slide.assetUrl && (
                            <button onClick={() => updateSlide(slide.id, { assetUrl: null, assetType: 'none' })} className="px-2 py-1 rounded-none text-[9px] bg-red-50 text-red-500 border-2 border-red-200 hover:bg-red-100">
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-px bg-slate-200" />

            {suggestedAssets.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-amber-500" /> Suggested for this slide
                </h3>
                <div className="grid grid-cols-3 gap-1.5">
                  {suggestedAssets.map(asset => (
                    <button key={asset.id} onClick={() => { if (selectedSlideId) updateSlide(selectedSlideId, { assetType: asset.type, assetUrl: asset.url }); }} className="group relative rounded-sm overflow-hidden bg-slate-100 aspect-square ring-2 ring-amber-300 hover:ring-amber-500 transition" title={`${asset.prompt} (${asset.score} keyword matches)`} data-testid={`suggested-asset-${asset.id}`}>
                      <img src={asset.url?.startsWith('/api') ? `${process.env.REACT_APP_BACKEND_URL}${asset.url}` : asset.url} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <span className="text-[8px] text-white font-bold">Use</span>
                      </div>
                      <div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-sm bg-amber-500 flex items-center justify-center">
                        <Sparkles className="w-2 h-2 text-white" />
                      </div>
                    </button>
                  ))}
                </div>
                <div className="h-px bg-slate-200 mt-3" />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">My Library</h3>
                <button onClick={loadUserLibrary} className="text-[9px] text-indigo-600 hover:text-indigo-700" data-testid="refresh-library">
                  <RefreshCcw className="w-3 h-3" />
                </button>
              </div>
              <div className="flex gap-1 mb-2 flex-wrap">
                {[{ id: 'all', label: 'All' }, { id: 'image', label: 'Images' }, { id: 'voice', label: 'Voices' }, { id: 'video', label: 'Videos' }, { id: 'audio', label: 'Audio' }].map(lc => (
                  <button key={lc.id} onClick={() => setLibraryFilter(lc.id)} className={`px-2 py-0.5 rounded-none text-[9px] font-bold border-2 transition ${libraryFilter === lc.id ? 'bg-indigo-50 text-indigo-600 border-indigo-300' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`} data-testid={`editor-library-filter-${lc.id}`}>
                    {lc.label}
                  </button>
                ))}
              </div>
              {libraryLoading ? (
                <div className="py-4 text-center"><Loader2 className="w-4 h-4 animate-spin text-indigo-500 mx-auto" /></div>
              ) : userLibrary.length === 0 ? (
                <p className="text-[10px] text-slate-400 text-center py-4">No assets in library yet</p>
              ) : (
                <div className="grid grid-cols-3 gap-1.5 max-h-[200px] overflow-y-auto scrollbar-hide">
                  {userLibrary.map(asset => (
                    <button key={asset.id} onClick={() => { if (selectedSlideId && (asset.type === 'image' || asset.type === 'video')) updateSlide(selectedSlideId, { assetType: asset.type, assetUrl: asset.url }); }} className="group relative rounded-sm overflow-hidden bg-slate-100 aspect-square hover:ring-2 hover:ring-indigo-500 transition border border-slate-200" title={asset.prompt || 'No description'} data-testid={`library-item-${asset.id}`}>
                      {asset.type === 'image' || asset.type === 'video' ? (
                        <img src={asset.url?.startsWith('/api') ? `${process.env.REACT_APP_BACKEND_URL}${asset.url}` : asset.url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Mic className="w-4 h-4 text-emerald-400" /></div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <span className="text-[8px] text-white font-bold">Use</span>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5 bg-white/80 text-[7px] text-slate-500 truncate font-bold">{asset.type}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'music' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Active Music Tracks</h3>
              
              {/* Primary BGM */}
              {project?.bgmUrl && (
                <div className="p-3 rounded-md bg-indigo-50 border-2 border-indigo-200 space-y-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Music className="w-3 h-3 text-indigo-500" />
                    <span className="text-[10px] text-indigo-700 font-bold truncate flex-1">Primary: {project.bgmName || 'Custom Track'}</span>
                    <span className="text-[8px] bg-indigo-200 text-indigo-700 px-1.5 py-0.5 rounded font-bold">LOOPS</span>
                    <button onClick={() => { useProjectStore.getState().setBgmUrl(null); setProject({ ...project, bgmUrl: null, bgmName: null }); }} className="text-red-400 hover:text-red-600"><X className="w-3 h-3" /></button>
                  </div>
                  <audio controls src={project.bgmUrl.startsWith('/api/') ? `${API.replace('/api', '')}${project.bgmUrl}` : project.bgmUrl} className="w-full h-7" data-testid="bgm-audio-player" />
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-3 h-3 text-slate-400" />
                    <Slider value={[project.bgmVolume || 0.4]} max={1} step={0.05} className="flex-1" data-testid="bgm-volume-slider" onValueChange={(v) => { useProjectStore.getState().setBgmVolume(v[0]); }} />
                    <span className="text-[10px] text-slate-500 w-8 text-right">{Math.round((project.bgmVolume || 0.4) * 100)}%</span>
                  </div>
                </div>
              )}
              
              {/* Additional music tracks */}
              {(project?.musicTracks || []).map((track, idx) => (
                <div key={idx} className="p-3 rounded-md bg-emerald-50 border-2 border-emerald-200 space-y-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Music className="w-3 h-3 text-emerald-500" />
                    <span className="text-[10px] text-emerald-700 font-bold truncate flex-1">Track {idx + 2}: {track.name || 'Custom Track'}</span>
                    <span className="text-[8px] bg-emerald-200 text-emerald-700 px-1.5 py-0.5 rounded font-bold">LOOPS</span>
                    <button onClick={() => useProjectStore.getState().removeMusicTrack(idx)} className="text-red-400 hover:text-red-600"><X className="w-3 h-3" /></button>
                  </div>
                  <audio controls src={track.url.startsWith('/api/') ? `${API.replace('/api', '')}${track.url}` : track.url} className="w-full h-7" />
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-3 h-3 text-slate-400" />
                    <Slider value={[track.volume || 0.3]} max={1} step={0.05} className="flex-1" onValueChange={(v) => { useProjectStore.getState().updateMusicTrack(idx, { volume: v[0] }); }} />
                    <span className="text-[10px] text-slate-500 w-8 text-right">{Math.round((track.volume || 0.3) * 100)}%</span>
                  </div>
                </div>
              ))}
              
              {/* Upload music */}
              <label className="flex flex-col items-center gap-2 p-3 border-2 border-dashed border-slate-200 rounded-md cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition" data-testid="upload-bgm-label">
                <Upload className="w-4 h-4 text-slate-400" />
                <span className="text-[10px] text-slate-500 font-bold">{project?.bgmUrl ? 'Add Another Music Track' : 'Upload Music'}</span>
                <span className="text-[9px] text-slate-400">MP3, WAV, AAC — loops throughout video</span>
                <input type="file" accept="audio/*" className="hidden" data-testid="upload-bgm-input"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const formData = new FormData();
                    formData.append('file', file);
                    try {
                      const res = await axios.post(`${API}/upload`, formData);
                      if (res.data.success) {
                        if (!project?.bgmUrl) {
                          useProjectStore.getState().setBgmUrl(res.data.url);
                          setProject({ ...project, bgmUrl: res.data.url, bgmName: file.name });
                        } else {
                          useProjectStore.getState().addMusicTrack({ url: res.data.url, name: file.name, volume: 0.3 });
                        }
                      }
                    } catch (err) { console.error('Music upload failed:', err); }
                  }}
                />
              </label>
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Music Library <span className="text-[9px] text-slate-400 font-normal ml-1">{musicLibrary.total || 0} tracks</span></h3>
              <div className="flex flex-wrap gap-1 mb-3">
                <button onClick={() => setMusicFilter('all')} className={`px-2 py-0.5 rounded-none text-[9px] font-bold border-2 transition ${musicFilter === 'all' ? 'bg-indigo-50 text-indigo-600 border-indigo-300' : 'bg-white text-slate-400 border-slate-200'}`} data-testid="music-filter-all">All</button>
                {musicLibrary.categories?.map(c => (
                  <button key={c} onClick={() => setMusicFilter(c)} className={`px-2 py-0.5 rounded-none text-[9px] font-bold capitalize border-2 transition ${musicFilter === c ? 'bg-indigo-50 text-indigo-600 border-indigo-300' : 'bg-white text-slate-400 border-slate-200'}`} data-testid={`music-filter-${c}`}>{c}</button>
                ))}
              </div>
              <div className="space-y-1 max-h-[280px] overflow-y-auto pr-1">
                {(musicFilter === 'all' ? musicLibrary.tracks : musicLibrary.tracks?.filter(t => t.category === musicFilter))?.map(track => {
                  const isActive = project?.bgmUrl === track.url || (project?.musicTracks || []).some(t => t.url === track.url);
                  return (
                  <div key={track.id} className={`flex items-center gap-2 p-2 rounded-sm border-2 transition cursor-pointer group ${isActive ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-slate-200 hover:border-slate-300'}`} data-testid={`music-track-${track.id}`}>
                    <button onClick={() => { if (previewingTrack === track.id) { previewAudioRef.current?.pause(); setPreviewingTrack(null); } else { if (previewAudioRef.current) { previewAudioRef.current.src = `${API.replace('/api', '')}${track.url}`; previewAudioRef.current.play().catch(() => {}); } setPreviewingTrack(track.id); } }} className="w-6 h-6 rounded-sm bg-slate-100 group-hover:bg-indigo-600 flex items-center justify-center flex-shrink-0 transition">
                      {previewingTrack === track.id ? <Square className="w-2.5 h-2.5 text-slate-500 group-hover:text-white" /> : <Play className="w-2.5 h-2.5 text-slate-500 group-hover:text-white ml-0.5" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-slate-900 font-bold truncate">{track.name}</p>
                      <p className="text-[9px] text-slate-400 truncate">{track.mood} &middot; {track.duration}s</p>
                    </div>
                    <button onClick={() => {
                      if (isActive) return;
                      if (!project?.bgmUrl) {
                        useProjectStore.getState().setBgmUrl(track.url); setProject({ ...project, bgmUrl: track.url, bgmName: track.name });
                      } else {
                        useProjectStore.getState().addMusicTrack({ url: track.url, name: track.name, volume: 0.3 });
                      }
                      if (previewAudioRef.current) previewAudioRef.current.pause(); setPreviewingTrack(null);
                    }} className={`px-2 py-0.5 rounded-none text-[9px] font-bold flex-shrink-0 transition ${isActive ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100'}`}>
                      {isActive ? 'Active' : 'Add'}
                    </button>
                  </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Sound Effects <span className="text-[9px] text-slate-400 font-normal ml-1">{sfxLibrary.total || 0} sounds</span></h3>
              {selectedSlideId && project?.slides?.find(s => s.id === selectedSlideId)?.sfxUrl && (
                <div className="flex items-center gap-2 p-2 mb-2 rounded-sm bg-pink-50 border-2 border-pink-200">
                  <Volume1 className="w-3.5 h-3.5 text-pink-500" />
                  <span className="text-[10px] text-pink-700 font-bold flex-1 truncate">Slide SFX: {project.slides.find(s => s.id === selectedSlideId)?.sfxName || 'Custom'}</span>
                  <button onClick={() => updateSlide(selectedSlideId, { sfxUrl: null, sfxName: null })} className="text-[9px] text-red-500 font-bold hover:text-red-700"><X className="w-3 h-3" /></button>
                </div>
              )}
              <p className="text-[9px] text-slate-400 mb-2">Select a slide first, then click "Use" to add SFX</p>
              <div className="flex flex-wrap gap-1 mb-3">
                <button onClick={() => setSfxFilter('all')} className={`px-2 py-0.5 rounded-none text-[9px] font-bold border-2 transition ${sfxFilter === 'all' ? 'bg-pink-50 text-pink-600 border-pink-300' : 'bg-white text-slate-400 border-slate-200'}`} data-testid="sfx-filter-all">All</button>
                {sfxLibrary.categories?.map(c => (
                  <button key={c} onClick={() => setSfxFilter(c)} className={`px-2 py-0.5 rounded-none text-[9px] font-bold capitalize border-2 transition ${sfxFilter === c ? 'bg-pink-50 text-pink-600 border-pink-300' : 'bg-white text-slate-400 border-slate-200'}`} data-testid={`sfx-filter-${c}`}>{c}</button>
                ))}
              </div>
              <div className="space-y-1 max-h-[250px] overflow-y-auto pr-1">
                {(sfxFilter === 'all' ? sfxLibrary.sounds : sfxLibrary.sounds?.filter(s => s.category === sfxFilter))?.map(sfx => (
                  <div key={sfx.id} className={`flex items-center gap-2 p-2 rounded-sm border-2 transition group ${project?.slides?.find(s => s.id === selectedSlideId)?.sfxUrl === sfx.url ? 'bg-pink-50 border-pink-300' : 'bg-white border-slate-200 hover:border-slate-300'}`} data-testid={`sfx-item-${sfx.id}`}>
                    <button onClick={() => { if (previewingTrack === sfx.id) { previewAudioRef.current?.pause(); setPreviewingTrack(null); } else { if (previewAudioRef.current) { previewAudioRef.current.src = `${API.replace('/api', '')}${sfx.url}`; previewAudioRef.current.play().catch(() => {}); } setPreviewingTrack(sfx.id); } }} className="w-6 h-6 rounded-sm bg-slate-100 group-hover:bg-pink-500 flex items-center justify-center flex-shrink-0 transition">
                      {previewingTrack === sfx.id ? <Square className="w-2.5 h-2.5 text-slate-500 group-hover:text-white" /> : <Play className="w-2.5 h-2.5 text-slate-500 group-hover:text-white ml-0.5" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-slate-900 font-bold truncate">{sfx.name}</p>
                      <p className="text-[9px] text-slate-400 truncate">{sfx.description} &middot; {sfx.duration}s</p>
                    </div>
                    <button onClick={() => { if (selectedSlideId) { const currentSlide = project?.slides?.find(s => s.id === selectedSlideId); if (currentSlide?.sfxUrl === sfx.url) { updateSlide(selectedSlideId, { sfxUrl: null, sfxName: null }); } else { updateSlide(selectedSlideId, { sfxUrl: sfx.url, sfxName: sfx.name }); } } }} className={`px-2 py-0.5 rounded-none text-[9px] font-bold flex-shrink-0 transition ${project?.slides?.find(s => s.id === selectedSlideId)?.sfxUrl === sfx.url ? 'bg-pink-600 text-white' : 'bg-pink-50 text-pink-600 border border-pink-200 hover:bg-pink-100'}`} data-testid={`sfx-use-${sfx.id}`}>
                      {project?.slides?.find(s => s.id === selectedSlideId)?.sfxUrl === sfx.url ? 'Active' : 'Use'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <audio ref={previewAudioRef} onEnded={() => setPreviewingTrack(null)} className="hidden" />
          </div>
        )}

        {activeTab === 'voice' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Select Voice (for all slides)</h3>
              <select value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-200 rounded-sm px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 outline-none">
                {VOICES.map(voice => (
                  <option key={voice.id} value={voice.id}>{voice.name} - {voice.accent} ({voice.gender})</option>
                ))}
              </select>
              <p className="text-[9px] text-slate-400 mt-1">This voice will be used for all slide narrations</p>
            </div>

            <div className="h-px bg-slate-200" />

            <div className="p-4 rounded-md border-2 border-indigo-200 bg-indigo-50/50">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-bold text-slate-900">Generate All Voices</p>
                  <p className="text-[10px] text-slate-500">{voicesGenerated}/{totalSlides} slides have voice</p>
                </div>
                <button onClick={generateAllVoices} disabled={generating.allVoices} className="flex items-center gap-1 px-3 py-1.5 rounded-none text-xs font-bold text-white disabled:opacity-50 btn-sharp" style={{ background: cat?.color || '#4F46E5' }} data-testid="gen-all-voices">
                  {generating.allVoices ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Wand2 className="w-4 h-4" /> Generate All</>}
                </button>
              </div>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all" style={{ width: `${(voicesGenerated / totalSlides) * 100}%` }} />
              </div>
            </div>

            <div className="h-px bg-slate-200" />

            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Slide Narrations</h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-hide">
                {project?.slides?.map((slide, idx) => (
                  <div key={slide.id} className={`p-2.5 rounded-md border-2 ${slide.voiceUrl ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-slate-700">Slide {idx + 1}</span>
                      {slide.voiceUrl ? (
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => playAudio(slide.voiceUrl)} className="p-1 rounded-sm bg-emerald-100 text-emerald-600 hover:bg-emerald-200">
                            {playingAudio === slide.voiceUrl ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                          </button>
                          <span className="text-[9px] text-emerald-600 font-bold"><Check className="w-3 h-3 inline" /> Done</span>
                        </div>
                      ) : (
                        <span className="text-[9px] text-slate-400 font-semibold">Pending</span>
                      )}
                    </div>
                    <p className="text-[9px] text-slate-500 line-clamp-2 italic">"{slide.narration}"</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'captions' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Caption Style</h3>
            <div className="grid grid-cols-2 gap-2">
              {CAPTION_STYLES.map(style => (
                <button key={style.id} onClick={() => setActiveCaptionStyleId(style.id)} className={`p-3 rounded-md border-2 text-center transition ${activeCaptionStyleId === style.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`} data-testid={`caption-${style.id}`}>
                  <div className="w-full h-6 rounded-sm flex items-center justify-center text-[10px] font-bold" style={{ background: style.bg, color: style.text }}>{style.name}</div>
                </button>
              ))}
            </div>

            <div>
              <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-2">Display Mode</h4>
              <div className="flex gap-1">
                {['sentence', 'lines', 'words'].map(m => (
                  <button key={m} onClick={() => setCaptionMode(m)} className={`flex-1 py-1.5 rounded-none text-xs font-bold border-2 transition capitalize ${captionMode === m ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-200'}`} data-testid={`caption-mode-${m}`}>{m}</button>
                ))}
              </div>
            </div>

            <div className="h-px bg-slate-200" />

            <div>
              <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-2">Position</h4>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: 'top', label: 'Top' },
                  { id: 'center', label: 'Center' },
                  { id: 'bottom', label: 'Bottom' },
                ].map(pos => (
                  <button key={pos.id} onClick={() => setCaptionPosition(pos.id)} className={`py-1.5 rounded-none text-[10px] font-bold border-2 transition ${captionPosition === pos.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-200'}`} data-testid={`caption-pos-${pos.id}`}>{pos.label}</button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-2">Font</h4>
              <select value={captionFont} onChange={(e) => setCaptionFont(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-200 rounded-sm px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 outline-none" data-testid="caption-font-select">
                {['Liberation Sans', 'Arial', 'Georgia', 'Courier New', 'Impact', 'Verdana', 'Trebuchet MS', 'Comic Sans MS', 'Times New Roman'].map(f => (
                  <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
                ))}
              </select>
            </div>

            <div>
              <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-2">Font Size: {captionSize}px</h4>
              <Slider value={[captionSize]} min={24} max={72} step={2} className="w-full" onValueChange={(v) => setCaptionSize(v[0])} data-testid="caption-size-slider" />
              <div className="flex justify-between text-[8px] text-slate-400 mt-1"><span>24px</span><span>72px</span></div>
            </div>

            <div className="h-px bg-slate-200" />

            <div>
              <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-2">Custom Colors <span className="text-[8px] text-slate-300 font-normal">(leave empty for preset)</span></h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-[9px] text-slate-500 font-bold w-16">Text</label>
                  <input type="color" value={captionColor || '#ffffff'} onChange={(e) => setCaptionColor(e.target.value)} className="w-7 h-7 rounded-sm border-2 border-slate-200 cursor-pointer p-0.5" data-testid="caption-text-color" />
                  <input type="text" value={captionColor} onChange={(e) => setCaptionColor(e.target.value)} placeholder="Auto" className="flex-1 bg-slate-50 border-2 border-slate-200 rounded-sm px-2 py-1 text-[10px] text-slate-900 focus:border-indigo-500 outline-none" />
                  {captionColor && <button onClick={() => setCaptionColor('')} className="text-[9px] text-red-400 font-bold">Reset</button>}
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[9px] text-slate-500 font-bold w-16">Background</label>
                  <input type="color" value={captionBgColor || '#000000'} onChange={(e) => setCaptionBgColor(e.target.value)} className="w-7 h-7 rounded-sm border-2 border-slate-200 cursor-pointer p-0.5" data-testid="caption-bg-color" />
                  <input type="text" value={captionBgColor} onChange={(e) => setCaptionBgColor(e.target.value)} placeholder="Auto" className="flex-1 bg-slate-50 border-2 border-slate-200 rounded-sm px-2 py-1 text-[10px] text-slate-900 focus:border-indigo-500 outline-none" />
                  {captionBgColor && <button onClick={() => setCaptionBgColor('')} className="text-[9px] text-red-400 font-bold">Reset</button>}
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-200" />
            
            <div className="p-3 rounded-md bg-slate-50 border-2 border-slate-200">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-2">Preview</h4>
              <div className="w-full h-20 rounded-sm bg-slate-900 relative overflow-hidden flex items-center justify-center" style={{ alignItems: captionPosition === 'top' ? 'flex-start' : captionPosition === 'center' ? 'center' : 'flex-end', padding: '8px' }}>
                <div className="px-3 py-1 rounded-sm" style={{ background: captionBgColor || (CAPTION_STYLES.find(s => s.id === activeCaptionStyleId)?.bg || 'rgba(0,0,0,0.7)'), color: captionColor || (CAPTION_STYLES.find(s => s.id === activeCaptionStyleId)?.text || '#fff'), fontFamily: captionFont, fontSize: `${Math.min(captionSize * 0.35, 16)}px`, fontWeight: 700, textShadow: CAPTION_STYLES.find(s => s.id === activeCaptionStyleId)?.id === 'neon' ? '0 0 4px currentColor' : 'none' }}>
                  Sample caption text
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'graphics' && activeSlide && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Motion Graphics</h3>
            <p className="text-[10px] text-slate-500">Add animated overlays to this slide</p>
            
            {(activeSlide.graphics || []).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase">Active Graphics</h4>
                {activeSlide.graphics.map((g, gi) => (
                  <div key={gi} className="flex items-center gap-2 p-2 rounded-sm bg-indigo-50 border-2 border-indigo-200">
                    <span className="text-[10px] text-indigo-600 font-bold capitalize flex-1">{g.type?.replace('-', ' ')}</span>
                    <span className="text-[9px] text-slate-400">@{g.startTime || 0}s</span>
                    <button onClick={() => { const newGraphics = [...(activeSlide.graphics || [])]; newGraphics.splice(gi, 1); updateSlide(activeSlide.id, { graphics: newGraphics }); }} className="w-5 h-5 rounded-sm flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-100 border border-red-200" data-testid={`remove-graphic-${gi}`}>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="h-px bg-slate-200" />
            
            <h4 className="text-[10px] font-bold text-slate-500 uppercase">Add Graphic</h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                { type: 'title-card', label: 'Title Card', desc: 'Big animated title' },
                { type: 'lower-third', label: 'Lower Third', desc: 'Name & title bar' },
                { type: 'kinetic-text', label: 'Kinetic Text', desc: 'Animated words' },
                { type: 'stat-counter', label: 'Stat Counter', desc: 'Number animation' },
              ].map(opt => (
                <button key={opt.type} onClick={() => {
                  const newGraphic = {
                    type: opt.type, startTime: 0, duration: 3,
                    ...(opt.type === 'title-card' ? { title: activeSlide.title || 'Title', subtitle: '' } : {}),
                    ...(opt.type === 'lower-third' ? { name: 'Speaker Name', title: 'Title' } : {}),
                    ...(opt.type === 'kinetic-text' ? { text: activeSlide.onScreenText || activeSlide.title || 'Key Point' } : {}),
                    ...(opt.type === 'stat-counter' ? { value: '100', label: 'Metric', suffix: '%', prefix: '' } : {}),
                  };
                  updateSlide(activeSlide.id, { graphics: [...(activeSlide.graphics || []), newGraphic] });
                }} className="p-3 rounded-md border-2 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition text-left" data-testid={`add-graphic-${opt.type}`}>
                  <p className="text-[11px] text-slate-900 font-bold">{opt.label}</p>
                  <p className="text-[9px] text-slate-400">{opt.desc}</p>
                </button>
              ))}
            </div>

            {(activeSlide.graphics || []).length > 0 && (
              <div className="space-y-3">
                <div className="h-px bg-slate-200" />
                <h4 className="text-[10px] font-bold text-slate-500 uppercase">Edit Properties</h4>
                {activeSlide.graphics.map((g, gi) => (
                  <div key={gi} className="p-2 rounded-md bg-slate-50 border-2 border-slate-200 space-y-2">
                    <p className="text-[10px] text-indigo-600 font-bold capitalize">{g.type?.replace('-', ' ')} #{gi + 1}</p>
                    <div className="flex gap-2">
                      <label className="flex-1">
                        <span className="text-[9px] text-slate-400 font-bold">Start (s)</span>
                        <input type="number" min={0} step={0.5} value={g.startTime || 0} onChange={(e) => { const updated = [...activeSlide.graphics]; updated[gi] = { ...updated[gi], startTime: parseFloat(e.target.value) || 0 }; updateSlide(activeSlide.id, { graphics: updated }); }} className="w-full bg-white border-2 border-slate-200 rounded-sm px-2 py-1 text-xs text-slate-900 focus:border-indigo-500 outline-none" data-testid={`graphic-${gi}-start`} />
                      </label>
                      <label className="flex-1">
                        <span className="text-[9px] text-slate-400 font-bold">Duration (s)</span>
                        <input type="number" min={0.5} step={0.5} value={g.duration || 3} onChange={(e) => { const updated = [...activeSlide.graphics]; updated[gi] = { ...updated[gi], duration: parseFloat(e.target.value) || 3 }; updateSlide(activeSlide.id, { graphics: updated }); }} className="w-full bg-white border-2 border-slate-200 rounded-sm px-2 py-1 text-xs text-slate-900 focus:border-indigo-500 outline-none" data-testid={`graphic-${gi}-duration`} />
                      </label>
                    </div>
                    {(g.type === 'title-card' || g.type === 'kinetic-text') && (
                      <label>
                        <span className="text-[9px] text-slate-400 font-bold">{g.type === 'title-card' ? 'Title' : 'Text'}</span>
                        <input type="text" value={g.title || g.text || ''} onChange={(e) => { const updated = [...activeSlide.graphics]; const key = g.type === 'title-card' ? 'title' : 'text'; updated[gi] = { ...updated[gi], [key]: e.target.value }; updateSlide(activeSlide.id, { graphics: updated }); }} className="w-full bg-white border-2 border-slate-200 rounded-sm px-2 py-1 text-xs text-slate-900 focus:border-indigo-500 outline-none" data-testid={`graphic-${gi}-text`} />
                      </label>
                    )}
                    {g.type === 'title-card' && (
                      <label>
                        <span className="text-[9px] text-slate-400 font-bold">Subtitle</span>
                        <input type="text" value={g.subtitle || ''} onChange={(e) => { const updated = [...activeSlide.graphics]; updated[gi] = { ...updated[gi], subtitle: e.target.value }; updateSlide(activeSlide.id, { graphics: updated }); }} className="w-full bg-white border-2 border-slate-200 rounded-sm px-2 py-1 text-xs text-slate-900 focus:border-indigo-500 outline-none" data-testid={`graphic-${gi}-subtitle`} />
                      </label>
                    )}
                    {g.type === 'lower-third' && (
                      <>
                        <label>
                          <span className="text-[9px] text-slate-400 font-bold">Name</span>
                          <input type="text" value={g.name || ''} onChange={(e) => { const updated = [...activeSlide.graphics]; updated[gi] = { ...updated[gi], name: e.target.value }; updateSlide(activeSlide.id, { graphics: updated }); }} className="w-full bg-white border-2 border-slate-200 rounded-sm px-2 py-1 text-xs text-slate-900 focus:border-indigo-500 outline-none" data-testid={`graphic-${gi}-name`} />
                        </label>
                        <label>
                          <span className="text-[9px] text-slate-400 font-bold">Title</span>
                          <input type="text" value={g.title || ''} onChange={(e) => { const updated = [...activeSlide.graphics]; updated[gi] = { ...updated[gi], title: e.target.value }; updateSlide(activeSlide.id, { graphics: updated }); }} className="w-full bg-white border-2 border-slate-200 rounded-sm px-2 py-1 text-xs text-slate-900 focus:border-indigo-500 outline-none" data-testid={`graphic-${gi}-title`} />
                        </label>
                      </>
                    )}
                    {g.type === 'stat-counter' && (
                      <>
                        <div className="flex gap-2">
                          <label className="flex-1">
                            <span className="text-[9px] text-slate-400 font-bold">Value</span>
                            <input type="text" value={g.value || ''} onChange={(e) => { const updated = [...activeSlide.graphics]; updated[gi] = { ...updated[gi], value: e.target.value }; updateSlide(activeSlide.id, { graphics: updated }); }} className="w-full bg-white border-2 border-slate-200 rounded-sm px-2 py-1 text-xs text-slate-900 focus:border-indigo-500 outline-none" data-testid={`graphic-${gi}-value`} />
                          </label>
                          <label className="flex-1">
                            <span className="text-[9px] text-slate-400 font-bold">Label</span>
                            <input type="text" value={g.label || ''} onChange={(e) => { const updated = [...activeSlide.graphics]; updated[gi] = { ...updated[gi], label: e.target.value }; updateSlide(activeSlide.id, { graphics: updated }); }} className="w-full bg-white border-2 border-slate-200 rounded-sm px-2 py-1 text-xs text-slate-900 focus:border-indigo-500 outline-none" data-testid={`graphic-${gi}-label`} />
                          </label>
                        </div>
                        <div className="flex gap-2">
                          <label className="flex-1">
                            <span className="text-[9px] text-slate-400 font-bold">Prefix</span>
                            <input type="text" value={g.prefix || ''} placeholder="$" onChange={(e) => { const updated = [...activeSlide.graphics]; updated[gi] = { ...updated[gi], prefix: e.target.value }; updateSlide(activeSlide.id, { graphics: updated }); }} className="w-full bg-white border-2 border-slate-200 rounded-sm px-2 py-1 text-xs text-slate-900 focus:border-indigo-500 outline-none" />
                          </label>
                          <label className="flex-1">
                            <span className="text-[9px] text-slate-400 font-bold">Suffix</span>
                            <input type="text" value={g.suffix || ''} placeholder="%" onChange={(e) => { const updated = [...activeSlide.graphics]; updated[gi] = { ...updated[gi], suffix: e.target.value }; updateSlide(activeSlide.id, { graphics: updated }); }} className="w-full bg-white border-2 border-slate-200 rounded-sm px-2 py-1 text-xs text-slate-900 focus:border-indigo-500 outline-none" />
                          </label>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'effects' && activeSlide && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Transition</h3>
              <div className="grid grid-cols-2 gap-2">
                {TRANSITION_OPTIONS.map(trans => (
                  <button key={trans} onClick={() => updateSlide(activeSlide.id, { transition: trans })} className={`p-2.5 rounded-md border-2 text-xs font-bold capitalize transition ${activeSlide.transition === trans ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`} data-testid={`trans-${trans}`}>
                    {trans}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-slate-200" />

            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Visual Effects</h3>
              <div className="grid grid-cols-2 gap-2">
                {VFX_OPTIONS.map(vfx => (
                  <button key={vfx} onClick={() => updateSlide(activeSlide.id, { vfx })} className={`p-2.5 rounded-md border-2 text-xs font-bold capitalize transition ${activeSlide.vfx === vfx ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`} data-testid={`vfx-${vfx}`}>
                    {vfx}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-slate-200" />

            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Batch Apply</h3>
              <div className="space-y-2">
                <button onClick={() => project?.slides?.forEach(s => updateSlide(s.id, { transition: activeSlide.transition }))} className="w-full px-3 py-2 rounded-none text-[10px] font-bold border-2 border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 transition">
                  Apply transition to all slides
                </button>
                <button onClick={() => project?.slides?.forEach(s => updateSlide(s.id, { vfx: activeSlide.vfx }))} className="w-full px-3 py-2 rounded-none text-[10px] font-bold border-2 border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 transition">
                  Apply VFX to all slides
                </button>
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
    <div className="flex-1 flex flex-col bg-slate-900">
      <audio ref={audioRef} className="hidden" />
      
      {/* Preview Area - stays dark for video contrast */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="relative w-full max-w-4xl aspect-video rounded-md overflow-hidden bg-black shadow-2xl" style={{ boxShadow: `0 0 80px ${cat?.color}20` }}>
          {currentSlide?.assetUrl ? (
            currentSlide.assetType === 'video' ? (
              <video
                key={currentSlide.id}
                src={currentSlide.assetUrl.startsWith('/api') ? `${process.env.REACT_APP_BACKEND_URL}${currentSlide.assetUrl}` : currentSlide.assetUrl}
                className="w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
              />
            ) : (
              <img src={currentSlide.assetUrl.startsWith('/api') ? `${process.env.REACT_APP_BACKEND_URL}${currentSlide.assetUrl}` : currentSlide.assetUrl} className="w-full h-full object-cover" alt={currentSlide.title} />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${cat?.color}30, #0f172a)` }}>
              <div className="text-center px-8">
                <Sparkles className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                <p className="text-base font-semibold text-slate-400 mb-1">{currentSlide?.title || 'No slide selected'}</p>
                <p className="text-sm text-slate-500">Generate or upload an asset for this slide</p>
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

      {/* Playback Controls - light theme */}
      <div className="p-4 border-t border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-3">
            <p className="text-xs text-slate-400 truncate max-w-md mx-auto font-semibold">{currentSlide?.title}: {currentSlide?.narration?.slice(0, 60)}...</p>
          </div>
          
          <div className="flex items-center justify-center gap-4 mb-3">
            <button onClick={() => { setPlaying(false); goToSlide(0); }} className="p-2 rounded-sm text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition" title="Go to start">
              <SkipBack className="w-5 h-5" />
            </button>
            <button onClick={() => goToSlide(Math.max(0, currentSlideIdx - 1))} className="p-2 rounded-sm text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition" title="Previous slide">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button onClick={togglePlay} className="w-14 h-14 rounded-sm flex items-center justify-center text-white shadow-lg btn-sharp" style={{ background: cat?.color || '#4F46E5' }} data-testid="play-btn" title={playing ? 'Pause' : 'Play preview'}>
              {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 translate-x-0.5" />}
            </button>
            <button onClick={() => goToSlide(Math.min((project?.slides?.length || 1) - 1, currentSlideIdx + 1))} className="p-2 rounded-sm text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition" title="Next slide">
              <ArrowLeft className="w-5 h-5 rotate-180" />
            </button>
            <button onClick={() => { setPlaying(false); goToSlide((project?.slides?.length || 1) - 1); }} className="p-2 rounded-sm text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition" title="Go to end">
              <SkipForward className="w-5 h-5" />
            </button>
          </div>
          
          {/* Timeline thumbnails */}
          <div className="flex gap-1.5">
            {project?.slides?.map((s, i) => (
              <button key={s.id} onClick={() => { setPlaying(false); goToSlide(i); }} className={`flex-1 h-12 rounded-sm overflow-hidden border-2 transition-all ${i === currentSlideIdx ? 'border-indigo-500 scale-105' : 'border-slate-200 opacity-60 hover:opacity-100'}`} title={`Slide ${i + 1}: ${s.title}`}>
                {s.assetUrl ? (
                  <img src={s.assetUrl.startsWith('/api') ? `${process.env.REACT_APP_BACKEND_URL}${s.assetUrl}` : s.assetUrl} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                    <span className="text-[10px] text-slate-400 font-bold">{i + 1}</span>
                  </div>
                )}
              </button>
            ))}
          </div>
          
          <div className="text-center mt-2">
            <span className="text-[10px] text-slate-400 font-mono">
              {playing ? `${formatTime(globalTime)} / ${formatTime(totalDuration)}` : `Total duration: ${totalDuration}s`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function RightSidebar({ project, primaryColor, setPrimaryColor, selectedFont, setSelectedFont, selectedSlideId, updateSlide }) {
  const currentSlide = project?.slides?.find(s => s.id === selectedSlideId) || project?.slides?.[0];

  return (
    <div className="w-72 bg-white border-l border-slate-200 p-4 space-y-6">
      <div>
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Brand Kit</h3>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-slate-500 uppercase font-bold">Primary Color</label>
            <div className="flex gap-2 mt-1">
              {['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'].map(c => (
                <button key={c} onClick={() => setPrimaryColor(c)} className={`w-7 h-7 rounded-sm border-2 transition ${primaryColor === c ? 'border-slate-900 scale-110' : 'border-slate-200 hover:border-slate-400'}`} style={{ background: c }} />
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase font-bold">Font</label>
            <select value={selectedFont} onChange={e => setSelectedFont(e.target.value)} className="w-full mt-1 bg-slate-50 border-2 border-slate-200 rounded-sm px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 outline-none">
              {['Outfit', 'Inter', 'Manrope', 'Poppins', 'Roboto'].map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
        </div>
      </div>

      {currentSlide && (
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Slide Properties</h3>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-slate-500 uppercase font-bold">Title</label>
              <input type="text" value={currentSlide.title} readOnly className="w-full mt-1 bg-slate-50 border-2 border-slate-200 rounded-sm px-3 py-2 text-xs text-slate-900" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase font-bold">Duration ({currentSlide.duration}s)</label>
              <Slider value={[currentSlide.duration]} onValueChange={(val) => updateSlide(currentSlide.id, { duration: val[0] })} max={30} min={2} step={1} className="mt-2" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase font-bold">Transition</label>
              <select value={currentSlide.transition || 'fade'} onChange={(e) => updateSlide(currentSlide.id, { transition: e.target.value })} className="w-full mt-1 bg-slate-50 border-2 border-slate-200 rounded-sm px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 outline-none">
                {['fade', 'slide', 'zoom', 'none'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase font-bold">VFX Effect</label>
              <select value={currentSlide.vfx || 'none'} onChange={(e) => updateSlide(currentSlide.id, { vfx: e.target.value })} className="w-full mt-1 bg-slate-50 border-2 border-slate-200 rounded-sm px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 outline-none">
                {['none', 'cinematic', 'vhs', 'glitch', 'grayscale', 'blur'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const RENDER_PHASES = [
  { key: 'prepare', label: 'Preparing', range: [0, 10], icon: Layers },
  { key: 'voice', label: 'Generating Voices', range: [10, 40], icon: Mic },
  { key: 'bundle', label: 'Bundling', range: [40, 50], icon: Settings },
  { key: 'render', label: 'Rendering Frames', range: [50, 95], icon: Film },
  { key: 'finalize', label: 'Finalizing', range: [95, 100], icon: Check },
];

function RenderProgressPanel({ progress, step }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, []);
  
  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const currentPhase = RENDER_PHASES.find(p => progress >= p.range[0] && progress < p.range[1]) || RENDER_PHASES[RENDER_PHASES.length - 1];

  return (
    <div className="p-6" data-testid="render-progress-panel">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative w-14 h-14 flex items-center justify-center">
          <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="24" fill="none" stroke="#e2e8f0" strokeWidth="4" />
            <circle cx="28" cy="28" r="24" fill="none" stroke="url(#prog-grad)" strokeWidth="4" strokeLinecap="round"
              strokeDasharray={`${(progress / 100) * 150.8} 150.8`} className="transition-all duration-500" />
            <defs><linearGradient id="prog-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#4f46e5" /><stop offset="100%" stopColor="#ec4899" /></linearGradient></defs>
          </svg>
          <span className="absolute text-sm font-black text-slate-900">{progress}%</span>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-black text-slate-900">Rendering Video</h3>
          <p className="text-xs text-slate-400 font-mono">{formatTime(elapsed)} elapsed</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <span className="text-[10px] font-bold text-indigo-600 uppercase">Active</span>
        </div>
      </div>

      {/* Main progress bar */}
      <div className="relative w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-6">
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, #4f46e5, #8b5cf6, #ec4899)', width: `${progress}%` }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        {/* Shimmer */}
        <div className="absolute inset-0 overflow-hidden rounded-full">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
        </div>
      </div>

      {/* Current step */}
      <div className="flex items-center gap-2 mb-5 px-3 py-2 rounded-sm bg-slate-50 border border-slate-200">
        <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin flex-shrink-0" />
        <p className="text-xs text-slate-600 font-semibold truncate">{step || 'Processing...'}</p>
      </div>

      {/* Phase indicators */}
      <div className="space-y-1">
        {RENDER_PHASES.map((phase) => {
          const isActive = progress >= phase.range[0] && progress < phase.range[1];
          const isDone = progress >= phase.range[1];
          const PhaseIcon = phase.icon;
          return (
            <div key={phase.key} className={`flex items-center gap-3 px-3 py-2 rounded-sm transition-all ${isActive ? 'bg-indigo-50 border border-indigo-200' : isDone ? 'opacity-50' : 'opacity-30'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-emerald-500' : isActive ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                {isDone ? <Check className="w-3 h-3 text-white" /> : isActive ? <PhaseIcon className="w-3 h-3 text-white animate-pulse" /> : <PhaseIcon className="w-3 h-3 text-white" />}
              </div>
              <span className={`text-xs font-bold flex-1 ${isActive ? 'text-indigo-700' : isDone ? 'text-slate-500' : 'text-slate-400'}`}>{phase.label}</span>
              {isDone && <span className="text-[9px] text-emerald-600 font-bold">DONE</span>}
              {isActive && <span className="text-[9px] text-indigo-500 font-bold">IN PROGRESS</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
  const [selectedSlideId, setSelectedSlideId] = useState(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('en-US-Journey-D');
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
  }, [projectId, project, setProject]);

  useEffect(() => {
    if (project?.slides?.length && !selectedSlideId) setSelectedSlideId(project.slides[0].id);
  }, [project, selectedSlideId]);

  const [saving, setSaving] = useState(false);

  const saveProject = async () => {
    if (!project) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.post(`${API}/projects`, { title: project.title || 'Untitled Project', project: project, userId: user?.id || 'anonymous' }, { headers });
      alert('Project saved!');
    } catch (e) {
      console.error('Save error:', e);
      alert('Failed to save project: ' + (e.response?.data?.detail || e.message));
    } finally { setSaving(false); }
  };

  const generateImage = async (slide) => {
    try {
      const res = await axios.post(`${API}/generate-image`, { description: slide.imagePrompt, style: 'Cinematic', characters: project?.characters });
      if (res.data.success) updateSlide(slide.id, { assetType: 'image', assetUrl: res.data.image, assetGenerating: false });
    } catch (e) { console.error(e); }
  };

  const generateVoice = async (slide) => {
    if (!slide.narration) return;
    try {
      const res = await axios.post(`${API}/generate-voice`, { text: slide.narration, voiceId: selectedVoice });
      if (res.data.success) updateSlide(slide.id, { voiceUrl: res.data.url });
    } catch (e) { console.error(e); }
  };

  const startRender = async () => {
    if (!project || rendering) return;
    const slidesWithImages = project.slides?.filter(s => s.assetUrl) || [];
    const totalSlides = project.slides?.length || 0;
    if (totalSlides === 0) { alert('No slides to render.'); return; }
    if (slidesWithImages.length < totalSlides) { 
      const msg = slidesWithImages.length === 0 
        ? `None of your ${totalSlides} slides have images. They will use gradient placeholders. Continue rendering?`
        : `Only ${slidesWithImages.length}/${totalSlides} slides have images. Slides without images will use gradient placeholders. Continue rendering?`;
      const proceed = window.confirm(msg); 
      if (!proceed) return; 
    }
    setRendering(true); setRenderProgress(0); setRenderStatus('starting'); setRenderStep('Initializing...'); setShowExportModal(true);
    try {
      const res = await axios.post(`${API}/render`, { projectId: projectId || 'new', slides: project.slides, title: project.title, duration: project.duration || totalSlides * 6, generateVoice: true, voiceId: selectedVoice, captionStyleId: activeCaptionStyleId || null, captionMode: captionMode || 'words', captionFont: captionFont || null, captionColor: captionColor || null, captionBgColor: captionBgColor || null, captionPosition: captionPosition || 'bottom', captionSize: captionSize || 44, bgmUrl: project.bgmUrl || null, bgmVolume: project.bgmVolume || 0.4, musicTracks: project.musicTracks || [] });
      if (res.data.success) {
        const jobId = res.data.jobId;
        setRenderStatus('processing');
        let pollCount = 0;
        const maxPolls = 150; // 5 minutes at 2s intervals
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
          } catch (e) { 
            console.error('Poll error:', e); 
            // Don't fail on transient network errors
          }
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
      case 'generate_image': { const slide = slides.find(s => s.id === action.slideId); if (slide) generateImage(slide); break; }
      case 'generate_all_images': slides.forEach(s => { if (!s.assetUrl) generateImage(s); }); break;
      case 'generate_voice': { const slide = slides.find(s => s.id === action.slideId); if (slide) generateVoice(slide); break; }
      case 'generate_all_voices': slides.forEach(s => { if (!s.voiceUrl) generateVoice(s); }); break;
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
                  <p className="text-sm text-slate-500 mb-6">Your video has been rendered successfully with voice narration.</p>
                  <div className="flex gap-3 justify-center">
                    <button onClick={() => setShowExportModal(false)} className="px-5 py-2.5 rounded-none border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition">Close</button>
                    <a href={`${process.env.REACT_APP_BACKEND_URL}${renderUrl}`} download={`${project?.title || 'video'}.mp4`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-none bg-emerald-600 text-white font-bold text-sm btn-sharp hover:bg-emerald-700 transition" data-testid="download-video-btn">
                      <Download className="w-4 h-4" /> Download MP4
                    </a>
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
