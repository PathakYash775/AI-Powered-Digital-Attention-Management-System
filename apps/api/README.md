# ⚙️ Backend Documentation (Express + PostgreSQL + Prisma)

This is the core backend service for the **AI-Powered Digital Attention Management System**.

---

## 🗂️ Project Structure Diagram

```text
Project 3/
├── 📁 backend/                # Everything for Backend, Database & APIs
│   ├── src/
│   │   ├── docs/            # Swagger UI Interactive Docs (/docs)
│   │   ├── modules/         # Auth, Goals, Activity, Focus, Ingest, Stats
│   │   ├── middleware/      # Security, JWT guards, Zod validation
│   │   └── server.ts        # Main server entry point
│   ├── prisma/              # PostgreSQL Schema & Migrations
│   └── package.json
│
├── 📁 frontend/               # Everything for React UI & Visualizations
│   ├── src/
│   │   ├── api/             # Typed API client connected to backend
│   │   ├── app/             # Router & Protected Route Guards
│   │   ├── components/
│   │   │   ├── charts/      # 📊 Donut Chart & 24h Timeline Chart
│   │   │   └── ui/          # Buttons, Modals, Form Fields, Spinners
│   │   ├── features/
│   │   │   ├── auth/        # Login & Register Pages
│   │   │   ├── activity/    # Dashboard (Graphs) & Activity Tables
│   │   │   ├── goals/       # Goals Management & Progress Trackers
│   │   │   └── profile/     # Work Hours & Settings
│   │   └── styles/          # Design tokens & CSS theme
│   ├── index.html
│   └── vite.config.ts
│
├── 📄 README.md              # Complete Project Overview & Commands
└── 📄 frontend/README.md     # Detailed Frontend Architecture Guide
```

---

## 🚀 How to Run Backend

### From Project Root:
```powershell
pnpm dev:api
```

### From Inside `backend/` (`apps/api/`):
```powershell
cd backend
npm run dev
```

---

## 🌐 Interactive Swagger UI Endpoints

Once started, open either link in your browser:
* **Primary Swagger URL**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
* **Alternative URL**: [http://localhost:3000/docs](http://localhost:3000/docs)

| Tag | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **`auth`** | `POST` | `/api/v1/auth/register` | Register new user account |
| **`auth`** | `POST` | `/api/v1/auth/login` | Login, returns JWT `accessToken` & refresh cookie |
| **`auth`** | `POST` | `/api/v1/auth/refresh` | Rotate refresh token via secure cookie |
| **`auth`** | `POST` | `/api/v1/auth/logout` | Revoke session & clear cookie |
| **`profile`** | `GET` / `PATCH` | `/api/v1/profile` | Get or update profile & work schedule |
| **`focus-sessions`** | `GET` | `/api/v1/focus-sessions` | Focus session history with interruption counts |
| **`focus-sessions`** | `GET` | `/api/v1/focus-sessions/active` | Get current active countdown session |
| **`focus-sessions`** | `POST` | `/api/v1/focus-sessions/start` | Start a new focus session (5–480 mins) |
| **`focus-sessions`** | `PATCH` | `/api/v1/focus-sessions/{id}` | Complete or abandon session |
| **`stats`** | `GET` | `/api/v1/stats/today` | Today's active/idle time, switches, 24h timeline |
| **`stats`** | `GET` | `/api/v1/stats/range` | Range statistics between dates |
| **`goals`** | `POST` | `/api/v1/goals` | Create goal (focus, screen time, switches) |
| **`goals`** | `GET` | `/api/v1/goals` | List all goals for user |
| **`goals`** | `PATCH` / `DELETE`| `/api/v1/goals/{id}` | Update or delete a goal |
| **`activity`** | `GET` | `/api/v1/activity/summary` | 24h usage breakdown & top 5 sites |
| **`devices`** | `POST` / `GET` | `/api/v1/devices/*` | Generate code & pair extension (`atn_...`) |
| **`ingest`** | `POST` | `/api/v1/ingest/*` | Ingest activity batches, switches, notifs |

---

## 🗄️ PostgreSQL Database

* **Host**: `127.0.0.1:5432`
* **Database Name**: `attention_dev`
* **User**: `attention_app`
* **Prisma Studio (Visual Database GUI)**:
  ```powershell
  npx --prefix apps/api prisma studio
  ```
  Opens at: **[http://localhost:5555](http://localhost:5555)**

* **Run Migrations**:
  ```powershell
  pnpm --filter api db:migrate
  ```
* **Seed Database**:
  ```powershell
  pnpm --filter api db:seed
  ```
* **Run Tests (30 tests)**:
  ```powershell
  pnpm test:api
  ```
