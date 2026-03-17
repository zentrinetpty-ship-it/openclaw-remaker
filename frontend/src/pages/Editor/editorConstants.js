export const API = process.env.REACT_APP_BACKEND_URL + '/api';

export const TABS = [
  { id: 'script', label: 'Script', icon: 'FileText' },
  { id: 'assets', label: 'Assets', icon: 'Image' },
  { id: 'graphics', label: 'Graphics', icon: 'Type' },
  { id: 'music', label: 'Music', icon: 'Music' },
  { id: 'voice', label: 'Voice', icon: 'Mic' },
  { id: 'captions', label: 'Captions', icon: 'Captions' },
  { id: 'effects', label: 'Effects', icon: 'Wand2' },
];

export const CAPTION_STYLES = [
  { id: 'bold-pop', name: 'Bold Pop', bg: '#FBBF24', text: '#000' },
  { id: 'netflix', name: 'Netflix', bg: 'transparent', text: '#fff' },
  { id: 'minimal', name: 'Minimal', bg: 'rgba(0,0,0,0.7)', text: '#fff' },
  { id: 'tiktok', name: 'TikTok', bg: '#1a1a1a', text: '#FF2D55' },
  { id: 'neon', name: 'Neon', bg: 'transparent', text: '#00F5FF' },
  { id: 'glass', name: 'Glass', bg: 'rgba(255,255,255,0.1)', text: '#fff' },
];

export const VFX_OPTIONS = ['none', 'cinematic', 'vhs', 'glitch', 'grayscale', 'blur'];
export const TRANSITION_OPTIONS = ['fade', 'slide', 'zoom', 'none'];
export const VOICES = [
  { id: 'en-US-Journey-D', name: 'Journey D', accent: 'American', gender: 'Male', type: 'Narrative' },
  { id: 'en-US-Journey-F', name: 'Journey F', accent: 'American', gender: 'Female', type: 'Narrative' },
  { id: 'en-US-Wavenet-D', name: 'Wavenet D', accent: 'American', gender: 'Male', type: 'Standard' },
  { id: 'en-US-Wavenet-F', name: 'Wavenet F', accent: 'American', gender: 'Female', type: 'Standard' },
  { id: 'en-GB-Neural2-B', name: 'Neural2 B', accent: 'British', gender: 'Male', type: 'Pro' },
  { id: 'en-GB-Neural2-A', name: 'Neural2 A', accent: 'British', gender: 'Female', type: 'Pro' },
  { id: 'en-AU-Neural2-B', name: 'Neural2 B', accent: 'Australian', gender: 'Male', type: 'Pro' },
  { id: 'en-AU-Neural2-C', name: 'Neural2 C', accent: 'Australian', gender: 'Female', type: 'Pro' },
];

export const RENDER_PHASES = [
  { key: 'prepare', label: 'Preparing', range: [0, 10], icon: 'Layers' },
  { key: 'voice', label: 'Generating Voices', range: [10, 40], icon: 'Mic' },
  { key: 'bundle', label: 'Bundling', range: [40, 50], icon: 'Settings' },
  { key: 'render', label: 'Rendering Frames', range: [50, 95], icon: 'Film' },
  { key: 'finalize', label: 'Finalizing', range: [95, 100], icon: 'Check' },
];
