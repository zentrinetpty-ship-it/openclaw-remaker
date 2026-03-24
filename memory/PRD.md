# ExplainaPro - AI Cinematic Video Creation Platform

## Product Requirements Document

### Original Problem Statement
Build a full-stack AI-powered cinematic video creation platform called "ExplainaPro". The platform enables users to create professional videos from text descriptions using AI for script writing, image generation, voiceover, and video rendering.

### Tech Stack
- **Frontend:** React/Vite with Tailwind CSS + Shadcn/UI
- **Backend:** FastAPI (Python)
- **Database:** MongoDB
- **Video Rendering:** Remotion
- **AI:** Google Gemini (text + image generation)

### Core Features (Implemented)
- Landing page with comprehensive video creation form (36+ categories, 15 tones, 20+ visual styles)
- AI storyboard generation (script, slides, narration, prompts)
- Multi-panel asset generation (image/video per slide, character consistency, start/end frames)
- Full video editor with canvas preview, timeline, left/right sidebars, AI chat assistant
- Remotion-based 1080p video rendering with voiceover, captions, BGM, SFX
- JWT-based authentication
- Project management (save, load, delete)
- Business Video Suite (analyze company URL/files for targeted video suggestions)
- Multi-format export (MP4, PDF storyboard, HTML presentation)
- User asset library

### Dark Mode UI (Implemented - March 2026)
- **Dev-style dark theme** applied across ALL pages and components
- Color palette: #030712 (main bg), #0a0f1a (surfaces), #0d1117 (inputs), white/[0.06] (borders)
- Accent colors: indigo-500 (primary), pink-400 (secondary), cyan-400 (tertiary)
- Sharp UI elements with btn-sharp box-shadow effect
- Poppins font throughout
- Full generation prompts displayed by default (untruncated)
- Image generation set as default asset type

### Architecture
```
/app
├── backend/
│   ├── server.py           # FastAPI monolith
│   └── render_worker.py    # Detached render process
├── frontend/src/
│   ├── pages/
│   │   ├── LandingPage.jsx
│   │   ├── CreatePage.jsx
│   │   ├── DashboardPage.jsx
│   │   └── Editor/
│   │       ├── EditorPage.jsx
│   │       ├── LeftSidebar.jsx
│   │       ├── CanvasPreview.jsx
│   │       ├── RightSidebar.jsx
│   │       ├── RenderProgressPanel.jsx
│   │       └── editorConstants.js
│   ├── components/
│   │   ├── AuthModal.jsx
│   │   └── Editor/
│   │       ├── EditorChatBox.jsx
│   │       └── TimelinePanel.jsx
│   ├── store/
│   └── context/
├── remotion/
└── renders/
```

### Key API Endpoints
- `/api/auth/register`, `/api/auth/login` - Authentication
- `/api/restructure-script` - AI storyboard generation
- `/api/generate-prompt` - AI prompt optimization
- `/api/generate-image`, `/api/generate-video` - Asset generation
- `/api/generate-voice` - TTS voiceover
- `/api/render` - Video rendering
- `/api/projects` - CRUD operations
- `/api/analyze-business` - Business analysis
- `/api/export/pdf`, `/api/export/html` - Multi-format export
- `/api/upload-character` - Character image upload
- `/api/render/preflight` - Render environment check

### DB Schema
- **users**: `{ _id, email, name, password }`
- **projects**: `{ _id, userId, title, projectData: { slides, ... } }`
- **generated_assets**: `{ _id, userId, type, url, prompt, category }`

### What's Working
- All core features functional
- Dark mode applied across all pages
- Authentication, rendering, export all stable
- No known bugs

### Mocked Features
- Stock Asset Search (uses static library)
- SFX Generation (uses static library)

### Test Credentials
- Email: test@test.com
- Password: password
