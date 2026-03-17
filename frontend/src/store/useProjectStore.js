import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const CATEGORIES = [
  { id: 'news', label: 'Trending News', color: '#EF4444', badge: 'HOT', placeholder: 'Enter a news topic or headline...', tone: 'documentary', desc: 'Breaking stories with broadcast-quality visuals', group: 'News & Journalism' },
  { id: 'reporter', label: 'News Reporter', color: '#64748B', placeholder: 'Write the story for the anchor to report...', tone: 'professional', desc: 'Professional anchor-style news packages', group: 'News & Journalism' },
  { id: 'explainer', label: 'Explainer Video', color: '#3B82F6', badge: 'POPULAR', placeholder: 'What concept do you want to explain?', tone: 'professional', desc: 'Kurzgesagt-style breakdowns of complex topics', group: 'Education & Knowledge' },
  { id: 'tutorial', label: 'Tutorial', color: '#06B6D4', placeholder: 'What skill or process to teach?', tone: 'professional', desc: 'Step-by-step skill teaching with clear visuals', group: 'Education & Knowledge' },
  { id: 'datastory', label: 'Data Story', color: '#6366F1', placeholder: 'What data or trend to visualize?', tone: 'professional', desc: 'Turn statistics into jaw-dropping visual stories', group: 'Education & Knowledge' },
  { id: 'ebook', label: 'Ebook Summary', color: '#10B981', placeholder: 'Which book would you like summarized?', tone: 'storytelling', desc: 'Distill bestselling books into visual summaries', group: 'Education & Knowledge' },
  { id: 'cartoon', label: 'Cartoon Animation', color: '#F97316', placeholder: 'Describe your cartoon story or characters...', tone: 'humorous', desc: 'Pixar-level animated stories with heart', group: 'Creative & Entertainment' },
  { id: 'motiongraphic', label: 'Motion Graphics', color: '#EC4899', badge: 'PRO', placeholder: 'Describe your motion graphic concept...', tone: 'energetic', desc: 'Apple keynote-quality kinetic design', group: 'Creative & Entertainment' },
  { id: 'comedy', label: 'Comedy Sketch', color: '#FB923C', placeholder: 'Describe a funny scenario or sketch idea...', tone: 'humorous', desc: 'Tight comedy with perfect punchline timing', group: 'Creative & Entertainment' },
  { id: 'youtube', label: 'YouTube Analysis', color: '#DC2626', badge: 'NEW', placeholder: 'Paste YouTube URL or describe content...', tone: 'professional', desc: 'Analyze and repurpose YouTube content', group: 'Creative & Entertainment' },
  { id: 'remaker', label: 'Video Remaker', color: '#84CC16', badge: 'NEW', placeholder: 'Upload a video to reimagine...', tone: 'professional', desc: 'Reimagine existing videos with AI enhancement', group: 'Creative & Entertainment' },
  { id: 'biography', label: 'Biography', color: '#8B5CF6', placeholder: 'Whose life story should we tell?', tone: 'documentary', desc: 'Cinematic life stories with dramatic arcs', group: 'Stories & Documentaries' },
  { id: 'history', label: 'History Deep Dive', color: '#F59E0B', badge: 'NEW', placeholder: 'Which historical event or era?', tone: 'documentary', desc: 'Bring history alive with immersive narration', group: 'Stories & Documentaries' },
  { id: 'crime', label: 'True Crime', color: '#78350F', badge: 'NEW', placeholder: 'Which crime case or mystery to cover?', tone: 'documentary', desc: 'Serial-style investigations with forensic detail', group: 'Stories & Documentaries' },
  { id: 'horror', label: 'Horror Stories', color: '#991B1B', badge: 'NEW', placeholder: 'Describe a creepy tale or urban legend...', tone: 'storytelling', desc: 'Atmospheric dread and spine-chilling tales', group: 'Stories & Documentaries' },
  { id: 'scifi', label: 'Sci-Fi & Futurism', color: '#0EA5E9', badge: 'NEW', placeholder: 'Describe a sci-fi concept or future scenario...', tone: 'documentary', desc: 'Mind-expanding visions of technology and space', group: 'Lifestyle & Inspiration' },
  { id: 'travel', label: 'Travel & Culture', color: '#14B8A6', badge: 'NEW', placeholder: 'Which destination or culture to explore?', tone: 'storytelling', desc: 'Feel the world through sounds, flavors, and stories', group: 'Lifestyle & Inspiration' },
  { id: 'motivation', label: 'Motivational', color: '#D946EF', badge: 'HOT', placeholder: 'What motivational message or life lesson?', tone: 'bold', desc: 'Powerful words that hit like a freight train', group: 'Lifestyle & Inspiration' },
  { id: 'prayer', label: 'Prayer & Devotion', color: '#EAB308', placeholder: 'What is your prayer or devotion focus?', tone: 'bold', desc: 'Deeply moving spiritual and devotional content', group: 'Lifestyle & Inspiration' },
  { id: 'recipe', label: 'Recipe & Food', color: '#16A34A', badge: 'NEW', placeholder: 'Which recipe or food story to create?', tone: 'soft', desc: 'Mouth-watering food cinema and recipe guides', group: 'Lifestyle & Inspiration' },
  { id: 'fitness', label: 'Fitness & Health', color: '#E11D48', badge: 'NEW', placeholder: 'What workout, wellness tip, or health topic?', tone: 'energetic', desc: 'High-energy workouts and science-backed wellness', group: 'Lifestyle & Inspiration' },
  { id: 'biz_product_demo', label: 'Product Demo', color: '#2563EB', badge: 'BIZ', placeholder: 'Describe your product or paste your website URL...', tone: 'professional', desc: 'Showcase product features with cinematic demos', group: 'Business & Corporate', isBusiness: true },
  { id: 'biz_pitch_deck', label: 'Investor Pitch', color: '#7C3AED', badge: 'BIZ', placeholder: 'Describe your startup or paste your pitch deck URL...', tone: 'bold', desc: 'Compelling pitch decks that close funding rounds', group: 'Business & Corporate', isBusiness: true },
  { id: 'biz_commercial', label: 'Commercial / Ad', color: '#DC2626', badge: 'BIZ', placeholder: 'Describe your brand and ad concept...', tone: 'energetic', desc: 'Broadcast-quality commercials and ad spots', group: 'Business & Corporate', isBusiness: true },
  { id: 'biz_marketing', label: 'Marketing Campaign', color: '#EA580C', badge: 'BIZ', placeholder: 'Describe your marketing goals and target audience...', tone: 'energetic', desc: 'Full-funnel marketing videos that convert', group: 'Business & Corporate', isBusiness: true },
  { id: 'biz_company_profile', label: 'Company Profile', color: '#0891B2', badge: 'BIZ', placeholder: 'Tell us about your company or paste your About page URL...', tone: 'professional', desc: 'Polished company overviews that build trust', group: 'Business & Corporate', isBusiness: true },
  { id: 'biz_brand_story', label: 'Brand Story', color: '#DB2777', badge: 'BIZ', placeholder: 'Share your brand origin story or company mission...', tone: 'storytelling', desc: 'Emotional brand narratives that create loyalty', group: 'Business & Corporate', isBusiness: true },
  { id: 'biz_testimonial', label: 'Customer Testimonial', color: '#059669', badge: 'BIZ', placeholder: 'Describe your customer success stories...', tone: 'storytelling', desc: 'Social proof videos that drive conversions', group: 'Business & Corporate', isBusiness: true },
  { id: 'biz_social_ad', label: 'Social Media Ad', color: '#E11D48', badge: 'BIZ', placeholder: 'Describe your social ad campaign and platform...', tone: 'energetic', desc: 'Scroll-stopping ads for Instagram, TikTok & YouTube', group: 'Business & Corporate', isBusiness: true },
  { id: 'biz_training', label: 'Employee Training', color: '#4F46E5', badge: 'BIZ', placeholder: 'What training topic or onboarding process?', tone: 'professional', desc: 'Engaging internal training and onboarding videos', group: 'Business & Corporate', isBusiness: true },
  { id: 'biz_product_launch', label: 'Product Launch', color: '#F59E0B', badge: 'BIZ', placeholder: 'Describe the product being launched...', tone: 'bold', desc: 'Apple-style product reveals that create hype', group: 'Business & Corporate', isBusiness: true },
  { id: 'biz_case_study', label: 'Case Study', color: '#0D9488', badge: 'BIZ', placeholder: 'Describe the client challenge and solution...', tone: 'documentary', desc: 'Data-driven success stories that win clients', group: 'Business & Corporate', isBusiness: true },
  { id: 'biz_webinar_promo', label: 'Webinar / Event Promo', color: '#8B5CF6', badge: 'BIZ', placeholder: 'Describe your event, speakers, and key topics...', tone: 'energetic', desc: 'Registration-driving event promos', group: 'Business & Corporate', isBusiness: true },
  { id: 'biz_sales_explainer', label: 'Sales Explainer', color: '#2DD4BF', badge: 'BIZ', placeholder: 'Describe your sales process or funnel...', tone: 'professional', desc: 'Whiteboard-style sales process breakdowns', group: 'Business & Corporate', isBusiness: true },
  { id: 'biz_presentation', label: 'Business Presentation', color: '#1E40AF', badge: 'BIZ', placeholder: 'Describe your presentation topic and audience...', tone: 'professional', desc: 'Keynote-quality animated presentations', group: 'Business & Corporate', isBusiness: true },
];

export const CATEGORY_GROUPS = [
  { name: 'Business & Corporate', icon: 'Briefcase' },
  { name: 'News & Journalism', icon: 'Newspaper' },
  { name: 'Education & Knowledge', icon: 'GraduationCap' },
  { name: 'Creative & Entertainment', icon: 'Film' },
  { name: 'Stories & Documentaries', icon: 'BookOpen' },
  { name: 'Lifestyle & Inspiration', icon: 'Heart' },
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
  addMusicTrack: (track) => set((s) => ({ project: s.project ? { ...s.project, musicTracks: [...(s.project.musicTracks || []), track] } : null })),
  removeMusicTrack: (idx) => set((s) => ({ project: s.project ? { ...s.project, musicTracks: (s.project.musicTracks || []).filter((_, i) => i !== idx) } : null })),
  updateMusicTrack: (idx, data) => set((s) => ({ project: s.project ? { ...s.project, musicTracks: (s.project.musicTracks || []).map((t, i) => i === idx ? { ...t, ...data } : t) } : null })),
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
