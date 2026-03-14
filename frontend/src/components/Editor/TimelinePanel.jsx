import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Layers, ChevronUp, ChevronDown, ZoomIn, ZoomOut, Play, Pause, 
  Image, Mic, Type, Music, Volume2, Sparkles, Loader2, Lock, Unlock,
  GripHorizontal, SkipBack, Maximize2, Minimize2
} from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const LAYER_COLORS = {
  video: { bg: 'bg-indigo-500', border: 'border-indigo-600', light: 'bg-indigo-100', text: 'text-indigo-700' },
  voice: { bg: 'bg-emerald-500', border: 'border-emerald-600', light: 'bg-emerald-100', text: 'text-emerald-700' },
  caption: { bg: 'bg-amber-500', border: 'border-amber-600', light: 'bg-amber-100', text: 'text-amber-700' },
  music: { bg: 'bg-pink-500', border: 'border-pink-600', light: 'bg-pink-100', text: 'text-pink-700' },
  sfx: { bg: 'bg-cyan-500', border: 'border-cyan-600', light: 'bg-cyan-100', text: 'text-cyan-700' },
};

const LAYER_ICONS = {
  video: Image,
  voice: Mic,
  caption: Type,
  music: Music,
  sfx: Volume2,
};

function TimelineBlock({ layer, block, totalDuration, zoom, onResize, onDragEnd }) {
  const blockRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const colors = LAYER_COLORS[layer];

  const leftPct = (block.startTime / totalDuration) * 100;
  const widthPct = (block.duration / totalDuration) * 100;

  const handleResizeStart = (e, side) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    const rect = blockRef.current.parentElement.getBoundingClientRect();
    setDragStart({ x: e.clientX, side, rect, origStart: block.startTime, origDuration: block.duration });
  };

  useEffect(() => {
    if (!isResizing || !dragStart) return;
    const handleMove = (e) => {
      const dx = e.clientX - dragStart.x;
      const dxTime = (dx / dragStart.rect.width) * totalDuration;
      if (dragStart.side === 'right') {
        const newDur = Math.max(0.5, dragStart.origDuration + dxTime);
        onResize(block.id, block.startTime, newDur);
      } else {
        const newStart = Math.max(0, dragStart.origStart + dxTime);
        const newDur = Math.max(0.5, dragStart.origDuration - dxTime);
        onResize(block.id, newStart, newDur);
      }
    };
    const handleUp = () => setIsResizing(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
  }, [isResizing, dragStart]);

  return (
    <div
      ref={blockRef}
      className={`absolute top-1 bottom-1 rounded-sm ${colors.bg} opacity-90 hover:opacity-100 transition-opacity cursor-grab group flex items-center overflow-hidden select-none`}
      style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 0.5)}%` }}
      title={`${block.label} (${block.startTime.toFixed(1)}s - ${(block.startTime + block.duration).toFixed(1)}s)`}
    >
      {/* Left resize handle */}
      <div
        onMouseDown={(e) => handleResizeStart(e, 'left')}
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-white/30 z-10"
      />
      {/* Content */}
      <div className="flex-1 px-1.5 flex items-center gap-1 min-w-0">
        <span className="text-[8px] text-white font-bold truncate">{block.label}</span>
      </div>
      {/* Waveform-like decoration for audio layers */}
      {(layer === 'voice' || layer === 'music' || layer === 'sfx') && (
        <div className="absolute inset-0 flex items-center justify-center gap-[1px] opacity-30 pointer-events-none px-2">
          {Array.from({ length: Math.min(40, Math.floor(widthPct * 2)) }).map((_, i) => (
            <div key={i} className="w-[1px] bg-white rounded-full" style={{ height: `${20 + Math.sin(i * 0.8) * 40 + Math.random() * 20}%` }} />
          ))}
        </div>
      )}
      {/* Right resize handle */}
      <div
        onMouseDown={(e) => handleResizeStart(e, 'right')}
        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-white/30 z-10"
      />
    </div>
  );
}

export default function TimelinePanel({ 
  project, updateSlide, selectedSlideId, setSelectedSlideId,
  isOpen, onToggle, onAutoSync
}) {
  const [zoom, setZoom] = useState(1);
  const [playheadTime, setPlayheadTime] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [lockedLayers, setLockedLayers] = useState({});
  const timelineRef = useRef(null);
  const playheadDragging = useRef(false);

  const slides = project?.slides || [];
  const totalDuration = slides.reduce((sum, s) => sum + (s.duration || 5), 0) || 1;
  const bgmDuration = project?.bgmDuration || 0;
  const effectiveDuration = Math.max(totalDuration, bgmDuration);

  // Build timeline blocks from slide data
  const buildBlocks = useCallback(() => {
    const blocks = { video: [], voice: [], caption: [], music: [], sfx: [] };
    let timeOffset = 0;

    slides.forEach((slide, idx) => {
      const dur = slide.duration || 5;
      // Video/Image layer
      blocks.video.push({
        id: `vid-${slide.id}`,
        slideId: slide.id,
        label: `${idx + 1}. ${slide.title || 'Slide'}`,
        startTime: timeOffset,
        duration: dur,
        hasAsset: !!slide.assetUrl,
      });
      // Voice layer
      if (slide.voiceUrl || slide.narration) {
        blocks.voice.push({
          id: `vox-${slide.id}`,
          slideId: slide.id,
          label: slide.voiceUrl ? `Voice ${idx + 1}` : `(no audio) ${idx + 1}`,
          startTime: timeOffset,
          duration: slide.voiceDuration || dur,
          hasAudio: !!slide.voiceUrl,
        });
      }
      // Caption layer
      if (slide.narration) {
        blocks.caption.push({
          id: `cap-${slide.id}`,
          slideId: slide.id,
          label: slide.narration?.slice(0, 30) || `Caption ${idx + 1}`,
          startTime: timeOffset,
          duration: slide.voiceDuration || dur,
        });
      }
      // SFX layer
      if (slide.sfxUrl) {
        blocks.sfx.push({
          id: `sfx-${slide.id}`,
          slideId: slide.id,
          label: `SFX ${idx + 1}`,
          startTime: timeOffset,
          duration: 1.0,
        });
      }
      timeOffset += dur;
    });

    // Music layer - spans full duration
    if (project?.bgmUrl) {
      blocks.music.push({
        id: 'bgm-main',
        label: project.bgmName || 'Background Music',
        startTime: 0,
        duration: effectiveDuration,
      });
    }

    return blocks;
  }, [slides, project?.bgmUrl, project?.bgmName, effectiveDuration]);

  const [blocks, setBlocks] = useState(buildBlocks);
  useEffect(() => { setBlocks(buildBlocks()); }, [buildBlocks]);

  const handleBlockResize = (layer, blockId, newStart, newDur) => {
    if (lockedLayers[layer]) return;
    
    // For video blocks, update the slide duration
    if (layer === 'video') {
      const block = blocks.video.find(b => b.id === blockId);
      if (block) {
        updateSlide(block.slideId, { duration: Math.round(newDur * 10) / 10 });
      }
    }
    // For voice/caption, update the relative timing stored in slide
    if (layer === 'voice' || layer === 'caption') {
      setBlocks(prev => ({
        ...prev,
        [layer]: prev[layer].map(b => b.id === blockId ? { ...b, startTime: newStart, duration: newDur } : b)
      }));
    }
  };

  const handleAutoSync = async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncResult(null);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.post(`${API}/editor/auto-sync`, {
        slides: slides.map(s => ({
          id: s.id, narration: s.narration, voiceUrl: s.voiceUrl,
          assetUrl: s.assetUrl, duration: s.duration,
        })),
        voiceId: project?.voiceId || 'en-US-Journey-D',
        bgmUrl: project?.bgmUrl || null,
        bgmVolume: project?.bgmVolume || 0.4,
        generateMissingVoices: true,
        bufferPerSlide: 0.5,
      }, { headers });

      if (res.data.success) {
        const { syncedSlides, summary } = res.data;
        // Apply synced timing to project
        syncedSlides.forEach(ss => {
          const updates = { duration: ss.optimalDuration };
          if (ss.voiceUrl && !slides.find(s => s.id === ss.id)?.voiceUrl) {
            updates.voiceUrl = ss.voiceUrl;
          }
          if (ss.voiceDuration > 0) {
            updates.voiceDuration = ss.voiceDuration;
          }
          updateSlide(ss.id, updates);
        });
        setSyncResult(res.data);
        if (onAutoSync) onAutoSync(res.data);
      }
    } catch (e) {
      console.error('Auto-sync failed:', e);
      setSyncResult({ error: e.response?.data?.detail || e.message });
    }
    setSyncing(false);
  };

  // Playhead position handling
  const handleTimelineClick = (e) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    const time = pct * effectiveDuration;
    setPlayheadTime(Math.max(0, Math.min(time, effectiveDuration)));

    // Select the slide at this time
    let t = 0;
    for (const slide of slides) {
      t += slide.duration || 5;
      if (time < t) {
        setSelectedSlideId(slide.id);
        break;
      }
    }
  };

  // Time markers
  const getTimeMarkers = () => {
    const markers = [];
    const step = effectiveDuration <= 30 ? 2 : effectiveDuration <= 60 ? 5 : 10;
    for (let t = 0; t <= effectiveDuration; t += step) {
      markers.push(t);
    }
    return markers;
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const toggleLock = (layer) => {
    setLockedLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  };

  const panelHeight = expanded ? 'h-72' : 'h-48';
  const layers = ['video', 'voice', 'caption', 'music', 'sfx'];

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className={`border-t-2 border-slate-200 bg-white flex flex-col ${panelHeight} select-none`}
      data-testid="timeline-panel"
    >
      {/* Timeline Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100 bg-slate-50/80 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-[10px] font-bold text-slate-900 uppercase tracking-wider">Timeline</span>
          </div>
          <span className="text-[9px] text-slate-400 font-mono">{formatTime(effectiveDuration)} total</span>
          
          {/* Auto Sync Button */}
          <button
            onClick={handleAutoSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1 rounded-none text-[10px] font-bold text-white bg-gradient-to-r from-indigo-600 to-pink-500 hover:from-indigo-700 hover:to-pink-600 disabled:opacity-50 transition btn-sharp"
            data-testid="auto-sync-btn"
          >
            {syncing ? (
              <><Loader2 className="w-3 h-3 animate-spin" /> Syncing...</>
            ) : (
              <><Sparkles className="w-3 h-3" /> Auto Sync</>
            )}
          </button>

          {syncResult && !syncResult.error && (
            <span className="text-[9px] text-emerald-600 font-bold">
              Synced {syncResult.summary?.slidesWithVoice}/{syncResult.summary?.totalSlides} voices, {syncResult.voicesGenerated} generated
            </span>
          )}
          {syncResult?.error && (
            <span className="text-[9px] text-red-500 font-bold">Sync failed: {syncResult.error}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-sm px-1 py-0.5 border border-slate-200">
            <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="p-0.5 text-slate-400 hover:text-slate-600" data-testid="timeline-zoom-out">
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="text-[9px] text-slate-500 font-mono w-8 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(4, z + 0.25))} className="p-0.5 text-slate-400 hover:text-slate-600" data-testid="timeline-zoom-in">
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>
          
          <button onClick={() => setExpanded(!expanded)} className="p-1 text-slate-400 hover:text-slate-600" data-testid="timeline-expand">
            {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button onClick={onToggle} className="p-1 text-slate-400 hover:text-slate-600" data-testid="timeline-close">
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Timeline Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Layer Labels */}
        <div className="w-24 flex-shrink-0 border-r border-slate-200 bg-slate-50/50">
          {/* Time ruler header */}
          <div className="h-5 border-b border-slate-100 flex items-center justify-center">
            <span className="text-[8px] text-slate-400 font-bold">LAYERS</span>
          </div>
          {layers.map(layer => {
            const Icon = LAYER_ICONS[layer];
            const colors = LAYER_COLORS[layer];
            const hasContent = (blocks[layer] || []).length > 0;
            return (
              <div key={layer} className={`h-7 flex items-center px-2 gap-1.5 border-b border-slate-100 ${hasContent ? '' : 'opacity-40'}`}>
                <button onClick={() => toggleLock(layer)} className="flex-shrink-0">
                  {lockedLayers[layer] ? <Lock className="w-2.5 h-2.5 text-red-400" /> : <Unlock className="w-2.5 h-2.5 text-slate-300" />}
                </button>
                <div className={`w-3 h-3 rounded-sm ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-2 h-2 text-white" />
                </div>
                <span className={`text-[9px] font-bold capitalize truncate ${colors.text}`}>{layer}</span>
              </div>
            );
          })}
        </div>

        {/* Timeline Tracks */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden" ref={timelineRef} onClick={handleTimelineClick}>
          <div style={{ width: `${100 * zoom}%`, minWidth: '100%' }} className="h-full relative">
            {/* Time ruler */}
            <div className="h-5 border-b border-slate-100 relative">
              {getTimeMarkers().map(t => (
                <div key={t} className="absolute top-0 bottom-0 flex flex-col items-center" style={{ left: `${(t / effectiveDuration) * 100}%` }}>
                  <div className="h-full w-px bg-slate-200" />
                  <span className="text-[7px] text-slate-400 font-mono absolute top-0.5">{formatTime(t)}</span>
                </div>
              ))}
            </div>

            {/* Track rows */}
            {layers.map(layer => (
              <div key={layer} className="h-7 relative border-b border-slate-100 bg-white hover:bg-slate-50/50">
                {/* Grid lines */}
                {getTimeMarkers().map(t => (
                  <div key={t} className="absolute top-0 bottom-0 w-px bg-slate-100" style={{ left: `${(t / effectiveDuration) * 100}%` }} />
                ))}
                {/* Blocks */}
                {(blocks[layer] || []).map(block => (
                  <TimelineBlock
                    key={block.id}
                    layer={layer}
                    block={block}
                    totalDuration={effectiveDuration}
                    zoom={zoom}
                    onResize={(blockId, newStart, newDur) => handleBlockResize(layer, blockId, newStart, newDur)}
                  />
                ))}
              </div>
            ))}

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 cursor-col-resize"
              style={{ left: `${(playheadTime / effectiveDuration) * 100}%` }}
            >
              <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-red-500 rounded-sm rotate-45" />
            </div>

            {/* Selected slide highlight */}
            {selectedSlideId && (() => {
              let offset = 0;
              const slide = slides.find(s => {
                if (s.id === selectedSlideId) return true;
                offset += s.duration || 5;
                return false;
              });
              if (!slide) return null;
              const leftPct = (offset / effectiveDuration) * 100;
              const widthPct = ((slide.duration || 5) / effectiveDuration) * 100;
              return (
                <div
                  className="absolute top-5 bottom-0 border-l-2 border-r-2 border-indigo-400/30 bg-indigo-500/5 pointer-events-none z-10"
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                />
              );
            })()}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
