import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const CATEGORIES = [
  { id: 'news', label: 'Trending News', color: '#EF4444', badge: 'HOT', placeholder: 'Enter a news topic...', tone: 'documentary' },
  { id: 'explainer', label: 'Explainer Video', color: '#3B82F6', badge: 'POPULAR', placeholder: 'What do you want to explain?', tone: 'professional' },
  { id: 'cartoon', label: 'Cartoon Animation', color: '#F97316', placeholder: 'Describe the cartoon story...', tone: 'humorous' },
  { id: 'ebook', label: 'Ebook Summary', color: '#10B981', placeholder: 'Which book to summarize?', tone: 'storytelling' },
  { id: 'biography', label: 'Biography', color: '#8B5CF6', placeholder: 'Who is this biography about?', tone: 'documentary' },
  { id: 'tutorial', label: 'Tutorial', color: '#06B6D4', placeholder: 'What do you want to teach?', tone: 'professional' },
  { id: 'datastory', label: 'Data Story', color: '#6366F1', placeholder: 'What data story to tell?', tone: 'professional' },
  { id: 'youtube', label: 'YouTube Analysis', color: '#DC2626', badge: 'NEW', placeholder: 'Paste YouTube URL...', tone: 'professional' },
  { id: 'motiongraphic', label: 'Motion Graphics', color: '#EC4899', badge: 'PRO', placeholder: 'Describe your motion graphic...', tone: 'energetic' },
  { id: 'remaker', label: 'Video Remaker', color: '#84CC16', badge: 'NEW', placeholder: 'Upload a video to remake...', tone: 'professional' },
  { id: 'history', label: 'History Deep Dive', color: '#F59E0B', badge: 'NEW', placeholder: 'What historical topic?', tone: 'documentary' },
  { id: 'prayer', label: 'Prayer & Devotion', color: '#EAB308', badge: 'NEW', placeholder: 'What is your prayer focus?', tone: 'bold' },
  { id: 'reporter', label: 'News Reporter', color: '#64748B', badge: 'NEW', placeholder: 'Write the story for the reporter...', tone: 'professional' },
];

export const useProjectStore = create(persist((set, get) => ({
  rawInput: '',
  inputType: 'idea',
  videoDuration: 30,
  videoTone: 'professional',
  videoCategory: 'explainer',
  videoCountry: null,
  prayerStyle: null,
  slideCount: 5,
  assetType: 'image',
  preferredVisualStyle: 'Cinematic',
  videoProvider: 'gemini',
  musicPrompt: null,
  step: 'landing',
  project: null,
  error: null,
  playheadPosition: 0,
  
  setRawInput: (v) => set({ rawInput: v }),
  setInputType: (v) => set({ inputType: v }),
  setVideoDuration: (v) => set({ videoDuration: v }),
  setVideoTone: (v) => set({ videoTone: v }),
  setVideoCategory: (v) => set({ videoCategory: v }),
  setVideoCountry: (v) => set({ videoCountry: v }),
  setPrayerStyle: (v) => set({ prayerStyle: v }),
  setSlideCount: (v) => set({ slideCount: v }),
  setAssetType: (v) => set({ assetType: v }),
  setPreferredVisualStyle: (v) => set({ preferredVisualStyle: v }),
  setMusicPrompt: (v) => set({ musicPrompt: v }),
  setStep: (v) => set({ step: v }),
  setProject: (v) => set({ project: v }),
  setError: (v) => set({ error: v }),
  setPlayheadPosition: (v) => set({ playheadPosition: v }),
  
  setBgmUrl: (url) => set((s) => ({ project: s.project ? { ...s.project, bgmUrl: url } : null })),
  setBgmVolume: (v) => set((s) => ({ project: s.project ? { ...s.project, bgmVolume: v } : null })),
  setVoiceId: (v) => set((s) => ({ project: s.project ? { ...s.project, voiceId: v } : null })),
  
  updateSlide: (id, updates) => set((s) => ({
    project: s.project ? {
      ...s.project,
      slides: s.project.slides.map((sl) => sl.id === id ? { ...sl, ...updates } : sl)
    } : null
  })),
  
  reset: () => set({
    rawInput: '', videoDuration: 30, videoTone: 'professional', videoCategory: 'explainer',
    slideCount: 5, assetType: 'image', step: 'landing', project: null, error: null
  }),
}), { name: 'explaina-pro-storage' }));

export const useBrandKitStore = create((set) => ({
  primaryColor: '#7c3aed',
  setPrimaryColor: (c) => set({ primaryColor: c }),
  selectedFont: 'Outfit',
  setSelectedFont: (f) => set({ selectedFont: f }),
}));

export const useCaptionStore = create(persist((set) => ({
  activeCaptionStyleId: 'bold-pop',
  setActiveCaptionStyleId: (id) => set({ activeCaptionStyleId: id }),
  captionMode: 'lines',
  setCaptionMode: (m) => set({ captionMode: m }),
  captionFont: 'Liberation Sans',
  setCaptionFont: (f) => set({ captionFont: f }),
  captionColor: '',
  setCaptionColor: (c) => set({ captionColor: c }),
  captionBgColor: '',
  setCaptionBgColor: (c) => set({ captionBgColor: c }),
  captionPosition: 'bottom',
  setCaptionPosition: (p) => set({ captionPosition: p }),
  captionSize: 44,
  setCaptionSize: (s) => set({ captionSize: s }),
}), { name: 'explaina-caption-storage' }));
