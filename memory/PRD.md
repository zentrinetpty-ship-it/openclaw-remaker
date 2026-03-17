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
│   ├── pages/CreatePage.jsx       # AI generation pipeline + video prompts
│   ├── pages/EditorPage.jsx       # Multi-panel editor
│   ├── pages/DashboardPage.jsx    # Project management
│   ├── store/useProjectStore.js   # Zustand state (36 categories)
│   └── context/AuthContext.js     # JWT auth
├── remotion/src/                  # Video rendering components
└── renders/                       # Job queue directory
```

## Completed Features
- **Business Video Suite (NEW):** 14 business video categories (Product Demo, Investor Pitch, Commercial, Marketing Campaign, Company Profile, Brand Story, Customer Testimonial, Social Media Ad, Employee Training, Product Launch, Case Study, Webinar Promo, Sales Explainer, Business Presentation) with URL/file upload/text analysis workflow
- **Business Analysis API (NEW):** `/api/analyze-business` endpoint scrapes URLs, extracts text from PDFs/DOCX, analyzes with Gemini AI, and suggests relevant video types ranked by priority
- **Video Generation Prompts (NEW):** Each slide shows a copyable video generation prompt for use with external AI tools (Runway, Pika, etc.)
- Landing page with categorized video category dropdown (36 categories, 6 groups)
- Visual image style picker with AI-generated preview thumbnails (22 styles, 6 categories)
- JSON Prompt Generator for AI-enhanced content creation
- Advanced Settings expanded by default with 15 tone options
- Full editor with video uploads, multi-music tracks, SFX, caption/title customization
- JWT auth (bcrypt), CORS stabilized
- Persistent render worker with stuck job cleanup
- Slide count up to 50, duration up to 20 minutes

## Pending Verification
- Authentication stability (was recurring issue)
- Rendering stability (was recurring issue)

## Backlog (Prioritized)
- P1: Real SFX generation (ElevenLabs integration)
- P1: Stock asset search (Pexels/Pixabay integration)
- P2: Backend refactoring (split server.py monolith into routers)
- P2: Editor refactoring (break down EditorPage.jsx)
- P2: Backend pytest suite
- P3: Tech stack migration (Next.js, Prisma, SQLite)

## Mocked Features
- Stock Asset Search (static images/videos)
- AI SFX Generation (static sound library)
