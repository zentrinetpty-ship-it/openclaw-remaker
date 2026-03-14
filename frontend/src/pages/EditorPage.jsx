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

function LeftSidebar({ activeTab, setActiveTab, project, updateSlide, videoCategory, primaryColor, selectedSlideId, setSelectedSlideId }) {
  const cat = CATEGORIES.find(c => c.id === videoCategory);
  const { setProject } = useProjectStore();
  const { activeCaptionStyleId, setActiveCaptionStyleId, captionMode, setCaptionMode } = useCaptionStore();
  const [generating, setGenerating] = useState({});
  const [selectedVoice, setSelectedVoice] = useState('en-US-Journey-D');
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

  // Load user's asset library
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

  // AI Asset Suggestions - keyword match from slide prompt against library
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
    setGenerating(g => ({ ...g, allVoices: true }));
    for (const slide of project?.slides || []) {
      if (slide.narration) {
        await generateVoice(slide);
      }
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
      if (res.data.success) {
        setUploadedAssets(prev => [...prev, { type, url: res.data.url, name: file.name }]);
      }
    } catch (err) {
      console.error('Upload failed:', err);
    }
  };

  const handleSlideUpload = async (e, slideId) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const type = file.type.startsWith('video/') ? 'video' : 'image';
    
    // Upload to server for proper URL
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post(`${API}/upload`, formData);
      if (res.data.success) {
        updateSlide(slideId, { assetType: type, assetUrl: res.data.url });
      }
    } catch (err) {
      console.error('Upload failed:', err);
      // Fallback to blob URL for preview only (won't work in render)
      updateSlide(slideId, { assetType: type, assetUrl: URL.createObjectURL(file) });
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

  const voicesGenerated = project?.slides?.filter(s => s.voiceUrl).length || 0;
  const totalSlides = project?.slides?.length || 0;

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

        {activeTab === 'assets' && (
          <div className="space-y-4">
            {/* Upload Section */}
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Upload Assets</h3>
              <div className="grid grid-cols-3 gap-2">
                <label className="flex flex-col items-center gap-1 p-3 rounded-xl border border-dashed border-slate-700 hover:border-violet-500 cursor-pointer">
                  <Image className="w-5 h-5 text-slate-500" />
                  <span className="text-[9px] text-slate-500">Image</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e, 'image')} />
                </label>
                <label className="flex flex-col items-center gap-1 p-3 rounded-xl border border-dashed border-slate-700 hover:border-violet-500 cursor-pointer">
                  <Film className="w-5 h-5 text-slate-500" />
                  <span className="text-[9px] text-slate-500">Video</span>
                  <input type="file" accept="video/*" className="hidden" onChange={(e) => handleUpload(e, 'video')} />
                </label>
                <label className="flex flex-col items-center gap-1 p-3 rounded-xl border border-dashed border-slate-700 hover:border-violet-500 cursor-pointer">
                  <Music className="w-5 h-5 text-slate-500" />
                  <span className="text-[9px] text-slate-500">Music</span>
                  <input type="file" accept="audio/*" className="hidden" onChange={(e) => handleUpload(e, 'music')} />
                </label>
              </div>
            </div>

            <div className="h-px bg-slate-800" />

            {/* All Slides Assets */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Slide Assets</h3>
                <Button variant="outline" size="sm" onClick={generateAllMissing} className="text-[10px] h-7">
                  <Sparkles className="w-3 h-3 mr-1" /> Gen All
                </Button>
              </div>
              
              <div className="space-y-3">
                {project?.slides?.map((slide, idx) => (
                  <div key={slide.id} className={`p-3 rounded-xl border ${selectedSlideId === slide.id ? 'border-violet-500 bg-violet-500/5' : 'border-slate-700 bg-slate-800/30'}`}>
                    <div className="flex gap-3">
                      {/* Thumbnail */}
                      <div className="w-20 h-14 rounded-lg bg-slate-900 flex-shrink-0 overflow-hidden flex items-center justify-center">
                        {slide.assetUrl ? (
                          <img src={slide.assetUrl.startsWith('/api') ? `${process.env.REACT_APP_BACKEND_URL}${slide.assetUrl}` : slide.assetUrl} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <span className="text-[10px] text-slate-600">No asset</span>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold text-white mb-1">Slide {idx + 1}: {slide.title}</p>
                        
                        {/* Editable Prompt */}
                        <textarea
                          value={editingPrompts[slide.id] ?? slide.imagePrompt}
                          onChange={(e) => setEditingPrompts(p => ({ ...p, [slide.id]: e.target.value }))}
                          onBlur={() => {
                            if (editingPrompts[slide.id] !== undefined) {
                              updateSlide(slide.id, { imagePrompt: editingPrompts[slide.id] });
                            }
                          }}
                          className="w-full text-[9px] text-slate-400 bg-slate-900/50 border border-slate-700 rounded p-1.5 resize-none h-12"
                          placeholder="Image prompt..."
                        />
                        
                        {/* Actions */}
                        <div className="flex gap-1.5 mt-1.5">
                          <button
                            onClick={() => generateImage(slide)}
                            disabled={generating[slide.id]}
                            className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-semibold text-white"
                            style={{ background: `linear-gradient(135deg, ${cat?.color}, #EC4899)` }}
                          >
                            {generating[slide.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                            {slide.assetUrl ? 'Regen' : 'Generate'}
                          </button>
                          <label className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-semibold bg-slate-700 text-slate-300 cursor-pointer">
                            <Upload className="w-3 h-3" /> Upload
                            <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => handleSlideUpload(e, slide.id)} />
                          </label>
                          {slide.assetUrl && (
                            <button onClick={() => updateSlide(slide.id, { assetUrl: null, assetType: 'none' })} className="px-2 py-1 rounded text-[9px] bg-red-500/20 text-red-400">
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

            <div className="h-px bg-slate-800" />

            {/* AI Suggested Assets */}
            {suggestedAssets.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-amber-400" /> Suggested for this slide
                </h3>
                <div className="grid grid-cols-3 gap-1.5">
                  {suggestedAssets.map(asset => (
                    <button
                      key={asset.id}
                      onClick={() => {
                        if (selectedSlideId) updateSlide(selectedSlideId, { assetType: asset.type, assetUrl: asset.url });
                      }}
                      className="group relative rounded-lg overflow-hidden bg-slate-800 aspect-square ring-2 ring-amber-500/30 hover:ring-amber-400 transition"
                      title={`${asset.prompt} (${asset.score} keyword matches)`}
                      data-testid={`suggested-asset-${asset.id}`}
                    >
                      <img
                        src={asset.url?.startsWith('/api') ? `${process.env.REACT_APP_BACKEND_URL}${asset.url}` : asset.url}
                        alt="" className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <span className="text-[8px] text-white font-bold">Use</span>
                      </div>
                      <div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-amber-500/80 flex items-center justify-center">
                        <Sparkles className="w-2 h-2 text-white" />
                      </div>
                    </button>
                  ))}
                </div>
                <div className="h-px bg-slate-800 mt-3" />
              </div>
            )}

            {/* My Library */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">My Library</h3>
                <button onClick={loadUserLibrary} className="text-[9px] text-violet-400 hover:text-violet-300" data-testid="refresh-library">
                  <RefreshCcw className="w-3 h-3" />
                </button>
              </div>
              
              {/* Category filters */}
              <div className="flex gap-1 mb-2 flex-wrap">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'image', label: 'Images' },
                  { id: 'voice', label: 'Voices' },
                  { id: 'video', label: 'Videos' },
                  { id: 'audio', label: 'Audio' },
                ].map(lc => (
                  <button
                    key={lc.id}
                    onClick={() => setLibraryFilter(lc.id)}
                    className={`px-2 py-0.5 rounded text-[9px] font-semibold transition ${
                      libraryFilter === lc.id ? 'bg-violet-500/20 text-violet-300' : 'bg-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                    data-testid={`editor-library-filter-${lc.id}`}
                  >
                    {lc.label}
                  </button>
                ))}
              </div>

              {libraryLoading ? (
                <div className="py-4 text-center">
                  <Loader2 className="w-4 h-4 animate-spin text-violet-400 mx-auto" />
                </div>
              ) : userLibrary.length === 0 ? (
                <p className="text-[10px] text-slate-600 text-center py-4">No assets in library yet</p>
              ) : (
                <div className="grid grid-cols-3 gap-1.5 max-h-[200px] overflow-y-auto scrollbar-hide">
                  {userLibrary.map(asset => (
                    <button
                      key={asset.id}
                      onClick={() => {
                        if (selectedSlideId && (asset.type === 'image' || asset.type === 'video')) {
                          updateSlide(selectedSlideId, { assetType: asset.type, assetUrl: asset.url });
                        }
                      }}
                      className="group relative rounded-lg overflow-hidden bg-slate-800 aspect-square hover:ring-2 hover:ring-violet-500 transition"
                      title={asset.prompt || 'No description'}
                      data-testid={`library-item-${asset.id}`}
                    >
                      {asset.type === 'image' || asset.type === 'video' ? (
                        <img
                          src={asset.url?.startsWith('/api') ? `${process.env.REACT_APP_BACKEND_URL}${asset.url}` : asset.url}
                          alt="" className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Mic className="w-4 h-4 text-emerald-400" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <span className="text-[8px] text-white font-bold">Use</span>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5 bg-black/60 text-[7px] text-slate-400 truncate">
                        {asset.type}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'music' && (
          <div className="space-y-4">
            {/* Current BGM */}
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Background Music</h3>
              {project?.bgmUrl ? (
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Music className="w-3 h-3 text-violet-400" />
                    <span className="text-[10px] text-violet-300 font-medium truncate">{project.bgmName || 'Custom Track'}</span>
                  </div>
                  <audio controls src={project.bgmUrl.startsWith('/api/') ? `${API.replace('/api', '')}${project.bgmUrl}` : project.bgmUrl} className="w-full h-8" data-testid="bgm-audio-player" />
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-3 h-3 text-slate-500" />
                    <Slider 
                      defaultValue={[project.bgmVolume || 0.4]} 
                      max={1} step={0.1} className="flex-1"
                      data-testid="bgm-volume-slider"
                      onValueChange={(v) => { useProjectStore.getState().setBgmVolume(v[0]); }}
                    />
                    <span className="text-[10px] text-slate-400 w-8 text-right">{Math.round((project.bgmVolume || 0.4) * 100)}%</span>
                  </div>
                  <button 
                    onClick={() => { useProjectStore.getState().setBgmUrl(null); setProject({ ...project, bgmUrl: null, bgmName: null }); }}
                    className="w-full px-2 py-1.5 rounded-lg text-[10px] bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition"
                    data-testid="remove-bgm-btn"
                  >
                    <X className="w-3 h-3 inline mr-1" /> Remove Music
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-slate-700 rounded-xl cursor-pointer hover:border-violet-500/50 hover:bg-violet-500/5 transition" data-testid="upload-bgm-label">
                  <Upload className="w-5 h-5 text-slate-500" />
                  <span className="text-[10px] text-slate-400">Upload Your Own Music</span>
                  <span className="text-[9px] text-slate-600">MP3, WAV, AAC</span>
                  <input type="file" accept="audio/*" className="hidden" data-testid="upload-bgm-input"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append('file', file);
                      try {
                        const res = await axios.post(`${API}/upload`, formData);
                        if (res.data.success) { useProjectStore.getState().setBgmUrl(res.data.url); setProject({ ...project, bgmUrl: res.data.url, bgmName: file.name }); }
                      } catch (err) { console.error('Music upload failed:', err); }
                    }}
                  />
                </label>
              )}
            </div>

            {/* Music Library */}
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Music Library <span className="text-[9px] text-slate-500 font-normal ml-1">{musicLibrary.total || 0} tracks</span></h3>
              <div className="flex flex-wrap gap-1 mb-3">
                <button onClick={() => setMusicFilter('all')} className={`px-2 py-0.5 rounded-full text-[9px] font-medium transition ${musicFilter === 'all' ? 'bg-violet-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`} data-testid="music-filter-all">All</button>
                {musicLibrary.categories?.map(c => (
                  <button key={c} onClick={() => setMusicFilter(c)} className={`px-2 py-0.5 rounded-full text-[9px] font-medium capitalize transition ${musicFilter === c ? 'bg-violet-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`} data-testid={`music-filter-${c}`}>{c}</button>
                ))}
              </div>
              <div className="space-y-1 max-h-[280px] overflow-y-auto pr-1">
                {(musicFilter === 'all' ? musicLibrary.tracks : musicLibrary.tracks?.filter(t => t.category === musicFilter))?.map(track => (
                  <div key={track.id} className={`flex items-center gap-2 p-2 rounded-lg border transition cursor-pointer group ${project?.bgmUrl === track.url ? 'bg-violet-500/15 border-violet-500/40' : 'bg-slate-800/30 border-slate-800 hover:border-slate-600'}`} data-testid={`music-track-${track.id}`}>
                    <button 
                      onClick={() => {
                        if (previewingTrack === track.id) { previewAudioRef.current?.pause(); setPreviewingTrack(null); }
                        else { if (previewAudioRef.current) { previewAudioRef.current.src = `${API.replace('/api', '')}${track.url}`; previewAudioRef.current.play().catch(() => {}); } setPreviewingTrack(track.id); }
                      }}
                      className="w-6 h-6 rounded-full bg-slate-700 group-hover:bg-violet-500 flex items-center justify-center flex-shrink-0 transition"
                    >
                      {previewingTrack === track.id ? <Square className="w-2.5 h-2.5 text-white" /> : <Play className="w-2.5 h-2.5 text-white ml-0.5" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-white font-medium truncate">{track.name}</p>
                      <p className="text-[9px] text-slate-500 truncate">{track.mood} &middot; {track.duration}s</p>
                    </div>
                    <button 
                      onClick={() => { useProjectStore.getState().setBgmUrl(track.url); setProject({ ...project, bgmUrl: track.url, bgmName: track.name }); if (previewAudioRef.current) previewAudioRef.current.pause(); setPreviewingTrack(null); }}
                      className={`px-2 py-0.5 rounded text-[9px] flex-shrink-0 transition ${project?.bgmUrl === track.url ? 'bg-violet-500 text-white' : 'bg-violet-500/20 text-violet-300 hover:bg-violet-500/40'}`}
                    >
                      {project?.bgmUrl === track.url ? 'Active' : 'Use'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* SFX Library */}
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Sound Effects <span className="text-[9px] text-slate-500 font-normal ml-1">{sfxLibrary.total || 0} sounds</span></h3>
              <div className="flex flex-wrap gap-1 mb-3">
                <button onClick={() => setSfxFilter('all')} className={`px-2 py-0.5 rounded-full text-[9px] font-medium transition ${sfxFilter === 'all' ? 'bg-pink-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`} data-testid="sfx-filter-all">All</button>
                {sfxLibrary.categories?.map(c => (
                  <button key={c} onClick={() => setSfxFilter(c)} className={`px-2 py-0.5 rounded-full text-[9px] font-medium capitalize transition ${sfxFilter === c ? 'bg-pink-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`} data-testid={`sfx-filter-${c}`}>{c}</button>
                ))}
              </div>
              <div className="space-y-1 max-h-[250px] overflow-y-auto pr-1">
                {(sfxFilter === 'all' ? sfxLibrary.sounds : sfxLibrary.sounds?.filter(s => s.category === sfxFilter))?.map(sfx => (
                  <div key={sfx.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/30 border border-slate-800 hover:border-slate-600 transition group" data-testid={`sfx-item-${sfx.id}`}>
                    <button 
                      onClick={() => {
                        if (previewingTrack === sfx.id) { previewAudioRef.current?.pause(); setPreviewingTrack(null); }
                        else { if (previewAudioRef.current) { previewAudioRef.current.src = `${API.replace('/api', '')}${sfx.url}`; previewAudioRef.current.play().catch(() => {}); } setPreviewingTrack(sfx.id); }
                      }}
                      className="w-6 h-6 rounded-full bg-slate-700 group-hover:bg-pink-500 flex items-center justify-center flex-shrink-0 transition"
                    >
                      {previewingTrack === sfx.id ? <Square className="w-2.5 h-2.5 text-white" /> : <Play className="w-2.5 h-2.5 text-white ml-0.5" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-white font-medium truncate">{sfx.name}</p>
                      <p className="text-[9px] text-slate-500 truncate">{sfx.description} &middot; {sfx.duration}s</p>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[8px] bg-slate-700 text-slate-400 capitalize flex-shrink-0">{sfx.category}</span>
                  </div>
                ))}
              </div>
            </div>

            <audio ref={previewAudioRef} onEnded={() => setPreviewingTrack(null)} className="hidden" />
          </div>
        )}

        {activeTab === 'voice' && (
          <div className="space-y-4">
            {/* Voice Selection - Single Voice for All */}
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Select Voice (for all slides)</h3>
              <select 
                value={selectedVoice} 
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white"
              >
                {VOICES.map(voice => (
                  <option key={voice.id} value={voice.id}>
                    {voice.name} - {voice.accent} ({voice.gender})
                  </option>
                ))}
              </select>
              <p className="text-[9px] text-slate-500 mt-1">This voice will be used for all slide narrations</p>
            </div>

            <div className="h-px bg-slate-800" />

            {/* Generate All Button */}
            <div className="p-4 rounded-xl border border-violet-500/30 bg-violet-500/5">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-white">Generate All Voices</p>
                  <p className="text-[10px] text-slate-400">{voicesGenerated}/{totalSlides} slides have voice</p>
                </div>
                <Button 
                  onClick={generateAllVoices}
                  disabled={generating.allVoices}
                  size="sm"
                  style={{ background: `linear-gradient(135deg, ${cat?.color}, #EC4899)` }}
                  data-testid="gen-all-voices"
                >
                  {generating.allVoices ? (
                    <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Generating...</>
                  ) : (
                    <><Wand2 className="w-4 h-4 mr-1" /> Generate All</>
                  )}
                </Button>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-violet-500 to-emerald-500 rounded-full" style={{ width: `${(voicesGenerated / totalSlides) * 100}%` }} />
              </div>
            </div>

            <div className="h-px bg-slate-800" />

            {/* Slide Voice Status */}
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Slide Narrations</h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-hide">
                {project?.slides?.map((slide, idx) => (
                  <div key={slide.id} className={`p-2.5 rounded-xl border ${slide.voiceUrl ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-700 bg-slate-800/30'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-semibold text-slate-300">Slide {idx + 1}</span>
                      {slide.voiceUrl ? (
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => playAudio(slide.voiceUrl)} className="p-1 rounded bg-emerald-500/20 text-emerald-400">
                            {playingAudio === slide.voiceUrl ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                          </button>
                          <span className="text-[9px] text-emerald-400"><Check className="w-3 h-3 inline" /> Done</span>
                        </div>
                      ) : (
                        <span className="text-[9px] text-slate-500">Pending</span>
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

        {activeTab === 'graphics' && activeSlide && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Motion Graphics</h3>
            <p className="text-[10px] text-slate-500">Add animated overlays to this slide</p>
            
            {/* Current graphics on this slide */}
            {(activeSlide.graphics || []).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[10px] font-semibold text-slate-400 uppercase">Active Graphics</h4>
                {activeSlide.graphics.map((g, gi) => (
                  <div key={gi} className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50 border border-slate-700">
                    <span className="text-[10px] text-violet-400 font-semibold capitalize flex-1">{g.type?.replace('-', ' ')}</span>
                    <span className="text-[9px] text-slate-500">@{g.startTime || 0}s</span>
                    <button onClick={() => {
                      const newGraphics = [...(activeSlide.graphics || [])];
                      newGraphics.splice(gi, 1);
                      updateSlide(activeSlide.id, { graphics: newGraphics });
                    }} className="w-5 h-5 rounded flex items-center justify-center bg-red-500/20 text-red-400 hover:bg-red-500/40" data-testid={`remove-graphic-${gi}`}>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="h-px bg-slate-800" />
            
            {/* Add Graphics */}
            <h4 className="text-[10px] font-semibold text-slate-400 uppercase">Add Graphic</h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                { type: 'title-card', label: 'Title Card', desc: 'Big animated title' },
                { type: 'lower-third', label: 'Lower Third', desc: 'Name & title bar' },
                { type: 'kinetic-text', label: 'Kinetic Text', desc: 'Animated words' },
                { type: 'stat-counter', label: 'Stat Counter', desc: 'Number animation' },
              ].map(opt => (
                <button
                  key={opt.type}
                  onClick={() => {
                    const newGraphic = {
                      type: opt.type,
                      startTime: 0,
                      duration: 3,
                      ...(opt.type === 'title-card' ? { title: activeSlide.title || 'Title', subtitle: '' } : {}),
                      ...(opt.type === 'lower-third' ? { name: 'Speaker Name', title: 'Title' } : {}),
                      ...(opt.type === 'kinetic-text' ? { text: activeSlide.onScreenText || activeSlide.title || 'Key Point' } : {}),
                      ...(opt.type === 'stat-counter' ? { value: '100', label: 'Metric', suffix: '%', prefix: '' } : {}),
                    };
                    updateSlide(activeSlide.id, { graphics: [...(activeSlide.graphics || []), newGraphic] });
                  }}
                  className="p-3 rounded-xl border border-slate-700 hover:border-violet-500 hover:bg-violet-500/5 transition text-left"
                  data-testid={`add-graphic-${opt.type}`}
                >
                  <p className="text-[11px] text-white font-semibold">{opt.label}</p>
                  <p className="text-[9px] text-slate-500">{opt.desc}</p>
                </button>
              ))}
            </div>

            {/* Edit selected graphic properties */}
            {(activeSlide.graphics || []).length > 0 && (
              <div className="space-y-3">
                <div className="h-px bg-slate-800" />
                <h4 className="text-[10px] font-semibold text-slate-400 uppercase">Edit Properties</h4>
                {activeSlide.graphics.map((g, gi) => (
                  <div key={gi} className="p-2 rounded-lg bg-slate-800/30 border border-slate-800 space-y-2">
                    <p className="text-[10px] text-violet-400 font-bold capitalize">{g.type?.replace('-', ' ')} #{gi + 1}</p>
                    
                    {/* Common: startTime + duration */}
                    <div className="flex gap-2">
                      <label className="flex-1">
                        <span className="text-[9px] text-slate-500">Start (s)</span>
                        <input type="number" min={0} step={0.5} value={g.startTime || 0}
                          onChange={(e) => {
                            const updated = [...activeSlide.graphics];
                            updated[gi] = { ...updated[gi], startTime: parseFloat(e.target.value) || 0 };
                            updateSlide(activeSlide.id, { graphics: updated });
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white" data-testid={`graphic-${gi}-start`}
                        />
                      </label>
                      <label className="flex-1">
                        <span className="text-[9px] text-slate-500">Duration (s)</span>
                        <input type="number" min={0.5} step={0.5} value={g.duration || 3}
                          onChange={(e) => {
                            const updated = [...activeSlide.graphics];
                            updated[gi] = { ...updated[gi], duration: parseFloat(e.target.value) || 3 };
                            updateSlide(activeSlide.id, { graphics: updated });
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white" data-testid={`graphic-${gi}-duration`}
                        />
                      </label>
                    </div>

                    {/* Type-specific fields */}
                    {(g.type === 'title-card' || g.type === 'kinetic-text') && (
                      <label>
                        <span className="text-[9px] text-slate-500">{g.type === 'title-card' ? 'Title' : 'Text'}</span>
                        <input type="text" value={g.title || g.text || ''}
                          onChange={(e) => {
                            const updated = [...activeSlide.graphics];
                            const key = g.type === 'title-card' ? 'title' : 'text';
                            updated[gi] = { ...updated[gi], [key]: e.target.value };
                            updateSlide(activeSlide.id, { graphics: updated });
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white" data-testid={`graphic-${gi}-text`}
                        />
                      </label>
                    )}
                    {g.type === 'title-card' && (
                      <label>
                        <span className="text-[9px] text-slate-500">Subtitle</span>
                        <input type="text" value={g.subtitle || ''}
                          onChange={(e) => {
                            const updated = [...activeSlide.graphics];
                            updated[gi] = { ...updated[gi], subtitle: e.target.value };
                            updateSlide(activeSlide.id, { graphics: updated });
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white" data-testid={`graphic-${gi}-subtitle`}
                        />
                      </label>
                    )}
                    {g.type === 'lower-third' && (
                      <>
                        <label>
                          <span className="text-[9px] text-slate-500">Name</span>
                          <input type="text" value={g.name || ''}
                            onChange={(e) => {
                              const updated = [...activeSlide.graphics];
                              updated[gi] = { ...updated[gi], name: e.target.value };
                              updateSlide(activeSlide.id, { graphics: updated });
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white" data-testid={`graphic-${gi}-name`}
                          />
                        </label>
                        <label>
                          <span className="text-[9px] text-slate-500">Title</span>
                          <input type="text" value={g.title || ''}
                            onChange={(e) => {
                              const updated = [...activeSlide.graphics];
                              updated[gi] = { ...updated[gi], title: e.target.value };
                              updateSlide(activeSlide.id, { graphics: updated });
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white" data-testid={`graphic-${gi}-title`}
                          />
                        </label>
                      </>
                    )}
                    {g.type === 'stat-counter' && (
                      <>
                        <div className="flex gap-2">
                          <label className="flex-1">
                            <span className="text-[9px] text-slate-500">Value</span>
                            <input type="text" value={g.value || ''}
                              onChange={(e) => {
                                const updated = [...activeSlide.graphics];
                                updated[gi] = { ...updated[gi], value: e.target.value };
                                updateSlide(activeSlide.id, { graphics: updated });
                              }}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white" data-testid={`graphic-${gi}-value`}
                            />
                          </label>
                          <label className="flex-1">
                            <span className="text-[9px] text-slate-500">Label</span>
                            <input type="text" value={g.label || ''}
                              onChange={(e) => {
                                const updated = [...activeSlide.graphics];
                                updated[gi] = { ...updated[gi], label: e.target.value };
                                updateSlide(activeSlide.id, { graphics: updated });
                              }}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white" data-testid={`graphic-${gi}-label`}
                            />
                          </label>
                        </div>
                        <div className="flex gap-2">
                          <label className="flex-1">
                            <span className="text-[9px] text-slate-500">Prefix</span>
                            <input type="text" value={g.prefix || ''} placeholder="$"
                              onChange={(e) => {
                                const updated = [...activeSlide.graphics];
                                updated[gi] = { ...updated[gi], prefix: e.target.value };
                                updateSlide(activeSlide.id, { graphics: updated });
                              }}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                            />
                          </label>
                          <label className="flex-1">
                            <span className="text-[9px] text-slate-500">Suffix</span>
                            <input type="text" value={g.suffix || ''} placeholder="%"
                              onChange={(e) => {
                                const updated = [...activeSlide.graphics];
                                updated[gi] = { ...updated[gi], suffix: e.target.value };
                                updateSlide(activeSlide.id, { graphics: updated });
                              }}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                            />
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
  const { activeCaptionStyleId } = useCaptionStore();
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [globalTime, setGlobalTime] = useState(0);
  const audioRef = React.useRef(null);
  const playIntervalRef = React.useRef(null);
  
  const currentSlideIdx = project?.slides?.findIndex(s => s.id === selectedSlideId) ?? 0;
  const currentSlide = project?.slides?.[currentSlideIdx];
  const totalDuration = project?.slides?.reduce((sum, s) => sum + (s.duration || 6), 0) || 0;

  const goToSlide = (idx) => {
    if (project?.slides?.[idx]) {
      setSelectedSlideId(project.slides[idx].id);
    }
  };

  const getSlideTimeOffset = (idx) => {
    let offset = 0;
    for (let i = 0; i < idx; i++) {
      offset += project?.slides?.[i]?.duration || 6;
    }
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

  // Auto-play through all slides continuously
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
          if (nextIdx < project.slides.length) {
            goToSlide(nextIdx);
            elapsed = 0;
          } else {
            setPlaying(false);
            goToSlide(0);
            setProgress(0);
            setGlobalTime(0);
          }
        }
      }, 100);
      
      return () => {
        if (playIntervalRef.current) clearInterval(playIntervalRef.current);
        if (audioRef.current) audioRef.current.pause();
      };
    } else {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
      if (audioRef.current) audioRef.current.pause();
    }
  }, [playing, currentSlideIdx, currentSlide]);

  React.useEffect(() => {
    setProgress(0);
  }, [selectedSlideId]);

  const togglePlay = () => {
    if (!playing) {
      setProgress(0);
      setGlobalTime(getSlideTimeOffset(currentSlideIdx));
    }
    setPlaying(!playing);
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  const captionCss = getCaptionStyle();

  return (
    <div className="flex-1 flex flex-col bg-[#050a14]">
      <audio ref={audioRef} className="hidden" />
      
      {/* Preview Area */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="relative w-full max-w-4xl aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl" style={{ boxShadow: `0 0 80px ${cat?.color}20` }}>
          {currentSlide?.assetUrl ? (
            <img 
              src={currentSlide.assetUrl.startsWith('/api') ? `${process.env.REACT_APP_BACKEND_URL}${currentSlide.assetUrl}` : currentSlide.assetUrl} 
              className="w-full h-full object-cover" 
              alt={currentSlide.title} 
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${cat?.color}30, #0f172a)` }}>
              <div className="text-center px-8">
                <Sparkles className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                <p className="text-base font-semibold text-slate-400 mb-1">{currentSlide?.title || 'No slide selected'}</p>
                <p className="text-sm text-slate-500">Generate or upload an asset for this slide</p>
              </div>
            </div>
          )}
          
          {/* Slide title overlay */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur">
              <span className="text-xs font-semibold text-white">Slide {currentSlideIdx + 1}/{project?.slides?.length || 0}</span>
              {currentSlide?.voiceUrl && <Mic className="w-3 h-3 text-emerald-400" />}
            </div>
            <div className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur">
              <span className="text-xs text-slate-300">{currentSlide?.duration || 6}s</span>
            </div>
          </div>
          
          {/* Caption overlay - shows with selected caption style */}
          {currentSlide?.narration && activeCaptionStyleId && (playing || true) && (
            <div className="absolute bottom-14 left-4 right-4 flex justify-center">
              <div style={captionCss} className="max-w-[80%]">
                <p className="text-sm text-center leading-relaxed">{currentSlide.narration}</p>
              </div>
            </div>
          )}
          
          {/* On-screen text overlay */}
          {currentSlide?.onScreenText && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-2 rounded-xl bg-black/80 backdrop-blur">
              <p className="text-lg font-bold text-white text-center">{currentSlide.onScreenText}</p>
            </div>
          )}
          
          {/* Progress bar - global video progress */}
          {playing && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
              <div 
                className="h-full bg-gradient-to-r from-violet-500 to-pink-500 transition-all duration-100" 
                style={{ width: `${(globalTime / totalDuration) * 100}%` }} 
              />
            </div>
          )}
        </div>
      </div>

      {/* Playback Controls */}
      <div className="p-4 border-t border-slate-800 bg-[#0a0f1a]">
        <div className="max-w-4xl mx-auto">
          {/* Current slide info */}
          <div className="text-center mb-3">
            <p className="text-xs text-slate-500 truncate max-w-md mx-auto">
              {currentSlide?.title}: {currentSlide?.narration?.slice(0, 60)}...
            </p>
          </div>
          
          {/* Controls */}
          <div className="flex items-center justify-center gap-4 mb-3">
            <button 
              onClick={() => { setPlaying(false); goToSlide(0); }} 
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              title="Go to start"
            >
              <SkipBack className="w-5 h-5" />
            </button>
            <button 
              onClick={() => goToSlide(Math.max(0, currentSlideIdx - 1))} 
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              title="Previous slide"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={togglePlay} 
              className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg" 
              style={{ background: `linear-gradient(135deg, ${cat?.color}, #EC4899)` }} 
              data-testid="play-btn"
              title={playing ? 'Pause' : 'Play preview'}
            >
              {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 translate-x-0.5" />}
            </button>
            <button 
              onClick={() => goToSlide(Math.min((project?.slides?.length || 1) - 1, currentSlideIdx + 1))} 
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              title="Next slide"
            >
              <ArrowLeft className="w-5 h-5 rotate-180" />
            </button>
            <button 
              onClick={() => { setPlaying(false); goToSlide((project?.slides?.length || 1) - 1); }} 
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              title="Go to end"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>
          
          {/* Timeline with slide thumbnails */}
          <div className="flex gap-1.5">
            {project?.slides?.map((s, i) => (
              <button 
                key={s.id} 
                onClick={() => { setPlaying(false); goToSlide(i); }} 
                className={`flex-1 h-12 rounded-lg overflow-hidden border-2 transition-all ${i === currentSlideIdx ? 'border-violet-500 scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`}
                title={`Slide ${i + 1}: ${s.title}`}
              >
                {s.assetUrl ? (
                  <img 
                    src={s.assetUrl.startsWith('/api') ? `${process.env.REACT_APP_BACKEND_URL}${s.assetUrl}` : s.assetUrl} 
                    className="w-full h-full object-cover" 
                    alt="" 
                  />
                ) : (
                  <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                    <span className="text-[10px] text-slate-500">{i + 1}</span>
                  </div>
                )}
              </button>
            ))}
          </div>
          
          {/* Total duration with time counter */}
          <div className="text-center mt-2">
            <span className="text-[10px] text-slate-600">
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
  const { activeCaptionStyleId } = useCaptionStore();
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

  const [saving, setSaving] = useState(false);

  const saveProject = async () => {
    if (!project) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.post(`${API}/projects`, {
        title: project.title || 'Untitled Project',
        project: project,
        userId: user?.id || 'anonymous'
      }, { headers });
      alert('Project saved!');
    } catch (e) {
      console.error('Save error:', e);
      alert('Failed to save project: ' + (e.response?.data?.detail || e.message));
    } finally {
      setSaving(false);
    }
  };

  const startRender = async () => {
    if (!project || rendering) return;
    
    // Check how many slides have images
    const slidesWithImages = project.slides?.filter(s => s.assetUrl) || [];
    const totalSlides = project.slides?.length || 0;
    
    if (slidesWithImages.length === 0) {
      alert(`None of your ${totalSlides} slides have images. Please generate or upload images in the Assets tab first.`);
      return;
    }
    
    if (slidesWithImages.length < totalSlides) {
      const proceed = window.confirm(`Only ${slidesWithImages.length}/${totalSlides} slides have images. Slides without images will use a dark placeholder. Continue rendering?`);
      if (!proceed) return;
    }
    
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
        voiceId: project.voiceId || 'en-US-Journey-D',
        captionStyleId: activeCaptionStyleId || null,
        captionMode: captionMode || 'words',
        bgmUrl: project.bgmUrl || null,
        bgmVolume: project.bgmVolume || 0.4
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

  // Chat action handler
  const handleChatAction = (action) => {
    if (!action || !project) return;
    const slides = project.slides || [];
    
    switch (action.type) {
      case 'update_slide': {
        const slide = slides.find(s => s.id === action.slideId);
        if (slide && action.updates) updateSlide(slide.id, action.updates);
        break;
      }
      case 'delete_slide': {
        const newSlides = slides.filter(s => s.id !== action.slideId);
        if (newSlides.length > 0) setProject({ ...project, slides: newSlides });
        break;
      }
      case 'add_graphic': {
        const slide = slides.find(s => s.id === action.slideId);
        if (slide && action.graphic) {
          updateSlide(slide.id, { graphics: [...(slide.graphics || []), action.graphic] });
        }
        break;
      }
      case 'remove_graphics': {
        const slide = slides.find(s => s.id === action.slideId);
        if (slide) updateSlide(slide.id, { graphics: [] });
        break;
      }
      case 'set_caption_style':
        if (action.styleId) setActiveCaptionStyleId(action.styleId);
        break;
      case 'set_caption_mode':
        if (action.mode) setCaptionMode(action.mode);
        break;
      case 'generate_image': {
        const slide = slides.find(s => s.id === action.slideId);
        if (slide) generateImage(slide);
        break;
      }
      case 'generate_all_images':
        slides.forEach(s => { if (!s.assetUrl) generateImage(s); });
        break;
      case 'generate_voice': {
        const slide = slides.find(s => s.id === action.slideId);
        if (slide) generateVoice(slide);
        break;
      }
      case 'generate_all_voices':
        slides.forEach(s => { if (!s.voiceUrl) generateVoice(s); });
        break;
      case 'open_tab':
        if (action.tabId) setActiveTab(action.tabId);
        break;
      case 'batch_update':
        if (action.updates) slides.forEach(s => updateSlide(s.id, action.updates));
        break;
      case 'info':
        break;
      default:
        break;
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
          <Button variant="outline" size="sm" onClick={saveProject} disabled={saving} data-testid="save-btn">
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />} {saving ? 'Saving...' : 'Save'}
          </Button>
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

      {/* AI Chat Box */}
      <EditorChatBox project={project} updateSlide={updateSlide} onAction={handleChatAction} />
    </div>
  );
}
