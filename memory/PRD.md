# ExplainaPro - AI Video Creation Platform

## Original Problem Statement
Build ExplainaPro - an AI-powered cinematic video creation platform with 13 video categories, AI script generation, image generation, full video editor with timeline, project management, user authentication, and MP4 video export.

## Architecture
- **Frontend**: React + Tailwind CSS + Framer Motion + Zustand (with persist middleware)
- **Backend**: FastAPI + MongoDB + emergentintegrations
- **AI Services**: Gemini 2.5 Flash (text), Gemini Nano Banana (images)
- **Auth**: JWT with bcrypt password hashing
- **Video Rendering**: FFmpeg (H264 MP4) with ASS subtitle burn-in
- **Voice**: Google Cloud Text-to-Speech (TTS)

## What's Been Implemented

### Phase 1 - Core Features (March 13)
- [x] Landing page with 13 category selection and dynamic theming
- [x] Creator card with duration, slides, tone, visual style settings
- [x] AI script generation via Gemini 2.5 Flash
- [x] Storyboard display with characters and slides
- [x] AI image generation via Gemini Nano Banana
- [x] Asset assignment step with Generate All option
- [x] Full video editor with 6 tabs (Script, Assets, Music, Voice, Captions, Effects)
- [x] Canvas preview with playback controls
- [x] Dashboard with project list

### Phase 2 - Auth & Export (March 14)
- [x] JWT-based authentication (register/login)
- [x] User-specific project storage
- [x] Auth modal with login/register toggle
- [x] User menu in navbar (name display, logout)
- [x] FFmpeg-based video rendering with audio sync
- [x] Export MP4 button with progress modal
- [x] Download rendered videos
- [x] Google Cloud TTS voice generation per slide

### Phase 3 - Editor Enhancements (March 14)
- [x] Functional live video preview with slide-by-slide playback
- [x] Per-slide voice generation and playback
- [x] Assets panel with upload/regenerate/edit prompts
- [x] Voice panel with single voice selection for all slides
- [x] Captions panel with 6 styles (Bold Pop, Netflix, Minimal, TikTok, Neon, Glass)
- [x] Effects panel with transitions and VFX per slide
- [x] Batch apply for transitions and VFX

### Phase 4 - Caption Burn-in & Persistence (March 14)
- [x] **Caption burn-in in rendered MP4** using FFmpeg ASS subtitle filter
- [x] 6 caption styles mapped to ASS format with proper colors/fonts
- [x] Frontend passes captionStyleId to render endpoint
- [x] **State persistence** using Zustand persist middleware (localStorage)
- [x] Preview shows styled captions matching selected caption style
- [x] Global timeline progress (current time / total time) during playback

### Phase 5 - Music Upload & BGM in Render (March 14)
- [x] Music upload endpoint (POST /api/upload) for audio files
- [x] Music tab with upload UI, audio player, volume slider, remove button
- [x] BGM mixed into rendered video using FFmpeg amix filter
- [x] BGM-only render (no voice) with volume control and looping
- [x] Voice + BGM mixing with adjustable volume
- [x] File upload handler sends to server (no more blob: URLs)
- [x] Pre-render validation warns about missing slide images

### Phase 6 - Music & SFX Library (March 14)
- [x] Generated 78 audio files using FFmpeg synthesis (34 music + 44 SFX)
- [x] Music Library: 34 tracks across 8 categories (cinematic, corporate, ambient, upbeat, lofi, electronic, inspirational, acoustic)
- [x] SFX Library: 44 sounds across 6 categories (transitions, ui, impact, tech, nature, comic)
- [x] Backend endpoints: GET /api/library/music, GET /api/library/sfx with category filtering
- [x] Frontend: Browsable library with category filters, preview playback, and one-click selection
- [x] SFX preview with play/stop buttons per sound

## API Endpoints
**Auth:**
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me

**AI Generation:**
- POST /api/restructure-script - AI storyboard generation
- POST /api/generate-image - AI image generation
- POST /api/generate-video - AI video background
- POST /api/generate-voice - Google TTS voice generation

**Video Rendering:**
- POST /api/render - Start MP4 render (accepts captionStyleId, bgmUrl, bgmVolume)
- GET /api/render/:jobId - Get render status
- GET /api/renders/:filename - Download rendered video

**File Upload:**
- POST /api/upload - Upload files (images, audio, video) to server

**Projects:**
- POST /api/projects - Save project
- GET /api/projects - List projects
- GET /api/projects/:id - Get project

**User:**
- GET /api/user/assets - Get user's generated assets
- GET /api/user/stats - Get user statistics

## Database Schema (MongoDB)
- `users`: { id, email, name, password, createdAt, subscriptionTier }
- `projects`: { id, userId, title, status, slides, settings, projectData }
- `generated_assets`: { id, userId, type, url, prompt, projectId, createdAt }
- `render_jobs`: In-memory dict (render_jobs)

## Key Files
- `/app/backend/server.py` - All API endpoints, FFmpeg rendering, ASS subtitle generation
- `/app/frontend/src/pages/EditorPage.jsx` - Video editor with preview, sidebars
- `/app/frontend/src/store/useProjectStore.js` - Zustand stores with persist
- `/app/frontend/src/pages/LandingPage.jsx` - Landing page with categories
- `/app/frontend/src/pages/CreatePage.jsx` - Project creation flow
- `/app/frontend/src/pages/DashboardPage.jsx` - User dashboard
- `/app/frontend/src/context/AuthContext.js` - JWT auth context

## Mocked Features
- Music Generation (/api/generate-music) - User uploads own music instead
- SFX Generation (/api/generate-sfx)
- Stock Asset Search (/api/search/assets)

## Backlog (P1/P2)
- P1: Real stock asset search integration
- P2: Advanced category features (Video Remaker, Motion Graphics icons)
- P2: Remotion/@twick rendering integration for motion graphics
- P2: Multiple caption modes (words, lines, sentence) in render
