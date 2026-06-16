---
title: PersonaFlow
emoji: 🤖
colorFrom: indigo
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
---

# PersonaFlow — Dynamic AI Conversation Agent Platform

> **AI Quick-Reference README** — This file exists so an AI assistant can rapidly understand the full project without scanning every file.

---

## 🗂️ Project Overview

**PersonaFlow** is a full-stack web application that lets users:
- Create custom AI conversation agents with unique names, roles, personalities, and rules.
- Chat (text) or Video Call (3D avatar with lip-sync) with their agents.
- Share agents publicly via tokenized share links.
- Generate performance reports with scoring, summaries, feedback, and transcripts.
- Chat with an AI assistant about each agent's report data (Report Chat).
- Practice public speaking via an "Anchoring" agent that reads teleprompter-style scripts.

---

## 🛠️ Tech Stack

| Layer      | Technology                                              |
|------------|---------------------------------------------------------|
| Backend    | Python · Flask 3.0 · Flask-SQLAlchemy · Flask-CORS     |
| Database   | SQLite (`backend/instance/personaflow.db`)             |
| AI Engine  | Google Gemini API (default: `gemini-2.5-flash`) |
| TTS        | Kokoro TTS (local neural TTS, no API key required)     |
| STT        | OpenAI Whisper (speech recognition via Google SR API)  |
| Frontend   | Vanilla HTML · CSS · JavaScript (SPA via hash router)  |
| 3D Avatar  | Three.js (GLTF/FBX models + custom lip-sync engine)    |
| Fonts/Icons| Google Fonts (Inter) · Font Awesome 6.4                |

---

## 📁 Project Structure

```
personaflow/
├── requirements.txt          # Python deps
├── README.md                 # This file
│
├── backend/
│   ├── app.py                # Main Flask app — all API routes
│   ├── models.py             # SQLAlchemy DB models
│   ├── ai_service.py         # AI API calls (Gemini format) — delegates prompt building to agent_behavior.py
│   ├── agent_behavior.py     # Agent Behavior Engine — role detection, scope enforcement, prompt builder, response-length rules
│   ├── scoring_service.py    # Conversation scoring/evaluation logic
│   ├── config.py             # App config (secret key, DB URI, API keys)
│   └── migrate_anchoring.py  # Migration script for anchoring columns
│
└── frontend/
    ├── index.html            # SPA shell — sidebar, modal, toast containers
    ├── css/
    │   └── styles.css        # Single large stylesheet (~90KB), dark mode via [data-theme=dark]
    ├── image/
    │   └── favicon.png       # App logo / favicon
    ├── 3d-assets/            # GLTF/FBX avatar model files
    └── js/
        ├── app.js            # Global App object, auth state, dark mode toggle
        ├── api.js            # API wrapper (all fetch calls)
        ├── router.js         # Hash-based SPA router (#/page routing)
        ├── components/
        │   ├── sidebar.js        # Sidebar nav + user info + logout
        │   ├── modal.js          # Global modal helper
        │   ├── toast.js          # Toast notification helper
        │   ├── notifications.js  # Notification panel (positioned correctly above sidebar)
        │   ├── onboarding.js     # First-time user onboarding flow
        │   ├── avatar3d.js       # Three.js 3D avatar renderer + animation (54KB)
        │   ├── lipsync-engine.js # Phoneme-based lip-sync engine for avatar
        │   └── three-converter.js # Three.js GLB/FBX loader helper
        └── pages/
            ├── login.js          # Login page
            ├── signup.js         # Signup page
            ├── dashboard.js      # Dashboard — stats, recent conversations
            ├── agents.js         # Agent list page — CRUD, filter, search
            ├── agent-wizard.js   # 4-step agent creation wizard
            ├── agent-detail.js   # Agent detail — tabs: Overview, Conversations, Reports, Share, Anchoring, Report Chat
            ├── chat.js           # Text chat interface with agent
            ├── video-call.js     # 3D Avatar video call (51KB) — TTS, STT, lip-sync
            ├── conversations.js  # All conversations list page
            ├── reports.js        # Reports list page (history of all report cards)
            ├── share-access.js   # Public share link landing page (no auth required)
            ├── anchoring.js      # Anchoring teleprompter — owner/local view
            ├── anchoring-remote.js # Anchoring remote control view
            └── templates.js      # Agent template data (now used inline in agent wizard)
```

---

## 🗃️ Database Models (backend/models.py)

| Model          | Key Fields                                                                                 |
|----------------|-------------------------------------------------------------------------------------------|
| `User`         | id, name, email, password_hash, avatar_color                                              |
| `Agent`        | id, user_id, name, role, goal, opening_message, task_description, rules (JSON), tone, knowledge, output_config (JSON), icon, color, status, agent_type (`conversation`/`anchoring`), is_default, script_content |
| `Conversation` | id, agent_id, user_id, share_link_id, participant_name/email, mode (`text`/`video`), status (`active`/`completed`), started_at, ended_at |
| `Message`      | id, conversation_id, role (`user`/`agent`), content, timestamp                           |
| `ShareLink`    | id, agent_id, token, password_hash, expires_at, max_uses, current_uses, require_name/email |
| `Report`       | id, conversation_id, overall_score, criteria_scores (JSON), summary, feedback, recommendations, transcript (JSON) |

---

## 🔌 Backend API Routes (backend/app.py)

### Auth
| Method | Endpoint              | Description          |
|--------|-----------------------|----------------------|
| POST   | `/api/auth/signup`    | Register new user    |
| POST   | `/api/auth/login`     | Login                |
| POST   | `/api/auth/logout`    | Logout               |
| GET    | `/api/auth/me`        | Current user info    |

### Agents
| Method | Endpoint                          | Description                        |
|--------|-----------------------------------|------------------------------------|
| GET    | `/api/agents`                     | List user's agents                 |
| POST   | `/api/agents`                     | Create agent                       |
| GET    | `/api/agents/<id>`                | Get agent                          |
| PUT    | `/api/agents/<id>`                | Update agent                       |
| DELETE | `/api/agents/<id>`                | Delete agent                       |
| GET    | `/api/agents/<id>/share-links`    | List share links                   |
| POST   | `/api/agents/<id>/share-links`    | Create share link                  |
| POST   | `/api/agents/<id>/report-chat`    | AI chat about agent's report data  |
| POST   | `/api/agents/<id>/export-report`  | Export report as DOCX              |

### Conversations
| Method | Endpoint                                    | Description              |
|--------|---------------------------------------------|--------------------------|
| GET    | `/api/conversations`                        | List conversations       |
| POST   | `/api/conversations`                        | Create conversation      |
| GET    | `/api/conversations/<id>`                   | Get conversation + msgs  |
| DELETE | `/api/conversations/<id>`                   | Delete conversation      |
| POST   | `/api/conversations/<id>/messages`          | Send a message           |
| POST   | `/api/conversations/<id>/end`               | End conversation + generate report |

### Reports
| Method | Endpoint                              | Description                    |
|--------|---------------------------------------|--------------------------------|
| GET    | `/api/reports`                        | List all reports               |
| GET    | `/api/reports/<id>`                   | Get single report              |
| POST   | `/api/reports/generate/<conv_id>`     | Generate report for conv       |

### Public Share
| Method | Endpoint                        | Description                       |
|--------|---------------------------------|-----------------------------------|
| GET    | `/api/share/<token>`            | Get share link info               |
| POST   | `/api/share/<token>/verify`     | Verify share link password        |
| POST   | `/api/share/<token>/start`      | Start public share conversation   |
| POST   | `/api/share/<token>/message`    | Send message in public share conv |

### Anchoring
| Method | Endpoint                                        | Description                    |
|--------|-------------------------------------------------|--------------------------------|
| POST   | `/api/anchoring/<agent_id>/start`               | Start anchoring session        |
| POST   | `/api/anchoring/<agent_id>/control`             | Pause / resume / stop          |
| GET    | `/api/anchoring/<agent_id>/status`              | Get current line / status      |
| POST   | `/api/anchoring/tts`                            | TTS for a line of the script   |

### Other
| Method | Endpoint               | Description         |
|--------|------------------------|---------------------|
| POST   | `/api/upload`          | Upload image file   |
| POST   | `/api/speech-to-text`  | STT (Whisper)       |
| POST   | `/api/tts`             | Edge TTS            |

---

## 🖥️ Frontend Pages (SPA Routes)

| Hash Route           | JS File              | Description                                         |
|----------------------|----------------------|-----------------------------------------------------|
| `#/login`            | login.js             | Login form                                          |
| `#/signup`           | signup.js            | Signup form                                         |
| `#/dashboard`        | dashboard.js         | Summary stats, recent conversations                 |
| `#/agents`           | agents.js            | Agent list with search, filter, create              |
| `#/agents/new`       | agent-wizard.js      | 4-step creation wizard                              |
| `#/agents/:id`       | agent-detail.js      | Tabbed detail: Overview / Conversations / Reports / Share / Anchoring / Report Chat |
| `#/chat/:convId`     | chat.js              | Text chat UI                                        |
| `#/video-call/:convId` | video-call.js      | 3D avatar video call                                |
| `#/conversations`    | conversations.js     | All conversations history                           |
| `#/reports`          | reports.js           | All reports history (card list)                     |
| `#/share/:token`     | share-access.js      | Public shareable agent chat (no auth needed)        |
| `#/anchoring/:id`    | anchoring.js         | Local anchoring teleprompter                        |
| `#/anchoring-remote/:id` | anchoring-remote.js | Remote anchoring control                        |

---

## ▶️ How to Run

```bash
# 1. Install Python dependencies
pip install -r requirements.txt

# 2. Configure your API key
# Set the GEMINI_API_KEY environment variable (or edit backend/config.py)
export GEMINI_API_KEY="your-api-key-here"

# 3. Start the backend server
cd backend
python app.py
# Server starts at http://localhost:5000

# 4. Open browser
#    Navigate to: http://localhost:5000
```

---

## ⚙️ Configuration (backend/config.py)

| Setting                 | Default                            | Notes                              |
|-------------------------|------------------------------------|------------------------------------|
| `SECRET_KEY`            | `personaflow-secret-key-...`       | Change in production               |
| `SQLALCHEMY_DATABASE_URI` | `sqlite:///personaflow.db`       | DB stored in `backend/instance/`   |
| `GEMINI_API_KEY`        | `AIzaSyBiL-wOiS8Rj5h3YuC...`       | Your Gemini API Key                |
| `GEMINI_MODEL`          | `gemini-2.5-flash`                 | LLM model name                     |
| `KOKORO_DEFAULT_VOICE`  | `af_heart`                         | Default Kokoro TTS voice           |
| `PERMANENT_SESSION_LIFETIME` | `86400` (24 hours)            | Session expiry                     |

---

## 🔑 Key Architecture Decisions

- **SPA with hash routing**: `router.js` intercepts all `hashchange` events and renders the correct page module. No page reloads.
- **Auth**: Session-based (Flask sessions). Protected routes use `@login_required` decorator. Frontend checks `/api/auth/me` on load.
- **AI calls**: All AI interactions go through `ai_service.py` → Gemini REST API. System prompt building is handled by `agent_behavior.py`.
- **Agent Behavior Engine** (`agent_behavior.py`): Centralizes all prompt-building logic. Auto-detects role type (INTERVIEWER / TEACHER / COACH / EVALUATOR / DEFAULT) and injects role-specific behavioral instructions. Enforces strict scope via `output_config.strict_mode`. Applies response-length rules based on conversation `mode` — video calls get 1–2 sentence responses; text chat gets 3–4 sentences. Supports `output_config` behavior fields: `strict_mode`, `allow_out_of_scope`, `max_answer_length`, `behavior`.
- **Agent types**: Two types — `conversation` (standard chat bot) and `anchoring` (teleprompter script reader). Anchoring agents have `script_content` and in-memory state tracking (`anchoring_states` dict in `app.py`).
- **Reports**: Auto-generated on conversation end if `output_config.evaluation` is enabled. Can also be manually generated via the API. Stored in `Report` model.
- **Report Chat**: `/api/agents/<id>/report-chat` feeds all the agent's conversations + reports as context to the LLM so users can ask analytical questions.
- **Video Call**: Uses Three.js for 3D avatar rendering. Text-to-speech via **Kokoro TTS** (local neural). Speech-to-text via Whisper + Google Web Speech API. Custom phoneme-based lip-sync engine (`lipsync-engine.js`). Kokoro pipeline is initialized as a singleton at first TTS call to avoid reload overhead.
- **Dark mode**: Stored in `localStorage` as `personaflow-theme`. Applied via `[data-theme=dark]` attribute on `<html>`. Applied immediately in a blocking `<script>` before body renders to prevent flash.
- **Share links**: Tokenized URLs (`/api/share/<token>`). Support password protection, expiry, max uses, and required name/email fields.
- **Notifications panel**: Rendered as a fixed overlay, positioned to appear above the sidebar (z-index managed carefully).

---

## 🐛 Known Issues / Recent Work History

- **Report Chat** was moved from Reports page → Agent Detail page (agent-specific context). The `agent-detail.js` "Report Chat" tab contains the chat UI.
- **Reports page** (`reports.js`) shows only the report history list (no embedded chat).
- **Agent Creation Flow**: The `agent-wizard.js` now features a "choice screen" before the wizard starts, offering "Build from Scratch" (with inspiration idea cards) or "Use a Template" (rendering the template gallery inline).
- **Templates**: The dedicated `#/templates` page was removed from the sidebar. Templates are exclusively accessed via the new Create Agent choice screen.
- **TTS (Avatar Voice)**: Migrated from `edge-tts` (Microsoft) to **Kokoro TTS** (local neural TTS). The `/api/avatar/talk` endpoint now uses `KPipeline` from the `kokoro` Python package. Outputs `.wav` audio. On first run, Kokoro auto-downloads its model weights (~327MB). No API key required.
  - **Note on Windows Installation**: Kokoro has a strict dependency on `numpy==1.26.4` which fails on Python 3.13. It can be installed by bypassing dependencies (`pip install kokoro --no-deps`) and installing `numpy`, `torch`, `misaki`, etc., manually.
  - **Note on Misaki Compatibility**: The G2P library `misaki` (version 0.7.4) crashes with a `TypeError` when encountering unknown tokens (`t.phonemes is None`). This was manually patched in `misaki/en.py` to fallback to an unknown token instead of crashing.
- **Agent Behavior Engine**: New `backend/agent_behavior.py` centralizes all system-prompt building. Extracted from `ai_service.py`. Role-specific prompt sections (Interviewer, Teacher, Coach, Evaluator, Default). `output_config` JSON now supports `strict_mode`, `allow_out_of_scope`, `max_answer_length`, and `behavior` fields.
- **Response Length (video vs text)**: `ai_service.generate_response()` now accepts a `mode` parameter. Video calls pass `mode='video'` (from `conversation.mode`) → agent replies in 1–2 sentences for natural interrupt-handling. Text chat uses `mode='text'` → 3–4 sentences max.
- **3D Avatar lip-sync**: Complex phoneme mapping via `lipsync-engine.js`. Debugging history in conversation logs.
- **Microphone Mute/Unmute**: Fixed a bug where toggling the microphone off and on would leave the SpeechRecognition engine in a halted state. The `startListening()` method now properly handles re-initializing the Web Speech API `SpeechRecognition` object if it fails to start.
- **Notifications panel**: Was clipping behind sidebar — fixed with proper z-index and positioning.
- **Anchoring**: In-memory state per `agent_id` (`anchoring_states` dict in `app.py`). Script read line-by-line via `/api/anchoring/<agent_id>/status` polling.
- **Share Link UI**: Redesigned the "Create Share Link" modal to improve UX, grouping password, expiry, and max uses into a cleaner layout, and converting to a toggle switch for the password field.
- **Code QA**: Reviewed backend API routes and fixed minor transcript generation logic consistency in manual report generation.
