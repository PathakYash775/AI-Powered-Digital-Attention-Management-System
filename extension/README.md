# Attention Activity Tracker (Chrome Extension v0.2.0)

Records website usage, tab switches, and unread-badge notifications for the **Digital Attention Management System**.

---

## How to Install in Google Chrome

1. Open Google Chrome.
2. Navigate to:
   ```text
   chrome://extensions
   ```
3. In the top-right corner, toggle **Developer mode** to **ON**.
4. Click the **Load unpacked** button (top-left).
5. Select this folder:
   ```text
   c:\Users\Yash Pathak\OneDrive\Desktop\Project 3\extension
   ```
6. The **Attention Activity Tracker** icon will now appear in your Chrome toolbar extensions menu (puzzle piece icon). Pin it to your toolbar!

---

## How to Pair with Your Account

1. Make sure your local application is running:
   * **Backend**: `http://127.0.0.1:8000`
   * **Frontend**: `http://localhost:5173`
2. Log into your dashboard at [http://localhost:5173/login](http://localhost:5173/login).
3. Click **Profile** in the top navigation bar.
4. Scroll to **Connected Devices & Extension** and click **+ Generate Pairing Code**.
5. Copy the 8-character code shown on screen (e.g. `K7X9W2M4`).
6. Click the **Attention Tracker** extension icon in your Chrome toolbar.
7. Paste the pairing code, enter a device name (e.g., `Chrome Laptop`), and click **Connect**.
8. Once connected, click **Start tracking**!

---

## Privacy & Security

* **Domain & Timing Only**: The extension strictly records website domains (e.g. `github.com`, `stackoverflow.com`) and duration.
* **No Page Content or Keystrokes**: Page titles, passwords, search queries, and form inputs are **never read, stored, or sent**.
* **Zero Credential Exposure**: Your account password and master JWT token are never shared with the extension. The extension communicates via an isolated, revocable device token (`atn_...`).
