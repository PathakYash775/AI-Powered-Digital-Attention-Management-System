# 🎨 Frontend Documentation (React + TypeScript + Vite)

The web dashboard and client application for the **AI-Powered Digital Attention Management System**.

---

## 🗂️ Project Structure

```text
frontend/ (and apps/web/)
├── src/
│   ├── api/                   # Strongly-typed Axios API clients (auth, activity, analytics, goals, devices, profile)
│   ├── app/                   # AppLayout, AppRouter, ProtectedRoute, Providers
│   ├── components/
│   │   ├── charts/            # CategoryDonutChart & HourlyTimelineChart
│   │   └── ui/                # ErrorBoundary (with center Refresh button), Button, Field, Spinner, EmptyState
│   ├── features/
│   │   ├── auth/              # LoginPage, RegisterPage, AuthContext
│   │   ├── activity/          # DashboardPage (executive graphs) & ActivityPage (detailed telemetry tables)
│   │   ├── analytics/         # AnalyticsPage (ML model simulation, attention scores, recommendations)
│   │   ├── focus/             # FocusPage & FocusSummaryWidget (timed focus clock sessions)
│   │   ├── goals/             # GoalsPage (distinct cards + interactive Activity Summary modal), GoalForm
│   │   ├── profile/           # ProfilePage (2-column layout: Personal Info, Work Schedule, Connected Devices)
│   │   └── devices/           # DevicePairingSection & pairing code handlers
│   ├── lib/                   # Safe formatters (formatDuration, formatTime), timezone groups
│   └── styles/                # CSS design system tokens and themes
├── index.html                 # App shell with dark background & blank screen recovery watchdog
└── vite.config.ts             # Vite build configuration & API proxy
```

---

## 🚀 How to Run the Frontend

### From Project Root:
```powershell
pnpm dev:web
```

### From Inside `frontend/` (or `apps/web/`):
```powershell
npm run dev
```

### Open in Browser:
👉 **[http://localhost:5173](http://localhost:5173)**

*(Note: Ensure your backend server is running on port `8000` so that requests to `/api` proxy seamlessly).*

---

## 📋 Features & Pages Available

### 1. 🔑 Authentication (`/login` & `/register`)
* **Secure Auth Flow**: JWT access tokens in memory and refresh tokens in HTTP-only cookies.
* **Auto-Session Restore**: Automatically validates active sessions on page refresh.

### 2. 📊 Executive Dashboard (`/` & `/dashboard`)
* **Live KPI Cards**: Total Monitored Time, Active vs. Idle Time, Context Switches, and Notification Interruptions.
* **Visual Charts**:
  * 🍩 **Category Donut Chart**: Breakdown into *Productive Work*, *Communication*, *Entertainment*, *Social*, and *Other*.
  * 📈 **Top Sites & Apps Ranking**: Real-time ranked list of tracked domains.
* **Date Navigator**: Inspect attention analytics for today or any historical date.

### 3. 📑 Activity Tracking (`/activity`)
* **Telemetry Data Tables**: Real-time activity sessions, domain categories, durations, and idle states.
* **Context Switches Log**: Multi-tasking velocity feed (e.g., `VS Code` ➔ `Slack` ➔ `Chrome`).
* **Date Filters**: Custom `From` and `To` date range queries.

### 4. 🤖 AI Models & Analytics (`/analytics`)
* **Attention Score Meter**: Live calculated immersion score (0-100) based on active vs. distracting tasks.
* **Interactive ML Simulator**: Simulate app usage patterns and evaluate predicted attention penalties.
* **Focus Recommendations**: Actionable behavioral insights to reduce fragmentation.

### 5. ⏱️ Focus Sessions (`/focus`)
* **Timer Clock Widget**: Start dedicated 25m / 50m / custom focus sprints with audio/visual status indicators.
* **Interruption Tracking**: Automatically logs distractions during an active focus block.

### 6. 🎯 Goals & Habits (`/goals`)
* **Visually Distinct Goal Cards**:
  * Dedicated color themes, custom icons, and category badges (`🎓 Education`, `⚡ Deep Work`, `🛡️ Digital Wellbeing`, `🔀 Context Flow`).
  * Live completion progress bars (e.g., `8m of 60m • 13% completed`).
  * Live metric tags: `⚡ 100 Focus Score`, `3 Unique Domains`, `9 Switches`.
* **Interactive Activity Summary & Attention Scores Modal**:
  * **Period Filters**: Seamless toggle between `Daily`, `Weekly`, and `Monthly` windows.
  * **6-Card Activity Summary Grid**: Total Monitored, Total Focused, Idle Time, Tab Switches, Websites Visited, Distraction Events.
  * **Attention Scores & Progress Meters**: Focus Score (`100/100`), Productivity (`69/100`), Stability (`15/100`), Distraction Frequency, and Context-Switching Rate.
  * **Interactive Controls**: `Recalculate` with spin animation and `History` streak drawer.

### 7. ⚙️ Profile Settings & Devices (`/profile`)
* **Two-Column Modern Layout**:
  * **Personal Information Card**: Vibrant avatar with initials (`YP`), photo upload (`JPG, PNG, GIF up to 2MB`), Display Name input, Occupation Type (`Student` / `Professional`), and Timezone dropdown with auto-detection.
  * **Work Schedule Card**: `Work Start (HH:mm)` and `Work End (HH:mm)` inputs with clock indicators.
  * **Connected Devices Card**: Real-time connection indicators for **Chrome Extension** and **Windows Desktop Tracker**.
  * **Device Management Actions**:
    * `Pair Windows Tracker`: Generates an 8-character pairing code with a 10-minute countdown timer and copy button.
    * `Re-sync Connection`: Triggers instant extension & tracker auto-link.
    * `Refresh`: Re-checks live heartbeat status.
  * **Action Buttons**: `Save Changes` and `Log Out`.

### 8. 🔄 Blank Screen Recovery & Screen Refresh
* **Centered Emergency Recovery Screen**: If an uncaught error occurs, an emergency centered card automatically displays with a prominent **"🔄 Refresh Screen"** button.
* **Top-Bar Refresh Button**: Permanent header button in the canvas top bar next to your username and Sign Out.
* **Global Keyboard Shortcuts**: Press **`F5`** or **`Ctrl + R`** anywhere in the desktop app or browser to reload.

---

## 🧪 Testing & Production Build

```powershell
# Run component & integration tests
pnpm test:web

# Production build & type-checking
pnpm build:web
```
