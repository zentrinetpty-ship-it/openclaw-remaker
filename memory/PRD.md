# ExplainaPro - AI Video Creation Platform

## Original Problem Statement
Build a full-stack AI-powered cinematic video creation platform called "ExplainaPro" with AI script generation, visual asset generation, voiceover, and video rendering capabilities.

## Tech Stack
- **Frontend:** React/Vite, Tailwind CSS, Shadcn/UI, Framer Motion, Zustand
- **Backend:** Python, FastAPI
- **Database:** MongoDB
- **AI:** Google Gemini API
- **Video Rendering:** Remotion
- **Auth:** JWT (bcrypt)

## Core Architecture
```
/app
├── backend/server.py         # FastAPI monolith
├── backend/render_worker.py  # Detached render process
├── frontend/src/
│   ├── pages/LandingPage.jsx      # Landing + creator form + business flow
│   ├── pages/CreatePage.jsx       # AI generation pipeline + video prompts + export
│   ├── pages/EditorPage.jsx       # Multi-panel editor + PDF/HTML/MP4 export
│   ├── pages/DashboardPage.jsx    # Project management
│   ├── store/useProjectStore.js   # Zustand state (36 categories)
│   └── context/AuthContext.js     # JWT auth
├── remotion/src/                  # Video rendering components
└── renders/                       # Job queue directory
```

## Completed Features
- **Multi-format Export (NEW):** Download slides as PDF (reportlab), HTML (standalone presentation with keyboard nav), or MP4 (Remotion render). Available in Editor top nav + export modal + ReadyStep.
- **Category Picker Placeholder (NEW):** Default state shows "Please select video category" instead of pre-selecting Explainer Video. Generate button disabled until category selected.
- **Business Video Suite:** 14 business categories with URL/file upload/text analysis workflow
- **Business Analysis API:** `/api/analyze-business` endpoint with Gemini AI analysis
- **Video Generation Prompts:** Copyable per-slide video prompts for external AI tools
- Landing page with categorized video category dropdown (36 categories, 6 groups)
- Visual image style picker with AI-generated preview thumbnails
- JSON Prompt Generator for AI-enhanced content creation
- Advanced Settings expanded by default with 15 tone options
- Full editor with video uploads, multi-music tracks, SFX, caption/title customization
- JWT auth (bcrypt), CORS stabilized
- Persistent render worker with stuck job cleanup
- Slide count up to 50, duration up to 20 minutes

## Key API Endpoints
- POST `/api/export/pdf` - Export slides as PDF document
- POST `/api/export/html` - Export slides as standalone HTML presentation
- POST `/api/analyze-business` - AI-powered business analysis
- POST `/api/generate-prompt` - JSON prompt generator
- POST `/api/render` - Start MP4 video render
- GET `/api/render/{job_id}` - Poll render status

## Pending Verification
- Authentication stability (was recurring issue)
- Rendering stability (was recurring issue)

## Backlog (Prioritized)
- P1: Real SFX generation (ElevenLabs integration)
- P1: Stock asset search (Pexels/Pixabay integration)
- P2: Backend refactoring (split server.py monolith)
- P2: Editor refactoring (break down EditorPage.jsx)
- P2: Backend pytest suite
- P3: Tech stack migration (Next.js, Prisma, SQLite)

## Mocked Features
- Stock Asset Search (static images/videos)
- AI SFX Generation (static sound library)
