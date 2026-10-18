# 🧠 AI-Powered Digital Attention Management System

A production-grade platform for distraction detection, focus enhancement, and digital activity analytics.

---

## 🗂️ Project Structure

The project is structured into two clean, systematic, and intuitive folders right at the root:

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
├── 📁 extension/              # Chrome Activity Tracker (Manifest V3)
│   ├── manifest.json        # Manifest V3 extension configuration
│   ├── service_worker.js    # Background event queue, tab tracking & sync
│   ├── popup.html / js / css# Extension popup UI with pairing flow
│   └── README.md            # Installation & pairing guide
│
├── 📄 README.md              # Complete Project Overview & Commands
└── 📄 frontend/README.md     # Detailed Frontend Architecture Guide
```

---

## 🚀 Quick Start (Running Locally)

### 1. Start the Backend Server
```powershell
pnpm dev:api
```
* 📖 **Interactive Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 2. Start the Frontend Web App
```powershell
pnpm dev:web
```
* 💻 **Web Application UI**: [http://localhost:5173](http://localhost:5173)

### 3. Install the Chrome Tracker Extension
1. Open Google Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** (top-right).
3. Click **Load unpacked** and select the `extension/` folder in this project.
4. Log into your dashboard at [http://localhost:5173](http://localhost:5173), go to **Profile**, generate a pairing code, and paste it into the extension popup!

### 4. Run Automated Tests
```powershell
pnpm test:api     # Runs 30 backend API & security tests
pnpm test:web     # Runs 10 frontend React & UI tests
```

---

## 🛠️ Tech Stack
* **Frontend**: React 18, TypeScript, Vite, React Router 6, TanStack React Query, Axios.
* **Backend**: Node.js, Express, TypeScript, Zod, Argon2id, Jose (JWT), Pino.
* **Extension**: Chrome Manifest V3, Service Worker, Idle Detection, Alarms API.
* **Database**: PostgreSQL with Prisma ORM.
* **Documentation**: OpenAPI 3.0 + Swagger UI.

