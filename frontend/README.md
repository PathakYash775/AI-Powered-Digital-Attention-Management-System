# 🎨 Frontend Documentation (React + TypeScript + Vite)

This is the web client application for the **AI-Powered Digital Attention Management System**.

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

## 🚀 How to Run Frontend

### From Project Root:
```powershell
pnpm dev:web
```

### From Inside `frontend/` (`apps/web/`):
```powershell
cd frontend
npm run dev
```

### Open in Browser:
👉 **[http://localhost:5173](http://localhost:5173)**

*(Note: Ensure your backend server is running so that the `/api` proxy forwards requests to PostgreSQL seamlessly).*

---

## 📋 Features & Pages Available

### 1. 🔑 Authentication (`/login` & `/register`)
* **Login Form**: Email & password authentication with JWT access tokens stored in memory and refresh tokens in HTTP-only cookies.
* **Register Form**: Create user accounts with password strength validation.
* **Protected Routes**: Automatic redirection to `/login` if unauthenticated.
* **Test Credentials**:
  * **Email**: `sajal_demo@example.com`
  * **Password**: `Password123!`

### 2. 📊 Executive Dashboard (`/`) — *Graphs & Visualizations*
* **Metrics Summary Cards**:
  * Total Screen Time (Active vs. Idle break duration).
  * Context Switches Counter (Number of application changes).
  * Notification Interruption Counter.
* **Visual Graphs**:
  * 🍩 **Category Donut Chart**: Breakdown into *Productive Work*, *Communication*, *Entertainment*, *Social*, and *Other*.
  * 📈 **Top 5 Sites**: Ranked horizontal bars for domains (GitHub, Stack Overflow, YouTube, Figma).
* **Date Navigator**: Inspect historical attention analytics by date.

### 3. 📑 Activity & Distraction Details (`/activity`) — *Tables*
* **Activity Sessions Table**: Domain, category tag, duration, timestamps, and idle flags.
* **Context Switches Table**: Real-time log showing rapid multitasking (e.g., `VS Code` ➔ `Slack` ➔ `Chrome`).
* **Notification Feed Table**: Notifications captured by app name and time.
* **Date Range Filters**: Filter records by custom `From` and `To` dates.

### 4. 🎯 Goals Management (`/goals`)
* **Create New Goals**:
  * Focus Minutes Goal (e.g., target 240 mins deep work).
  * Maximum Screen Time (e.g., max 480 mins).
  * Context Switch Limit (e.g., under 35 switches).
* **Live Progress Bars**: Visual progress indicators showing progress against goals.
* **Edit & Delete**: Full modal-driven CRUD operations.

### 5. ⚙️ Profile Settings (`/profile`)
* **Work Schedule**: Set daily work start and end hours (e.g., `09:00` to `18:00`).
* **Timezone & Occupation**: Choose between *Student* or *Professional*.

---

## 🧪 Testing & Production Build

* **Run Frontend Tests**:
  ```powershell
  pnpm test:web
  ```
* **Build Production Bundle**:
  ```powershell
  pnpm build:web
  ```
