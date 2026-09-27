import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { registerServiceWorker } from './services/updates';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Application installable et utilisable hors ligne (site en ligne uniquement).
if (import.meta.env.PROD) registerServiceWorker();
