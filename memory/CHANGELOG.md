# ExplainaPro Changelog

## March 24, 2026 - Dark Mode UI Overhaul
- Implemented complete "dev-style" dark mode across all pages and components
- Color system: #030712 (bg), #0a0f1a (surfaces), #0d1117 (inputs), indigo-500 (accent)
- Updated CSS variables in index.css for dark theme
- Sharp UI elements with btn-sharp box-shadow effect
- Set image generation as default asset type in CreatePage
- Full generation prompts displayed by default (image + video prompts untruncated)
- Updated all 12+ component files: LandingPage, CreatePage, DashboardPage, AuthModal, EditorPage, LeftSidebar, CanvasPreview, RightSidebar, RenderProgressPanel, EditorChatBox, TimelinePanel
- All tests passed (7/7 features verified)

## Prior Sessions
- Business Video Suite & Analysis (URL/file/text analysis)
- Multi-Format Export (PDF/HTML storyboard downloads)
- Advanced Asset Generation (start/end frames, character consistency, per-slide toggles)
- Critical bug fixes (style consistency, float duration crash, rendering pipeline)
- EditorPage refactoring (monolith -> 6 components)
