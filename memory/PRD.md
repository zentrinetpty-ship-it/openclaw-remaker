# ExplainaPro - AI Video Creation Platform

## Original Problem Statement
Build ExplainaPro - an AI-powered cinematic video creation platform with 13 video categories, AI script generation, image generation, full video editor with timeline, project management, user authentication, and MP4 video export.

## Architecture
- **Frontend**: React + Tailwind CSS + Framer Motion + Zustand (with persist middleware)
- **Backend**: FastAPI + MongoDB + emergentintegrations
- **AI Services**: Gemini 2.5 Flash (text), Gemini Nano Banana (images)
- **Auth**: JWT with bcrypt password hashing
- **Video Rendering**: Remotion 4.x (@remotion/renderer, @remotion/bundler) with system Chromium
- **Audio**: Google Cloud Text-to-Speech (TTS), FFmpeg for audio mixing

## What's Been Implemented

### Phase 1 - Core Features (March 13)
- [x] Landing page with 13 category selection and dynamic theming
- [x] Creator card with duration, slides, tone, visual style settings
- [x] AI script generation via Gemini 2.5 Flash
- [x] Storyboard display with characters and slides
- [x] AI image generation via Gemini Nano Banana
- [x] Asset assignment step with Generate All option
- [x] Full video editor with 7 tabs (Script, Assets, Graphics, Music, Voice, Captions, Effects)
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
- [x] Caption burn-in in rendered MP4 using FFmpeg ASS subtitle filter
- [x] 6 caption styles mapped to ASS format with proper colors/fonts
- [x] Frontend passes captionStyleId to render endpoint
- [x] State persistence using Zustand persist middleware (localStorage)
- [x] Preview shows styled captions matching selected caption style

### Phase 5 - Music Upload & BGM in Render (March 14)
- [x] Music upload endpoint for audio files
- [x] Music tab with upload UI, audio player, volume slider, remove button
- [x] BGM mixed into rendered video
- [x] Voice + BGM mixing with adjustable volume

### Phase 6 - Music & SFX Library (March 14)
- [x] 78 audio files: 34 music + 44 SFX across multiple categories
- [x] Backend endpoints: GET /api/library/music, GET /api/library/sfx
- [x] Frontend: Browsable library with category filters, preview, one-click selection

### Phase 7 - Remotion Video Engine (March 14)
- [x] Replaced FFmpeg with Remotion programmatic video engine
- [x] Ken Burns effect, smooth transitions (fade, slide, zoom)
- [x] Word-by-word animated captions with 6 styles
- [x] Audio integration (per-slide voice + background music)
- [x] Optimized render (concurrency=1, 24fps, bundle caching)
- [x] Save button fixed with upsert

### Phase 8 - P0 Verification (March 14)
- [x] Verified Remotion render stability, save button, render speed
- [x] Fixed transition frames mismatch (Root.jsx aligned to 15 frames)

### Phase 9 - Advanced Features (March 14)
- [x] **Multiple Caption Modes**: Words, Lines, Sentence — AnimatedCaption.jsx supports all 3 modes, passed through render pipeline
- [x] **Motion Graphics**: 4 Remotion components (TitleCard, LowerThird, KineticText, StatCounter), GraphicsOverlay in ExplainerVideo.jsx, Graphics tab in Editor for adding/editing/removing overlays per slide
- [x] **Video Remaker**: /api/analyze-video endpoint extracts frames with FFmpeg, analyzes with Gemini, returns storyboard. Landing page shows upload UI for remaker category
- [x] **AI Motion Graphics Prompt**: AI generates slides with graphics arrays when motiongraphic category selected

### Phase 10 - User Asset Library (March 14)
- [x] **GET /api/user/library**: Returns all user assets with category filtering and counts
- [x] **DELETE /api/user/assets/{id}**: Removes asset from library and deletes file from disk
- [x] **Auto-save on upload**: POST /api/upload automatically saves to user library when authenticated
- [x] **Dashboard My Library tab**: Category filters, search, delete, preview
- [x] **Editor My Library**: Browse and one-click assign library assets to slides
- [x] Testing: 100% backend (13/13), 100% frontend

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
- POST /api/analyze-video - Video Remaker (upload + Gemini analysis)

**Video Rendering:**
- POST /api/render - Start MP4 render (captionStyleId, captionMode, bgmUrl, bgmVolume, graphics)
- GET /api/render/:jobId - Get render status
- GET /api/renders/:filename - Download rendered video

**File Upload:**
- POST /api/upload - Upload files (auto-saves to library when authenticated)

**Projects:**
- POST /api/projects - Save project (upsert by title+userId)
- GET /api/projects - List projects
- GET /api/projects/:id - Get project

**User Library:**
- GET /api/user/library - Get user's asset library with category filter
- GET /api/user/assets - Get user's generated assets
- DELETE /api/user/assets/:id - Delete asset from library
- GET /api/user/stats - Get user statistics

**Library:**
- GET /api/library/music - Music library catalog
- GET /api/library/sfx - SFX library catalog

## Database Schema (MongoDB)
- `users`: { id, email, name, password, createdAt, subscriptionTier }
- `projects`: { id, userId, title, status, slides, settings, projectData }
- `generated_assets`: { id, userId, type, url, prompt, metadata, projectId, createdAt }
- `render_jobs`: In-memory dict

## Key Files
- `/app/backend/server.py` - All API endpoints, Remotion render orchestration
- `/app/remotion/` - Remotion video engine
- `/app/remotion/src/ExplainerVideo.jsx` - Main video composition with GraphicsOverlay
- `/app/remotion/src/components/Slide.jsx` - Slide with Ken Burns + transitions
- `/app/remotion/src/components/AnimatedCaption.jsx` - 3 caption modes (words/lines/sentence)
- `/app/remotion/src/components/MotionGraphics.jsx` - TitleCard, LowerThird, KineticText, StatCounter
- `/app/remotion/render.mjs` - Server-side render script
- `/app/frontend/src/pages/EditorPage.jsx` - Video editor with 7 tabs + My Library
- `/app/frontend/src/pages/DashboardPage.jsx` - Dashboard with Projects + My Library tabs
- `/app/frontend/src/pages/LandingPage.jsx` - Landing page with Video Remaker upload

## Mocked Features
- Music Generation (/api/generate-music)
- SFX Generation (/api/generate-sfx)
- Stock Asset Search (/api/search/assets)

## Backlog (P1/P2)
- P1: Real stock asset search integration (Pixabay/Pexels)
- P1: Real SFX generation (ElevenLabs)
- P2: Backend refactoring (break server.py into routers)
- P2: Render queue with progress notifications
