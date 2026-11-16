import React from 'react';
import ReactDOM from 'react-dom/client';
import { Providers } from './app/providers';
import { AppRouter } from './app/router';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import './styles/global.css';

async function prepareApp() {
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS === 'true') {
    const { worker } = await import('./mocks/browser');
    await worker.start({ onUnhandledRequest: 'bypass' });
  }
}

prepareApp()
  .then(() => {
    const rootElement = document.getElementById('root');
    if (rootElement) {
      ReactDOM.createRoot(rootElement).render(
        <React.StrictMode>
          <ErrorBoundary isRoot fallbackTitle="Attention Management System">
            <Providers>
              <AppRouter />
            </Providers>
          </ErrorBoundary>
        </React.StrictMode>,
      );
    }
  })
  .catch((err) => {
    console.error('[App Init] Failed to prepare application:', err);
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="display:flex;min-height:100vh;align-items:center;justify-content:center;background:#171513;color:#F2E8D9;padding:24px;font-family:'Plus Jakarta Sans',sans-serif;">
          <div style="background:#26211E;border:1px solid #76675B;border-radius:16px;padding:40px;max-width:480px;width:100%;text-align:center;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);">
            <div style="font-size:48px;margin-bottom:16px;">🔄</div>
            <h2 style="font-size:22px;font-weight:700;margin-bottom:12px;color:#F2E8D9;">Attention Management System</h2>
            <p style="font-size:14px;color:#A99C8C;line-height:1.6;margin-bottom:24px;">The application took longer than expected to start. Click below to refresh.</p>
            <button onclick="window.location.reload()" style="background:#C84B40;color:white;border:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;width:100%;">Refresh Screen</button>
          </div>
        </div>
      `;
    }
  });
