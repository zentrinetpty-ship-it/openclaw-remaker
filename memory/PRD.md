# ExplainaPro - AI Video Creation Platform

## Original Problem Statement
Build a full-stack AI-powered cinematic video creation platform called "ExplainaPro".

## Tech Stack
- **Frontend:** React/Vite, Tailwind CSS, Shadcn/UI, Framer Motion, Zustand
- **Backend:** Python, FastAPI
- **Database:** MongoDB
- **AI:** Google Gemini API
- **Video Rendering:** Remotion
- **Auth:** JWT (bcrypt)

## Architecture (Post-Refactor)
```
/app
├── backend/server.py
├── backend/render_worker.py
├── frontend/src/
│   ├── pages/
│   │   ├── LandingPage.jsx            # Landing + creator form + business flow
│   │   ├── CreatePage.jsx             # AI generation + video prompts + export
│   │   ├── DashboardPage.jsx          # Project management
│   │   └── Editor/                    # REFACTORED: 6 focused files
│   │       ├── EditorPage.jsx         # Orchestrator (220 lines)
│   │       ├── LeftSidebar.jsx        # 7 tabs: Script, Assets, Graphics, Music, Voice, Captions, Effects
│   │       ├── CanvasPreview.jsx      # Video preview + playback controls
│   │       ├── RightSidebar.jsx       # Brand Kit + Slide Properties
│   │       ├── RenderProgressPanel.jsx # Render progress visualization
│   │       └── editorConstants.js     # Shared constants (TABS, VOICES, etc.)
│   ├── store/useProjectStore.js       # Zustand state (36 categories)
│   └── context/AuthContext.js         # JWT auth
├── remotion/src/
└── renders/
```

## Completed Features
- **Editor Refactoring (NEW):** Split 1460-line monolith into 6 focused files
- Multi-format export (PDF, HTML, MP4)
- Category picker with "Please select" placeholder
- Business Video Suite: 14 categories with URL/file analysis
- Video generation prompts (copyable per slide)
- 36 video categories in 6 groups, 15 tones
- Visual image style picker, JSON Prompt Generator
- Full editor with video uploads, multi-music, SFX, caption/title customization
- JWT auth (bcrypt), persistent render worker

## Backlog
- P1: Real SFX generation (ElevenLabs)
- P1: Stock asset search (Pexels/Pixabay)
- P2: Backend refactoring (split server.py)
- P2: Backend pytest suite
- P3: Tech stack migration (Next.js, Prisma, SQLite)

## Mocked
- Stock Asset Search (static)
- AI SFX Generation (static library)
