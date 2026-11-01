# 🧠 AI-Powered Digital Attention Management System

A production-grade, end-to-end platform for digital distraction detection, attention immersion analytics, and automated focus optimization.

---

## 🌟 Overview & Architecture

The system coordinates four integrated clients and services around a centralized PostgreSQL telemetry store:

1. **🌐 Web Dashboard (`apps/web` / `frontend`)**: Modern React 18 single-page application with dark/light theme support, responsive charts, live attention scoring, goals management, and device pairing.
2. **⚙️ Backend API (`apps/api` / `backend`)**: High-performance Node.js / Express TypeScript service with Prisma ORM, JWT authentication, rate limiting, and OpenAPI 3.0 (Swagger) documentation.
3. **🖥️ Windows Desktop App (`desktop-app`)**: Python PyWebView / WebView2 desktop application with a background window-tracking engine, single-instance lock, system tray controls, and auto-start integration.
4. **🧩 Chrome Extension (`extension`)**: Manifest V3 extension monitoring active browser tabs, idle state, and domain transitions with an offline sync queue.
5. **🤖 ML Attention Service (`ml-service`)**: Machine learning inference engine predicting attention immersion levels, context-switch penalties, and personalized focus recommendations.

---

## 🗂️ Project Structure

```text
AI-Powered-Digital-Attention-Management-System/
├── 📁 apps/
│   ├── 📁 api/                     # Backend Express API & Database (Monorepo)
│   │   ├── prisma/                 # PostgreSQL Schema & Migrations
│   │   └── src/
│   │       ├── modules/            # Auth, Goals, Activity, Focus, Devices, Analytics
│   │       ├── middleware/         # Auth, Zod Validation, Rate Limiters
│   │       └── server.ts           # Server Entry Point
│   └── 📁 web/                     # React 18 Web Dashboard (Monorepo)
│       └── src/
│           ├── features/
│           │   ├── activity/       # Dashboard & Activity Tracking
│           │   ├── analytics/      # AI Models & Attention Insights
│           │   ├── focus/          # Focus Sessions & Timer Clock
│           │   ├── goals/          # Goals & Habit Analytics (Modal + Distinct Cards)
│           │   └── profile/        # Profile Settings & Connected Devices (2-Column)
│           ├── components/         # UI Elements, Error Boundaries, Charts
│           └── lib/                # Timezones, Formatters, API Clients
│
├── 📁 backend/                     # Synchronized Standalone Backend Package
├── 📁 frontend/                    # Synchronized Standalone Frontend Package
│
├── 📁 desktop-app/                 # Windows Desktop Tracker App (Python / PyWebView)
│   ├── app/                        # Shell, Single-Instance Lock, Tray & Pairing UI
│   ├── tracker/                    # Background Windows Activity Poller & Engine
│   └── scripts/                    # PyInstaller Packaging & Build Helpers
│
├── 📁 extension/                   # Chrome Browser Companion (Manifest V3)
│   ├── manifest.json               # Manifest V3 Specification
│   ├── service_worker.js           # Event Queue, Tab Tracking & Telemetry Sync
│   └── popup.html / js / css       # Extension Pairing & Status Popup
│
├── 📁 ml-service/                  # Machine Learning Attention Prediction Service
│   ├── dataset/                    # Schema & Synthetic Training Data
│   └── app/                        # Inference Models & API Endpoints
│
├── 📄 package.json                 # Monorepo Scripts & Root Dependencies
├── 📄 pnpm-workspace.yaml          # PNPM Workspace Configuration
└── 📄 README.md                    # Project Documentation
```

---

## ✨ Key Features & Recent Upgrades

### 1. 🎯 Goals & Habits Section (`/goals`)
* **Visually Distinct Goal Cards**: Each goal card features a dedicated color palette, custom icon, category badge, and live progress bar:
  * `🎓 Education` (e.g. *DSA problem solving*): Cyan / Royal Blue theme.
  * `⚡ Deep Work` (e.g. *Focus Minutes Target*): Emerald Green theme.
  * `🛡️ Digital Wellbeing` (e.g. *Max Screen Time Ceiling*): Sunset Amber theme.
  * `🔀 Context Flow` (e.g. *Max Context Switches*): Electric Purple theme.
* **Interactive Activity Summary & Attention Scores Modal**: Clicking **View Activity Summary** opens an in-depth breakdown matching companion telemetry:
  * **Period Filters**: Seamless toggle between `Daily`, `Weekly`, and `Monthly` windows.
  * **6-Card Activity Summary Grid**: Total Monitored, Total Focused, Idle Time, Tab Switches, Websites Visited, Distraction Events.
  * **Attention Scores & Meters**: Focus Score (`100/100`), Productivity Score (`69/100`), Stability Score (`15/100`), Distraction Frequency (`0.0 /hr`), and Context-Switching Rate (`65.8 switches/hr`).
  * **Actions**: One-click **Recalculate** with spin animation & live refresh, plus an expandable **History** streak drawer.

### 2. 👤 Profile Settings & Connected Devices (`/profile`)
* **Two-Column Dashboard Layout**:
  * **Personal Information Card**: Gradient avatar with initials (`YP`), circular edit badge, working photo upload (`JPG, PNG, GIF up to 2MB`), Display Name input, Occupation Type select (`Student` / `Professional`), and Timezone dropdown with auto-detection.
  * **Work Schedule Card**: `Work Start (HH:mm)` and `Work End (HH:mm)` time inputs with clock indicators.
  * **Connected Devices Card**: Real-time status for **Chrome Extension** (multi-color logo) and **Windows Tracker** (4-pane blue logo) with `🟢 Connected` indicators.
  * **Device Management Actions**:
    * `Pair Windows Tracker`: Generates a secure, one-time 8-character pairing code with a 10-minute countdown and copy button.
    * `Re-sync Connection`: Triggers instant auto-link / connection synchronization.
    * `Refresh`: Refetches live device heartbeat status.
  * **Action Buttons**: `Save Changes` (persists settings) and `Log Out` (clears session).

### 3. 🔄 Blank Screen Recovery & Screen Refresh System
* **Centered Automatic Recovery Card**: If React ever crashes or a blank screen occurs, a centered emergency card appears with a prominent **"🔄 Refresh Screen"** button.
* **Top-Bar Refresh Button**: Located in the application canvas header next to your username and Sign Out button.
* **Global Keyboard Shortcuts**: Press **`F5`** or **`Ctrl + R`** anywhere inside the desktop app or browser to reload.
* **System Tray Reload**: Right-click the Windows system tray icon and select **"Refresh Screen"**.

### 4. 🤖 AI Models & Analytics (`/analytics`)
* Model simulation engine predicting distraction penalties.
* 7-day focus trend forecasting with personalized recommendations.

---

## 🚀 Quick Start (Running Locally)

### Prerequisites
* **Node.js**: v18 or v20 LTS
* **pnpm** or **npm**
* **Python**: 3.10+ (for Desktop App & ML Service)
* **PostgreSQL**: Running locally on port `5432` (database: `attention_dev`)

---

### Step 1: Start the Backend API Server
```powershell
# From the repository root
pnpm dev:api

# Or alternatively from backend/
cd backend
npm run dev
```
* 🌐 **API Base URL**: `http://127.0.0.1:8000/api/v1`
* 📖 **Interactive Swagger UI Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
* 🩺 **Health Check**: [http://127.0.0.1:8000/healthz](http://127.0.0.1:8000/healthz)

---

### Step 2: Start the Web Dashboard
```powershell
# From the repository root
pnpm dev:web

# Or alternatively from frontend/
cd frontend
npm run dev
```
* 💻 **Web Application UI**: [http://localhost:5173](http://localhost:5173)

---

### Step 3: Run the Windows Desktop Tracker (Optional)
```powershell
cd desktop-app
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python -m app.main
```
* Launches the desktop WebView2 application with system tray minimization, pairing verification, and background activity tracking.

---

### Step 4: Install the Chrome Tracker Extension (Optional)
1. Open Google Chrome and visit `chrome://extensions`.
2. Toggle on **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select the `extension/` directory.
4. In your Web Dashboard at [http://localhost:5173/profile](http://localhost:5173/profile), click **Pair Windows Tracker** to get an 8-character pairing code, or click **Re-sync Connection** to automatically connect.

---

### Step 5: Run Automated Tests
```powershell
# Run backend test suite
pnpm test:api

# Run frontend test suite
pnpm test:web

# Production build validation
npm --prefix apps/web run build
npm --prefix apps/api run build
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, React Router 6, TanStack Query, CSS Modules |
| **Backend** | Node.js, Express, TypeScript, Prisma ORM, Zod, Argon2id, Jose (JWT), Pino |
| **Database** | PostgreSQL (Relational schema with indexes & foreign key cascades) |
| **Desktop Shell** | Python 3, PyWebView (Microsoft Edge WebView2), pystray, win32gui |
| **Browser Extension** | Chrome Extensions Manifest V3, Service Workers, Alarms API |
| **ML Engine** | Python, FastAPI, Scikit-Learn, Pandas, NumPy |
| **Documentation** | OpenAPI 3.0, Swagger UI, TypeDoc |

---

## 🔒 Security & Privacy Guarantees

* **Zero Content Logging**: The system logs only active application names, browser domain hostnames, and timestamps. It **never** records keystrokes, clipboard data, screenshots, or file contents.
* **Argon2id Password Hashing**: Industry-standard cryptographic hashing with unique salts.
* **Rate-Limited Endpoints**: Authentication, telemetry ingestion, and pairing code endpoints are safeguarded by IP and user rate limiters.
* **Secure Token Storage**: Desktop app securely caches credentials using Windows Credential Manager (`keyring`).
