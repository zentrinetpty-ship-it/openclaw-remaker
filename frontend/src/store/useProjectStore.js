import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const CATEGORIES = [
  { id: 'news', label: 'Trending News', color: '#EF4444', badge: 'HOT', placeholder: 'Enter a news topic or headline...', tone: 'documentary' },
  { id: 'explainer', label: 'Explainer Video', color: '#3B82F6', badge: 'POPULAR', placeholder: 'What concept do you want to explain?', tone: 'professional' },
  { id: 'cartoon', label: 'Cartoon Animation', color: '#F97316', placeholder: 'Describe your cartoon story or characters...', tone: 'humorous' },
  { id: 'ebook', label: 'Ebook Summary', color: '#10B981', placeholder: 'Which book would you like summarized?', tone: 'storytelling' },
  { id: 'biography', label: 'Biography', color: '#8B5CF6', placeholder: 'Whose life story should we tell?', tone: 'documentary' },
  { id: 'tutorial', label: 'Tutorial', color: '#06B6D4', placeholder: 'What skill or process to teach?', tone: 'professional' },
  { id: 'datastory', label: 'Data Story', color: '#6366F1', placeholder: 'What data or trend to visualize?', tone: 'professional' },
  { id: 'youtube', label: 'YouTube Analysis', color: '#DC2626', badge: 'NEW', placeholder: 'Paste YouTube URL or describe content...', tone: 'professional' },
  { id: 'motiongraphic', label: 'Motion Graphics', color: '#EC4899', badge: 'PRO', placeholder: 'Describe your motion graphic concept...', tone: 'energetic' },
  { id: 'remaker', label: 'Video Remaker', color: '#84CC16', badge: 'NEW', placeholder: 'Upload a video to reimagine...', tone: 'professional' },
  { id: 'history', label: 'History Deep Dive', color: '#F59E0B', badge: 'NEW', placeholder: 'Which historical event or era?', tone: 'documentary' },
  { id: 'prayer', label: 'Prayer & Devotion', color: '#EAB308', placeholder: 'What is your prayer or devotion focus?', tone: 'bold' },
  { id: 'reporter', label: 'News Reporter', color: '#64748B', placeholder: 'Write the story for the anchor to report...', tone: 'professional' },
  { id: 'horror', label: 'Horror Stories', color: '#991B1B', badge: 'NEW', placeholder: 'Describe a creepy tale or urban legend...', tone: 'storytelling' },
  { id: 'scifi', label: 'Sci-Fi & Futurism', color: '#0EA5E9', badge: 'NEW', placeholder: 'Describe a sci-fi concept or future scenario...', tone: 'documentary' },
  { id: 'travel', label: 'Travel & Culture', color: '#14B8A6', badge: 'NEW', placeholder: 'Which destination or culture to explore?', tone: 'storytelling' },
  { id: 'motivation', label: 'Motivational', color: '#D946EF', badge: 'HOT', placeholder: 'What motivational message or life lesson?', tone: 'bold' },
  { id: 'crime', label: 'True Crime', color: '#78350F', badge: 'NEW', placeholder: 'Which crime case or mystery to cover?', tone: 'documentary' },
  { id: 'comedy', label: 'Comedy Sketch', color: '#FB923C', placeholder: 'Describe a funny scenario or sketch idea...', tone: 'humorous' },
  { id: 'recipe', label: 'Recipe & Food', color: '#16A34A', badge: 'NEW', placeholder: 'Which recipe or food story to create?', tone: 'soft' },
  { id: 'fitness', label: 'Fitness & Health', color: '#E11D48', badge: 'NEW', placeholder: 'What workout, wellness tip, or health topic?', tone: 'energetic' },
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
