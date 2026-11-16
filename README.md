# 🧠 AI-Powered Digital Attention Management System

A production-grade, end-to-end platform for digital distraction detection, attention immersion analytics, and automated focus optimization across Web, Mobile (Android), Desktop, and Browser Extensions.

---

## 🌟 Overview & Architecture

The system coordinates multi-platform clients and services around a centralized PostgreSQL telemetry store:

1. **🌐 Web Dashboard (`apps/web` / `frontend`)**: Modern React 18 single-page application with dual Light & Dark theme support, responsive charts, live attention scoring, goals management, and device pairing.
2. **📱 Android Hybrid App (`apps/web/android`)**: Native Android hybrid application powered by **Capacitor 6** and **Kotlin**, preserving the complete desktop design while offering mobile-optimized responsive layouts, slide navigation drawer, gesture navigation, and Android safe-area insets.
3. **⚙️ Backend API (`apps/api` / `backend`)**: High-performance Node.js / Express TypeScript service with Prisma ORM, JWT authentication, rate limiting, and OpenAPI 3.0 (Swagger) documentation.
4. **🖥️ Windows Desktop App (`desktop-app`)**: Python PyWebView / WebView2 desktop application with a background window-tracking engine, single-instance lock, system tray controls, and auto-start integration.
5. **🧩 Chrome Extension (`extension`)**: Manifest V3 extension monitoring active browser tabs, idle state, and domain transitions with an offline sync queue.
6. **🤖 ML Attention Service (`ml-service`)**: Machine learning inference engine predicting attention immersion levels, context-switch penalties, and personalized focus recommendations.

---

## 🗂️ Project Structure

```text
AI-Powered-Digital-Attention-Management-System/
├── 📁 apps/
│   ├── 📁 api/                     # Backend Express API & Database (Monorepo)
│   │   ├── prisma/                 # PostgreSQL Schema & Migrations
│   │   └── src/
│   │       ├── modules/            # Auth, Activity, Analytics, Focus, Goals, Devices, Notifications, Admin
│   │       ├── middleware/         # Auth, Zod Validation, Rate Limiters
│   │       └── server.ts           # Server Entry Point
│   └── 📁 web/                     # React 18 Web Dashboard & Hybrid Mobile App
│       ├── android/                # Capacitor Android Studio Native Project (Kotlin / Gradle)
│       └── src/
│           ├── features/
│           │   ├── activity/       # Dashboard & Activity Tracking
│           │   ├── analytics/      # AI Models & Attention Insights
│           │   ├── focus/          # Focus Sessions & Timer Clock
│           │   ├── goals/          # Goals & Habit Analytics
│           │   ├── history/        # Daily Telemetry History & Accordion Session Logs
│           │   ├── notifications/  # Notification Center & Smart Reminders
│           │   ├── recommendations/# Behavioral Analytics & AI Strategy Engine
│           │   ├── tasks/          # Task Manager & Productivity Milestones
│           │   ├── admin/          # Admin Portal & System Telemetry Monitor
│           │   └── profile/        # Profile Settings & Connected Devices
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

### 1. 📱 Android Hybrid App (Capacitor 6 + Android Studio)
* **Preserved Design Identity**: Keeps 100% of the desktop branding, typography, color palette, borders, shadows, and charts with zero jarring redesigns.
* **Mobile-Responsive Adaptation**: Two-column compact KPI cards, responsive charts, readable mobile activity feeds, and horizontal-overflow elimination.
* **Slide Navigation Drawer**: Left-side slide navigation drawer with touch gestures (swipe right to open, swipe left to dismiss), backdrop dismiss, and Android hardware back-button handling.
* **Safe-Area Insets & Viewport Fit**: Native status bar styling, keyboard overlap mitigation, and bottom navigation bar padding.

### 2. 🕒 Daily Telemetry History (`/history`)
* **Multi-Day Window Selector**: Filter by `Last 7 days`, `Last 14 days`, or `Last 30 days`, with a toggle to hide days with zero recorded telemetry.
* **Daily Telemetry Summary Rows**: Instant visibility of date label, Focus Time & Session Count (`7m 01s · 1 session`), Screen Time (`2m 11s`), and Record & Switch Count (`4 · 0 switches`).
* **Expandable Accordion Breakdown**: Expanding any day reveals exact focus session timestamps, duration vs planned minutes, status badges, and top visited applications/domains.

### 3. 🔔 Notification Center (`/notifications`)
* **Smart Categorized Reminders**: Deadline alerts, habit check-ins, focus session completions, and break nudges.
* **Dynamic Navigation Badge**: Displays real-time unread count (e.g. `17`) directly on the sidebar and mobile drawer.
* **Notification Actions**: Quick filters for `Show unread only`, single-click `Mark all as read`, `Clear read`, item deletion, and `Open` deep-links directly into Focus, Goals, or Activity views.

### 4. 💡 Behavioral Recommendations (`/recommendations`)
* **Telemetry Behavioral Cards**:
  * **Focus Timing**: Identifies peak productive hours (e.g. `21:00-22:00`), peak focus minutes, and concentrated session counts.
  * **Session Completion**: Analyzes completion rate against planned duration (e.g. `33.3%`), preferred session length (`25m`), and median actual session length (`8m`).
  * **Score Trend**: Detects straight-line trends across scored days to highlight performance trajectories.
* **Actionable Engine Suggestions**: Direct one-click action triggers (`Start Focus Session`, `Set Focus Goal`, `Take Break`).
* **Dual-Theme High Contrast**: Full Light Mode and Dark Mode readability with crisp contrast for chips, banners, and typography.

### 5. 🎯 Goals & Habits Section (`/goals`)
* **Visually Distinct Goal Cards**: Dedicated color palette and badges for `🎓 Education`, `⚡ Deep Work`, `🛡️ Digital Wellbeing`, and `🔀 Context Flow`.
* **Activity Summary & Scores Modal**: Seamless toggle between `Daily`, `Weekly`, and `Monthly` windows with Focus Score (`100/100`), Productivity Score (`69/100`), Stability Score (`15/100`), and Context-Switching Rates.

### 6. 👤 Profile Settings & Connected Devices (`/profile`)
* **Two-Column Layout**: Avatar management, Display Name, Occupation Type, and Timezone dropdown with auto-detection.
* **Device Pairing**: Real-time status for **Chrome Extension** and **Windows Desktop Tracker** with 8-character pairing codes and connection re-sync.

### 7. 🔄 Blank Screen Recovery & Screen Refresh System
* **Automated Error Boundary**: Centered emergency recovery card with **"🔄 Refresh Screen"** button if any rendering issue occurs.
* **Header Refresh Control**: Instant sync button in top bar header.
* **Hardware & Keyboard Support**: Global `F5` / `Ctrl + R` handling.

---

## 🚀 Quick Start (Running Locally)

### Prerequisites
* **Node.js**: v18 or v20 LTS
* **pnpm** (preferred) or **npm**
* **Python**: 3.10+ (for Desktop App & ML Service)
* **PostgreSQL**: Running locally on port `5432` (database: `attention_dev`)
* **Android Studio**: Ladybug / Hedgehog or newer with Android SDK 34+ (for Android App)

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

### Step 3: Run the Android Hybrid App in Android Studio
1. Build the web distribution:
   ```powershell
   pnpm --filter web build
   ```
2. Sync the compiled assets into the Android native project:
   ```powershell
   Copy-Item -Recurse -Force "apps/web/dist/*" "apps/web/android/app/src/main/assets/public"
   ```
3. Open Android Studio:
   * Select **Open** and choose the `apps/web/android` directory.
   * Allow Gradle to sync.
   * Run the app on an Android Emulator or connected physical device (API 30+).
   * Or build the debug APK from the terminal:
     ```powershell
     cd apps/web/android
     .\gradlew.bat assembleDebug
     ```

---

### Step 4: Run the Windows Desktop Tracker (Optional)
```powershell
cd desktop-app
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python -m app.main
```

---

### Step 5: Install the Chrome Tracker Extension (Optional)
1. Open Google Chrome and visit `chrome://extensions`.
2. Toggle on **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select the `extension/` directory.
4. In the Web Dashboard under **Connected Devices**, verify the extension heartbeat.

---

### Step 6: Run Automated Tests
```powershell
# Run backend test suite
pnpm test:api

# Run frontend test suite
pnpm test:web

# Production build validation
pnpm --filter web build
pnpm --filter api build
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, React Router 6, TanStack Query, CSS Modules |
| **Mobile App** | Capacitor 6, Android Studio, Kotlin, Android WebKit |
| **Backend** | Node.js, Express, TypeScript, Prisma ORM, Zod, Argon2id, Jose (JWT), Pino |
| **Database** | PostgreSQL (Relational schema with indexes & foreign key cascades) |
| **Desktop Shell** | Python 3, PyWebView (Microsoft Edge WebView2), pystray, win32gui |
| **Browser Extension** | Chrome Extensions Manifest V3, Service Workers, Alarms API |
| **ML Engine** | Python, FastAPI, Scikit-Learn, Pandas, NumPy |
| **Documentation** | OpenAPI 3.0, Swagger UI, TypeDoc |

---

## 🔒 Security & Privacy Guarantees

* **Zero Content Logging**: Logs only active application names, browser domain hostnames, and timestamps. Never records keystrokes, clipboard data, screenshots, or file contents.
* **Argon2id Password Hashing**: Industry-standard cryptographic hashing with unique salts.
* **Rate-Limited Endpoints**: Authentication, telemetry ingestion, and pairing code endpoints are safeguarded by IP and user rate limiters.
* **Secure Token Storage**: Desktop app securely caches credentials using Windows Credential Manager (`keyring`).
