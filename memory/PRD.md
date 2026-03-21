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

## Architecture
```
/app
├── backend/server.py, render_worker.py
├── frontend/src/
│   ├── pages/
│   │   ├── LandingPage.jsx
│   │   ├── CreatePage.jsx
│   │   ├── DashboardPage.jsx
│   │   └── Editor/ (6 files)
│   ├── store/useProjectStore.js
│   └── context/AuthContext.js
├── remotion/src/
└── renders/
```

## Completed Features
- Render pipeline hardened: preflight check, expanded node search (nvm+glob), PATH inheritance
- Image style consistency: preferredVisualStyle passed through all generation calls instead of hardcoded 'Cinematic'
- Editor refactored into 6 focused files
- Multi-format export (PDF, HTML, MP4)
- Business Video Suite (14 categories + URL/file analysis)
- Video generation prompts (copyable per slide)
- 36 video categories, 15 tones, visual style picker
- Full editor, JWT auth, persistent render worker

## Backlog
- P1: Real SFX generation (ElevenLabs)
- P1: Stock asset search (Pexels/Pixabay)
- P2: Backend refactoring (split server.py)
- P2: Backend pytest suite
- P3: Tech stack migration

## Mocked
- Stock Asset Search, AI SFX Generation
